// Rotina diária de saúde do sistema FaçaAmigos + follow-up de lead quente. Chamada por pg_cron todo dia às
// 10:00 UTC (07h em Belém) com o cabeçalho x-ops-key (ver supabase/ops/agendar-rotinas.sql).
//
// O que verifica (últimas 24h) e SÓ manda e-mail se achar problema:
//  a) leads do teste com email_error / result_email_error (falha ao enviar o aviso interno ou o resultado);
//  b) leads "completed" há mais de 30 min sem result_email_sent_at (resultado que nunca saiu);
//  c) eventos da Hotmart em fa_hotmart_eventos com error;
//  d) pg_cron: execuções falhas nas últimas 24h, respostas HTTP de erro do pg_net e ausência de execução dos jobs
//     guia-sequence-hourly e hotmart-sync-15min (via função SQL fa_health_snapshot(), security definer);
//  e) cupons do Wi-Fi com email_error.
//
// Follow-up de lead quente: lead "completed" com result_band = 'tier3' (pior faixa entre as áreas), concluído há
// mais de 24h, sem contacted_at e sem hot_reminder_sent_at recebe UM lembrete por e-mail para LEAD_NOTIFY_EMAIL
// (nome, criança, faixa etária, telefone com link wa.me e link do /admin); depois grava hot_reminder_sent_at.
// Só olha leads dos últimos 14 dias, para não despejar todo o histórico no primeiro disparo.
//
// ?dry=1: não envia e-mail, não grava nada, devolve o JSON do que faria.
//
// Secrets: OPS_KEY (senha do cabeçalho x-ops-key; sem ela a função responde 401), ALERT_EMAIL (destino dos alertas;
// aceita vários separados por vírgula; se ausente usa LEAD_NOTIFY_EMAIL), LEAD_NOTIFY_EMAIL (lembretes de lead
// quente), BREVO_API_KEY, BREVO_FROM, BREVO_REPLY_TO (já existentes).

import { createClient } from "jsr:@supabase/supabase-js@2";

const SITE = "https://institutofacaamigos.com.br";
const HOT_LOOKBACK_DAYS = 14;
const HOT_MAX_PER_RUN = 50;
const LIST_CAP = 20; // linhas listadas por seção no e-mail
// Um job de 1h/15min sem nenhuma execução há mais de 70 min está parado (margem para o atraso natural do cron).
const JOB_STALE_MINUTES = 70;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const HTML_ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
function esc(v: unknown): string {
  return String(v ?? "").replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

function splitEmails(raw: string | undefined): string[] {
  return (raw ?? "").split(",").map((e) => e.trim()).filter(Boolean);
}

function parseSender(raw: string): { name?: string; email: string } {
  const m = raw.match(/^(.*)<(.+)>$/);
  if (m) return { name: m[1].trim().replace(/^"|"$/g, "") || undefined, email: m[2].trim() };
  return { email: raw.trim() };
}

async function sendBrevo(to: string[], subject: string, html: string, tag: string): Promise<{ sent: boolean; error?: string }> {
  const apiKey = Deno.env.get("BREVO_API_KEY");
  if (!apiKey) return { sent: false, error: "BREVO_API_KEY não configurada" };
  if (to.length === 0) return { sent: false, error: "sem destinatário (ALERT_EMAIL/LEAD_NOTIFY_EMAIL)" };
  const fromRaw = Deno.env.get("BREVO_FROM") ?? "Instituto Faça Amigos <nao-responder@institutofacaamigos.com.br>";
  const replyTo = Deno.env.get("BREVO_REPLY_TO");
  try {
    const resp = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": apiKey, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        sender: parseSender(fromRaw),
        to: to.map((email) => ({ email })),
        ...(replyTo ? { replyTo: parseSender(replyTo) } : {}),
        subject,
        htmlContent: html,
        tags: [tag],
      }),
    });
    if (!resp.ok) {
      const d = await resp.json().catch(() => null);
      return { sent: false, error: d?.message || `Brevo HTTP ${resp.status}` };
    }
    return { sent: true };
  } catch (err) {
    return { sent: false, error: err instanceof Error ? err.message : "erro desconhecido" };
  }
}

// deno-lint-ignore no-explicit-any
type Row = Record<string, any>;

interface Problem {
  key: string;
  title: string;
  count: number;
  items: string[]; // já em texto simples (escapado só na hora de montar o HTML)
}

function shortDate(iso: unknown): string {
  if (typeof iso !== "string" || !iso) return "?";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "?";
  const b = new Date(t - 3 * 3600_000).toISOString(); // Belém, UTC-3
  return `${b.slice(8, 10)}/${b.slice(5, 7)} ${b.slice(11, 16)}`;
}

function cut(s: unknown, n = 140): string {
  const t = String(s ?? "").replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
}

const AGE_LABEL: Record<string, string> = { "4-5": "4 a 5 anos", "6-8": "6 a 8 anos", "9-12": "9 a 12 anos", "13-17": "13 a 17 anos" };

Deno.serve(async (req) => {
  const expected = Deno.env.get("OPS_KEY") ?? "";
  const given = req.headers.get("x-ops-key") ?? "";
  if (!expected || !safeEqual(given, expected)) return json({ error: "não autorizado" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "serviço indisponível" }, 500);
  const admin = createClient(supabaseUrl, serviceRoleKey);

  const dry = new URL(req.url).searchParams.get("dry") === "1";
  const now = Date.now();
  const since = new Date(now - 24 * 3600_000).toISOString();
  const problems: Problem[] = [];
  const checkErrors: string[] = []; // falha ao executar uma verificação também é um problema

  // (a) e-mails de lead que falharam
  {
    const { data, error } = await admin
      .from("fa_leads_teste_comportamento")
      .select("id, child_first_name, guardian_email, email_error, result_email_error, completed_at")
      .gte("completed_at", since)
      .or("email_error.not.is.null,result_email_error.not.is.null")
      .order("completed_at", { ascending: false })
      .limit(100);
    if (error) checkErrors.push(`leads com erro de e-mail: ${error.message}`);
    else if (data && data.length) {
      problems.push({
        key: "lead_email_error",
        title: "Leads do teste com falha ao enviar e-mail",
        count: data.length,
        items: data.map((l: Row) => {
          const parts = [
            l.email_error ? `aviso interno: ${cut(l.email_error, 80)}` : "",
            l.result_email_error ? `resultado ao responsável: ${cut(l.result_email_error, 80)}` : "",
          ].filter(Boolean).join(" | ");
          return `${shortDate(l.completed_at)} · ${l.child_first_name ?? "?"} · ${l.guardian_email ?? "sem e-mail"} · ${parts}`;
        }),
      });
    }
  }

  // (b) resultado que nunca saiu (sem erro registrado, mas sem result_email_sent_at)
  {
    const thirtyMinAgo = new Date(now - 30 * 60_000).toISOString();
    const { data, error } = await admin
      .from("fa_leads_teste_comportamento")
      .select("id, child_first_name, guardian_email, completed_at")
      .eq("status", "completed")
      .is("result_email_sent_at", null)
      .is("result_email_error", null) // os que têm erro já entram em (a)
      .gte("completed_at", since)
      .lt("completed_at", thirtyMinAgo)
      .order("completed_at", { ascending: false })
      .limit(100);
    if (error) checkErrors.push(`leads sem e-mail de resultado: ${error.message}`);
    else if (data && data.length) {
      problems.push({
        key: "lead_result_email_missing",
        title: "Leads concluídos há mais de 30 min sem e-mail de resultado enviado",
        count: data.length,
        items: data.map((l: Row) => `${shortDate(l.completed_at)} · ${l.child_first_name ?? "?"} · ${l.guardian_email ?? "sem e-mail"}`),
      });
    }
  }

  // (c) eventos da Hotmart com erro de processamento
  {
    const { data, error } = await admin
      .from("fa_hotmart_eventos")
      .select("event_id, event, transaction, received_at, error")
      .not("error", "is", null)
      .gte("received_at", since)
      .order("received_at", { ascending: false })
      .limit(100);
    if (error) checkErrors.push(`eventos da Hotmart: ${error.message}`);
    else if (data && data.length) {
      problems.push({
        key: "hotmart_event_error",
        title: "Eventos da Hotmart com erro de processamento",
        count: data.length,
        items: data.map((e: Row) => `${shortDate(e.received_at)} · ${e.event} · ${e.transaction ?? "sem transação"} · ${cut(e.error, 100)}`),
      });
    }
  }

  // (d) pg_cron / pg_net via fa_health_snapshot()
  {
    const { data, error } = await admin.rpc("fa_health_snapshot");
    if (error || !data) {
      checkErrors.push(`fa_health_snapshot: ${error?.message ?? "sem retorno"} (a migration 20260921150000 foi aplicada?)`);
    } else {
      const snap = data as Row;
      const failed: Row[] = Array.isArray(snap.failed_runs_24h) ? snap.failed_runs_24h : [];
      if (failed.length) {
        problems.push({
          key: "cron_failed_runs",
          title: "Execuções do cron que falharam (24h)",
          count: failed.length,
          items: failed.map((f: Row) => `${shortDate(f.start_time)} · ${f.jobname ?? "job desconhecido"} · ${cut(f.return_message, 120)}`),
        });
      }
      const stale: string[] = [];
      const jobs: Row[] = Array.isArray(snap.jobs) ? snap.jobs : [];
      for (const j of jobs) {
        if (!j.jobname) {
          if (j.error) stale.push(String(j.error));
          continue;
        }
        if (!j.exists) stale.push(`${j.jobname}: job não está agendado`);
        else if (!j.active) stale.push(`${j.jobname}: job desativado`);
        else {
          const last = j.last_run_at ? new Date(j.last_run_at).getTime() : 0;
          const ageMin = last ? Math.round((now - last) / 60_000) : null;
          if (ageMin === null) stale.push(`${j.jobname}: nunca executou`);
          else if (ageMin > JOB_STALE_MINUTES) stale.push(`${j.jobname}: sem execução há ${ageMin} min (última em ${shortDate(j.last_run_at)})`);
        }
      }
      if (stale.length) {
        problems.push({ key: "cron_job_stale", title: "Jobs do cron parados ou ausentes", count: stale.length, items: stale });
      }
      const http: Row[] = Array.isArray(snap.http_errors_24h) ? snap.http_errors_24h : [];
      if (http.length) {
        problems.push({
          key: "cron_http_errors",
          title: "Chamadas HTTP do cron com erro (pg_net)",
          count: http.length,
          items: http.map((h: Row) => `${shortDate(h.created)} · HTTP ${h.status_code ?? "?"}${h.timed_out ? " · timeout" : ""} · ${cut(h.error_msg || h.content, 100)}`),
        });
      }
    }
  }

  // (e) cupons do Wi-Fi com e-mail que falhou
  {
    const { data, error } = await admin
      .from("fa_wifi_leads")
      .select("id, coupon_code, guardian_email, email_error, created_at")
      .not("email_error", "is", null)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) checkErrors.push(`cupons Wi-Fi: ${error.message}`);
    else if (data && data.length) {
      problems.push({
        key: "wifi_email_error",
        title: "Cupons Wi-Fi com falha ao enviar e-mail",
        count: data.length,
        items: data.map((w: Row) => `${shortDate(w.created_at)} · ${w.coupon_code} · ${w.guardian_email ?? "sem e-mail"} · ${cut(w.email_error, 100)}`),
      });
    }
  }

  if (checkErrors.length) {
    problems.push({ key: "check_failed", title: "Verificações que não conseguiram rodar", count: checkErrors.length, items: checkErrors });
  }

  // ----- Alerta (só se houver problema) -----
  const alertTo = splitEmails(Deno.env.get("ALERT_EMAIL")).length ? splitEmails(Deno.env.get("ALERT_EMAIL")) : splitEmails(Deno.env.get("LEAD_NOTIFY_EMAIL"));
  let alert: { would_send?: boolean; sent?: boolean; error?: string; to: string[] } = { to: alertTo };
  if (problems.length) {
    const sections = problems.map((p) => {
      const shown = p.items.slice(0, LIST_CAP).map((i) => `<li style="margin:3px 0;">${esc(i)}</li>`).join("");
      const more = p.items.length > LIST_CAP ? `<li style="margin:3px 0;color:#6b7280;">… e mais ${p.items.length - LIST_CAP}</li>` : "";
      return `<h3 style="margin:22px 0 6px;font-size:15px;color:#065264;">${esc(p.title)} (${p.count})</h3><ul style="margin:0;padding-left:20px;font-size:13px;line-height:1.5;color:#111827;">${shown}${more}</ul>`;
    }).join("");
    const html = `<div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#111827;">
      <div style="background:#065264;color:#fff;padding:18px 22px;border-radius:14px 14px 0 0;"><span style="font-size:18px;font-weight:bold;">Alerta de saúde do FaçaAmigos</span></div>
      <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 14px 14px;padding:8px 22px 22px;">
        <p style="font-size:14px;margin:14px 0 0;">Encontramos ${problems.length} tipo(s) de problema nas últimas 24h. Horários em Belém.</p>
        ${sections}
        <p style="font-size:11px;color:#9ca3af;margin-top:26px;">E-mail automático da rotina fa-health. Você só recebe esta mensagem quando há algo a conferir.</p>
      </div></div>`;
    if (dry) {
      alert = { to: alertTo, would_send: true };
    } else {
      const r = await sendBrevo(alertTo, `Alerta FaçaAmigos: ${problems.length} problema(s) nas últimas 24h`, html, "fa_health_alert");
      alert = { to: alertTo, sent: r.sent, ...(r.error ? { error: r.error } : {}) };
      if (!r.sent) console.error("fa-health: falha ao enviar alerta:", r.error);
    }
  }

  // ----- Follow-up de lead quente -----
  const hot: { candidates: number; leads: Row[]; reminder?: { would_send?: boolean; sent?: boolean; error?: string; to: string[] } } = { candidates: 0, leads: [] };
  {
    const notifyTo = splitEmails(Deno.env.get("LEAD_NOTIFY_EMAIL"));
    const dayAgo = new Date(now - 24 * 3600_000).toISOString();
    const lookback = new Date(now - HOT_LOOKBACK_DAYS * 86400_000).toISOString();
    const { data, error } = await admin
      .from("fa_leads_teste_comportamento")
      .select("id, child_first_name, child_age_range, guardian_name, guardian_phone, completed_at")
      .eq("status", "completed")
      .eq("result_band", "tier3")
      .is("contacted_at", null)
      .is("hot_reminder_sent_at", null)
      .lt("completed_at", dayAgo)
      .gte("completed_at", lookback)
      .order("completed_at", { ascending: true })
      .limit(HOT_MAX_PER_RUN);
    if (error) {
      console.error("fa-health: lead quente:", error.message);
      hot.reminder = { to: notifyTo, error: `consulta falhou: ${error.message}` };
    } else {
      let leads: Row[] = data ?? [];
      hot.candidates = leads.length;

      if (leads.length && !dry) {
        // Reserva antes de enviar: duas execuções simultâneas não mandam o mesmo lembrete duas vezes.
        const stamp = new Date().toISOString();
        const { data: claimed, error: claimError } = await admin
          .from("fa_leads_teste_comportamento")
          .update({ hot_reminder_sent_at: stamp })
          .in("id", leads.map((l) => l.id))
          .is("hot_reminder_sent_at", null)
          .is("contacted_at", null)
          .select("id");
        if (claimError) {
          hot.reminder = { to: notifyTo, error: `reserva falhou: ${claimError.message}` };
          leads = [];
        } else {
          const ok = new Set((claimed ?? []).map((c: Row) => c.id));
          leads = leads.filter((l) => ok.has(l.id));
        }
      }
      hot.leads = leads.map((l) => ({
        id: l.id,
        guardian_name: l.guardian_name,
        child_first_name: l.child_first_name,
        child_age_range: l.child_age_range,
        guardian_phone: l.guardian_phone,
        completed_at: l.completed_at,
      }));

      if (leads.length) {
        const rows = leads.map((l) => {
          const phone = String(l.guardian_phone ?? "").replace(/\D/g, "");
          const wa = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(`Olá ${l.guardian_name ?? ""}! Vi que você fez o Mapeamento Comportamental do ${l.child_first_name ?? "seu filho(a)"} pelo site do FaçaAmigos. Posso te ajudar com os próximos passos?`)}` : "";
          return `<tr>
            <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;">${esc(l.guardian_name ?? "—")}</td>
            <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;">${esc(l.child_first_name ?? "—")}</td>
            <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;">${esc(AGE_LABEL[l.child_age_range] ?? l.child_age_range ?? "—")}</td>
            <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;white-space:nowrap;">${wa ? `<a href="${esc(wa)}" style="color:#065264;font-weight:bold;">${esc(l.guardian_phone)}</a>` : "—"}</td>
            <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;white-space:nowrap;color:#6b7280;">${esc(shortDate(l.completed_at))}</td>
          </tr>`;
        }).join("");
        const html = `<div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#111827;">
          <div style="background:#065264;color:#fff;padding:18px 22px;border-radius:14px 14px 0 0;"><span style="font-size:18px;font-weight:bold;">Famílias esperando retorno</span></div>
          <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 14px 14px;padding:16px 22px 22px;">
            <p style="font-size:14px;margin:0 0 12px;">${leads.length === 1 ? "1 família fez" : `${leads.length} famílias fizeram`} o Mapeamento, teve área em atenção especial e ainda não foi contatada há mais de 24h. Vale chamar no WhatsApp.</p>
            <table style="border-collapse:collapse;width:100%;font-size:13px;">
              <tr style="background:#fdf3e1;text-align:left;"><th style="padding:8px 10px;">Responsável</th><th style="padding:8px 10px;">Criança</th><th style="padding:8px 10px;">Faixa etária</th><th style="padding:8px 10px;">WhatsApp</th><th style="padding:8px 10px;">Concluiu</th></tr>
              ${rows}
            </table>
            <p style="text-align:center;margin:22px 0 4px;"><a href="${SITE}/admin" style="display:inline-block;background:#FDC51D;color:#065264;font-weight:bold;text-decoration:none;padding:12px 24px;border-radius:9999px;">Abrir o painel e marcar como contatado</a></p>
            <p style="font-size:11px;color:#9ca3af;margin-top:22px;">Lembrete único por família, enviado pela rotina fa-health. Horários em Belém.</p>
          </div></div>`;
        if (dry) {
          hot.reminder = { to: notifyTo, would_send: true };
        } else {
          const r = await sendBrevo(notifyTo, `Lembrete: ${leads.length === 1 ? "1 família aguarda retorno" : `${leads.length} famílias aguardam retorno`} (Mapeamento)`, html, "fa_hot_lead_reminder");
          hot.reminder = { to: notifyTo, sent: r.sent, ...(r.error ? { error: r.error } : {}) };
          if (!r.sent) {
            console.error("fa-health: falha no lembrete de lead quente:", r.error);
            // Desfaz a reserva para a próxima execução tentar de novo.
            await admin
              .from("fa_leads_teste_comportamento")
              .update({ hot_reminder_sent_at: null })
              .in("id", leads.map((l) => l.id));
          }
        }
      }
    }
  }

  return json({
    ok: true,
    dry,
    checked_at: new Date(now).toISOString(),
    since,
    problems,
    alert,
    hot_leads: hot,
  });
});

// Recebe o cadastro do portal Wi-Fi do hotspot MikroTik hEX S instalado na
// clínica (Rua Boaventura da Silva, 1573 · Umarizal). Chamado por
// hotspot/login.html no instante em que a família libera a internet.
// Segue o mesmo padrão de behavior-test-webhook: Deno.serve simples,
// verify_jwt desligado (chamada vem do roteador, sem chave pública),
// CORS/JSON inline (deploy via MCP não resolve import relativo).
//
// Gera um cupom nominal "ESPERA-XXXX", grava o lead e dispara o e-mail via
// Brevo com o cupom — porque a janela do portal cativo fecha sozinha assim
// que o celular detecta internet, e o cupom não pode existir só na tela.
//
// Falha de rede/gravação aqui NUNCA deve travar o acesso à internet do
// visitante: hotspot/login.html já ignora erros deste endpoint em silêncio
// e libera o Wi-Fi de qualquer forma. Esta função só perde o registro do
// lead nesse caso — não há tentativa de retry no cliente.

import { createClient } from "jsr:@supabase/supabase-js@2";

const LOGO_URL = "https://institutofacaamigos.com.br/img/logo-simbolo.png";

// O portal roda dentro do navegador do celular do visitante, servido pelo
// próprio roteador (sem HTTPS, sem domínio fixo) — por isso a allowlist de
// CORS aqui é mais permissiva que a de behavior-test-webhook. A superfície
// de risco é baixa: o endpoint só aceita os campos validados abaixo.
function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  return `55${digits}`;
}

function isValidPhone(digits: string): boolean {
  return /^55\d{10,11}$/.test(digits);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseSenderAddress(raw: string): { name?: string; email: string } {
  const match = raw.match(/^(.*)<(.+)>$/);
  if (match) {
    const name = match[1].trim().replace(/^"|"$/g, "");
    return { name: name || undefined, email: match[2].trim() };
  }
  return { email: raw.trim() };
}

function generateCouponCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem O/0/I/1 — evita confusão na leitura
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `ESPERA-${code}`;
}

const COUPON_VALIDITY_DAYS = 15;

// Unidade "FaçaAmigos Circuito (Parque Shopping)" no banco do kiosk (mesmo
// projeto Supabase). Usada para criar o cupom nativo de +5 min — ver
// syncKioskCoupon() abaixo. Se a unidade for recriada algum dia, atualizar
// este id (confirmar com: select id from fa_kiosk_units where name ilike
// '%circuito%').
const CIRCUITO_UNIT_ID = "e43ba7a8-bd5f-47ad-b81d-dae7ea19d504";
const CIRCUITO_BONUS_MINUTES = 5;

// Cria, no MESMO código do cupom "ESPERA-XXXX", um cupom nativo do kiosk
// (fa_kiosk_coupons, kind=MINUTOS_EXTRA) com max_uses=1. O check-in do
// Circuito já aceita p_coupon_code — ao digitar o código, o kiosk aplica os
// minutos extras e bloqueia qualquer segunda tentativa com o mesmo código,
// em qualquer unidade ou dia. Isso resolve o risco de a família reusar ou
// repassar o código adiante: o bloqueio é feito pelo próprio banco do
// kiosk, não depende do atendente lembrar de checar nada.
//
// Best-effort: se isso falhar, o cadastro do Wi-Fi e o e-mail do cupom
// seguem normalmente — só o benefício automático no Circuito fica
// indisponível (o atendente ainda pode aplicar manualmente).
async function syncKioskCoupon(
  admin: ReturnType<typeof createClient>,
  params: { couponCode: string; guardianName: string },
): Promise<{ synced: boolean; error?: string }> {
  const { error } = await admin.from("fa_kiosk_coupons").insert({
    unit_id: CIRCUITO_UNIT_ID,
    code: params.couponCode,
    kind: "MINUTOS_EXTRA",
    value: CIRCUITO_BONUS_MINUTES,
    max_uses: 1,
    description: `Wi-Fi da clínica — ${params.guardianName}`,
  });
  if (error) return { synced: false, error: error.message ?? "erro desconhecido" };
  return { synced: true };
}

async function sendCouponEmail(params: {
  guardianName: string;
  guardianEmail: string;
  couponCode: string;
  couponExpiresAt: Date;
}): Promise<{ sent: boolean; error?: string }> {
  const apiKey = Deno.env.get("BREVO_API_KEY");
  const fromRaw = Deno.env.get("BREVO_FROM") ?? "Instituto Faça Amigos <nao-responder@institutofacaamigos.com.br>";
  const replyTo = Deno.env.get("BREVO_REPLY_TO");
  if (!apiKey) return { sent: false, error: "BREVO_API_KEY não configurada" };

  const expiresLabel = params.couponExpiresAt.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const waPlayground = `https://wa.me/5591992347673?text=${encodeURIComponent(
    `Olá! Sou ${params.guardianName}, vim da clínica e quero usar meu cupom ${params.couponCode}`,
  )}`;

  const html = `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#FFF9F1;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#FFF9F1;padding:24px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;width:100%;background:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid #E7DFC9;">
        <tr><td style="background:#FFFFFF;padding:18px 32px 10px 32px;text-align:center;">
          <img src="${LOGO_URL}" alt="Instituto Faça Amigos" width="36" height="36" style="display:inline-block;vertical-align:middle;margin-right:8px;">
          <span style="font-family:Arial,sans-serif;font-size:15px;font-weight:800;color:#1A3F35;vertical-align:middle;">Faça<span style="color:#f0196b;">Amigos</span></span>
        </td></tr>
        <tr><td style="background:linear-gradient(135deg,#f0196b 0%,#c8155a 100%);padding:24px 32px;text-align:center;">
          <h1 style="margin:0;font-family:Arial,sans-serif;font-size:20px;color:#fff;">Seu cupom da sala de espera chegou!</h1>
        </td></tr>
        <tr><td style="padding:28px 32px 8px 32px;">
          <p style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#3A4258;margin:0 0 16px 0;">Olá, ${escapeHtml(params.guardianName)}! Obrigado por se conectar ao Wi-Fi da clínica FaçaAmigos.</p>
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#FFF9F1;border:2px dashed #2ECFB5;border-radius:14px;margin-bottom:18px;">
            <tr><td style="padding:18px;text-align:center;">
              <div style="font-family:Arial,sans-serif;font-size:12px;color:#4C6B62;font-weight:700;text-transform:uppercase;letter-spacing:.05em;">Seu código</div>
              <div style="font-family:'Courier New',monospace;font-size:26px;font-weight:900;color:#1A3F35;letter-spacing:.05em;margin:6px 0;">${escapeHtml(params.couponCode)}</div>
              <div style="font-family:Arial,sans-serif;font-size:12px;color:#4C6B62;">Válido até ${expiresLabel}</div>
            </tr></td>
          </table>
          <p style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#3A4258;margin:0 0 6px 0;font-weight:800;">Apresente na recepção do Playground ou do quiosque do Circuito, no Parque Shopping, e escolha <strong>um</strong> destes benefícios:</p>
          <ul style="font-family:Arial,sans-serif;font-size:14px;line-height:1.7;color:#3A4258;margin:0 0 8px 0;padding-left:20px;">
            <li>Meia inclusiva (R$ 50 na entrada) para crianças com laudo ou CIPTEA — todo dia</li>
            <li>+5 minutos grátis no Circuito, em qualquer plano — de segunda a sexta</li>
          </ul>
          <p style="font-family:Arial,sans-serif;font-size:12px;line-height:1.5;color:#8791A6;margin:0 0 20px 0;font-style:italic;">Use um benefício por visita — Playground ou Circuito, nunca os dois na mesma vinda.</p>
          <div style="text-align:center;margin-bottom:8px;">
            <a href="${waPlayground}" style="display:inline-block;background:#25D366;color:#fff;font-weight:800;text-decoration:none;padding:14px 26px;border-radius:9999px;font-size:15px;">Falar no WhatsApp</a>
          </div>
        </td></tr>
        <tr><td style="padding:8px 32px 28px 32px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#9ca3af;">Você recebeu este e-mail porque se conectou ao Wi-Fi da clínica FaçaAmigos e autorizou o contato.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  try {
    const resp = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": apiKey, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        sender: parseSenderAddress(fromRaw),
        to: [{ email: params.guardianEmail, name: params.guardianName }],
        subject: `Seu cupom ESPERA (${params.couponCode}) — Instituto Faça Amigos`,
        htmlContent: html,
        ...(replyTo ? { replyTo: parseSenderAddress(replyTo) } : {}),
      }),
    });
    if (!resp.ok) {
      const data = await resp.json().catch(() => null);
      return { sent: false, error: data?.message || `Erro HTTP ${resp.status}` };
    }
    return { sent: true };
  } catch (err) {
    return { sent: false, error: err instanceof Error ? err.message : "erro desconhecido" };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders() });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "corpo inválido" }, 400);
  }

  // Honeypot: campo invisível no formulário. Humano nunca preenche.
  if (str(body["website-hp"])) {
    return jsonResponse({ ok: true });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY ausentes");
    return jsonResponse({ error: "serviço indisponível" }, 500);
  }
  const admin = createClient(supabaseUrl, serviceRoleKey);

  const guardianName = str(body.guardian_name);
  const guardianEmail = str(body.guardian_email);
  const guardianPhoneRaw = str(body.guardian_phone);
  const mac = str(body.mac).toLowerCase();
  const optInWhatsapp = body.marketing_opt_in_whatsapp === true;
  const optInEmail = body.marketing_opt_in_email === true;
  const utmSource = str(body.utm_source) || "wifi";
  const utmMedium = str(body.utm_medium) || "captive_portal";
  const utmCampaign = str(body.utm_campaign) || "clinica_fatima";
  const landingPage = str(body.landing_page) || "hotspot/login.html";

  if (guardianName.length < 2) {
    return jsonResponse({ error: "nome é obrigatório" }, 400);
  }
  if (!EMAIL_RE.test(guardianEmail)) {
    return jsonResponse({ error: "e-mail inválido" }, 400);
  }
  const guardianPhone = normalizePhone(guardianPhoneRaw);
  if (!isValidPhone(guardianPhone)) {
    return jsonResponse({ error: "WhatsApp inválido" }, 400);
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
  const userAgent = req.headers.get("user-agent") || "";

  // Rate limit simples: máx. 20 cadastros por IP na última hora (sala de
  // espera é tráfego concentrado num único IP público — limite mais alto
  // que o de /teste, que é tráfego residencial disperso).
  if (ip) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await admin
      .from("fa_wifi_leads")
      .select("id", { count: "exact", head: true })
      .eq("ip", ip)
      .gte("created_at", oneHourAgo);
    if ((count ?? 0) >= 20) {
      return jsonResponse({ error: "muitas tentativas, tente novamente mais tarde" }, 429);
    }
  }

  // Reconexão: mesmo MAC já cadastrado nos últimos 15 dias → reaproveita o
  // cupom vigente em vez de emitir outro (evita inflar cupons a cada visita
  // do mesmo aparelho) e só incrementa o contador de visitas.
  if (mac) {
    const { data: existing } = await admin
      .from("fa_wifi_leads")
      .select("id, coupon_code, coupon_status, coupon_expires_at, visit_count")
      .eq("mac", mac)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing && new Date(existing.coupon_expires_at) > new Date()) {
      await admin
        .from("fa_wifi_leads")
        .update({ visit_count: (existing.visit_count ?? 1) + 1 })
        .eq("id", existing.id);
      return jsonResponse({ ok: true, coupon_code: existing.coupon_code, reused: true });
    }
  }

  const couponExpiresAt = new Date(Date.now() + COUPON_VALIDITY_DAYS * 24 * 60 * 60 * 1000);

  // Código de 4 caracteres tem colisão possível (unique em coupon_code): gera outro e tenta de novo.
  let couponCode = generateCouponCode();
  let data: { id: string } | null = null;
  let error: { code?: string } | null = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    ({ data, error } = await admin
      .from("fa_wifi_leads")
      .insert({
        guardian_name: guardianName,
        guardian_phone: guardianPhone,
        guardian_email: guardianEmail,
        mac: mac || null,
        coupon_code: couponCode,
        coupon_status: "issued",
        coupon_expires_at: couponExpiresAt.toISOString(),
        consent_at: str(body.consent_at) || new Date().toISOString(),
        marketing_opt_in_whatsapp: optInWhatsapp,
        marketing_opt_in_email: optInEmail,
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
        landing_page: landingPage,
        ip: ip || null,
        user_agent: userAgent || null,
      })
      .select("id")
      .single());
    if (!error || error.code !== "23505") break;
    couponCode = generateCouponCode();
  }

  if (error || !data) {
    console.error("Erro ao gravar lead do Wi-Fi:", error);
    return jsonResponse({ error: "falha ao registrar cadastro" }, 500);
  }

  // Sincroniza o cupom no kiosk (best-effort: nunca falha o cadastro).
  // Aguardamos aqui — em edge functions, uma promise não aguardada pode ser
  // cancelada assim que a resposta é enviada, então "dispara e esquece" não
  // é seguro neste ambiente.
  const kioskResult = await syncKioskCoupon(admin, { couponCode, guardianName }).catch((err) => ({
    synced: false,
    error: err instanceof Error ? err.message : "erro desconhecido",
  }));
  if (!kioskResult.synced) {
    console.error("Erro ao sincronizar cupom no kiosk:", kioskResult.error);
  }

  const emailResult = await sendCouponEmail({
    guardianName,
    guardianEmail,
    couponCode,
    couponExpiresAt,
  });

  await admin
    .from("fa_wifi_leads")
    .update({
      ...(emailResult.sent
        ? { email_sent_at: new Date().toISOString() }
        : { email_error: emailResult.error ?? "falha desconhecida" }),
      ...(kioskResult.synced
        ? { kiosk_coupon_synced_at: new Date().toISOString() }
        : { kiosk_coupon_error: kioskResult.error ?? "falha desconhecida" }),
    })
    .eq("id", data.id);

  return jsonResponse({ ok: true, coupon_code: couponCode, email_sent: emailResult.sent });
});

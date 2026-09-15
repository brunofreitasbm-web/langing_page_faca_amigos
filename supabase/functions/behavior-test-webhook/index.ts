// Recebe os dois eventos do funil de /teste (Teste de Comportamento —
// Instituto FaçaAmigos): "start" (etapa 0, fricção mínima, permite medir
// abandono) e "complete" (gate de contato final). Segue o mesmo padrão de
// job-application-webhook: Deno.serve simples, verify_jwt desligado (o
// site é estático, sem chave pública para assinar nada), CORS/JSON
// inline em vez de importar de ../_shared — o deploy via MCP não resolve
// import relativo (mesmo motivo documentado em owner-email-dispatch).
//
// O score e a faixa de resultado são SEMPRE recalculados aqui a partir do
// QUESTIONS/BANDS abaixo — nunca confiamos em score vindo do cliente. Este
// arquivo deve ficar em sincronia com teste-perguntas.json (mesmo
// "version"); se divergir, respondemos 409 e o cliente recarrega.

import { createClient } from "jsr:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://institutofacaamigos.com.br",
  "https://www.institutofacaamigos.com.br",
  "https://playground.institutofacaamigos.com.br",
  "http://127.0.0.1:5500",
  "http://localhost:5500",
  "http://localhost:3000",
];

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

function jsonResponse(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(req) },
  });
}

// ---------------------------------------------------------------------
// Motor do teste — mantido em sincronia com teste-perguntas.json
// ---------------------------------------------------------------------

const TEST_VERSION = "2026-09-placeholder";

const QUESTION_IDS = ["q01", "q02", "q03", "q04", "q05", "q06", "q07", "q08"];

const BANDS = [
  { key: "esperado", min: 0, max: 8, title: "Dentro do esperado para a idade" },
  { key: "observar", min: 9, max: 16, title: "Vale a pena observar de perto" },
  { key: "recomendado", min: 17, max: 24, title: "Recomendamos uma avaliação profissional" },
] as const;

function computeScore(answers: Array<{ id: string; v: number }>): number {
  const byId = new Map(answers.map((a) => [a.id, a.v]));
  let total = 0;
  for (const id of QUESTION_IDS) {
    const v = byId.get(id);
    if (typeof v === "number" && v >= 0 && v <= 3) total += v;
  }
  return total;
}

function bandFor(score: number) {
  return BANDS.find((b) => score >= b.min && score <= b.max) ?? BANDS[BANDS.length - 1];
}

// ---------------------------------------------------------------------
// Validação
// ---------------------------------------------------------------------

const AGE_RANGES = ["0-1", "2-3", "4-5", "6-8", "9-12", "13+"];
const RELATIONS = ["mae", "pai", "responsavel", "outro"];
const UNITS = ["PARQUE_SHOPPING", "BOSQUE_GRAO_PARA", "CLINICA_FATIMA", ""];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  return `55${digits}`;
}

function isValidPhone(digits: string): boolean {
  // 55 + DDD (2) + número (8 ou 9) = 12 ou 13 dígitos
  return /^55\d{10,11}$/.test(digits);
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

// ---------------------------------------------------------------------
// E-mail (Brevo) — layout portado de lib/email.ts (renderBrandEmailHtml)
// ---------------------------------------------------------------------

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

async function sendLeadEmailToIdealizadora(params: {
  leadId: string;
  childFirstName: string;
  childAgeRange: string;
  guardianRelation: string;
  guardianName: string;
  guardianEmail: string;
  guardianPhone: string;
  preferredUnit: string;
  score: number;
  band: { key: string; title: string };
  answers: Array<{ id: string; v: number }>;
  utm: Record<string, string>;
  landingPage: string;
}): Promise<{ sent: boolean; error?: string }> {
  const apiKey = Deno.env.get("BREVO_API_KEY");
  // LEAD_NOTIFY_EMAIL aceita um ou mais e-mails separados por vírgula
  // (ex.: "isabella.goncalves@gmail.com,institutofacaamigos@gmail.com") —
  // todos recebem o mesmo aviso de lead.
  const notifyToList = (Deno.env.get("LEAD_NOTIFY_EMAIL") ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  const fromRaw = Deno.env.get("BREVO_FROM") ?? "Instituto Faça Amigos <nao-responder@institutofacaamigos.com.br>";
  const replyTo = Deno.env.get("BREVO_REPLY_TO");

  if (!apiKey || notifyToList.length === 0) {
    return { sent: false, error: "BREVO_API_KEY/LEAD_NOTIFY_EMAIL não configurados" };
  }

  const waDigits = params.guardianPhone;
  const waText = encodeURIComponent(
    `Olá ${params.guardianName}! Vi que você fez o Teste de Comportamento do ${params.childFirstName} pelo site do FaçaAmigos. Posso te ajudar com os próximos passos?`,
  );
  const waLink = `https://wa.me/${waDigits}?text=${waText}`;

  const answersRows = params.answers
    .map((a) => `<tr><td style="padding:4px 12px 4px 0;color:#6b7280;">${escapeHtml(a.id)}</td><td style="padding:4px 0;font-weight:700;color:#111827;">${a.v}</td></tr>`)
    .join("");

  const utmRows = Object.entries(params.utm)
    .filter(([, v]) => v)
    .map(([k, v]) => `<div>${escapeHtml(k)}: <strong>${escapeHtml(v)}</strong></div>`)
    .join("");

  const html = `
<div style="font-family:'Nunito','Segoe UI',Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a3f35;">
  <div style="font-size:11px;color:#9ca3af;text-align:center;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.05em;font-weight:700;">🤖 E-mail automático — Favor não responder a esta mensagem</div>
  <div style="background:linear-gradient(135deg,#f0196b 0%,#c8155a 100%);padding:28px 24px;border-radius:24px 24px 0 0;text-align:center;">
    <h1 style="margin:0;font-family:'Fredoka One',cursive,sans-serif;font-weight:400;font-size:24px;color:#fff;">Novo lead do Teste de Comportamento</h1>
  </div>
  <div style="background:#fff;padding:28px 24px;border-radius:0 0 24px 24px;">
    <p style="margin:0 0 6px;font-size:15px;"><strong>Responsável:</strong> ${escapeHtml(params.guardianName)} (${escapeHtml(params.guardianRelation)})</p>
    <p style="margin:0 0 6px;font-size:15px;"><strong>E-mail:</strong> ${escapeHtml(params.guardianEmail)}</p>
    <p style="margin:0 0 6px;font-size:15px;"><strong>WhatsApp:</strong> ${escapeHtml(params.guardianPhone)}</p>
    <p style="margin:0 0 6px;font-size:15px;"><strong>Criança:</strong> ${escapeHtml(params.childFirstName)} · faixa etária ${escapeHtml(params.childAgeRange)}</p>
    <p style="margin:0 0 6px;font-size:15px;"><strong>Unidade de interesse:</strong> ${escapeHtml(params.preferredUnit || "não informado")}</p>
    <p style="margin:14px 0 6px;font-size:15px;"><strong>Resultado:</strong> ${escapeHtml(params.band.title)} (score ${params.score})</p>
    <div style="text-align:center;margin:20px 0;">
      <a href="${waLink}" style="display:inline-block;background:#25D366;color:#fff;font-weight:800;text-decoration:none;padding:14px 28px;border-radius:9999px;font-size:15px;">Abrir WhatsApp do responsável</a>
    </div>
    <p style="margin:18px 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#9ca3af;font-weight:700;">Respostas</p>
    <table style="border-collapse:collapse;font-size:13px;">${answersRows}</table>
    <p style="margin:18px 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#9ca3af;font-weight:700;">Origem</p>
    <div style="font-size:13px;color:#4C6B62;">${utmRows || "direto"}<div>página: ${escapeHtml(params.landingPage)}</div></div>
    <div style="margin-top:24px;padding-top:16px;border-top:1px solid #f3f4f6;text-align:center;font-size:12px;color:#9ca3af;">
      Mensagem automática emitida pelo sistema FaçaAmigos • Não responda a este e-mail.
    </div>
  </div>
</div>`.trim();

  const sender = parseSenderAddress(fromRaw);

  try {
    const resp = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": apiKey, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        sender,
        to: notifyToList.map((email) => ({ email })),
        subject: `Novo lead do Teste de Comportamento — ${params.childFirstName} | Instituto Faça Amigos`,
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

// ---------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders(req) });
  if (req.method !== "POST") return jsonResponse(req, { error: "method_not_allowed" }, 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(req, { error: "corpo inválido" }, 400);
  }

  const event = str(body.event);
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceRoleKey);

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
  const userAgent = req.headers.get("user-agent") || "";

  if (event === "start") {
    const childFirstName = str(body.child_first_name);
    const childAgeRange = str(body.child_age_range);
    const guardianRelation = str(body.guardian_relation);
    const utm = (body.utm ?? {}) as Record<string, unknown>;
    const landingPage = str(body.landing_page);
    const referrer = str(body.referrer);

    if (!childFirstName || !AGE_RANGES.includes(childAgeRange) || !RELATIONS.includes(guardianRelation)) {
      return jsonResponse(req, { error: "campos obrigatórios ausentes ou inválidos" }, 400);
    }

    // Rate limit simples: máx. 10 starts por IP na última hora.
    if (ip) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count } = await admin
        .from("fa_leads_teste_comportamento")
        .select("id", { count: "exact", head: true })
        .eq("ip", ip)
        .gte("created_at", oneHourAgo);
      if ((count ?? 0) >= 10) {
        return jsonResponse(req, { error: "muitas tentativas, tente novamente mais tarde" }, 429);
      }
    }

    const { data, error } = await admin
      .from("fa_leads_teste_comportamento")
      .insert({
        status: "started",
        child_first_name: childFirstName,
        child_age_range: childAgeRange,
        guardian_relation: guardianRelation,
        test_version: TEST_VERSION,
        utm_source: str(utm.source) || null,
        utm_medium: str(utm.medium) || null,
        utm_campaign: str(utm.campaign) || null,
        utm_content: str(utm.content) || null,
        referrer: referrer || null,
        landing_page: landingPage || null,
        ip: ip || null,
        user_agent: userAgent || null,
      })
      .select("id")
      .single();

    if (error || !data) {
      console.error("Erro ao iniciar lead:", error);
      return jsonResponse(req, { error: "falha ao iniciar teste" }, 500);
    }

    return jsonResponse(req, { lead_id: data.id, test_version: TEST_VERSION });
  }

  if (event === "complete") {
    const leadId = str(body.lead_id);
    const testVersion = str(body.test_version);
    const guardianName = str(body.guardian_name);
    const guardianEmail = str(body.guardian_email);
    const guardianPhoneRaw = str(body.guardian_phone);
    const preferredUnit = str(body.preferred_unit);
    const consent = body.consent === true;
    const rawAnswers = Array.isArray(body.answers) ? body.answers : [];

    if (!leadId) return jsonResponse(req, { error: "lead_id ausente" }, 400);
    if (testVersion !== TEST_VERSION) {
      return jsonResponse(req, { error: "versão do teste desatualizada, recarregue a página" }, 409);
    }
    if (!guardianName || !EMAIL_RE.test(guardianEmail)) {
      return jsonResponse(req, { error: "nome e e-mail válidos são obrigatórios" }, 400);
    }
    const guardianPhone = normalizePhone(guardianPhoneRaw);
    if (!isValidPhone(guardianPhone)) {
      return jsonResponse(req, { error: "WhatsApp inválido" }, 400);
    }
    if (!consent) {
      return jsonResponse(req, { error: "é necessário aceitar o uso dos dados para continuar" }, 400);
    }
    if (preferredUnit && !UNITS.includes(preferredUnit)) {
      return jsonResponse(req, { error: "unidade inválida" }, 400);
    }

    const answers = rawAnswers
      .filter((a): a is { id: string; v: number } =>
        typeof a === "object" && a !== null && typeof (a as any).id === "string" && typeof (a as any).v === "number",
      )
      .filter((a) => QUESTION_IDS.includes(a.id) && a.v >= 0 && a.v <= 3);

    if (answers.length < QUESTION_IDS.length) {
      return jsonResponse(req, { error: "respostas incompletas" }, 400);
    }

    const score = computeScore(answers);
    const band = bandFor(score);

    // Busca o lead "started" para reaproveitar dados da criança.
    const { data: existingLead, error: fetchError } = await admin
      .from("fa_leads_teste_comportamento")
      .select("id, child_first_name, child_age_range, guardian_relation, landing_page, utm_source, utm_medium, utm_campaign")
      .eq("id", leadId)
      .single();

    if (fetchError || !existingLead) {
      return jsonResponse(req, { error: "teste não encontrado, recomece" }, 404);
    }

    // Anti-duplicidade: mesmo e-mail OU telefone já completou nas últimas
    // 24h → atualiza esse registro em vez de manter dois leads da mesma
    // família na lista da idealizadora.
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: dupe } = await admin
      .from("fa_leads_teste_comportamento")
      .select("id")
      .eq("status", "completed")
      .or(`guardian_email.eq.${guardianEmail},guardian_phone.eq.${guardianPhone}`)
      .gte("created_at", oneDayAgo)
      .neq("id", leadId)
      .limit(1)
      .maybeSingle();

    const targetId = dupe?.id ?? leadId;

    const { error: updateError } = await admin
      .from("fa_leads_teste_comportamento")
      .update({
        status: "completed",
        guardian_name: guardianName,
        guardian_email: guardianEmail,
        guardian_phone: guardianPhone,
        preferred_unit: preferredUnit || null,
        answers,
        score,
        result_band: band.key,
        consent_at: new Date().toISOString(),
      })
      .eq("id", targetId);

    if (updateError) {
      console.error("Erro ao concluir lead:", updateError);
      return jsonResponse(req, { error: "falha ao registrar resultado" }, 500);
    }

    const emailResult = await sendLeadEmailToIdealizadora({
      leadId: targetId,
      childFirstName: existingLead.child_first_name,
      childAgeRange: existingLead.child_age_range,
      guardianRelation: existingLead.guardian_relation,
      guardianName,
      guardianEmail,
      guardianPhone,
      preferredUnit,
      score,
      band,
      answers,
      utm: {
        source: existingLead.utm_source ?? "",
        medium: existingLead.utm_medium ?? "",
        campaign: existingLead.utm_campaign ?? "",
      },
      landingPage: existingLead.landing_page ?? "",
    });

    await admin
      .from("fa_leads_teste_comportamento")
      .update(
        emailResult.sent
          ? { email_sent_at: new Date().toISOString() }
          : { email_error: emailResult.error ?? "falha desconhecida" },
      )
      .eq("id", targetId);

    return jsonResponse(req, {
      score,
      result_band: band.key,
      band_title: band.title,
    });
  }

  return jsonResponse(req, { error: "evento inválido" }, 400);
});

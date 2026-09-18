// Recebe os dois eventos do funil de /teste (Teste de Comportamento —
// Instituto FaçaAmigos): "start" (agora já com todos os dados de contato —
// nome, e-mail, WhatsApp do responsável — porque o gate de contato foi
// movido para o início do funil) e "complete" (as 25 respostas). Segue o
// mesmo padrão de job-application-webhook: Deno.serve simples, verify_jwt
// desligado (o site é estático, sem chave pública para assinar nada),
// CORS/JSON inline em vez de importar de ../_shared — o deploy via MCP não
// resolve import relativo (mesmo motivo documentado em owner-email-dispatch).
//
// O score e o resultado por área são SEMPRE recalculados aqui a partir de
// QUESTION_IDS/AREAS abaixo — nunca confiamos em respostas já pontuadas
// vindas do cliente. Este arquivo deve ficar em sincronia com
// teste-perguntas.json (mesmo "version"); se divergir, respondemos 409 e o
// cliente recarrega.
//
// Importante: o nome do instrumento em que este questionário se baseia
// NUNCA deve aparecer em texto público (site, e-mails, painel) — usar
// apenas linguagem de orientação, não de diagnóstico.

import { createClient } from "jsr:@supabase/supabase-js@2";

const LOGO_URL = "https://institutofacaamigos.com.br/img/logo-simbolo.png";

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
// Motor do teste — mantido em sincronia com teste-perguntas.json e com
// os mapas de rótulo em supabase/functions/behavior-test-admin/index.ts
// ---------------------------------------------------------------------

const TEST_VERSION = "2026-09-18";

const QUESTION_IDS = Array.from({ length: 25 }, (_, i) => `q${String(i + 1).padStart(2, "0")}`);

// Itens de pontuação invertida: valor efetivo = 2 - resposta.
const REVERSE_IDS = new Set(["q07", "q11", "q14", "q21", "q25"]);

type AreaKey = "emotional" | "conduct" | "hyperactivity" | "peer" | "prosocial";

interface AreaDef {
  key: AreaKey;
  name: string;
  items: string[];
  inverted: boolean;
  // não invertidas: tier3 se total >= tier3_min; senão tier2 se >= tier2_min; senão tier1.
  // invertidas: tier1 se total >= tier1_min; senão tier2 se >= tier2_min; senão tier3.
  tier2_min: number;
  tier3_min?: number;
  tier1_min?: number;
}

// Ordem oficial de exibição. Ids "qNN" == item 1..25 do questionário fonte.
const AREAS: AreaDef[] = [
  {
    key: "emotional",
    name: "Emoções e segurança",
    items: ["q03", "q08", "q13", "q16", "q24"],
    inverted: false,
    tier2_min: 4,
    tier3_min: 5,
  },
  {
    key: "conduct",
    name: "Rotina e limites",
    items: ["q05", "q07", "q12", "q18", "q22"],
    inverted: false,
    tier2_min: 3,
    tier3_min: 4,
  },
  {
    key: "hyperactivity",
    name: "Foco e energia",
    items: ["q02", "q10", "q15", "q21", "q25"],
    inverted: false,
    tier2_min: 6,
    tier3_min: 7,
  },
  {
    key: "peer",
    name: "Amizades e convivência",
    items: ["q06", "q11", "q14", "q19", "q23"],
    inverted: false,
    tier2_min: 3,
    tier3_min: 4,
  },
  {
    key: "prosocial",
    name: "Empatia e gentileza",
    items: ["q01", "q04", "q09", "q17", "q20"],
    inverted: true,
    tier1_min: 7,
    tier2_min: 5,
  },
];

type Tier = "tier1" | "tier2" | "tier3";

const DEFAULT_TIER_LABELS: Record<AreaKey, Record<Tier, string>> = {
  emotional: { tier1: "Está fluindo bem", tier2: "Merece um olhar mais de perto", tier3: "Merece atenção especial" },
  conduct: { tier1: "Está fluindo bem", tier2: "Merece um olhar mais de perto", tier3: "Merece atenção especial" },
  hyperactivity: { tier1: "Está fluindo bem", tier2: "Merece um olhar mais de perto", tier3: "Merece atenção especial" },
  peer: { tier1: "Está fluindo bem", tier2: "Merece um olhar mais de perto", tier3: "Merece atenção especial" },
  prosocial: { tier1: "Está fluindo bem", tier2: "Em desenvolvimento", tier3: "Merece incentivo especial" },
};

// Textos verbatim do banco de devolutiva automatizada da idealizadora.
const DEFAULT_FEEDBACK: Record<AreaKey, Record<Tier, string>> = {
  emotional: {
    tier1: "Seu filho(a) parece lidar bem com as próprias emoções no dia a dia. Momentos de tristeza ou medo aparecem, mas de forma leve e passageira — sinal de que ele(a) está encontrando formas saudáveis de se expressar.",
    tier2: "Alguns sinais de insegurança apareceram nas suas respostas — talvez um choro mais frequente, medos específicos ou queixas físicas em certos momentos (como antes de sair de casa). Vale observar com carinho quando esses momentos acontecem, sem pressa para \"resolver\" — muitas vezes é só uma forma de pedir colo.",
    tier3: "Suas respostas indicam que as emoções do seu filho(a) parecem estar mais pesadas ultimamente — choro frequente, medos mais intensos ou queixas físicas recorrentes (como dor de barriga antes da escola). Isso costuma ser uma forma de comunicar algo que ainda não sabe nomear, e merece um acolhimento mais próximo.",
  },
  conduct: {
    tier1: "A rotina em casa parece estar em um bom momento — birras e desafios de comportamento aparecem pouco, dentro do que se espera para a idade.",
    tier2: "Birras, desobediências ou momentos de raiva têm aparecido com alguma frequência. Vale lembrar: isso raramente é uma afronta pessoal — é uma forma de comunicação não-verbal. Observar o que acontece um pouco antes desses momentos pode ajudar a entender os gatilhos.",
    tier3: "Birras intensas, desobediências ou explosões de raiva parecem estar desafiando bastante a paz da rotina em casa. Vale mapear com calma o que costuma vir antes e depois desses momentos — isso ajuda a entender os gatilhos e, aos poucos, devolver equilíbrio ao dia a dia.",
  },
  hyperactivity: {
    tier1: "Seu filho(a) parece conseguir manter o foco em atividades por um tempo adequado para a idade, sem sinais relevantes de agitação excessiva.",
    tier2: "Você notou alguma agitação ou dificuldade de manter o foco em atividades mais longas. Isso é comum em fases de muita energia — pequenas pausas estruturadas e ordens em passos curtos costumam ajudar bastante.",
    tier3: "Agitação constante, pressa e dificuldade de manter o foco parecem estar comandando boa parte do dia a dia. Para mentes tão aceleradas, uma rotina previsível costuma ser um grande aliado — junto com metas pequenas e reforço positivo para os momentos de concentração.",
  },
  peer: {
    tier1: "A socialização parece estar florescendo — seu filho(a) demonstra abertura para interagir, compartilhar momentos e se conectar com outras crianças de forma natural.",
    tier2: "Você notou alguma dificuldade nos momentos de convivência com outras crianças — talvez mais timidez ou algum retraimento em grupos. Isso costuma variar bastante conforme o contexto e o momento, e vale observar com leveza.",
    tier3: "Parece haver uma dificuldade mais consistente nos momentos de convivência com outras crianças — seja se aproximar, ser aceito no grupo ou manter uma brincadeira em conjunto. Esse é um ponto que vale um olhar mais próximo.",
  },
  prosocial: {
    tier1: "Empatia e gentileza parecem estar no coração do seu filho(a) — vontade de ajudar, compartilhar e acolher quem está por perto. Essa sensibilidade é linda e merece ser bastante celebrada.",
    tier2: "Seu filho(a) demonstra gestos de gentileza e cuidado com os outros, ainda em construção. Isso é parte natural do desenvolvimento social e costuma se fortalecer com o exemplo e o incentivo do dia a dia.",
    tier3: "Os gestos de empatia e cuidado com o outro ainda aparecem pouco nas suas respostas. Isso não é motivo de preocupação — é uma habilidade que se desenvolve com modelagem e prática, e pequenas oportunidades de exercitar gentileza no dia a dia costumam fazer diferença.",
  },
};

interface AreaResult {
  key: AreaKey;
  name: string;
  score: number;
  max: number;
  tier: Tier;
  tier_label: string;
  feedback: string;
}

interface ConfigOverride {
  areas?: Partial<Record<AreaKey, {
    name?: string;
    tier_labels?: Partial<Record<Tier, string>>;
    feedback?: Partial<Record<Tier, string>>;
  }>>;
}

// Aplica os overrides do painel /admin (fa_teste_config) sobre os defaults
// acima. Ignora chaves desconhecidas e valores que não sejam string não-vazia.
function effectiveArea(area: AreaDef, cfg: ConfigOverride) {
  const override = cfg.areas?.[area.key];
  const name = (typeof override?.name === "string" && override.name.trim()) ? override.name.trim() : area.name;
  const tierLabels = { ...DEFAULT_TIER_LABELS[area.key] };
  const feedback = { ...DEFAULT_FEEDBACK[area.key] };
  (["tier1", "tier2", "tier3"] as Tier[]).forEach((t) => {
    const overrideLabel = override?.tier_labels?.[t];
    if (typeof overrideLabel === "string" && overrideLabel.trim()) tierLabels[t] = overrideLabel.trim();
    const overrideFeedback = override?.feedback?.[t];
    if (typeof overrideFeedback === "string" && overrideFeedback.trim()) feedback[t] = overrideFeedback.trim();
  });
  return { name, tierLabels, feedback };
}

async function loadConfig(admin: ReturnType<typeof createClient>): Promise<ConfigOverride> {
  try {
    const { data, error } = await admin
      .from("fa_teste_config")
      .select("value")
      .eq("key", "resultado_v2")
      .maybeSingle();
    if (error || !data) return {};
    return (data.value ?? {}) as ConfigOverride;
  } catch {
    return {};
  }
}

function classify(area: AreaDef, total: number): Tier {
  if (area.inverted) {
    if (total >= (area.tier1_min ?? 0)) return "tier1";
    if (total >= area.tier2_min) return "tier2";
    return "tier3";
  }
  if (total >= (area.tier3_min ?? Infinity)) return "tier3";
  if (total >= area.tier2_min) return "tier2";
  return "tier1";
}

const TIER_RANK: Record<Tier, number> = { tier1: 0, tier2: 1, tier3: 2 };

function scoreAnswers(
  answers: Array<{ id: string; v: number }>,
  cfg: ConfigOverride,
): { results: AreaResult[]; score: number; resultBand: Tier; tier3Count: number } {
  const byId = new Map(answers.map((a) => [a.id, a.v]));
  const results: AreaResult[] = [];
  let difficultiesTotal = 0;
  let worst: Tier = "tier1";

  for (const area of AREAS) {
    let total = 0;
    for (const id of area.items) {
      let v = byId.get(id) ?? 0;
      if (REVERSE_IDS.has(id)) v = 2 - v;
      total += v;
    }
    const tier = classify(area, total);
    const eff = effectiveArea(area, cfg);
    results.push({
      key: area.key,
      name: eff.name,
      score: total,
      max: 10,
      tier,
      tier_label: eff.tierLabels[tier],
      feedback: eff.feedback[tier],
    });
    if (area.key !== "prosocial") difficultiesTotal += total;
    if (TIER_RANK[tier] > TIER_RANK[worst]) worst = tier;
  }

  const tier3Count = results.filter((r) => r.tier === "tier3").length;
  return { results, score: difficultiesTotal, resultBand: worst, tier3Count };
}

const TIER_LEGEND: Record<Tier, string> = {
  tier1: "Está fluindo bem",
  tier2: "Merece um olhar mais de perto",
  tier3: "Merece atenção especial",
};

// WhatsApp usado no e-mail enviado ao responsável. Configurável por secret
// para não precisar redeploy quando o número mudar.
const LEAD_WHATSAPP = (Deno.env.get("LEAD_WHATSAPP") ?? "5591991782027").replace(/\D/g, "");

// ---------------------------------------------------------------------
// Validação
// ---------------------------------------------------------------------

const AGE_RANGES = ["4-5", "6-8", "9-12", "13-17"];
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

// Valor seguro para usar dentro de .or() do PostgREST: entre aspas duplas,
// com aspas e barras escapadas — evita que vírgula/parêntese no e-mail
// vire operador de filtro.
function quoteFilterValue(v: string): string {
  return `"${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

// ---------------------------------------------------------------------
// E-mail (Brevo)
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
  resultBand: Tier;
  tier3Count: number;
  results: AreaResult[];
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

  const areaRows = params.results
    .map((r) => `<tr><td style="padding:5px 12px 5px 0;color:#6b7280;">${escapeHtml(r.name)}</td><td style="padding:5px 12px 5px 0;font-weight:700;color:#111827;">${r.score}/10</td><td style="padding:5px 0;color:#111827;">${escapeHtml(r.tier_label)}</td></tr>`)
    .join("");

  const answersLine = params.answers
    .map((a) => `${escapeHtml(a.id)}=${a.v}`)
    .join(" · ");

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
    <p style="margin:14px 0 6px;font-size:15px;"><strong>Resultado:</strong> ${escapeHtml(TIER_LEGEND[params.resultBand])} · ${params.tier3Count} área(s) em atenção especial · dificuldades ${params.score}/40</p>
    <div style="text-align:center;margin:20px 0;">
      <a href="${waLink}" style="display:inline-block;background:#25D366;color:#fff;font-weight:800;text-decoration:none;padding:14px 28px;border-radius:9999px;font-size:15px;">Abrir WhatsApp do responsável</a>
    </div>
    <p style="margin:18px 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#9ca3af;font-weight:700;">Resultado por área</p>
    <table style="border-collapse:collapse;font-size:13px;width:100%;">${areaRows}</table>
    <p style="margin:18px 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#9ca3af;font-weight:700;">Respostas (auditoria)</p>
    <p style="margin:0;font-size:11px;color:#9ca3af;word-break:break-all;">${answersLine}</p>
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

const TIER_EMAIL_STYLES: Record<Tier, [string, string, string]> = {
  tier1: ["#E8F0E9", "#2B5236", "#C4D4C5"],
  tier2: ["#FDF3E1", "#80581B", "#EED8A1"],
  tier3: ["#FBEBEB", "#8A332C", "#EFC7C2"],
};

// E-mail automático para o responsável, disparado no "complete". Cumpre a
// promessa do gate ("Para onde enviamos seu resultado?") sem depender de
// ninguém abrir o painel. O insight de IA (painel) continua sendo um
// segundo e-mail, opcional.
async function sendResultEmailToGuardian(params: {
  guardianName: string;
  guardianEmail: string;
  childFirstName: string;
  results: AreaResult[];
  tier3Count: number;
}): Promise<{ sent: boolean; error?: string }> {
  const apiKey = Deno.env.get("BREVO_API_KEY");
  const fromRaw = Deno.env.get("BREVO_FROM") ?? "Instituto Faça Amigos <nao-responder@institutofacaamigos.com.br>";
  const replyTo = Deno.env.get("BREVO_REPLY_TO");
  if (!apiKey) return { sent: false, error: "BREVO_API_KEY não configurada" };

  const hasTier3 = params.tier3Count > 0;
  const intro = hasTier3
    ? `Identificamos ${params.tier3Count} ${params.tier3Count === 1 ? "área" : "áreas"} que merecem atenção especial. Respire fundo — isto é um retrato inicial e um ponto de partida, não um veredito.`
    : "Aqui está o retrato de observação que você preencheu, com carinho e base científica. Veja abaixo o panorama de cada área observada.";

  const rows = params.results
    .map((r) => {
      const [bg, tx, br] = TIER_EMAIL_STYLES[r.tier];
      return `
      <tr>
        <td style="padding:18px 0;border-bottom:1px solid #EFE7D4;">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td style="font-family:Arial,sans-serif;font-size:16px;font-weight:bold;color:#1A3F35;">${escapeHtml(r.name)}</td>
              <td align="right">
                <span style="font-family:Arial,sans-serif;font-size:12px;color:${tx};background:${bg};border:1px solid ${br};padding:5px 10px;border-radius:999px;white-space:nowrap;">${escapeHtml(r.tier_label)}</span>
              </td>
            </tr>
          </table>
          <p style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#3A4258;margin:10px 0 0 0;">${escapeHtml(r.feedback)}</p>
        </td>
      </tr>`;
    })
    .join("");

  const waText = encodeURIComponent(
    `Olá! Fiz o questionário sobre ${params.childFirstName} e gostaria de conversar.`,
  );
  const waLink = `https://wa.me/${LEAD_WHATSAPP}?text=${waText}`;
  const clinicaLink = "https://institutofacaamigos.com.br/#clinica";

  const humanBlock = hasTier3
    ? `
    <tr><td style="padding:0 32px 8px 32px;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#FDF3E1;border:1px solid #EED8A1;border-radius:14px;">
        <tr><td style="padding:20px 22px;">
          <p style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#4A3A0C;margin:0 0 8px 0;">
            Se você sentir que algum desses pontos está pesando bastante na rotina da família,
            terei prazer em conversar com você antes de qualquer outra coisa.
          </p>
          <div style="text-align:center;">
            <a href="${waLink}" style="display:inline-block;background:#25D366;color:#fff;font-weight:800;text-decoration:none;padding:12px 22px;border-radius:9999px;font-size:14px;">Falar com a equipe no WhatsApp</a>
          </div>
        </td></tr>
      </table>
    </td></tr>`
    : "";

  const disclaimer = "Este material é educativo e não constitui diagnóstico psicológico. Ele não substitui uma avaliação profissional completa.";

  const html = `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#FFF9F1;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#FFF9F1;padding:24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%;background:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid #E7DFC9;">
        <tr><td style="background:#FFFFFF;padding:18px 32px 10px 32px;text-align:center;">
          <img src="${LOGO_URL}" alt="Instituto Faça Amigos" width="36" height="36" style="display:inline-block;vertical-align:middle;margin-right:8px;">
          <span style="font-family:Arial,sans-serif;font-size:15px;font-weight:800;color:#1A3F35;vertical-align:middle;">Faça<span style="color:#f0196b;">Amigos</span></span>
        </td></tr>
        <tr><td style="background:linear-gradient(135deg,#f0196b 0%,#c8155a 100%);padding:22px 32px;text-align:center;">
          <h1 style="margin:0;font-family:Arial,sans-serif;font-size:22px;color:#fff;">O retrato de ${escapeHtml(params.childFirstName)}</h1>
        </td></tr>
        <tr><td style="padding:28px 32px 8px 32px;">
          <p style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#3A4258;margin:0 0 8px 0;">Olá, ${escapeHtml(params.guardianName)}!</p>
          <p style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#3A4258;margin:0 0 12px 0;">${escapeHtml(intro)}</p>
          <p style="font-family:Arial,sans-serif;font-size:12px;line-height:1.5;color:#6A7186;margin:0 0 20px 0;font-style:italic;font-weight:bold;">${disclaimer}</p>
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">${rows}</table>
        </td></tr>
        ${humanBlock}
        <tr><td style="padding:14px 32px 8px 32px;text-align:center;">
          <a href="${waLink}" style="display:inline-block;background:#25D366;color:#fff;font-weight:800;text-decoration:none;padding:14px 28px;border-radius:9999px;font-size:15px;margin-bottom:12px;">Conversar com a equipe no WhatsApp</a>
        </td></tr>
        <tr><td style="padding:0 32px 28px 32px;text-align:center;">
          <p style="margin:0 0 14px;font-size:14px;"><a href="${clinicaLink}" style="color:#1f917f;font-weight:700;text-decoration:none;">Conhecer o Centro de Terapia Comportamental FaçaAmigos</a></p>
          <p style="font-family:Arial,sans-serif;font-size:11px;color:#8791A6;margin:0;line-height:1.5;">
            Este material é um retrato educativo e informativo, não um diagnóstico. Para uma leitura completa e individualizada, uma avaliação psicológica presencial é sempre o caminho mais seguro.
          </p>
          <p style="margin:16px 0 0;font-size:11px;color:#9ca3af;">Você recebeu este e-mail porque pediu o resultado do teste em institutofacaamigos.com.br/teste.</p>
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
        subject: `O retrato de ${params.childFirstName} chegou — Instituto Faça Amigos`,
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
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY ausentes");
    return jsonResponse(req, { error: "serviço indisponível" }, 500);
  }
  const admin = createClient(supabaseUrl, serviceRoleKey);

  // Honeypot: campo invisível no formulário. Humano nunca preenche; bot
  // preenche. Respondemos 200 "de mentira" para não dar pista.
  if (str(body.website)) {
    return jsonResponse(req, { ok: true });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
  const userAgent = req.headers.get("user-agent") || "";

  async function tooManyFromIp(column: "created_at" | "completed_at", max: number): Promise<boolean> {
    if (!ip) return false;
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await admin
      .from("fa_leads_teste_comportamento")
      .select("id", { count: "exact", head: true })
      .eq("ip", ip)
      .gte(column, oneHourAgo);
    return (count ?? 0) >= max;
  }

  if (event === "start") {
    const childFirstName = str(body.child_first_name);
    const childAgeRange = str(body.child_age_range);
    const guardianRelation = str(body.guardian_relation);
    const guardianName = str(body.guardian_name);
    const guardianEmail = str(body.guardian_email);
    const guardianPhoneRaw = str(body.guardian_phone);
    const preferredUnit = str(body.preferred_unit);
    const consent = body.consent === true;
    const marketingOptIn = body.marketing_opt_in === true;
    const utm = (body.utm ?? {}) as Record<string, unknown>;
    const landingPage = str(body.landing_page);
    const referrer = str(body.referrer);

    if (!childFirstName || !AGE_RANGES.includes(childAgeRange) || !RELATIONS.includes(guardianRelation)) {
      return jsonResponse(req, { error: "campos obrigatórios ausentes ou inválidos" }, 400);
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

    // Rate limit simples: máx. 10 starts por IP na última hora.
    if (await tooManyFromIp("created_at", 10)) {
      return jsonResponse(req, { error: "muitas tentativas, tente novamente mais tarde" }, 429);
    }

    // Retomada: a MESMA família (e-mail ou telefone) já tem um "started"
    // (nunca concluído) da MESMA criança nas últimas 24h — reaproveita o
    // registro em vez de criar outro, e reinicia as respostas.
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: resumable } = await admin
      .from("fa_leads_teste_comportamento")
      .select("id")
      .eq("status", "started")
      .or(
        `guardian_email.eq.${quoteFilterValue(guardianEmail)},guardian_phone.eq.${quoteFilterValue(guardianPhone)}`,
      )
      .ilike("child_first_name", childFirstName)
      .gte("created_at", oneDayAgo)
      .limit(1)
      .maybeSingle();

    if (resumable?.id) {
      const { error: updateError } = await admin
        .from("fa_leads_teste_comportamento")
        .update({
          child_age_range: childAgeRange,
          guardian_relation: guardianRelation,
          guardian_name: guardianName,
          guardian_email: guardianEmail,
          guardian_phone: guardianPhone,
          preferred_unit: preferredUnit || null,
          consent_at: new Date().toISOString(),
          marketing_opt_in: marketingOptIn,
          answers: [],
          test_version: TEST_VERSION,
        })
        .eq("id", resumable.id);
      if (updateError) {
        console.error("Erro ao retomar lead:", updateError);
        return jsonResponse(req, { error: "falha ao iniciar teste" }, 500);
      }
      return jsonResponse(req, { lead_id: resumable.id, test_version: TEST_VERSION, resumed: true });
    }

    const { data, error } = await admin
      .from("fa_leads_teste_comportamento")
      .insert({
        status: "started",
        child_first_name: childFirstName,
        child_age_range: childAgeRange,
        guardian_relation: guardianRelation,
        guardian_name: guardianName,
        guardian_email: guardianEmail,
        guardian_phone: guardianPhone,
        preferred_unit: preferredUnit || null,
        consent_at: new Date().toISOString(),
        marketing_opt_in: marketingOptIn,
        answers: [],
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

    return jsonResponse(req, { lead_id: data.id, test_version: TEST_VERSION, resumed: false });
  }

  if (event === "complete") {
    const leadId = str(body.lead_id);
    const testVersion = str(body.test_version);
    const rawAnswers = Array.isArray(body.answers) ? body.answers : [];

    if (!leadId) return jsonResponse(req, { error: "lead_id ausente" }, 400);
    if (testVersion !== TEST_VERSION) {
      return jsonResponse(req, { error: "versão do teste desatualizada, recarregue a página" }, 409);
    }

    const seen = new Set<string>();
    const answers = rawAnswers
      .filter((a): a is { id: string; v: number } =>
        typeof a === "object" && a !== null && typeof (a as any).id === "string" && typeof (a as any).v === "number",
      )
      .filter((a) => QUESTION_IDS.includes(a.id) && a.v >= 0 && a.v <= 2)
      .filter((a) => {
        if (seen.has(a.id)) return false;
        seen.add(a.id);
        return true;
      });

    if (answers.length < QUESTION_IDS.length) {
      return jsonResponse(req, { error: "respostas incompletas" }, 400);
    }

    // Rate limit no complete também (o start já limita, mas o complete é o
    // que dispara e-mails).
    if (await tooManyFromIp("completed_at", 10)) {
      return jsonResponse(req, { error: "muitas tentativas, tente novamente mais tarde" }, 429);
    }

    // Busca o lead "started" para reaproveitar dados de contato.
    const { data: existingLead, error: fetchError } = await admin
      .from("fa_leads_teste_comportamento")
      .select(
        "id, child_first_name, child_age_range, guardian_relation, guardian_name, guardian_email, guardian_phone, preferred_unit, landing_page, utm_source, utm_medium, utm_campaign",
      )
      .eq("id", leadId)
      .single();

    if (fetchError || !existingLead) {
      return jsonResponse(req, { error: "teste não encontrado, recomece" }, 404);
    }
    if (!existingLead.guardian_email) {
      // Lead "started" de formato antigo (sem contato prévio) — o fluxo
      // atual sempre coleta contato no "start", então isso não deveria
      // acontecer para leads novos.
      return jsonResponse(req, { error: "sessão incompleta, recomece o teste" }, 400);
    }

    const cfg = await loadConfig(admin);
    const { results, score, resultBand, tier3Count } = scoreAnswers(answers, cfg);

    // Anti-duplicidade: a MESMA família refez o teste da MESMA criança nas
    // últimas 24h → atualiza o registro anterior em vez de duplicar na
    // lista. Se for outra criança (dois filhos), mantém registros
    // separados. Quando reaproveita o antigo, o "started" recém-criado é
    // marcado como "abandoned" para não inflar a taxa de abandono. Um
    // gêmeo já "contatado" continua contatado (não regride o status).
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: dupe } = await admin
      .from("fa_leads_teste_comportamento")
      .select("id, status")
      .in("status", ["completed", "contacted"])
      .or(
        `guardian_email.eq.${quoteFilterValue(existingLead.guardian_email)},guardian_phone.eq.${quoteFilterValue(existingLead.guardian_phone)}`,
      )
      .ilike("child_first_name", existingLead.child_first_name)
      .gte("created_at", oneDayAgo)
      .neq("id", leadId)
      .limit(1)
      .maybeSingle();

    const targetId = dupe?.id ?? leadId;
    if (dupe?.id) {
      await admin
        .from("fa_leads_teste_comportamento")
        .update({ status: "abandoned" })
        .eq("id", leadId)
        .eq("status", "started");
    }

    const { error: updateError } = await admin
      .from("fa_leads_teste_comportamento")
      .update({
        status: dupe?.status === "contacted" ? "contacted" : "completed",
        answers,
        score,
        results,
        result_band: resultBand,
        completed_at: new Date().toISOString(),
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
      guardianName: existingLead.guardian_name,
      guardianEmail: existingLead.guardian_email,
      guardianPhone: existingLead.guardian_phone,
      preferredUnit: existingLead.preferred_unit ?? "",
      score,
      resultBand,
      tier3Count,
      results,
      answers,
      utm: {
        source: existingLead.utm_source ?? "",
        medium: existingLead.utm_medium ?? "",
        campaign: existingLead.utm_campaign ?? "",
      },
      landingPage: existingLead.landing_page ?? "",
    });

    const guardianEmailResult = await sendResultEmailToGuardian({
      guardianName: existingLead.guardian_name,
      guardianEmail: existingLead.guardian_email,
      childFirstName: existingLead.child_first_name,
      results,
      tier3Count,
    });

    await admin
      .from("fa_leads_teste_comportamento")
      .update({
        ...(emailResult.sent
          ? { email_sent_at: new Date().toISOString() }
          : { email_error: emailResult.error ?? "falha desconhecida" }),
        ...(guardianEmailResult.sent
          ? { result_email_sent_at: new Date().toISOString() }
          : { result_email_error: guardianEmailResult.error ?? "falha desconhecida" }),
      })
      .eq("id", targetId);

    return jsonResponse(req, {
      child_first_name: existingLead.child_first_name,
      score,
      result_band: resultBand,
      tier3_count: tier3Count,
      tier_legend: TIER_LEGEND,
      results,
      result_email_sent: guardianEmailResult.sent,
    });
  }

  return jsonResponse(req, { error: "evento inválido" }, 400);
});

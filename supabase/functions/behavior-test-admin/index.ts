// Painel de administração do Teste de Comportamento (admin.html): login da
// idealizadora, listagem/detalhe dos leads, geração de insight via Gemini
// e envio desse insight ao responsável por e-mail (Brevo). Tudo numa única
// função, roteada por `action` no corpo JSON — mesmo motivo de CORS/JSON
// inline das demais funções deste projeto (import relativo de ../_shared
// quebra no deploy via MCP).
//
// Autenticação NÃO guarda senha própria: o login é o mesmo e-mail/senha
// do Sistema da Clínica FaçaAmigos (Next.js, projeto Supabase separado
// "vththexblpxwocbowhsv"), papel `gestor`. O fluxo é:
//   1. POST no /auth/v1/token do projeto da Clínica com email+senha
//      (mesma API que o próprio app da Clínica usa) — se autenticar,
//      devolve um access_token do usuário.
//   2. Com esse access_token (não com service role), GET em
//      /rest/v1/profiles?id=eq.<uid> do MESMO projeto — a RLS de lá
//      (`profiles_read_same_clinic`) deixa qualquer usuário ler o próprio
//      perfil, então isso funciona sem precisar da service role da
//      Clínica aqui.
//   3. Só role === "gestor" pode entrar; qualquer outro papel (terapeuta,
//      recepção etc.) é recusado, mesmo com senha correta.
// Continua havendo um token de sessão opaco próprio em
// fa_teste_admin_sessions (validade 12h) — só para não repetir o login
// contra a Clínica a cada clique no painel.

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
    "Access-Control-Allow-Headers": "content-type, authorization",
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

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

// Valor seguro dentro de .or() do PostgREST (aspas duplas + escape), para a
// busca do painel não virar operador de filtro se alguém digitar vírgula
// ou parêntese.
function quoteFilterValue(v: string): string {
  return `"${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

// Títulos de resultado por versão do teste. "2026-09-16" é o placeholder
// antigo (8 perguntas, banda única); "2026-09-18" é o questionário
// definitivo (25 perguntas, pior faixa entre 5 áreas) — ver
// supabase/functions/behavior-test-webhook/index.ts (fonte de verdade).
const RESULT_TITLES: Record<string, string> = {
  recomendado: "Recomendamos uma avaliação profissional",
  observar: "Vale a pena observar de perto",
  esperado: "Dentro do esperado para a idade",
  tier1: "Está fluindo bem",
  tier2: "Merece um olhar mais de perto",
  tier3: "Merece atenção especial",
};

function resultTitleFor(lead: { result_band?: string | null; results?: unknown }): string {
  const band = lead.result_band ?? "";
  const base = RESULT_TITLES[band] ?? band ?? "—";
  if (Array.isArray(lead.results)) {
    const tier3Count = (lead.results as AreaResult[]).filter((r) => r?.tier === "tier3").length;
    if (tier3Count > 0) return `${base} (${tier3Count} área${tier3Count > 1 ? "s" : ""})`;
  }
  return base;
}

interface AreaResult {
  key: string;
  name: string;
  score: number;
  max: number;
  tier: "tier1" | "tier2" | "tier3";
  tier_label: string;
}

const LEAD_STATUSES = ["started", "abandoned", "completed", "contacted"];

// 5 áreas do questionário definitivo (versão 2026-09-18) e seus defaults —
// devem ficar em sincronia com AREAS/DEFAULT_TIER_LABELS/DEFAULT_FEEDBACK em
// supabase/functions/behavior-test-webhook/index.ts (o deploy via MCP não
// resolve import relativo de um módulo compartilhado, daí a duplicação).
const CONFIG_AREA_KEYS = ["emotional", "conduct", "hyperactivity", "peer", "prosocial"] as const;
type ConfigAreaKey = (typeof CONFIG_AREA_KEYS)[number];

const CONFIG_DEFAULTS: Record<ConfigAreaKey, {
  name: string;
  tier_labels: Record<"tier1" | "tier2" | "tier3", string>;
  feedback: Record<"tier1" | "tier2" | "tier3", string>;
}> = {
  emotional: {
    name: "Emoções e segurança",
    tier_labels: { tier1: "Está fluindo bem", tier2: "Merece um olhar mais de perto", tier3: "Merece atenção especial" },
    feedback: {
      tier1: "Seu filho(a) parece lidar bem com as próprias emoções no dia a dia. Momentos de tristeza ou medo aparecem, mas de forma leve e passageira — sinal de que ele(a) está encontrando formas saudáveis de se expressar.",
      tier2: "Alguns sinais de insegurança apareceram nas suas respostas — talvez um choro mais frequente, medos específicos ou queixas físicas em certos momentos (como antes de sair de casa). Vale observar com carinho quando esses momentos acontecem, sem pressa para \"resolver\" — muitas vezes é só uma forma de pedir colo.",
      tier3: "Suas respostas indicam que as emoções do seu filho(a) parecem estar mais pesadas ultimamente — choro frequente, medos mais intensos ou queixas físicas recorrentes (como dor de barriga antes da escola). Isso costuma ser uma forma de comunicar algo que ainda não sabe nomear, e merece um acolhimento mais próximo.",
    },
  },
  conduct: {
    name: "Rotina e limites",
    tier_labels: { tier1: "Está fluindo bem", tier2: "Merece um olhar mais de perto", tier3: "Merece atenção especial" },
    feedback: {
      tier1: "A rotina em casa parece estar em um bom momento — birras e desafios de comportamento aparecem pouco, dentro do que se espera para a idade.",
      tier2: "Birras, desobediências ou momentos de raiva têm aparecido com alguma frequência. Vale lembrar: isso raramente é uma afronta pessoal — é uma forma de comunicação não-verbal. Observar o que acontece um pouco antes desses momentos pode ajudar a entender os gatilhos.",
      tier3: "Birras intensas, desobediências ou explosões de raiva parecem estar desafiando bastante a paz da rotina em casa. Vale mapear com calma o que costuma vir antes e depois desses momentos — isso ajuda a entender os gatilhos e, aos poucos, devolver equilíbrio ao dia a dia.",
    },
  },
  hyperactivity: {
    name: "Foco e energia",
    tier_labels: { tier1: "Está fluindo bem", tier2: "Merece um olhar mais de perto", tier3: "Merece atenção especial" },
    feedback: {
      tier1: "Seu filho(a) parece conseguir manter o foco em atividades por um tempo adequado para a idade, sem sinais relevantes de agitação excessiva.",
      tier2: "Você notou alguma agitação ou dificuldade de manter o foco em atividades mais longas. Isso é comum em fases de muita energia — pequenas pausas estruturadas e ordens em passos curtos costumam ajudar bastante.",
      tier3: "Agitação constante, pressa e dificuldade de manter o foco parecem estar comandando boa parte do dia a dia. Para mentes tão aceleradas, uma rotina previsível costuma ser um grande aliado — junto com metas pequenas e reforço positivo para os momentos de concentração.",
    },
  },
  peer: {
    name: "Amizades e convivência",
    tier_labels: { tier1: "Está fluindo bem", tier2: "Merece um olhar mais de perto", tier3: "Merece atenção especial" },
    feedback: {
      tier1: "A socialização parece estar florescendo — seu filho(a) demonstra abertura para interagir, compartilhar momentos e se conectar com outras crianças de forma natural.",
      tier2: "Você notou alguma dificuldade nos momentos de convivência com outras crianças — talvez mais timidez ou algum retraimento em grupos. Isso costuma variar bastante conforme o contexto e o momento, e vale observar com leveza.",
      tier3: "Parece haver uma dificuldade mais consistente nos momentos de convivência com outras crianças — seja se aproximar, ser aceito no grupo ou manter uma brincadeira em conjunto. Esse é um ponto que vale um olhar mais próximo.",
    },
  },
  prosocial: {
    name: "Empatia e gentileza",
    tier_labels: { tier1: "Está fluindo bem", tier2: "Em desenvolvimento", tier3: "Merece incentivo especial" },
    feedback: {
      tier1: "Empatia e gentileza parecem estar no coração do seu filho(a) — vontade de ajudar, compartilhar e acolher quem está por perto. Essa sensibilidade é linda e merece ser bastante celebrada.",
      tier2: "Seu filho(a) demonstra gestos de gentileza e cuidado com os outros, ainda em construção. Isso é parte natural do desenvolvimento social e costuma se fortalecer com o exemplo e o incentivo do dia a dia.",
      tier3: "Os gestos de empatia e cuidado com o outro ainda aparecem pouco nas suas respostas. Isso não é motivo de preocupação — é uma habilidade que se desenvolve com modelagem e prática, e pequenas oportunidades de exercitar gentileza no dia a dia costumam fazer diferença.",
    },
  },
};

interface ConfigOverride {
  areas?: Partial<Record<ConfigAreaKey, {
    name?: string;
    tier_labels?: Partial<Record<"tier1" | "tier2" | "tier3", string>>;
    feedback?: Partial<Record<"tier1" | "tier2" | "tier3", string>>;
  }>>;
}

function sanitizeConfig(raw: unknown): ConfigOverride {
  const out: ConfigOverride = { areas: {} };
  if (!raw || typeof raw !== "object") return out;
  const areasIn = (raw as any).areas;
  if (!areasIn || typeof areasIn !== "object") return out;
  for (const key of CONFIG_AREA_KEYS) {
    const areaIn = areasIn[key];
    if (!areaIn || typeof areaIn !== "object") continue;
    const areaOut: NonNullable<ConfigOverride["areas"]>[ConfigAreaKey] = {};
    if (typeof areaIn.name === "string" && areaIn.name.trim()) {
      areaOut.name = areaIn.name.trim().slice(0, 200);
    }
    if (areaIn.tier_labels && typeof areaIn.tier_labels === "object") {
      const labels: Partial<Record<"tier1" | "tier2" | "tier3", string>> = {};
      for (const t of ["tier1", "tier2", "tier3"] as const) {
        const v = areaIn.tier_labels[t];
        if (typeof v === "string" && v.trim()) labels[t] = v.trim().slice(0, 200);
      }
      if (Object.keys(labels).length) areaOut.tier_labels = labels;
    }
    if (areaIn.feedback && typeof areaIn.feedback === "object") {
      const fb: Partial<Record<"tier1" | "tier2" | "tier3", string>> = {};
      for (const t of ["tier1", "tier2", "tier3"] as const) {
        const v = areaIn.feedback[t];
        if (typeof v === "string" && v.trim()) fb[t] = v.trim().slice(0, 1200);
      }
      if (Object.keys(fb).length) areaOut.feedback = fb;
    }
    if (Object.keys(areaOut).length) out.areas![key] = areaOut;
  }
  return out;
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ---------------------------------------------------------------------
// Login delegado ao Sistema da Clínica (Supabase Auth de outro projeto)
// ---------------------------------------------------------------------

async function verifyClinicaGestorLogin(
  email: string,
  password: string,
): Promise<{ ok: true; userId: string; email: string } | { ok: false; error: string; status: number }> {
  const clinicaUrl = Deno.env.get("CLINICA_SUPABASE_URL");
  const clinicaAnonKey = Deno.env.get("CLINICA_SUPABASE_ANON_KEY");
  if (!clinicaUrl || !clinicaAnonKey) {
    return { ok: false, error: "integração com o Sistema da Clínica não configurada", status: 500 };
  }

  // 1) Autentica contra o Supabase Auth da Clínica — mesma chamada que o
  // próprio app dela faz (auth.signInWithPassword usa este endpoint por
  // baixo dos panos).
  const tokenRes = await fetch(`${clinicaUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: clinicaAnonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!tokenRes.ok) {
    return { ok: false, error: "credenciais inválidas", status: 401 };
  }

  const tokenData = await tokenRes.json().catch(() => null);
  const accessToken = tokenData?.access_token as string | undefined;
  const userId = tokenData?.user?.id as string | undefined;
  if (!accessToken || !userId) {
    return { ok: false, error: "credenciais inválidas", status: 401 };
  }

  // 2) Com o access_token do próprio usuário (não a service role), lê o
  // perfil dele — a RLS de lá (`profiles_read_same_clinic`) deixa
  // qualquer usuário autenticado ler o próprio registro.
  const profileRes = await fetch(
    `${clinicaUrl}/rest/v1/profiles?select=role,email&id=eq.${userId}`,
    { headers: { apikey: clinicaAnonKey, Authorization: `Bearer ${accessToken}` } },
  );

  if (!profileRes.ok) {
    return { ok: false, error: "não foi possível verificar seu perfil na Clínica", status: 502 };
  }

  const profiles = await profileRes.json().catch(() => []);
  const profile = Array.isArray(profiles) ? profiles[0] : undefined;

  if (!profile || String(profile.role).toLowerCase() !== "gestor") {
    return { ok: false, error: "apenas o Gestor da Clínica pode acessar este painel", status: 403 };
  }

  return { ok: true, userId, email: profile.email ?? email };
}

// ---------------------------------------------------------------------
// Sessão (própria deste painel — só evita repetir o login acima a cada clique)
// ---------------------------------------------------------------------

const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12h

function newSessionToken(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return toHex(arr.buffer);
}

async function requireSession(admin: ReturnType<typeof createClient>, req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) return null;

  const { data, error } = await admin
    .from("fa_teste_admin_sessions")
    .select("token, clinica_user_id, admin_email, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (error || !data) return null;
  if (new Date(data.expires_at).getTime() < Date.now()) {
    await admin.from("fa_teste_admin_sessions").delete().eq("token", token);
    return null;
  }
  return { token, userId: data.clinica_user_id as string, email: data.admin_email as string };
}

// ---------------------------------------------------------------------
// Gemini — mesmo endpoint REST usado em Clínica FaçaAmigos (lib/gemini.ts)
// ---------------------------------------------------------------------

const GEMINI_MODEL = "gemini-3.5-flash-lite";

async function generateInsight(params: {
  childFirstName: string;
  childAgeRange: string;
  testVersion: string;
  score: number;
  bandTitle: string;
  results?: AreaResult[];
  answers: Array<{ id: string; v: number }>;
  questions: Record<string, string>;
  maxScale: number;
}): Promise<{ text?: string; error?: string }> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) return { error: "GEMINI_API_KEY não configurada" };

  const answersDescription = params.answers
    .map((a) => `- ${params.questions[a.id] ?? a.id}: nível ${a.v} de ${params.maxScale}`)
    .join("\n");

  const areaLines = (params.results ?? [])
    .map((r) => `- ${r.name}: ${r.score}/${r.max} — ${r.tier_label}`)
    .join("\n");

  const systemInstruction =
    "Você é uma assistente de apoio para a idealizadora de uma clínica de terapia comportamental infantil (FaçaAmigos), em Belém-PA. " +
    "Sua tarefa é ler o resultado de um teste de triagem inicial (não diagnóstico) respondido por um responsável sobre uma criança, e escrever um " +
    "resumo curto e acolhedor (até 120 palavras) com: (1) uma leitura geral do padrão de respostas, em linguagem simples, sem termos técnicos, " +
    "sem citar transtornos específicos e sem citar o nome de nenhum instrumento ou questionário; (2) 2-3 sugestões práticas de observação ou " +
    "brincadeira para os pais aplicarem em casa; (3) sempre reforçar que isso não é um diagnóstico e que uma avaliação profissional é o próximo " +
    "passo recomendado. Nunca alarme os pais. Escreva em português do Brasil, em tom caloroso e profissional, como se fosse parte do retorno que " +
    "a clínica dará à família.";

  const prompt =
    `Criança: ${params.childFirstName}, faixa etária ${params.childAgeRange}.\n` +
    `Resultado: "${params.bandTitle}".\n` +
    (areaLines ? `\nPanorama por área:\n${areaLines}\n` : "") +
    `\nRespostas do responsável:\n${answersDescription}\n\n` +
    "Escreva o resumo acolhedor para os pais.";

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey.trim()}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        systemInstruction: { parts: [{ text: systemInstruction }] },
        generationConfig: { temperature: 0.6, maxOutputTokens: 500 },
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      return { error: `Erro HTTP Gemini ${res.status}: ${errText.slice(0, 300)}` };
    }
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text as string | undefined;
    if (!text) return { error: "Gemini não retornou texto" };
    return { text: text.trim() };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "erro desconhecido ao chamar Gemini" };
  }
}

// Rótulos curtos das perguntas para o painel/Gemini, por versão do teste.
// "2026-09-16" = placeholder antigo (8 perguntas). "2026-09-18" = definitivo
// (25 perguntas) — devem ficar em sincronia com QUESTION_IDS/teste-perguntas.json.
const QUESTION_LABELS_BY_VERSION: Record<string, Record<string, string>> = {
  "2026-09-16": {
    q01: "Olha nos olhos quando é chamado(a) pelo nome",
    q02: "Usa palavras ou gestos para pedir o que quer",
    q03: "Demonstra interesse em brincar perto/junto de outras crianças",
    q04: "Imita gestos, sons ou brincadeiras",
    q05: "Se adapta bem a pequenas mudanças na rotina",
    q06: "Consegue se acalmar sozinho(a) ou com apoio",
    q07: "Reage de forma tranquila a sons, luzes ou texturas",
    q08: "Segue instruções simples de 1 ou 2 passos",
  },
  "2026-09-18": {
    q01: "Respeita os sentimentos das outras pessoas",
    q02: "É irrequieto(a), muito agitado(a)",
    q03: "Queixa-se de dor de cabeça, dor de barriga ou enjoo",
    q04: "Reparte facilmente com outras crianças",
    q05: "Tem acessos de raiva ou birra",
    q06: "É solitário(a), prefere brincar sozinho(a)",
    q07: "Em geral é obediente",
    q08: "Anda muito preocupado(a)",
    q09: "É prestativo(a) se alguém está magoado ou mal",
    q10: "Está sempre se mexendo, se contorcendo",
    q11: "Tem pelo menos um bom amigo ou boa amiga",
    q12: "Briga com outras crianças ou as intimida",
    q13: "É infeliz, desanimado(a) ou choroso(a)",
    q14: "É benquisto(a) por outras crianças",
    q15: "É facilmente distraído(a)",
    q16: "É nervoso(a) ou grudento(a) em situações novas",
    q17: "É gentil com crianças mais novas",
    q18: "Frequentemente mente ou engana",
    q19: "É atormentado(a) ou intimidado(a) por outras crianças",
    q20: "Se oferece para ajudar os outros",
    q21: "Pensa antes de agir",
    q22: "Rouba coisas de casa, da escola ou de outros lugares",
    q23: "Se dá melhor com adultos do que com outras crianças",
    q24: "Tem muitos medos, assusta-se facilmente",
    q25: "Termina o que começa, tem boa concentração",
  },
};

const MAX_SCALE_BY_VERSION: Record<string, number> = {
  "2026-09-16": 3,
  "2026-09-18": 2,
};

// ---------------------------------------------------------------------
// E-mail do insight para o responsável (Brevo)
// ---------------------------------------------------------------------

function parseSenderAddress(raw: string): { name?: string; email: string } {
  const match = raw.match(/^(.*)<(.+)>$/);
  if (match) {
    const name = match[1].trim().replace(/^"|"$/g, "");
    return { name: name || undefined, email: match[2].trim() };
  }
  return { email: raw.trim() };
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function sendInsightEmailToGuardian(params: {
  guardianName: string;
  guardianEmail: string;
  childFirstName: string;
  bandTitle: string;
  insight: string;
}): Promise<{ sent: boolean; error?: string }> {
  const apiKey = Deno.env.get("BREVO_API_KEY");
  const fromRaw = Deno.env.get("BREVO_FROM") ?? "Instituto Faça Amigos <nao-responder@institutofacaamigos.com.br>";
  const replyTo = Deno.env.get("BREVO_REPLY_TO");
  if (!apiKey) return { sent: false, error: "BREVO_API_KEY não configurada" };

  const waNumber = (Deno.env.get("LEAD_WHATSAPP") ?? "5591991782027").replace(/\D/g, "");
  const waLink = `https://wa.me/${waNumber}?text=` + encodeURIComponent(
    `Oi! Acabei de receber o retrato do teste de comportamento do(a) ${params.childFirstName} e gostaria de conversar.`,
  );

  const html = `
<div style="font-family:'Nunito','Segoe UI',Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a3f35;">
  <div style="font-size:11px;color:#9ca3af;text-align:center;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.05em;font-weight:700;">🤖 E-mail automático — Favor não responder a esta mensagem</div>
  <div style="background:linear-gradient(135deg,#f0196b 0%,#c8155a 100%);padding:28px 24px;border-radius:24px 24px 0 0;text-align:center;">
    <h1 style="margin:0;font-family:'Fredoka One',cursive,sans-serif;font-weight:400;font-size:22px;color:#fff;">O retrato do(a) ${escapeHtml(params.childFirstName)} está pronto</h1>
  </div>
  <div style="background:#fff;padding:28px 24px;border-radius:0 0 24px 24px;">
    <p style="margin:0 0 12px;font-size:15px;">Olá, ${escapeHtml(params.guardianName)}!</p>
    <p style="margin:0 0 14px;font-size:14px;color:#4C6B62;"><strong>Resultado:</strong> ${escapeHtml(params.bandTitle)}</p>
    <div style="background:#FFF9F1;border-radius:16px;padding:18px;font-size:14px;line-height:1.6;white-space:pre-line;">${escapeHtml(params.insight)}</div>
    <p style="margin:18px 0;font-size:12px;color:#9ca3af;">Este teste é um retrato inicial e não substitui uma avaliação profissional.</p>
    <div style="text-align:center;margin:20px 0 4px;">
      <a href="${waLink}" style="display:inline-block;background:#25D366;color:#fff;font-weight:800;text-decoration:none;padding:14px 28px;border-radius:9999px;font-size:15px;">Falar com a equipe no WhatsApp</a>
    </div>
    <div style="margin-top:24px;padding-top:16px;border-top:1px solid #f3f4f6;text-align:center;font-size:12px;color:#9ca3af;">
      Mensagem automática enviada pelo sistema FaçaAmigos • Favor não responder a este e-mail.
    </div>
  </div>
</div>`.trim();

  try {
    const resp = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": apiKey, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        sender: parseSenderAddress(fromRaw),
        to: [{ email: params.guardianEmail, name: params.guardianName }],
        subject: `O retrato do(a) ${params.childFirstName} está pronto — Instituto Faça Amigos`,
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

  const action = str(body.action);
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY ausentes");
    return jsonResponse(req, { error: "serviço indisponível" }, 500);
  }
  const admin = createClient(supabaseUrl, serviceRoleKey);

  // --- login: mesmo e-mail/senha do Gestor no Sistema da Clínica ---
  if (action === "login") {
    const email = str(body.email).toLowerCase();
    const password = str(body.password);
    if (!email || !password) return jsonResponse(req, { error: "e-mail e senha são obrigatórios" }, 400);

    const check = await verifyClinicaGestorLogin(email, password);
    if (!check.ok) {
      return jsonResponse(req, { error: check.error }, check.status);
    }

    const token = newSessionToken();
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
    const { error: sessionError } = await admin
      .from("fa_teste_admin_sessions")
      .insert({ token, clinica_user_id: check.userId, admin_email: check.email, expires_at: expiresAt });
    if (sessionError) {
      console.error("Erro ao criar sessão:", sessionError);
      return jsonResponse(req, { error: "falha ao autenticar" }, 500);
    }

    return jsonResponse(req, { token, expires_at: expiresAt, email: check.email });
  }

  // --- todas as ações abaixo exigem sessão válida ---
  const session = await requireSession(admin, req);
  if (!session) return jsonResponse(req, { error: "sessão inválida ou expirada" }, 401);

  if (action === "logout") {
    await admin.from("fa_teste_admin_sessions").delete().eq("token", session.token);
    return jsonResponse(req, { success: true });
  }

  if (action === "list_leads") {
    const status = str(body.status);
    const q = str(body.q);
    const limit = Math.min(Math.max(Number(body.limit) || 50, 1), 200);

    let query = admin
      .from("fa_leads_teste_comportamento")
      .select(
        "id, status, child_first_name, child_age_range, guardian_name, guardian_email, guardian_phone, preferred_unit, score, result_band, results, test_version, ai_insight_generated_at, ai_insight_sent_at, contacted_at, marketing_opt_in, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status && LEAD_STATUSES.includes(status)) query = query.eq("status", status);
    if (q) {
      const pattern = quoteFilterValue(`%${q.replace(/[%_]/g, "")}%`);
      query = query.or(
        `guardian_name.ilike.${pattern},guardian_email.ilike.${pattern},child_first_name.ilike.${pattern}`,
      );
    }

    const { data, error } = await query;
    if (error) return jsonResponse(req, { error: "falha ao listar leads" }, 500);
    return jsonResponse(req, { leads: data });
  }

  if (action === "get_lead") {
    const leadId = str(body.lead_id);
    const { data, error } = await admin.from("fa_leads_teste_comportamento").select("*").eq("id", leadId).maybeSingle();
    if (error || !data) return jsonResponse(req, { error: "lead não encontrado" }, 404);
    return jsonResponse(req, { lead: data });
  }

  if (action === "generate_insight") {
    const leadId = str(body.lead_id);
    const { data: lead, error } = await admin
      .from("fa_leads_teste_comportamento")
      .select("id, child_first_name, child_age_range, score, result_band, results, test_version, answers, status")
      .eq("id", leadId)
      .maybeSingle();
    if (error || !lead) return jsonResponse(req, { error: "lead não encontrado" }, 404);
    if (lead.status !== "completed" && lead.status !== "contacted") {
      return jsonResponse(req, { error: "lead ainda não concluiu o teste" }, 400);
    }

    const version = lead.test_version ?? "2026-09-16";
    const result = await generateInsight({
      childFirstName: lead.child_first_name,
      childAgeRange: lead.child_age_range,
      testVersion: version,
      score: lead.score ?? 0,
      bandTitle: resultTitleFor(lead),
      results: Array.isArray(lead.results) ? (lead.results as AreaResult[]) : undefined,
      answers: (lead.answers ?? []) as Array<{ id: string; v: number }>,
      questions: QUESTION_LABELS_BY_VERSION[version] ?? QUESTION_LABELS_BY_VERSION["2026-09-18"],
      maxScale: MAX_SCALE_BY_VERSION[version] ?? 2,
    });

    if (result.error) {
      await admin.from("fa_leads_teste_comportamento").update({ ai_insight_error: result.error }).eq("id", leadId);
      return jsonResponse(req, { error: result.error }, 502);
    }

    await admin
      .from("fa_leads_teste_comportamento")
      .update({ ai_insight: result.text, ai_insight_generated_at: new Date().toISOString(), ai_insight_error: null })
      .eq("id", leadId);

    return jsonResponse(req, { insight: result.text });
  }

  if (action === "send_insight_email") {
    const leadId = str(body.lead_id);
    const { data: lead, error } = await admin
      .from("fa_leads_teste_comportamento")
      .select("id, child_first_name, guardian_name, guardian_email, ai_insight, result_band, results")
      .eq("id", leadId)
      .maybeSingle();
    if (error || !lead) return jsonResponse(req, { error: "lead não encontrado" }, 404);
    if (!lead.ai_insight) return jsonResponse(req, { error: "gere o insight antes de enviar" }, 400);
    if (!lead.guardian_email) return jsonResponse(req, { error: "lead sem e-mail" }, 400);

    const result = await sendInsightEmailToGuardian({
      guardianName: lead.guardian_name ?? "",
      guardianEmail: lead.guardian_email,
      childFirstName: lead.child_first_name,
      bandTitle: resultTitleFor(lead),
      insight: lead.ai_insight,
    });

    if (!result.sent) return jsonResponse(req, { error: result.error ?? "falha ao enviar e-mail" }, 502);

    await admin
      .from("fa_leads_teste_comportamento")
      .update({ ai_insight_sent_at: new Date().toISOString() })
      .eq("id", leadId);

    return jsonResponse(req, { success: true });
  }

  if (action === "get_config") {
    const { data, error } = await admin
      .from("fa_teste_config")
      .select("value")
      .eq("key", "resultado_v2")
      .maybeSingle();
    if (error) return jsonResponse(req, { error: "falha ao carregar configuração" }, 500);
    return jsonResponse(req, { defaults: CONFIG_DEFAULTS, overrides: sanitizeConfig(data?.value ?? {}) });
  }

  if (action === "update_config") {
    const config = sanitizeConfig(body.config);
    const { error } = await admin
      .from("fa_teste_config")
      .upsert({
        key: "resultado_v2",
        value: config,
        updated_at: new Date().toISOString(),
        updated_by: session.email,
      });
    if (error) {
      console.error("Erro ao salvar configuração:", error);
      return jsonResponse(req, { error: "falha ao salvar configuração" }, 500);
    }
    return jsonResponse(req, { overrides: config });
  }

  if (action === "mark_contacted") {
    const leadId = str(body.lead_id);
    const notes = str(body.notes);
    const { error } = await admin
      .from("fa_leads_teste_comportamento")
      .update({ status: "contacted", contacted_at: new Date().toISOString(), admin_notes: notes || null })
      .eq("id", leadId);
    if (error) return jsonResponse(req, { error: "falha ao atualizar lead" }, 500);
    return jsonResponse(req, { success: true });
  }

  return jsonResponse(req, { error: "ação inválida" }, 400);
});

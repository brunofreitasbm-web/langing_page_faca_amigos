// Hub de Gestão (gestao.html, servido em gestao.institutofacaamigos.com.br):
// login único de Bruno e Isabella e "um clique = entra no sistema já logado"
// nos sistemas (Playground, Clínica, Simulador Financeiro, Gestão de
// Pessoas/Grupo IB e Hub de Operações Cacau Show). Tudo numa única função,
// roteada por `action` no corpo JSON — mesmo motivo de CORS/JSON inline das
// demais funções deste projeto (import relativo de ../_shared quebra no
// deploy via MCP). O import é npm: (o jsr: falha no deploy via MCP).
//
// Login (2 passos):
//   1. `login`: e-mail/CPF + senha do Sistema da Clínica (mesma chamada
//      grant_type=password de behavior-test-admin). Só entra quem está em
//      fa_gestao_contas com ativo = true. Se a senha confere, manda um código
//      de 6 dígitos por e-mail (Brevo) para `email_codigo` (o login da Clínica
//      pode ser um e-mail interno sem caixa de entrada) e devolve o id do desafio.
//   2. `verificar`: código certo → token de sessão opaco (7 dias). No banco
//      fica só o SHA-256 do token.
//
// Entrada nos sistemas (`launch`): nenhum sistema compartilha sessão com
// outro (2 projetos Supabase, localStorage em parte deles, e o Cacau Show
// nem usa Supabase Auth), então a função entrega um ticket de uso único:
//   - Supabase (Playground/Financeiro no projeto A, Clínica/RH no projeto B):
//     auth.admin.generateLink({ type: "magiclink" }) — o e-mail NÃO é
//     enviado; só o hashed_token vai na URL, e a porta /sso do sistema troca
//     por sessão com verifyOtp({ token_hash, type: "email" }). Mesmo
//     mecanismo do login por PIN do Playground (login-pin).
//   - Cacau Show: ticket HMAC-SHA256 (usuário, expira em 60s, jti de uso
//     único) com o segredo GESTAO_SSO_SECRET_CACAU, conferido em
//     POST /api/auth/sso do hub-operacoes.
//
//   - Painel do site (/admin, quadrados "Mapeamento Comportamental" e "Eventos"): ticket
//     aleatório de uso único guardado (SHA-256) em fa_gestao_painel_tickets, 60 s;
//     a ação `sso` de behavior-test-admin troca por sessão de escopo `owner`.
//
// Deploy com verify_jwt = false (o Bearer é o token de sessão do hub, não um
// JWT do Supabase) — igual a behavior-test-admin.

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

const LOGO_URL = "https://institutofacaamigos.com.br/img/logo-simbolo.png";
const HUB_URL = "https://gestao.institutofacaamigos.com.br";

const ALLOWED_ORIGINS = [
  "https://gestao.institutofacaamigos.com.br",
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
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...corsHeaders(req) },
  });
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function quoteFilterValue(v: string): string {
  return `"${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(s: string): Promise<string> {
  return toHex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
}

function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return toHex(arr.buffer);
}

// 6 dígitos sem viés de módulo (rejeita o topo do intervalo de 32 bits).
function randomCode(): string {
  const limit = Math.floor(0xffffffff / 1_000_000) * 1_000_000;
  const arr = new Uint32Array(1);
  do crypto.getRandomValues(arr); while (arr[0] >= limit);
  return String(arr[0] % 1_000_000).padStart(6, "0");
}

function base64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!domain) return email;
  const visible = user.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(user.length - 2, 3))}@${domain}`;
}

// ---------------------------------------------------------------------
// Configuração dos 5 sistemas (quadrados do hub)
// ---------------------------------------------------------------------

type Conta = {
  email: string;
  email_codigo: string;
  nome: string;
  playground_email: string | null;
  clinica_email: string | null;
  financeiro_email: string | null;
  rh_email: string | null;
  cacau_usuario: string | null;
  painel_usuario: string | null;
  ativo: boolean;
  papel: "owner" | "gerente";
  auth_modo: "clinica" | "hub";
  senha_hash: string | null;
  senha_definida_em: string | null;
  convidado_em: string | null;
  login_email: string | null;
  criado_por: string | null;
  created_at: string;
};

type AppId = "playground" | "clinica" | "financeiro" | "rh" | "cacau" | "painel" | "eventos";

// Nível da pessoa num módulo. `nenhum` = sem linha em fa_gestao_permissoes.
type Nivel = "nenhum" | "ver" | "operar" | "admin";
const NIVEIS: Nivel[] = ["nenhum", "ver", "operar", "admin"];
type Niveis = Record<AppId, Nivel>;

const APPS: Record<AppId, {
  rotulo: string;
  campo: keyof Conta;
  campoRotulo: string;
  tipo: "supabase_a" | "supabase_b" | "cacau" | "painel";
  baseEnv: string;
  baseDefault: string;
  entrada: (base: string, ticket: string) => string;
}> = {
  playground: {
    rotulo: "Playground",
    campo: "playground_email",
    campoRotulo: "E-mail no Playground",
    tipo: "supabase_a",
    baseEnv: "GESTAO_URL_PLAYGROUND",
    baseDefault: "https://app.institutofacaamigos.com.br",
    entrada: (b, t) => `${b}/sso?token_hash=${encodeURIComponent(t)}`,
  },
  clinica: {
    rotulo: "Clínica",
    campo: "clinica_email",
    campoRotulo: "E-mail na Clínica",
    tipo: "supabase_b",
    baseEnv: "GESTAO_URL_CLINICA",
    baseDefault: "https://sistema.institutofacaamigos.com.br",
    entrada: (b, t) => `${b}/auth/sso?token_hash=${encodeURIComponent(t)}`,
  },
  financeiro: {
    rotulo: "Simulador Financeiro",
    campo: "financeiro_email",
    campoRotulo: "E-mail no Simulador",
    tipo: "supabase_a",
    baseEnv: "GESTAO_URL_FINANCEIRO",
    baseDefault: "https://simulador-financeiro-blush.vercel.app",
    entrada: (b, t) => `${b}/auth/sso?token_hash=${encodeURIComponent(t)}`,
  },
  rh: {
    rotulo: "Gestão de Pessoas",
    campo: "rh_email",
    campoRotulo: "E-mail na Gestão de Pessoas",
    tipo: "supabase_b",
    baseEnv: "GESTAO_URL_RH",
    baseDefault: "https://rh.institutofacaamigos.com.br",
    entrada: (b, t) => `${b}/sso?token_hash=${encodeURIComponent(t)}`,
  },
  cacau: {
    rotulo: "Cacau Show",
    campo: "cacau_usuario",
    campoRotulo: "Usuário no Cacau Show",
    tipo: "cacau",
    baseEnv: "GESTAO_URL_CACAU",
    baseDefault: "https://hub-operacoes-theta.vercel.app",
    // No fragmento (#): não vai para o servidor nem para logs de acesso.
    entrada: (b, t) => `${b}/#sso=${encodeURIComponent(t)}`,
  },
  // Painel do site (/admin do institutofacaamigos.com.br): ticket guardado no
  // banco (fa_gestao_painel_tickets), trocado pela ação `sso` de
  // behavior-test-admin. Também no fragmento: fora de logs e do Referer.
  painel: {
    rotulo: "Mapeamento Comportamental",
    campo: "painel_usuario",
    campoRotulo: "Usuário no painel",
    tipo: "painel",
    baseEnv: "GESTAO_URL_PAINEL",
    baseDefault: "https://institutofacaamigos.com.br",
    entrada: (b, t) => `${b}/admin#sso=${encodeURIComponent(t)}`,
  },
  // Mesmo painel, já aberto na aba Eventos.
  eventos: {
    rotulo: "Eventos",
    campo: "painel_usuario",
    campoRotulo: "Usuário no painel",
    tipo: "painel",
    baseEnv: "GESTAO_URL_PAINEL",
    baseDefault: "https://institutofacaamigos.com.br",
    entrada: (b, t) => `${b}/admin#sso=${encodeURIComponent(t)}&aba=eventos`,
  },
};

const APP_IDS = Object.keys(APPS) as AppId[];

// Nível efetivo em cada módulo: owner é admin em tudo; gerente vale o que está na matriz.
async function carregarNiveis(admin: Admin, conta: Conta): Promise<Niveis> {
  const out = {} as Niveis;
  for (const id of APP_IDS) out[id] = conta.papel === "owner" ? "admin" : "nenhum";
  if (conta.papel === "owner") return out;
  const { data } = await admin.from("fa_gestao_permissoes").select("modulo, nivel").eq("email", conta.email);
  for (const p of data ?? []) {
    if (p.modulo in APPS && NIVEIS.includes(p.nivel)) out[p.modulo as AppId] = p.nivel as Nivel;
  }
  return out;
}

// Quadrado habilitado = tem nível no módulo E a identidade da pessoa naquele sistema está preenchida.
function appsDisponiveis(conta: Conta, niveis: Niveis): Record<AppId, boolean> {
  const out = {} as Record<AppId, boolean>;
  for (const id of APP_IDS) out[id] = niveis[id] !== "nenhum" && !!conta[APPS[id].campo];
  return out;
}

// Ticket do Hub de Operações Cacau Show: base64url(payload).base64url(HMAC-SHA256).
// `n` leva o nível (ver|operar|admin) para o Cacau passar a honrá-lo; payload extra é ignorado por quem não conhece.
async function ticketCacau(usuario: string, nivel: Nivel): Promise<string | null> {
  const secret = Deno.env.get("GESTAO_SSO_SECRET_CACAU");
  if (!secret) return null;
  const payload = {
    u: usuario,
    n: nivel,
    aud: "hub-operacoes",
    exp: Math.floor(Date.now() / 1000) + 60,
    jti: crypto.randomUUID(),
  };
  const payloadB64 = base64url(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadB64));
  return `${payloadB64}.${base64url(new Uint8Array(sig))}`;
}

// Ticket do painel do site: 32 bytes aleatórios; no banco fica só o SHA-256,
// vale 60 s e só serve uma vez (a troca é feita por behavior-test-admin).
const PAINEL_TICKET_TTL_MS = 60 * 1000;

// O /admin hospeda dois módulos (painel e eventos); o ticket leva o nível da pessoa nos dois,
// e a troca (`sso`) grava um escopo para cada, independente de qual quadrado foi clicado.
async function ticketPainel(admin: Admin, email: string, niveis: Niveis): Promise<string | null> {
  const ticket = randomHex(32);
  const { error } = await admin.from("fa_gestao_painel_tickets").insert({
    token_hash: await sha256Hex(ticket),
    email,
    nivel_painel: niveis.painel,
    nivel_eventos: niveis.eventos,
    expires_at: new Date(Date.now() + PAINEL_TICKET_TTL_MS).toISOString(),
  });
  if (error) {
    console.error("ticket painel:", error.message);
    return null;
  }
  return ticket;
}

// hashed_token de magic link (nunca enviado por e-mail) no projeto A ou B.
async function ticketSupabase(tipo: "supabase_a" | "supabase_b", email: string): Promise<string | null> {
  const url = tipo === "supabase_a" ? Deno.env.get("SUPABASE_URL") : Deno.env.get("CLINICA_SUPABASE_URL");
  const key = tipo === "supabase_a"
    ? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    : Deno.env.get("CLINICA_SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.admin.generateLink({ type: "magiclink", email });
  if (error || !data?.properties?.hashed_token) {
    console.error(`generateLink (${tipo}) falhou:`, error?.message);
    return null;
  }
  return data.properties.hashed_token;
}

// ---------------------------------------------------------------------
// Senha: delegada ao Supabase Auth do Sistema da Clínica
// ---------------------------------------------------------------------

async function verificarSenhaClinica(
  identifier: string,
  password: string,
): Promise<{ ok: true; email: string } | { ok: false; status: number }> {
  const clinicaUrl = Deno.env.get("CLINICA_SUPABASE_URL");
  const clinicaAnonKey = Deno.env.get("CLINICA_SUPABASE_ANON_KEY");
  if (!clinicaUrl || !clinicaAnonKey) return { ok: false, status: 500 };

  let emailToUse = identifier;

  // Sem '@': é CPF. A busca usa a service role da Clínica: com a chave anon a RLS de `profiles` (só lê a
  // própria clínica, logado) devolve vazio e o login por CPF nunca achava o e-mail.
  if (!emailToUse.includes("@")) {
    const alvo = await acharUsuarioClinica(emailToUse);
    if (alvo) emailToUse = alvo.email;
  }

  const tokenRes = await fetch(`${clinicaUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: clinicaAnonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email: emailToUse, password }),
  }).catch(() => null);
  if (!tokenRes) return { ok: false, status: 502 };
  if (!tokenRes.ok) return { ok: false, status: 401 };

  const tokenData = await tokenRes.json().catch(() => null);
  const email = String(tokenData?.user?.email ?? "").toLowerCase();
  if (!email) return { ok: false, status: 401 };
  return { ok: true, email };
}

// Localiza o usuário da Clínica por CPF ou e-mail (para redefinir a senha). Usa a service role do projeto da Clínica.
function clinicaAdmin(): SupabaseClient | null {
  const url = Deno.env.get("CLINICA_SUPABASE_URL");
  const key = Deno.env.get("CLINICA_SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function acharUsuarioClinica(identifier: string): Promise<{ id: string; email: string } | null> {
  const b = clinicaAdmin();
  if (!b) return null;
  const filters: string[] = [];
  if (identifier.includes("@")) {
    filters.push(`email.eq.${quoteFilterValue(identifier.toLowerCase())}`);
  } else {
    // `profiles` só tem a coluna `cpf` (guardada só com dígitos); não existe `cpf_clean`, e uma coluna
    // inexistente dentro do .or() derruba a consulta inteira.
    const digits = identifier.replace(/\D/g, "");
    filters.push(`cpf.eq.${quoteFilterValue(identifier)}`);
    if (digits && digits !== identifier) filters.push(`cpf.eq.${quoteFilterValue(digits)}`);
  }
  const { data, error } = await b.from("profiles").select("id, email").or(filters.join(",")).limit(1);
  if (error || !data?.[0]?.id || !data[0].email) return null;
  return { id: String(data[0].id), email: String(data[0].email).toLowerCase() };
}

// ---------------------------------------------------------------------
// Senha própria do Hub (contas com auth_modo = 'hub'): PBKDF2-SHA256 com sal.
// Formato guardado: pbkdf2$iterações$salt(hex)$hash(hex). A senha nunca é guardada.
// ---------------------------------------------------------------------

const PBKDF2_ITER = 150_000;
const SENHA_MIN = 8;
const SENHA_MAX = 72;

async function derivarSenha(senha: string, salt: Uint8Array, iter: number): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(senha), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: iter }, key, 256);
  return toHex(bits);
}

async function hashSenha(senha: string): Promise<string> {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  return `pbkdf2$${PBKDF2_ITER}$${toHex(salt.buffer)}$${await derivarSenha(senha, salt, PBKDF2_ITER)}`;
}

async function verificarSenhaHub(senha: string, guardado: string): Promise<boolean> {
  const [alg, iterStr, saltHex, hashHex] = guardado.split("$");
  const iter = Number(iterStr);
  if (alg !== "pbkdf2" || !Number.isInteger(iter) || iter < 1 || !/^[0-9a-f]+$/.test(saltHex ?? "") || !hashHex) return false;
  const salt = Uint8Array.from(saltHex.match(/../g)!.map((h) => parseInt(h, 16)));
  const calculado = await derivarSenha(senha, salt, iter);
  // Comparação sem curto-circuito.
  if (calculado.length !== hashHex.length) return false;
  let diff = 0;
  for (let i = 0; i < calculado.length; i++) diff |= calculado.charCodeAt(i) ^ hashHex.charCodeAt(i);
  return diff === 0;
}

// ---------------------------------------------------------------------
// E-mail do código (Brevo)
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

function moldeEmail(corpo: string): string {
  return `
<div style="font-family:'Nunito','Segoe UI',Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1a3f35;">
  <div style="text-align:center;padding:10px 0 16px;">
    <img src="${LOGO_URL}" alt="Instituto Faça Amigos" width="32" height="32" style="display:inline-block;vertical-align:middle;margin-right:8px;">
    <span style="font-size:15px;font-weight:800;vertical-align:middle;">Faça<span style="color:#f0196b;">Amigos</span> · Gestão</span>
  </div>
  <div style="background:#fff;border-radius:24px;padding:28px 24px;text-align:center;border:1px solid #edf1ef;">${corpo}</div>
</div>`.trim();
}

// `modo` diz de quem é a senha: contas 'hub' têm senha própria; as legadas usam a do Sistema da Clínica.
async function enviarCodigo(
  email: string,
  nome: string,
  code: string,
  finalidade: "login" | "reset" = "login",
  modo: "clinica" | "hub" = "clinica",
): Promise<boolean> {
  const reset = finalidade === "reset";
  const quemSenha = modo === "hub" ? "do Hub de Gestão" : "do Hub de Gestão e do Sistema da Clínica";
  const html = moldeEmail(`
    <p style="margin:0 0 12px;font-size:15px;">Olá, ${escapeHtml(nome)}!</p>
    <p style="margin:0 0 18px;font-size:14px;color:#4C6B62;">${reset ? `Seu código para definir a senha ${quemSenha}:` : "Seu código para entrar no Hub de Gestão:"}</p>
    <div style="font-size:34px;font-weight:900;letter-spacing:10px;color:#1a3f35;background:#FFF9F1;border-radius:16px;padding:16px 0;">${code}</div>
    <p style="margin:18px 0 0;font-size:12px;color:#8B9A94;">Vale por 10 minutos. ${reset ? "Se não foi você, ignore este e-mail: a senha só muda com este código." : modo === "hub" ? "Se não foi você, avise quem administra o Hub e troque sua senha." : "Se não foi você, troque a senha do Sistema da Clínica agora."}</p>`);
  return enviarEmail(email, nome, reset ? `${code} é o código para definir sua senha` : `${code} é o seu código do Hub de Gestão`, html);
}

// `loginEmail` é o e-mail que a pessoa digita na tela de primeiro acesso (pode ser diferente do e-mail que recebe o código).
async function enviarConvite(email: string, nome: string, quemConvidou: string, loginEmail: string): Promise<boolean> {
  const html = moldeEmail(`
    <p style="margin:0 0 12px;font-size:15px;">Olá, ${escapeHtml(nome)}!</p>
    <p style="margin:0 0 18px;font-size:14px;color:#4C6B62;">${escapeHtml(quemConvidou)} liberou o seu acesso ao Hub de Gestão do Instituto Faça Amigos. Para entrar pela primeira vez, defina a sua senha:</p>
    <p style="margin:0 0 18px;"><a href="${HUB_URL}/#primeiro-acesso" style="display:inline-block;background:#f0196b;color:#fff;text-decoration:none;font-weight:800;font-size:14px;padding:12px 22px;border-radius:999px;">Definir minha senha</a></p>
    <p style="margin:0;font-size:12px;color:#8B9A94;">Na tela, informe o e-mail ${escapeHtml(loginEmail)} e digite o código de 6 dígitos que enviaremos para cá. Se você não esperava este convite, ignore a mensagem.</p>`);
  return enviarEmail(email, nome, "Seu acesso ao Hub de Gestão Faça Amigos", html);
}

async function enviarEmail(email: string, nome: string, assunto: string, html: string): Promise<boolean> {
  const apiKey = Deno.env.get("BREVO_API_KEY");
  const fromRaw = Deno.env.get("BREVO_FROM") ?? "Instituto Faça Amigos <nao-responder@institutofacaamigos.com.br>";
  if (!apiKey) {
    console.error("BREVO_API_KEY não configurada");
    return false;
  }

  try {
    const resp = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": apiKey, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        sender: parseSenderAddress(fromRaw),
        to: [{ email, name: nome }],
        subject: assunto,
        htmlContent: html,
      }),
    });
    if (!resp.ok) {
      console.error("Brevo:", resp.status, await resp.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (err) {
    console.error("Brevo:", err);
    return false;
  }
}

// ---------------------------------------------------------------------
// Sessão, limites e auditoria
// ---------------------------------------------------------------------

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias
const CODE_TTL_MS = 10 * 60 * 1000;
const CODE_MAX_TRIES = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_FAILS_PER_IP = 5;
const LOGIN_MAX_FAILS_PER_LOGIN = 10;
const CODES_MAX_PER_WINDOW = 5;

type Admin = SupabaseClient;

function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

async function auditar(
  admin: Admin,
  req: Request,
  evento: string,
  extra: { email?: string | null; app?: string | null; detalhe?: string | null } = {},
) {
  const { error } = await admin.from("fa_gestao_auditoria").insert({
    evento,
    email: extra.email ?? null,
    app: extra.app ?? null,
    detalhe: extra.detalhe ?? null,
    ip: clientIp(req),
    user_agent: (req.headers.get("user-agent") ?? "").slice(0, 300),
  });
  if (error) console.error("auditoria:", error.message);
}

async function carregarConta(admin: Admin, email: string): Promise<Conta | null> {
  const { data } = await admin.from("fa_gestao_contas").select("*").eq("email", email).maybeSingle();
  return data && data.ativo ? (data as Conta) : null;
}

// Acha a conta ativa pelo e-mail de login: a chave (email) ou o e-mail de login próprio do Hub (login_email).
async function acharContaPorLogin(admin: Admin, login: string): Promise<Conta | null> {
  const e = quoteFilterValue(login.toLowerCase());
  const { data } = await admin.from("fa_gestao_contas").select("*").or(`email.eq.${e},login_email.eq.${e}`).limit(1);
  const c = data?.[0] as Conta | undefined;
  return c && c.ativo ? c : null;
}

async function exigirSessao(admin: Admin, req: Request): Promise<{ tokenHash: string; conta: Conta } | null> {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!/^[0-9a-f]{64}$/.test(token)) return null;

  const tokenHash = await sha256Hex(token);
  const { data } = await admin
    .from("fa_gestao_sessoes")
    .select("email, expires_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (!data) return null;
  if (new Date(data.expires_at).getTime() < Date.now()) {
    await admin.from("fa_gestao_sessoes").delete().eq("token_hash", tokenHash);
    return null;
  }
  // Conta desativada derruba a sessão na hora.
  const conta = await carregarConta(admin, data.email);
  if (!conta) return null;
  return { tokenHash, conta };
}

type Desafio = {
  id: string;
  email: string;
  code_hash: string;
  tentativas: number;
  expires_at: string;
  usado_em: string | null;
  finalidade: string;
  alvo_id: string | null;
};

// Confere o código de um desafio (mesmas regras para entrar e para redefinir a senha) e o marca como usado.
async function conferirCodigo(
  admin: Admin,
  req: Request,
  challengeId: string,
  code: string,
  finalidade: "login" | "reset",
): Promise<{ ok: true; desafio: Desafio } | { ok: false; resp: Response }> {
  if (!/^[0-9a-f-]{36}$/.test(challengeId) || code.length !== 6) {
    return { ok: false, resp: jsonResponse(req, { error: "código inválido" }, 400) };
  }
  const { data } = await admin
    .from("fa_gestao_desafios")
    .select("id, email, code_hash, tentativas, expires_at, usado_em, finalidade, alvo_id")
    .eq("id", challengeId)
    .maybeSingle();
  const desafio = data as Desafio | null;
  if (!desafio || desafio.finalidade !== finalidade || desafio.usado_em || new Date(desafio.expires_at).getTime() < Date.now()) {
    return { ok: false, resp: jsonResponse(req, { error: "código expirado, comece de novo", reiniciar: true }, 401) };
  }
  if (desafio.tentativas >= CODE_MAX_TRIES) {
    return { ok: false, resp: jsonResponse(req, { error: "tentativas esgotadas, comece de novo", reiniciar: true }, 401) };
  }
  const confere = (await sha256Hex(`${challengeId}:${code}`)) === desafio.code_hash;
  if (!confere) {
    const tentativas = desafio.tentativas + 1;
    await admin.from("fa_gestao_desafios").update({ tentativas }).eq("id", challengeId);
    await auditar(admin, req, "codigo_falhou", { email: desafio.email, detalhe: finalidade });
    const restam = CODE_MAX_TRIES - tentativas;
    return {
      ok: false,
      resp: jsonResponse(
        req,
        restam > 0
          ? { error: `código incorreto (restam ${restam} tentativa${restam > 1 ? "s" : ""})` }
          : { error: "tentativas esgotadas, comece de novo", reiniciar: true },
        401,
      ),
    };
  }
  // Marca como usado só se ninguém usou antes (dois envios simultâneos).
  const { data: marcado } = await admin
    .from("fa_gestao_desafios")
    .update({ usado_em: new Date().toISOString() })
    .eq("id", challengeId)
    .is("usado_em", null)
    .select("id");
  if (!marcado?.length) {
    return { ok: false, resp: jsonResponse(req, { error: "código já usado, comece de novo", reiniciar: true }, 401) };
  }
  return { ok: true, desafio };
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
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  // --- passo 1: senha da Clínica → código por e-mail ---
  if (action === "login") {
    const raw = str(body.identifier || body.email);
    const loginInput = raw.includes("@") ? raw.toLowerCase() : raw;
    const password = str(body.password);
    if (!loginInput || !password) return jsonResponse(req, { error: "informe e-mail/CPF e senha" }, 400);

    const ip = clientIp(req);
    const since = new Date(Date.now() - LOGIN_WINDOW_MS).toISOString();
    const [byIp, byLogin] = await Promise.all([
      admin.from("fa_gestao_login_attempts").select("id", { count: "exact", head: true }).eq("ip", ip).gte("created_at", since),
      admin.from("fa_gestao_login_attempts").select("id", { count: "exact", head: true }).eq("login", loginInput.toLowerCase()).gte("created_at", since),
    ]);
    if ((byIp.count ?? 0) >= LOGIN_MAX_FAILS_PER_IP || (byLogin.count ?? 0) >= LOGIN_MAX_FAILS_PER_LOGIN) {
      return jsonResponse(req, { error: "muitas tentativas, aguarde 15 minutos" }, 429);
    }

    const falhou = async (status: number, detalhe: string, email?: string) => {
      if (status < 500) {
        await admin.from("fa_gestao_login_attempts").insert({ ip, login: loginInput.toLowerCase() });
      }
      await auditar(admin, req, "login_falhou", { email: email ?? loginInput.toLowerCase(), detalhe });
      // Mesma mensagem para senha errada e conta fora da lista: não revela quem tem acesso.
      return jsonResponse(
        req,
        { error: status >= 500 ? "serviço indisponível, tente de novo" : "e-mail/CPF ou senha incorretos" },
        status >= 500 ? 502 : 401,
      );
    };

    // Conta com senha própria do Hub (login = e-mail); as demais seguem pela senha do Sistema da Clínica.
    const contaHub = loginInput.includes("@") ? await acharContaPorLogin(admin, loginInput) : null;
    let conta: Conta | null;
    if (contaHub?.auth_modo === "hub") {
      if (!contaHub.senha_hash || !(await verificarSenhaHub(password, contaHub.senha_hash))) {
        return falhou(401, "senha", contaHub.email);
      }
      conta = contaHub;
    } else {
      const check = await verificarSenhaClinica(loginInput, password);
      if (!check.ok) return falhou(check.status, "senha");
      conta = await carregarConta(admin, check.email);
      if (!conta) return falhou(401, "fora_da_lista", check.email);
    }

    const { count: codigosRecentes } = await admin
      .from("fa_gestao_desafios")
      .select("id", { count: "exact", head: true })
      .eq("email", conta.email)
      .eq("finalidade", "login")
      .gte("created_at", since);
    if ((codigosRecentes ?? 0) >= CODES_MAX_PER_WINDOW) {
      return jsonResponse(req, { error: "muitos códigos pedidos, aguarde 15 minutos" }, 429);
    }

    const code = randomCode();
    const challengeId = crypto.randomUUID();
    const { error: insErr } = await admin.from("fa_gestao_desafios").insert({
      id: challengeId,
      email: conta.email,
      code_hash: await sha256Hex(`${challengeId}:${code}`),
      ip,
      expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString(),
    });
    if (insErr) {
      console.error("desafio:", insErr.message);
      return jsonResponse(req, { error: "falha ao gerar código" }, 500);
    }

    if (!(await enviarCodigo(conta.email_codigo, conta.nome, code, "login", conta.auth_modo))) {
      return jsonResponse(req, { error: "não foi possível enviar o código por e-mail" }, 502);
    }

    await auditar(admin, req, "login_senha_ok", { email: conta.email });
    return jsonResponse(req, { challenge_id: challengeId, email_mascarado: maskEmail(conta.email_codigo) });
  }

  // --- passo 2: código → sessão ---
  if (action === "verificar") {
    const conf = await conferirCodigo(admin, req, str(body.challenge_id), str(body.code).replace(/\D/g, ""), "login");
    if (!conf.ok) return conf.resp;
    const desafio = conf.desafio;

    const conta = await carregarConta(admin, desafio.email);
    if (!conta) return jsonResponse(req, { error: "acesso não autorizado" }, 403);

    const token = randomHex(32);
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
    const { error: sessErr } = await admin.from("fa_gestao_sessoes").insert({
      token_hash: await sha256Hex(token),
      email: conta.email,
      expires_at: expiresAt,
    });
    if (sessErr) {
      console.error("sessão:", sessErr.message);
      return jsonResponse(req, { error: "falha ao entrar" }, 500);
    }

    await auditar(admin, req, "codigo_ok", { email: conta.email });
    const niveis = await carregarNiveis(admin, conta);
    return jsonResponse(req, {
      token,
      expires_at: expiresAt,
      nome: conta.nome,
      papel: conta.papel,
      apps: appsDisponiveis(conta, niveis),
      niveis,
    });
  }

  // --- esqueci a senha (1/2): pede o código, que vai para o e-mail real cadastrado ---
  if (action === "esqueci") {
    const raw = str(body.identifier || body.email);
    const loginInput = raw.includes("@") ? raw.toLowerCase() : raw;
    if (!loginInput) return jsonResponse(req, { error: "informe e-mail ou CPF" }, 400);

    const ip = clientIp(req);
    const since = new Date(Date.now() - LOGIN_WINDOW_MS).toISOString();
    const { count: pedidosIp } = await admin
      .from("fa_gestao_desafios")
      .select("id", { count: "exact", head: true })
      .eq("finalidade", "reset")
      .eq("ip", ip)
      .gte("created_at", since);
    if ((pedidosIp ?? 0) >= CODES_MAX_PER_WINDOW) {
      return jsonResponse(req, { error: "muitos pedidos, aguarde 15 minutos" }, 429);
    }

    // Resposta igual para quem tem e para quem não tem acesso: não revela quem está na lista.
    const generica = (id: string) =>
      jsonResponse(req, { challenge_id: id, mensagem: "Se os dados conferem, enviamos um código para o e-mail cadastrado." });

    // Conta de senha própria: acha pelo e-mail no próprio Hub. As legadas, pelo usuário da Clínica.
    const contaHub = loginInput.includes("@") ? await acharContaPorLogin(admin, loginInput) : null;
    const ehHub = contaHub?.auth_modo === "hub";
    const alvo = ehHub ? null : await acharUsuarioClinica(loginInput);
    const conta = ehHub ? contaHub : alvo ? await carregarConta(admin, alvo.email) : null;
    if ((!ehHub && !alvo) || !conta) {
      await auditar(admin, req, "reset_ignorado", { email: loginInput.toLowerCase() });
      return generica(crypto.randomUUID());
    }

    const { count: pedidosConta } = await admin
      .from("fa_gestao_desafios")
      .select("id", { count: "exact", head: true })
      .eq("finalidade", "reset")
      .eq("email", conta.email)
      .gte("created_at", since);
    if ((pedidosConta ?? 0) >= CODES_MAX_PER_WINDOW) return generica(crypto.randomUUID());

    const code = randomCode();
    const challengeId = crypto.randomUUID();
    const { error: insErr } = await admin.from("fa_gestao_desafios").insert({
      id: challengeId,
      email: conta.email,
      code_hash: await sha256Hex(`${challengeId}:${code}`),
      ip,
      finalidade: "reset",
      alvo_id: alvo?.id ?? null,
      expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString(),
    });
    if (insErr) {
      console.error("desafio reset:", insErr.message);
      return jsonResponse(req, { error: "falha ao gerar código" }, 500);
    }
    if (!(await enviarCodigo(conta.email_codigo, conta.nome, code, "reset", conta.auth_modo))) {
      return jsonResponse(req, { error: "não foi possível enviar o código por e-mail" }, 502);
    }
    await auditar(admin, req, "reset_codigo_enviado", { email: conta.email });
    return generica(challengeId);
  }

  // --- esqueci a senha (2/2): código certo + senha nova -> troca a senha do Sistema da Clínica ---
  if (action === "redefinir") {
    const novaSenha = typeof body.new_password === "string" ? body.new_password : "";
    if (novaSenha.length < SENHA_MIN || novaSenha.length > SENHA_MAX) {
      return jsonResponse(req, { error: `a senha nova precisa ter de ${SENHA_MIN} a ${SENHA_MAX} caracteres` }, 400);
    }
    const conf = await conferirCodigo(admin, req, str(body.challenge_id), str(body.code).replace(/\D/g, ""), "reset");
    if (!conf.ok) return conf.resp;
    const desafio = conf.desafio;

    const conta = await carregarConta(admin, desafio.email);

    // Conta de senha própria: a senha nova é do Hub (convite = primeiro acesso, o mesmo caminho).
    if (conta?.auth_modo === "hub") {
      const { error: hubErr } = await admin
        .from("fa_gestao_contas")
        .update({ senha_hash: await hashSenha(novaSenha), senha_definida_em: new Date().toISOString() })
        .eq("email", conta.email);
      if (hubErr) {
        console.error("senha hub:", hubErr.message);
        return jsonResponse(req, { error: "não foi possível trocar a senha agora" }, 500);
      }
      await admin.from("fa_gestao_sessoes").delete().eq("email", conta.email);
      await auditar(admin, req, "senha_redefinida", { email: conta.email, detalhe: "hub" });
      return jsonResponse(req, { ok: true });
    }

    const b = clinicaAdmin();
    if (!conta || !b || !desafio.alvo_id) return jsonResponse(req, { error: "não foi possível trocar a senha agora" }, 500);

    const { error: updErr } = await b.auth.admin.updateUserById(desafio.alvo_id, { password: novaSenha });
    if (updErr) {
      console.error("updateUserById:", updErr.message);
      await auditar(admin, req, "reset_falhou", { email: conta.email, detalhe: updErr.message.slice(0, 120) });
      return jsonResponse(req, { error: "a Clínica recusou essa senha. Tente uma mais longa e diferente.", reiniciar: true }, 400);
    }
    // Senha nova derruba as sessões abertas do hub.
    await admin.from("fa_gestao_sessoes").delete().eq("email", conta.email);
    await auditar(admin, req, "senha_redefinida", { email: conta.email });
    return jsonResponse(req, { ok: true });
  }

  // --- daqui para baixo exige sessão ---
  const sessao = await exigirSessao(admin, req);
  if (!sessao) return jsonResponse(req, { error: "sessão inválida ou expirada" }, 401);
  const { conta } = sessao;

  if (action === "me") {
    const niveis = await carregarNiveis(admin, conta);
    return jsonResponse(req, {
      nome: conta.nome,
      email: conta.email,
      papel: conta.papel,
      apps: appsDisponiveis(conta, niveis),
      niveis,
    });
  }

  if (action === "logout") {
    await admin.from("fa_gestao_sessoes").delete().eq("token_hash", sessao.tokenHash);
    await auditar(admin, req, "logout", { email: conta.email });
    return jsonResponse(req, { success: true });
  }

  if (action === "launch") {
    const appId = str(body.app) as AppId;
    const app = APPS[appId];
    if (!app) return jsonResponse(req, { error: "sistema desconhecido" }, 400);

    // O nível é conferido aqui no servidor: esconder o quadrado no front não é controle de acesso.
    const niveis = await carregarNiveis(admin, conta);
    if (niveis[appId] === "nenhum") {
      await auditar(admin, req, "launch_negado", { email: conta.email, app: appId });
      return jsonResponse(req, { error: "você não tem acesso a este sistema" }, 403);
    }

    const identidade = conta[app.campo];
    if (typeof identidade !== "string" || !identidade) {
      return jsonResponse(req, { error: "você ainda não tem acesso configurado a este sistema" }, 403);
    }

    const ticket = app.tipo === "cacau"
      ? await ticketCacau(identidade, niveis[appId])
      : app.tipo === "painel"
      ? await ticketPainel(admin, conta.email, niveis)
      : await ticketSupabase(app.tipo, identidade);
    if (!ticket) {
      await auditar(admin, req, "launch", { email: conta.email, app: appId, detalhe: "falhou" });
      return jsonResponse(req, { error: "não foi possível abrir o sistema agora" }, 502);
    }

    const base = (Deno.env.get(app.baseEnv) ?? app.baseDefault).replace(/\/+$/, "");
    await auditar(admin, req, "launch", { email: conta.email, app: appId });
    return jsonResponse(req, { url: app.entrada(base, ticket) });
  }

  // --- gestão de pessoas e acessos: só owner ---
  const ACOES_OWNER = ["contas_listar", "conta_salvar", "conta_ativo", "convidar", "conta_acesso", "sessoes_revogar", "auditoria_listar"];
  if (ACOES_OWNER.includes(action)) {
    if (conta.papel !== "owner") {
      await auditar(admin, req, "acao_owner_negada", { email: conta.email, detalhe: action });
      return jsonResponse(req, { error: "apenas owner" }, 403);
    }
    return await acaoOwner(admin, req, body, action, conta);
  }

  return jsonResponse(req, { error: "ação inválida" }, 400);
});

// ---------------------------------------------------------------------
// Pessoas e acessos (só owner)
// ---------------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const CAMPOS_MAPEAMENTO = [...new Set(APP_IDS.map((id) => APPS[id].campo))].filter((c) => c !== "painel_usuario");
const COLUNAS_PUBLICAS =
  "email, email_codigo, nome, playground_email, clinica_email, financeiro_email, rh_email, cacau_usuario, painel_usuario, ativo, papel, auth_modo, login_email, senha_definida_em, convidado_em, criado_por, created_at";

// Derruba o que a pessoa tem aberto: sessão do Hub e sessão do /admin (12 h), para um novo nível valer já.
async function revogarSessoes(admin: Admin, email: string, painelUsuario: string | null) {
  await admin.from("fa_gestao_sessoes").delete().eq("email", email);
  if (painelUsuario) await admin.from("fa_teste_admin_sessions").delete().eq("admin_email", painelUsuario);
}

async function acaoOwner(
  admin: Admin,
  req: Request,
  body: Record<string, unknown>,
  action: string,
  dono: Conta,
): Promise<Response> {
  const alvoEmail = str(body.email).toLowerCase();

  if (action === "contas_listar") {
    const [{ data: contas, error }, { data: perms }] = await Promise.all([
      admin.from("fa_gestao_contas").select(COLUNAS_PUBLICAS).order("created_at", { ascending: true }),
      admin.from("fa_gestao_permissoes").select("email, modulo, nivel"),
    ]);
    if (error) return jsonResponse(req, { error: "falha ao listar" }, 500);
    const porEmail = new Map<string, Record<string, string>>();
    for (const p of perms ?? []) {
      const m = porEmail.get(p.email) ?? {};
      m[p.modulo] = p.nivel;
      porEmail.set(p.email, m);
    }
    return jsonResponse(req, {
      contas: (contas ?? []).map((c) => ({ ...c, permissoes: porEmail.get(c.email) ?? {} })),
      modulos: APP_IDS.map((id) => ({ id, rotulo: APPS[id].rotulo, campo: APPS[id].campo, campo_rotulo: APPS[id].campoRotulo })),
      niveis: NIVEIS,
    });
  }

  if (action === "auditoria_listar") {
    const limite = Math.min(Math.max(Number(body.limit) || 50, 1), 200);
    let q = admin
      .from("fa_gestao_auditoria")
      .select("evento, email, app, detalhe, ip, created_at")
      .order("created_at", { ascending: false })
      .limit(limite);
    if (EMAIL_RE.test(alvoEmail)) q = q.eq("email", alvoEmail);
    const { data, error } = await q;
    if (error) return jsonResponse(req, { error: "falha ao listar" }, 500);
    return jsonResponse(req, { eventos: data ?? [] });
  }

  if (!EMAIL_RE.test(alvoEmail)) return jsonResponse(req, { error: "e-mail inválido" }, 400);
  const { data: existente } = await admin.from("fa_gestao_contas").select("*").eq("email", alvoEmail).maybeSingle();
  const atual = existente as Conta | null;

  if (action === "conta_salvar") {
    const novo = body.novo === true;
    if (novo && atual) return jsonResponse(req, { error: "já existe uma conta com este e-mail" }, 409);
    if (!novo && !atual) return jsonResponse(req, { error: "conta não encontrada" }, 404);

    const nome = str(body.nome).slice(0, 120);
    const emailCodigo = (str(body.email_codigo) || alvoEmail).toLowerCase();
    const papel = body.papel === "owner" ? "owner" : "gerente";
    if (!nome) return jsonResponse(req, { error: "informe o nome" }, 400);
    if (!EMAIL_RE.test(emailCodigo)) return jsonResponse(req, { error: "e-mail do código inválido" }, 400);
    // Ninguém tira o próprio owner: evita deixar o Hub sem quem o administre.
    if (atual && atual.email === dono.email && papel !== "owner") {
      return jsonResponse(req, { error: "você não pode rebaixar a si mesmo" }, 400);
    }
    // Conta nova: o e-mail de acesso não pode ser o login de outra conta.
    if (novo) {
      const q = quoteFilterValue(alvoEmail);
      const { data: colide } = await admin.from("fa_gestao_contas").select("email").eq("login_email", alvoEmail).limit(1);
      if (colide?.length) return jsonResponse(req, { error: "já existe uma conta com este e-mail" }, 409);
      void q;
    }

    // Matriz: só níveis válidos; owner não precisa de linhas (é admin em tudo).
    const recebidas = (body.permissoes && typeof body.permissoes === "object" ? body.permissoes : {}) as Record<string, unknown>;
    const permissoes: Partial<Record<AppId, "ver" | "operar" | "admin">> = {};
    if (papel === "gerente") {
      for (const id of APP_IDS) {
        const n = recebidas[id];
        if (n === "ver" || n === "operar" || n === "admin") permissoes[id] = n;
      }
    }

    // Identidade da pessoa em cada sistema (até o provisionamento automático existir, o owner informa).
    const mapa = (body.mapeamentos && typeof body.mapeamentos === "object" ? body.mapeamentos : {}) as Record<string, unknown>;
    const campos: Record<string, string | null> = {};
    // Campo ausente = mantém o que está gravado; campo enviado vazio = limpa.
    for (const campo of CAMPOS_MAPEAMENTO) {
      if (typeof mapa[campo] === "string") {
        const bruto = str(mapa[campo]).slice(0, 200);
        campos[campo] = bruto ? (campo === "cacau_usuario" ? bruto : bruto.toLowerCase()) : null;
      } else {
        campos[campo] = atual ? (atual[campo as keyof Conta] as string | null) : null;
      }
    }
    // O /admin identifica a pessoa pelo próprio e-mail de login no Hub.
    const usaPainel = papel === "owner" || !!permissoes.painel || !!permissoes.eventos;
    campos.painel_usuario = usaPainel ? (atual?.painel_usuario ?? alvoEmail) : null;

    const linha = { email: alvoEmail, nome, email_codigo: emailCodigo, papel, ...campos };
    const { error: gravaErr } = novo
      ? await admin.from("fa_gestao_contas").insert({ ...linha, auth_modo: "hub", ativo: true, criado_por: dono.email })
      : await admin.from("fa_gestao_contas").update(linha).eq("email", alvoEmail);
    if (gravaErr) {
      console.error("conta_salvar:", gravaErr.message);
      return jsonResponse(req, { error: "não foi possível salvar" }, 500);
    }

    // Permissões: apaga o que saiu da matriz e grava o resto.
    const { data: antes } = await admin.from("fa_gestao_permissoes").select("modulo, nivel").eq("email", alvoEmail);
    await admin.from("fa_gestao_permissoes").delete().eq("email", alvoEmail);
    const linhas = Object.entries(permissoes).map(([modulo, nivel]) => ({
      email: alvoEmail,
      modulo,
      nivel,
      atualizado_por: dono.email,
    }));
    if (linhas.length) {
      const { error: permErr } = await admin.from("fa_gestao_permissoes").insert(linhas);
      if (permErr) {
        console.error("permissões:", permErr.message);
        return jsonResponse(req, { error: "conta salva, mas as permissões falharam. Tente de novo." }, 500);
      }
    }

    const resumo = (m: Record<string, string>) => Object.keys(m).sort().map((k) => `${k}=${m[k]}`).join(",") || "-";
    const antesMapa = Object.fromEntries((antes ?? []).map((p) => [p.modulo, p.nivel]));
    const depoisMapa = permissoes as Record<string, string>;
    const mudou = resumo(antesMapa) !== resumo(depoisMapa) || atual?.papel !== papel;
    await auditar(admin, req, novo ? "conta_criada" : "conta_atualizada", {
      email: alvoEmail,
      detalhe: `por ${dono.email}; papel=${papel}; ${resumo(depoisMapa)}`.slice(0, 300),
    });
    // Nível novo vale já: derruba a sessão aberta do /admin (12 h). A do Hub segue: ele recalcula o nível a cada clique.
    const painelAntes = atual?.painel_usuario ?? null;
    if (mudou) {
      for (const u of new Set([painelAntes, campos.painel_usuario].filter(Boolean) as string[])) {
        await admin.from("fa_teste_admin_sessions").delete().eq("admin_email", u);
      }
    }

    let conviteEnviado: boolean | null = null;
    if (novo && body.convidar !== false) {
      conviteEnviado = await enviarConvite(emailCodigo, nome, dono.nome, alvoEmail);
      if (conviteEnviado) {
        await admin.from("fa_gestao_contas").update({ convidado_em: new Date().toISOString() }).eq("email", alvoEmail);
        await auditar(admin, req, "convite_enviado", { email: alvoEmail, detalhe: `por ${dono.email}` });
      }
    }
    return jsonResponse(req, { ok: true, convite_enviado: conviteEnviado });
  }

  if (!atual) return jsonResponse(req, { error: "conta não encontrada" }, 404);

  if (action === "conta_ativo") {
    const ativo = body.ativo === true;
    if (!ativo && atual.email === dono.email) return jsonResponse(req, { error: "você não pode desativar a si mesmo" }, 400);
    const { error } = await admin.from("fa_gestao_contas").update({ ativo }).eq("email", atual.email);
    if (error) return jsonResponse(req, { error: "não foi possível atualizar" }, 500);
    if (!ativo) await revogarSessoes(admin, atual.email, atual.painel_usuario);
    await auditar(admin, req, ativo ? "conta_reativada" : "conta_desativada", { email: atual.email, detalhe: `por ${dono.email}` });
    return jsonResponse(req, { ok: true });
  }

  if (action === "sessoes_revogar") {
    await revogarSessoes(admin, atual.email, atual.painel_usuario);
    await auditar(admin, req, "sessoes_revogadas", { email: atual.email, detalhe: `por ${dono.email}` });
    return jsonResponse(req, { ok: true });
  }

  // Troca a forma de entrar: senha própria do Hub com um e-mail de login real (a chave da conta e os
  // usuários nos sistemas não mudam), ou volta para a senha do Sistema da Clínica (só contas antigas).
  if (action === "conta_acesso") {
    if (body.modo === "clinica") {
      if (atual.criado_por) return jsonResponse(req, { error: "conta criada no Hub não tem senha da Clínica" }, 400);
      const { error } = await admin.from("fa_gestao_contas").update({ auth_modo: "clinica", login_email: null }).eq("email", atual.email);
      if (error) return jsonResponse(req, { error: "não foi possível atualizar" }, 500);
      await auditar(admin, req, "acesso_clinica", { email: atual.email, detalhe: `por ${dono.email}` });
      return jsonResponse(req, { ok: true });
    }
    const login = str(body.login_email).toLowerCase();
    if (!EMAIL_RE.test(login)) return jsonResponse(req, { error: "e-mail de login inválido" }, 400);
    const q = quoteFilterValue(login);
    const { data: colide } = await admin.from("fa_gestao_contas").select("email")
      .or(`email.eq.${q},login_email.eq.${q}`).neq("email", atual.email).limit(1);
    if (colide?.length) return jsonResponse(req, { error: "este e-mail já é usado por outra conta" }, 409);
    const { error } = await admin.from("fa_gestao_contas").update({ auth_modo: "hub", login_email: login }).eq("email", atual.email);
    if (error) return jsonResponse(req, { error: "não foi possível atualizar" }, 500);
    await auditar(admin, req, "acesso_hub", { email: atual.email, detalhe: `por ${dono.email}; login=${login}` });
    // Sem senha própria ainda: manda o convite para definir (a sessão aberta segue valendo).
    let conviteEnviado: boolean | null = null;
    if (!atual.senha_hash) {
      conviteEnviado = await enviarConvite(atual.email_codigo, atual.nome, dono.nome, login);
      if (conviteEnviado) await admin.from("fa_gestao_contas").update({ convidado_em: new Date().toISOString() }).eq("email", atual.email);
    }
    return jsonResponse(req, { ok: true, convite_enviado: conviteEnviado, senha_definida: !!atual.senha_hash });
  }

  if (action === "convidar") {
    if (!atual.ativo || atual.auth_modo !== "hub") {
      return jsonResponse(req, { error: "convite só vale para conta ativa com senha própria do Hub" }, 400);
    }
    if (atual.convidado_em && Date.now() - new Date(atual.convidado_em).getTime() < 60_000) {
      return jsonResponse(req, { error: "convite enviado há pouco, aguarde 1 minuto" }, 429);
    }
    if (!(await enviarConvite(atual.email_codigo, atual.nome, dono.nome, atual.login_email ?? atual.email))) {
      return jsonResponse(req, { error: "não foi possível enviar o e-mail" }, 502);
    }
    await admin.from("fa_gestao_contas").update({ convidado_em: new Date().toISOString() }).eq("email", atual.email);
    await auditar(admin, req, "convite_enviado", { email: atual.email, detalhe: `por ${dono.email}` });
    return jsonResponse(req, { ok: true });
  }

  return jsonResponse(req, { error: "ação inválida" }, 400);
}

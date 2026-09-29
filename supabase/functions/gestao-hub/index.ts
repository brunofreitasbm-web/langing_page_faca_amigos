// Hub de Gestão (gestao.html, servido em gestao.institutofacaamigos.com.br):
// login único de Bruno e Isabella e "um clique = entra no sistema já logado"
// nos 5 sistemas (Playground, Clínica, Simulador Financeiro, Gestão de
// Pessoas/Grupo IB e Hub de Operações Cacau Show). Tudo numa única função,
// roteada por `action` no corpo JSON — mesmo motivo de CORS/JSON inline das
// demais funções deste projeto (import relativo de ../_shared quebra no
// deploy via MCP).
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
// Deploy com verify_jwt = false (o Bearer é o token de sessão do hub, não um
// JWT do Supabase) — igual a behavior-test-admin.

import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

const LOGO_URL = "https://institutofacaamigos.com.br/img/logo-simbolo.png";

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
  return `${visible}${"•".repeat(Math.max(user.length - 2, 3))}@${domain}`;
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
  ativo: boolean;
};

type AppId = "playground" | "clinica" | "financeiro" | "rh" | "cacau";

const APPS: Record<AppId, {
  campo: keyof Conta;
  tipo: "supabase_a" | "supabase_b" | "cacau";
  baseEnv: string;
  baseDefault: string;
  entrada: (base: string, ticket: string) => string;
}> = {
  playground: {
    campo: "playground_email",
    tipo: "supabase_a",
    baseEnv: "GESTAO_URL_PLAYGROUND",
    baseDefault: "https://app.institutofacaamigos.com.br",
    entrada: (b, t) => `${b}/sso?token_hash=${encodeURIComponent(t)}`,
  },
  clinica: {
    campo: "clinica_email",
    tipo: "supabase_b",
    baseEnv: "GESTAO_URL_CLINICA",
    baseDefault: "https://sistema.institutofacaamigos.com.br",
    entrada: (b, t) => `${b}/auth/sso?token_hash=${encodeURIComponent(t)}`,
  },
  financeiro: {
    campo: "financeiro_email",
    tipo: "supabase_a",
    baseEnv: "GESTAO_URL_FINANCEIRO",
    baseDefault: "https://simulador-financeiro-blush.vercel.app",
    entrada: (b, t) => `${b}/auth/sso?token_hash=${encodeURIComponent(t)}`,
  },
  rh: {
    campo: "rh_email",
    tipo: "supabase_b",
    baseEnv: "GESTAO_URL_RH",
    baseDefault: "https://rh.institutofacaamigos.com.br",
    entrada: (b, t) => `${b}/sso?token_hash=${encodeURIComponent(t)}`,
  },
  cacau: {
    campo: "cacau_usuario",
    tipo: "cacau",
    baseEnv: "GESTAO_URL_CACAU",
    baseDefault: "https://hub-operacoes-theta.vercel.app",
    // No fragmento (#): não vai para o servidor nem para logs de acesso.
    entrada: (b, t) => `${b}/#sso=${encodeURIComponent(t)}`,
  },
};

const APP_IDS = Object.keys(APPS) as AppId[];

function appsDisponiveis(conta: Conta): Record<AppId, boolean> {
  const out = {} as Record<AppId, boolean>;
  for (const id of APP_IDS) out[id] = !!conta[APPS[id].campo];
  return out;
}

// Ticket do Hub de Operações Cacau Show: base64url(payload).base64url(HMAC-SHA256).
async function ticketCacau(usuario: string): Promise<string | null> {
  const secret = Deno.env.get("GESTAO_SSO_SECRET_CACAU");
  if (!secret) return null;
  const payload = {
    u: usuario,
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

  // Sem '@': tenta como CPF (mesma busca de behavior-test-admin).
  if (!emailToUse.includes("@")) {
    const cleanDigits = emailToUse.replace(/\D/g, "");
    const filters = [`cpf.eq.${quoteFilterValue(emailToUse)}`];
    if (cleanDigits && cleanDigits !== emailToUse) {
      filters.push(`cpf.eq.${quoteFilterValue(cleanDigits)}`);
      filters.push(`cpf_clean.eq.${quoteFilterValue(cleanDigits)}`);
    }
    const lookupRes = await fetch(
      `${clinicaUrl}/rest/v1/profiles?select=email&or=(${filters.join(",")})&limit=1`,
      { headers: { apikey: clinicaAnonKey } },
    ).catch(() => null);
    if (lookupRes && lookupRes.ok) {
      const found = await lookupRes.json().catch(() => []);
      if (Array.isArray(found) && found[0]?.email) emailToUse = found[0].email;
    }
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

async function enviarCodigo(email: string, nome: string, code: string): Promise<boolean> {
  const apiKey = Deno.env.get("BREVO_API_KEY");
  const fromRaw = Deno.env.get("BREVO_FROM") ?? "Instituto Faça Amigos <nao-responder@institutofacaamigos.com.br>";
  if (!apiKey) {
    console.error("BREVO_API_KEY não configurada");
    return false;
  }

  const html = `
<div style="font-family:'Nunito','Segoe UI',Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1a3f35;">
  <div style="text-align:center;padding:10px 0 16px;">
    <img src="${LOGO_URL}" alt="Instituto Faça Amigos" width="32" height="32" style="display:inline-block;vertical-align:middle;margin-right:8px;">
    <span style="font-size:15px;font-weight:800;vertical-align:middle;">Faça<span style="color:#f0196b;">Amigos</span> · Gestão</span>
  </div>
  <div style="background:#fff;border-radius:24px;padding:28px 24px;text-align:center;border:1px solid #edf1ef;">
    <p style="margin:0 0 12px;font-size:15px;">Olá, ${escapeHtml(nome)}!</p>
    <p style="margin:0 0 18px;font-size:14px;color:#4C6B62;">Seu código para entrar no Hub de Gestão:</p>
    <div style="font-size:34px;font-weight:900;letter-spacing:10px;color:#1a3f35;background:#FFF9F1;border-radius:16px;padding:16px 0;">${code}</div>
    <p style="margin:18px 0 0;font-size:12px;color:#8B9A94;">Vale por 10 minutos. Se não foi você, troque a senha do Sistema da Clínica agora.</p>
  </div>
</div>`.trim();

  try {
    const resp = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": apiKey, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        sender: parseSenderAddress(fromRaw),
        to: [{ email, name: nome }],
        subject: `${code} é o seu código do Hub de Gestão`,
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

    const check = await verificarSenhaClinica(loginInput, password);
    if (!check.ok) return falhou(check.status, "senha");

    const conta = await carregarConta(admin, check.email);
    if (!conta) return falhou(401, "fora_da_lista", check.email);

    const { count: codigosRecentes } = await admin
      .from("fa_gestao_desafios")
      .select("id", { count: "exact", head: true })
      .eq("email", conta.email)
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

    if (!(await enviarCodigo(conta.email_codigo, conta.nome, code))) {
      return jsonResponse(req, { error: "não foi possível enviar o código por e-mail" }, 502);
    }

    await auditar(admin, req, "login_senha_ok", { email: conta.email });
    return jsonResponse(req, { challenge_id: challengeId, email_mascarado: maskEmail(conta.email_codigo) });
  }

  // --- passo 2: código → sessão ---
  if (action === "verificar") {
    const challengeId = str(body.challenge_id);
    const code = str(body.code).replace(/\D/g, "");
    if (!/^[0-9a-f-]{36}$/.test(challengeId) || code.length !== 6) {
      return jsonResponse(req, { error: "código inválido" }, 400);
    }

    const { data: desafio } = await admin
      .from("fa_gestao_desafios")
      .select("id, email, code_hash, tentativas, expires_at, usado_em")
      .eq("id", challengeId)
      .maybeSingle();
    if (!desafio || desafio.usado_em || new Date(desafio.expires_at).getTime() < Date.now()) {
      return jsonResponse(req, { error: "código expirado, entre de novo", reiniciar: true }, 401);
    }
    if (desafio.tentativas >= CODE_MAX_TRIES) {
      return jsonResponse(req, { error: "tentativas esgotadas, entre de novo", reiniciar: true }, 401);
    }

    const confere = (await sha256Hex(`${challengeId}:${code}`)) === desafio.code_hash;
    if (!confere) {
      const tentativas = desafio.tentativas + 1;
      await admin.from("fa_gestao_desafios").update({ tentativas }).eq("id", challengeId);
      await auditar(admin, req, "codigo_falhou", { email: desafio.email });
      const restam = CODE_MAX_TRIES - tentativas;
      return jsonResponse(
        req,
        restam > 0
          ? { error: `código incorreto (restam ${restam} tentativa${restam > 1 ? "s" : ""})` }
          : { error: "tentativas esgotadas, entre de novo", reiniciar: true },
        401,
      );
    }

    // Marca como usado só se ninguém usou antes (dois envios simultâneos).
    const { data: marcado } = await admin
      .from("fa_gestao_desafios")
      .update({ usado_em: new Date().toISOString() })
      .eq("id", challengeId)
      .is("usado_em", null)
      .select("id");
    if (!marcado?.length) return jsonResponse(req, { error: "código já usado, entre de novo", reiniciar: true }, 401);

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
    return jsonResponse(req, { token, expires_at: expiresAt, nome: conta.nome, apps: appsDisponiveis(conta) });
  }

  // --- daqui para baixo exige sessão ---
  const sessao = await exigirSessao(admin, req);
  if (!sessao) return jsonResponse(req, { error: "sessão inválida ou expirada" }, 401);
  const { conta } = sessao;

  if (action === "me") {
    return jsonResponse(req, { nome: conta.nome, email: conta.email, apps: appsDisponiveis(conta) });
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

    const identidade = conta[app.campo];
    if (typeof identidade !== "string" || !identidade) {
      return jsonResponse(req, { error: "você ainda não tem acesso configurado a este sistema" }, 403);
    }

    const ticket = app.tipo === "cacau"
      ? await ticketCacau(identidade)
      : await ticketSupabase(app.tipo, identidade);
    if (!ticket) {
      await auditar(admin, req, "launch", { email: conta.email, app: appId, detalhe: "falhou" });
      return jsonResponse(req, { error: "não foi possível abrir o sistema agora" }, 502);
    }

    const base = (Deno.env.get(app.baseEnv) ?? app.baseDefault).replace(/\/+$/, "");
    await auditar(admin, req, "launch", { email: conta.email, app: appId });
    return jsonResponse(req, { url: app.entrada(base, ticket) });
  }

  return jsonResponse(req, { error: "ação inválida" }, 400);
});

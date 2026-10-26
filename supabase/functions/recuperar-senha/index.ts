// "Esqueci minha senha" da Clínica e da Gestão de Pessoas (os dois dividem o projeto B de login).
// Roda no projeto A e fala com o projeto B com a service role, como a função gestao-hub. Tudo numa
// única função, roteada por `action` (import relativo quebra no deploy via MCP; o import é npm:).
//
//   1. `pedir`: { sistema: "clinica" | "rh", identificador }. Clínica aceita CPF ou e-mail; Gestão de
//      Pessoas, e-mail. Se a conta pode recuperar a senha, manda um código de 6 dígitos para o e-mail
//      REAL dela (Brevo). A resposta é sempre a mesma, tenha a conta ou não: não revela quem existe.
//   2. `redefinir`: { challenge_id, code, new_password }. Código certo (10 min, 5 tentativas, uso
//      único) → troca a senha do login. Regra da senha: a mesma da Clínica (6+, maiúscula, especial).
//
// QUEM NÃO RECUPERA (a resposta continua igual; nada é enviado):
//   - conta de unidade (*_unit): é o login compartilhado do tablet, com senha fixa no aparelho; trocar
//     quebraria o quiosque. Só supervisor (pessoa) recupera;
//   - e-mail sintético ou interno (@staff.facaamigos.local, *.internal): a pessoa não tem caixa de entrada,
//     quem gera senha temporária é o administrador no Hub de Gestão;
//   - conta bloqueada (desligada) ou perfil inativo na Clínica: reativar é decisão da gestão;
//   - família (responsavel): entra por telefone e código, não por senha.
//
// Não toca em PIN, biometria nem em dado nenhum além da senha do login (e do aviso de "trocar a
// senha no primeiro acesso" da Clínica, que a pessoa acabou de cumprir). Deploy com verify_jwt = false
// (a pessoa ainda não está logada).

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://sistema.institutofacaamigos.com.br",
  "https://clinica.institutofacaamigos.com.br",
  "https://clinica-facaamigos.vercel.app",
  "https://rh.institutofacaamigos.com.br",
  "https://gestao-pessoas-grupoib.vercel.app",
  "https://porto-terapia-gestao.vercel.app",
  "http://localhost:3000",
  "http://localhost:5173",
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
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...corsHeaders(req) },
  });
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function sha256Hex(s: string): Promise<string> {
  return toHex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
}
// 6 dígitos sem viés de módulo.
function randomCode(): string {
  const limit = Math.floor(0xffffffff / 1_000_000) * 1_000_000;
  const arr = new Uint32Array(1);
  do crypto.getRandomValues(arr); while (arr[0] >= limit);
  return String(arr[0] % 1_000_000).padStart(6, "0");
}

const CODE_TTL_MS = 10 * 60 * 1000;
const CODE_MAX_TRIES = 5;
const WINDOW_MS = 15 * 60 * 1000;
const MAX_PEDIDOS_IP = 5;
const MAX_PEDIDOS_CONTA = 3;

// Regra de senha da Clínica (lib/password.ts da Clínica): a conta é a mesma na Gestão de Pessoas.
const senhaForte = (s: string) => s.length >= 6 && s.length <= 72 && /[A-Z]/.test(s) && /[^A-Za-z0-9]/.test(s);

type Sistema = "clinica" | "rh";
const SISTEMAS: Sistema[] = ["clinica", "rh"];

type UsuarioAuth = {
  id: string;
  email?: string | null;
  app_metadata?: Record<string, unknown> | null;
  user_metadata?: Record<string, unknown> | null;
  banned_until?: string | null;
};

function clienteB(): SupabaseClient | null {
  const url = Deno.env.get("CLINICA_SUPABASE_URL");
  const key = Deno.env.get("CLINICA_SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

// E-mail sem caixa de entrada: o sintético da equipe da Clínica e os internos das contas de unidade.
function emailSemCaixa(email: string): boolean {
  const dominio = email.toLowerCase().split("@")[1] ?? "";
  return dominio === "staff.facaamigos.local" || dominio.endsWith(".internal") || dominio.endsWith(".local");
}

function contaDeUnidade(u: UsuarioAuth): boolean {
  const papel = (u.app_metadata?.role ?? u.user_metadata?.role) as unknown;
  return typeof papel === "string" && papel.endsWith("_unit");
}

// Procura pelo e-mail SEM criar ninguém.
async function acharUsuario(b: SupabaseClient, email: string): Promise<UsuarioAuth | null> {
  const alvo = email.toLowerCase();
  const POR_PAGINA = 200;
  for (let pagina = 1; pagina <= 25; pagina++) {
    const { data, error } = await b.auth.admin.listUsers({ page: pagina, perPage: POR_PAGINA });
    if (error) throw new Error(error.message);
    const achou = data.users.find((u) => (u.email ?? "").toLowerCase() === alvo);
    if (achou) return achou as unknown as UsuarioAuth;
    if (data.users.length < POR_PAGINA) return null;
  }
  return null;
}

// E-mail do login a partir do que a pessoa digitou. CPF só na Clínica (é como a equipe entra lá).
async function resolverEmail(b: SupabaseClient, sistema: Sistema, identificador: string): Promise<string | null> {
  if (identificador.includes("@")) return identificador.toLowerCase();
  if (sistema !== "clinica") return null;
  const cpf = identificador.replace(/\D/g, "");
  if (cpf.length !== 11) return null;
  const { data } = await b.from("profiles").select("email").eq("cpf", cpf).maybeSingle();
  return data?.email ? String(data.email).toLowerCase() : null;
}

// Decide se a conta pode recuperar a senha. Devolve o usuário elegível ou null (motivo só em log).
async function contaElegivel(b: SupabaseClient, sistema: Sistema, email: string): Promise<UsuarioAuth | null> {
  if (emailSemCaixa(email)) return null;
  const user = await acharUsuario(b, email);
  if (!user) return null;
  if (contaDeUnidade(user)) return null;
  if (user.banned_until && Date.parse(user.banned_until) > Date.now()) return null;
  return await perfilPermite(b, sistema, user) ? user : null;
}

async function perfilPermite(b: SupabaseClient, sistema: Sistema, user: UsuarioAuth): Promise<boolean> {
  if (sistema === "clinica") {
    const { data: perfil, error } = await b.from("profiles").select("role, active").eq("id", user.id).maybeSingle();
    if (error || !perfil) return false;
    return perfil.role !== "responsavel" && perfil.active !== false;
  }
  // Gestão de Pessoas: só quem tem papel de pessoa (supervisor, owner...) no claim; sem papel não é conta dela.
  const papel = user.app_metadata?.role;
  return typeof papel === "string" && papel.length > 0;
}

function parseSenderAddress(raw: string): { name?: string; email: string } {
  const match = raw.match(/^(.*)<(.+)>$/);
  if (match) return { name: match[1].trim().replace(/^"|"$/g, "") || undefined, email: match[2].trim() };
  return { email: raw.trim() };
}
const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function enviarCodigo(email: string, nome: string, code: string, sistema: Sistema): Promise<boolean> {
  const apiKey = Deno.env.get("BREVO_API_KEY");
  const fromRaw = Deno.env.get("BREVO_FROM") ?? "Instituto Faça Amigos <nao-responder@institutofacaamigos.com.br>";
  if (!apiKey) {
    console.error("BREVO_API_KEY não configurada");
    return false;
  }
  const onde = sistema === "clinica" ? "do Sistema da Clínica" : "da Gestão de Pessoas";
  const html = `
<div style="font-family:'Nunito','Segoe UI',Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1a3f35;">
  <div style="background:#fff;border-radius:24px;padding:28px 24px;text-align:center;border:1px solid #edf1ef;">
    <p style="margin:0 0 12px;font-size:15px;">Olá${nome ? `, ${escapeHtml(nome)}` : ""}!</p>
    <p style="margin:0 0 18px;font-size:14px;color:#4C6B62;">Seu código para definir uma nova senha ${onde}:</p>
    <div style="font-size:34px;font-weight:900;letter-spacing:10px;color:#1a3f35;background:#FFF9F1;border-radius:16px;padding:16px 0;">${code}</div>
    <p style="margin:18px 0 0;font-size:12px;color:#8B9A94;">Vale por 10 minutos. Se não foi você, ignore este e-mail: a senha só muda com este código.</p>
  </div>
</div>`.trim();
  try {
    const resp = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": apiKey, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        sender: parseSenderAddress(fromRaw),
        to: [{ email, name: nome || email }],
        subject: `${code} é o código para definir sua senha`,
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

function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

async function auditar(admin: SupabaseClient, req: Request, evento: string, extra: { email?: string | null; app?: string | null; detalhe?: string | null } = {}) {
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

const MENSAGEM = "Se os dados conferem, enviamos um código para o e-mail cadastrado. Sem e-mail cadastrado? Fale com a gestão.";

type Desafio = {
  id: string;
  sistema: Sistema;
  user_id: string | null;
  email: string | null;
  code_hash: string;
  tentativas: number;
  expires_at: string;
  usado_em: string | null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders(req) });
  if (req.method !== "POST") return jsonResponse(req, { error: "method_not_allowed" }, 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(req, { error: "corpo inválido" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const b = clienteB();
  if (!supabaseUrl || !serviceRoleKey || !b) {
    console.error("configuração ausente (SUPABASE_* ou CLINICA_SUPABASE_*)");
    return jsonResponse(req, { error: "serviço indisponível" }, 500);
  }
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const action = str(body.action);

  // --- 1/2: pede o código ---
  if (action === "pedir") {
    const sistema = str(body.sistema) as Sistema;
    const identificador = str(body.identificador).slice(0, 200);
    if (!SISTEMAS.includes(sistema)) return jsonResponse(req, { error: "sistema inválido" }, 400);
    if (!identificador) return jsonResponse(req, { error: "informe o CPF ou e-mail" }, 400);

    const ip = clientIp(req);
    const desde = new Date(Date.now() - WINDOW_MS).toISOString();
    const { data: doIp } = await admin.from("fa_recuperacao_senha").select("id").eq("ip", ip).gte("created_at", desde);
    if ((doIp?.length ?? 0) >= MAX_PEDIDOS_IP) {
      return jsonResponse(req, { error: "muitos pedidos, aguarde 15 minutos" }, 429);
    }

    const generica = (id: string) => jsonResponse(req, { challenge_id: id, mensagem: MENSAGEM });
    const idDesafio = crypto.randomUUID();
    const agora = new Date().toISOString();
    const expires_at = new Date(Date.now() + CODE_TTL_MS).toISOString();

    // Pedido que não pode virar código: fica registrado (já usado) só para o limite por IP valer.
    const ignorar = async (motivo: string, email: string | null) => {
      await admin.from("fa_recuperacao_senha").insert({ id: idDesafio, sistema, email, code_hash: "ignorado", ip, tentativas: 0, expires_at, created_at: agora, usado_em: agora });
      await auditar(admin, req, "recuperacao_ignorada", { email, app: sistema, detalhe: motivo });
      return generica(idDesafio);
    };

    let email: string | null;
    let user: UsuarioAuth | null = null;
    try {
      email = await resolverEmail(b, sistema, identificador);
      if (email) user = await contaElegivel(b, sistema, email);
    } catch (e) {
      console.error("recuperar-senha (pedir):", e instanceof Error ? e.message : e);
      return jsonResponse(req, { error: "serviço indisponível, tente de novo" }, 502);
    }
    if (!email || !user) return await ignorar("sem conta elegível", email);

    const { data: daConta } = await admin.from("fa_recuperacao_senha").select("id").eq("user_id", user.id).gte("created_at", desde);
    if ((daConta?.length ?? 0) >= MAX_PEDIDOS_CONTA) return await ignorar("limite por conta", email);

    const code = randomCode();
    const { error: insErr } = await admin.from("fa_recuperacao_senha").insert({
      id: idDesafio, sistema, user_id: user.id, email, code_hash: await sha256Hex(`${idDesafio}:${code}`), ip, tentativas: 0, expires_at, created_at: agora,
    });
    if (insErr) {
      console.error("desafio:", insErr.message);
      return jsonResponse(req, { error: "falha ao gerar código" }, 500);
    }
    const nome = String(user.user_metadata?.name ?? user.user_metadata?.full_name ?? "");
    if (!(await enviarCodigo(email, nome, code, sistema))) {
      return jsonResponse(req, { error: "não foi possível enviar o código por e-mail" }, 502);
    }
    await auditar(admin, req, "recuperacao_codigo_enviado", { email, app: sistema });
    return generica(idDesafio);
  }

  // --- 2/2: código certo + senha nova ---
  if (action === "redefinir") {
    const challengeId = str(body.challenge_id);
    const code = str(body.code).replace(/\D/g, "");
    const novaSenha = typeof body.new_password === "string" ? body.new_password : "";
    if (!/^[0-9a-f-]{36}$/.test(challengeId) || code.length !== 6) {
      return jsonResponse(req, { error: "código inválido" }, 400);
    }
    // A senha é conferida antes de gastar o código: erro de digitação não obriga a pedir outro.
    if (!senhaForte(novaSenha)) {
      return jsonResponse(req, { error: "A senha precisa ter pelo menos 6 caracteres, uma letra maiúscula e um caractere especial." }, 400);
    }

    const { data } = await admin.from("fa_recuperacao_senha")
      .select("id, sistema, user_id, email, code_hash, tentativas, expires_at, usado_em")
      .eq("id", challengeId).maybeSingle();
    const d = data as Desafio | null;
    const reiniciar = (error: string) => jsonResponse(req, { error, reiniciar: true }, 401);
    if (!d || !d.user_id || d.usado_em || Date.parse(d.expires_at) < Date.now()) return reiniciar("código expirado, comece de novo");
    if (d.tentativas >= CODE_MAX_TRIES) return reiniciar("tentativas esgotadas, comece de novo");

    if ((await sha256Hex(`${challengeId}:${code}`)) !== d.code_hash) {
      const tentativas = d.tentativas + 1;
      await admin.from("fa_recuperacao_senha").update({ tentativas }).eq("id", challengeId);
      await auditar(admin, req, "recuperacao_codigo_falhou", { email: d.email, app: d.sistema });
      const restam = CODE_MAX_TRIES - tentativas;
      return restam > 0
        ? jsonResponse(req, { error: `código incorreto (restam ${restam} tentativa${restam > 1 ? "s" : ""})` }, 401)
        : reiniciar("tentativas esgotadas, comece de novo");
    }
    // Marca como usado só se ninguém usou antes (dois envios simultâneos).
    const { data: marcado } = await admin.from("fa_recuperacao_senha")
      .update({ usado_em: new Date().toISOString() }).eq("id", challengeId).is("usado_em", null).select("id");
    if (!marcado?.length) return reiniciar("código já usado, comece de novo");

    // A conta pode ter sido bloqueada ou virado conta de unidade entre o pedido e agora.
    let user: UsuarioAuth | null;
    try {
      user = d.email ? await contaElegivel(b, d.sistema, d.email) : null;
    } catch (e) {
      console.error("recuperar-senha (redefinir):", e instanceof Error ? e.message : e);
      return jsonResponse(req, { error: "não foi possível trocar a senha agora" }, 502);
    }
    if (!user || user.id !== d.user_id) return reiniciar("esta conta não pode recuperar a senha por aqui");

    const { error: updErr } = await b.auth.admin.updateUserById(user.id, { password: novaSenha });
    if (updErr) {
      console.error("updateUserById:", updErr.message);
      await auditar(admin, req, "recuperacao_falhou", { email: d.email, app: d.sistema, detalhe: updErr.message.slice(0, 120) });
      return jsonResponse(req, { error: "O sistema recusou essa senha. Tente uma mais longa e diferente.", reiniciar: true }, 400);
    }
    // A pessoa acabou de escolher a própria senha: cumpre o "trocar a senha no primeiro acesso" da Clínica.
    const { error: flagErr } = await b.from("profiles").update({ must_change_password: false }).eq("id", user.id);
    if (flagErr) console.error("must_change_password:", flagErr.message);
    await auditar(admin, req, "recuperacao_senha_redefinida", { email: d.email, app: d.sistema });
    return jsonResponse(req, { ok: true });
  }

  return jsonResponse(req, { error: "ação inválida" }, 400);
});

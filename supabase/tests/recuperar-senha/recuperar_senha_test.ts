// Testes da função recuperar-senha com Supabase e Brevo simulados (nada sai da máquina).
// Rodar: deno test --no-check --config supabase/tests/recuperar-senha/deno.json --allow-env supabase/tests/recuperar-senha
import assert from "node:assert/strict";
import { projeto } from "../gestao-hub/fake_supabase.ts";

Deno.env.set("SUPABASE_URL", "http://a");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "ka");
Deno.env.set("CLINICA_SUPABASE_URL", "http://b");
Deno.env.set("CLINICA_SUPABASE_SERVICE_ROLE_KEY", "kb");
Deno.env.set("BREVO_API_KEY", "brevo-teste");

// E-mails "enviados": o código vai no assunto, como na função real.
const enviados: Array<{ para: string; codigo: string }> = [];
const fetchOriginal = globalThis.fetch;
globalThis.fetch = (async (input: Request | URL | string, init?: RequestInit) => {
  const url = String(input instanceof Request ? input.url : input);
  if (url === "https://api.brevo.com/v3/smtp/email") {
    const corpo = JSON.parse(String(init?.body));
    enviados.push({ para: corpo.to[0].email, codigo: /^(\d{6})/.exec(corpo.subject)![1] });
    return new Response("{}", { status: 201 });
  }
  return fetchOriginal(input as string, init);
}) as typeof fetch;

let handler!: (req: Request) => Promise<Response>;
(Deno as unknown as { serve: unknown }).serve = (h: (req: Request) => Promise<Response>) => {
  handler = h;
  return { finished: Promise.resolve() };
};
await import("../../functions/recuperar-senha/index.ts");

const A = projeto("http://a");
const B = projeto("http://b");
const CLINICA = "c0000000-0000-0000-0000-000000000001";

function novoUsuario(email: string, app_metadata: Record<string, unknown> = {}, extra: Record<string, unknown> = {}) {
  const u = { id: crypto.randomUUID(), email, app_metadata, user_metadata: { name: email.split("@")[0] }, created_at: "2026-01-01T00:00:00Z", last_sign_in_at: null, banned_until: null as string | null, password: "SenhaAntiga@1", ...extra };
  B.usuarios.push(u);
  return u;
}
function perfil(u: { id: string; email: string }, over: Record<string, unknown> = {}) {
  const p = { id: u.id, clinic_id: CLINICA, email: u.email, role: "terapeuta", active: true, must_change_password: true, cpf: null as string | null, ...over };
  B.tabela("profiles").push(p);
  return p;
}

let ipN = 0;
async function chamar(body: Record<string, unknown>, ip?: string) {
  ipN++;
  const r = await handler(new Request("http://x/", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip ?? `10.0.0.${ipN}` },
    body: JSON.stringify(body),
  }));
  return { status: r.status, corpo: await r.json() };
}
const pedir = (sistema: string, identificador: string, ip?: string) => chamar({ action: "pedir", sistema, identificador }, ip);
const ultimoCodigo = () => enviados[enviados.length - 1];

const ana = novoUsuario("ana@clinica.com");
const pAna = perfil(ana, { cpf: "52998224725" });
const cpfDaAna = "529.982.247-25";

Deno.test("Clínica por e-mail: manda o código, troca a senha e cumpre o aviso de trocar senha", async () => {
  enviados.length = 0;
  const r = await pedir("clinica", "Ana@Clinica.com");
  assert.equal(r.status, 200);
  assert.equal(enviados.length, 1);
  assert.equal(enviados[0].para, "ana@clinica.com");

  const ok = await chamar({ action: "redefinir", challenge_id: r.corpo.challenge_id, code: ultimoCodigo().codigo, new_password: "NovaSenha@2" });
  assert.equal(ok.status, 200, JSON.stringify(ok.corpo));
  assert.equal(ana.password, "NovaSenha@2");
  assert.equal(pAna.must_change_password, false);

  // Uso único.
  const de_novo = await chamar({ action: "redefinir", challenge_id: r.corpo.challenge_id, code: enviados[0].codigo, new_password: "Outra@Senha1" });
  assert.equal(de_novo.status, 401);
  assert.equal(ana.password, "NovaSenha@2");
});

Deno.test("Clínica por CPF chega ao e-mail real do perfil", async () => {
  enviados.length = 0;
  const r = await pedir("clinica", cpfDaAna);
  assert.equal(r.status, 200);
  assert.equal(enviados.length, 1);
  assert.equal(enviados[0].para, "ana@clinica.com");
});

Deno.test("a resposta é igual para quem não existe e nada é enviado", async () => {
  enviados.length = 0;
  const existe = await pedir("clinica", "ana@clinica.com");
  const naoExiste = await pedir("clinica", "ninguem@clinica.com");
  const cpfErrado = await pedir("clinica", "111.111.111-11");
  assert.equal(naoExiste.status, 200);
  assert.deepEqual(Object.keys(naoExiste.corpo).sort(), Object.keys(existe.corpo).sort());
  assert.equal(naoExiste.corpo.mensagem, existe.corpo.mensagem);
  assert.equal(cpfErrado.status, 200);
  assert.equal(enviados.length, 1, "só a conta real recebeu código");
  // Código de um pedido ignorado não troca nada.
  const r = await chamar({ action: "redefinir", challenge_id: naoExiste.corpo.challenge_id, code: "123456", new_password: "Abc@123" });
  assert.equal(r.status, 401);
});

Deno.test("não recupera: conta de unidade, e-mail sintético, bloqueada, inativa e família", async () => {
  const unidade = novoUsuario("quiosque@grupoib.internal", { role: "intern_unit" });
  const unidadeComEmailReal = novoUsuario("quiosque2@gmail.com", { role: "professional_unit" });
  const sintetico = novoUsuario("equipe_52998224725@staff.facaamigos.local");
  perfil(sintetico);
  const bloqueada = novoUsuario("bloq@clinica.com", {}, { banned_until: new Date(Date.now() + 1e12).toISOString() });
  perfil(bloqueada);
  const inativa = novoUsuario("inativa@clinica.com");
  perfil(inativa, { active: false });
  const familia = novoUsuario("familia@clinica.com");
  perfil(familia, { role: "responsavel" });
  const senhas = new Map([unidade, unidadeComEmailReal, sintetico, bloqueada, inativa, familia].map((u) => [u.email, u.password]));

  enviados.length = 0;
  for (const u of [unidade, unidadeComEmailReal, sintetico, bloqueada, inativa, familia]) {
    const r = await pedir("clinica", u.email);
    assert.equal(r.status, 200, u.email);
  }
  assert.equal(enviados.length, 0, "ninguém dessa lista recebe código");
  for (const u of [unidade, unidadeComEmailReal, sintetico, bloqueada, inativa, familia]) assert.equal(u.password, senhas.get(u.email), u.email);
});

Deno.test("Gestão de Pessoas: supervisor recupera; conta de unidade nunca (a senha fixa do quiosque não pode mudar)", async () => {
  const sup = novoUsuario("sup@rh.com", { role: "supervisor", workspace_scope: ["grupoib"] });
  const unidade = novoUsuario("kiosk@rh.com", { role: "intern_unit" });
  enviados.length = 0;
  const r = await pedir("rh", "sup@rh.com");
  assert.equal(enviados.length, 1);
  const ok = await chamar({ action: "redefinir", challenge_id: r.corpo.challenge_id, code: ultimoCodigo().codigo, new_password: "Supervisor@9" });
  assert.equal(ok.status, 200, JSON.stringify(ok.corpo));
  assert.equal(sup.password, "Supervisor@9");

  await pedir("rh", "kiosk@rh.com");
  assert.equal(enviados.length, 1, "unidade não recebe");
  assert.equal(unidade.password, "SenhaAntiga@1");
  // CPF não vale na Gestão de Pessoas; e-mail sem papel também não.
  await pedir("rh", cpfDaAna);
  await pedir("rh", "ana@clinica.com");
  assert.equal(enviados.length, 1);
});

Deno.test("senha fraca é recusada sem gastar o código; código errado esgota e reinicia", async () => {
  const u = novoUsuario("bia@clinica.com");
  perfil(u);
  enviados.length = 0;
  const r = await pedir("clinica", "bia@clinica.com");
  const codigo = ultimoCodigo().codigo;

  const fraca = await chamar({ action: "redefinir", challenge_id: r.corpo.challenge_id, code: codigo, new_password: "fraca" });
  assert.equal(fraca.status, 400);
  const ok = await chamar({ action: "redefinir", challenge_id: r.corpo.challenge_id, code: codigo, new_password: "Forte@123" });
  assert.equal(ok.status, 200, "o código continua valendo depois da senha fraca");

  const u2 = novoUsuario("cris@clinica.com");
  perfil(u2);
  const r2 = await pedir("clinica", "cris@clinica.com");
  const certo = ultimoCodigo().codigo;
  const errado = certo === "000000" ? "111111" : "000000";
  let ultimo = { status: 0, corpo: {} as any };
  for (let i = 0; i < 5; i++) ultimo = await chamar({ action: "redefinir", challenge_id: r2.corpo.challenge_id, code: errado, new_password: "Forte@123" });
  assert.equal(ultimo.corpo.reiniciar, true);
  const depois = await chamar({ action: "redefinir", challenge_id: r2.corpo.challenge_id, code: certo, new_password: "Forte@123" });
  assert.equal(depois.status, 401, "mesmo o código certo não vale depois de esgotar");
  assert.equal(u2.password, "SenhaAntiga@1");
});

Deno.test("código expirado não troca a senha", async () => {
  const u = novoUsuario("dani@clinica.com");
  perfil(u);
  const r = await pedir("clinica", "dani@clinica.com");
  const codigo = ultimoCodigo().codigo;
  const linha = A.tabela("fa_recuperacao_senha").find((l) => l.id === r.corpo.challenge_id)!;
  linha.expires_at = new Date(Date.now() - 1000).toISOString();
  const x = await chamar({ action: "redefinir", challenge_id: r.corpo.challenge_id, code: codigo, new_password: "Forte@123" });
  assert.equal(x.status, 401);
  assert.equal(u.password, "SenhaAntiga@1");
});

Deno.test("conta bloqueada entre o pedido e a troca não troca a senha", async () => {
  const u = novoUsuario("edu@clinica.com");
  perfil(u);
  const r = await pedir("clinica", "edu@clinica.com");
  const codigo = ultimoCodigo().codigo;
  u.banned_until = new Date(Date.now() + 1e12).toISOString();
  const x = await chamar({ action: "redefinir", challenge_id: r.corpo.challenge_id, code: codigo, new_password: "Forte@123" });
  assert.equal(x.status, 401);
  assert.equal(u.password, "SenhaAntiga@1");
});

Deno.test("limites: por IP e por conta", async () => {
  const u = novoUsuario("fer@clinica.com");
  perfil(u);
  enviados.length = 0;
  for (let i = 0; i < 5; i++) await pedir("clinica", "fer@clinica.com", `9.9.9.${i}`);
  assert.equal(enviados.length, 3, "no máximo 3 códigos por conta a cada 15 min");

  let status = 200;
  for (let i = 0; i < 7; i++) status = (await pedir("clinica", `nao${i}@x.com`, "7.7.7.7")).status;
  assert.equal(status, 429, "chutar identificadores do mesmo IP bate no limite");
});

Deno.test("nunca toca em PIN nem em dado além da senha e do aviso de trocar senha", async () => {
  const u = novoUsuario("gil@clinica.com");
  const p = perfil(u, { signature_pin_hash: "hash-do-pin", role: "supervisor" });
  const r = await pedir("clinica", "gil@clinica.com");
  const ok = await chamar({ action: "redefinir", challenge_id: r.corpo.challenge_id, code: ultimoCodigo().codigo, new_password: "Forte@123" });
  assert.equal(ok.status, 200);
  assert.equal(p.signature_pin_hash, "hash-do-pin");
  assert.equal(p.role, "supervisor");
  assert.ok(!B.chamadas.includes("delete:profiles"));
});

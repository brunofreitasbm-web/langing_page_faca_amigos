// Webhook oficial da Hotmart (versão 2.0.0). Complementa o hotmart-sync (polling), que fica como conferência.
//
// Cadastro na Hotmart: Ferramentas > Webhook > Cadastrar, URL desta função, versão 2.0.0, eventos:
//   PURCHASE_APPROVED, PURCHASE_COMPLETE, PURCHASE_REFUNDED, PURCHASE_CHARGEBACK, PURCHASE_CANCELED,
//   PURCHASE_OUT_OF_SHOPPING_CART. O "hottok" que a Hotmart mostra vai no secret HOTMART_HOTTOK.
// Confirmar nomes de evento e campos com o payload de teste do próprio painel da Hotmart antes de ligar.
//
// O que faz
//  - Valida o hottok (cabeçalho X-HOTMART-HOTTOK ou campo hottok do corpo), em tempo constante.
//  - Grava o evento cru em fa_hotmart_eventos (event_id único: entrega repetida da Hotmart não duplica).
//  - Compra aprovada: upsert em fa_ebook_compras, interrompe a sequência de e-mails de venda do lead e envia
//    UM e-mail de boas-vindas (welcome_sent_at garante que não repete), apresentando o outro e-book.
//  - Reembolso / chargeback / cancelamento: marca a compra (sem reativar a sequência de venda).
//  - Carrinho abandonado: guarda em fa_ebook_carrinhos. O envio de recuperação NÃO está ligado (decisão pendente:
//    base legal e texto).
//  - Responde 200 quando o evento foi aceito, para a Hotmart não reenviar; erros de processamento ficam
//    em fa_hotmart_eventos.error e o hotmart-sync reconcilia as compras.
//
// Secrets: HOTMART_HOTTOK; HOTMART_PRODUCT_ID (guia, 8560642); HOTMART_CODIGO_PRODUCT_ID (id numérico do
// "Código", opcional); BREVO_API_KEY, BREVO_FROM, BREVO_REPLY_TO (já existentes).
//
// Compra server-side no GA4 e na Meta (opcional; sem os secrets, esse pedaço é pulado em silêncio)
//  - Antes disso, a venda ficava só no relatório da Hotmart: o GA4 sabia quem clicou em begin_checkout e nunca
//    quem comprou, então dava para medir CTR de checkout mas não ROAS nem custo por venda de verdade.
//  - GA4 (Measurement Protocol): manda o evento "purchase" usando o client_id que veio disfarçado no campo
//    xcod (a Hotmart devolve esse campo do jeito que ele foi mandado; ver assets/fa-track.js e o CONFIG.checkout
//    de guia.html/codigo.html). Sem client_id (venda antiga, ou xcod raspado por outra ferramenta no caminho),
//    a venda não é mandada pro GA4 — melhor não mandar do que mandar como sessão desconhecida, que só polui
//    o relatório sem ligar receita à campanha.
//    Secret: GA4_API_SECRET (Admin > Fluxos de dados > Measurement Protocol > Criar, na propriedade do GA4).
//  - Meta (Conversions API): manda o evento "Purchase" usando o e-mail do comprador, com hash SHA-256 (padrão
//    de correspondência avançada da Meta) — não depende de cookie nem de fbclid, funciona mesmo sem eles.
//    Secrets: META_PIXEL_ID e META_CAPI_TOKEN (Gerenciador de Eventos > Configurações > Conversions API > Gerar token).

import { createClient } from "jsr:@supabase/supabase-js@2";

const SITE = "https://institutofacaamigos.com.br";
const BUY_EVENTS = ["PURCHASE_APPROVED", "PURCHASE_COMPLETE"];
const LOSS_EVENTS: Record<string, string> = {
  PURCHASE_REFUNDED: "REFUNDED",
  PURCHASE_CHARGEBACK: "CHARGEBACK",
  PURCHASE_CANCELED: "CANCELED",
};

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
function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

// deno-lint-ignore no-explicit-any
type Any = any;

interface Product {
  title: string;
  path: string; // página de vendas do produto, sem domínio (usada como event_source_url na Meta CAPI)
  otherTitle: string;
  otherUrl: string;
  otherBlurb: string;
}

function classify(productId: number | null): Product {
  const guia = Number(Deno.env.get("HOTMART_PRODUCT_ID") ?? "");
  const codigo = Number(Deno.env.get("HOTMART_CODIGO_PRODUCT_ID") ?? "");
  if (productId && guia && productId === guia) {
    return {
      title: "O Brincar com Propósito",
      path: "/guia",
      otherTitle: "O Código do Desenvolvimento Infantil",
      otherUrl: `${SITE}/codigo?utm_source=email&utm_medium=posvenda&utm_campaign=guia_comprador`,
      otherBlurb: "Um e-book curto (40 páginas) para entender que o comportamento do seu filho tem lógica. Combina bem com o guia.",
    };
  }
  if (productId && codigo && productId === codigo) {
    return {
      title: "O Código do Desenvolvimento Infantil",
      path: "/codigo",
      otherTitle: "O Brincar com Propósito",
      otherUrl: `${SITE}/guia?utm_source=email&utm_medium=posvenda&utm_campaign=codigo_comprador`,
      otherBlurb: "O guia completo (97 páginas) com o passo a passo do dia a dia: rotinas, birras e brincadeiras.",
    };
  }
  return { title: "seu e-book", path: "/", otherTitle: "", otherUrl: "", otherBlurb: "" };
}

// ---------------------------------------------------------------------
// Compra server-side (ver o bloco no topo do arquivo)
// ---------------------------------------------------------------------

// client_id do GA4 disfarçado no xcod do checkout (formato "ga.<client_id>"; ver assets/fa-track.js).
function ga4ClientIdFromXcod(xcod: unknown): string {
  const s = String(xcod ?? "");
  const m = /^ga\.(\d+\.\d+)$/.exec(s);
  return m ? m[1] : "";
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(bytes)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// GA4 Measurement Protocol: só manda se houver client_id (ver comentário no topo do arquivo — sem ele a
// venda ficaria como sessão desconhecida, o que atrapalha mais do que ajuda).
async function sendGA4Purchase(clientId: string, tx: string, value: number | null, item: Product): Promise<void> {
  const secret = Deno.env.get("GA4_API_SECRET");
  if (!secret || !clientId) return;
  const measurementId = Deno.env.get("GA4_MEASUREMENT_ID") || "G-Q7LHH3C9P8"; // mesmo ID do assets/fa-track.js
  try {
    await fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${secret}`, {
      method: "POST",
      body: JSON.stringify({
        client_id: clientId,
        events: [{
          name: "purchase",
          params: {
            transaction_id: tx,
            currency: "BRL",
            value: value ?? 0,
            items: [{ item_id: item.path.replace("/", ""), item_name: item.title, price: value ?? 0 }],
          },
        }],
      }),
    });
  } catch (err) {
    console.error("hotmart-webhook: falha ao enviar purchase ao GA4", err instanceof Error ? err.message : err);
  }
}

// Meta Conversions API: correspondência por e-mail com hash (funciona sem fbclid/fbp/cookie).
async function sendMetaPurchase(email: string, tx: string, value: number | null, item: Product): Promise<void> {
  const pixelId = Deno.env.get("META_PIXEL_ID");
  const token = Deno.env.get("META_CAPI_TOKEN");
  if (!pixelId || !token) return;
  try {
    const emHash = await sha256Hex(email.trim().toLowerCase());
    await fetch(`https://graph.facebook.com/v21.0/${pixelId}/events?access_token=${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: [{
          event_name: "Purchase",
          event_time: Math.floor(Date.now() / 1000),
          event_id: tx, // não repete: não existe Purchase disparado pelo pixel no navegador para deduplicar
          action_source: "website",
          event_source_url: `${SITE}${item.path}`,
          user_data: { em: [emHash] },
          custom_data: { currency: "BRL", value: value ?? 0, content_name: item.title },
        }],
      }),
    });
  } catch (err) {
    console.error("hotmart-webhook: falha ao enviar Purchase à Meta", err instanceof Error ? err.message : err);
  }
}

async function sendWelcome(email: string, name: string, p: Product): Promise<{ sent: boolean; error?: string }> {
  const apiKey = Deno.env.get("BREVO_API_KEY");
  if (!apiKey) return { sent: false, error: "BREVO_API_KEY não configurada" };
  const fromRaw = Deno.env.get("BREVO_FROM") ?? "Instituto Faça Amigos <instituto@institutofacaamigos.com.br>";
  const m = fromRaw.match(/^(.*)<(.+)>$/);
  const sender = m ? { name: m[1].trim().replace(/^"|"$/g, ""), email: m[2].trim() } : { email: fromRaw.trim() };
  const replyTo = Deno.env.get("BREVO_REPLY_TO");
  const first = esc((name || "").trim().split(/\s+/)[0] || "");
  const other = p.otherTitle
    ? `<p style="margin:24px 0 6px;font-weight:bold;">Para continuar</p>
       <p style="margin:0 0 8px;"><b>${esc(p.otherTitle)}</b><br>${esc(p.otherBlurb)}</p>
       <p style="margin:0 0 8px;"><a href="${p.otherUrl}" style="color:#065264;">Conhecer ${esc(p.otherTitle)}</a></p>`
    : "";
  const html = `<div style="font-family:Arial,sans-serif;font-size:16px;line-height:1.6;color:#065264;max-width:560px;margin:0 auto;padding:24px;">
    <p>${first ? `Oi, ${first}!` : "Oi!"}</p>
    <p>Obrigada por escolher <b>${esc(p.title)}</b>. O acesso ao e-book chega no e-mail da própria Hotmart (confira também a caixa de spam) e fica disponível na sua área de membros.</p>
    <p>Se algo não chegar ou você tiver qualquer dúvida, é só responder este e-mail.</p>
    ${other}
    <p style="margin-top:28px;">Com carinho,<br>Isabella, FaçaAmigos</p>
    <p style="font-size:12px;opacity:.75;margin-top:28px;">Instituto Faça Amigos Ltda · CNPJ 22.161.197/0001-83 · Rua Boaventura da Silva, 1573, Umarizal, Belém/PA. Este é um e-mail sobre a sua compra.</p>
  </div>`;
  try {
    const resp = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": apiKey, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        sender,
        to: [{ email, name: name || undefined }],
        ...(replyTo ? { replyTo: { email: replyTo } } : {}),
        subject: `Sua compra: ${p.title}`,
        htmlContent: html,
        tags: ["ebook_posvenda"],
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

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "método não permitido" }, 405);

  let body: Any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "corpo inválido" }, 400);
  }

  const expected = Deno.env.get("HOTMART_HOTTOK") ?? "";
  const given = req.headers.get("x-hotmart-hottok") ?? String(body?.hottok ?? "");
  if (!expected || !safeEqual(given, expected)) return json({ error: "não autorizado" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "serviço indisponível" }, 500);
  const admin = createClient(supabaseUrl, serviceRoleKey);

  const event = String(body?.event ?? "");
  const data = body?.data ?? {};
  const tx = String(data?.purchase?.transaction ?? "") || null;
  const eventId = String(body?.id ?? "") || `${event}:${tx ?? crypto.randomUUID()}`;

  // Guarda o evento cru; se já existe, é reentrega: aceita sem processar de novo.
  const { error: logError } = await admin.from("fa_hotmart_eventos").insert({ event_id: eventId, event, transaction: tx, payload: body });
  if (logError) {
    if (logError.code === "23505") return json({ ok: true, duplicate: true });
    console.error("hotmart-webhook: erro ao gravar evento", logError);
    return json({ error: "falha ao gravar" }, 500);
  }

  let processError: string | null = null;
  try {
    const email = String(data?.buyer?.email ?? "").trim().toLowerCase();
    const productIdRaw = Number(data?.product?.id);
    const productId = Number.isFinite(productIdRaw) && productIdRaw > 0 ? productIdRaw : null;

    if (BUY_EVENTS.includes(event) && tx && email) {
      const approvedMs = Number(data?.purchase?.approved_date);
      const valor = Number(data?.purchase?.price?.value);
      const { data: existing } = await admin.from("fa_ebook_compras").select("welcome_sent_at").eq("transaction", tx).maybeSingle();

      const { error } = await admin.from("fa_ebook_compras").upsert({
        transaction: tx,
        email,
        buyer_name: data?.buyer?.name ?? null,
        product_id: productId,
        status: String(data?.purchase?.status ?? "APPROVED"),
        approved_at: Number.isFinite(approvedMs) && approvedMs > 0 ? new Date(approvedMs).toISOString() : new Date().toISOString(),
        valor: Number.isFinite(valor) ? valor : null,
        origem_src: data?.purchase?.origin?.src ?? null,
        origem_sck: data?.purchase?.origin?.sck ?? null,
        synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "transaction" });
      if (error) throw new Error(`compra: ${error.message}`);

      await admin
        .from("fa_leads_teste_comportamento")
        .update({ ebook_seq_stopped_at: new Date().toISOString(), ebook_seq_stop_reason: "purchased" })
        .ilike("guardian_email", email)
        .is("ebook_seq_stopped_at", null);

      // Quem já tinha carrinho aberto deixa de ser "abandono".
      await admin.from("fa_ebook_carrinhos").update({ recuperado_at: new Date().toISOString() }).ilike("email", email).is("recuperado_at", null);

      // Compra pro GA4/Meta: só na primeira vez que esta transação aparece (existing === null), para não
      // contar a mesma venda duas vezes quando PURCHASE_APPROVED e PURCHASE_COMPLETE chegam para o mesmo tx.
      if (!existing) {
        const product = classify(productId);
        const clientId = ga4ClientIdFromXcod(data?.purchase?.origin?.xcod);
        const valorNum = Number.isFinite(valor) ? valor : null;
        await Promise.all([
          sendGA4Purchase(clientId, tx, valorNum, product),
          sendMetaPurchase(email, tx, valorNum, product),
        ]);
      }

      if (!existing?.welcome_sent_at) {
        const mail = await sendWelcome(email, String(data?.buyer?.name ?? ""), classify(productId));
        if (mail.sent) {
          await admin.from("fa_ebook_compras").update({ welcome_sent_at: new Date().toISOString() }).eq("transaction", tx);
        } else {
          processError = `boas-vindas: ${mail.error}`;
        }
      }
    } else if (LOSS_EVENTS[event] && tx) {
      await admin.from("fa_ebook_compras").update({ status: LOSS_EVENTS[event], updated_at: new Date().toISOString() }).eq("transaction", tx);
    } else if (event === "PURCHASE_OUT_OF_SHOPPING_CART") {
      const cartEmail = String(data?.buyer?.email ?? data?.email ?? "").trim().toLowerCase();
      if (cartEmail) {
        await admin.from("fa_ebook_carrinhos").insert({
          email: cartEmail,
          nome: data?.buyer?.name ?? data?.name ?? null,
          telefone: data?.buyer?.phone ?? data?.phone ?? null,
          product_id: productId,
        });
      }
    }
  } catch (err) {
    processError = err instanceof Error ? err.message : "erro";
    console.error("hotmart-webhook:", processError);
  }

  await admin
    .from("fa_hotmart_eventos")
    .update({ processed_at: new Date().toISOString(), error: processError })
    .eq("event_id", eventId);

  return json({ ok: true });
});

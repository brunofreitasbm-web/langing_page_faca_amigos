// Sincroniza as vendas do guia na Hotmart e tira os compradores da sequência de e-mails de venda.
//
// Como funciona:
//  - pg_cron chama POST ?run=1 a cada 15 minutos (cabeçalho x-sync-key = secret HOTMART_SYNC_KEY).
//  - A função pega um token OAuth na Hotmart (client_credentials), lista as vendas APPROVED/COMPLETE dos
//    últimos dias (?days=N para reprocessar mais tempo) e grava cada transação em fa_ebook_compras.
//  - Para cada comprador, interrompe a sequência (guia-sequence) dos leads com o mesmo e-mail
//    (ebook_seq_stop_reason = 'purchased').
//  - ?list_products=1 lista os produtos da conta (para descobrir o HOTMART_PRODUCT_ID). Também exige a chave.
//
// Secrets: HOTMART_BASIC_TOKEN (base64 de client_id:client_secret, o "Basic" que a Hotmart mostra em
//   Ferramentas > Credenciais de API), HOTMART_SYNC_KEY (senha do cron), HOTMART_PRODUCT_ID (opcional;
//   se definido, só conta vendas desse produto).

import { createClient } from "jsr:@supabase/supabase-js@2";

const TOKEN_URL = "https://api-sec-vlc.hotmart.com/security/oauth/token?grant_type=client_credentials";
const API = "https://developers.hotmart.com";
const BUY_STATUSES = ["APPROVED", "COMPLETE"];
const DEFAULT_DAYS = 7;
const MAX_DAYS = 90;
const MAX_PAGES = 20;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function getToken(): Promise<string> {
  const basic = (Deno.env.get("HOTMART_BASIC_TOKEN") ?? "").trim().replace(/^Basic\s+/i, "");
  if (!basic) throw new Error("HOTMART_BASIC_TOKEN não configurado");
  const resp = await fetch(TOKEN_URL, { method: "POST", headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/json" } });
  if (!resp.ok) throw new Error(`Hotmart recusou as credenciais (${resp.status})`);
  const data = await resp.json();
  if (!data.access_token) throw new Error("Hotmart não devolveu access_token");
  return data.access_token as string;
}

async function hotmartGet(token: string, path: string, params: Record<string, string>) {
  const url = `${API}${path}?${new URLSearchParams(params)}`;
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } });
  if (!resp.ok) throw new Error(`Hotmart ${path} respondeu ${resp.status}`);
  return await resp.json();
}

interface Sale {
  transaction: string;
  email: string;
  buyer_name: string | null;
  product_id: number | null;
  status: string;
  approved_at: string | null;
}

async function fetchSales(token: string, days: number): Promise<Sale[]> {
  const productId = (Deno.env.get("HOTMART_PRODUCT_ID") ?? "").trim();
  const end = Date.now();
  const start = end - days * 86400000;
  const sales = new Map<string, Sale>();
  for (const status of BUY_STATUSES) {
    let pageToken = "";
    for (let page = 0; page < MAX_PAGES; page++) {
      const params: Record<string, string> = {
        start_date: String(start),
        end_date: String(end),
        transaction_status: status,
        max_results: "100",
      };
      if (productId) params.product_id = productId;
      if (pageToken) params.page_token = pageToken;
      const data = await hotmartGet(token, "/payments/api/v1/sales/history", params);
      for (const it of data.items ?? []) {
        const tx = it?.purchase?.transaction;
        const email = String(it?.buyer?.email ?? "").trim().toLowerCase();
        if (!tx || !email) continue;
        sales.set(String(tx), {
          transaction: String(tx),
          email,
          buyer_name: it?.buyer?.name ?? null,
          product_id: Number.isFinite(Number(it?.product?.id)) ? Number(it.product.id) : null,
          status: String(it?.purchase?.status ?? status),
          approved_at: typeof it?.purchase?.approved_date === "number" ? new Date(it.purchase.approved_date).toISOString() : null,
        });
      }
      pageToken = data?.page_info?.next_page_token ?? "";
      if (!pageToken) break;
    }
  }
  return [...sales.values()];
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "método não permitido" }, 405);

  const key = Deno.env.get("HOTMART_SYNC_KEY") ?? "";
  if (!key || !safeEqual(req.headers.get("x-sync-key") ?? "", key)) return json({ error: "não autorizado" }, 401);

  const url = new URL(req.url);
  try {
    const token = await getToken();

    if (url.searchParams.get("list_products") === "1") {
      const data = await hotmartGet(token, "/products/api/v1/products", { max_results: "50" });
      return json((data.items ?? []).map((p: { id: number; name: string; status: string }) => ({ id: p.id, name: p.name, status: p.status })));
    }

    if (url.searchParams.get("run") !== "1") return json({ error: "parâmetro ausente" }, 400);

    const days = Math.min(Math.max(Number(url.searchParams.get("days")) || DEFAULT_DAYS, 1), MAX_DAYS);
    const sales = await fetchSales(token, days);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) return json({ error: "serviço indisponível" }, 500);
    const admin = createClient(supabaseUrl, serviceRoleKey);

    if (sales.length) {
      const { error } = await admin.from("fa_ebook_compras").upsert(sales.map((s) => ({ ...s, synced_at: new Date().toISOString() })), { onConflict: "transaction" });
      if (error) {
        console.error("hotmart-sync: erro ao gravar compras", error);
        return json({ error: "falha ao gravar" }, 500);
      }
    }

    let stopped = 0;
    for (const email of new Set(sales.map((s) => s.email))) {
      const { data } = await admin
        .from("fa_leads_teste_comportamento")
        .update({ ebook_seq_stopped_at: new Date().toISOString(), ebook_seq_stop_reason: "purchased" })
        .ilike("guardian_email", email)
        .is("ebook_seq_stopped_at", null)
        .select("id");
      stopped += data?.length ?? 0;
    }

    return json({ days, sales: sales.length, leads_stopped: stopped });
  } catch (err) {
    console.error("hotmart-sync:", err instanceof Error ? err.message : err);
    return json({ error: err instanceof Error ? err.message : "erro" }, 502);
  }
});

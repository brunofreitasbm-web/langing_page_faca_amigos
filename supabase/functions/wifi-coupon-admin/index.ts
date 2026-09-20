// Consulta e resgate do cupom "ESPERA" (portal Wi-Fi da clínica) pelo
// balcão do Playground/Circuito. Endpoint enxuto e isolado — não depende do
// login de gestor de behavior-test-admin porque quem resgata cupom no
// quiosque é a equipe de atendimento do Playground, não a clínica.
//
// Autenticação: header "Authorization: Bearer <ADMIN_API_KEY>" (secret fixo,
// compartilhado com quem opera o balcão via um app/atalho simples — ver
// hotspot/LEIA-ME-HOTSPOT.md, seção "Pendências"). Isto é uma solução
// provisória: a integração definitiva é uma aba "Wi-Fi" dentro do
// admin.html existente, com o mesmo login de gestor de behavior-test-admin.
//
// GET  ?code=ESPERA-XXXX        → retorna o status do cupom
// POST { code, operation }      → resgata (operation: "playground" | "circuito"),
//                                  bloqueado se já resgatado hoje ou expirado

import { createClient } from "jsr:@supabase/supabase-js@2";

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "content-type, authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}

function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase();
}

function isSameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders() });

  const adminApiKey = Deno.env.get("WIFI_ADMIN_API_KEY");
  const authHeader = req.headers.get("authorization") ?? "";
  const providedKey = authHeader.replace(/^Bearer\s+/i, "");
  if (!adminApiKey || providedKey !== adminApiKey) {
    return jsonResponse({ error: "não autorizado" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY ausentes");
    return jsonResponse({ error: "serviço indisponível" }, 500);
  }
  const admin = createClient(supabaseUrl, serviceRoleKey);

  if (req.method === "GET") {
    const url = new URL(req.url);
    const code = normalizeCode(url.searchParams.get("code") ?? "");
    if (!code) return jsonResponse({ error: "informe o código do cupom" }, 400);

    const { data, error } = await admin
      .from("fa_wifi_leads")
      .select(
        "guardian_name, guardian_phone, coupon_code, coupon_status, coupon_operation, coupon_expires_at, last_redeemed_at, visit_count",
      )
      .eq("coupon_code", code)
      .maybeSingle();

    if (error) return jsonResponse({ error: "falha na consulta" }, 500);
    if (!data) return jsonResponse({ error: "cupom não encontrado" }, 404);

    const expired = new Date(data.coupon_expires_at) < new Date();
    return jsonResponse({ ...data, expired });
  }

  if (req.method === "POST") {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "corpo inválido" }, 400);
    }
    const code = normalizeCode(typeof body.code === "string" ? body.code : "");
    const operation = typeof body.operation === "string" ? body.operation : "";
    if (!code) return jsonResponse({ error: "informe o código do cupom" }, 400);
    if (!["playground", "circuito"].includes(operation)) {
      return jsonResponse({ error: "escolha playground ou circuito" }, 400);
    }

    const { data: lead, error: fetchError } = await admin
      .from("fa_wifi_leads")
      .select("id, coupon_expires_at, last_redeemed_at, redeemed_count")
      .eq("coupon_code", code)
      .maybeSingle();

    if (fetchError) return jsonResponse({ error: "falha na consulta" }, 500);
    if (!lead) return jsonResponse({ error: "cupom não encontrado" }, 404);
    if (new Date(lead.coupon_expires_at) < new Date()) {
      return jsonResponse({ error: "cupom expirado" }, 409);
    }
    if (lead.last_redeemed_at && isSameDay(new Date(lead.last_redeemed_at), new Date())) {
      return jsonResponse({ error: "este cupom já foi resgatado hoje — um benefício por dia" }, 409);
    }

    const { error: updateError } = await admin
      .from("fa_wifi_leads")
      .update({
        coupon_status: "redeemed",
        coupon_operation: operation,
        last_redeemed_at: new Date().toISOString(),
        redeemed_count: (lead.redeemed_count ?? 0) + 1,
      })
      .eq("id", lead.id);

    if (updateError) return jsonResponse({ error: "falha ao registrar resgate" }, 500);

    return jsonResponse({ ok: true, coupon_code: code, operation });
  }

  return jsonResponse({ error: "method_not_allowed" }, 405);
});

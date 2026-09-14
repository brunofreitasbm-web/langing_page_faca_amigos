// Routing Middleware da Vercel (https://vercel.com/docs/routing-middleware).
//
// Substitui a tentativa anterior de usar `has: [{ type: "host", ... }]` em
// rewrites no vercel.json — essa condição NUNCA existiu na API da Vercel
// (o schema documentado só suporta `type: "header"` e `type: "cookie"`),
// então a regra nunca disparava e a raiz sempre caía no comportamento
// padrão (servir index.html) para qualquer host, inclusive o apex.
//
// Decisão de risco: index.html agora É o hub (o domínio mais importante,
// institutofacaamigos.com.br, não depende de nenhuma lógica condicional —
// é o comportamento padrão da Vercel, funciona mesmo se este middleware
// quebrar). Só o subdomínio secundário (playground.) precisa de uma regra
// ativa para servir playground.html em vez do índice padrão.
import { rewrite, next } from "@vercel/functions";

export const config = {
  matcher: "/",
};

export default function middleware(request) {
  const host = request.headers.get("host") || "";
  if (host === "playground.institutofacaamigos.com.br") {
    return rewrite(new URL("/playground", request.url));
  }
  return next();
}

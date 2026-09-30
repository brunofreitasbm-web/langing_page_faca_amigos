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
// quebrar). Só os subdomínios secundários (playground. e gestao.) precisam
// de uma regra ativa para servir a página deles em vez do índice padrão.
//
// Hub de Gestão (gestao.): além de servir /gestao, todo caminho desse host sai com
// X-Robots-Tag noindex e o /robots.txt dele é o robots-gestao.txt (Disallow: /). O try/catch
// abaixo garante que uma falha aqui nunca derrube o site principal.
import { rewrite, next } from "@vercel/functions";

// Roda em todas as rotas, menos nos arquivos estáticos pesados (assets/img/video): o host
// gestao. serve o MESMO deploy do site, então qualquer caminho dele (ex.: /playground)
// também precisa sair com noindex, senão o Google indexaria o site inteiro duplicado ali.
export const config = {
  matcher: "/((?!assets/|img/|video/|_vercel/).*)",
};

// Hub de Gestão é privado (Bruno e Isabella): nunca deve aparecer em buscadores.
const NOINDEX = { "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet, noimageindex" };

const HUB_HOST = "institutofacaamigos.com.br";
const PLAYGROUND_HOST = "playground.institutofacaamigos.com.br";
// Arquivos (llms.txt, sitemap.xml, favicon, .well-known...) passam direto em qualquer host.
const isFile = (path) => /\.[a-z0-9]+$/i.test(path) || path.startsWith("/.well-known/");

export default function middleware(request) {
  try {
    const host = request.headers.get("host") || "";
    const url = new URL(request.url);
    const path = url.pathname;
    // Cada página tem um domínio "dono" (o do canonical): playground. só serve a home do
    // playground e o /circuito; tudo o mais é do hub. O outro host redireciona (308), assim não
    // existem cópias navegáveis das mesmas páginas em dois domínios.
    if (host === PLAYGROUND_HOST) {
      if (path === "/") return rewrite(new URL("/playground", request.url));
      if (path === "/playground") return Response.redirect(`https://${PLAYGROUND_HOST}/${url.search}`, 308);
      if (path === "/circuito" || isFile(path)) return next();
      return Response.redirect(`https://${HUB_HOST}${path}${url.search}`, 308);
    }
    if (host === HUB_HOST) {
      if (path === "/playground") return Response.redirect(`https://${PLAYGROUND_HOST}/${url.search}`, 308);
      if (path === "/circuito") return Response.redirect(`https://${PLAYGROUND_HOST}/circuito${url.search}`, 308);
      return next();
    }
    // Hub de Gestão (privado, Bruno e Isabella) — ver gestao.html.
    if (host === "gestao.institutofacaamigos.com.br") {
      if (path === "/robots.txt") return rewrite(new URL("/robots-gestao.txt", request.url), { headers: NOINDEX });
      if (path === "/") return rewrite(new URL("/gestao", request.url), { headers: NOINDEX });
      return next({ headers: NOINDEX });
    }
  } catch (_) {
    // Nunca derruba o site por causa de uma falha aqui.
  }
  return next();
}

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

// ---------- Eventos: HTML montado no servidor (GEO/AEO) ----------
// /eventos/<slug> é uma página só (evento.html) preenchida por JavaScript. Sem isto, buscador e assistente de IA
// que não executam JS viam "Encontro do Instituto FaçaAmigos", canonical da agenda e nenhum dado do evento, então
// nenhum evento era indexado nem virava resultado de evento no Google. Aqui o middleware busca o evento na mesma
// API pública que o navegador usa (eventos-public, só dados públicos) e injeta no HTML: título, descrição,
// canonical/og:url próprios, o resumo em texto e o JSON-LD Event. O JS da página continua fazendo o resto
// (vagas ao vivo, formulário). Qualquer falha devolve null e o fluxo antigo (rewrite do vercel.json) segue.
const EVENTOS_API = "https://ivjvpdzsfjdpyabbzzuj.supabase.co/functions/v1/eventos-public";
const EVENTO_RE = /^\/eventos\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/;
const TIMEOUT_MS = 2500;

const escHtml = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
// JSON dentro de <script>: "<" escapado para nenhum texto do evento fechar a tag.
const jsonLd = (obj) => JSON.stringify(obj).replace(/</g, "\\u003c");

function apiEventos(body) {
  return fetch(EVENTOS_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
}

function quandoTexto(ev) {
  const tz = { timeZone: "America/Belem" };
  const data = new Date(ev.inicio).toLocaleDateString("pt-BR", { ...tz, weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const hora = (iso) => new Date(iso).toLocaleTimeString("pt-BR", { ...tz, hour: "2-digit", minute: "2-digit" });
  return `${data}, das ${hora(ev.inicio)} às ${hora(ev.fim)} (horário de Belém)`;
}

function ondeTexto(ev) {
  if (ev.formato === "online") return "Online · o link chega no seu ingresso após a confirmação";
  return [ev.local_nome, ev.local_endereco].filter(Boolean).join(" · ") || "Belém/PA";
}

// "R$ 97,00" -> "97.00". Sem número legível, a oferta sai sem preço (o Google aceita).
function precoNumero(txt) {
  const m = /(\d{1,3}(?:\.\d{3})*|\d+)(?:,(\d{1,2}))?/.exec(String(txt || ""));
  return m ? `${m[1].replace(/\./g, "")}.${(m[2] || "00").padEnd(2, "0")}` : undefined;
}

function eventoLd(ev, pageUrl) {
  const online = ev.formato === "online";
  const lugar = {
    "@type": "Place",
    name: ev.local_nome || "Belém/PA",
    address: { "@type": "PostalAddress", streetAddress: ev.local_endereco || undefined, addressLocality: "Belém", addressRegion: "PA", addressCountry: "BR" },
  };
  const virtual = { "@type": "VirtualLocation", url: pageUrl };
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    "@id": `${pageUrl}#evento`,
    name: ev.titulo,
    description: ev.descricao_curta || ev.promessa || undefined,
    url: pageUrl,
    inLanguage: "pt-BR",
    startDate: ev.inicio,
    endDate: ev.fim,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: online
      ? "https://schema.org/OnlineEventAttendanceMode"
      : ev.formato === "hibrido" ? "https://schema.org/MixedEventAttendanceMode" : "https://schema.org/OfflineEventAttendanceMode",
    location: online ? virtual : ev.formato === "hibrido" ? [lugar, virtual] : lugar,
    image: ev.capa_url ? [ev.capa_url] : undefined,
    organizer: { "@type": "Organization", "@id": "https://institutofacaamigos.com.br/#organization", name: "Instituto FaçaAmigos", url: "https://institutofacaamigos.com.br/" },
    performer: ev.palestrante_nome ? { "@type": "Person", name: ev.palestrante_nome } : undefined,
    offers: (ev.tipos || []).map((t) => ({
      "@type": "Offer",
      name: t.nome,
      price: t.tipo === "gratuito" ? "0" : precoNumero(t.preco_exibicao),
      priceCurrency: "BRL",
      availability: ev.inscricoes_encerradas || t.escassez?.estado === "esgotado" ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
      url: pageUrl,
    })),
  };
}

async function eventoSSR(request, slug) {
  const [pagina, api] = await Promise.all([
    fetch(new URL("/evento", request.url), { signal: AbortSignal.timeout(TIMEOUT_MS) }),
    apiEventos({ action: "detalhe", slug }),
  ]);
  if (!pagina.ok) return null;
  let html = await pagina.text();
  // Resposta montada aqui pode não herdar os headers do vercel.json: repete os essenciais.
  const headers = {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "public, max-age=0, must-revalidate",
    "Content-Language": "pt-BR",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
    "Referrer-Policy": "strict-origin-when-cross-origin",
  };
  if (api.status === 404) {
    // Evento inexistente ou despublicado: 404 de verdade (não "soft 404" indexável). O JS mostra a mensagem.
    html = html.replace('<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">', '<meta name="robots" content="noindex, follow">');
    return new Response(html, { status: 404, headers });
  }
  if (!api.ok) return null;
  const ev = (await api.json())?.evento;
  if (!ev || !ev.titulo) return null;

  const pageUrl = `https://${HUB_HOST}/eventos/${ev.slug}`;
  const titulo = escHtml(ev.titulo);
  const desc = escHtml(ev.descricao_curta || ev.promessa || `${ev.titulo}: encontro do Instituto FaçaAmigos em Belém.`);
  const quando = escHtml(quandoTexto(ev));
  const onde = escHtml(ondeTexto(ev));
  const trocas = [
    ["<title>Encontro do Instituto FaçaAmigos</title>", `<title>${titulo} | Instituto FaçaAmigos</title>`],
    [/<meta name="description" content="[^"]*">/, `<meta name="description" content="${desc}">`],
    [/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${pageUrl}">`],
    [/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${pageUrl}">`],
    [/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${titulo}">`],
    [/<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${titulo}">`],
    [/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${desc}">`],
    ['<h1 id="ev-titulo">Encontro</h1>', `<h1 id="ev-titulo">${titulo}</h1>`],
    ['<span id="ev-quando"></span>', `<span id="ev-quando">${quando}</span>`],
    ['<span id="ev-onde"></span>', `<span id="ev-onde">${onde}</span>`],
    // Resumo legível sem JS no lugar do "Carregando…" (o JS esconde este bloco ao montar a página).
    ['<div id="loading" class="state">Carregando o encontro…</div>',
      `<div id="loading" class="state"><p><strong>${titulo}</strong></p><p>${quando}</p><p>${onde}</p><p>${desc}</p><p>Carregando vagas e inscrição…</p></div>`],
    ["</head>", `  <script type="application/ld+json" data-ssr="evento">${jsonLd(eventoLd(ev, pageUrl))}</script>\n</head>`],
  ];
  if (ev.capa_url) {
    const capa = escHtml(ev.capa_url);
    trocas.push([/<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="${capa}">`]);
    trocas.push([/<meta name="twitter:image" content="[^"]*">/, `<meta name="twitter:image" content="${capa}">`]);
    // A capa não tem dimensão/alt conhecidos: tira os da imagem padrão para não descrever a foto errada.
    trocas.push([/\s*<meta property="og:image:(?:width|height|alt)" content="[^"]*">/g, ""]);
    trocas.push([/\s*<meta name="twitter:image:alt" content="[^"]*">/, ""]);
  }
  for (const [de, para] of trocas) html = html.replace(de, para);
  return new Response(html, { status: 200, headers });
}

// Sitemap só dos eventos publicados e ainda não encerrados (a API "listar" já filtra fim >= agora).
async function sitemapEventos() {
  const api = await apiEventos({ action: "listar" });
  if (!api.ok) return new Response("indisponível", { status: 503, headers: { "Retry-After": "3600" } });
  const eventos = (await api.json())?.eventos || [];
  const urls = eventos
    .filter((e) => e && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(e.slug || ""))
    .map((e) => `  <url>\n    <loc>https://${HUB_HOST}/eventos/${e.slug}</loc>\n    <changefreq>daily</changefreq>\n  </url>`)
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}${urls ? "\n" : ""}</urlset>\n`;
  return new Response(xml, {
    status: 200,
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400" },
  });
}

export default async function middleware(request) {
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
      if (path === "/sitemap-eventos.xml") return await sitemapEventos();
      const evento = EVENTO_RE.exec(path);
      if (evento) {
        const pagina = await eventoSSR(request, evento[1]);
        if (pagina) return pagina;
      }
      if (path === "/playground") return Response.redirect(`https://${PLAYGROUND_HOST}/${url.search}`, 308);
      if (path === "/circuito") return Response.redirect(`https://${PLAYGROUND_HOST}/circuito${url.search}`, 308);
      return next();
    }
    // Hub de Gestão (privado, Bruno e Isabella) — ver gestao.html.
    if (host === "gestao.institutofacaamigos.com.br" || host === "clinica.institutofacaamigos.com.br") {
      if (path === "/robots.txt") return rewrite(new URL("/robots-gestao.txt", request.url), { headers: NOINDEX });
      if (path === "/") return rewrite(new URL("/gestao", request.url), { headers: NOINDEX });
      return next({ headers: NOINDEX });
    }
  } catch (_) {
    // Nunca derruba o site por causa de uma falha aqui.
  }
  return next();
}

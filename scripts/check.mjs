#!/usr/bin/env node
// Verificação antes de publicar (Node 18+, sem dependências).
//   node scripts/check.mjs      (ou: npm run check)
// Código de saída 1 somente se houver ERRO. AVISO não reprova.
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE_HOSTS = new Set([
  'institutofacaamigos.com.br',
  'www.institutofacaamigos.com.br',
  'playground.institutofacaamigos.com.br',
]);
const EXCLUIDAS = (f) => f === 'admin.html' || f === 'descadastrar.html' || /^google.*\.html$/i.test(f);

const read = (p) => readFileSync(join(root, p), 'utf8');
const paginas = readdirSync(root)
  .filter((f) => f.endsWith('.html') && !EXCLUIDAS(f) && statSync(join(root, f)).isFile())
  .sort();

let totalErros = 0;
let totalAvisos = 0;
const resumo = [];
const nomesOrganization = new Map(); // name -> Set(arquivo)

// ---------- utilidades ----------
// Remove comentários, o corpo de <script> e <style> (mantém as tags de abertura, com seus atributos).
function semScriptsEComentarios(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/(<script\b[^>]*>)[\s\S]*?<\/script>/gi, '$1</script>')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '<style></style>');
}

function attrs(tag) {
  const out = {};
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  for (const m of tag.matchAll(re)) {
    const nome = m[1].toLowerCase();
    if (!(nome in out)) out[nome] = m[2] ?? m[3] ?? m[4] ?? '';
  }
  return out;
}

function decodeHtml(s) {
  return s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');
}

// Remove tags (sem inserir espaço — a formatação do HTML já tem os espaços reais entre palavras)
// e decodifica entidades, para comparar texto visível com texto de JSON-LD.
function textoVisivel(html) {
  return decodeHtml(html.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
}

// Achata um documento JSON-LD (objeto único ou @graph) em uma lista de nós.
function noJsonLd(doc) {
  if (doc && Array.isArray(doc['@graph'])) return doc['@graph'];
  return [doc];
}

function tipos(no) {
  const t = no?.['@type'];
  return Array.isArray(t) ? t : t ? [t] : [];
}

// Converte uma URL/href em caminho relativo à raiz do site (ou null se for externa/ignorável).
function alvoLocal(valor) {
  let v = decodeHtml(valor.trim());
  if (!v) return null;
  if (/[{}]|\$\{|<%/.test(v) || /^['"]?\s*\+|\+\s*['"]?$/.test(v)) return null; // valor dinâmico
  if (/^(#|mailto:|tel:|sms:|javascript:|data:|blob:|about:)/i.test(v)) return null;
  if (/^\/\//.test(v)) v = 'https:' + v;
  if (/^[a-z][a-z0-9+.-]*:/i.test(v)) {
    let u;
    try { u = new URL(v); } catch { return null; }
    if (!/^https?:$/.test(u.protocol) || !SITE_HOSTS.has(u.hostname)) return null;
    v = u.pathname;
  }
  v = v.split('#')[0].split('?')[0];
  if (v === '') return null; // só âncora/query: mesma página
  try { v = decodeURIComponent(v); } catch { /* mantém */ }
  return v.replace(/^\/+/, '');
}

// cleanUrls: "" -> index.html, "guia" -> guia.html
function existeNoSite(rel) {
  if (rel === '') return existsSync(join(root, 'index.html'));
  const p = join(root, rel);
  if (existsSync(p) && statSync(p).isFile()) return true;
  if (existsSync(p) && statSync(p).isDirectory()) return existsSync(join(p, 'index.html'));
  if (!extname(rel) || rel.endsWith('/')) {
    const limpo = rel.replace(/\/+$/, '');
    if (limpo === '') return existsSync(join(root, 'index.html'));
    return existsSync(join(root, limpo + '.html'));
  }
  return false;
}

function linhasIgnore(arq) {
  if (!existsSync(join(root, arq))) return null;
  return read(arq).split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
}
function normaliza(l) {
  return l.replace(/^\/+/, '').replace(/\/+$/, '').replace(/\/\*+$/, '');
}
function cobre(linhas, nome) {
  return !!linhas && linhas.some((l) => normaliza(l) === nome);
}

// ---------- verificações globais ----------
const globais = { erros: [], avisos: [] };
{
  const vi = linhasIgnore('.vercelignore');
  const gi = linhasIgnore('.gitignore');
  if (!vi) globais.erros.push('.vercelignore não existe (ebook/ e hotspot/ seriam publicados).');
  if (!gi) globais.erros.push('.gitignore não existe.');
  if (!cobre(vi, 'ebook')) globais.erros.push('ebook/ não está no .vercelignore (os PDFs pagos seriam publicados).');
  if (!cobre(gi, 'ebook')) globais.erros.push('ebook/ não está no .gitignore (os PDFs pagos poderiam ir para o repositório).');
  if (!cobre(vi, 'hotspot')) globais.erros.push('hotspot/ não está no .vercelignore (o portal Wi-Fi seria publicado no site).');
  for (const [pasta, motivo] of [['supabase', 'código das funções e migrations'], ['scripts', 'scripts internos']]) {
    if (existsSync(join(root, pasta)) && !cobre(vi, pasta)) {
      globais.avisos.push(`${pasta}/ não está no .vercelignore (${motivo} ficaria público em /${pasta}/...).`);
    }
  }
  for (const f of ['PUBLICAR.md', 'LEIA-ME.txt']) {
    if (existsSync(join(root, f)) && !cobre(vi, f)) {
      globais.avisos.push(`${f} não está no .vercelignore (fica público em /${f}).`);
    }
  }
}

// Arquivos servidos (HTML, JS, CSS, JSON... da raiz e de assets/) não podem citar hotspot/,
// pois a pasta não é publicada. Configs (vercel.json, robots.txt) e docs internos ficam de fora.
function arquivosServidos() {
  const out = [];
  const pulaNaRaiz = new Set(['ebook', 'hotspot', 'supabase', 'node_modules', 'scripts', 'downloads', 'img', 'video',
    'Teste de Comportamento']);
  const varrer = (dir) => {
    for (const nome of readdirSync(join(root, dir || '.'))) {
      const rel = dir ? `${dir}/${nome}` : nome;
      const st = statSync(join(root, rel));
      if (st.isDirectory()) {
        if (nome.startsWith('.')) continue;
        if (dir === '' && pulaNaRaiz.has(nome)) continue;
        varrer(rel);
      } else if (/\.(html|js|css|json|xml|webmanifest|svg)$/i.test(nome)) out.push(rel);
    }
  };
  varrer('');
  return out.filter((f) => !['package.json', 'vercel.json', 'middleware.js'].includes(f));
}
for (const f of arquivosServidos()) {
  read(f).split(/\r?\n/).forEach((l, i) => {
    if (/hotspot\//i.test(l)) globais.erros.push(`${f}:${i + 1} referencia "hotspot/" (a pasta não é publicada).`);
  });
}

// ---------- verificações por página ----------
for (const arq of paginas) {
  const html = read(arq);
  const limpo = semScriptsEComentarios(html);
  const erros = [];
  const avisos = [];

  const robots = /<meta\s+[^>]*name=["']robots["'][^>]*>/i.exec(limpo);
  const noindex = robots ? /noindex/i.test(attrs(robots[0]).content ?? '') : false;

  if (!/<script\b[^>]*\bsrc=["']\/assets\/fa-track\.js(?:\?[^"']*)?["']/i.test(limpo)) {
    erros.push('falta <script src="/assets/fa-track.js">');
  }
  const title = /<title>\s*([\s\S]*?)\s*<\/title>/i.exec(limpo);
  if (!title || !title[1].trim()) erros.push('falta <title>');
  if (!noindex) {
    const temCanonical = [...limpo.matchAll(/<link\b[^>]*>/gi)].some((m) => {
      const a = attrs(m[0]);
      return /(?:^|\s)canonical(?:\s|$)/i.test(a.rel ?? '') && (a.href ?? '').trim();
    });
    if (!temCanonical) erros.push('falta <link rel="canonical">');
    const desc = /<meta\s+[^>]*name=["']description["'][^>]*>/i.exec(limpo);
    if (!desc || !(attrs(desc[0]).content ?? '').trim()) erros.push('falta <meta name="description">');
  }

  // links internos (href/src/poster/srcset de tags reais; JS e comentários ignorados)
  const vistos = new Set();
  for (const m of limpo.matchAll(/<([a-zA-Z][a-zA-Z0-9-]*)\b([^>]*)>/g)) {
    const tag = m[1].toLowerCase();
    const a = attrs(m[2]);
    if (tag === 'link' && /(?:^|\s)(?:preconnect|dns-prefetch)(?:\s|$)/i.test(a.rel ?? '')) continue;
    const cand = [];
    if (['a', 'link', 'area'].includes(tag) && a.href != null) cand.push(a.href);
    if (['script', 'img', 'source', 'iframe', 'video', 'audio', 'embed', 'track'].includes(tag) && a.src != null) cand.push(a.src);
    if (tag === 'video' && a.poster) cand.push(a.poster);
    if (a.srcset) for (const parte of a.srcset.split(',')) cand.push(parte.trim().split(/\s+/)[0]);
    for (const c of cand) {
      const rel = alvoLocal(c);
      if (rel == null) continue;
      if (vistos.has(rel)) continue;
      vistos.add(rel);
      if (!existeNoSite(rel)) erros.push(`link interno quebrado: ${c}`);
    }
  }

  // imagens
  let primeira = true;
  let semDim = 0;
  let semAlt = 0;
  let semLoading = 0;
  for (const m of limpo.matchAll(/<img\b([^>]*)>/gi)) {
    const a = attrs(m[1]);
    const ehPrimeira = primeira;
    primeira = false;
    if (!('width' in a) || !('height' in a)) semDim++;
    if (!('alt' in a)) semAlt++;
    if (!ehPrimeira && !('loading' in a)) semLoading++;
  }
  if (semDim) avisos.push(`${semDim} <img> sem width/height`);
  if (semAlt) avisos.push(`${semAlt} <img> sem alt`);
  if (semLoading) avisos.push(`${semLoading} <img> sem loading (exceto a primeira)`);

  // JSON-LD
  let nLd = 0;
  const nosLd = []; // todos os nós (objeto único ou @graph achatado) de todos os blocos da página
  for (const m of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    nLd++;
    let doc;
    try { doc = JSON.parse(m[1]); } catch (e) { erros.push(`JSON-LD #${nLd} não parseia: ${e.message}`); continue; }
    nosLd.push(...noJsonLd(doc));
  }

  // Organization / LocalBusiness: precisam de "@id" (para o parentOrganization de outras páginas linkar)
  // e o nome da Organization tem que ser igual em todo o site.
  for (const no of nosLd) {
    const t = tipos(no);
    if (t.includes('Organization') || t.includes('LocalBusiness')) {
      if (!no['@id']) erros.push(`JSON-LD ${t.join('/')} "${no.name ?? '?'}" sem "@id"`);
    }
    if (t.includes('Organization') && no.name) {
      if (!nomesOrganization.has(no.name)) nomesOrganization.set(no.name, new Set());
      nomesOrganization.get(no.name).add(arq);
    }
  }

  // FAQPage: o texto do JSON-LD tem que ser idêntico ao FAQ visível (<details><summary>...</summary>...</details>).
  {
    const faqLd = nosLd.filter((no) => tipos(no).includes('FAQPage')).flatMap((no) => no.mainEntity ?? []);
    const faqVisivel = [...limpo.matchAll(/<details\b[^>]*>\s*<summary[^>]*>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/gi)]
      .map((m) => ({ name: textoVisivel(m[1]), resposta: textoVisivel(m[2]) }));
    if (faqLd.length || faqVisivel.length) {
      if (faqLd.length !== faqVisivel.length) {
        erros.push(`FAQ: ${faqVisivel.length} pergunta(s) visível(is) vs ${faqLd.length} no JSON-LD`);
      } else {
        faqVisivel.forEach((v, i) => {
          const q = faqLd[i] ?? {};
          const ldNome = textoVisivel(q.name ?? '');
          const ldResposta = textoVisivel(q.acceptedAnswer?.text ?? '');
          if (v.name !== ldNome) erros.push(`FAQ #${i + 1}: pergunta visível difere do JSON-LD ("${v.name}" vs "${ldNome}")`);
          else if (v.resposta !== ldResposta) erros.push(`FAQ #${i + 1} ("${v.name}"): resposta visível difere do JSON-LD`);
        });
      }
    }
  }

  // og:image / twitter:image
  for (const m of limpo.matchAll(/<meta\s+[^>]*>/gi)) {
    const a = attrs(m[0]);
    const nome = (a.property ?? a.name ?? '').toLowerCase();
    if (!['og:image', 'twitter:image'].includes(nome) || !a.content) continue;
    const rel = alvoLocal(a.content);
    if (rel == null) {
      if (/^https?:/i.test(a.content)) avisos.push(`${nome} aponta para domínio externo (não verificado): ${a.content}`);
      continue;
    }
    if (!existeNoSite(rel)) avisos.push(`${nome} inexistente no disco: ${a.content}`);
  }

  resumo.push({ arq, erros, avisos, nLd });
  totalErros += erros.length;
  totalAvisos += avisos.length;
}

// ---------- verificação global: nome da Organization e preços do llms*.txt ----------
if (nomesOrganization.size > 1) {
  const lista = [...nomesOrganization.entries()].map(([nome, arqs]) => `"${nome}" (${[...arqs].join(', ')})`).join(' vs ');
  globais.erros.push(`nome da Organization diverge entre páginas: ${lista}`);
}
{
  const precoRe = /R\$\s?\d+(?:,\d{2})?/g;
  // Compara pelo valor numérico (centavos), não pelo texto: "R$ 60" e "R$ 60,00" são o mesmo preço.
  const centavos = (txt) => Math.round(parseFloat(txt.replace(/^R\$\s?/, '').replace(',', '.')) * 100);
  const precosPaginas = new Set();
  for (const arq of paginas) {
    if (arq === 'wifi.html') continue; // cupom Wi-Fi tem valores próprios, não é preço de tabela
    for (const m of read(arq).matchAll(precoRe)) precosPaginas.add(centavos(m[0]));
  }
  for (const arqLlm of ['llms.txt', 'llms-full.txt']) {
    if (!existsSync(join(root, arqLlm))) continue;
    const vistos = new Map(); // centavos -> texto original (para a mensagem)
    for (const m of read(arqLlm).matchAll(precoRe)) vistos.set(centavos(m[0]), m[0]);
    const faltando = [...vistos.entries()].filter(([c]) => !precosPaginas.has(c)).map(([, txt]) => txt);
    if (faltando.length) {
      globais.erros.push(`${arqLlm}: preço(s) ${faltando.join(', ')} não aparece(m) em nenhuma página do site.`);
    }
  }
}

// ---------- saída ----------
console.log('Verificação do site FaçaAmigos\n');
if (globais.erros.length || globais.avisos.length) {
  console.log('[geral]');
  for (const e of globais.erros) console.log(`  ERRO   ${e}`);
  for (const a of globais.avisos) console.log(`  AVISO  ${a}`);
  console.log('');
}
for (const p of resumo) {
  const estado = p.erros.length ? 'FALHOU' : p.avisos.length ? 'ok (com avisos)' : 'ok';
  console.log(`${p.arq}  ${estado}${p.nLd ? `  [${p.nLd} JSON-LD]` : ''}`);
  for (const e of p.erros) console.log(`  ERRO   ${e}`);
  for (const a of p.avisos) console.log(`  AVISO  ${a}`);
}
const erroTotal = totalErros + globais.erros.length;
const avisoTotal = totalAvisos + globais.avisos.length;
console.log(`\n${paginas.length} páginas verificadas: ${erroTotal} erro(s), ${avisoTotal} aviso(s).`);
console.log('Avisos por página: ' + resumo.map((p) => `${p.arq}=${p.avisos.length}`).join(', '));
process.exit(erroTotal ? 1 : 0);

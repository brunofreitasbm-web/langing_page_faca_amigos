#!/usr/bin/env node
// Atualiza os <lastmod> do sitemap.xml a partir do git (sem dependências, Node 18+).
//   node scripts/sitemap-lastmod.mjs            reescreve o sitemap.xml
//   node scripts/sitemap-lastmod.mjs --check    só confere (código 1 se algum lastmod estiver defasado)
//
// Data de cada URL = data do último commit que mexeu no arquivo da página (git log -1 --format=%cs).
// Se o arquivo tem mudanças ainda não commitadas (ou é novo), usa a data de hoje.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sitemapPath = join(root, 'sitemap.xml');
const checkOnly = process.argv.includes('--check');

const git = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();

function hoje() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// cleanUrls: "/" -> index.html, "/guia" -> guia.html.
// Exceção (middleware.js): a raiz do subdomínio playground. serve playground.html.
function arquivoDaUrl(loc) {
  const u = new URL(loc);
  const path = u.pathname.replace(/\/+$/, '');
  if (path === '' && u.hostname.startsWith('playground.')) return 'playground.html';
  return (path === '' ? 'index' : path.slice(1)) + '.html';
}

function dataDoArquivo(arq) {
  if (git(['status', '--porcelain', '--', arq])) return hoje(); // alterado, novo ou não commitado
  return git(['log', '-1', '--format=%cs', '--', arq]) || hoje();
}

let xml = readFileSync(sitemapPath, 'utf8');
let defasados = 0;
let semArquivo = 0;

xml = xml.replace(/<url>[\s\S]*?<\/url>/g, (bloco) => {
  const loc = /<loc>([^<]+)<\/loc>/.exec(bloco)?.[1]?.trim();
  if (!loc) return bloco;
  const arq = arquivoDaUrl(loc);
  if (!existsSync(join(root, arq))) {
    console.warn(`AVISO: ${loc} aponta para ${arq}, que não existe.`);
    semArquivo++;
    return bloco;
  }
  const nova = dataDoArquivo(arq);
  const atual = /<lastmod>([^<]*)<\/lastmod>/.exec(bloco)?.[1];
  if (atual !== nova) {
    defasados++;
    console.log(`${loc}: ${atual ?? '(sem lastmod)'} -> ${nova}  [${arq}]`);
  }
  if (/<lastmod>/.test(bloco)) return bloco.replace(/<lastmod>[^<]*<\/lastmod>/, `<lastmod>${nova}</lastmod>`);
  return bloco.replace('</loc>', `</loc>\n    <lastmod>${nova}</lastmod>`);
});

if (checkOnly) {
  console.log(defasados ? `${defasados} lastmod defasado(s).` : 'sitemap.xml em dia.');
  process.exit(defasados ? 1 : 0);
}
if (defasados) {
  writeFileSync(sitemapPath, xml);
  console.log(`sitemap.xml atualizado (${defasados} lastmod).`);
} else {
  console.log('sitemap.xml já estava em dia.');
}
process.exit(semArquivo ? 1 : 0);

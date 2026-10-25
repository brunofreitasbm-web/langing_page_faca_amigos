#!/usr/bin/env node
// Testes da /tv3 com Playwright. Uso: node scripts/tv3-test.mjs [qr|motor|layout|copy|audio|todos]
//
// Variáveis de ambiente:
//   PW_MODULE        caminho do playwright (padrão /opt/node-tools/node_modules/playwright/index.mjs)
//   TV3_TEST_MODULES pasta com node_modules contendo jsqr e pngjs (npm i --no-save jsqr pngjs)
//   TV3_ROOT         raiz do site (padrão: pasta acima de scripts/)
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = process.env.TV3_ROOT || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PW = process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs';
const req = createRequire((process.env.TV3_TEST_MODULES || process.cwd()) + '/');
const { chromium } = await import(pathToFileURL(PW).href);
const jsQR = req('jsqr');
const { PNG } = req('pngjs');

const PORT = 8790 + Math.floor(Math.random() * 100);
const BASE = `http://127.0.0.1:${PORT}`;
const only = process.argv[2] || 'todos';
let falhas = 0, total = 0;
function ok(cond, nome, detalhe = '') {
  total++;
  if (!cond) falhas++;
  console.log(`${cond ? 'ok    ' : 'FALHA '} ${nome}${!cond && detalhe ? '  -> ' + detalhe : ''}`);
}

const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });

async function abrir(query = '', viewport = { width: 1920, height: 1080 }, opts = {}) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: opts.dsf || 1 });
  const page = await ctx.newPage();
  const externas = [];
  page.on('request', (rq) => { const u = rq.url(); if (!u.startsWith(BASE) && !u.startsWith('data:') && !u.startsWith('blob:')) externas.push(u); });
  page.externas = externas;
  if (opts.clock) await page.clock.install({ time: new Date(opts.clock) });
  await page.goto(`${BASE}/tv3.html?debug=1${query ? '&' + query : ''}`);
  return page;
}

function decodificar(buf) {
  const png = PNG.sync.read(buf);
  const r = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  return r ? r.data : null;
}

// ---------------------------------------------------------------- QR
async function testeQR() {
  console.log('\n# QR');
  for (const rot of [0, 90]) {
    const page = await abrir(rot ? `rot=${rot}` : '', { width: 1920, height: 1080 }, { dsf: 2 });
    const chaves = await page.evaluate(() => Object.keys(window.TV3.QR));
    const alvo = await page.evaluate(() => Object.fromEntries(Object.entries(window.TV3.QR).map(([k, v]) => [k, v.url])));
    ok(chaves.length >= 5, `QR[] tem as chaves esperadas (rot ${rot})`, chaves.join(','));
    // cada slide, na tela de verdade
    const n = await page.evaluate(() => document.querySelectorAll('.tv-slide').length);
    let lidos = 0, errados = [];
    for (let i = 0; i < n; i++) {
      await page.evaluate((i) => {
        document.querySelectorAll('.tv-slide').forEach((el, k) => { el.style.transition = 'none'; el.classList.toggle('active', k === i); });
      }, i);
      const box = page.locator('.tv-slide.active .tv-qr-box');
      if (!(await box.count())) continue;
      const key = await page.locator('.tv-slide.active .tv-qr-box svg').getAttribute('data-qr');
      const lido = decodificar(await box.screenshot());
      if (lido === alvo[key]) lidos++; else errados.push(`${key}: ${lido}`);
    }
    ok(errados.length === 0 && lidos > 0, `todos os QR dos slides decodificam na URL certa (rot ${rot}, ${lidos} lidos)`, errados.join(' | '));
    ok(page.externas.filter((u) => /qrserver|qrcode/i.test(u)).length === 0, `nenhuma chamada a serviço externo de QR (rot ${rot})`, page.externas.join(','));
    await page.context().close();
  }
  const page = await abrir('');
  const portal = await page.evaluate(() => window.TV3.QR.portal.url);
  ok(portal === 'https://institutofacaamigos.com.br/familia', 'QR do portal aponta para /familia', portal);
  await page.context().close();
}

const testes = { qr: testeQR };
try {
  for (const [nome, fn] of Object.entries(testes)) if (only === 'todos' || only === nome) await fn();
} finally {
  await browser.close();
  srv.kill();
}
console.log(`\n${total - falhas}/${total} verificações ok`);
process.exit(falhas ? 1 : 0);

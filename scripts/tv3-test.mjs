#!/usr/bin/env node
// Testes da /tv3 com Playwright. Uso: node scripts/tv3-test.mjs [giro|qr|motor|layout|tamanhos|fotos|fotosnovas|copy|audio|todos]
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
  const q = /(^|&)fotos=/.test(query) ? query : (query ? query + '&' : '') + 'fotos=0';
  await page.goto(`${BASE}/tv3.html?debug=1&${q}`);
  return page;
}

// Como a TV pode estar instalada. A TV3 vive em pé (retrato 1080x1920).
const CENARIOS = [
  { nome: 'paisagem', query: 'paisagem', viewport: { width: 1920, height: 1080 } },
  { nome: 'retrato nativo', query: '', viewport: { width: 1080, height: 1920 } },
  { nome: 'giro 90', query: '', viewport: { width: 1920, height: 1080 } },
  { nome: 'giro 270', query: 'giro=270', viewport: { width: 1920, height: 1080 } }
];
const comQuery = (...partes) => partes.filter(Boolean).join('&');

function decodificar(buf) {
  const png = PNG.sync.read(buf);
  const r = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  return r ? r.data : null;
}

// ---------------------------------------------------------------- QR
async function testeQR() {
  console.log('\n# QR');
  for (const c of CENARIOS) {
    const page = await abrir(c.query, c.viewport, { dsf: 2 });
    const alvo = await page.evaluate(() => Object.fromEntries(Object.entries(window.TV3.QR).map(([k, v]) => [k, v.url])));
    const slides = await page.evaluate(() => window.TV3.POOL.filter((s) => s.qr).map((s) => ({ id: s.id, qr: s.qr, layout: s.layout })));
    let lidos = 0; const errados = [];
    for (const sl of slides) {
      await page.evaluate((id) => window.TV3.show(id), sl.id);
      const box = page.locator('.tv-slide.active .tv-qr-box, .tv-slide.active .tv-qr-big').first();
      const key = await page.locator('.tv-slide.active svg[data-qr]').getAttribute('data-qr');
      const lido = decodificar(await box.screenshot());
      if (key === sl.qr && lido === alvo[key]) lidos++; else errados.push(`${sl.id}/${key}: ${lido}`);
    }
    ok(errados.length === 0 && lidos > 0, `todos os QR dos slides decodificam na URL certa (${c.nome}, ${lidos} lidos)`, errados.join(' | '));
    const tut = slides.find((x) => x.layout === 'tutorial');
    if (tut) {
      await page.evaluate((id) => window.TV3.show(id), tut.id);
      // offsetWidth não depende do giro nem da escala: é o tamanho no palco
      const w = await page.locator('.tv-slide.active .tv-qr-big').evaluate((el) => el.offsetWidth);
      const minimo = c.nome === 'paisagem' ? 360 : 660;
      ok(w >= minimo, `QR do tutorial mede ${w} px no palco (${c.nome}, mínimo ${minimo})`);
    }
    ok(page.externas.filter((u) => /qrserver|qrcode/i.test(u)).length === 0, `nenhuma chamada a serviço externo de QR (${c.nome})`, page.externas.join(','));
    await page.context().close();
  }
  const page = await abrir('');
  const portal = await page.evaluate(() => window.TV3.QR.portal.url);
  ok(portal === 'https://institutofacaamigos.com.br/familia', 'QR do portal aponta para /familia', portal);
  await page.context().close();
}

// ---------------------------------------------------------------- GIRO
async function testeGiro() {
  console.log('\n# GIRO');
  const caixa = (page) => page.evaluate(() => { const r = document.getElementById('tvStage').getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), g: window.TV3.graus() }; });
  const casos = [
    ['auto, janela em paisagem 1920x1080 (player em paisagem)', '', { width: 1920, height: 1080 }, 90, 1920, 1080],
    ['auto, janela em retrato 1080x1920 (a TV já gira a imagem)', '', { width: 1080, height: 1920 }, 0, 1080, 1920],
    ['auto, janela em paisagem de 1280x720 (TV 720p)', '', { width: 1280, height: 720 }, 90, 1280, 720],
    ['auto, janela em retrato 720x1280', '', { width: 720, height: 1280 }, 0, 720, 1280],
    ['?giro=270', 'giro=270', { width: 1920, height: 1080 }, 270, 1920, 1080],
    ['?giro=90 em janela retrato (forçado: o palco deitado encolhe para caber)', 'giro=90', { width: 1080, height: 1920 }, 90, 1080, 608],
    ['?giro=0 em janela retrato', 'giro=0', { width: 1080, height: 1920 }, 0, 1080, 1920],
    ['?rot=90 (apelido antigo)', 'rot=90', { width: 1920, height: 1080 }, 90, 1920, 1080],
    ['?paisagem', 'paisagem', { width: 1920, height: 1080 }, 0, 1920, 1080],
    ['?rot=0 abre em paisagem', 'rot=0', { width: 1920, height: 1080 }, 0, 1920, 1080]
  ];
  for (const [nome, q, vp, graus, w, h] of casos) {
    const page = await abrir(q, vp);
    const c = await caixa(page);
    // o palco girado precisa ocupar a janela inteira (o defeito antigo deixava o palco em 56% do tamanho)
    ok(c.g === graus && Math.abs(c.w - w) <= 2 && Math.abs(c.h - h) <= 2, `${nome}: gira ${c.g}º e ocupa ${c.w}x${c.h} (esperado ${graus}º, ${w}x${h})`);
    await page.context().close();
  }
  // tecla R alterna, salva na TV e vale no recarregamento; a URL tem prioridade sobre o salvo
  let page = await abrir('', { width: 1920, height: 1080 });
  const ciclo = [];
  for (let i = 0; i < 4; i++) { await page.keyboard.press('r'); ciclo.push(await page.evaluate(() => window.TV3.giro())); }
  ok(ciclo.join(',') === '90,270,0,auto', `tecla R alterna auto > 90 > 270 > 0 > auto (${ciclo.join(',')})`);
  await page.keyboard.press('r'); // 90
  ok((await page.evaluate(() => localStorage.getItem('fa-tv3-giro'))) === '90', 'a escolha do giro fica salva na TV');
  await page.reload();
  ok((await page.evaluate(() => window.TV3.giro())) === '90', 'depois de recarregar, vale o giro salvo');
  await page.goto(`${BASE}/tv3.html?debug=1&giro=270`);
  ok((await page.evaluate(() => window.TV3.giro())) === '270', 'a URL tem prioridade sobre o giro salvo');
  await page.context().close();
  page = await abrir('paisagem', { width: 1920, height: 1080 });
  await page.keyboard.press('r');
  ok((await page.evaluate(() => window.TV3.graus())) === 0, 'em paisagem a tecla R não gira');
  await page.context().close();
}

// ---------------------------------------------------------------- MOTOR
const ROUNDS = 300;
function analisarVolta(v, dia) {
  const prob = [];
  if (!v.length) return ['volta vazia'];
  if (v[0].tag !== 'abertura') prob.push('não abre em boas-vindas');
  if (v[v.length - 1].tag !== 'fechamento') prob.push('não fecha no portal');
  const cont = {};
  v.forEach((s) => { cont[s.id] = (cont[s.id] || 0) + 1; });
  Object.entries(cont).forEach(([id, n]) => { const w = (v.find((s) => s.id === id).weight || 1); if (n > w) prob.push(`${id} aparece ${n}x (weight ${w})`); });
  for (let i = 1; i < v.length; i++) {
    const a = v[i - 1], b = v[i];
    if (a.fam === b.fam && !(a.unit && a.unit === b.unit)) prob.push(`famílias coladas ${a.id}/${b.id}`);
    if (a.id === b.id) prob.push(`mesmo slide em sequência ${a.id}`);
  }
  v.forEach((s) => { if (s.dia && !s.dia.includes(dia)) prob.push(`${s.id} fora do dia ${dia}`); });
  // maior intervalo sem QR do portal
  let t = 0, fim = 0, pior = 0;
  v.forEach((s) => { if (s.qr === 'portal') { pior = Math.max(pior, t - fim); fim = t + s.dur; } t += s.dur; });
  pior = Math.max(pior, t - fim);
  if (pior > 360) prob.push(`${pior}s sem QR do portal`);
  return prob;
}
async function testeMotor() {
  console.log('\n# MOTOR');
  for (const dia of [1, 2, 3, 4, 5]) {
    const page = await abrir(`dia=${dia}&seed=teste${dia}`);
    const voltas = await page.evaluate((n) => Array.from({ length: n }, () => window.TV3.buildRound().map((s) => ({ id: s.id, fam: s.fam, dur: s.dur, qr: s.qr, tag: s.tag, unit: s.unit, weight: s.weight, dia: s.dia }))), ROUNDS);
    const problemas = new Set();
    let somaDur = 0, comDica = 0, comArco = 0;
    voltas.forEach((v) => {
      analisarVolta(v, dia).forEach((p) => problemas.add(p));
      somaDur += v.reduce((a, s) => a + s.dur, 0);
      const i = v.findIndex((s) => s.unit === 'arcoA');
      if (i >= 0) { comArco++; if (v.slice(Math.max(0, i - 2), i).some((s) => s.fam === 'C')) comDica++; }
    });
    ok(problemas.size === 0, `dia ${dia}: ${ROUNDS} voltas respeitam abertura, fechamento, famílias alternadas, weight e cadência`, [...problemas].slice(0, 4).join(' | '));
    const media = somaDur / ROUNDS / 60;
    ok(media >= 7 && media <= 12, `dia ${dia}: volta média de ${media.toFixed(1)} min (entre 7 e 12)`);
    ok(comDica / comArco >= 0.95, `dia ${dia}: dica (C) antes do pedido do Portal em ${Math.round(100 * comDica / comArco)}% das voltas`);
    const unicos = new Set(voltas.flat().map((s) => s.id));
    ok(unicos.size >= 25, `dia ${dia}: ${unicos.size} slides diferentes aparecem`);
    await page.context().close();
  }
  // a ordem muda de uma volta para outra
  let page = await abrir('seed=ordem');
  const ordens = await page.evaluate(() => Array.from({ length: 20 }, () => window.TV3.buildRound().map((s) => s.id).join(',')));
  ok(new Set(ordens).size >= 15, `a ordem varia entre voltas (${new Set(ordens).size} ordens em 20)`);
  await page.context().close();
  // dias diferentes trazem dicas diferentes
  const porDia = [];
  for (const d of [1, 2]) { page = await abrir(`dia=${d}`); porDia.push(await page.evaluate(() => window.TV3.eligible().filter((s) => s.fam === 'C').map((s) => s.id).join(','))); await page.context().close(); }
  ok(porDia[0] !== porDia[1], '?dia=2 troca o conjunto de dicas', porDia.join(' / '));
  // overrides e configuração
  page = await abrir('portal=0&seed=p');
  const semPortal = await page.evaluate(() => window.TV3.buildRound().map((s) => ({ fam: s.fam, qr: s.qr })));
  ok(semPortal.length > 0 && !semPortal.some((s) => s.fam === 'A' || s.qr === 'portal'), '?portal=0 esconde a família A e todo QR do Portal');
  await page.context().close();
  page = await abrir('');
  const desligados = await page.evaluate(() => window.TV3.buildRound().map((s) => s.id));
  ok(!desligados.includes('b_wifi') && !desligados.includes('d_graopara'), 'wifi e Grão-Pará ficam fora enquanto a configuração está vazia');
  await page.evaluate(() => { window.TV3.CONFIG.wifiSsid = 'Teste'; window.TV3.CONFIG.fotoGraoPara = 'img/clinica-fachada.webp'; });
  const ligados = await page.evaluate(() => window.TV3.buildRound().map((s) => s.id));
  ok(ligados.includes('b_wifi') && ligados.includes('d_graopara'), 'preencher wifiSsid e fotoGraoPara liga os dois slides');
  await page.context().close();
  page = await abrir('slide=a_tut');
  ok((await page.locator('.tv-slide.active').getAttribute('data-id')) === 'a_tut', '?slide=a_tut fixa o slide');
  await page.context().close();
  // reprodução de verdade, com relógio acelerado
  page = await abrir('exp=teste-exp&dia=3&seed=reproducao&vel=50', { width: 1920, height: 1080 }, { clock: '2026-12-01T16:00:00Z' });
  await page.clock.runFor(60 * 1000);
  const eventos = await page.evaluate(() => (window.dataLayer || []).filter((e) => e.event === 'tv3_slide'));
  const exps = new Set(eventos.map((e) => e.tv3_experiment));
  ok(eventos.length > 20 && exps.size === 1 && exps.has('teste-exp'), `reprodução: ${eventos.length} trocas registradas no dataLayer com o rótulo do experimento`);
  const rounds = [...new Set(eventos.map((e) => e.tv3_round))];
  ok(rounds.length >= 2, `reprodução: passou por ${rounds.length} voltas`);
  const ids = eventos.filter((e) => e.tv3_round === rounds[0]).map((e) => e.tv3_slide_id);
  ok(ids[0] === 'b_boasvindas' && ids[ids.length - 1] === 'a_fecho', 'reprodução: a 1ª volta abre em b_boasvindas e fecha em a_fecho');
  const contador = await page.textContent('#slideCounter');
  ok(/^\d+ \/ \d+$/.test(contador), `contador mostra "${contador}"`);
  await page.context().close();
}

// ---------------------------------------------------------------- LAYOUT
async function testeLayout() {
  console.log('\n# LAYOUT');
  const dir = process.env.TV3_SHOTS || '';
  for (const c of CENARIOS) {
    const page = await abrir(comQuery(c.query, 'dia=1'), c.viewport);
    const slides = await page.evaluate(() => window.TV3.POOL.map((s) => ({ id: s.id, layout: s.layout, qr: s.qr })));
    const estouros = [];
    const visto = new Set();
    for (const sl of slides) {
      await page.evaluate((id) => window.TV3.show(id), sl.id);
      // offsetTop e scrollHeight não mudam com o giro nem com a escala do palco
      const r = await page.evaluate(() => {
        const el = document.querySelector('.tv-slide.active');
        const txt = el.querySelector('.tv-visual-text');
        const act = el.querySelector('.tv-action-card');
        const card = el.querySelector('.tv-visual-card');
        return {
          topo: txt ? txt.offsetTop : 0,
          acao: act ? act.scrollHeight - act.clientHeight : 0,
          cartao: card.scrollHeight - card.clientHeight
        };
      });
      if (r.topo < 0 || r.acao > 1) estouros.push(`${sl.id} (topo ${r.topo}, ação ${r.acao})`);
      const tipo = (sl.layout || 'padrao') + (sl.qr ? '+qr' : '');
      if (dir && !visto.has(tipo)) { visto.add(tipo); await page.screenshot({ path: path.join(dir, `layout-${c.nome.replace(/ /g, '-')}-${tipo}-${sl.id}.png`) }); }
    }
    ok(estouros.length === 0, `nenhum texto estoura o cartão em ${slides.length} slides (${c.nome})`, estouros.join(' | '));
    const imgs = await page.evaluate(() => window.TV3.POOL.filter((s) => s.requires !== 'fotoGraoPara').map((s) => s.image));
    ok(imgs.every((u) => u), `todo slide tem imagem (${c.nome})`);
    await page.context().close();
  }
  await testeRetrato();
}

async function testeRetrato() {
  // foto vertical em cartão horizontal: não pode ser ampliada demais (fica borrada) nem cortar o rosto
  for (const dia of [1, 2]) {
    const page = await abrir(`paisagem&dia=${dia}`, { width: 1920, height: 1080 });
    const ids = await page.evaluate(() => window.TV3.POOL.filter((s) => s.imageFit === 'retrato').map((s) => s.id));
    for (const id of ids) {
      await page.evaluate((i) => window.TV3.show(i), id);
      const r = await page.evaluate(async () => {
        const im = document.querySelector('.tv-slide.active .tv-slide-image');
        if (!im.complete) await new Promise((res) => { im.onload = res; im.onerror = res; });
        const b = im.getBoundingClientRect(), card = document.querySelector('.tv-slide.active .tv-visual-card').getBoundingClientRect();
        return { ampliacao: b.width / im.naturalWidth, largura: b.width / card.width };
      });
      ok(r.ampliacao <= 1.6 && r.largura < 0.6, `${id} (dia ${dia}): foto vertical ampliada ${r.ampliacao.toFixed(2)}x e ocupa ${Math.round(r.largura * 100)}% do cartão`);
    }
    await page.context().close();
  }
}

// ---------------------------------------------------------------- TAMANHOS (TV de 43" em pé, assentos a 3 a 5 m)
// 1080 px de palco = ~54 cm (20 px por cm). Letra >= distância/200: a 4 m são 2 cm, ~40 px.
async function testeTamanhos() {
  console.log('\n# TAMANHOS (retrato)');
  for (const c of CENARIOS.filter((x) => x.nome !== 'paisagem')) {
    const page = await abrir(comQuery(c.query, 'dia=1'), c.viewport);
    const slides = await page.evaluate(() => window.TV3.POOL.map((s) => s.id));
    const problemas = [];
    for (const id of slides) {
      await page.evaluate((i) => window.TV3.show(i), id);
      const r = await page.evaluate(() => {
        const el = document.querySelector('.tv-slide.active');
        const menores = [];
        el.querySelectorAll('*').forEach((n) => {
          if (n.closest('svg') || n.getClientRects().length === 0) return;
          if (![...n.childNodes].some((k) => k.nodeType === 3 && k.textContent.trim())) return;
          const fs = parseFloat(getComputedStyle(n).fontSize);
          if (fs < 26) menores.push(`${n.className || n.tagName} ${fs}px`);
        });
        const tam = (sel) => [...el.querySelectorAll(sel)].filter((n) => n.getClientRects().length).map((n) => parseFloat(getComputedStyle(n).fontSize));
        return { menores, sub: tam('.tv-subtext'), head: tam('.tv-headline'), quote: tam('.tv-quote'), qr: [...el.querySelectorAll('.tv-qr-box')].map((n) => n.offsetWidth), grande: el.classList.contains('qrgrande') };
      });
      if (r.menores.length) problemas.push(`${id}: letra pequena ${r.menores.slice(0, 2).join(', ')}`);
      if (r.sub.some((v) => v < 38)) problemas.push(`${id}: subtexto ${Math.min(...r.sub)}px (mínimo 38)`);
      if (r.head.some((v) => v < 60)) problemas.push(`${id}: título ${Math.min(...r.head)}px (mínimo 60)`);
      if (r.quote.some((v) => v < 60)) problemas.push(`${id}: frase ${Math.min(...r.quote)}px (mínimo 60)`);
      if (r.qr.some((v) => v < (r.grande ? 520 : 440))) problemas.push(`${id}: QR de ${Math.min(...r.qr)}px (mínimo ${r.grande ? 520 : 440})`);
    }
    ok(problemas.length === 0, `${c.nome}: letras e QR nos tamanhos mínimos em ${slides.length} slides`, problemas.slice(0, 5).join(' | '));
    // cabeçalho e rodapé: letra legível e nada saindo da faixa
    const f = await page.evaluate(() => {
      const fonte = (sel) => parseFloat(getComputedStyle(document.querySelector(sel)).fontSize);
      const h = document.querySelector('.tv-header'), ft = document.querySelector('.tv-footer');
      return { sub: fonte('.tv-brand-sub'), data: fonte('.tv-clock-date'), rodape: fonte('.tv-amenity-item'), contador: fonte('.tv-slide-counter'), hx: h.scrollWidth - h.clientWidth, fx: ft.scrollWidth - ft.clientWidth };
    });
    ok(f.sub >= 20 && f.data >= 20 && f.rodape >= 24 && f.contador >= 24, `${c.nome}: cabeçalho e rodapé com letra mínima (sub ${f.sub}, data ${f.data}, rodapé ${f.rodape})`);
    ok(f.hx <= 1 && f.fx <= 1, `${c.nome}: cabeçalho e rodapé sem estourar a largura`, `${f.hx}/${f.fx}`);
    await page.context().close();
  }
}

// ---------------------------------------------------------------- FOTOS
async function testeFotos() {
  console.log('\n# FOTOS');
  for (const dia of [1, 3]) {
    const page = await abrir(`paisagem&dia=${dia}&seed=fotos${dia}`, { width: 1920, height: 1080 });
    const seq = await page.evaluate(() => {
      const out = [];
      for (let r = 0; r < 4; r++) {
        window.TV3.buildRound().forEach((s) => {
          window.TV3.show(s.id);
          out.push({ id: s.id, n: (s.images || [s.image]).length, src: document.querySelector('.tv-slide.active .tv-slide-image').getAttribute('src') });
        });
      }
      return out;
    });
    const repetidas = [];
    for (let i = 1; i < seq.length; i++) if (seq[i].n > 1 && seq[i].src === seq[i - 1].src) repetidas.push(`${seq[i - 1].id} > ${seq[i].id}`);
    ok(repetidas.length === 0, `dia ${dia}: nenhum slide repete a foto do slide anterior (${seq.length} slides vistos)`, repetidas.slice(0, 4).join(' | '));
    const fotos = new Set(seq.map((x) => x.src));
    // o acervo real tem só 4 fotos da clínica (11 a 12 no total por dia); abaixo de 10 é sinal de que a rotação quebrou
    ok(fotos.size >= 10, `dia ${dia}: ${fotos.size} fotos diferentes aparecem`);
    await page.context().close();
  }
  // os slides do Playground e do Circuito não caem todos na mesma foto, em nenhum dia do ciclo
  for (const dia of [1, 2, 3, 4, 5]) {
    const page = await abrir(`paisagem&dia=${dia}`, { width: 1920, height: 1080 });
    const d = await page.evaluate(() => window.TV3.POOL.filter((s) => s.fam === 'D' && s.requires !== 'fotoGraoPara').map((s) => { window.TV3.show(s.id); return document.querySelector('.tv-slide.active .tv-slide-image').getAttribute('src'); }));
    ok(new Set(d).size >= 5, `dia ${dia}: os ${d.length} slides do Playground e do Circuito usam ${new Set(d).size} fotos diferentes (mínimo 5)`);
    await page.context().close();
  }
}

// ---------------------------------------------------------------- FOTOS NOVAS (PR das fotos da fotógrafa: assets/fa-fotos.js)
// Manifesto de mentira: uma foto de cada tema, algumas verticais. Nada de rede de verdade.
const SB = 'https://ivjvpdzsfjdpyabbzzuj.supabase.co/storage/v1/object/public/fotos-site/';
const TEMAS_FALSOS = ['piscina_bolinhas', 'oficina_arte', 'acolhimento', 'brincadeira', 'cantinho_calma', 'fachada_playground', 'equipe',
  'frota_carrinhos', 'quiosque_circuito', 'pelucia_motorizada', 'crianca_dirigindo', 'clinica_sensorial'];
// cada tema tem uma foto horizontal e uma vertical (-v): a vertical tentaria entrar em slide com QR se a regra falhasse
const FALSAS = TEMAS_FALSOS.flatMap((t, i) => [[t, 1600, 1067, `f-${i}-h`], [t, 1067, 1600, `f-${i}-v`]]);
async function abrirComFotosNovas(query, viewport) {
  const ctx = await browser.newContext({ viewport });
  const hoje = new Date().toISOString();
  await ctx.route(SB + '**', async (route) => {
    const u = route.request().url();
    if (/manifest\.json/.test(u)) {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ fotos: FALSAS.map(([tema, w, h, id]) => ({ id, tema, w, h, tv: true, site: false, unidade: 'parque', src: id, alt: 'foto ' + id, pos: '40% 30%', adicionada: hoje })) }) });
    }
    const webp = /\.webp/.test(u);
    return route.fulfill({ contentType: webp ? 'image/webp' : 'image/jpeg', body: fs.readFileSync(path.join(ROOT, 'img', webp ? 'inclusao-cantinho-leitura.webp' : 'playground-fachada-recepcao.jpg')) });
  });
  const page = await ctx.newPage();
  const manifesto = page.waitForResponse((r) => /manifest\.json/.test(r.url()));
  await page.goto(`${BASE}/tv3.html?debug=1&dia=1${query ? '&' + query : ''}`);
  await manifesto;
  await page.waitForTimeout(300);
  return page;
}

async function testeFotosNovas() {
  console.log('\n# FOTOS NOVAS (manifesto de mentira)');
  for (const c of CENARIOS) {
    const page = await abrirComFotosNovas(c.query, c.viewport);
    const slides = await page.evaluate(() => window.TV3.POOL.filter((s) => s.requires !== 'fotoGraoPara').map((s) => ({ id: s.id, retrato: s.imageFit === 'retrato', qr: !!(s.qr && window.TV3.QR[s.qr]), layout: s.layout || 'padrao' })));
    const vistos = [];
    const estouros = [];
    for (const sl of slides) {
      await page.evaluate((id) => window.TV3.show(id), sl.id);
      const r = await page.evaluate(() => {
        const el = document.querySelector('.tv-slide.active');
        const im = el.querySelector('.tv-slide-image');
        const txt = el.querySelector('.tv-visual-text');
        const act = el.querySelector('.tv-action-card');
        const card = el.querySelector('.tv-visual-card');
        return { src: im.getAttribute('src'), classeRetrato: el.classList.contains('retrato'), pos: im.style.objectPosition, topo: txt ? txt.offsetTop : 0, acao: act ? act.scrollHeight - act.clientHeight : 0, cartao: card.scrollHeight - card.clientHeight };
      });
      vistos.push({ ...sl, ...r, nova: r.src.startsWith(SB) });
      if (r.topo < 0 || r.acao > 1) estouros.push(`${sl.id} (topo ${r.topo}, ação ${r.acao})`);
    }
    const novas = vistos.filter((v) => v.nova);
    // o manifesto falso tem ~13 fotos e cada uma entra uma vez por volta: 6 já prova a troca
    ok(novas.length >= 6, `${c.nome}: ${novas.length} de ${vistos.length} slides passam a mostrar foto nova`);
    ok(novas.filter((v) => !/-v\.webp/.test(v.src)).every((v) => v.pos === '40% 30%'), `${c.nome}: a foto nova horizontal usa o foco (object-position) do catálogo`);
    const verticais = novas.filter((v) => /-v\.webp/.test(v.src));
    ok(verticais.length > 0 && verticais.every((v) => !v.qr && v.layout === 'padrao' && v.classeRetrato), `${c.nome}: foto vertical só em slide sem QR e com a classe retrato (${verticais.length} vistas)`, verticais.map((v) => v.id).join(','));
    ok(vistos.filter((v) => v.qr).every((v) => !/-v\.webp/.test(v.src)), `${c.nome}: slide com QR nunca recebe foto vertical`);
    const fixos = vistos.filter((v) => v.retrato);
    ok(fixos.length > 0 && fixos.every((v) => !v.nova), `${c.nome}: slide de retrato (imageFit) fica com a foto fixa (${fixos.map((v) => v.id).join(',')})`);
    const srcs = novas.map((v) => v.src);
    ok(new Set(srcs).size === srcs.length, `${c.nome}: a mesma foto nova não repete dentro de uma volta (${srcs.length} fotos)`, srcs.join(' '));
    ok(estouros.length === 0, `${c.nome}: nenhum texto estoura com as fotos novas em ${vistos.length} slides`, estouros.join(' | '));
    // volta seguinte: o cursor anda e as fotos novas voltam a ser distribuídas
    await page.evaluate(() => { window.TV3.state.n++; });
    const volta2 = await page.evaluate(() => window.TV3.POOL.filter((s) => s.id.startsWith('d_')).slice(0, 3).map((s) => { window.TV3.show(s.id); return document.querySelector('.tv-slide.active .tv-slide-image').getAttribute('src'); }));
    ok(volta2.some((u) => u.startsWith(SB)), `${c.nome}: na volta seguinte as fotos novas continuam a entrar`);
    await page.context().close();
  }
}

// ---------------------------------------------------------------- COPY
async function testeCopy() {
  console.log('\n# COPY');
  const { execFileSync } = await import('node:child_process');
  const run = (args) => { try { execFileSync('python3', args, { cwd: ROOT, stdio: 'pipe' }); return ''; } catch (e) { return String(e.stderr || e.stdout || e.message).trim().split('\n').slice(0, 3).join(' | '); } };
  const r = run(['scripts/tv3-pool.py', '--check']);
  ok(!r, 'conteudo/tv3-slides.json é válido e está embutido no tv3.html', r);
  const q = run(['scripts/tv3-qr.py', '--check']);
  if (/No module named 'segno'/.test(q)) console.log('pulado  scripts/tv3-qr.py --check (instale segno: pip install segno)');
  else ok(!q, 'QR do tv3.html em dia com scripts/tv3-qr.py', q);
  const page = await abrir('');
  const textos = await page.evaluate(() => JSON.stringify(window.TV3.POOL) + document.body.innerText);
  const proibidas = /promessa|confian[çc]a|oferta|garantid|\bcura\b|crian[çc]a (normal|especial|problem)|IASEP|PROASA/i;
  ok(!proibidas.test(textos), 'nenhuma palavra proibida nos textos');
  ok(!/!/.test(textos.replace(/<[^>]+>/g, '').replace(/!important/g, '')), 'nenhuma exclamação nos textos');
  ok(!/Mural da Fam[ií]lia|98606|facaamigos2026|FacaAmigos_Pacientes/.test(textos), 'nenhum fato inventado (Mural da Família, telefone e Wi-Fi antigos)');
  await page.context().close();
}

// ---------------------------------------------------------------- ÁUDIO
// Belém é UTC-3. 2026-12-01 é terça; 2026-12-05 sábado; 2026-12-06 domingo.
async function abrirComSom(query, isoUtc, { rejeitar = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  await ctx.addInitScript((rej) => {
    window.__som = { plays: [], pauses: 0 };
    HTMLMediaElement.prototype.play = function () {
      window.__som.plays.push(this.getAttribute('src'));
      if (rej) return Promise.reject(new DOMException('bloqueado', 'NotAllowedError'));
      Object.defineProperty(this, 'paused', { configurable: true, get: () => false });
      return Promise.resolve();
    };
    HTMLMediaElement.prototype.pause = function () {
      window.__som.pauses++;
      Object.defineProperty(this, 'paused', { configurable: true, get: () => true });
    };
  }, rejeitar);
  const page = await ctx.newPage();
  await page.clock.install({ time: new Date(isoUtc) });
  await page.goto(`${BASE}/tv3.html?debug=1${query ? '&' + query : ''}`);
  return page;
}
const plays = (page) => page.evaluate(() => window.__som.plays.slice());

async function testeAudio() {
  console.log('\n# ÁUDIO');
  const casos = [
    ['terça 10h05 (música)', '2026-12-01T13:05:00Z', '', true],
    ['terça 10h25 (pausa do ciclo)', '2026-12-01T13:25:00Z', '', false],
    ['terça 10h35 (música de novo)', '2026-12-01T13:35:00Z', '', true],
    ['terça 19h (fora do expediente)', '2026-12-01T22:00:00Z', '', false],
    ['terça 7h50 (antes de abrir)', '2026-12-01T10:50:00Z', '', false],
    ['sábado 9h (expediente)', '2026-12-05T12:00:00Z', '', true],
    ['sábado 13h (fora do expediente)', '2026-12-05T16:00:00Z', '', false],
    ['domingo 11h (fechado)', '2026-12-06T14:00:00Z', '', false],
    ['terça 10h05 com ?som=0', '2026-12-01T13:05:00Z', 'som=0', false]
  ];
  for (const [nome, iso, q, esperaTocar] of casos) {
    const page = await abrirComSom(q, iso);
    const p = await plays(page);
    const certo = esperaTocar ? p.length >= 1 && /^audio\/musica\/[a-z0-9-]+\.mp3$/.test(p[0]) : p.length === 0;
    ok(certo, `${nome}: ${esperaTocar ? 'toca uma faixa do salão' : 'em silêncio'}`, JSON.stringify(p));
    await page.context().close();
  }
  // o ciclo muda com o relógio andando
  let page = await abrirComSom('', '2026-12-01T13:19:57Z');
  ok((await plays(page)).length >= 1, 'ciclo: toca às 10h19m57s');
  await page.clock.runFor(15000);
  const pausou = await page.evaluate(() => window.__som.pauses);
  ok(pausou >= 1, 'ciclo: pausa depois das 10h20 (silêncio de 10 min)', `pauses=${pausou}`);
  await page.context().close();
  page = await abrirComSom('', '2026-12-01T13:29:57Z');
  ok((await plays(page)).length === 0, 'ciclo: em silêncio às 10h29m57s');
  await page.clock.runFor(15000);
  ok((await plays(page)).length >= 1, 'ciclo: volta a tocar depois das 10h30');
  await page.context().close();
  // volume baixo e tecla S
  page = await abrirComSom('', '2026-12-01T13:05:00Z');
  await page.clock.runFor(3000);
  const vol = await page.evaluate(() => window.TV3.som.audio.volume);
  ok(Math.abs(vol - 0.12) < 0.005, `volume final da trilha é ${vol.toFixed(2)} (esperado 0,12)`);
  await page.keyboard.press('s');
  await page.clock.runFor(3000);
  ok((await page.evaluate(() => window.__som.pauses)) >= 1, 'tecla S desliga a trilha');
  ok((await page.evaluate(() => localStorage.getItem('fa-tv3-som'))) === '0', 'a escolha fica salva na TV');
  await page.context().close();
  // aviso de som bloqueado só dentro do HUD
  page = await abrirComSom('', '2026-12-01T13:05:00Z', { rejeitar: true });
  await page.clock.runFor(1000);
  const aviso = await page.evaluate(() => {
    const achados = [...document.querySelectorAll('body *')].filter((el) => el.children.length === 0 && !/^(SCRIPT|STYLE)$/.test(el.tagName) && /liberar o som/i.test(el.textContent));
    return { n: achados.length, tudoNoHud: achados.every((el) => el.closest('.tv-hud')), hudOculto: getComputedStyle(document.querySelector('.tv-hud')).opacity === '0' };
  });
  ok(aviso.n === 1 && aviso.tudoNoHud && aviso.hudOculto, 'som bloqueado: o aviso existe só dentro do HUD, que fica oculto para a sala', JSON.stringify(aviso));
  await page.context().close();
  // as 20 faixas existem
  page = await abrir('');
  const faltam = await page.evaluate(async () => {
    const r = await Promise.all(window.TV3.FAIXAS.map((u) => fetch(u, { method: 'HEAD' }).then((x) => (x.ok ? null : u)).catch(() => u)));
    return r.filter(Boolean);
  });
  ok(faltam.length === 0, `as ${20} faixas da trilha existem`, faltam.join(','));
  const n = await page.evaluate(() => window.TV3.FAIXAS.length);
  ok(n === 20, `a trilha tem ${n} faixas`);
  await page.context().close();
}

const testes = { giro: testeGiro, qr: testeQR, motor: testeMotor, layout: testeLayout, tamanhos: testeTamanhos, fotos: testeFotos, fotosnovas: testeFotosNovas, copy: testeCopy, audio: testeAudio };
try {
  for (const [nome, fn] of Object.entries(testes)) if (only === 'todos' || only === nome) await fn();
} finally {
  await browser.close();
  srv.kill();
}
console.log(`\n${total - falhas}/${total} verificações ok`);
process.exit(falhas ? 1 : 0);

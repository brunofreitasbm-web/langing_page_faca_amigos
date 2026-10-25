/* Fotos novas da fotógrafa (Google Drive → scripts/fotos/sync.mjs → Supabase Storage).
 *
 * window.FAFotos.carregar({ tv: 'tv2' })            → Promise<[foto]> só as liberadas para aquela TV
 * window.FAFotos.carregar({ site: true, unidades }) → Promise<[foto]> só as aprovadas para o site
 * window.FAFotos.vigiar(filtro, fn, ms)             → chama fn(fotos) agora e de novo a cada `ms` quando mudar
 *
 * Cada foto: { id, webp, jpg, webpP, w, h, unidade, alt, rotulo, legenda, kicker, headline, plano, sfx, pos }
 * Falha de rede nunca derruba a página: volta lista vazia e a página segue com as fotos fixas.
 * Desligar numa tela: ?fotos=0 na URL.
 */
(function () {
  'use strict';
  var BASE = 'https://ivjvpdzsfjdpyabbzzuj.supabase.co/storage/v1/object/public/fotos-site/';
  var desligado = /[?&]fotos=0\b/.test(location.search);

  function baixar() {
    if (desligado || !window.fetch) return Promise.resolve([]);
    // Um parâmetro por minuto: fura o cache do CDN no máximo uma vez por minuto por tela.
    var url = BASE + 'manifest.json?m=' + Math.floor(Date.now() / 60000);
    var timeout = new Promise(function (ok) { setTimeout(function () { ok(null); }, 8000); });
    var req = fetch(url, { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
    return Promise.race([req, timeout]).then(function (m) {
      return m && m.fotos && m.fotos.length ? m.fotos.map(montar) : [];
    });
  }

  function montar(f) {
    return {
      id: f.id, w: f.w, h: f.h, unidade: f.unidade, tv: f.tv, site: f.site,
      webp: BASE + f.src + '.webp', jpg: BASE + f.src + '.jpg', webpP: BASE + f.src + '-p.webp',
      alt: f.alt || '', rotulo: f.rotulo || '', legenda: f.legenda || '',
      kicker: f.kicker || '', headline: f.headline || '', plano: f.plano, sfx: f.sfx, pos: f.pos || '50% 45%'
    };
  }

  function filtrar(fotos, filtro) {
    filtro = filtro || {};
    return fotos.filter(function (f) {
      if (filtro.tv && f.tv !== filtro.tv) return false;
      if (filtro.site && !f.site) return false;
      if (filtro.unidades && filtro.unidades.indexOf(f.unidade) < 0) return false;
      return true;
    });
  }

  function carregar(filtro) {
    return baixar().then(function (fotos) { return filtrar(fotos, filtro); });
  }

  function vigiar(filtro, fn, ms) {
    var ultimo = null;
    function rodada() {
      carregar(filtro).then(function (fotos) {
        var chave = fotos.map(function (f) { return f.id; }).join(',');
        if (chave !== ultimo) { ultimo = chave; try { fn(fotos); } catch (e) { /* a página segue */ } }
      });
    }
    rodada();
    if (!desligado) setInterval(rodada, ms || 10 * 60 * 1000);
  }

  /* Escapa texto puro para atributo/HTML (use no alt). Rótulo, legenda, kicker e headline já vêm do
     sincronizador como HTML seguro (escapado, só com <em>/<br>): entram direto, sem esc(). */
  function esc(t) {
    return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function figuraHtml(f) {
    return '<figure data-foto="' + esc(f.id) + '"><picture>' +
      '<source type="image/webp" srcset="' + f.webpP + ' 720w, ' + f.webp + ' 1600w" sizes="(max-width: 760px) 50vw, 380px">' +
      '<img src="' + f.jpg + '" width="' + (f.w | 0) + '" height="' + (f.h | 0) + '" alt="' + esc(f.alt) +
      '" loading="lazy" decoding="async" style="object-position:' + esc(f.pos) + '"></picture>' +
      (f.rotulo ? '<figcaption>' + f.rotulo + '</figcaption>' : '') + '</figure>';
  }

  /* Landings: põe as fotos aprovadas numa grade que já existe.
     onde: 'inicio' | 'apos-primeiro' (mantém a foto de destaque) | 'fim'. Devolve quantas entraram. */
  function galeria(grade, filtro, opcoes) {
    opcoes = opcoes || {};
    if (!grade) return Promise.resolve(0);
    return carregar(filtro).then(function (fotos) {
      fotos = fotos.slice(0, opcoes.max || 6);
      if (!fotos.length) return 0;
      var html = fotos.map(figuraHtml).join('');
      if (opcoes.onde === 'inicio') grade.insertAdjacentHTML('afterbegin', html);
      else if (opcoes.onde === 'apos-primeiro' && grade.firstElementChild) grade.firstElementChild.insertAdjacentHTML('afterend', html);
      else grade.insertAdjacentHTML('beforeend', html);
      return fotos.length;
    });
  }

  window.FAFotos = { carregar: carregar, vigiar: vigiar, galeria: galeria, figuraHtml: figuraHtml, esc: esc, base: BASE };
})();

/*
 * FaçaAmigos: rastreamento + consentimento (LGPD) num arquivo só.
 * Incluir no <head> de cada página pública, antes de qualquer outro script:
 *   <script src="/assets/fa-track.js"></script>
 *
 * O que faz
 *  1. Consent Mode v2: tudo começa NEGADO. GTM e GA4 carregam em modo sem cookies até a pessoa aceitar no
 *     banner. (Clarity e Contentsquare, gravação de sessão, foram removidos em 22/09/2026.)
 *  2. Origem do visitante: guarda a primeira origem (utm_*, gclid, fbclid, src, sck, referrer) e a mais recente,
 *     num cookie do domínio raiz — assim ela sobrevive ao salto entre o hub e o subdomínio do playground.
 *     Links internos deixam de sobrescrever a origem real (ex.: o banner do hub não vira "site").
 *     window.faOrigin() devolve a origem para os formulários.
 *  3. Eventos: whatsapp_click, begin_checkout (Hotmart), file_download, scroll_depth 50/90.
 *  4. client_id do GA4 até o checkout: guia.html/codigo.html pegam o xcod de faOrigin() e mandam junto no link
 *     da Hotmart. O hotmart-webhook lê de volta e manda a compra pro GA4 via Measurement Protocol — sem isso,
 *     nenhuma venda aparecia ligada à campanha que trouxe a pessoa.
 *
 * IDs em um lugar só (antes estavam copiados em 9 arquivos).
 */
(function () {
  'use strict';

  // ATENÇÃO — dois containers GTM carregam em todas as páginas (gtm e gtm2). Isso NÃO foi verificado no painel
  // do GTM: se os dois tiverem a mesma tag de GA4/Meta/Ads, todo evento é contado em dobro (sessões, conversões
  // e custo por conversão saem errados). Antes de mexer, conferir em tagmanager.google.com quais tags existem em
  // cada um; se um estiver vazio ou for legado, remover daqui E do noscript das páginas (grep pelo ID). Enquanto
  // a checagem não acontecer, os dois ficam como estão — remover às cegas apaga disparo de conversão em produção.
  var IDS = { gtm: 'GTM-PN5D2BTS', gtm2: 'GTM-NPDJ58XR', ga4: 'G-37G5XLBXKG' };
  var CONSENT_KEY = 'fa_consent';
  var ORIGIN_KEY = 'fa_origin';
  var PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'fbclid', 'src', 'sck'];
  var ROOT_DOMAIN = 'institutofacaamigos.com.br';
  var INTERNAL_HOSTS = ['institutofacaamigos.com.br', 'www.institutofacaamigos.com.br', 'playground.institutofacaamigos.com.br'];
  var WHATSAPP_UNITS = { '5591991782027': 'clinica', '5591992347673': 'playground_circuito' };
  var CHECKOUTS = {
    M107692257Y: { id: 'guia', name: 'O Brincar com Propósito', value: 149 },
    // O preço não aparece na página /codigo (decisão do projeto), mas o begin_checkout precisa do valor: sem ele
    // o Google Ads e o Meta não conseguem otimizar por ROAS nem calcular custo por conversão desse produto.
    // Se o preço mudar na Hotmart, mudar aqui também.
    V107698297N: { id: 'codigo', name: 'O Código do Desenvolvimento Infantil', value: 47 }
  };

  function read(key) { try { return window.localStorage.getItem(key); } catch (e) { return null; } }
  function write(key, val) { try { window.localStorage.setItem(key, val); } catch (e) { /* modo privado */ } }

  // ---------- origem compartilhada entre os subdomínios ----------
  // O localStorage é isolado por origem: o que institutofacaamigos.com.br grava, playground.institutofacaamigos.com.br
  // NÃO lê. Quem entra por anúncio no hub e vai para o playground perdia a origem no meio do caminho. Por isso a
  // origem passa a viver num cookie de primeira parte no domínio raiz (.institutofacaamigos.com.br), que todos os
  // subdomínios enxergam. O localStorage continua como espelho: serve de leitura para quem já tinha origem gravada
  // antes desta mudança e de reserva quando o cookie não está disponível (localhost, file://, cookies bloqueados).
  var ORIGIN_MAX_AGE = 15552000; // 180 dias
  var COOKIE_LIMIT = 3500;       // margem para o limite de ~4KB por cookie

  function cookieDomain() {
    var h = window.location.hostname;
    if (h === ROOT_DOMAIN || h.slice(-(ROOT_DOMAIN.length + 1)) === '.' + ROOT_DOMAIN) return '.' + ROOT_DOMAIN;
    return ''; // localhost/preview: cookie de host mesmo
  }

  function readCookie(key) {
    try {
      var parts = document.cookie ? document.cookie.split('; ') : [];
      for (var i = 0; i < parts.length; i++) {
        var eq = parts[i].indexOf('=');
        if (eq > 0 && parts[i].slice(0, eq) === key) return decodeURIComponent(parts[i].slice(eq + 1));
      }
    } catch (e) { /* cookies bloqueados */ }
    return null;
  }

  function writeCookie(key, val) {
    var encoded = encodeURIComponent(val);
    if (encoded.length > COOKIE_LIMIT) return false;
    try {
      var d = cookieDomain();
      document.cookie = key + '=' + encoded + '; path=/; max-age=' + ORIGIN_MAX_AGE + '; SameSite=Lax' +
        (d ? '; domain=' + d : '') + (window.location.protocol === 'https:' ? '; Secure' : '');
      return true;
    } catch (e) { return false; }
  }

  // Lê o cookie primeiro; cai no localStorage para não perder a origem de quem já navegava antes.
  function readOrigin() { var v = readCookie(ORIGIN_KEY); return v !== null && v !== '' ? v : read(ORIGIN_KEY); }
  function writeOrigin(val) { writeCookie(ORIGIN_KEY, val); write(ORIGIN_KEY, val); }

  // client_id do GA4 (cookie _ga, formato GA1.1.<id1>.<id2>; client_id = "<id1>.<id2>"). Serve para levar a
  // compra até o Measurement Protocol no hotmart-webhook: a Hotmart não devolve o client_id sozinha, então ele
  // viaja disfarçado no campo xcod (criado pela Hotmart para isso mesmo — "código externo") até o checkout, e
  // volta no webhook da compra. Sem isso, toda venda aparece no GA4 como sessão desconhecida, sem UTM nenhuma.
  function ga4ClientId() {
    var raw = readCookie('_ga');
    if (!raw) return '';
    var m = /^GA1\.\d+\.(\d+\.\d+)$/.exec(raw);
    return m ? m[1] : '';
  }

  // ---------- dataLayer / gtag ----------
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;
  function track(name, params) {
    var e = { event: name };
    for (var k in params) if (Object.prototype.hasOwnProperty.call(params, k)) e[k] = params[k];
    window.dataLayer.push(e);
  }
  window.faTrack = track;

  // ---------- consentimento ----------
  var DENIED = { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied' };
  var GRANTED = { ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted', analytics_storage: 'granted' };
  gtag('consent', 'default', Object.assign({ wait_for_update: 500 }, DENIED));

  function loadScript(src, attrs) {
    var s = document.createElement('script');
    s.async = true; s.src = src;
    for (var k in attrs) s.setAttribute(k, attrs[k]);
    (document.head || document.documentElement).appendChild(s);
  }
  // Clarity e Contentsquare (gravação de sessão) foram removidos por pedido explícito — não carregam mais
  // nem com consentimento dado. O Consent Mode continua igual para GTM/GA4/Ads.
  function applyConsent(choice) {
    if (choice === 'all') gtag('consent', 'update', GRANTED);
  }
  function setConsent(choice) {
    write(CONSENT_KEY, choice);
    applyConsent(choice);
    var bar = document.getElementById('fa-consent');
    if (bar) bar.remove();
    document.documentElement.classList.remove('fa-consent-open');
    track('consent_update', { consent_choice: choice });
  }

  // ---------- GTM + GA4 (sempre, em modo sem cookies até o aceite) ----------
  window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
  loadScript('https://www.googletagmanager.com/gtm.js?id=' + IDS.gtm);
  loadScript('https://www.googletagmanager.com/gtm.js?id=' + IDS.gtm2);
  loadScript('https://www.googletagmanager.com/gtag/js?id=' + IDS.ga4);
  gtag('js', new Date());
  // linker: sem isso o GA4 abre sessão nova no salto hub -> playground e registra o próprio subdomínio como
  // referral, matando a atribuição do tráfego pago. accept_incoming fecha o outro lado do mesmo problema.
  gtag('config', IDS.ga4, { linker: { domains: INTERNAL_HOSTS, accept_incoming: true } });
  applyConsent(read(CONSENT_KEY));

  // ---------- origem do visitante ----------
  function isInternalHost(h) { return INTERNAL_HOSTS.indexOf(h) !== -1; }

  function captureOrigin() {
    var q = new URLSearchParams(window.location.search);
    var found = {};
    var has = false;
    PARAMS.forEach(function (p) { var v = q.get(p); if (v) { found[p] = v.slice(0, 120); has = true; } });
    var stored = {};
    try { stored = JSON.parse(readOrigin() || '{}') || {}; } catch (e) { stored = {}; }

    var ref = '';
    try {
      var rh = document.referrer ? new URL(document.referrer).hostname : '';
      ref = rh && !isInternalHost(rh) ? rh : '';
    } catch (e) { ref = ''; }

    var snapshot = { params: found, referrer: ref, landing: window.location.pathname, ts: Date.now() };
    // O first-touch nunca é sobrescrito. O "last" só muda quando chega parâmetro novo, ou quando vem de outro
    // site e ainda não há origem com parâmetros; navegar entre páginas do próprio site não zera nada.
    var lastHasParams = stored.last && Object.keys(stored.last.params || {}).length > 0;
    if (!stored.first) stored.first = snapshot;
    if (has || (ref && !lastHasParams)) stored.last = snapshot;
    writeOrigin(JSON.stringify(stored));
    return stored;
  }
  var originStore = captureOrigin();

  // Origem para formulários: a mais recente que tenha parâmetros; senão a primeira.
  window.faOrigin = function () {
    var pick = (originStore.last && Object.keys(originStore.last.params).length) ? originStore.last
      : (originStore.first || { params: {}, referrer: '', landing: '' });
    var p = pick.params || {};
    var o = {
      utm_source: p.utm_source || pick.referrer || '',
      utm_medium: p.utm_medium || (pick.referrer ? 'referral' : ''),
      utm_campaign: p.utm_campaign || '',
      utm_content: p.utm_content || '',
      utm_term: p.utm_term || '',
      gclid: p.gclid || '',
      fbclid: p.fbclid || '',
      referrer: pick.referrer || '',
      first_landing: (originStore.first && originStore.first.landing) || ''
    };
    // xcod carrega o client_id do GA4 até o checkout da Hotmart (ver ga4ClientId acima). Só entra se a página
    // não tiver definido outro xcod na URL — guia.html/codigo.html priorizam ?xcod=... quando presente.
    var gaId = ga4ClientId();
    if (gaId) o.xcod = 'ga.' + gaId;
    return o;
  };

  // Links internos: leva a origem real adiante em vez de deixar o banner sobrescrever com utm_source=site.
  function carryOrigin(a) {
    var u;
    try { u = new URL(a.href, window.location.href); } catch (e) { return; }
    if (!isInternalHost(u.hostname) && u.hostname !== window.location.hostname) return;
    if (/\.(pdf|jpe?g|png|webp|mp4)$/i.test(u.pathname)) return;
    var o = window.faOrigin();
    if (!o.utm_source) return; // visita direta: não inventa origem nos links
    var oldSource = u.searchParams.get('utm_source');
    var oldMedium = u.searchParams.get('utm_medium');
    var oldCampaign = u.searchParams.get('utm_campaign');
    if (oldSource && !u.searchParams.get('utm_content') && oldSource === 'site') {
      // Guarda o "onde clicou" dentro do site em utm_content, em vez de perder.
      u.searchParams.set('utm_content', [oldMedium, oldCampaign].filter(Boolean).join('_'));
    }
    ['utm_source', 'utm_medium', 'utm_campaign', 'gclid', 'fbclid'].forEach(function (k) {
      if (o[k] && (!u.searchParams.get(k) || (oldSource === 'site' && k.indexOf('utm_') === 0 && k !== 'utm_content'))) {
        u.searchParams.set(k, o[k]);
      }
    });
    if (o.utm_term && !u.searchParams.get('utm_term')) u.searchParams.set('utm_term', o.utm_term);
    a.href = u.toString();
  }

  // ---------- eventos por delegação ----------
  function sectionOf(el) {
    var s = el.closest('section[id], [data-section], footer, header, nav');
    return s ? (s.getAttribute('data-section') || s.id || s.tagName.toLowerCase()) : '';
  }

  function onClick(ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest('a[href]') : null;
    if (!a) return;
    var href = a.getAttribute('href') || '';

    carryOrigin(a);

    var wa = href.match(/(?:wa\.me\/|phone=)(\d{10,15})/);
    if (wa) {
      track('whatsapp_click', {
        unidade: WHATSAPP_UNITS[wa[1]] || wa[1],
        pagina: window.location.pathname,
        secao: sectionOf(a),
        link_text: (a.textContent || '').trim().slice(0, 60)
      });
      return;
    }

    var hm = href.match(/pay\.hotmart\.com\/([A-Z0-9]+)/i);
    if (hm) {
      var item = CHECKOUTS[hm[1].toUpperCase()] || { id: hm[1], name: hm[1] };
      var ecommerce = { currency: 'BRL', items: [{ item_id: item.id, item_name: item.name }] };
      if (item.value) { ecommerce.value = item.value; ecommerce.items[0].price = item.value; }
      window.dataLayer.push({ ecommerce: null });
      track('begin_checkout', { ecommerce: ecommerce, pagina: window.location.pathname, secao: sectionOf(a) });
      return;
    }

    if (/\.pdf(\?|$)/i.test(href)) {
      track('file_download', { file_name: href.split('/').pop().split('?')[0], pagina: window.location.pathname });
    }
  }
  document.addEventListener('click', onClick, true);
  document.addEventListener('auxclick', onClick, true);

  // scroll_depth 50 e 90, uma vez por página
  var sent = {};
  function onScroll() {
    var h = document.documentElement;
    var total = h.scrollHeight - h.clientHeight;
    if (total <= 0) return;
    var pct = (window.pageYOffset || h.scrollTop) / total * 100;
    [50, 90].forEach(function (mark) {
      if (pct >= mark && !sent[mark]) {
        sent[mark] = true;
        track('scroll_depth', { percent: mark, pagina: window.location.pathname });
      }
    });
    if (sent[50] && sent[90]) window.removeEventListener('scroll', onScroll);
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  // ---------- banner de consentimento ----------
  function buildBanner() {
    if (document.getElementById('fa-consent')) return;
    var bar = document.createElement('div');
    bar.id = 'fa-consent';
    bar.setAttribute('role', 'dialog');
    bar.setAttribute('aria-label', 'Preferências de cookies');
    bar.innerHTML =
      '<style>' +
      '#fa-consent{position:fixed;left:12px;right:12px;bottom:12px;z-index:2147483000;max-width:640px;margin:0 auto;' +
      'background:#065264;color:#fff;border-radius:14px;padding:16px 18px;box-shadow:0 8px 28px rgba(0,0,0,.28);' +
      'font:400 14px/1.5 Nunito,system-ui,sans-serif}' +
      '#fa-consent p{margin:0 0 12px}#fa-consent a{color:#FDC51D;text-decoration:underline}' +
      '#fa-consent .fa-c-row{display:flex;gap:10px;flex-wrap:wrap}' +
      '#fa-consent button{flex:1 1 150px;min-height:44px;border-radius:999px;border:2px solid #fff;cursor:pointer;' +
      'font:700 14px Nunito,system-ui,sans-serif;padding:10px 16px}' +
      '#fa-consent .fa-c-ok{background:#FDC51D;border-color:#FDC51D;color:#065264}' +
      '#fa-consent .fa-c-no{background:transparent;color:#fff}' +
      '</style>' +
      '<p>Usamos cookies para entender como o site é usado e melhorar a experiência, e medir a origem das ' +
      'visitas para o Google e a Meta. Nenhum campo digitado (nome, e-mail, telefone) é gravado. ' +
      '<a href="/politica-privacidade">Saiba mais</a>.</p>' +
      '<div class="fa-c-row"><button type="button" class="fa-c-ok">Aceitar</button>' +
      '<button type="button" class="fa-c-no">Só o essencial</button></div>';
    bar.querySelector('.fa-c-ok').addEventListener('click', function () { setConsent('all'); });
    bar.querySelector('.fa-c-no').addEventListener('click', function () { setConsent('essential'); });
    document.body.appendChild(bar);
    document.documentElement.classList.add('fa-consent-open');
  }
  window.faConsentOpen = function () { buildBanner(); };

  function addFooterLink() {
    var f = document.querySelector('footer');
    if (!f || f.querySelector('[data-fa-cookies]')) return;
    var a = document.createElement('a');
    a.href = '#';
    a.setAttribute('data-fa-cookies', '');
    a.textContent = 'Preferências de cookies';
    a.style.cssText = 'display:inline-block;margin:6px 10px;color:inherit;text-decoration:underline;font-size:13px;opacity:.85';
    a.addEventListener('click', function (e) { e.preventDefault(); buildBanner(); });
    f.appendChild(a);
  }

  function ready() {
    if (!read(CONSENT_KEY)) buildBanner();
    addFooterLink();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready);
  else ready();
})();

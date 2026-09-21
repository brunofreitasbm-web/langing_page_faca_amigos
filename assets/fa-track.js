/*
 * FaçaAmigos: rastreamento + consentimento (LGPD) num arquivo só.
 * Incluir no <head> de cada página pública, antes de qualquer outro script:
 *   <script src="/assets/fa-track.js"></script>
 *
 * O que faz
 *  1. Consent Mode v2: tudo começa NEGADO. GTM e GA4 carregam em modo sem cookies; Clarity e Contentsquare
 *     (gravação de sessão) só carregam depois que a pessoa aceita no banner.
 *  2. Origem do visitante: guarda a primeira origem (utm_*, gclid, fbclid, src, sck, referrer) e a mais recente.
 *     Links internos deixam de sobrescrever a origem real (ex.: o banner do hub não vira "site").
 *     window.faOrigin() devolve a origem para os formulários.
 *  3. Eventos: whatsapp_click, begin_checkout (Hotmart), file_download, scroll_depth 50/90.
 *
 * IDs em um lugar só (antes estavam copiados em 9 arquivos).
 */
(function () {
  'use strict';

  var IDS = { gtm: 'GTM-PN5D2BTS', gtm2: 'GTM-NPDJ58XR', ga4: 'G-Q7LHH3C9P8', clarity: 'xz0butjjbh', cs: 'c3b9c7ee91c87' };
  var CONSENT_KEY = 'fa_consent';
  var ORIGIN_KEY = 'fa_origin';
  var PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'fbclid', 'src', 'sck'];
  var INTERNAL_HOSTS = ['institutofacaamigos.com.br', 'www.institutofacaamigos.com.br', 'playground.institutofacaamigos.com.br'];
  var WHATSAPP_UNITS = { '5591991782027': 'clinica', '5591992347673': 'playground_circuito' };
  var CHECKOUTS = {
    M107692257Y: { id: 'guia', name: 'O Brincar com Propósito', value: 149 },
    V107698297N: { id: 'codigo', name: 'O Código do Desenvolvimento Infantil' }
  };

  function read(key) { try { return window.localStorage.getItem(key); } catch (e) { return null; } }
  function write(key, val) { try { window.localStorage.setItem(key, val); } catch (e) { /* modo privado */ } }

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

  var recordersLoaded = false;
  function loadScript(src, attrs) {
    var s = document.createElement('script');
    s.async = true; s.src = src;
    for (var k in attrs) s.setAttribute(k, attrs[k]);
    (document.head || document.documentElement).appendChild(s);
  }
  function loadRecorders() {
    if (recordersLoaded) return;
    recordersLoaded = true;
    (function (c, l, a, r, i, t, y) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i;
      y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
    })(window, document, 'clarity', 'script', IDS.clarity);
    loadScript('https://t.contentsquare.net/uxa/' + IDS.cs + '.js');
  }
  function applyConsent(choice) {
    if (choice === 'all') {
      gtag('consent', 'update', GRANTED);
      loadRecorders();
    }
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
  gtag('config', IDS.ga4);
  applyConsent(read(CONSENT_KEY));

  // ---------- origem do visitante ----------
  function isInternalHost(h) { return INTERNAL_HOSTS.indexOf(h) !== -1; }

  function captureOrigin() {
    var q = new URLSearchParams(window.location.search);
    var found = {};
    var has = false;
    PARAMS.forEach(function (p) { var v = q.get(p); if (v) { found[p] = v.slice(0, 120); has = true; } });
    var stored = {};
    try { stored = JSON.parse(read(ORIGIN_KEY) || '{}') || {}; } catch (e) { stored = {}; }

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
    write(ORIGIN_KEY, JSON.stringify(stored));
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
      '<p>Usamos cookies para entender como o site é usado e melhorar a experiência. ' +
      'Se aceitar, também usamos ferramentas que registram a navegação de forma anônima. ' +
      'Nenhum campo digitado (nome, e-mail, telefone) é gravado. ' +
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

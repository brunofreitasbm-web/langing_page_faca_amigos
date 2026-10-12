/*
 * FaçaAmigos: rodapé único (conteúdo e visual otimizado) para hub, /playground, /circuito, /teste, /servicos, /aprender e /glossario.
 * Marque o rodapé de cada página com  <footer data-fa-footer="hub|playground|circuito|teste|servicos|aprender|glossario|eventos">
 * e inclua  <script src="/assets/fa-footer.js" defer></script>.
 *
 * Reorganiza o bloco denso de texto em 3 colunas elegantes (Unidades, Navegação, Conteúdos/Contato) + Sub-footer discreto.
 */
(function () {
  'use strict';

  // ---- Status das unidades (editar aqui quando abrir) ----
  var CLINICA_STATUS = 'Clínica · Em breve · IASEP &amp; PROASA';
  var GRAOPARA_STATUS = 'Playground · Aberto · 1º piso, em frente à Renner';

  // ---- Números de WhatsApp ----
  var WA_CLINICA = '5591991782027';
  var WA_LAZER = '5591992347673';
  var WA = {
    hub: { n: WA_CLINICA, t: 'Olá! Gostaria de informações sobre o FaçaAmigos - Centro de Terapia Comportamental.' },
    teste: { n: WA_CLINICA, t: 'Oi! Vim pelo site e gostaria de tirar uma dúvida.' },
    playground: { n: WA_LAZER, t: 'Oi! Vim pelo site e gostaria de tirar uma dúvida.' },
    circuito: { n: WA_LAZER, t: 'Oi! Vim pelo site e gostaria de tirar uma dúvida sobre o Circuito.' },
    servicos: { n: WA_CLINICA, t: 'Olá! Quero entrar na lista de espera da Clínica FaçaAmigos - Centro de Terapia Comportamental (vim pelo site).' },
    aprender: { n: WA_CLINICA, t: 'Oi! Vim pelo site (Aprender) e gostaria de tirar uma dúvida.' },
    glossario: { n: WA_CLINICA, t: 'Oi! Vim pelo site (Glossário) e gostaria de tirar uma dúvida.' },
    eventos: { n: WA_CLINICA, t: 'Oi! Vim pela página de eventos do Instituto e gostaria de tirar uma dúvida.' }
  };

  var footer = document.querySelector('footer[data-fa-footer]');
  if (!footer) return;
  var kind = footer.getAttribute('data-fa-footer') || 'hub';
  var wa = WA[kind] || WA.hub;

  // Links absolutos em produção; em localhost/preview ficam relativos. Playground e Circuito
  // moram no mesmo domínio do hub (/playground e /circuito).
  var HUB = 'https://institutofacaamigos.com.br';
  var isProd = /(^|\.)institutofacaamigos\.com\.br$/.test(location.hostname);
  function hub(p) { return (isProd ? HUB : '') + p; }

  function link(href, text, extra) { return '<a href="' + href + '"' + (extra || '') + '>' + text + '</a>'; }
  var EXT = ' target="_blank" rel="noopener"';

  // Injetar estilos limpos e responsivos para o rodapé otimizado
  if (!document.getElementById('fa-footer-styles')) {
    var style = document.createElement('style');
    style.id = 'fa-footer-styles';
    style.textContent = [
      'footer[data-fa-footer] { box-sizing: border-box; }',
      'footer[data-fa-footer] .fa-footer-wrap { width: 100%; max-width: 1120px; margin: 0 auto; box-sizing: border-box; text-align: left; }',
      'footer[data-fa-footer] .fa-footer-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 32px 40px; margin-top: 24px; margin-bottom: 32px; }',
      'footer[data-fa-footer] .fa-footer-col { font-size: 0.9rem; }',
      'footer[data-fa-footer] .fa-footer-title { font-size: 0.8rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; opacity: 0.7; margin: 0 0 14px 0; color: inherit; }',
      'footer[data-fa-footer] .fa-footer-list { list-style: none; padding: 0; margin: 0; }',
      'footer[data-fa-footer] .fa-footer-list li { margin-bottom: 12px; line-height: 1.5; font-size: 0.88rem; }',
      'footer[data-fa-footer] .fa-footer-list li strong { display: block; font-weight: 700; opacity: 0.95; }',
      'footer[data-fa-footer] .fa-footer-list li span { display: block; opacity: 0.75; font-size: 0.82rem; margin-top: 2px; }',
      'footer[data-fa-footer] .fa-footer-col a { color: inherit; text-decoration: none; font-weight: 600; opacity: 0.88; transition: opacity 0.2s, text-decoration 0.2s; }',
      'footer[data-fa-footer] .fa-footer-col a:hover { opacity: 1; text-decoration: underline; }',
      'footer[data-fa-footer] .fa-footer-bottom { border-top: 1px solid rgba(255, 255, 255, 0.14); padding-top: 20px; margin-top: 24px; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 8px; font-size: 0.8rem; opacity: 0.75; }',
      'footer[data-fa-footer] .fa-footer-bottom p { margin: 0; line-height: 1.5; }',
      '@media (max-width: 640px) {',
      '  footer[data-fa-footer] .fa-footer-wrap { text-align: center; }',
      '  footer[data-fa-footer] .fa-footer-grid { grid-template-columns: 1fr; gap: 24px; text-align: center; }',
      '}'
    ].join('\n');
    document.head.appendChild(style);
  }

  var colUnidades = [
    '<div class="fa-footer-col">',
    '  <h4 class="fa-footer-title">Unidades &amp; Locais</h4>',
    '  <ul class="fa-footer-list">',
    '    <li><strong>Parque Shopping Belém</strong><span>Rod. Augusto Montenegro, 4300 · Térreo (Playground &amp; Circuito)</span></li>',
    '    <li><strong>Shopping Bosque Grão-Pará</strong><span>Av. Centenário, 1052 · Val-de-Cans (' + GRAOPARA_STATUS + ')</span></li>',
    '    <li><strong>Centro de Terapia Comportamental</strong><span>Rua Boaventura da Silva, 1573 · Umarizal (' + CLINICA_STATUS + ')</span></li>',
    '    <li><strong>Funcionamento</strong><span>Parque Shopping: todos os dias, 10h às 22h · Grão-Pará: seg. a sáb. 10h às 22h, dom. 10h às 21h · ' + link('https://www.instagram.com/facaamigos.belem/', '@facaamigos.belem', EXT) + '</span></li>',
    '  </ul>',
    '</div>'
  ].join('\n');

  var colNavegacao = [
    '<div class="fa-footer-col">',
    '  <h4 class="fa-footer-title">Navegação</h4>',
    '  <ul class="fa-footer-list">',
    '    <li>' + link(hub('/'), 'Início') + '</li>',
    '    <li>' + link(hub('/servicos'), 'Serviços da Clínica') + '</li>',
    '    <li>' + link('https://clinica.institutofacaamigos.com.br/?utm_source=hub&amp;utm_medium=site&amp;utm_campaign=rodape_' + kind, 'Site da Clínica') + '</li>',
    '    <li>' + link(hub('/playground'), 'Playground Inclusivo') + '</li>',
    '    <li>' + link(hub('/circuito'), 'Circuito de Carrinhos') + '</li>',
    '    <li>' + link(hub('/teste'), 'Mapeamento Gratuito', ' data-fa-link="rodape_' + kind + '"') + '</li>',
    '    <li>' + link(hub('/eventos'), 'Eventos (palestras e treinamentos)') + '</li>',
    '    <li>' + link(hub('/aprender'), 'Aprender (Artigos &amp; Guias)') + '</li>',
    '    <li>' + link(hub('/glossario'), 'Glossário Comportamental') + '</li>',
    '  </ul>',
    '</div>'
  ].join('\n');

  var colInstitucional = [
    '<div class="fa-footer-col">',
    '  <h4 class="fa-footer-title">Conteúdos &amp; Contato</h4>',
    '  <ul class="fa-footer-list">',
    '    <li>' + link(hub('/guia'), 'E-book: O Brincar com Propósito', ' data-fa-link="rodape_' + kind + '"') + '</li>',
    '    <li>' + link(hub('/codigo'), 'E-book: O Código do Desenvolvimento Infantil', ' data-fa-link="rodape_' + kind + '"') + '</li>',
    '    <li>' + link('https://wa.me/' + wa.n + '?text=' + encodeURIComponent(wa.t), 'Fale conosco no WhatsApp', EXT) + '</li>',
    '    <li>' + link(hub('/trabalhe-conosco'), 'Trabalhe Conosco') + '</li>',
    '    <li>' + link(hub('/politica-privacidade'), 'Política de Privacidade') + '</li>',
    '    <li>' + link(hub('/termos'), 'Termos de Uso e de Compra') + '</li>',
    '  </ul>',
    '</div>'
  ].join('\n');

  var htmlGrid = [
    '<div class="fa-footer-wrap">',
    '  <div class="fa-footer-grid">',
    colUnidades,
    colNavegacao,
    colInstitucional,
    '  </div>',
    '  <div class="fa-footer-bottom">',
    '    <p class="legal">FaçaAmigos Playground Inclusivo · CNPJ 66.318.630/0001-17 (Playground e Circuito)</p>',
    '    <p class="legal">Instituto Faça Amigos Ltda · CNPJ 22.161.197/0001-83 (Clínica, Mapeamento Comportamental e e-books) · Belém/PA</p>',
    '  </div>',
    '</div>'
  ].join('\n');

  // Mantém a logo / ícone original do topo do footer se existir, remove parágrafos e wraps antigos para evitar duplicação
  Array.prototype.slice.call(footer.querySelectorAll(':scope > p, :scope > .fa-footer-wrap')).forEach(function (el) { el.remove(); });
  footer.insertAdjacentHTML('beforeend', htmlGrid);

  // O link de preferências de cookies (fa-track.js) vai por último, no sub-footer.
  var cookies = footer.querySelector('[data-fa-cookies]');
  var bottom = footer.querySelector('.fa-footer-bottom');
  if (cookies && bottom) bottom.appendChild(cookies);
})();

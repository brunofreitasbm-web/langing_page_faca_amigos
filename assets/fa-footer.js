/*
 * FaçaAmigos: rodapé único (conteúdo) para hub, /playground, /circuito, /teste, /servicos, /aprender e /glossario.
 * Marque o rodapé de cada página com  <footer data-fa-footer="hub|playground|circuito|teste|servicos|aprender|glossario">
 * e inclua  <script src="/assets/fa-footer.js" defer></script>.
 * Sem JavaScript, continua valendo o rodapé estático da própria página (mesmo conteúdo, mantido em sincronia).
 *
 * Só o CONTEÚDO é compartilhado; o visual continua sendo o CSS de cada página (footer p, footer a, .legal).
 * Status das unidades e CNPJs ficam nas constantes abaixo: virar "aberta" é uma edição só.
 */
(function () {
  'use strict';

  // ---- Status das unidades (editar aqui quando abrir) ----
  var CLINICA_STATUS = 'Clínica · Em breve · IASEP &amp; PROASA';
  var GRAOPARA_STATUS = 'Playground - Em Breve';

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
    glossario: { n: WA_CLINICA, t: 'Oi! Vim pelo site (Glossário) e gostaria de tirar uma dúvida.' }
  };

  var footer = document.querySelector('footer[data-fa-footer]');
  if (!footer) return;
  var kind = footer.getAttribute('data-fa-footer') || 'hub';
  var wa = WA[kind] || WA.hub;
  var hasJobs = typeof window.openJobModal === 'function' || !!document.getElementById('jobModalOverlay');

  function link(href, text, extra) { return '<a href="' + href + '"' + (extra || '') + '>' + text + '</a>'; }
  var EXT = ' target="_blank" rel="noopener"';

  var nav = [
    link('/', 'Início'),
    link('/servicos', 'Serviços'),
    link('/playground', 'Playground'),
    link('/circuito', 'Circuito'),
    link('/teste?utm_source=site&amp;utm_medium=rodape&amp;utm_campaign=' + kind, 'Mapeamento gratuito'),
    link('/aprender', 'Aprender'),
    link('/glossario', 'Glossário'),
    link('/guia?utm_source=site&amp;utm_medium=rodape&amp;utm_campaign=' + kind, 'O Brincar com Propósito'),
    link('/codigo?utm_source=site&amp;utm_medium=rodape&amp;utm_campaign=' + kind, 'O Código do Desenvolvimento Infantil')
  ].join(' · ');

  var contact = [
    link('https://wa.me/' + wa.n + '?text=' + encodeURIComponent(wa.t), 'Fale conosco', EXT),
    hasJobs ? '<a href="#" data-fa-jobs>Venha fazer parte do nosso time</a>' : '',
    link('/politica-privacidade', 'Política de privacidade'),
    link('/termos', 'Termos de uso e de compra')
  ].filter(Boolean).join(' · ');

  var html = [
    '<p><b>Parque Shopping Belém:</b> Av. Augusto Montenegro, 4300 · Térreo (Playground &amp; Circuito)</p>',
    '<p><b>Shopping Bosque Grão-Pará:</b> Av. Centenário, 1052 · Val-de-Cans (' + GRAOPARA_STATUS + ')</p>',
    '<p><b>Centro de Terapia Comportamental:</b> Rua Boaventura da Silva, 1573 · Umarizal (' + CLINICA_STATUS + ')</p>',
    '<p>Todos os dias, das 10h às 22h (Playground e Circuito) · ' + link('https://www.instagram.com/facaamigos.belem/', '@facaamigos.belem', EXT) + '</p>',
    '<p style="margin-top: 18px;">' + nav + '</p>',
    '<p>' + contact + '</p>',
    '<p class="legal">FaçaAmigos Playground Inclusivo · CNPJ 66.318.630/0001-17 (Playground e Circuito)<br>' +
    'Instituto Faça Amigos Ltda · CNPJ 22.161.197/0001-83 (Clínica, Mapeamento Comportamental e e-books) · Belém/PA</p>'
  ].join('\n');

  // Mantém a logo (img + .logo) e o link de cookies; troca só os parágrafos.
  Array.prototype.slice.call(footer.querySelectorAll(':scope > p')).forEach(function (p) { p.remove(); });
  footer.insertAdjacentHTML('beforeend', html);

  var jobs = footer.querySelector('[data-fa-jobs]');
  if (jobs) {
    jobs.addEventListener('click', function (e) {
      e.preventDefault();
      if (typeof window.openJobModal === 'function') window.openJobModal();
    });
  }

  // O link de preferências de cookies (fa-track.js) vai por último, dentro do rodapé.
  var cookies = footer.querySelector('[data-fa-cookies]');
  if (cookies) footer.appendChild(cookies);
})();

/*
 * FaçaAmigos: acessibilidade dos modais (.modal-overlay > .modal[role=dialog]) do site.
 * Não muda o visual nem a lógica de cada página; só acrescenta o que faltava:
 *  - rótulo acessível em todo campo sem <label> (usa o placeholder ou a 1ª opção do select);
 *  - autocomplete correto (nome, e-mail, telefone) para o preenchimento automático;
 *  - foco vai para dentro do modal ao abrir, Tab fica preso nele, Esc fecha e o foco volta ao botão de origem;
 *  - fundo marcado como inerte enquanto o modal está aberto.
 * O modal abre quando o overlay ganha a classe "active" (openJobModal() já faz isso).
 */
(function () {
  'use strict';

  var FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

  function labelFields(modal) {
    Array.prototype.forEach.call(modal.querySelectorAll('input,select,textarea'), function (el) {
      if (el.type === 'hidden' || el.type === 'file' || el.type === 'checkbox') return;
      var hasLabel = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') ||
        (el.id && modal.querySelector('label[for="' + el.id + '"]'));
      if (!hasLabel) {
        var text = el.getAttribute('placeholder');
        if (!text && el.tagName === 'SELECT' && el.options.length) text = el.options[0].textContent;
        if (text) el.setAttribute('aria-label', text.trim());
      }
      if (!el.getAttribute('autocomplete')) {
        if (el.type === 'email') el.setAttribute('autocomplete', 'email');
        else if (el.type === 'tel') el.setAttribute('autocomplete', 'tel');
        else if (/nome/i.test(el.id + ' ' + (el.getAttribute('placeholder') || ''))) el.setAttribute('autocomplete', 'name');
      }
    });
  }

  function setup(overlay) {
    var modal = overlay.querySelector('.modal');
    if (!modal) return;
    labelFields(modal);
    var opener = null;

    function siblingsInert(on) {
      Array.prototype.forEach.call(document.body.children, function (el) {
        if (el === overlay || el.tagName === 'SCRIPT' || el.tagName === 'STYLE') return;
        if (on) { el.setAttribute('inert', ''); } else { el.removeAttribute('inert'); }
      });
    }

    function onOpen() {
      opener = document.activeElement;
      siblingsInert(true);
      var first = modal.querySelector('input:not([type=hidden]),select,textarea,button');
      if (first) setTimeout(function () { first.focus(); }, 30);
    }
    function onClose() {
      siblingsInert(false);
      if (opener && opener.focus && document.contains(opener)) opener.focus();
      opener = null;
    }

    var wasActive = overlay.classList.contains('active');
    new MutationObserver(function () {
      var now = overlay.classList.contains('active');
      if (now && !wasActive) onOpen();
      if (!now && wasActive) onClose();
      wasActive = now;
    }).observe(overlay, { attributes: true, attributeFilter: ['class'] });

    overlay.addEventListener('keydown', function (e) {
      if (!overlay.classList.contains('active')) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        var close = modal.querySelector('.modal-close');
        if (close) close.click();
        else overlay.classList.remove('active');
        return;
      }
      if (e.key !== 'Tab') return;
      var items = Array.prototype.filter.call(modal.querySelectorAll(FOCUSABLE), function (n) { return n.offsetParent !== null; });
      if (!items.length) return;
      var firstEl = items[0], lastEl = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) { e.preventDefault(); lastEl.focus(); }
      else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); firstEl.focus(); }
    });
  }

  function init() {
    Array.prototype.forEach.call(document.querySelectorAll('.modal-overlay'), setup);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

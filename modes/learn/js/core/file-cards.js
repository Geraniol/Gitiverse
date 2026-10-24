
(function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function ic(name, size) {
    if (window.GitIcons && window.GitIcons.svg) return window.GitIcons.svg(name, { size: size });
    return '';
  }

  var STATUS_TEXT = {
    added: 'new', modified: 'changed', deleted: 'gone',
    staged: 'staged', conflict: 'conflict', ignored: 'ignored'
  };

  function render(opts) {
    opts = opts || {};
    var items = opts.items || [];
    var stagger = opts.animate !== false;

    var cards = items.map(function (it, i) {
      var tag = opts.pick ? 'button' : 'div';
      var attrs = opts.pick
        ? ' type="button" data-fcard="' + esc(it.id || it.name) + '"' +
          ' aria-pressed="' + (it.picked ? 'true' : 'false') + '"'
        : '';
      var mark = it.status
        ? '<span class="fcard__mark" data-status="' + esc(it.status) + '">' +
          esc(STATUS_TEXT[it.status] || it.status) + '</span>'
        : '';
      /* The stagger is set as an inline delay rather than a CSS nth-child
         ladder: the list length is not known to the stylesheet, and a ladder
         stops at whatever number someone happened to write. */
      var delay = stagger ? ' style="animation-delay:' + (i * 55) + 'ms"' : '';
      return '<li class="fcard__cell">' +
        '<' + tag + ' class="fcard' + (it.picked ? ' is-picked' : '') + '"' + attrs + delay + '>' +
          '<span class="fcard__icon">' + ic(it.icon || 'file-text', 16) + '</span>' +
          '<span class="fcard__name">' + esc(it.name) + '</span>' +
          mark +
          (it.note ? '<span class="fcard__note">' + esc(it.note) + '</span>' : '') +
        '</' + tag + '>' +
      '</li>';
    }).join('');

    return '' +
      '<section class="fcards"' + (opts.pick ? ' data-pick="1"' : '') + '>' +
        (opts.label || opts.count
          ? '<header class="fcards__head">' +
              (opts.label ? '<span class="fcards__label">' + esc(opts.label) + '</span>' : '') +
              (opts.count ? '<span class="fcards__count">' + esc(opts.count) + '</span>' : '') +
            '</header>'
          : '') +
        (items.length
          ? '<ul class="fcards__grid">' + cards + '</ul>'
          : '<p class="fcards__empty">' + esc(opts.empty || 'nothing here yet') + '</p>') +
      '</section>';
  }

  /** Choosing one. Call once per board; survives re-renders. */
  function bind(root, handler) {
    root.addEventListener('click', function (e) {
      var c = e.target.closest('[data-fcard]');
      if (!c || !root.contains(c)) return;
      handler(c.getAttribute('data-fcard'), c);
    });
  }

  window.FileCards = { render: render, bind: bind, esc: esc };
})();

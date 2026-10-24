
(function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /**
   * Does what the reader typed match the command we asked for?
   * Whitespace is the only thing forgiven: Git is case-sensitive, quoting is
   * syntax, and `--staged` is not `--stage`. The hint already spells it out.
   */
  function matches(typed, expected) {
    var norm = function (s) { return String(s || '').trim().replace(/\s+/g, ' '); };
    return norm(typed) === norm(expected);
  }

  function form(opts) {
    opts = opts || {};
    var id = opts.id || 'cmd';
    var log = (opts.log || []).map(function (l) {
      var tone = l.tone ? ' data-tone="' + esc(l.tone) + '"' : '';
      return '<div class="tline"><div class="tout"' + tone + '>' + esc(l.text) + '</div></div>';
    }).join('');

    return '' +
      /* is-done hides the input row: a greyed Run button still reads as
         clickable, so a finished terminal shows only its log and "Done". */
      '<form class="gitterm' + (opts.disabled ? ' is-done' : '') +
        '" data-gitterm="' + esc(id) + '">' +
        (log ? '<div class="gitterm__log" aria-live="polite">' + log + '</div>' : '') +
        (opts.note ? '<p class="gitterm__note">' + esc(opts.note) + '</p>' : '') +
        '<div class="gitterm__row">' +
          '<span class="gitterm__sigil" aria-hidden="true">$</span>' +
          '<input class="gitterm__input" data-gitterm-input type="text"' +
            ' value="' + esc(opts.value || '') + '"' +
            ' placeholder="' + esc(opts.placeholder || 'git …') + '"' +
            ' autocomplete="off" autocapitalize="none" spellcheck="false"' +
            ' aria-label="' + esc(opts.label || 'Command') + '"' +
            (opts.disabled ? ' disabled' : '') + '>' +
          '<button class="btn' + (opts.secondary ? '' : ' btn--primary') + '" type="submit"' +
            (opts.disabled ? ' disabled' : '') + '>' +
            esc(opts.run || 'Run') + '</button>' +
        '</div>' +
        /* The hint IS the answer on purpose: typing exercise, not recall test. */
        '<p class="gitterm__hint">' +
          (opts.disabled
            ? '<span class="gitterm__done">Done</span>'
            /* One <code> per command, so a step that accepts five commands wraps
               at the separators instead of becoming one unreadable line. */
            : 'Type ' + String(opts.command).split('·')
                .map(function (s) { return s.trim(); }).filter(Boolean)
                .map(function (s) { return '<code>' + esc(s) + '</code>'; })
                .join('<span class="gitterm__sep">·</span>')) +
        '</p>' +
      '</form>';
  }

  /**
   * Commands this terminal accepts, in hint order. WARNING: the hint is the
   * source of truth, not a second copy - each accepted command is its own
   * <code> in the hint, so Tab never offers an untaught command.
   */
  function candidates(form) {
    var hint = form && form.querySelector('.gitterm__hint');
    if (!hint) return [];
    return Array.prototype.slice.call(hint.querySelectorAll('code'))
      .map(function (c) { return c.textContent.trim(); })
      .filter(Boolean);
  }

  /** Tab completes the field (transcription, not recall - WARNING: not a prefill).
   * Empty -> first candidate; prefix -> first match; whole command -> the next one,
   * wrapping; no match -> Tab moves focus. */
  function complete(input) {
    var list = candidates(input.closest('[data-gitterm]'));
    if (!list.length) return false;
    var typed = String(input.value || '').trim();
    var next = null;
    if (!typed) {
      next = list[0];
    } else {
      var lower = typed.toLowerCase();
      var exact = -1;
      list.forEach(function (c, i) { if (c.toLowerCase() === lower) exact = i; });
      if (exact >= 0) next = list[(exact + 1) % list.length];        /* wrap around */
      else next = list.filter(function (c) { return c.toLowerCase().indexOf(lower) === 0; })[0] || null;
    }
    if (!next || next === input.value) return false;
    input.value = next;
    try { input.setSelectionRange(next.length, next.length); } catch (e) { /* old browsers */ }
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }

  function bind(root, handler) {
    root.addEventListener('submit', function (e) {
      var f = e.target.closest('[data-gitterm]');
      if (!f || !root.contains(f)) return;
      e.preventDefault();
      var input = f.querySelector('[data-gitterm-input]');
      if (!input || input.disabled) return;
      handler(f.getAttribute('data-gitterm'), input.value, f);
    });
    /* Tab completion, bound on the container like submit, so it survives re-renders. */
    root.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab' || e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) return;
      var input = e.target.closest ? e.target.closest('[data-gitterm-input]') : null;
      if (!input || !root.contains(input) || input.disabled) return;
      if (complete(input)) e.preventDefault();   /* only preventDefault when completed; otherwise let Tab move focus */
    });
  }

  /** Keep what the reader typed across a re-render. */
  function valueOf(root, id) {
    var f = root.querySelector('[data-gitterm="' + id + '"]');
    var i = f && f.querySelector('[data-gitterm-input]');
    return i ? i.value : '';
  }

  function reject(form) {
    if (!form) return;
    var hint = form.querySelector('.gitterm__hint');
    form.classList.remove('is-rejected');
    if (hint) hint.classList.remove('is-rejected');
    void form.offsetWidth;                     /* flush, so the animation replays */
    form.classList.add('is-rejected');
    if (hint) hint.classList.add('is-rejected');
    window.setTimeout(function () {
      form.classList.remove('is-rejected');
      if (hint) hint.classList.remove('is-rejected');
    }, 900);
  }

  window.GitTerm = { form: form, bind: bind, matches: matches, valueOf: valueOf,
                     reject: reject, esc: esc };
})();

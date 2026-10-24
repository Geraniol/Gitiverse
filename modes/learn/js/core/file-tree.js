
(function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* The one icon lookup, reusing the page sprite helper.
     WARNING: GitIcons.svg(name, opts) takes an OPTIONS OBJECT, not a bare size. */
  function ic(name, size) {
    if (window.GitIcons && window.GitIcons.svg) return window.GitIcons.svg(name, { size: size });
    return '';
  }

  /* The first letter is what the badge shows, so pick words by that letter:
     added -> n, deleted -> d, conflict -> !. */
  var STATUS_TEXT = {
    added: 'new', modified: 'modified', deleted: 'deleted',
    staged: 'staged', conflict: '!', ignored: 'ignored'
  };

  /**
   * One node: { name, type: 'dir'|'file', children, status, open }.
   * status is a STATUS_TEXT key or absent; `open` renders a dir unfolded.
   */
  function nodeHtml(node, depth, ctx) {
    var isDir = node.type === 'dir';
    var kids = node.children || [];
    var foldable = isDir && kids.length > 0;
    var open = node.open !== false;
    var here = ctx.cwd && node.path === ctx.cwd;

    var twist = foldable
      ? '<button class="ftree__twist" type="button" aria-expanded="' + open + '"' +
        ' aria-label="' + esc((open ? 'Collapse ' : 'Expand ') + node.name) + '">' +
        ic(open ? 'chevron-down' : 'chevron-right', 13) + '</button>'
      : '<span class="ftree__twist ftree__twist--none" aria-hidden="true"></span>';

    var mark = node.status
      ? '<span class="ftree__mark" data-status="' + esc(node.status) + '"' +
        ' title="' + esc(STATUS_TEXT[node.status] || node.status) + '">' +
        esc((STATUS_TEXT[node.status] || node.status).charAt(0).toUpperCase()) + '</span>'
      : '';

    /* The folder you are in gets a word, not just a colour. */
    var cwd = here ? '<span class="ftree__cwd">you are here</span>' : '';

    var row = '<div class="ftree__row" data-kind="' + (isDir ? 'dir' : 'file') + '"' +
      (here ? ' data-here="1"' : '') + '>' +
      twist +
      /* Use folder, not folder-open: the sprite has no folder-open and
         svg("folder-open", 15) silently draws an empty box. */
      '<span class="ftree__icon">' + ic(isDir ? 'folder' : 'file-text', 15) + '</span>' +
      '<span class="ftree__name">' + esc(node.name) + '</span>' +
      mark + cwd +
      '</div>';

    if (!foldable || !open) return row;

    return row + '<div class="ftree__kids">' +
      kids.map(function (k) { return nodeHtml(k, depth + 1, ctx); }).join('') +
      '</div>';
  }

  /**
   * One panel: { title, nodes, cwd, empty, tone }.
   * cwd is the folder the reader is in; empty replaces the tree;
   * tone 'before'|'after' only affects the caption colour.
   */
  function panel(opts) {
    opts = opts || {};
    var nodes = opts.nodes || [];
    var ctx = { cwd: opts.cwd || null };

    /* The root is always `.`: a repository is not named, and the folder you
       put it in is a child of the root. */
    var root = {
      name: '.', type: 'dir', path: '.', open: true, children: nodes
    };

    return '' +
      '<section class="ftree" data-tone="' + esc(opts.tone || 'after') + '">' +
        '<header class="ftree__head">' +
          '<span class="ftree__title">' + esc(opts.title || 'File Tree') + '</span>' +
          (opts.note ? '<span class="ftree__note">' + esc(opts.note) + '</span>' : '') +
        '</header>' +
        '<div class="ftree__body">' +
          (nodes.length
            ? nodeHtml(root, 0, ctx)
            : '<p class="ftree__empty">' + esc(opts.empty || 'empty') + '</p>') +
        '</div>' +
      '</section>';
  }

  /**
   * The pair: repository before and after, the shared before/after shape
   * used across the course.
   */
  function pair(before, after) {
    return '<div class="ftree-pair">' +
      panel(Object.assign({ tone: 'before' }, before)) +
      panel(Object.assign({ tone: 'after' }, after)) +
      '</div>';
  }

  /** Fold and unfold, delegated. Call once per board. */
  function bind(root) {
    root.addEventListener('click', function (e) {
      var t = e.target.closest('.ftree__twist');
      if (!t || t.classList.contains('ftree__twist--none')) return;
      if (!root.contains(t)) return;
      var open = t.getAttribute('aria-expanded') === 'true';
      t.setAttribute('aria-expanded', String(!open));
      var row = t.closest('.ftree__row');
      var kids = row && row.nextElementSibling;
      if (kids && kids.classList.contains('ftree__kids')) kids.hidden = open;
      var icon = t.querySelector('svg');
      if (icon) icon.outerHTML = ic(open ? 'chevron-right' : 'chevron-down', 13);
    });
  }

  window.FileTree = { panel: panel, pair: pair, bind: bind, esc: esc };
})();


(function () {
  'use strict';

  var C = window.CHAPTER_CONTENT;
  var I = window.GitIcons;

  if (!C || !I) {
    document.body.innerHTML =
      '<p style="padding:2rem;font:15px system-ui">' +
      'Could not start: content.en.js and icons.js must load before app.js.</p>';
    return;
  }

  var PAGES = C.pages;

  var UI = C.ui;


  function q(root, sel) { return root.querySelector(sel); }
  function qa(root, sel) { return Array.prototype.slice.call(root.querySelectorAll(sel)); }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  /** Fill {placeholders} in a content string. An unknown key is left alone,
   *  which is what makes a typo in a content file visible on the page. */
  function fill(template, vars) {
    return String(template).replace(/\{(\w+)\}/g, function (all, key) {
      return (vars && vars[key] !== undefined) ? vars[key] : all;
    });
  }

  /** An icon, as markup. An unknown name returns '' - see icons.js. */
  function ic(name, size, cls) { return I.svg(name, { size: size || 16, cls: cls || '' }); }

  function gnode(opts) {
    var o = opts || {};
    var cls = 'gnode' + (o.role ? ' gnode--' + o.role : '') + (o.head ? ' is-head' : '') +
      (o.cls ? ' ' + o.cls : '');
    var under = '';
    if (o.id || o.msg) {
      under = '<span class="gnode__label">' + (o.id ? '<b>' + esc(o.id) + '</b>' : '') +
        (o.msg ? '<span>' + esc(o.msg) + '</span>' : '') + '</span>';
    } else if (o.note) {
      under = '<small>' + esc(o.note) + '</small>';
    }
    return '<span class="' + cls + '" style="left:' + o.x + ';top:' + o.y + ';' +
      (o.size ? '--gnode:' + o.size + ';' : '') + '"' +
      (o.data ? ' data-node="' + esc(o.data) + '"' : '') +
      (o.live ? ' role="button" tabindex="0"' : '') +
      '>' + (o.label ? esc(o.label) : '') + under + '</span>';
  }

  function grefs(x, y, refs, opts) {
    var o = opts || {};
    return '<span class="grefs' + (o.below ? ' grefs--below' : '') + (o.cls ? ' ' + o.cls : '') +
      '" style="left:' + x + ';top:' + y + '">' +
      refs.map(function (r) {
        return '<span class="gref' + (r.tone ? ' gref--' + r.tone : '') + '">' + esc(r.name) + '</span>';
      }).join('') + '</span>';
  }

  function glegend() {
    return '<ul class="glegend">' +
      '<li><span class="glegend__sw glegend__sw--main"></span><span>Normal commit</span></li>' +
      '<li><span class="glegend__sw glegend__sw--merge"></span><span>Merge commit</span></li>' +
      '<li><span class="glegend__sw glegend__sw--root"></span><span>Root commit</span></li>' +
      '<li><span class="glegend__sw glegend__sw--head"></span><span>HEAD</span></li>' +
      '<li><span class="glegend__ref">main</span><span>Branch ref</span></li>' +
      '</ul>';
  }

  function gconn(mods, opts) {
    opts = opts || {};
    var list = (mods || '').split(' ').filter(Boolean);
    var line = list.indexOf('line') >= 0;
    var name = opts.icon || (list.indexOf('both') >= 0 ? 'arrow-down-up' : 'arrow-right');
    return '<span class="gconn' + list.map(function (m) { return ' gconn--' + m; }).join('') +
      (opts.cls ? ' ' + opts.cls : '') + '">' + (line ? '' : ic(name)) + '</span>';
  }

  /** One element from a markup string. */
  function el(markup) {
    var box = document.createElement('div');
    box.innerHTML = markup;
    return box.firstElementChild;
  }

  /** A repeating timer with a name, so every caller can stop it - a beat that
   *  is scrolled away from must not keep firing. */
  function ticker(fn, ms) {
    var id = null;
    return {
      start: function () { if (id === null) id = window.setInterval(fn, ms); },
      stop: function () { if (id !== null) { window.clearInterval(id); id = null; } }
    };
  }

  function scrollTo_(node) {
    if (!node) return;

    /* Compute the scroll ourselves rather than asking scrollIntoView: with the
       shell all `overflow: hidden`, it picked an ancestor that cannot scroll and did
       nothing. The clamp is why `.stage` carries `padding-block`. */
    var scroller = null, el = node.parentNode;
    while (el && el.nodeType === 1) {
      var cs = window.getComputedStyle(el);
      if (/(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight) {
        scroller = el;
        break;
      }
      el = el.parentNode;
    }
    if (!scroller) scroller = document.scrollingElement || document.documentElement;

    /* Put the node's middle on the scroller's middle, measured through rect deltas
       (see above), not offsetTop. */
    /* Align the node's TOP and do not read its height: a beat's height is not
       settled when this runs, and centring needs `nr.height`. Measured error was a
       constant 32px for a 335px card and an 863px one alike. */
    var nr = node.getBoundingClientRect();
    var sr = scroller.getBoundingClientRect();
    var inContent = scroller.scrollTop + (nr.top - sr.top);
    /* The line is ONE GUTTER below the scroller's top, not 25% of the viewport.
       25% needs 25vh of blank space above the first beat; a gutter gives every beat
       the same landing line without ever showing empty space. */
    var line = 24;
    var top = inContent - line;
    var max = scroller.scrollHeight - scroller.clientHeight;
    top = Math.max(0, Math.min(top, max));
    try { scroller.scrollTo({ top: top, behavior: 'smooth' }); }
    catch (e) { scroller.scrollTop = top; }
  }

  /** On a wide window the stage is the scroller, so a section change has to
   *  reset that rather than the document. */
  function resetContentScroll() {
    var stage = document.getElementById('stage');
    if (stage) stage.scrollTop = 0;
    try { window.scrollTo(0, 0); } catch (e) { /* jsdom / very old browsers */ }
  }

  function questionBar(qb) {
    var text = typeof qb === 'string' ? qb : (qb && qb.text) || '';
    return '<div class="question">' + ic((qb && qb.icon) || 'circle-help', 19) +
      '<span>' + esc(text) + '</span></div>';
  }

  /** Standard verdict banner. */
  function verdictBlock(v, tone) {
    if (!v) return '';
    return '' +
      '<div class="verdict' + (tone ? ' verdict--' + tone : '') + '" role="status">' +
        '<div class="verdict__icon">' + ic(v.icon, 22) + '</div>' +
        '<div>' +
          '<div class="verdict__headline">' + esc(v.headline) + '</div>' +
          '<div class="verdict__text">' + esc(v.text) + '</div>' +
        '</div>' +
      '</div>';
  }


  var Store = (function () {
    var KEY = {
      theme: 'gitcourse.theme',        /* also read by the <head> bootstrap */
      record: 'gitcourse.record.chapter' + C.meta.number,
      settings: 'gitcourse.settings',
      chat: 'gitcourse.chat.chapter' + C.meta.number
    };

    function read(key, fallback) {
      try {
        var raw = window.localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) { return fallback; }
    }
    function write(key, value) {
      try { window.localStorage.setItem(key, JSON.stringify(value)); return true; }
      catch (e) { return false; }      /* private mode, or quota */
    }

    /**
     * Move chapter 1's record and conversation off the old unsuffixed keys. Runs
     * on every visit and is a no-op after the first: it only acts when the old key
     * holds something and the new one holds nothing.
     */
    function migrate() {
      [['gitcourse.record', 'gitcourse.record.chapter1'],
       ['gitcourse.chat',   'gitcourse.chat.chapter1']].forEach(function (pair) {
        try {
          var old = window.localStorage.getItem(pair[0]);
          if (old === null) return;
          if (window.localStorage.getItem(pair[1]) === null) {
            window.localStorage.setItem(pair[1], old);
          }
          window.localStorage.removeItem(pair[0]);
        } catch (e) { /* private mode */ }
      });
    }

    /**
     * Point the chapter-scoped keys at another chapter. `theme` and `settings` are
     * deliberately NOT rebound: they belong to the reader, not the chapter.
     */
    function rebind(n) {
      KEY.record = 'gitcourse.record.chapter' + n;
      KEY.chat = 'gitcourse.chat.chapter' + n;
    }

    function chapterNumbers() {
      var ns = [];
      (UI.chapters || []).forEach(function (c) { if (c && c.number) ns.push(c.number); });
      /* Manifest not loaded yet: cover at least the chapter we are on, so a
         half-initialised page cannot clear nothing at all. */
      if (!ns.length) ns.push(C.meta.number);
      return ns;
    }

    return { KEY: KEY, read: read, write: write, migrate: migrate, rebind: rebind,
             chapterNumbers: chapterNumbers };
  })();


  var Theme = (function () {
    var KEY = 'gitcourse.theme';
    var root = document.documentElement;
    var media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

    function stored() {
      try { return window.localStorage.getItem(KEY); } catch (e) { return null; }
    }
    function save(v) {
      try { window.localStorage.setItem(KEY, v); } catch (e) { /* private mode */ }
    }
    function systemPref() { return media && media.matches ? 'dark' : 'light'; }

    function apply(mode) {
      if (mode !== 'light' && mode !== 'dark') mode = systemPref();
      root.setAttribute('data-theme', mode);
      var btn = document.getElementById('themeBtn');
      if (btn) {
        var label = mode === 'light' ? UI.theme.toDark : UI.theme.toLight;
        btn.setAttribute('title', label);
        btn.setAttribute('aria-label', label);
      }
    }
    /* Read defensively too: a junk attribute left by an older build must not
       make the toggle compute "light" from something that is not "dark". */
    function current() {
      return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    }
    function toggle() {
      var next = current() === 'dark' ? 'light' : 'dark';
      save(next);
      apply(next);
    }
    function init() {
      apply(stored() || systemPref());
      if (media && media.addEventListener) {
        media.addEventListener('change', function (e) {
          if (!stored()) apply(e.matches ? 'dark' : 'light');
        });
      }
    }
    function reset() {
      try { window.localStorage.removeItem(KEY); } catch (e) { /* private mode */ }
      apply(systemPref());
    }
    return { init: init, toggle: toggle, apply: apply, current: current, reset: reset };
  })();


  /**
   * The learning record: which sections are finished. THERE IS NO LOCK STATE -
   * nothing here refuses a navigation. The course-wide view counts other chapters
   * from their stored record and the manifest (course.en.js).
   */
  var Progress = (function () {
    var done = {};
    var watchers = [];

    /** Chapter N's own record key - the same shape Store.KEY builds. */
    function keyFor(n) { return 'gitcourse.record.chapter' + n; }

    function load() {
      var saved = Store.read(Store.KEY.record, null);
      done = (saved && saved.completed) ? saved.completed : {};
      paint();
    }
    function save() { Store.write(Store.KEY.record, { completed: done }); }

    function mark(pageId) {
      if (done[pageId]) return;
      done[pageId] = true;
      save();
      paint();
      fire();
    }
    function isDone(pageId) { return !!done[pageId]; }
    function unmark(pageId) {
      if (!done[pageId]) return;
      delete done[pageId];
      save(); paint(); fire();
    }

    function clearAll() {
      done = {};                       /* memory first: a repaint must not read the old one */
      Store.chapterNumbers().forEach(function (n) {
        try { window.localStorage.removeItem(keyFor(n)); }
        catch (e) { /* private mode */ }
      });
      if (window.Chapter13Sessions) window.Chapter13Sessions.clear();
      else {
        try { window.localStorage.removeItem('gitcourse.lab.chapter13.v3'); }
        catch (e) { /* Storage may be unavailable before Chapter 13 loads. */ }
      }
      paint();
      fire();
    }


    function manifestEntry(n) {
      var found = null;
      (UI.chapters || []).forEach(function (c) { if (c.number === n) found = c; });
      return found;
    }

    /** How many of chapter N's sections are finished. */
    function chapterDone(n) {
      if (n === C.meta.number) {
        var mine = 0;
        PAGES.forEach(function (p) { if (done[p.id]) mine++; });
        return mine;
      }
      var saved = Store.read(keyFor(n), null);
      var completed = (saved && saved.completed) ? saved.completed : {};
      var entry = manifestEntry(n);
      var count = Object.keys(completed).length;
      /* Capped at the manifest's number: a section that was renamed away
         would otherwise leave a stale id in the record inflating the total. */
      return entry ? Math.min(count, entry.sections) : count;
    }

    function courseTotals() {
      var total = 0, finished = 0;
      (UI.chapters || []).forEach(function (c) {
        total += c.sections;
        finished += chapterDone(c.number);
      });
      return { total: total, finished: finished };
    }

    /** 0..1 across all fifteen chapters - the wide rail's "Study Progress". */
    function courseFraction() {
      var t = courseTotals();
      return t.total ? t.finished / t.total : 0;
    }

    function isChapterDone(n) {
      var entry = manifestEntry(n);
      return !!entry && chapterDone(n) >= entry.sections;
    }

    function onChange(fn) { watchers.push(fn); }
    function fire() { watchers.forEach(function (fn) { fn(); }); }

    /**
     * Refresh the progress chrome in place. Rebuilding the rails here would make
     * paint() call the watchers that call paint(), which is a loop, not a refresh.
     */
    function paint() {
      var t = courseTotals();
      var pct = t.total ? (t.finished / t.total) * 100 : 0;
      var chapters = UI.chapters || [];

      /* Queried by CLASS and updated in a loop, not by id: each reading appears
         twice (rail and phone bottom bar), and the hidden one is hidden, not
         removed, so both must stay current. */
      qa(document, '.js-course-fill').forEach(function (el) {
        el.style.width = pct + '%';
      });
      qa(document, '.js-chapter-count').forEach(function (el) {
        el.textContent = fill(UI.rail.count, {
          n: C.meta.number, total: chapters.length
        });
      });
      qa(document, '.js-section-count').forEach(function (el) {
        el.textContent = fill(UI.rail.count, {
          n: (App.pageIndex < 0 ? 0 : App.pageIndex + 1), total: PAGES.length
        });
      });
      qa(document, '.js-chapter-line').forEach(function (el) {
        el.textContent = fill(UI.rail.chapterOf, {
          n: C.meta.number, total: chapters.length
        });
      });

      qa(document, '.pips--sections .pip').forEach(function (pip, i) {
        pip.classList.toggle('is-done', !!(PAGES[i] && isDone(PAGES[i].id)));
        pip.classList.toggle('is-current', i === App.pageIndex);
      });

      var here = (App.pageIndex >= 0 && PAGES[App.pageIndex])
        ? PAGES[App.pageIndex].id : null;

      qa(document, '.sect').forEach(function (li) {
        var id = li.getAttribute('data-page');
        li.classList.toggle('is-done', isDone(id));
        li.classList.toggle('is-here', id === here);
      });

      qa(document, '.ch').forEach(function (li) {
        var n = parseInt(li.getAttribute('data-chapter'), 10);
        li.classList.toggle('is-done', isChapterDone(n));
      });
    }

    return {
      load: load, mark: mark, unmark: unmark, isDone: isDone, clearAll: clearAll, paint: paint,
      keyFor: keyFor, chapterDone: chapterDone, courseTotals: courseTotals,
      courseFraction: courseFraction, isChapterDone: isChapterDone,
      onChange: onChange
    };
  })();


  var App = {
    pageIndex: 0,
    entry: null,      /* the live page entry */
    cache: {},        /* pageId -> entry, kept so a revisit resumes */
    stage: null
  };

  function setHash(id) {
    try { window.history.replaceState(null, '', '#' + id); }
    catch (e) { /* file:// - carry on without deep links */ }
  }

  /** Build the (initially empty) entry for a page, or return the cached one. */
  function entryFor(page) {
    if (App.cache[page.id] && !page.refreshOnVisit) return App.cache[page.id];

    /* No heading, kicker or subtitle: the beats are the content, and the
       step rail plus the breadcrumb already say where the reader is. */
    var article = el('<article class="page"><div class="page__body"></div></article>');

    var entry = {
      page: page,
      article: article,
      body: q(article, '.page__body'),
      els: [],        /* one <section class="beat"> per rendered beat */
      ctris: [],      /* the controller each beat renderer returned */
      index: -1,
      store: {}       /* shared scratch space between a page's beats */
    };
    App.cache[page.id] = entry;
    return entry;
  }

  /**
   * Create the <section> for one beat, hand its two cards to the matching
   * renderer, and wire the confirm button. A BEAT IS TWO CARDS (brief + work),
   * and either may stay empty, in which case it is not drawn at all.
   */
  function mountBeat(entry, index) {
    var beat = entry.page.beats[index];
    var section = el('' +
      '<section class="beat">' +
        '<div class="beat__brief" hidden></div>' +
        '<div class="beat__work"></div>' +
        '<div class="beat__confirm"></div>' +
      '</section>');

    var brief = q(section, '.beat__brief');
    var content = q(section, '.beat__work');
    var slot = q(section, '.beat__confirm');
    var ctrl = {};

    /* The button that closes a step is not the same act as the ones that
       move within it, so it does not read the same: it names the step it
       opens, and it carries a full arrow rather than a chevron. */
    var closesStep = index === entry.page.beats.length - 1 &&
                     App.pageIndex < PAGES.length - 1;
    var closeLabel = closesStep
      ? fill(UI.nextStep, { name: PAGES[App.pageIndex + 1].nav.label })
      : null;
    var closeIcon = closesStep ? 'arrow-right' : 'chevron-right';

    function showConfirm(label) {
      var existing = q(slot, '.btn');
      if (existing) {
        if (label) q(existing, 'span').textContent = label;
        return;
      }
      slot.innerHTML = '<button class="btn btn--primary btn--go" type="button">' +
        '<span>' + esc(label || closeLabel || beat.confirm || UI.confirm) + '</span>' +
        ic(closeIcon, 16) + '</button>';
      q(slot, '.btn').addEventListener('click', confirmBeat);

      /* The job of a "do this" button is done once it is done - demote it so
         Continue is the next action. This covers every module primary in the work
         card (not just `.beat__actions`), so a beat shows exactly one. */
      qa(section, '.beat__work .btn--primary, .beat__actions .btn--primary').forEach(function (b) {
        b.classList.remove('btn--primary');
      });
    }

    function showWait() {
      if (!beat.waitHint) { slot.innerHTML = ''; return; }
      slot.innerHTML = '<span class="beat__wait">' + ic('mouse-pointer-click', 14) +
        '<span>' + esc(beat.waitHint) + '</span></span>';
    }

    var api = {
      store: entry.store,
      /* The standard "close this step" label, so a renderer that needs to say
         something about it does not have to invent its own wording. */
      closeLabel: closeLabel,

      /**
       * The explanation half of the beat, drawn in the upper card; whatever the
       * renderer writes into its host afterwards is the lower one. Called with
       * nothing, the upper card simply does not appear.
       */
      brief: function (markup) {
        if (markup === undefined || markup === null || markup === '') return;
        brief.innerHTML = markup;
        brief.hidden = false;
      },

      /** The beat is satisfied - reveal (or relabel) its confirm button. */
      ready: function (label) { showConfirm(label); },
      setCompleted: function (completed) {
        if (completed) Progress.mark(entry.page.id);
        else Progress.unmark(entry.page.id);
      },

      step: function (label, fn, into) {
        var box = into || content;
        var b = el('<button class="btn btn--primary module-step" type="button">' +
                   '<span>' + esc(label) + '</span>' + ic('arrow-right', 16) + '</button>');
        box.appendChild(b);
        b.addEventListener('click', fn);
        return b;
      },
      /** Back to "not satisfied yet", e.g. the quiz's next statement. */
      wait: showWait,
      /** Let a renderer consume the confirm click (multi-step beats). */
      intercept: function (fn) { ctrl.onConfirm = fn; }
    };

    /* A beat whose content is one statement (a scene, a headline) gets a card
       with the statement centred in it. See `.beat.is-statement`. */
    var factory = BEATS[beat.kind];
    if (factory) {
      var inst = factory(content, beat, api,
                         { esc: esc, ic: ic, gconn: gconn, gnode: gnode, glegend: glegend,
                           grefs: grefs, verdictBlock: verdictBlock,
                           brief: api.brief }) || {};
      if (inst.pause) ctrl.pause = inst.pause;
    } else {
      content.innerHTML = '<p class="hintline">Unknown beat kind: ' + esc(beat.kind) + '</p>';
      api.ready();
    }

    /* The title beat types itself in. Done here rather than inside the scene
       renderer because a renderer only hands back markup - it never sees the
       element that markup lands in. */
    var typed = brief.querySelector('.scene__text');
    if (typed) Typing.type(typed, typed.textContent);

    if (!brief.hidden && !content.innerHTML.trim()) section.classList.add('is-statement');

    if (!q(slot, '.btn')) showWait();

    section.setAttribute('data-kind', beat.kind);

    entry.els[index] = section;
    entry.ctris[index] = ctrl;
    entry.body.appendChild(section);
    return section;
  }

  function showBeat(entry, index) {
    entry.index = index;
    var section = entry.els[index] || mountBeat(entry, index);
    section.classList.remove('is-past');
    Progress.paint();         /* the rail's circle for this section */
    Chat.refresh();           /* the tutor's "Reading: ..." strip */
  }

  /** Drop the beat at `index` (and anything after) so it can be rebuilt. */
  function rewindTo(entry, index) {
    for (var i = index; i < entry.els.length; i++) {
      var node = entry.els[i];
      if (node && node.parentNode) node.parentNode.removeChild(node);
      entry.els[i] = null;
      entry.ctris[i] = null;
    }
    entry.els.length = index;
    entry.ctris.length = index;
  }


  /** Confirm the live beat: the renderer may consume the click first. */
  function confirmBeat() {
    var entry = App.entry;
    if (!entry) return;
    var ctrl = entry.ctris[entry.index];
    if (ctrl && ctrl.onConfirm && ctrl.onConfirm() === true) return;
    advanceBeat();
  }

  function advanceBeat() {
    var entry = App.entry;
    var i = entry.index;
    var section = entry.els[i];
    var ctrl = entry.ctris[i];

    /* fade this beat back and take its button away - the reader is done here */
    section.classList.add('is-past');
    q(section, '.beat__confirm').innerHTML = '';
    if (ctrl && ctrl.pause) ctrl.pause();

    if (i < entry.page.beats.length - 1) {
      showBeat(entry, i + 1);
      scrollTo_(entry.els[i + 1]);
      return;
    }

    /* Last beat of the page, and the reader has just confirmed it. That click -
       not merely arriving here - is what finishes the step and opens the next one. */
    Progress.mark(entry.page.id);

    if (App.pageIndex < PAGES.length - 1) {
      showPage(App.pageIndex + 1);
      window.scrollTo(0, 0);
    } else {
      /* The last section of a chapter goes on to the next chapter. It is a
         different content file, but not a different page - see loadChapter. */
      openChapterHref(C.meta.nextUrl);
    }
  }

  /** Step back one beat. The target beat is rebuilt so it can be redone. */
  function backBeat() {
    var entry = App.entry;
    if (!entry) return;

    if (entry.index <= 0) {
      if (App.pageIndex > 0) showPage(App.pageIndex - 1);
      return;
    }

    var target = entry.index - 1;
    rewindTo(entry, target);
    showBeat(entry, target);
    scrollTo_(entry.els[target]);
  }

  function showPage(index) {
    if (index < 0 || index >= PAGES.length) return;

    /* No unlock check: every section is open from the first visit. */

    if (App.entry && App.entry.ctris[App.entry.index] &&
        App.entry.ctris[App.entry.index].pause) {
      App.entry.ctris[App.entry.index].pause();
    }

    var page = PAGES[index];
    var entry = entryFor(page);
    App.pageIndex = index;
    App.entry = entry;

    App.stage.innerHTML = '';
    App.stage.appendChild(entry.article);

    var lastIdx = page.beats.length - 1;
    if (entry.index < 0) {
      showBeat(entry, 0);
    } else if (entry.index === lastIdx && entry.els[lastIdx] &&
               entry.els[lastIdx].classList.contains('is-past')) {
      /* The reader already finished this page. Rewind its final beat so they
         are not greeted by a fully dimmed screen with no way onward. */
      rewindTo(entry, lastIdx);
      showBeat(entry, lastIdx);
    } else {
      Progress.paint();
    }

    /* The rail's section list is where "you are here" is said: the app bar
       carries no location, and there is no breadcrumb any more. */
    renderBottombar();
    Progress.paint();
    setHash(page.id);
    updatePracticeLink();
    Chat.refresh();

    document.title = C.meta.title + ' · ' + page.nav.label + ' — ' + UI.brand;
    resetContentScroll();
    try { App.stage.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
  }

  function resetChapterState(pageId) {
    var handler = C.onRestart;
    if (typeof handler !== 'function') {
      // Cached renderers retain lifecycle hooks even when content is reloaded.
      var beat = PAGES.reduce(function (all, page) { return all.concat(page.beats); }, []).find(function (item) {
        return BEATS[item.kind] && typeof BEATS[item.kind].onRestart === 'function';
      });
      handler = beat && BEATS[beat.kind].onRestart;
    }
    if (typeof handler === 'function') handler(pageId);
  }

  function restart() {
    if (App.entry && App.entry.ctris[App.entry.index] &&
        App.entry.ctris[App.entry.index].pause) {
      App.entry.ctris[App.entry.index].pause();
    }
    var restartIndex = PAGES[App.pageIndex].restartInPlace ? App.pageIndex : 0;
    resetChapterState(PAGES[App.pageIndex].id);
    App.cache = {};
    App.entry = null;
    showPage(restartIndex);
    window.scrollTo(0, 0);
  }

  /** Throw away every rendered page so the next visit rebuilds it. */
  function clearCache() {
    resetChapterState();
    App.cache = {};
    App.entry = null;
  }

  var Typing = (function () {
    var CAP = 700;

    function type(el, text) {
      if (!el) return;
      var reduce = window.matchMedia &&
                   window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduce || text.length < 2) {
        el.setAttribute('data-typed', 'done');
        return;
      }
      var step = Math.max(12, Math.min(34, Math.round(CAP / text.length)));
      var i = 0;
      el.textContent = '';
      el.setAttribute('data-typed', 'running');
      (function next() {
        el.textContent = text.slice(0, ++i);
        if (i < text.length) { window.setTimeout(next, step); return; }
        el.setAttribute('data-typed', 'done');
      })();
    }

    return { type: type };
  })();


  /* Two tables, merged and never extended: BUILTIN is what THIS file draws,
     window.CHAPTER_BEATS is what a lab adds. The live table is rebuilt on every
     chapter switch, and BUILTIN wins a name clash. */
  var BUILTIN = Object.create(null);
  var BEATS = {};

  function rebuildBeats() {
    BEATS = Object.assign({}, window.CHAPTER_BEATS || {}, BUILTIN);
  }

  BUILTIN.scene = function (host, beat, api) {
    /* All brief and nothing to act on: a scene draws one card. */
    api.brief('' +
      '<div class="scene">' +
        '<div class="scene__icon">' + ic(beat.icon, 30) + '</div>' +
        '<div class="scene__body">' +
          '<p class="scene__text">' + esc(beat.text) + '</p>' +
          (beat.parts
            ? '<div class="scene__rule">' +
                '<div class="template">' +
                  beat.parts.map(function (p, i) {
                    return '<span class="template__part" data-tone="' + esc(p.tone) + '"' +
                           ' style="animation-delay:' + (i * 60) + 'ms">' + esc(p.text) + '</span>';
                  }).join('') +
                '</div>' +
              '</div>'
            : '') +
        '</div>' +
      '</div>');

    api.ready();
    return {};
  };

  /* This beat asks about the FILES themselves, so the FileCards shape is right:
     the four options ARE the four files, and each card is a button (pick: true).
     Replaced a one-off filegrid whose selected state was .is-selected. */
  BUILTIN.fileGuess = function (host, beat, api) {
    var picked = api.store.picked || null;

    /* The question is the brief; the hint under the cards stays with the
       cards, because it is feedback about what you just did. */
    api.brief(questionBar(beat.question));

    /* The card's note is the file's date and size, kept because this question is
       about "date and size cannot save you": at reveal, the numbers each point a
       different way. */
    function items() {
      return beat.files.map(function (f) {
        return {
          id: f.name,
          name: f.name,
          icon: f.icon || 'file-text',
          note: f.date + ' · ' + f.size,
          picked: f.name === picked
        };
      });
    }

    host.innerHTML =
      FileCards.render({ pick: true, items: items() }) +
      '<span class="hintline" id="guessHint"></span>';

    var hint = q(host, '#guessHint');

    /* Flip the picked state on the drawn cards only, never redraw: redrawing
       replays the component's entrance animation and the grid flickers. */
    function paint() {
      qa(host, '[data-fcard]').forEach(function (card) {
        var on = card.getAttribute('data-fcard') === picked;
        card.classList.toggle('is-picked', on);
        card.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      hint.innerHTML = picked
        ? ic('check', 14) + '<span class="is-set">' + esc(fill(beat.picked, { name: picked })) + '</span>'
        : ic('mouse-pointer-click', 14) + '<span>' + esc(beat.hint) + '</span>';
    }

    /* One delegated listener on host: the cards are drawn by the component, so a
       per-card bind would be lost on redraw. */
    FileCards.bind(host, function (name) {
      picked = name;
      api.store.picked = picked;
      paint();
      api.ready();
    });

    paint();
    if (picked) api.ready();
    return {};
  };

  BUILTIN.answerReveal = function (host, beat, api) {
    var picked = api.store.picked;

    api.brief('' +
      '<div class="answer">' +
        '<div class="answer__icon">' + ic(beat.icon, 30) + '</div>' +
        '<div>' +
          '<p class="answer__headline">' + esc(beat.headline) + '</p>' +
          '<p class="answer__text">' +
            esc(picked ? fill(beat.pickedEcho, { name: picked }) : beat.pickedNone) +
          '</p>' +
        '</div>' +
      '</div>');

    host.innerHTML = '' +
      '<ol class="rules">' +
        beat.rules.map(function (r, i) {
          return '' +
            '<li class="rule" style="animation-delay:' + (i * 150) + 'ms">' +
              '<span class="rule__icon">' + ic(r.icon, 18) + '</span>' +
              '<span class="rule__label">' + esc(r.label) + '</span>' +
              gconn('faint flush') +
              '<span class="rule__file mono">' + esc(r.file) + '</span>' +
              '<span class="rule__short">' + esc(r.short) + '</span>' +
            '</li>';
        }).join('') +
      '</ol>' +

      verdictBlock(beat.verdict);

    api.ready();
    return {};
  };

  BUILTIN.filePile = function (host, beat, api) {
    var m = beat.machine;
    var state = 'idle';      /* idle | playing | done */
    var timers = [];
    var announced = false;

    function nameFor(s) {
      return s.date + '_' + m.stem + '_v' + String(s.v).padStart(2, '0') + '.' + m.ext;
    }
    /* 20260914 -> "14 Sep" */
    function dayOf(s) {
      var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return Number(s.date.slice(6, 8)) + ' ' + months[Number(s.date.slice(4, 6)) - 1];
    }

    host.innerHTML =
      '<div class="fp-board">' +
        /* Control bar on top: the list grows downward and it does not move. */
        '<div class="fp-bar">' +
          '<span class="fp-clock">' + ic('calendar-days', 15) + '<span data-fp-clock>Before any save</span></span>' +
          '<button class="btn btn--primary fp-run" type="button" data-fp-run>' +
            ic('play', 16) + '<span>Let two weeks pass</span></button>' +
        '</div>' +
        '<ul class="fp-list" data-fp-list></ul>' +
      '</div>';

    var list = q(host, '[data-fp-list]');
    var clock = q(host, '[data-fp-clock]');
    var run = q(host, '[data-fp-run]');

    function label(text, icon) {
      run.innerHTML = ic(icon, 16) + '<span>' + esc(text) + '</span>';
    }

    function play() {
      if (state === 'playing') return;                 /* gate 1: ignore while playing */
      state = 'playing';
      run.disabled = true;                             /* gate 2: two clicks = two timers on one counter */
      label('Two weeks…', 'loader-circle');
      list.innerHTML = '';
      clock.textContent = 'Before any save';

      var i = 0;
      (function step() {
        if (i >= m.saves.length) {
          state = 'done';
          run.disabled = false;
          label('Watch it again', 'rotate-ccw');       /* not disabled, just relabelled */
          clock.textContent = m.saves.length + ' saves over two weeks';
          if (!announced) { announced = true; api.ready(); }
          return;
        }
        var s = m.saves[i];
        var li = el('<li class="fp-item">' +
          '<span class="fp-item__icon">' + ic('file-text', 15) + '</span>' +
          '<span class="fp-item__name">' + esc(nameFor(s)) + '</span>' +
          '</li>');
        list.appendChild(li);
        clock.textContent = dayOf(s) + ' · ' + (i + 1) +
          (i === 0 ? ' save' : ' saves');
        i++;
        timers.push(setTimeout(step, 130));
      })();
    }

    run.addEventListener('click', play);
    return {
      /* Stop the timers on leaving this beat, or they keep appending nodes to a
         list that is no longer in the document. */
      pause: function () { timers.forEach(clearTimeout); timers = []; }
    };
  };

  BUILTIN.painHunt = function (host, beat, api) {
    var found = {};

    api.brief(questionBar(beat.prompt));

    host.innerHTML = '' +
      '<span class="blocklabel" id="phCount">' + ic('scan-search', 14) +
        '<span>0 / ' + beat.pains.length + ' ' + esc(beat.foundLabel) + '</span></span>' +
      '<div class="pains">' +
        beat.pains.map(function (p) {
          return '' +
            '<button class="pain" type="button" data-pain="' + esc(p.id) + '">' +
              '<span class="pain__check">' + ic('check', 12) + '</span>' +
              '<span class="pain__icon">' + ic(p.icon, 19) + '</span>' +
              '<span class="pain__label">' + esc(p.label) + '</span>' +
              '<span class="pain__note">' + esc(p.note) + '</span>' +
            '</button>';
        }).join('') +
      '</div>' +
      '<div class="beat__verdict" id="phVerdict"></div>';

    var count = q(host, '#phCount');

    qa(host, '[data-pain]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-pain');
        if (found[id]) return;
        found[id] = true;
        btn.disabled = true;        /* already found - a dead control should say so */
        btn.classList.add('is-found');

        var n = Object.keys(found).length;
        count.innerHTML = ic('scan-search', 14) + '<span>' +
          n + ' / ' + beat.pains.length + ' ' + esc(beat.foundLabel) + '</span>';

        if (n === beat.pains.length) {
          q(host, '#phVerdict').innerHTML = verdictBlock(beat.verdict);
          api.ready();
        }
      });
    });

    return {};
  };

  BUILTIN.pipelineRun = function (host, beat, api) {
    var flipped = {};      /* which cards are face-up right now */
    var seen = {};         /* which cards have been FLIPPED - flipping back does not undo */
    var readySent = false;

    host.innerHTML =
      '<div class="caps caps--pipe">' +
        beat.stages.map(function (s, i) {
          return '' +
            '<div class="cap" data-stage="' + i + '"' +
              ' role="button" tabindex="0" aria-pressed="false">' +
              '<div class="cap__inner">' +
                '<div class="cap__face cap__face--front">' +
                  '<span class="pipe__num">0' + (i + 1) + '</span>' +
                  '<div class="cap__icon">' + ic(s.icon, 29) + '</div>' +
                  '<div class="cap__label">' + esc(s.label) + '</div>' +
                  '<div class="pipe__note">' + esc(s.note) + '</div>' +
                  '<div class="cap__hint">' + ic('mouse-pointer-click', 13) +
                    '<span>' + esc(beat.flipHint) + '</span></div>' +
                '</div>' +
                '<div class="cap__face cap__face--back">' +
                  '<div class="cap__caption">' + esc(s.detail) + '</div>' +
                  '<div class="cap__backhint">' + esc(beat.backHint) + '</div>' +
                '</div>' +
              '</div>' +
            '</div>';
        }).join('') +
      '</div>';

    function toggle(card) {
      var i = card.getAttribute('data-stage');
      flipped[i] = !flipped[i];
      card.classList.toggle('is-flipped', flipped[i]);
      card.setAttribute('aria-pressed', String(!!flipped[i]));

      /* Count FLIPPED, not "currently face-up": flipping back to re-read the front
         must not undo a completed step. */
      if (flipped[i]) seen[i] = true;
      if (Object.keys(seen).length === beat.stages.length && !readySent) {
        readySent = true;
        api.ready();
      }
    }

    /* Listener on the WHOLE card: front and back both count, so a second click flips back. */
    qa(host, '.cap').forEach(function (card) {
      card.addEventListener('click', function () { toggle(card); });
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(card); }
      });
    });

    return {};
  };

  BUILTIN.funnelReveal = function (host, beat, api) {
    var last = beat.steps.length - 1;
    var state = 'idle';
    var timers = [];
    var announced = false;

    host.innerHTML = '' +
      '<div class="funnel">' +
        '<div class="funnel__bar">' +
          '<button class="btn btn--primary funnel__run" type="button" data-funnel-run>' +
            ic('play', 16) + '<span>Follow the name in</span></button>' +
          '<span class="funnel__progress" data-funnel-progress>Not started</span>' +
        '</div>' +
        '<div class="funnel__stack" data-funnel-stack>' +
          beat.steps.map(function (s, i) {
            return (i ? gconn('faint flush') : '') +
              '<div class="funnel__step is-off' + (i === last ? ' is-final' : '') + '"' +
                ' data-step="' + i + '">' +
                '<span class="funnel__text">' + esc(s.text) + '</span>' +
                '<span class="funnel__short">' + esc(s.short) + '</span>' +
                '<span class="funnel__detail" id="fnDetail' + i + '" hidden>' +
                  esc(s.detail) + '</span>' +
              '</div>';
          }).join('') +
        '</div>' +
      '</div>' +
      '<div class="beat__verdict">' + verdictBlock(beat.verdict, 'info') + '</div>';

    var run = q(host, '[data-funnel-run]');
    var progress = q(host, '[data-funnel-progress]');
    var steps = qa(host, '.funnel__step');

    function label(text, icon) {
      run.innerHTML = ic(icon, 16) + '<span>' + esc(text) + '</span>';
    }

    function play() {
      if (state === 'playing') return;
      state = 'playing';
      run.disabled = true;
      label('Narrowing…', 'loader-circle');
      progress.textContent = '';
      steps.forEach(function (c) {
        c.classList.add('is-off');
        var d = q(c, '.funnel__detail');
        if (d) d.hidden = true;
      });

      var i = 0;
      function step() {
        if (i >= beat.steps.length) {
          state = 'done';
          run.disabled = false;
          label('Watch it again', 'rotate-ccw');
          progress.textContent = beat.steps[last].text;
          if (!announced) { announced = true; api.ready(); }
          return;
        }
        steps[i].classList.remove('is-off');
        q(steps[i], '.funnel__detail').hidden = false;
        progress.textContent = beat.steps[i].text;
        i++;
        timers.push(setTimeout(step, 720));
      }
      step();
    }

    run.addEventListener('click', play);
    return {
      pause: function () { timers.forEach(clearTimeout); timers = []; }
    };
  };

  BUILTIN.capabilityCards = function (host, beat, api) {
    var flipped = {};   /* which cards are face-up right now */
    var seen = {};      /* which cards have been FLIPPED - flipping back does not undo */
    var readySent = false;

    host.innerHTML =
      '<div class="caps">' +
        beat.cards.map(function (c) {
          return '' +
            /* The focusable, clickable element is the WHOLE card, not the front face:
               with the listener on the front face, flipping turned it away and the
               reader hit the back, which had none - a card could flip only once. */
            '<div class="cap" data-cap="' + esc(c.id) + '" data-demo="' + esc(c.demo) + '"' +
              ' role="button" tabindex="0" aria-pressed="false">' +
              '<div class="cap__inner">' +
                '<div class="cap__face cap__face--front">' +
                  '<div class="cap__icon">' + ic(c.icon, 29) + '</div>' +
                  '<div class="cap__label">' + esc(c.label) + '</div>' +
                  '<div class="cap__hint">' + ic('mouse-pointer-click', 13) +
                    '<span>' + esc(beat.flipHint) + '</span></div>' +
                '</div>' +
                '<div class="cap__face cap__face--back">' +
                  '<div class="cap__caption">' + esc(c.caption) + '</div>' +
                  '<div class="cap__demo"></div>' +
                  '<div class="cap__backhint">' + esc(beat.backHint) + '</div>' +
                '</div>' +
              '</div>' +
            '</div>';
        }).join('') +
      '</div>';

    function toggle(card) {
      var id = card.getAttribute('data-cap');
      flipped[id] = !flipped[id];
      card.classList.toggle('is-flipped', flipped[id]);
      card.setAttribute('aria-pressed', String(!!flipped[id]));

      /* re-inject the demo when the back face appears, so its CSS
         animations replay from the start on every flip */
      if (flipped[id]) q(card, '.cap__demo').innerHTML = demo(card.getAttribute('data-demo'));

      /* "Flip all six to continue" counts FLIPPED, not currently face-up: flipping
         back to re-read the front must not undo a completed step. So it records
         `seen`, not `flipped`. */
      if (flipped[id]) seen[id] = true;
      if (Object.keys(seen).length === beat.cards.length && !readySent) {
        readySent = true;
        api.ready();
      }
    }

    /* Listener on the WHOLE card: front and back both count, so a second click flips back. */
    qa(host, '.cap').forEach(function (card) {
      card.addEventListener('click', function () { toggle(card); });
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(card); }
      });
    });

    return {};
  };

  function demo(kind) {
    var open = '<svg viewBox="-8 -6 136 72" preserveAspectRatio="xMidYMid meet">';
    var close = '</svg>';

    if (kind === 'commits') {
      return open +
        '<path class="d-line" d="M12 30 H108"/>' +
        '<circle class="d-node d-anim-node" cx="20" cy="30" r="6"/>' +
        '<circle class="d-node d-anim-node" cx="45" cy="30" r="6" style="animation-delay:130ms"/>' +
        '<circle class="d-node d-anim-node" cx="70" cy="30" r="6" style="animation-delay:260ms"/>' +
        '<circle class="d-node--accent d-anim-node" cx="96" cy="30" r="7" style="animation-delay:390ms"/>' +
        close;
    }

    if (kind === 'timeline') {
      return open +
        '<path class="d-line" d="M12 44 H108"/>' +
        '<circle class="d-node--muted" cx="22" cy="44" r="5"/>' +
        '<circle class="d-node--muted" cx="50" cy="44" r="5"/>' +
        '<circle class="d-node--muted" cx="78" cy="44" r="5"/>' +
        '<circle class="d-node--accent d-anim-node" cx="104" cy="44" r="6"/>' +
        '<path class="d-line d-line--accent d-anim-draw" d="M104 36 C 104 14, 50 12, 50 34"/>' +
        '<path class="d-fill-accent d-anim-node" d="M50 36 L45 27 L55 27 Z"/>' +
        close;
    }

    if (kind === 'branch') {
      return open +
        '<path class="d-line" d="M10 42 H72"/>' +
        '<path class="d-line d-line--accent d-anim-draw" d="M40 42 C 40 24, 48 16, 62 16"/>' +
        '<path class="d-line d-line--accent" d="M62 16 H96"/>' +
        '<circle class="d-node" cx="18" cy="42" r="5"/>' +
        '<circle class="d-node" cx="40" cy="42" r="5"/>' +
        '<circle class="d-node--accent d-anim-node" cx="62" cy="16" r="5"/>' +
        '<circle class="d-node--accent d-anim-node" cx="80" cy="16" r="5" style="animation-delay:150ms"/>' +
        '<circle class="d-node--accent d-anim-node" cx="96" cy="16" r="5" style="animation-delay:300ms"/>' +
        close;
    }

    if (kind === 'merge') {
      return open +
        '<path class="d-line" d="M16 42 H84"/>' +
        '<path class="d-line" d="M84 42 C 93 42, 93 30, 100 30"/>' +
        '<path class="d-line d-line--info d-anim-draw" d="M38 42 C 38 22, 44 16, 56 16"/>' +
        '<path class="d-line d-line--info" d="M56 16 H76"/>' +
        '<path class="d-line d-line--info d-anim-draw" d="M76 16 C 88 16, 90 30, 100 30" style="animation-delay:200ms"/>' +
        '<circle class="d-node" cx="16" cy="42" r="5"/>' +
        '<circle class="d-node" cx="38" cy="42" r="5"/>' +
        '<circle class="d-node" cx="84" cy="42" r="5"/>' +
        '<circle class="d-node--info d-anim-node" cx="56" cy="16" r="5" style="animation-delay:180ms"/>' +
        '<circle class="d-node--info d-anim-node" cx="76" cy="16" r="5" style="animation-delay:300ms"/>' +
        '<circle class="d-node--accent d-anim-node" cx="102" cy="30" r="7" style="animation-delay:460ms"/>' +
        close;
    }

    if (kind === 'team') {
      return open +
        '<path class="d-line d-anim-draw" d="M32 16 C 50 18, 58 24, 66 29"/>' +
        '<path class="d-line d-anim-draw" d="M32 44 C 50 42, 58 36, 66 31" style="animation-delay:120ms"/>' +
        '<path class="d-line d-line--good d-anim-draw" d="M86 30 H102" style="animation-delay:300ms"/>' +
        '<circle class="d-node--info" cx="22" cy="16" r="8"/>' +
        '<circle class="d-node--info" cx="22" cy="44" r="8"/>' +
        '<circle class="d-node--accent d-anim-node" cx="76" cy="30" r="10" style="animation-delay:220ms"/>' +
        '<circle class="d-node--good d-anim-node" cx="106" cy="30" r="6" style="animation-delay:400ms"/>' +
        close;
    }

    /* automate */
    return open +
      '<circle class="d-line" cx="30" cy="30" r="13"/>' +
      '<circle class="d-line d-line--accent" cx="30" cy="30" r="4"/>' +
      '<path class="d-line" d="M30 17 V10"/><path class="d-line" d="M30 43 V50"/>' +
      '<path class="d-line" d="M17 30 H10"/><path class="d-line" d="M43 30 H50"/>' +
      '<path class="d-line" d="M66 30 H88"/>' +
      '<circle class="d-node--good d-anim-node" cx="100" cy="30" r="11" style="animation-delay:200ms"/>' +
      '<path class="d-line d-line--good d-anim-draw" d="M95 30 l4 4 l7 -9" style="animation-delay:420ms"/>' +
      close;
  }

  BUILTIN.bucketSort = function (host, beat, api) {
    var placed = {};
    var picked = null;

    api.brief(questionBar(beat.prompt));

    host.innerHTML = '' +
      '<div class="sortgame__tray" id="bsTray"></div>' +
      '<div class="sortgame__buckets">' +
        beat.buckets.map(function (b) {
          return '' +
            '<div class="bucket" data-bucket="' + esc(b.id) + '">' +
              '<div class="bucket__head">' +
                '<div class="bucket__icon">' + ic(b.icon, 20) + '</div>' +
                '<div>' +
                  '<div class="bucket__title">' + esc(b.title) + '</div>' +
                  '<div class="bucket__sub">' + esc(b.subtitle) + '</div>' +
                '</div>' +
                '<span class="bucket__count" data-count="' + esc(b.id) + '">0</span>' +
              '</div>' +
              '<div class="bucket__body" data-drop="' + esc(b.id) + '"></div>' +
            '</div>';
        }).join('') +
      '</div>' +
      '<span class="hintline" id="bsHint"></span>' +
      '<div class="beat__verdict" id="bsVerdict"></div>';

    var tray = q(host, '#bsTray');
    var hint = q(host, '#bsHint');

    /* chips are built once and moved, never rebuilt */
    var chips = {};
    beat.chips.forEach(function (c) {
      /* role + tabindex instead of a real <button>: form controls are
         unreliable drag sources, and this one is dragged by pointer events
         we run ourselves rather than by the browser. */
      var chip = el('' +
        '<div class="chip" role="button" tabindex="0" data-chip="' + esc(c.id) + '">' +
          ic(c.icon, 16) + '<span>' + esc(c.label) + '</span>' +
        '</div>');

      function arm() {
        if (placed[c.id]) return;
        picked = picked === c.id ? null : c.id;
        paintPicked();
      }

      chip.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); arm(); }
      });
      chip.addEventListener('click', function () {
        /* A press that turned into a drag still ends with a click on the
           chip; that click must not also toggle the armed state. */
        if (chip.__dragged) { chip.__dragged = false; return; }
        arm();
      });

      chips[c.id] = chip;
      tray.appendChild(chip);
    });

    function paintPicked() {
      beat.chips.forEach(function (c) {
        chips[c.id].classList.toggle('is-picked', picked === c.id);
      });
      qa(host, '.bucket').forEach(function (b) {
        b.classList.toggle('is-target', !!picked);
      });
    }

    function paintCounts() {
      beat.buckets.forEach(function (b) {
        var total = beat.chips.filter(function (c) { return c.bucket === b.id; }).length;
        var n = beat.chips.filter(function (c) {
          return c.bucket === b.id && placed[c.id];
        }).length;
        q(host, '[data-count="' + b.id + '"]').textContent = n + ' / ' + total;
      });
    }

    function place(chipId, bucketId) {
      var data = beat.chips.filter(function (c) { return c.id === chipId; })[0];
      if (!data || placed[chipId]) return;

      var bucketEl = q(host, '.bucket[data-bucket="' + bucketId + '"]');
      var chipEl = chips[chipId];

      if (data.bucket === bucketId) {
        placed[chipId] = true;
        picked = null;
        hint.innerHTML = '';
        chipEl.classList.remove('is-picked');
        /* a div cannot be `disabled`, so mark it for assistive tech and let
           `is-locked` (pointer-events: none) take it out of the pointer's way -
           so a drop aimed at a placed chip lands on the bucket behind it. */
        chipEl.setAttribute('aria-disabled', 'true');
        chipEl.classList.add('is-right', 'is-locked');
        q(bucketEl, '.bucket__body').appendChild(chipEl);
        bucketEl.classList.add('is-good');
        setTimeout(function () { bucketEl.classList.remove('is-good'); }, 600);
        paintPicked();
        paintCounts();

        if (Object.keys(placed).length === beat.chips.length) {
          q(host, '#bsVerdict').innerHTML = verdictBlock(beat.verdict, 'good');
          api.ready();
        }
      } else {
        chipEl.classList.add('is-wrong');
        bucketEl.classList.add('is-bad');
        /* Say why, without naming the column the card belongs to: the column's
           own criterion is the rule the reader is being asked to apply. */
        var column = beat.buckets.filter(function (b) { return b.id === bucketId; })[0];
        hint.innerHTML = ic('circle-help', 14) + '<span>' + esc(data.label) +
          ' does not belong here. This column is: ' + esc(column.subtitle) + '</span>';
        setTimeout(function () {
          chipEl.classList.remove('is-wrong');
          bucketEl.classList.remove('is-bad');
        }, 460);
      }
    }

    /* The whole bucket is the target, header included: people aim at the heading,
       which a body-only handler ignored. */
    qa(host, '.bucket').forEach(function (bucketEl) {
      var bucketId = bucketEl.getAttribute('data-bucket');
      bucketEl.addEventListener('click', function () {
        if (picked) place(picked, bucketId);
      });
    });

    /* dragging: pointer events, NOT HTML5 drag-and-drop. A native drag is a
       browser-owned session script cannot end, so a mid-flight upset freezes the
       page with the pointer captured. Pointer events keep the gesture in script. */
    var DRAG_SLOP = 4;                    /* px of travel before it is a drag */

    /** The bucket whose box contains this point, if any. */
    function bucketAt(x, y) {
      var found = null;
      qa(host, '.bucket').forEach(function (b) {
        var r = b.getBoundingClientRect();
        if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) found = b;
      });
      return found;
    }

    function attachDrag(chip, c) {
      var pointerId = null, startX = 0, startY = 0, live = false, over = null;

      function paintOver(bucketEl) {
        if (over === bucketEl) return;
        if (over) over.classList.remove('is-over');
        over = bucketEl;
        if (over) over.classList.add('is-over');
      }

      function end() {
        if (pointerId !== null) {
          try { chip.releasePointerCapture(pointerId); } catch (err) { /* ignore */ }
        }
        pointerId = null;
        live = false;
        chip.classList.remove('is-dragging');
        chip.style.transform = '';
        document.body.classList.remove('is-dragging-chip');
        paintOver(null);
      }

      chip.addEventListener('pointerdown', function (e) {
        if (placed[c.id] || e.button !== 0) return;
        pointerId = e.pointerId;
        startX = e.clientX;
        startY = e.clientY;
        live = false;
        try { chip.setPointerCapture(pointerId); } catch (err) { /* ignore */ }
      });

      chip.addEventListener('pointermove', function (e) {
        if (pointerId === null || e.pointerId !== pointerId) return;
        if (!live) {
          if (Math.abs(e.clientX - startX) < DRAG_SLOP &&
              Math.abs(e.clientY - startY) < DRAG_SLOP) return;
          live = true;
          picked = c.id;
          paintPicked();
          chip.classList.add('is-dragging');
          document.body.classList.add('is-dragging-chip');
        }
        e.preventDefault();               /* no text selection while dragging */
        chip.style.transform =
          'translate(' + (e.clientX - startX) + 'px,' + (e.clientY - startY) + 'px)';
        paintOver(bucketAt(e.clientX, e.clientY));
      });

      /* One exit for the gesture, whichever path reaches it: it settles the drag
         AND finishes the drop, so an unexpected release still places the chip. The
         `pointerId === null` guard makes the second caller a no-op. */
      function release(e) {
        if (pointerId === null || e.pointerId !== pointerId) return;
        var target = live ? bucketAt(e.clientX, e.clientY) : null;
        var wasLive = live;
        if (wasLive) chip.__dragged = true;      /* swallow the trailing click */
        end();
        if (wasLive && target) place(c.id, target.getAttribute('data-bucket'));
        /* released over nothing: the chip stays armed, so a click finishes it */
      }

      chip.addEventListener('pointerup', release);
      chip.addEventListener('pointercancel', function (e) {
        if (pointerId !== null && e.pointerId === pointerId) end();
      });

      /* Belt and braces. Capture should deliver the release to the chip even
         when the pointer has left it, but if capture is ever lost this still
         ends the gesture instead of stranding it. */
      document.addEventListener('pointerup', release);
    }

    Object.keys(chips).forEach(function (id) {
      attachDrag(chips[id], beat.chips.filter(function (c) { return c.id === id; })[0]);
    });

    paintCounts();
    return {};
  };

  BUILTIN.quizRun = function (host, beat, api) {
    var TOTAL = beat.statements.length;
    var index = 0;
    var answers = [];

    host.innerHTML = '' +
      '<div class="quiz__bar">' +
        '<div class="quiz__pips" id="qzPips"></div>' +
        '<span class="quiz__score" id="qzScore"></span>' +
      '</div>' +
      '<div id="qzCard"></div>' +
      '<div class="beat__verdict" id="qzVerdict"></div>';

    var pips = q(host, '#qzPips');
    var cardSlot = q(host, '#qzCard');

    function paintPips() {
      pips.innerHTML = beat.statements.map(function (s, i) {
        var cls = '';
        if (i < answers.length) cls = answers[i].right ? 'is-right' : 'is-wrong';
        else if (i === index) cls = 'is-current';
        return '<span class="quiz__pip ' + cls + '"><i></i></span>';
      }).join('');
      var right = answers.filter(function (a) { return a.right; }).length;
      q(host, '#qzScore').textContent = right + ' / ' + TOTAL;
    }

    function paintCard() {
      var s = beat.statements[index];
      cardSlot.innerHTML = '' +
        '<div class="quiz-card">' +
          '<div class="quiz-card__icon">' + ic(s.icon, 26) + '</div>' +
          '<div class="quiz-card__text">' + esc(s.text) + '</div>' +
          '<div class="quiz-card__actions">' +
            '<button class="tf-btn" type="button" data-value="true">' +
              ic('check', 24) + '<span>' + esc(UI.answer.yes) + '</span></button>' +
            '<button class="tf-btn" type="button" data-value="false">' +
              ic('x', 24) + '<span>' + esc(UI.answer.no) + '</span></button>' +
          '</div>' +
          '<div id="qzFeedback"></div>' +
        '</div>';

      qa(cardSlot, '[data-value]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          answer(btn.getAttribute('data-value') === 'true');
        });
      });

      if (answers[index]) showFeedback(answers[index], s);
    }

    function answer(value) {
      if (answers[index]) return;
      var s = beat.statements[index];
      answers[index] = { value: value, right: value === s.answer };
      paintPips();
      showFeedback(answers[index], s);

      if (index === TOTAL - 1) {
        api.ready(api.closeLabel || UI.confirm);
      } else {
        /* Still questions to answer: the next one is the QUIZ's step, so the
           quiz draws it, inside the card. */
        api.step(beat.nextLabel || 'Next', function () {
          index++;
          paintPips();
          paintCard();
        }, q(cardSlot, '.quiz-card'));
      }
    }

    function showFeedback(entry, s) {
      qa(cardSlot, '[data-value]').forEach(function (btn) {
        var v = btn.getAttribute('data-value') === 'true';
        btn.disabled = true;
        if (v === entry.value) btn.classList.add(entry.right ? 'is-chosen-right' : 'is-chosen-wrong');
        if (!entry.right && v === s.answer) btn.classList.add('is-keyright');
      });

      q(cardSlot, '#qzFeedback').innerHTML =
        '<div class="quiz-feedback ' + (entry.right ? 'is-right' : 'is-wrong') + '">' +
          ic(entry.right ? 'badge-check' : 'circle-help', 18) +
          '<div><b>' + esc(entry.right ? UI.answer.correct : UI.answer.wrong) + '</b>' +
          esc(s.why) + '</div>' +
        '</div>';
    }

    /* Confirming mid-quiz moves to the next statement instead of leaving the
       beat; only after the last statement does the beat itself advance. */
    api.intercept(function () {
      if (!answers[index]) return true;                       /* nothing answered yet */
      if (index < TOTAL - 1) {
        index++;
        paintPips();
        paintCard();
        api.wait();
        return true;
      }
      q(host, '#qzVerdict').innerHTML = verdictBlock(beat.verdict, 'good');
      return false;
    });

    paintPips();
    paintCard();
    return {};
  };

  BUILTIN.finishPanel = function (host, beat, api) {
    host.innerHTML = '' +
      '<div class="finish">' +
        '<div class="finish__icon">' + ic(beat.icon, 32) + '</div>' +
        '<div class="finish__title">' + esc(beat.title) + '</div>' +
        '<div class="finish__recap">' + esc(beat.recap) + '</div>' +
        '<div class="model">' +
          beat.model.map(function (m, i) {
            return (i ? gconn('faint flush') : '') +
              '<div class="model__item">' + ic(m.icon, 22) + '<span>' + esc(m.label) + '</span></div>';
          }).join('') +
        '</div>' +
        /* Where the reader goes next, named. The page's confirm button only says
           "Next chapter", so this is the destination, not a second button. */
        '<div class="finish__next">' + ic('arrow-right', 16) + '<span>' + esc(beat.next) + '</span></div>' +
      '</div>';

    api.ready();
    return {};
  };

  /* Every built-in is registered by now, so the table can be assembled. */
  rebuildBeats();


  var Toast = (function () {
    var host = null;

    function show(message, icon) {
      if (!host) {
        host = el('<div class="toasts" id="toasts" aria-live="polite"></div>');
        document.body.appendChild(host);
      }
      var node = el('<div class="toast" role="status">' +
        ic(icon || 'circle-help', 16) + '<span>' + esc(message) + '</span></div>');
      host.appendChild(node);
      setTimeout(function () {
        node.classList.add('is-out');
        setTimeout(function () {
          if (node.parentNode) node.parentNode.removeChild(node);
        }, 320);
      }, 2800);
    }
    return { show: show };
  })();


  /**
   * The only place that talks to the model. Every call resolves - never rejects -
   * with { ok, text, detail }, so no call site needs its own try/catch.
   */
  var Api = (function () {
    var TEST_TIMEOUT = 12000;
    var CHAT_TIMEOUT = 60000;

    /**
     * Normalise whatever was typed into an OpenAI-compatible base URL. The service
     * lives under /v1, so an endpoint entered without it gets one appended.
     */
    function base(raw) {
      var b = String(raw || '').trim();
      if (!b) return '';
      if (b.charAt(b.length - 1) !== '/') b += '/';
      if (!/\/v1\/$/.test(b)) b += 'v1/';
      return b;
    }

    function chat(cfg, messages, maxTokens) {
      var url = base(cfg.endpoint);
      if (!url) {
        return Promise.resolve({ ok: false, text: '', detail: UI.settings.needEndpoint, ms: 0 });
      }
      if (typeof window.fetch !== 'function') {
        return Promise.resolve({ ok: false, text: '', detail: UI.settings.unreachable, ms: 0 });
      }

      var limit = maxTokens <= 16 ? TEST_TIMEOUT : CHAT_TIMEOUT;
      var ctrl = window.AbortController ? new window.AbortController() : null;
      var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, limit);
      var headers = { 'Content-Type': 'application/json' };
      if (cfg.key) headers.Authorization = 'Bearer ' + cfg.key;

      var started = Date.now();
      function settled(result) {
        clearTimeout(timer);
        result.ms = Date.now() - started;
        return result;
      }
      function failed(detail) { return settled({ ok: false, text: '', detail: detail }); }

      return fetch(url + 'chat/completions', {
        method: 'POST',
        headers: headers,
        signal: ctrl ? ctrl.signal : undefined,
        body: JSON.stringify({
          model: cfg.model || 'default',
          messages: messages,
          max_tokens: maxTokens
        })
      }).then(function (res) {
        if (!res.ok) return failed(fill(UI.settings.httpError, { status: res.status }));
        return res.json().then(function (data) {
          var text = '';
          try { text = String(data.choices[0].message.content || '').trim(); } catch (e) { text = ''; }
          return settled({ ok: true, text: text, detail: '' });
        }, function () {
          return failed(UI.settings.unreachable);
        });
      }).catch(function (err) {
        var timedOut = err && err.name === 'AbortError';
        return failed(timedOut ? fill(UI.settings.timedOut, { seconds: limit / 1000 })
                               : UI.settings.unreachable);
      });
    }

    /** One minimal round-trip, for the Test button in Settings. */
    function test(cfg) {
      return chat(cfg, [{ role: 'user', content: 'ping' }], 16)
        .then(function (r) { return { ok: r.ok, detail: r.detail, ms: r.ms }; });
    }

    return { chat: chat, test: test };
  })();


  var Confirm = (function () {
    var layer = null, titleEl = null, bodyEl = null, goEl = null, noEl = null;
    var onYes = null, returnTo = null;

    function build(host) {
      layer = el('' +
        '<div class="confirm" hidden>' +
          '<div class="confirm__backdrop" data-no></div>' +
          '<div class="confirm__panel" role="alertdialog" aria-modal="true"' +
            ' aria-labelledby="confirmTitle" aria-describedby="confirmBody">' +
            '<div class="confirm__icon">' + ic('triangle-alert', 24) + '</div>' +
            '<h2 class="confirm__title" id="confirmTitle"></h2>' +
            '<p class="confirm__body" id="confirmBody"></p>' +
            '<div class="confirm__actions">' +
              '<button class="btn" type="button" data-no>' +
                '<span>' + esc(UI.settings.confirm.cancel) + '</span></button>' +
              '<button class="btn btn--danger" type="button" data-yes></button>' +
            '</div>' +
          '</div>' +
        '</div>');
      host.appendChild(layer);

      titleEl = q(layer, '#confirmTitle');
      bodyEl = q(layer, '#confirmBody');
      goEl = q(layer, '[data-yes]');
      noEl = q(layer, '.confirm__actions [data-no]');

      qa(layer, '[data-no]').forEach(function (n) {
        n.addEventListener('click', dismiss);
      });
      goEl.addEventListener('click', function () {
        var act = onYes;
        dismiss();
        if (act) act();          /* the answer is only carried out on a yes */
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && isOpen()) dismiss();
      });
    }

    function isOpen() { return !!layer && !layer.hidden; }

    function ask(opts) {
      var host = opts.host || document.body;
      if (!layer) build(host);
      else if (layer.parentNode !== host) host.appendChild(layer);

      titleEl.textContent = opts.title;
      bodyEl.textContent = opts.body;
      goEl.innerHTML = ic('trash-2', 15) + '<span>' + esc(opts.go) + '</span>';
      onYes = opts.onYes;
      returnTo = document.activeElement;
      layer.hidden = false;
      void layer.offsetHeight;              /* flush the collapsed state */
      layer.classList.add('is-open');
      noEl.focus();                         /* the safe answer takes focus */
    }

    function dismiss() {
      if (!isOpen()) return;
      layer.classList.remove('is-open');
      layer.hidden = true;
      onYes = null;
      if (returnTo && returnTo.focus) returnTo.focus();
    }

    return { build: build, ask: ask, dismiss: dismiss, isOpen: isOpen };
  })();


  var Settings = (function () {
    var sheet = null;
    var fields = {};

    function build() {
      sheet = el('' +
        '<div class="sheet" id="settingsSheet" hidden>' +
          '<div class="sheet__backdrop" data-close></div>' +
          '<div class="sheet__panel" role="dialog" aria-modal="true" aria-label="' +
            esc(UI.settings.title) + '">' +
            '<header class="sheet__head">' +
              '<span class="sheet__headicon">' + ic('settings', 16) + '</span>' +
              '<h2 class="sheet__title">' + esc(UI.settings.title) + '</h2>' +
              '<button class="icon-btn" type="button" data-close aria-label="' +
                esc(UI.settings.close) + '">' + ic('x', 17) + '</button>' +
            '</header>' +

            '<div class="sheet__body">' +
              '<div class="field">' +
                '<label class="field__label" for="setEndpoint">' + ic('globe', 14) +
                  '<span>' + esc(UI.settings.endpoint) + '</span></label>' +
                '<input class="input" id="setEndpoint" type="url" spellcheck="false"' +
                  ' autocomplete="off" placeholder="' +
                  esc(UI.settings.endpointPlaceholder) + '">' +
              '</div>' +

              '<div class="field">' +
                '<label class="field__label" for="setKey">' + ic('key-round', 14) +
                  '<span>' + esc(UI.settings.key) + '</span></label>' +
                '<div class="field__row">' +
                  '<input class="input" id="setKey" type="password" spellcheck="false"' +
                    ' autocomplete="off" placeholder="sk-…">' +
                  '<button class="icon-btn" id="keyToggle" type="button" aria-label="' +
                    esc(UI.settings.keyShow) + '">' + ic('eye', 17) + '</button>' +
                '</div>' +
              '</div>' +

              '<div class="field">' +
                '<label class="field__label" for="setModel">' + ic('bot', 14) +
                  '<span>' + esc(UI.settings.model) + '</span></label>' +
                '<div class="field__row">' +
                  '<input class="input" id="setModel" type="text" spellcheck="false"' +
                    ' autocomplete="off" placeholder="deepseek:deepseek-v4-flash">' +
                  '<button class="btn" id="testBtn" type="button">' +
                    ic('send', 15) + '<span>' + esc(UI.settings.test) + '</span></button>' +
                '</div>' +
              '</div>' +

              '<p class="field__status" id="testStatus" role="status"></p>' +

              '<div class="sheet__rule"></div>' +

              '<div class="field__label">' + ic('trash-2', 14) +
                '<span>' + esc(UI.settings.record) + '</span></div>' +
              '<p class="field__note">' + esc(UI.settings.recordNote) + '</p>' +
              '<button class="btn btn--danger" id="clearBtn" type="button">' +
                ic('trash-2', 15) + '<span>' + esc(UI.settings.clear) + '</span></button>' +

              /* a separate heading, not a second button under the first one's
                 title: they destroy different amounts */
              '<div class="sheet__rule"></div>' +
              '<div class="field__label">' + ic('trash-2', 14) +
                '<span>' + esc(UI.settings.clearAllLabel) + '</span></div>' +
              '<p class="field__note">' + esc(UI.settings.clearAllNote) + '</p>' +
              '<button class="btn btn--danger" id="wipeBtn" type="button">' +
                ic('trash-2', 15) + '<span>' + esc(UI.settings.clearAll) + '</span></button>' +
            '</div>' +
          '</div>' +
        '</div>');

      document.body.appendChild(sheet);

      fields.endpoint = q(sheet, '#setEndpoint');
      fields.key = q(sheet, '#setKey');
      fields.model = q(sheet, '#setModel');
      var status = q(sheet, '#testStatus');
      var testBtn = q(sheet, '#testBtn');

      var saved = Store.read(Store.KEY.settings, {}) || {};
      fields.endpoint.value = saved.endpoint || '';
      fields.key.value = saved.key || '';
      fields.model.value = saved.model || '';

      function persist() {
        Store.write(Store.KEY.settings, {
          endpoint: fields.endpoint.value.trim(),
          key: fields.key.value,
          model: fields.model.value.trim()
        });
      }
      [fields.endpoint, fields.key, fields.model].forEach(function (f) {
        f.addEventListener('input', persist);
      });

      q(sheet, '#keyToggle').addEventListener('click', function () {
        var hidden = fields.key.type === 'password';
        fields.key.type = hidden ? 'text' : 'password';
        this.innerHTML = ic(hidden ? 'eye-off' : 'eye', 17);
        this.setAttribute('aria-label', hidden ? UI.settings.keyHide : UI.settings.keyShow);
      });

      testBtn.addEventListener('click', function () {
        if (testBtn.disabled) return;
        persist();
        var was = testBtn.innerHTML;
        testBtn.disabled = true;
        testBtn.innerHTML = ic('loader-circle', 15, 'is-spinning') +
          '<span>' + esc(UI.settings.testing) + '</span>';
        status.className = 'field__status';
        status.textContent = '';

        /* Wrapping the call in Promise.resolve().then() turns even a synchronous
           throw (a browser with no fetch, say) into a rejection, so the button can
           never get stuck on "Testing...". */
        Promise.resolve().then(function () {
          return Api.test({
            endpoint: fields.endpoint.value,
            key: fields.key.value,
            model: fields.model.value
          });
        }).catch(function () {
          return { ok: false, detail: UI.settings.unreachable };
        }).then(function (result) {
          status.className = 'field__status ' + (result.ok ? 'is-ok' : 'is-bad');
          status.innerHTML = ic(result.ok ? 'circle-check' : 'circle-x', 15) +
            '<span>' + esc(result.ok ? UI.settings.ok : UI.settings.fail) +
            /* `result.ms` can legitimately be 0 on a local endpoint, so test
               the type rather than the truthiness or the figure vanishes. */
            (result.ok && typeof result.ms === 'number'
              ? ' · ' + esc(fill(UI.settings.latency, { ms: result.ms })) : '') +
            (result.detail ? ' — ' + esc(result.detail) : '') + '</span>';
          testBtn.disabled = false;
          testBtn.innerHTML = was;
        });
      });

      q(sheet, '#clearBtn').addEventListener('click', function () {
        var c = UI.settings.confirm;
        /* Count the WHOLE course, not this chapter: this button clears every
           chapter, and counting only the open one would make the cost look smaller
           than it is. That is the one thing this dialog exists to state honestly. */
        var done = Progress.courseTotals().finished;
        Confirm.ask({
          host: sheet,
          title: c.recordTitle,
          /* say how much is actually at stake, not just that something is */
          body: done ? fill(c.recordBody, { count: done }) : c.recordBodyNone,
          go: c.recordGo,
          onYes: function () {
            Progress.clearAll();   /* every chapter's record; conversations stay */
            clearCache();
            showPage(0);
            refreshRail();
            Toast.show(UI.settings.cleared, 'trash-2');
          }
        });
      });

      q(sheet, '#wipeBtn').addEventListener('click', function () {
        var c = UI.settings.confirm;
        Confirm.ask({
          host: sheet,
          title: c.allTitle,
          body: c.allBody,
          go: c.allGo,
          onYes: function () {
            Progress.clearAll();   /* memory first, then every chapter's copy goes */
            Theme.reset();         /* back to whatever the system prefers */
            /* `record` and `theme` are already gone by now (clearAll removes every
               chapter's record; Theme.reset removes its own key) - only the shared
               settings are left to take. */
            try { window.localStorage.removeItem(Store.KEY.settings); }
            catch (e) { /* private mode */ }
            fields.endpoint.value = '';
            fields.key.value = '';
            fields.model.value = '';
            status.className = 'field__status';
            status.textContent = '';
            Chat.forgetAll();      /* every chapter's transcript, memory and key */
            clearCache();
            showPage(0);
            refreshRail();
            Toast.show(UI.settings.clearAllDone, 'trash-2');
          }
        });
      });

      qa(sheet, '[data-close]').forEach(function (n) { n.addEventListener('click', close); });

      /* Capture, so this decides before Confirm's own Escape handler runs.
         On the bubble phase Confirm would already have dismissed itself by
         the time we looked, and one Escape would shut both layers. */
      document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        if (Confirm.isOpen()) return;   /* the confirm owns Escape while it is up */
        if (sheet && !sheet.hidden) close();
      }, true);
    }

    function open() {
      if (!sheet) build();
      sheet.hidden = false;
      setTimeout(function () { if (fields.endpoint) fields.endpoint.focus(); }, 30);
    }
    function close() {
      Confirm.dismiss();       /* never leave a confirm behind the sheet */
      if (sheet) sheet.hidden = true;
      var btn = document.getElementById('settingsBtn');
      if (btn) btn.focus();
    }
    return { open: open, close: close };
  })();


  var Chat = (function () {
    var fab = null, panel = null;
    var logEl = null, inputEl = null, sendEl = null;
    var modelEl = null, ctxEl = null, emptyEl = null, clearEl = null;
    var history = [];          /* the running conversation, system prompt aside */
    var busy = false;

    /** How much of the transcript is kept on disk. */
    var SAVED_LIMIT = 200;

    /**
     * The transcript is saved after every change, so closing the panel or reloading
     * does not throw the conversation away. Only real turns are stored - local error
     * notices never enter `history`.
     */
    function save() {
      Store.write(Store.KEY.chat, history.slice(-SAVED_LIMIT));
    }

    /** Put the saved transcript back into the log, oldest first. */
    function restore() {
      history.forEach(function (m) {
        if (m && m.content && (m.role === 'user' || m.role === 'assistant')) {
          push(m.role, m.content);
        }
      });
      if (logEl) logEl.scrollTop = logEl.scrollHeight;
      paintClear();
    }

    function emptyState() {
      return el('<p class="chat__empty">' + ic('bot-message-square', 18) +
        '<span>' + esc(UI.chat.empty) + '</span></p>');
    }

    /**
     * Wipe the transcript, on screen and on disk, without saying anything. `forget`
     * drops the storage key instead of writing an empty list, so "clear all data"
     * leaves nothing of the conversation behind.
     */
    function reset(opt) {
      history = [];
      if (opt && opt.forget) {
        try { window.localStorage.removeItem(Store.KEY.chat); } catch (e) { /* private mode */ }
      } else {
        save();
      }
      if (!logEl) return;              /* the panel was never opened */
      logEl.innerHTML = '';
      emptyEl = emptyState();
      logEl.appendChild(emptyEl);
      paintClear();
    }

    /**
     * Drop EVERY chapter's transcript; only "clear all data" calls this. `reset` is
     * chapter-scoped (it drops `Store.KEY.chat`, which `rebind` points at the open
     * chapter), so this walks the manifest instead.
     */
    function forgetAll() {
      history = [];
      if (logEl) {
        logEl.innerHTML = '';
        emptyEl = emptyState();
        logEl.appendChild(emptyEl);
        paintClear();
      }
      Store.chapterNumbers().forEach(function (n) {
        try { window.localStorage.removeItem('gitcourse.chat.chapter' + n); }
        catch (e) { /* private mode */ }
      });
    }

    /** Wipe it and say so. */
    function clear() {
      reset();
      Toast.show(UI.chat.cleared, 'trash-2');
      if (inputEl) inputEl.focus();
    }

    /** Nothing to clear means nothing to offer. */
    function paintClear() {
      if (clearEl) clearEl.disabled = history.length === 0;
    }

    function config() {
      var s = Store.read(Store.KEY.settings, {}) || {};
      return { endpoint: s.endpoint || '', key: s.key || '', model: s.model || '' };
    }

    /**
     * The visible text of a node, one line per block. `textContent` runs adjacent
     * blocks together, which the model reads as one sentence; `innerText` respects
     * layout and breaks lines at block boundaries.
     */
    function visibleText(node) {
      if (!node) return '';
      var raw = (typeof node.innerText === 'string' && node.innerText)
        ? node.innerText
        : (node.textContent || '');
      return raw.split('\n')
        .map(function (line) { return line.replace(/\s+/g, ' ').trim(); })
        .filter(Boolean)
        .join('\n');
    }

    /** What the learner is looking at right now. */
    function snapshot() {
      var e = App.entry;
      if (!e) return null;
      var page = e.page;
      var beat = page.beats[e.index];
      var node = e.els[e.index];
      var onScreen = visibleText(node);
      return {
        /* meta.title is not set in the content file yet, so do not send the
           model a chapter line that trails off into a bare dash */
        chapter: 'Chapter ' + C.meta.number + (C.meta.title ? ' — ' + C.meta.title : ''),
        step: page.nav.label,
        stepNo: (App.pageIndex + 1) + ' of ' + PAGES.length,
        moment: (e.index + 1) + ' of ' + page.beats.length + ' (' + beat.kind + ')',
        momentShort: (e.index + 1) + ' of ' + page.beats.length,
        onScreen: onScreen.slice(0, 1400),
        finished: PAGES.filter(function (p) { return Progress.isDone(p.id); })
                       .map(function (p) { return p.nav.label; })
      };
    }

    /**
     * The most messages that travel with one request. Older ones are left out
     * entirely, so the model sees a bounded window however long the reader talks.
     */
    var RECENT_MESSAGES = 6;

    function recentHistory() {
      var tail = history.slice(-RECENT_MESSAGES);
      var opens = 0;
      while (opens < tail.length && tail[opens].role !== 'user') opens++;
      return tail.slice(opens);
    }

    /**
     * The prompt describes the lesson, never the conversation. Earlier turns travel
     * in the message list where they belong; folding them in here would say the same
     * thing twice and bury the description of the screen.
     */
    function systemPrompt(s) {
      return [
        fill(UI.chat.promptIntro, { brand: UI.brand }),
        '',
        UI.chat.promptChapter + ': ' + s.chapter,
        UI.chat.promptStep + ': ' + s.step + ' (' + s.stepNo + ')',
        UI.chat.promptMoment + ': ' + s.moment,
        s.finished.length ? UI.chat.promptFinished + ': ' + s.finished.join(', ') : '',
        '',
        UI.chat.promptOnScreen + ':',
        '"""',
        s.onScreen,
        '"""',
        '',
        UI.chat.promptAsk
      ].filter(Boolean).join('\n');
    }


    /** Escape, then the smallest amount of markdown worth honouring. */
    function render(text) {
      return esc(text).split(/```/).map(function (part, i) {
        if (i % 2) return '<pre class="msg__code">' + part.replace(/^\n+|\n+$/g, '') + '</pre>';
        return part
          .replace(/`([^`]+)`/g, '<code>$1</code>')
          .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      }).join('');
    }

    function push(role, text) {
      if (emptyEl && emptyEl.parentNode) { emptyEl.parentNode.removeChild(emptyEl); emptyEl = null; }
      var node = el('<div class="msg msg--' + role + '"><div class="msg__body">' +
        render(text) + '</div></div>');
      logEl.appendChild(node);
      logEl.scrollTop = logEl.scrollHeight;
      return node;
    }

    /** Keep the "Reading: ..." strip in step with wherever the learner is. */
    function refresh() {
      if (!panel || panel.hidden || !ctxEl) return;
      var s = snapshot();
      if (!s) return;
      ctxEl.innerHTML = ic('eye', 13) + '<span>' + esc(UI.chat.reading) + '</span>' +
        '<b>' + esc(s.step) + '</b>' +
        '<span class="chat__dim">' + esc(s.momentShort) + '</span>';
      modelEl.textContent = config().model || '';
    }


    function build() {
      panel = el('' +
        '<section class="chat" id="chatPanel" hidden aria-label="' + esc(UI.chat.title) + '">' +
          '<header class="chat__head">' +
            '<span class="chat__avatar">' + ic('bot-message-square', 16) + '</span>' +
            '<div class="chat__who">' +
              '<span class="chat__title">' + esc(UI.chat.title) + '</span>' +
              '<span class="chat__model" id="chatModel"></span>' +
            '</div>' +
            '<button class="icon-btn" type="button" id="chatClear" title="' +
              esc(UI.chat.clear) + '" aria-label="' + esc(UI.chat.clear) + '">' +
              ic('trash-2', 16) + '</button>' +
            '<button class="icon-btn" type="button" id="chatClose" aria-label="' +
              esc(UI.chat.close) + '">' + ic('x', 17) + '</button>' +
          '</header>' +
          '<div class="chat__context" id="chatContext"></div>' +
          '<div class="chat__log" id="chatLog" role="log" aria-live="polite"></div>' +
          '<div class="chat__presets" id="chatPresets" role="group" aria-label="' +
            esc(UI.chat.presetsLabel) + '">' +
            UI.chat.presets.map(function (p) {
              return '<button class="chat__preset" type="button" data-ask="' +
                esc(p.text) + '">' + ic(p.icon, 14) +
                '<span>' + esc(p.text) + '</span></button>';
            }).join('') +
          '</div>' +
          '<form class="chat__compose" id="chatForm">' +
            '<textarea class="chat__input" id="chatInput" rows="1" placeholder="' +
              esc(UI.chat.placeholder) + '"></textarea>' +
            '<button class="btn btn--primary chat__send" type="submit" aria-label="' +
              esc(UI.chat.send) + '">' + ic('send', 17) + '</button>' +
          '</form>' +
        '</section>');
      document.body.appendChild(panel);

      logEl = q(panel, '#chatLog');
      inputEl = q(panel, '#chatInput');
      sendEl = q(panel, '.chat__send');
      modelEl = q(panel, '#chatModel');
      ctxEl = q(panel, '#chatContext');

      clearEl = q(panel, '#chatClear');
      emptyEl = emptyState();
      logEl.appendChild(emptyEl);
      restore();

      clearEl.addEventListener('click', function () {
        var c = UI.chat;
        Confirm.ask({
          host: panel,
          title: c.clearTitle,
          body: c.clearBody,
          go: c.clearGo,
          onYes: clear
        });
      });
      q(panel, '#chatClose').addEventListener('click', close);
      qa(panel, '.chat__preset').forEach(function (btn) {
        btn.addEventListener('click', function () {
          ask(btn.getAttribute('data-ask'));
        });
      });
      q(panel, '#chatForm').addEventListener('submit', function (e) {
        e.preventDefault();
        send();
      });
      inputEl.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && panel && !panel.hidden &&
            !(e.target && e.target.tagName === 'TEXTAREA')) close();
      });
      /* Clicking anywhere else puts the panel away. Capture phase, so a
         handler that stops propagation on the way up cannot trap it open. */
      document.addEventListener('pointerdown', function (e) {
        if (!panel || panel.hidden || !panel.classList.contains('is-open')) return;
        if (panel.contains(e.target)) return;
        close();
      }, true);
    }


    function send() {
      var text = inputEl.value.trim();
      if (!text) return;
      inputEl.value = '';
      ask(text);
    }

    /** Ask something the reader did not have to type - a preset, say. */
    function ask(text) {
      if (busy) return;
      var cfg = config();

      push('user', text);
      history.push({ role: 'user', content: text });
      save();
      paintClear();

      if (!cfg.endpoint || !cfg.model) {
        history.pop();                      /* nothing was actually asked */
        save();
        paintClear();
        push('error', UI.chat.needSetup);
        return;
      }

      busy = true;
      sendEl.disabled = true;
      var pending = push('assistant', UI.chat.thinking);
      pending.classList.add('is-thinking');

      var messages = [{ role: 'system', content: systemPrompt(snapshot()) }]
        .concat(recentHistory());

      Promise.resolve().then(function () {
        return Api.chat(cfg, messages, 700);
      }).catch(function () {
        return { ok: false, text: '', detail: UI.chat.unreachable };
      }).then(function (res) {
        if (pending.parentNode) pending.parentNode.removeChild(pending);
        busy = false;
        sendEl.disabled = false;
        if (res.ok && res.text) {
          history.push({ role: 'assistant', content: res.text });
          push('assistant', res.text);
        } else {
          history.pop();                    /* do not replay a failed turn */
          push('error', res.detail || UI.chat.noAnswer);
        }
        save();
        paintClear();
        if (!panel.hidden) inputEl.focus();
      });
    }


    /* The panel is only `hidden` once it has finished shrinking, so the
       collapse is visible; reopening inside that window cancels the timer
       and the panel grows back from wherever it got to. */
    var closeTimer = null;

    function open() {
      if (!panel) build();
      if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
      panel.hidden = false;
      if (fab) fab.classList.add('is-gone');
      refresh();
      /* Reading a layout property flushes the collapsed state before the
         class lands, so the transition has somewhere to travel from. An
         rAF pair would do the same thing, but only if frames keep arriving. */
      void panel.offsetHeight;
      panel.classList.add('is-open');
      if (inputEl) inputEl.focus();
    }

    function close() {
      if (!panel || panel.hidden) return;
      panel.classList.remove('is-open');
      if (fab) fab.classList.remove('is-gone');
      if (closeTimer) clearTimeout(closeTimer);
      closeTimer = setTimeout(function () {
        closeTimer = null;
        if (!panel.classList.contains('is-open')) {
          panel.hidden = true;
          if (fab) fab.focus();     /* hand focus back to what opened it */
        }
      }, 320);
    }

    /* Read the open state off the class, not off `hidden`: during the
       collapse the panel is still in the DOM and a second click should
       reopen it rather than close it again. */
    function toggle() {
      if (panel && !panel.hidden && panel.classList.contains('is-open')) close();
      else open();
    }

    function mount() {
      /* Load before the panel exists: build() renders whatever is here. */
      var saved = Store.read(Store.KEY.chat, []);
      history = Object.prototype.toString.call(saved) === '[object Array]' ? saved : [];

      fab = el('<button class="chatfab" id="chatFab" type="button" title="' +
        esc(UI.chat.open) + '" aria-label="' + esc(UI.chat.open) + '">' +
        ic('bot-message-square', 22) + '</button>');
      fab.addEventListener('click', toggle);
      document.body.appendChild(fab);
    }

    /**
     * The chapter changed. The transcript is stored per chapter, so the one on
     * screen belongs to a chapter the reader has left - read the new one's and
     * rebuild the log. `reset()` would throw the new one away instead.
     */
    function rebind() {
      var saved = Store.read(Store.KEY.chat, []);
      history = Object.prototype.toString.call(saved) === '[object Array]' ? saved : [];
      if (!logEl) return;              /* the panel was never opened */
      logEl.innerHTML = '';
      emptyEl = emptyState();
      logEl.appendChild(emptyEl);
      restore();
    }

    return { mount: mount, refresh: refresh, open: open, close: close, reset: reset,
             forgetAll: forgetAll, rebind: rebind };
  })();


  function titleFor() {
    var label = (App.pageIndex >= 0 && PAGES[App.pageIndex])
      ? PAGES[App.pageIndex].nav.label : '';
    return label ? (C.meta.title + ' · ' + label + ' — ' + UI.brand)
                 : (C.meta.title + ' — ' + UI.brand);
  }

  /**
   * The app bar: the brand, and five controls. FIVE, NOT FOUR - the design has
   * four (restart, theme, language, settings), and the sandbox needs a way in that
   * is not "go home first". The brand is the way home.
   */
  function renderAppbar() {
    var bar = document.getElementById('appbar');
    bar.innerHTML = '' +
      '<a class="brand" href="../../index.html" title="' + esc(UI.nav.homeTitle) +
        '" aria-label="' + esc(UI.nav.homeTitle) + '">' +
        '<span class="brand__logo" aria-hidden="true">' + ic('git-branch', 23) + '</span>' +
        '<span class="brand__name">' + esc(UI.brand) + '</span>' +
      '</a>' +
      '<span class="spacer"></span>' +

      '<a class="icon-btn js-practice" id="practiceBtn" href="../practice/index.html" title="' +
        esc(UI.practice.title) + '" aria-label="' + esc(UI.practice.title) + '">' +
        ic('terminal', 17) + '</a>' +

      '<button class="icon-btn" id="restartBtn" type="button" title="' +
        esc(UI.nav.restart) + '" aria-label="' + esc(UI.nav.restart) + '">' +
        ic('rotate-ccw', 17) + '</button>' +

      '<button class="icon-btn theme-toggle" id="themeBtn" type="button">' +
        ic('sun', 17, 'icon-sun') + ic('moon', 17, 'icon-moon') + '</button>' +

      '<button class="icon-btn" id="settingsBtn" type="button" title="' +
        esc(UI.settings.open) + '" aria-label="' + esc(UI.settings.open) + '">' +
        ic('settings', 17) + '</button>';

    q(bar, '#themeBtn').addEventListener('click', Theme.toggle);
    q(bar, '#restartBtn').addEventListener('click', restart);
    q(bar, '#settingsBtn').addEventListener('click', Settings.open);
    updatePracticeLink();

    /* Theme.init() ran before these buttons existed, so it could not label them.
       Re-apply now that there is something to label - and again after every
       rebuild, since a fresh button starts bare. */
    Theme.apply(Theme.current());
  }


  function rebind() {
    C = window.CHAPTER_CONTENT;
    PAGES = C.pages;
    /* Every chapter file borrows the same `ui` object from course.en.js, so this is
       normally a no-op - it is here because "what depends on the chapter" should be
       a list you can read, not one you have to remember. */
    UI = C.ui;
    rebuildBeats();   /* not Object.assign from the window object alone */
    Store.rebind(C.meta.number);
  }

  /** The section to open on: the deep link if there is one, else the first
   *  section the reader has not finished. */
  function startIndex() {
    var hash = (window.location.hash || '').replace('#', '');
    var start = -1;
    PAGES.forEach(function (p, i) { if (p.id === hash) start = i; });
    if (start < 0) {
      start = 0;
      while (start < PAGES.length - 1 && Progress.isDone(PAGES[start].id)) start++;
    }
    return start;
  }

  /** Follow a `index.html?ch=N` style href, in place when we can. */
  function openChapterHref(href) {
    var n = window.ChapterLoader && window.ChapterLoader.chapterOfHref(href);
    if (n) { loadChapter(n); return; }
    if (href) window.location.href = href;          /* ch15's "back to home" */
    else Toast.show(UI.nextChapter, 'sparkles');
  }

  var switching = false;

  function loadChapter(n, opts) {
    if (switching || !window.ChapterLoader || n === C.meta.number) {
      return Promise.resolve();
    }
    switching = true;
    document.body.classList.add('is-switching');

    return window.ChapterLoader.load(n)
      .then(function () {
        rebind();
        App.cache = {};               /* every rendered page belonged to the old chapter */
        App.entry = null;
        App.pageIndex = 0;
        Progress.load();              /* the new chapter's own record */
        checkManifest();
        Chat.rebind();
        renderAppbar();
        refreshRail();
        renderBottombar();
        document.title = titleFor();

        if (!(opts && opts.silent)) {
          try { window.history.pushState({ ch: n }, '', '?ch=' + n); }
          catch (e) { /* file:// - no history, but the chapter still changed */ }
        }
        showPage(startIndex());       /* writes the section hash on top */
      })
      .catch(function (err) {
        Toast.show('Could not open chapter ' + n + '.', 'triangle-alert');
        if (window.console) console.error(err);
      })
      .then(function () {
        switching = false;
        document.body.classList.remove('is-switching');
      });
  }


  function renderRail() {
    var rail = document.getElementById('rail');
    var chapters = UI.chapters || [];

    /* One pip per section of the chapter you are in. A bar says "how many
       are left"; pips say "how many are left, and which one you are on". */
    var pips = PAGES.map(function (p, i) {
      return '<li class="pip' + (Progress.isDone(p.id) ? ' is-done' : '') +
             (i === App.pageIndex ? ' is-current' : '') + '"></li>';
    }).join('');

    var rows = chapters.map(function (c) {
      var here = c.number === C.meta.number;
      var done = Progress.isChapterDone(c.number);

      /* Only the chapter you are in shows its sections; the other fourteen
         are one line each, which is what keeps fifteen of them in one column
         you can scan. */
      var sections = here
        ? '<ol class="ch__sections">' + PAGES.map(function (p, i) {
            var isDone = Progress.isDone(p.id);
            var state = isDone ? ' is-done' : (i === App.pageIndex ? ' is-here' : '');
            return '<li class="sect' + state + '" data-page="' + esc(p.id) + '"' +
                     ' data-tip="' + esc(p.nav.label) + '">' +
              '<button class="sect__btn" type="button" data-goto="' + i + '">' +
                '<span class="sect__mark" aria-hidden="true">' +
                  (isDone ? ic('check', 11) : '') + '</span>' +
                '<span class="sect__label">' + esc(p.nav.label) + '</span>' +
              '</button></li>';
          }).join('') + '</ol>'
        : '';

      return '<li class="ch' + (here ? ' is-here is-open' : '') + (done ? ' is-done' : '') +
               '" data-chapter="' + c.number + '" data-tip="' + esc(c.title) + '">' +
        '<button class="ch__btn" type="button" data-ch-link="' + esc(c.href) + '"' +
          (here ? ' aria-current="page"' : '') + '>' +
          '<span class="ch__no"><span class="ch__short">' + esc(UI.rail.chapterShort) + '</span>' +
            esc(c.number) + '</span>' +
          '<span class="ch__title">' + esc(c.title) + '</span>' +
          '<span class="ch__chev" aria-hidden="true">' +
            ic(here ? 'chevron-down' : 'chevron-right', 15) + '</span>' +
          '<span class="ch__tick" aria-hidden="true">' + (done ? ic('check', 12) : '') + '</span>' +
        '</button>' +
        sections +
      '</li>';
    }).join('');

    rail.innerHTML = '' +

      '<div class="rail__group rail__group--progress">' +
        '<span class="rail__grouptitle">' +
          '<span class="rail__grouptitle--long">' + esc(UI.rail.progress) + '</span>' +
          '<span class="rail__grouptitle--short">' + esc(UI.rail.progressShort) + '</span>' +
        '</span>' +

        /* The two readouts. Wide screens get the bars instead; only the 96px strip
           needs them spelled out. Both are always in the DOM - Progress.paint()
           updates them whether or not they are visible. */
        '<dl class="rail__readouts">' +
          '<div class="rail__readout"><dt>' + esc(UI.rail.chapters) + '</dt>' +
            '<dd class="js-chapter-count"></dd></div>' +
          '<div class="rail__readout"><dt>' + esc(UI.rail.section) + '</dt>' +
            '<dd class="js-section-count"></dd></div>' +
        '</dl>' +

        '<div class="rail__bar"><div class="rail__fill js-course-fill"></div></div>' +
        '<ol class="pips pips--grid pips--sections" aria-hidden="true">' + pips + '</ol>' +
      '</div>' +

      '<div class="rail__group rail__group--chapters">' +
        '<span class="rail__grouptitle">' +
          '<span class="rail__grouptitle--long">' + esc(UI.rail.chapters) + '</span>' +
        '</span>' +
        '<ol class="rail__chapters">' + rows + '</ol>' +
      '</div>';

    /* A section jumps within the chapter; a chapter is a page load, because
       each one is a different content file. */
    qa(rail, '[data-goto]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        showPage(parseInt(btn.getAttribute('data-goto'), 10));
        window.scrollTo(0, 0);
      });
    });
    /* A chapter is a different content file, not a different page: the loader
       swaps the assets and this file redraws, so the reader keeps the theme,
       the language and the shell. */
    qa(rail, '[data-ch-link]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openChapterHref(btn.getAttribute('data-ch-link'));
      });
    });

    updatePracticeLink();
    bindRailTips(rail);
  }

  function bindRailTips(rail) {
    var tip = document.getElementById('railTip');
    if (!tip) return;

    function labelFor(node) {
      var el = node && node.closest ? node.closest('[data-tip]') : null;
      if (!el) return '';
      if (el.classList.contains('sect')) {
        var btn = q(el, '[data-goto]');
        var i = btn ? parseInt(btn.getAttribute('data-goto'), 10) : -1;
        return PAGES[i] ? PAGES[i].nav.label : '';
      }
      return el.getAttribute('data-tip') || '';
    }

    rail.addEventListener('mouseover', function (e) {
      var text = labelFor(e.target);
      if (!text) { tip.hidden = true; return; }
      tip.textContent = text;
      tip.hidden = false;
      /* Anchored to the ROW (for its height) but to the RAIL's right edge (for its
         left): rows in the strip are centred and only as wide as a circle, so
         hanging the label off the row would put it on top of what it labels. */
      var row = e.target.closest('[data-tip]') || e.target;
      var box = row.getBoundingClientRect();
      var edge = document.getElementById('rail').getBoundingClientRect().right;
      tip.style.top = Math.round(box.top + box.height / 2) + 'px';
      tip.style.left = Math.round(edge + 8) + 'px';
    });

    rail.addEventListener('mouseleave', function () { tip.hidden = true; });
    rail.addEventListener('scroll', function () { tip.hidden = true; });
  }


  function renderBottombar() {
    var bar = document.getElementById('bottombar');
    if (!bar) return;

    var pips = PAGES.map(function (p, i) {
      return '<li class="pip' + (Progress.isDone(p.id) ? ' is-done' : '') +
             (i === App.pageIndex ? ' is-current' : '') + '"></li>';
    }).join('');

    bar.innerHTML = '' +
      '<div class="bottombar__col">' +
        '<button class="bottombar__meta" id="chapterPickBtn" type="button">' +
          '<span class="bottombar__chapter js-chapter-line"></span>' +
          '<span class="bottombar__sep" aria-hidden="true">' + ic('chevron-right', 12) + '</span>' +
        '</button>' +
        '<span class="bottombar__title">' + esc(C.meta.title) +
          '<span class="bottombar__count js-section-count"></span></span>' +
        '<div class="bottombar__bar"><div class="bottombar__fill js-course-fill"></div></div>' +
        '<ol class="pips pips--grid pips--sections" aria-hidden="true">' + pips + '</ol>' +
      '</div>' +
      '<button class="icon-btn" id="aiBarBtn" type="button" title="' + esc(UI.chat.open) +
        '" aria-label="' + esc(UI.chat.open) + '">' + ic('bot-message-square', 17) + '</button>';

    q(bar, '#chapterPickBtn').addEventListener('click', openChapterPicker);
    q(bar, '#aiBarBtn').addEventListener('click', Chat.open);
  }


  /**
   * The chapter list, as a sheet from the bottom - phones only. Built here rather
   * than in learn.html because its words depend on the interface language. The list
   * is filled when it opens, so it is never stale.
   */
  function mountChapterSheet() {
    var sheet = el('' +
      '<div class="pick" id="chapterSheet" hidden>' +
        '<div class="pick__scrim" data-pick-close></div>' +
        '<div class="pick__panel" role="dialog" aria-modal="true">' +
          '<header class="pick__head">' +
            '<span class="pick__title"></span>' +
            '<button class="icon-btn sm ghost" type="button" data-pick-close>' +
              ic('x', 15) + '</button>' +
          '</header>' +
          '<ol class="picklist"></ol>' +
        '</div>' +
      '</div>');
    document.body.appendChild(sheet);
    qa(sheet, '[data-pick-close]').forEach(function (n) {
      n.addEventListener('click', closeChapterPicker);
    });
  }

  function openChapterPicker() {
    var sheet = document.getElementById('chapterSheet');
    if (!sheet) return;

    var title = q(sheet, '.pick__title');
    title.textContent = UI.rail.pickTitle;
    var closer = q(sheet, '.pick__head .icon-btn');
    closer.setAttribute('title', UI.rail.pickClose);
    closer.setAttribute('aria-label', UI.rail.pickClose);
    q(sheet, '.pick__panel').setAttribute('aria-label', UI.rail.pickTitle);

    q(sheet, '.picklist').innerHTML = (UI.chapters || []).map(function (c) {
      var here = c.number === C.meta.number;
      var done = Progress.isChapterDone(c.number);
      var count = Progress.chapterDone(c.number);
      // These independent exercises need section access when the phone rail is hidden.
      var sections = here && (C.meta.number === 13 || C.meta.number === 14)
        ? '<ol class="picklist picklist--sections" aria-label="Current chapter sections">' + PAGES.map(function (page, index) {
            return '<li><button type="button" class="pickrow' + (index === App.pageIndex ? ' is-here' : '') +
              '" data-pick-section="' + index + '"' + (index === App.pageIndex ? ' aria-current="step"' : '') + '>' +
              '<span class="pickrow__no">' + (index + 1) + '</span><span class="pickrow__title">' + esc(page.nav.label) +
              '</span><span class="pickrow__mark">' + (Progress.isDone(page.id) ? ic('check', 13) : '') + '</span></button></li>';
          }).join('') + '</ol>' : '';
      return '<li><a class="pickrow' + (here ? ' is-here' : '') + (done ? ' is-done' : '') +
               '" href="' + esc(c.href) + '"' + (here ? ' aria-current="page"' : '') + '>' +
        '<span class="pickrow__no">' + esc(c.number) + '</span>' +
        '<span class="pickrow__title">' + esc(c.title) + '</span>' +
        '<span class="pickrow__count">' + count + ' / ' + c.sections + '</span>' +
        '<span class="pickrow__mark" aria-hidden="true">' +
          (done ? ic('check', 13) : '') + '</span>' +
      '</a>' + sections + '</li>';
    }).join('');

    qa(sheet, '[data-pick-section]').forEach(function (button) {
      button.addEventListener('click', function () {
        closeChapterPicker();
        showPage(Number(button.getAttribute('data-pick-section')));
        window.scrollTo(0, 0);
      });
    });
    qa(sheet, 'a.pickrow').forEach(function (row) {
      row.addEventListener('click', function (e) {
        var n = window.ChapterLoader && window.ChapterLoader.chapterOfHref(row.getAttribute('href'));
        if (!n) return;                       /* not a chapter link: leave it be */
        e.preventDefault();
        closeChapterPicker();
        loadChapter(n);
      });
    });

    sheet.hidden = false;
    document.body.classList.add('is-picking');
    var first = q(sheet, '.pickrow.is-here') || q(sheet, '.pickrow');
    if (first) first.focus();
  }

  function closeChapterPicker() {
    var sheet = document.getElementById('chapterSheet');
    if (!sheet || sheet.hidden) return;
    sheet.hidden = true;
    document.body.classList.remove('is-picking');
    var btn = document.getElementById('chapterPickBtn');
    if (btn) btn.focus();
  }


  /** Redraw the rail so its ticks match the record. */
  function refreshRail() {
    renderRail();
    Progress.paint();
  }

  function updatePracticeLink() {
    var source = window.location.pathname.split('/').slice(-3).join('/') +
                 window.location.search + window.location.hash;
    qa(document, '.js-practice').forEach(function (link) {
      link.href = '../practice/index.html?returnTo=' + encodeURIComponent(source);
    });
  }

  function checkManifest() {
    var entry = null;
    (UI.chapters || []).forEach(function (c) { if (c.number === C.meta.number) entry = c; });

    if (!entry) {
      console.warn('course.en.js has no manifest entry for chapter ' + C.meta.number +
                   ' — the chapter list and the course progress will be wrong.');
      return;
    }
    if (entry.sections !== PAGES.length) {
      console.warn('course.en.js says chapter ' + C.meta.number + ' has ' + entry.sections +
                   ' sections; content.chapter' + C.meta.number + '.en.js has ' + PAGES.length +
                   '. Update `sections` in the manifest — the course progress bar counts on it.');
    }
  }


  function boot() {
    App.stage = document.getElementById('stage');

    Store.migrate();          /* chapter 1's old keys, once */
    Theme.init();
    Progress.load();          /* restore the record before anything reads it */

    renderAppbar();
    renderRail();
    renderBottombar();
    Chat.mount();
    mountChapterSheet();
    checkManifest();

    /* A finished section changes two things: the rail's ticks, and the two
       course-wide readings. Nothing unlocks, so there is no notice to show - the
       toast that announced an unlock went with the lock. */
    Progress.onChange(function () {
      refreshRail();
      renderBottombar();
    });

    showPage(startIndex());

    /* Seed one history entry so the back button knows where it came from. The
       chapter switches that follow push their own. */
    try { window.history.replaceState({ ch: C.meta.number }, '', window.location.href); }
    catch (e) { /* file:// */ }

    document.addEventListener('keydown', function (e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'Escape') { closeChapterPicker(); return; }
      var t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.key === 'ArrowRight') {
        /* only when the live beat is actually confirmable */
        if (q(App.entry.els[App.entry.index], '.btn')) confirmBeat();
      } else if (e.key === 'ArrowLeft') {
        backBeat();
      }
    });

    /* Back / forward across chapter switches. The chapter is in the query string,
       so it is read back from the URL rather than the event's state - the state is a
       convenience, the URL is the truth. */
    window.addEventListener('popstate', function () {
      var m = /[?&]ch=(\d+)/.exec(window.location.search || '');
      var n = m ? parseInt(m[1], 10) : 1;
      if (n !== C.meta.number) loadChapter(n, { silent: true });
    });

    window.addEventListener('hashchange', function () {
      var id = (window.location.hash || '').replace('#', '');
      PAGES.forEach(function (p, i) {
        if (p.id === id && i !== App.pageIndex) showPage(i);
      });
    });

    /* Crossing the 861px line changes the rail's shape through CSS alone - nothing
       to redraw - but a floating label left over from the wide shape would hang in
       mid-air, so it is dismissed. */
    if (window.matchMedia) {
      var wide = window.matchMedia('(min-width: 1081px)');
      var onWidth = function () {
        var tip = document.getElementById('railTip');
        if (tip) tip.hidden = true;
        closeChapterPicker();
      };
      if (wide.addEventListener) wide.addEventListener('change', onWidth);
      else if (wide.addListener) wide.addListener(onWidth);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

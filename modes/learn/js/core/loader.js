
(function () {
  'use strict';

  /* This page's own assets live in two dirs; shared/ refs are written ../... as-is. */
  var JS_DIR = 'js/';
  var CSS_DIR = 'css/';

  var LABS = {
    2:  { css: ['lesson-lab.css'],
          js:  ['../shared/js/i18n-dict.js',
                '../shared/js/git-engine.js',
                'core/lesson-lab.js'] },
    3:  { css: ['lesson-lab.css', 'course-labs.css'],
          js:  ['core/course-lab-model.js', 'core/course-labs.js'] },
    4:  { css: ['lesson-lab.css', 'course-labs.css'],
          js:  ['core/course-lab-model.js', 'core/course-labs.js'] },
    5:  { css: ['branch-lab.css'],    js: ['core/branch-lab.js'] },
    6:  { css: ['topic-lab.css'],     js: ['core/topic-lab.js'] },
    7:  { css: ['topic-lab.css'],     js: ['core/topic-lab.js'] },
    8:  { css: ['lesson-lab.css', 'conflict-lab.css'], js: ['core/conflict-lab.js'] },
    9:  { css: ['lesson-lab.css', 'rebase-lab.css'],   js: ['core/rebase-lab.js'] },
    10: { css: ['lesson-lab.css', 'undo-lab.css'],     js: ['core/undo-lab.js'] },
    11: { css: ['recovery-lab.css'],  js: ['core/recovery-lab.js'] },
    12: { css: ['recovery-lab.css'],  js: ['core/recovery-lab.js'] },
    13: { css: ['advanced-labs.css'],
          js:  ['core/advanced-lab-model.js', 'core/team-workflow.js', 'core/final-challenge.js', 'core/advanced-labs.js'] },
    14: { css: ['advanced-labs.css'],
          js:  ['core/advanced-lab-model.js', 'core/final-challenge.js', 'core/advanced-labs.js'] },
    15: { css: ['advanced-labs.css'],
          js:  ['core/advanced-lab-model.js', 'core/final-challenge.js', 'core/advanced-labs.js'] }
  };


  function manifest() {
    return (window.CHAPTER_CONTENT && window.CHAPTER_CONTENT.ui &&
            window.CHAPTER_CONTENT.ui.chapters) || [];
  }

  /** The chapter number a `index.html?ch=N` style href points at. */
  function chapterOfHref(href) {
    var m = /[?&]ch=(\d+)/.exec(String(href || ''));
    return m ? parseInt(m[1], 10) : null;
  }

  /** The chapter the URL asks for, or the first one. */
  function wanted() {
    var raw = null;
    try {
      var m = /[?&]ch=([^&#]*)/.exec(window.location.search || '');
      raw = m ? decodeURIComponent(m[1]) : null;
    } catch (e) { raw = null; }

    var n = parseInt(raw, 10);

    if (raw !== null && isNaN(n)) {
      console.warn('index.html: ?ch=' + raw + ' is not a number — opening chapter 1.');
      return 1;
    }
    if (isNaN(n)) return 1;                       /* no ?ch at all */

    var known = manifest().some(function (c) { return c.number === n; });
    if (!known) {
      console.warn('index.html: there is no chapter ' + n + ' — opening chapter 1.');
      return 1;
    }
    return n;
  }


  /* Scripts already in the document. A chapter switch must not re-run them:
     labs register renderers into window.CHAPTER_BEATS once and re-running
     resets their state. The content file is the exception - see addJS. */
  var loadedJS = Object.create(null);

  /* Stylesheets each chapter brought, so the previous one's can be removed. */
  var cssByChapter = Object.create(null);

  /** Where a listed path lives: a path with a slash is already relative to
   *  this page (the labs borrow the sandbox's engine); a bare name is local. */
  function url(src) {
    return src.indexOf('../') === 0 ? src : JS_DIR + src;
  }

  /** Append a stylesheet and resolve when it has applied. */
  function addCSS(href) {
    return new Promise(function (resolve) {
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = CSS_DIR + href;
      link.setAttribute('data-chapter-asset', href);
      /* Resolve either way: a stylesheet that fails must not stop the chapter. */
      link.onload = function () { resolve(link); };
      link.onerror = function () { resolve(link); };
      document.head.appendChild(link);
    });
  }

  /**
   * Append a script and resolve when it has run. `always` re-runs a file
   * already present; only the CONTENT file needs that, since it defines
   * "the chapter we are in". Everything else must run exactly once.
   */
  function addJS(src, always) {
    if (loadedJS[src] && !always) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = url(src);
      s.async = false;                            /* keep the order we append in */
      s.onload = function () { loadedJS[src] = true; resolve(); };
      s.onerror = function () {
        reject(new Error('could not load ' + s.src +
                         ' — if this is a file:// page, check that the file is there'));
      };
      document.body.appendChild(s);
    });
  }


  /**
   * Put chapter `n`'s assets in the document. Resolves once its content file
   * and labs have run and the previous chapter's stylesheets are gone, so the
   * caller can redraw against a page that is already styled.
   */
  function load(n) {
    var lab = LABS[n] || { css: [], js: [] };
    var previous = Object.keys(cssByChapter);

    return Promise.all((lab.css || []).map(addCSS))
      .then(function (links) {
        /* The new stylesheets are in place, so the old ones can go. Removing
           them only now is what keeps the board from flashing unstyled. */
        previous.forEach(function (key) {
          if (String(n) === key) return;
          (cssByChapter[key] || []).forEach(function (link) {
            if (link.parentNode) link.parentNode.removeChild(link);
          });
          delete cssByChapter[key];
        });
        cssByChapter[n] = links;

        /* The labs are cached; the content file is not. */
        var list = ['data/content.chapter' + n + '.en.js'];
        return list.concat(lab.js || []).reduce(function (chain, src) {
          /* The list's first entry is the content file - only it re-runs (see
             addJS). Identify it by POSITION, not by path prefix, so moving the
             file cannot silently stop it from re-running. */
          var always = (src === list[0]);
          return chain.then(function () { return addJS(src, always); });
        }, Promise.resolve());
      })
      .then(function () {
        window.CHAPTER_NUMBER = n;
        return n;
      });
  }

  /** Something went wrong before the lesson could start: say so on the stage
   *  instead of leaving it empty. */
  function fail(err) {
    var stage = document.getElementById('stage');
    var text = err && err.message ? err.message : String(err);
    if (stage) {
      stage.innerHTML = '<p style="padding:2rem;font:15px/1.6 system-ui">' +
        'Could not start this chapter.<br>' + text + '</p>';
    }
    if (window.console) console.error(err);
  }


  var CHAPTER = wanted();

  var ready = load(CHAPTER)
    .then(function () { return addJS('app.js'); })
    .catch(fail);

  /* Exposed for app.js (chapter switching) and for anything that wants to
     know which chapter this document turned out to be. */
  window.CHAPTER_NUMBER = CHAPTER;
  window.ChapterLoader = {
    load: load,
    ready: ready,
    chapterOfHref: chapterOfHref,
    current: function () { return window.CHAPTER_NUMBER; }
  };
})();

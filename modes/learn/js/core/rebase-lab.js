(function () {
  'use strict';

  window.CHAPTER_BEATS = window.CHAPTER_BEATS || {};

  /* Chapter 9's opening is a stable title card like Chapter 8's: it stays
     visible after Continue. The generic `scene` renderer is avoided because it
     dims/scales a completed beat and types the title in. */
  window.CHAPTER_BEATS.rebaseIntro = function (host, beat, api, helpers) {
    var esc = helpers.esc, ic = helpers.ic;
    api.brief('' +
      '<div class="rebase-intro">' +
        '<div class="rebase-intro__icon">' + ic(beat.icon || 'users', 30) + '</div>' +
        '<p class="rebase-intro__text">' + esc(beat.text) + '</p>' +
      '</div>');
    host.innerHTML = '';
    api.ready();
    return {};
  };

  window.CHAPTER_BEATS.rebaseLab = function (host, beat, api, helpers) {
    var esc = helpers.esc, ic = helpers.ic, gconn = helpers.gconn,
        gnode = helpers.gnode, grefs = helpers.grefs, glegend = helpers.glegend;
    var copy = window.CHAPTER_CONTENT.rebase;
    var mode = beat.mode;
    var done = false;
    var timers = [];
    var state = initial(mode);

    helpers.brief('' +
      '<div class="lesson-guide__intro">' +
        '<span class="blocklabel">' + ic('book-open', 15) + ' ' + esc(copy.task) + '</span>' +
        '<h2>' + esc(beat.title) + '</h2>' +
        '<p>' + esc(beat.text) + '</p>' +
      '</div>' +
      '<div class="lesson-guide__task">' + ic('mouse-pointer-click', 20) + '<strong>' + esc(beat.task) + '</strong></div>');

    host.innerHTML = '' +
      '<div class="rebase-guide">' +
        '<div class="rebase-board"></div>' +
        '<div class="lesson-feedback" role="status" aria-live="polite" hidden></div>' +
      '</div>';

    var board = host.querySelector('.rebase-board');
    var feedback = host.querySelector('.lesson-feedback');

    function later(fn, ms) {
      var id = setTimeout(fn, ms);
      timers.push(id);
      return id;
    }

    function clearTimers() {
      timers.forEach(function (id) { clearTimeout(id); });
      timers = [];
    }

    function initial(name) {
      /* `log` keeps terminal output across re-renders so the typed command stays. */
      if (name === 'merge') return { merged: false, merging: false, answer: '', wrong: false, log: [] };
      if (name === 'rebase') return { running: false, phase: 0, answer: '', wrong: false, log: [] };
      if (name === 'identity') return { openedD: true, openedDp: true, answer: '', wrong: false };
      if (name === 'risk') return { rewritten: false, rewriting: false, compared: false, answer: '', wrong: false, log: [] };
      return { aChoice: '', aStatus: 'idle', aLog: [], bChoice: '', bStatus: 'idle', bLog: [], answer: '', wrong: false };
    }

    function feedbackMessage(message, tone) {
      feedback.hidden = false;
      feedback.classList.toggle('is-success', tone !== 'warn');
      feedback.innerHTML = ic(tone === 'warn' ? 'circle-help' : 'circle-check', 18) + '<span>' + esc(message) + '</span>';
    }

    function finish(message) {
      if (done) return;
      done = true;
      feedbackMessage(message, 'success');
      api.ready();
      paint();
    }

    function statusPill(icon, text, tone) {
      return '<span class="rebase-status' + (tone ? ' is-' + tone : '') + '">' + ic(icon, 13) + esc(text) + '</span>';
    }

    function phaseStrip(items, active) {
      return '<div class="rebase-phases">' + items.map(function (label, i) {
        var cls = i < active ? ' is-done' : i === active ? ' is-active' : '';
        return '<div class="rebase-phase' + cls + '"><span>' + (i < active ? ic('check', 11) : (i + 1)) + '</span><b>' + esc(label) + '</b></div>';
      }).join('') + '</div>';
    }

    function focusTo(selector, delay) {
      later(function () {
        var target = board.querySelector(selector);
        if (target && target.scrollIntoView) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, delay || 80);
    }

    function scenarioCard() {
      return '<section class="rebase-scenario">' +
        '<span class="rebase-scenario__icon">' + ic('git-branch', 22) + '</span>' +
        '<div><span class="blocklabel">Starting situation</span>' +
          '<h3>You are on <code>feature/login</code>.</h3>' +
          '<p>Your feature has commits <b>D</b> and <b>E</b>. Meanwhile, <code>main</code> moved forward to <b>C</b> and <b>F</b>. You now want the latest work from <code>main</code> in your feature branch.</p>' +
        '</div>' +
      '</section>';
    }

    function chapterIntro() {
      return '<section class="rebase-chapter-intro">' +
        '<span class="rebase-chapter-intro__icon">' + ic('git-compare', 24) + '</span>' +
        '<div><span class="blocklabel">Chapter 9 · Merge vs rebase</span>' +
          '<h2>Two ways to bring the latest <code>main</code> into your feature branch.</h2>' +
          '<p>Start with merge, then try rebase. The code can end up similar, but Git records the history differently.</p>' +
          '<div class="rebase-chapter-intro__path"><span>1 · Merge</span><span>2 · Rebase</span><span>3 · Why commits change</span><span>4 · Shared history</span><span>5 · Decision lab</span></div>' +
        '</div>' +
      '</section>';
    }

    function commandHelp(command, meaning, watch) {
      return '<section class="rebase-command-help">' +
        '<div><span class="blocklabel">Command to type</span><code>' + esc(command) + '</code></div>' +
        '<div><b>What it means</b><p>' + esc(meaning) + '</p></div>' +
        '<div><b>What to watch</b><p>' + esc(watch) + '</p></div>' +
      '</section>';
    }

    function changedCard(title, body, fromText, toText) {
      return '<section class="rebase-changed">' + ic('circle-check', 18) +
        '<div><strong>' + esc(title) + '</strong><p>' + esc(body) + '</p>' +
        (fromText && toText ? '<div class="rebase-change-strip"><span>' + esc(fromText) + '</span>' + gconn('flush') + '<b>' + esc(toText) + '</b></div>' : '') +
        '</div></section>';
    }

    var GW = 900, GH = 330;   /* matches the old stage 1:1 - percentage coords port over */
    function gx(pct) { return Math.round(pct / 100 * GW * 10) / 10; }
    function gy(pct) { return Math.round(pct / 100 * GH * 10) / 10; }

    function graph(opts) {
      opts = opts || {};
      var kind = opts.kind || 'start';
      var interactiveMerge = opts.interactiveMerge;
      var title = opts.title || copy.history;
      var caption = opts.caption || '';
      var status = opts.status || '';

      var nodes = '';
      var pos = {};
      function node(id, label, x, y, tone, extra, sub, size) {
        /* M is the only clickable node (opens its two parents). The rest are
           display-only, not buttons - a row of dead buttons is keyboard noise. */
        var live = id === 'M' && interactiveMerge;
        pos[id] = { x: x, y: y };
        nodes += gnode({ role: tone || 'base', label: label, note: sub, cls: extra,
          data: id, live: live, x: x + '%', y: y + '%',
          size: size ? 'var(--g-node-lg)' : null });
      }

      var edges = '';
      function line(x1, y1, x2, y2, tone, extra) {
        var d = y1 === y2
          ? 'M' + gx(x1) + ' ' + gy(y1) + ' L' + gx(x2) + ' ' + gy(y2)
          : 'M' + gx(x1) + ' ' + gy(y1) +
            ' C' + gx((x1 + x2) / 2) + ' ' + gy(y1) +
            ', ' + gx((x1 + x2) / 2) + ' ' + gy(y2) + ', ' + gx(x2) + ' ' + gy(y2);
        return '<path class="gedge' + (tone ? ' gedge--' + tone : '') + (extra ? ' ' + extra : '') +
          '" d="' + d + '" pathLength="1"></path>';
      }

      if (kind === 'start' || kind === 'merge-running' || kind === 'merge-result' || kind === 'lift' || kind === 'base-moved' || kind === 'replay-d' || kind === 'replay-e') {
        node('A','A',8,44,'root'); node('B','B',24,44,'base'); node('C','C',43,26,'main'); node('F','F',62,26,'main');
        edges += line(8,44,24,44,'base'); edges += line(24,44,43,26,'main'); edges += line(43,26,62,26,'main');

        if (kind === 'lift') {
          node('D','D',42,67,'feature','is-lifted','lifting'); node('E','E',60,67,'feature','is-lifted','lifting');
          edges += line(24,44,42,67,'feature','is-fading'); edges += line(42,67,60,67,'feature','is-fading');
        } else if (kind === 'base-moved') {
          node('D','D',42,67,'ghost','is-ghost','saved change'); node('E','E',60,67,'ghost','is-ghost','saved change');
          edges += line(24,44,42,67,'ghost','is-fading'); edges += line(42,67,60,67,'ghost','is-fading');
        } else if (kind === 'replay-d') {
          node('Dold','D',42,67,'ghost','is-ghost'); node('Eold','E',60,67,'ghost','is-ghost'); node('Dp','D′',78,43,'feature','is-born','replayed');
          edges += line(62,26,78,43,'feature','is-drawing');
        } else if (kind === 'replay-e') {
          node('Dold','D',42,67,'ghost','is-ghost'); node('Eold','E',60,67,'ghost','is-ghost'); node('Dp','D′',77,43,'feature','','replayed'); node('Ep','E′',91,43,'feature','is-born','replayed');
          edges += line(62,26,77,43,'feature'); edges += line(77,43,91,43,'feature','is-drawing');
        } else {
          node('D','D',42,67,'feature'); node('E','E',60,67,'feature');
          edges += line(24,44,42,67,'feature'); edges += line(42,67,60,67,'feature');
        }

        if (kind === 'merge-running' || kind === 'merge-result') {
          if (kind === 'merge-result') node('M','M',82,46,'merge','is-born','2 parents',25);
          edges += line(62,26,82,46,'main',kind === 'merge-running' ? 'is-pulsing' : 'is-drawing');
          edges += line(60,67,82,46,'feature',kind === 'merge-running' ? 'is-pulsing' : 'is-drawing');
        }
      }
      if (kind === 'rebase-result') {
        node('A','A',7,44,'root'); node('B','B',22,44,'base'); node('C','C',38,44,'main'); node('F','F',54,44,'main'); node('Dp','D′',72,44,'feature','is-born','new'); node('Ep','E′',89,44,'feature','is-born','new');
        edges += line(7,44,22,44,'base'); edges += line(22,44,38,44,'main'); edges += line(38,44,54,44,'main'); edges += line(54,44,72,44,'feature','is-drawing'); edges += line(72,44,89,44,'feature','is-drawing');
      }
      if (kind === 'old-rebase') {
        node('B','B',12,50,'root'); node('D','D',38,50,'ghost'); node('E','E',66,50,'ghost');
        edges += line(12,50,38,50,'ghost'); edges += line(38,50,66,50,'ghost');
      }

      var tags = '';
      if (pos.F) tags += grefs(pos.F.x + '%', pos.F.y + '%', [{ name: 'main', tone: 'main' }]);
      var featureTip = pos.E || pos.Ep;
      if (featureTip) tags += grefs(featureTip.x + '%', featureTip.y + '%',
        [{ name: 'feature/login', tone: 'feature' }]);

      /* Edges first, then nodes, so nodes sit on top and hide rough line ends.
         WARNING: use role="group", not role="img" - role="img" makes children
         decorative and the clickable M would become unreachable. */
      return '<section class="rebase-card rebase-card--graph">' +
        '<div class="rebase-card__head"><div>' + ic('git-branch', 17) + '<strong>' + esc(title) + '</strong></div>' + (status || statusPill('history', 'starting history')) + '</div>' +
        '<div class="gframe rebase-history' + (opts.compact ? ' is-compact' : '') + '" style="--gw:' + GW + ';--gh:' + GH + '" role="group" aria-label="Commit graph: main runs A, B, C, F; feature/login runs D, E and is the current HEAD branch.">' +
          '<svg class="gedges" viewBox="0 0 ' + GW + ' ' + GH + '" preserveAspectRatio="none" aria-hidden="true" focusable="false">' + edges + '</svg>' +
          nodes + tags +
        '</div>' + glegend() +
        (caption ? '<div class="rebase-card__caption">' + ic('lightbulb', 15) + '<span>' + esc(caption) + '</span></div>' : '') +
      '</section>';
    }
    function conceptOptions(question, options, answer) {
      return '<section class="rebase-question">' +
        '<div><span class="blocklabel">' + ic('circle-help', 14) + ' Check your model</span><strong>' + esc(question) + '</strong></div>' +
        '<div class="rebase-options">' + options.map(function (o) {
          var cls = state.answer === o.id ? (o.id === answer ? ' is-correct' : ' is-wrong') : '';
          return '<button type="button" class="rebase-option' + cls + '" data-answer="' + esc(o.id) + '">' + ic(o.icon || 'git-commit-horizontal', 18) + '<span><b>' + esc(o.label) + '</b><small>' + esc(o.note) + '</small></span></button>';
        }).join('') + '</div>' +
      '</section>';
    }

    function mergeView() {
      var kind = state.merging ? 'merge-running' : state.merged ? 'merge-result' : 'start';
      var status = state.merging ? statusPill('loader-circle', 'merging main into feature/login', 'working') : state.merged ? statusPill('circle-check', 'merge complete', 'good') : statusPill('git-compare', 'two branches have diverged', 'warn');
      return '<div class="rebase-stack">' +
        scenarioCard() +
        phaseStrip(['Read the starting graph','Type git merge main','Read the merge result'], state.merged ? 3 : state.merging ? 1 : 0) +
        '<div class="rebase-teach"><span class="rebase-step-badge">1</span><div><strong>Why type <code>git merge main</code>?</strong><p>You are already on <code>feature/login</code>. This command asks Git to bring the latest <code>main</code> history into the branch you are currently on.</p></div></div>' +
        graph({ kind: kind, title: state.merged ? 'After git merge main' : 'Starting history', status: status, caption: state.merged ? 'The old commits did not move. Git added M to join the two histories.' : 'HEAD is feature/login. main ends at F; feature/login ends at E.' }) +
        (!state.merged ? commandHelp('git merge main', 'Bring main into my current branch, feature/login.', 'After Run, look for one new merge commit M. D and E should stay where they are.') : '') +
        (!state.merged ? GitTerm.form({
          id: 'merge',
          command: 'git merge main',
          value: GitTerm.valueOf(board, 'merge'),
          log: state.log,
          run: state.merging ? 'Merging…' : 'Run',
          disabled: state.merging
        }) : '') +
        (state.merged ? changedCard('What changed?', 'Git kept the existing commits and added M. M has two parents: F from main and E from feature/login. feature/login now points to M; main still points to F.', 'two separate tips: F and E', 'one joined history through M') : '') +
        (state.merged ? '<section class="rebase-commit-inspect"><div class="rebase-commit-badge">M</div><div><span class="blocklabel">New merge commit</span><h3>M records where the histories meet.</h3><dl><div><dt>Parent 1</dt><dd>F · latest main</dd></div><div><dt>Parent 2</dt><dd>E · previous feature tip</dd></div><div><dt>Existing commits</dt><dd>D and E stay in place</dd></div></dl></div></section>' : '') +
        (state.merged ? conceptOptions('What did merge do to the commit graph?', [
          {id:'move',icon:'refresh-cw',label:'It moved D and E after F',note:'That describes rebase, not merge.'},
          {id:'join',icon:'git-merge',label:'It kept the old commits and added M to join the histories',note:'This is the merge result you just saw.'},
          {id:'replace',icon:'trash-2',label:'It replaced D and E with new commits',note:'Merge does not need to replace them.'}
        ], 'join') : '') +
      '</div>';
    }

    function rebaseKind() {
      if (!state.running && state.phase === 0) return 'start';
      if (state.phase === 1) return 'lift';
      if (state.phase === 2) return 'base-moved';
      if (state.phase === 3) return 'replay-d';
      if (state.phase === 4) return 'replay-e';
      return 'rebase-result';
    }

    function rebaseView() {
      var labels = ['Start','Set D + E aside','Move feature to F','Replay D as D′','Replay E as E′'];
      var phaseLabel = state.phase === 0 ? 'Ready to rebase' : state.phase === 1 ? 'Temporarily saving D and E' : state.phase === 2 ? 'Moving the feature base to F' : state.phase === 3 ? 'Replaying D as D′' : state.phase === 4 ? 'Replaying E as E′' : 'Rebase complete';
      var explain = [
        'feature/login still starts from B, while main has moved forward to F.',
        'Git temporarily sets aside the changes represented by D and E.',
        'feature/login is moved so that it now starts from the latest main commit F.',
        'Git applies D’s change again on top of F. Because the parent changed, this is a new commit D′.',
        'Git applies E’s change again after D′, creating E′.',
        'The same feature changes now sit after F in a straighter history.'
      ][state.phase];
      return '<div class="rebase-stack">' +
        phaseStrip(labels, Math.min(state.phase, 5)) +
        '<div class="rebase-teach is-rebase"><span class="rebase-step-badge">2</span><div><strong>' + esc(phaseLabel) + '</strong><p>' + esc(explain) + '</p></div></div>' +
        graph({ kind: rebaseKind(), running: state.running, title: state.phase >= 5 ? 'After git rebase main' : 'Rebase in motion', status: state.running ? statusPill('loader-circle',phaseLabel,'working') : state.phase >= 5 ? statusPill('circle-check','rebase complete','good') : statusPill('history','same starting graph') }) +
        (state.phase === 0 ? commandHelp('git rebase main', 'Take my feature changes and replay them after the latest main commit.', 'D and E will be replaced by D′ and E′. The branch history becomes straighter.') : '') +
        (state.phase < 5 ? GitTerm.form({
          id: 'rebase',
          command: 'git rebase main',
          value: GitTerm.valueOf(board, 'rebase'),
          log: state.log,
          run: state.running ? 'Rebasing…' : 'Run',
          disabled: state.running
        }) : '') +
        (state.running ? '<div class="rebase-animation-caption"><span class="rebase-pulse"></span><b>Watch the graph.</b><span>This animation shows the idea behind rebase step by step.</span></div>' : '') +
        (state.phase >= 5 ? changedCard('What changed?', 'D and E did not move in place. Git replayed their changes after F and created replacement commits D′ and E′.', 'B → D → E', 'F → D′ → E′') : '') +
        (state.phase >= 5 ? '<section class="rebase-before-after"><div><span class="blocklabel">Before</span><code>B → D → E</code><small>feature based on B</small></div>' + gconn('accent flush', { cls: 'rebase-before-after__arrow' }) + '<div><span class="blocklabel">After rebase</span><code>F → D′ → E′</code><small>feature rebuilt on F</small></div></section>' : '') +
        (state.phase >= 5 ? conceptOptions('What is the simplest description of rebase here?', [
          {id:'connect',icon:'git-merge',label:'It added one merge commit M',note:'That was the merge result.'},
          {id:'replay',icon:'refresh-cw',label:'It replayed my feature changes on top of the latest main',note:'D and E became D′ and E′.'},
          {id:'delete',icon:'trash-2',label:'It deleted my feature work',note:'The changes were replayed, not discarded.'}
        ], 'replay') : '') +
      '</div>';
    }

    function commitCard(which) {
      var prime = which === 'Dp';
      var opened = prime ? state.openedDp : state.openedD;
      return '<button type="button" class="rebase-identity-card' + (opened ? ' is-open' : '') + '" data-commit-card="' + which + '">' +
        '<div class="rebase-identity-card__top"><span class="rebase-identity-dot ' + (prime ? 'is-new' : '') + '">' + (prime ? 'D′' : 'D') + '</span><div><span class="blocklabel">' + esc(prime ? copy.rewritten : copy.original) + '</span><strong>Add login form</strong></div>' + ic(opened ? 'chevron-down' : 'mouse-pointer-click',16) + '</div>' +
        (opened ? '<dl><div><dt>Code change</dt><dd>+ login form</dd></div><div class="is-key"><dt>Parent</dt><dd>' + (prime ? 'F' : 'B') + '</dd></div><div><dt>Example ID</dt><dd class="mono">' + (prime ? '91c4be' : '3f21ad') + '</dd></div></dl>' : '<small>Click to inspect what this commit records.</small>') +
      '</button>';
    }

    function identityView() {
      return '<div class="rebase-stack">' +
        '<section class="rebase-identity-explain">' +
          '<div class="rebase-identity-explain__lead"><span class="rebase-step-badge">3</span><div><strong>A commit is not only “the code I changed”.</strong><p>Git also remembers which commit came immediately before it. That previous commit is called the <b>parent</b>.</p></div></div>' +
          '<div class="rebase-parent-story">' +
            '<div><span class="blocklabel">Before rebase</span><code>B → D</code><p>D adds the login form, and D is based on B. So <b>B is D’s parent</b>.</p></div>' +
            gconn('accent flush', { cls: 'rebase-parent-story__arrow' }) +
            '<div><span class="blocklabel">After rebase</span><code>F → D′</code><p>Git applies the same login-form change again, but now on top of F. So <b>F is D′’s parent</b>.</p></div>' +
          '</div>' +
          '<div class="rebase-identity-formula"><span>same code change</span><strong class="rebase-formula-symbol">+</strong><span>different parent</span>' + gconn('accent flush') + '<b>new commit identity</b></div>' +
        '</section>' +
        '<section class="rebase-identity-map"><div class="rebase-parent is-old"><span>B</span><small>D was based on B</small></div>' + gconn('line flush', { cls: 'rebase-id-line' }) + '<div class="rebase-child"><b>D</b></div>' + gconn('accent flush', { cls: 'rebase-id-arrow' }) + '<div class="rebase-parent is-new"><span>F</span><small>D′ is now based on F</small></div>' + gconn('line flush', { cls: 'rebase-id-line' }) + '<div class="rebase-child is-new"><b>D′</b></div></section>' +
        '<div class="rebase-identity-grid">' + commitCard('D') + commitCard('Dp') + '</div>' +
        '<section class="rebase-diff-focus"><span>' + ic('target',16) + '</span><div><strong>Why not just “move D”?</strong><p>Because changing the parent changes what the commit records. Git therefore creates D′ as a replacement commit rather than moving the old D object.</p></div></section>' +
        conceptOptions('Why does D become D′ after the rebase?', [
          {id:'message',icon:'file-text',label:'The commit message changed',note:'The message can stay the same.'},
          {id:'parent',icon:'git-branch',label:'Its parent changed from B to F',note:'Same change, but now attached to a different history.'},
          {id:'file',icon:'files',label:'The file extension changed',note:'That has nothing to do with commit identity.'}
        ], 'parent') +
      '</div>';
    }

    /* Each person's history gets its own graph, not one shared graph: this page
       is about the two copies having diverged, so merging them into one picture
       would misrepresent Git. One row of commits, so one lane - straight L. */
    function personGraph(ids, tones) {
      var GW = 470, GH = 100, Y = 50, R = 21;
      var step = GW / ids.length;
      function pct(v, span) { return (v / span * 100).toFixed(3) + '%'; }
      var paths = '', dots = '';
      ids.forEach(function (id, i) {
        var cx = step * (i + 0.5);
        if (i) {
          paths += '<path class="gedge" d="M' + (step * (i - 0.5)).toFixed(1) + ' ' + Y +
            ' L' + cx.toFixed(1) + ' ' + Y + '" pathLength="1"></path>';
        }
        dots += gnode({ role: tones[i] || 'base', label: id,
          x: pct(cx, GW), y: pct(Y, GH) });
      });
      return '<div class="gframe rebase-person__history" style="--gw:' + GW + ';--gh:' + GH +
        '" role="img" aria-label="' + esc(ids.join(' → ')) + '">' +
        '<svg class="gedges" viewBox="0 0 ' + GW + ' ' + GH + '" preserveAspectRatio="none" aria-hidden="true" focusable="false">' +
          paths + '</svg>' + dots + '</div>';
    }

    function personHistory(person, rewritten) {
      var alice = person === 'Alice';
      var useNew = alice && rewritten;
      var ids = useNew ? ['B', 'F', 'D′', 'E′'] : (alice ? ['B', 'D', 'E'] : ['B', 'D', 'E', 'X']);
      var tones = useNew ? ['base', 'main', 'feature', 'feature']
        : (alice ? ['base', 'feature', 'feature'] : ['base', 'feature', 'feature', 'good']);
      return '<section class="rebase-person' + (useNew ? ' is-rewritten' : '') + '">' +
        '<div class="rebase-person__head"><span class="rebase-avatar">' + person.charAt(0) + '</span><div><strong>' + person + '</strong><small>' + (alice ? 'rebases feature/login' : 'already pulled the branch') + '</small></div>' + (useNew ? statusPill('refresh-cw','history rewritten','warn') : statusPill('circle-check','local copy')) + '</div>' +
        personGraph(ids, tones) +
      '</section>';
    }
    function riskView() {
      return '<div class="rebase-stack">' +
        '<div class="rebase-teach is-risk"><span class="rebase-step-badge">4</span><div><strong>' + (state.rewritten ? 'Alice and Bob now have different versions of the same branch history.' : 'Bob already depends on D and E.') + '</strong><p>' + (state.rewritten ? 'Alice now has D′ and E′. Bob still has D and E, plus his own commit X. Git sees those as different commit identities.' : 'Bob built X on top of E. If Alice rewrites D and E now, Bob’s copy does not automatically change with hers.') + '</p></div></div>' +
        '<div class="rebase-team-grid">' + personHistory('Alice', state.rewritten) + personHistory('Bob', state.rewritten) + '</div>' + glegend() +
        (!state.rewritten ? commandHelp('git rebase main', 'Alice rewrites her local feature history so her changes sit after main.', 'After Run, compare Alice’s D′/E′ with Bob’s old D/E/X history.') : '') +
        (!state.rewritten ? GitTerm.form({
          id: 'rewrite',
          command: 'git rebase main',
          value: GitTerm.valueOf(board, 'rewrite'),
          log: state.log,
          run: state.rewriting ? 'Rebasing…' : 'Run',
          disabled: state.rewriting
        }) : '') +
        (state.rewritten ? '<div class="rebase-rewrite-banner">' + ic('triangle-alert',18) + '<div><strong>Two histories now disagree</strong><span>Alice created replacement commits. Bob still owns the old commits and has X on top of them.</span></div></div>' : '') +
        (state.rewritten ? '<section class="rebase-divergence"><div><b>Alice</b><code>F → D′ → E′</code></div><span>' + ic('split',21) + '<small>different commit IDs</small></span><div><b>Bob</b><code>B → D → E → X</code></div></section>' : '') +
        (state.rewritten ? conceptOptions('What is the safer beginner rule for rebase?', [
          {id:'always',icon:'zap',label:'Rebase every shared branch whenever you can',note:'That can rewrite commits other people already use.'},
          {id:'private',icon:'user',label:'Prefer rebase before teammates depend on those commits',note:'Private/local history is safer to rewrite.'},
          {id:'never',icon:'x',label:'Never use rebase',note:'Rebase is useful when used at the right time.'}
        ], 'private') : '') +
      '</div>';
    }

    function decisionChoice(scenario, method, title, note, best) {
      var choice = scenario === 'a' ? state.aChoice : state.bChoice;
      var locked = scenario === 'a' ? state.aStatus === 'done' : state.bStatus === 'done';
      var cls = choice === method ? (best ? ' is-best' : ' is-warning') : '';
      return '<button type="button" class="rebase-decision-choice' + cls + '" data-decision="' + scenario + ':' + method + '"' + (locked ? ' disabled' : '') + '>' +
        '<span>' + ic(method === 'merge' ? 'git-merge' : 'refresh-cw',18) + '</span><div><strong>' + esc(title) + '</strong><small>' + esc(note) + '</small></div>' +
      '</button>';
    }

    function decisionTerminal(id, command, status, log) {
      return GitTerm.form({
        id:id,
        command:command,
        value:GitTerm.valueOf(board,id),
        log:log,
        run:status === 'running' ? 'Working…' : status === 'done' ? 'Done' : 'Run',
        disabled:status === 'running' || status === 'done'
      });
    }

    function sharedScenario() {
      var chosen = state.aChoice;
      var best = chosen === 'merge';
      return '<section class="rebase-decision-card' + (state.aStatus === 'done' ? ' is-complete' : '') + '">' +
        '<div class="rebase-decision-card__head"><span class="rebase-scenario-letter">A</span><div><span class="blocklabel">Shared branch</span><h3>Bob already built work on top of your feature commits.</h3><p>Bob pulled <code>feature/login</code> at E and added commit X. Meanwhile, <code>main</code> moved forward to F.</p></div>' + (state.aStatus === 'done' ? statusPill('circle-check','merge completed','good') : '') + '</div>' +
        '<div class="rebase-decision-history"><div><b>Your branch</b><code>B → D → E</code></div><div><b>Bob’s copy</b><code>B → D → E → X</code></div><div><b>main</b><code>B → C → F</code></div></div>' +
        '<div class="rebase-decision-question"><strong>Which method better protects the history Bob already uses?</strong><div class="rebase-decision-choices">' +
          decisionChoice('a','merge','Merge main into the feature branch','Keep D and E and add a merge commit.',true) +
          decisionChoice('a','rebase','Rebase the shared branch','Replace D and E with D′ and E′.',false) +
        '</div></div>' +
        (chosen === 'rebase' ? '<div class="rebase-choice-consequence is-warning">' + ic('triangle-alert',18) + '<div><strong>Look at the consequence before continuing.</strong><p>Your branch would become <code>F → D′ → E′</code>, while Bob would still have <code>B → D → E → X</code>. Bob now depends on commits that your branch replaced.</p><small>Rebase can work technically, but it is a poor fit once teammates already depend on the old commits.</small></div></div>' : '') +
        (chosen === 'merge' ? '<div class="rebase-choice-consequence is-good">' + ic('circle-check',18) + '<div><strong>Merge fits this shared-history situation.</strong><p>D and E stay intact, so Bob’s existing history still makes sense. Git adds a new merge commit instead of replacing the commits he already uses.</p></div></div>' : '') +
        (best ? commandHelp('git merge main','Bring the latest main history into your current shared feature branch without replacing D and E.','After Run, look for merge commit M. The existing D and E remain part of the history.') : '') +
        (best ? decisionTerminal('decision-merge','git merge main',state.aStatus,state.aLog) : '') +
        (state.aStatus === 'done' ? graph({kind:'merge-result',compact:true,title:'Shared branch after merge',status:statusPill('git-merge','existing history kept','good')}) : '') +
      '</section>';
    }

    function privateScenario() {
      var chosen = state.bChoice;
      var best = chosen === 'rebase';
      return '<section class="rebase-decision-card' + (state.bStatus === 'done' ? ' is-complete' : '') + '">' +
        '<div class="rebase-decision-card__head"><span class="rebase-scenario-letter">B</span><div><span class="blocklabel">Private feature branch</span><h3>No teammate has pulled your branch yet.</h3><p>You created <code>feature/search</code> locally. While you worked on D and E, <code>main</code> moved forward to F.</p></div>' + (state.bStatus === 'done' ? statusPill('circle-check','rebase completed','good') : '') + '</div>' +
        '<div class="rebase-decision-history"><div><b>Your private feature</b><code>B → D → E</code></div><div><b>Teammates using it</b><code>none</code></div><div><b>main</b><code>B → C → F</code></div></div>' +
        '<div class="rebase-decision-question"><strong>Which method can update this private branch while keeping the history simple?</strong><div class="rebase-decision-choices">' +
          decisionChoice('b','merge','Merge main into the private branch','Valid, but it adds an extra merge commit.',false) +
          decisionChoice('b','rebase','Rebase onto main','Replay your private work after F.',true) +
        '</div></div>' +
        (chosen === 'merge' ? '<div class="rebase-choice-consequence is-neutral">' + ic('circle-help',18) + '<div><strong>Merge would still work here.</strong><p>It would keep D and E and add merge commit M. Because this branch is private, rebase is often chosen instead when you want a simpler linear history.</p><small>This is not “wrong”; it is just less tidy for this particular private-branch goal.</small></div></div>' : '') +
        (chosen === 'rebase' ? '<div class="rebase-choice-consequence is-good">' + ic('circle-check',18) + '<div><strong>Rebase fits this private-history situation.</strong><p>No teammate depends on D and E, so replacing them with D′ and E′ does not invalidate someone else’s work.</p></div></div>' : '') +
        (best ? commandHelp('git rebase main','Replay your private feature changes on top of the latest main commit F.','After Run, D and E become D′ and E′ and the branch history becomes straighter.') : '') +
        (best ? decisionTerminal('decision-rebase','git rebase main',state.bStatus,state.bLog) : '') +
        (state.bStatus === 'done' ? graph({kind:'rebase-result',compact:true,title:'Private branch after rebase',status:statusPill('refresh-cw','simple private history','good')}) : '') +
      '</section>';
    }

    function compareView() {
      var complete = state.aStatus === 'done' && state.bStatus === 'done';
      return '<div class="rebase-stack">' +
        '<section class="rebase-decision-intro"><span>' + ic('git-compare',22) + '</span><div><strong>Now decide from the situation, not from the command name.</strong><p><b>Shared history:</b> protect commits other people already use. <b>Private history:</b> you have more freedom to rewrite your own commits.</p></div></section>' +
        sharedScenario() +
        privateScenario() +
        (complete ? '<section class="rebase-decision-summary"><div><span class="blocklabel">Decision rule</span><h3>Merge protects shared history. Rebase can simplify private history.</h3><p>Neither command is universally “better”. The important question is whether other people already depend on the commits you are about to rewrite.</p></div><div class="rebase-decision-summary__rows"><span><b>Shared branch</b><em>Prefer merge when teammates already depend on D / E.</em></span><span><b>Private branch</b><em>Rebase is a good option before anyone else depends on those commits.</em></span></div></section>' : '<div class="rebase-nudge">' + ic('mouse-pointer-click',15) + '<span>Complete Scenario A and Scenario B to build the decision rule.</span></div>') +
      '</div>';
    }

    function view() {
      if (mode === 'merge') return mergeView();
      if (mode === 'rebase') return rebaseView();
      if (mode === 'identity') return identityView();
      if (mode === 'risk') return riskView();
      return compareView();
    }

    function answer(correct, eventTarget, success) {
      state.answer = eventTarget.getAttribute('data-answer');
      state.wrong = state.answer !== correct;
      if (!state.wrong) finish(success);
      else feedbackMessage('Look at the graph again. The visual result gives you the clue.', 'warn');
      paint();
    }

    function bind() {
      var el;

      Array.prototype.slice.call(board.querySelectorAll('[data-commit-card]')).forEach(function (card) {
        card.addEventListener('click', function () {
          if (card.getAttribute('data-commit-card') === 'D') state.openedD = true;
          else state.openedDp = true;
          paint();
        });
      });

      Array.prototype.slice.call(board.querySelectorAll('[data-decision]')).forEach(function (btn) {
        btn.addEventListener('click', function () {
          var parts = btn.getAttribute('data-decision').split(':');
          var scenario = parts[0], method = parts[1];
          if (scenario === 'a') state.aChoice = method;
          else state.bChoice = method;
          feedback.hidden = true;
          paint();
          focusTo(scenario === 'a' ? '.rebase-decision-card:nth-of-type(2)' : '.rebase-decision-card:nth-of-type(3)', 60);
        });
      });

      Array.prototype.slice.call(board.querySelectorAll('[data-answer]')).forEach(function (btn) {
        btn.addEventListener('click', function () {
          if (mode === 'merge') answer('join', btn, 'Exactly. Merge preserved the existing commits and added a new meeting point, M.');
          else if (mode === 'rebase') answer('replay', btn, 'Exactly. Rebase replayed the feature changes on top of F, creating D′ and E′.');
          else if (mode === 'identity') answer('parent', btn, 'Exactly. D′ has a different parent, so it is a different commit even when the code change looks the same.');
          else if (mode === 'risk') answer('private', btn, 'Good. Rewriting history is easiest to reason about before teammates have built work on top of it.');
          else answer('different', btn, 'Exactly. Both can integrate the work, but the commit graph records a different story.');
        });
      });
    }

    /* Every git action here is typed, not clicked. The commands map to what the
       old buttons ran; the state machine and animations below are unchanged. */
    var COMMANDS = {
      merge: 'git merge main',
      rebase: 'git rebase main',
      rewrite: 'git rebase main',
      'decision-merge': 'git merge main',
      'decision-rebase': 'git rebase main'
    };

    function pushCmd(list, command) {
      list.push({ text: '$ ' + command, tone: 'cmd' });
    }

    function runMerge() {
      pushCmd(state.log, COMMANDS.merge);
      state.log.push({ text: 'Merging main into current branch feature/login…' });
      state.merging = true; paint();
      focusTo('.rebase-card--graph', 80);
      later(function () {
        state.merging = false; state.merged = true;
        state.log.push({ text: 'Merge complete. New merge commit M joins F and E.', tone: 'ok' });
        paint();
        focusTo('.rebase-changed', 100);
      }, 1050);
    }

    function runRebase() {
      pushCmd(state.log, COMMANDS.rebase);
      state.log.push({ text: 'Replaying feature/login on top of main…' });
      clearTimers(); state.running = true; state.phase = 1; paint();
      focusTo('.rebase-card--graph', 80);
      [2,3,4,5].forEach(function (phase, i) {
        later(function () {
          state.phase = phase;
          if (phase === 5) {
            state.running = false;
            state.log.push({ text: 'Rebase complete. D and E were replaced by D′ and E′.', tone: 'ok' });
          }
          paint();
          if (phase === 5) focusTo('.rebase-changed', 120);
        }, 900 * (i + 1));
      });
    }

    function runRewrite() {
      pushCmd(state.log, COMMANDS.rewrite);
      state.log.push({ text: 'Alice is rewriting her local feature history…' });
      state.rewriting = true; paint();
      focusTo('.rebase-team-grid', 80);
      later(function () {
        state.rewriting = false; state.rewritten = true; state.compared = true;
        state.log.push({ text: 'Alice now has replacement commits D′ and E′. Bob still has D and E.', tone: 'warn' });
        paint();
        focusTo('.rebase-divergence', 120);
      }, 1100);
    }

    function runDecision(method) {
      var shared = method === 'merge';
      var list = shared ? state.aLog : state.bLog;
      var id = shared ? 'decision-merge' : 'decision-rebase';
      pushCmd(list, COMMANDS[id]);
      list.push({ text: shared ? 'Keeping the shared feature commits and joining main…' : 'Replaying the private feature commits on top of main…' });
      if (shared) state.aStatus = 'running'; else state.bStatus = 'running';
      paint();
      focusTo(shared ? '.rebase-decision-card:nth-of-type(2)' : '.rebase-decision-card:nth-of-type(3)', 80);
      later(function () {
        if (shared) {
          state.aStatus = 'done';
          list.push({ text: 'Merge complete. D and E stay; merge commit M records the join.', tone: 'ok' });
        } else {
          state.bStatus = 'done';
          list.push({ text: 'Rebase complete. D and E were replayed as D′ and E′ after F.', tone: 'ok' });
        }
        paint();
        focusTo(shared ? '.rebase-decision-card:nth-of-type(2) .rebase-card--graph' : '.rebase-decision-card:nth-of-type(3) .rebase-card--graph', 120);
        if (state.aStatus === 'done' && state.bStatus === 'done') {
          finish('Good. You chose merge to protect shared history and rebase to simplify private history.');
          focusTo('.rebase-decision-summary', 180);
        }
      }, shared ? 900 : 1250);
    }

    var RUNNERS = {
      merge: runMerge,
      rebase: runRebase,
      rewrite: runRewrite,
      'decision-merge': function () { runDecision('merge'); },
      'decision-rebase': function () { runDecision('rebase'); }
    };

    /* One delegate for the whole board, bound to the container rather than the
       forms paint() keeps replacing, so it survives re-renders. A wrong command
       reuses the feedback line and leaves the typed text in place for a retry. */
    GitTerm.bind(board, function (id, typed, form) {
      if (!GitTerm.matches(typed, COMMANDS[id])) {
        /* The hint names the command exactly; the terminal says so itself. */
        GitTerm.reject(form);
        return;
      }
      feedback.hidden = true;
      RUNNERS[id]();
    });

    function paint() {
      board.innerHTML = view();
      bind();
    }

    paint();
    return { pause: clearTimers };
  };
})();

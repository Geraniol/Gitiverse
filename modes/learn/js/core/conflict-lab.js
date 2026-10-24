(function () {
  'use strict';

  window.CHAPTER_BEATS = window.CHAPTER_BEATS || {};

  /* Chapter 8's opening is a stable title card. It skips the generic `scene`
     renderer on purpose: that one types the title in and fades/scales a
     completed beat away. Here the heading should simply stay put. */
  window.CHAPTER_BEATS.conflictIntro = function (host, beat, api, helpers) {
    var esc = helpers.esc, ic = helpers.ic;
    api.brief('' +
      '<div class="conflict-intro">' +
        '<div class="conflict-intro__icon">' + ic(beat.icon || 'users', 30) + '</div>' +
        '<p class="conflict-intro__text">' + esc(beat.text) + '</p>' +
      '</div>');
    host.innerHTML = '';
    api.ready();
    return {};
  };

  window.CHAPTER_BEATS.conflictLab = function (host, beat, api, helpers) {
    var esc = helpers.esc, ic = helpers.ic, gconn = helpers.gconn,
        gnode = helpers.gnode, glegend = helpers.glegend;
    var T = window.GitTerm;   /* typed terminals always use the shared component */
    var copy = window.CHAPTER_CONTENT.conflict;
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

    host.innerHTML = '<div class="conflict-guide">' +
      '<div class="conflict-board"></div>' +
      '<div class="lesson-feedback" role="status" aria-live="polite" hidden></div>' +
      (beat.command && mode !== 'resolve' ? '<details open class="lesson-hint lesson-command-note"><summary>' + esc(copy.command) + '</summary><pre class="lesson-code">' + esc(beat.command) + '</pre></details>' : '') +

    '</div>';

    var board = host.querySelector('.conflict-board');
    var feedback = host.querySelector('.lesson-feedback');

    function later(fn, ms) {
      var id = setTimeout(fn, ms);
      timers.push(id);
      return id;
    }

    /* Keep the learner on the visual result. The board repaints on each state
       change, so wait for the new DOM, then scroll the teaching area into view. */
    function focusAfterPaint(selector, block) {
      later(function () {
        var target = board.querySelector(selector);
        if (!target || typeof target.scrollIntoView !== 'function') return;
        target.scrollIntoView({
          behavior: 'smooth',
          block: block || 'start',
          inline: 'nearest'
        });
      }, 90);
    }

    function initial(name) {
      if (name === 'collision') {
        return {
          reveal: 0,
          mergeState: 'idle',
          input: '',
          terminal: ['$ git status', 'On branch main', 'nothing to commit, working tree clean'],
          terminalFresh: 0
        };
      }
      if (name === 'markers') {
        return {
          opened: false,
          seen: { head: false, current: false, split: false, incoming: false, end: false },
          focus: '',
          check: '',
          wrong: false
        };
      }
      if (name === 'resolve') {
        return {
          text: '<main>\n<<<<<<< HEAD\n<h1>Git Course</h1>\n=======\n<h1>Git Tutorial</h1>\n>>>>>>> feature/tutorial\n</main>',
          clean: false,
          exact: false,
          staged: false,
          committed: false,
          moving: false,
          committing: false,
          input: '',
          terminal: ['$ git status', 'On branch main', 'You have unmerged paths.', '  both modified:   index.html'],
          terminalFresh: 0
        };
      }
      return {
        auto: 'idle',
        conflict: 'idle',
        answer: '',
        wrong: false
      };
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

    function phaseStrip(items, active) {
      return '<div class="conflict-phase-strip" aria-label="Learning sequence">' + items.map(function (item, index) {
        var cls = index < active ? ' is-done' : index === active ? ' is-active' : '';
        return '<div class="conflict-phase' + cls + '">' +
          '<span class="conflict-phase__dot">' + (index < active ? ic('check', 12) : (index + 1)) + '</span>' +
          '<span>' + esc(item) + '</span>' +
        '</div>';
      }).join('') + '</div>';
    }

    function branchPill(label, tone, current) {
      return '<span class="conflict-branch-pill conflict-branch-pill--' + tone + (current ? ' is-current' : '') + '">' +
        (current ? ic('target', 12) : ic('git-branch', 12)) + esc(label) + '</span>';
    }

    /* All three file views share one tree: git-course holds only index.html.
       FileTree adds the root `.` itself, so pass only the folder. The caller
       supplies status: conflicted, clean, or staged. */
    function repoNodes(status) {
      return [{
        name: 'git-course', type: 'dir', open: true,
        children: [{ name: copy.file, type: 'file', status: status || null }]
      }];
    }

    /* The working/staging panes ask which Git layer a file is in, not where it
       sits in the project. So pass the bare file, with no git-course folder,
       which also keeps the name un-truncated in the narrow sidebar. */
    function stateNodes(status) {
      return [{ name: copy.file, type: 'file', status: status || null }];
    }

    /* This cell uses the shared GitTerm component (dark surface, log, hint,
       Run): the terminal stays dark and one action keeps one interaction.
       `placeholder` is the command to type, so it becomes command directly. */
    function terminalCard(lines, input, disabled, placeholder, compact) {
      return T.form({
        id: 'conflict',
        command: placeholder || 'git status',
        value: input || T.valueOf(board, 'conflict'),
        log: lines.map(function (line) {
          return { text: line, tone: /^\$ /.test(line) ? 'cmd' : null };
        }),
        run: copy.run,
        disabled: disabled
      });
    }

    /* A commit graph. Nodes and edges share one viewBox system: .gframe's aspect
       ratio matches the viewBox, so percentages land on the dots. Two lanes
       (main above, feature below); M sits between them because it joins both. */
    var GW = 470, GH = 220, MAIN_Y = 60, FEAT_Y = 160, MID_Y = 110;
    function gpct(v, span) { return (v / span * 100).toFixed(3) + '%'; }
    /* The size comes from the --g-node token, so a commit dot is the same size
       on every canvas in the course. */
    function gdot(x, y, name, tone, note, extra) {
      return gnode({ role: tone, label: name, note: note, cls: extra,
        x: gpct(x, GW), y: gpct(y, GH) });
    }
    /* Same lane uses a straight L; crossing lanes uses a cubic Bezier with
       control points at half the horizontal gap (existing repo convention). */
    function gpath(a, b, tone) {
      var d = a[1] === b[1]
        ? 'M' + a[0] + ' ' + a[1] + ' L' + b[0] + ' ' + b[1]
        : 'M' + a[0] + ' ' + a[1] + ' C' + ((a[0] + b[0]) / 2) + ' ' + a[1] +
          ', ' + ((a[0] + b[0]) / 2) + ' ' + b[1] + ', ' + b[0] + ' ' + b[1];
      return '<path class="gedge' + (tone ? ' gedge--' + tone : '') + '" d="' + d + '" pathLength="1"></path>';
    }

    function commonGraph(opts) {
      opts = opts || {};
      var reveal = opts.reveal == null ? 2 : opts.reveal;
      var merging = opts.merging || false;
      var conflicted = opts.conflicted || false;
      var merged = opts.merged || false;
      var title = opts.title || copy.history;
      var status = conflicted ? '<span class="conflict-merge-status is-conflict">' + ic('triangle-alert', 14) + ' merge paused</span>' :
        merged ? '<span class="conflict-merge-status is-done">' + ic('circle-check', 14) + ' merge complete</span>' :
        merging ? '<span class="conflict-merge-status is-working">' + ic('loader-circle', 14) + ' comparing changes</span>' :
        '<span class="conflict-merge-status">history before merge</span>';

      var edges =
        gpath([115, MAIN_Y], [205, MAIN_Y]) +
        gpath([205, MAIN_Y], [325, MAIN_Y], 'main') +
        gpath([205, MAIN_Y], [325, FEAT_Y], 'feature') +
        gpath([325, MAIN_Y], [415, MID_Y], 'merge') +
        gpath([325, FEAT_Y], [415, MID_Y], 'merge');
      /* C and D appear in two steps: an unseen dot stays dimmed in place
         (.is-hidden) and grows in via is-new's opacity+scale. Not display, or
         the reader would see later steps' shapes early. */
      /* A is the first commit and M is the merge, so they carry the root and
         merge rings; C and D are ordinary commits on their own branches. */
      var dots =
        gdot(115, MAIN_Y, 'A', 'root', 'First commit') +
        gdot(205, MAIN_Y, 'B', 'base', 'Shared history') +
        gdot(325, MAIN_Y, 'C', 'main', 'Alice\u2019s change', reveal < 1 ? 'is-hidden' : 'is-new') +
        gdot(325, FEAT_Y, 'D', 'feature', 'Bob\u2019s change', reveal < 2 ? 'is-hidden' : 'is-new') +
        gdot(415, MID_Y, 'M', 'merge', 'Joins both lines');

      return '<section class="conflict-card conflict-card--graph">' +
        '<div class="conflict-card__head"><div>' + ic('git-branch', 17) + '<strong>' + esc(title) + '</strong></div>' + status + '</div>' +
        '<div class="conflict-history' + (merging ? ' is-merging' : '') + (conflicted ? ' is-conflicted' : '') + (merged ? ' is-merged' : '') + '">' +
          '<div class="gframe" style="--gw:' + GW + ';--gh:' + GH + '" role="img"' +
            ' aria-label="Commit graph. A and B on main, then C on main by Alice and D on feature/tutorial by Bob. M joins the two.">' +
            '<span class="conflict-lane-label lane-main" style="left:2%;top:27%">main · Alice</span>' +
            '<span class="conflict-lane-label lane-feature" style="left:2%;top:73%">feature/tutorial · Bob</span>' +
            '<svg class="gedges" viewBox="0 0 ' + GW + ' ' + GH + '" preserveAspectRatio="none" aria-hidden="true" focusable="false">' + edges + '</svg>' +
            dots +
            '<span class="conflict-collision-badge">' + ic('triangle-alert', 15) + '<span>same line</span></span>' +
          '</div>' +
        '</div>' +
        '<div class="conflict-branch-legend">' + branchPill('main · HEAD', 'main', true) + branchPill('feature/tutorial', 'feature', false) + '</div>' +
        glegend() +
      '</section>';
    }
    function miniEditor(title, branch, before, after, tone, active, delay) {
      return '<section class="conflict-card conflict-version conflict-version--' + tone + (active ? ' is-active' : '') + '" style="--card-delay:' + (delay || 0) + 'ms">' +
        '<div class="conflict-card__head"><div>' + ic('file-text', 17) + '<strong>' + esc(title) + '</strong></div>' + branchPill(branch, tone, tone === 'main') + '</div>' +
        '<div class="conflict-mini-editor">' +
          '<div class="conflict-mini-editor__bar"><span></span><span></span><span></span><b>' + esc(copy.file) + '</b></div>' +
          '<div class="conflict-code-row"><span>1</span><code>&lt;main&gt;</code></div>' +
          (before ? '<div class="conflict-code-row is-removed"><span>2</span><code>' + esc(before) + '</code></div>' : '') +
          '<div class="conflict-code-row is-changed"><span>' + (before ? '3' : '2') + '</span><code>' + esc(after) + '</code></div>' +
          '<div class="conflict-code-row"><span>' + (before ? '4' : '3') + '</span><code>&lt;/main&gt;</code></div>' +
        '</div>' +
      '</section>';
    }

    function mergeNowPreview() {
      var status = state.mergeState;
      var ready = state.reveal >= 2;
      var right = status === 'conflict' ? 'Paused for your decision' : status === 'merging' ? 'Checking index.html…' : ready ? 'Ready to compare' : 'Reveal both edits first';
      return '<div class="conflict-merge-preview conflict-merge-preview--' + status + '">' +
        '<div class="conflict-merge-preview__flow">' +
          '<span class="is-main">main</span>' +
          '<span class="conflict-merge-preview__plus">+</span>' +
          '<span class="is-feature">feature/tutorial</span>' +
          gconn('faint flush', { cls: 'conflict-merge-preview__arrow',
                                 icon: status === 'conflict' ? 'pause' : 'arrow-right' }) +
          '<strong>' + esc(right) + '</strong>' +
        '</div>' +
        (status === 'merging'
          ? '<p>Git is comparing both versions now. Stay here — the result will appear in this box and in the terminal.</p>'
          : status === 'conflict'
            ? '<p>Both branches changed line 2 differently, so Git stops instead of choosing a heading for you.</p>'
            : ready
              ? '<p>Running the merge asks Git to combine the feature branch into the branch you are on now: main.</p>'
              : '<p>The merge becomes available after both branch changes are visible.</p>') +
      '</div>';
    }

    function collisionView() {
      var phase = state.mergeState === 'conflict' ? 4 : (state.reveal === 0 ? 1 : state.reveal === 1 ? 2 : 3);
      var canMerge = state.reveal >= 2 && state.mergeState === 'idle';
      var baseOnly = state.reveal === 0;
      var graph = commonGraph({
        reveal: state.reveal,
        merging: state.mergeState === 'merging',
        conflicted: state.mergeState === 'conflict'
      });

      return '<div class="conflict-collision-wrap">' +
        phaseStrip(['Shared starting point', 'Alice edits main', 'Bob edits feature', 'Try the merge'], phase) +
        '<div class="conflict-teach-callout">' +
          '<div class="conflict-teach-callout__icon">' + ic(baseOnly ? 'git-commit-horizontal' : state.reveal < 2 ? 'git-branch' : state.mergeState === 'conflict' ? 'triangle-alert' : 'git-compare', 21) + '</div>' +
          '<div><strong>' +
            (baseOnly ? 'Both branches start from the same snapshot.' :
              state.reveal === 1 ? 'Alice changes the heading on main.' :
              state.mergeState === 'conflict' ? 'Git found two answers for the same line.' :
              'Bob changes that exact line on feature/tutorial.') +
          '</strong><span>' +
            /* This text talks about a marker rather than showing one, so `<h1>`
               must be escaped - raw angle brackets render as a real h1 that
               screen readers announce. Escape brackets when discussing code. */
            (baseOnly ? 'Commit B contains &lt;h1&gt;Git Basics&lt;/h1&gt;. No conflict exists yet.' :
              state.reveal === 1 ? 'main now points to commit C. The old line is replaced with “Git Course”.' :
              state.mergeState === 'conflict' ? 'Git preserves both edits and pauses the merge instead of choosing for you.' :
              'feature/tutorial now points to D with “Git Tutorial”. The histories are both valid.') +
          '</span></div>' +
        '</div>' +
        '<div class="conflict-next-step">' + ic('mouse-pointer-click', 16) + '<div><strong>What to do now</strong><span>' +
          (state.reveal === 0 ? 'Click “Show Alice’s edit”, then look at the main branch in the commit graph.' :
           state.reveal === 1 ? 'Click “Show Bob’s edit”, then compare the two branch lines in the graph.' :
           state.mergeState === 'idle' ? 'Type git merge feature/tutorial in the terminal and click Run. Then watch the graph and terminal.' :
           state.mergeState === 'merging' ? 'Git is comparing the two branches. Watch the graph and terminal output.' :
           'The merge stopped because both branches changed the same line. Continue to the next page to inspect the file.') +
        '</span></div></div>' +
        '<div class="conflict-collision-layout">' +
          graph +
          '<div class="conflict-story-panel">' +
            '<div class="conflict-story-head"><span class="blocklabel">' + ic('timeline', 14) + ' Follow the steps</span><strong>Reveal the two edits one at a time.</strong></div>' +
            '<div class="conflict-story-base">' +
              /* The tree shows structure, this line shows the text. FileTree
                 draws no content, so the baseline code gets its own line. */
              window.FileTree.panel({
                title: copy.sharedVersion,
                nodes: repoNodes(null)
              }) +
              '<p class="conflict-base-line"><code>&lt;h1&gt;Git Basics&lt;/h1&gt;</code></p>' +
            '</div>' +
            '<div class="conflict-story-actions">' +
              /* A revealed button drops --primary and takes a tick: a disabled
                 primary kept its coral fill, so "already shown" and "click me"
                 looked the same. */
              '<button type="button" class="btn' + (state.reveal === 0 ? ' btn--primary' : '') + '" data-action="show-alice"' + (state.reveal !== 0 ? ' disabled' : '') + '>' + ic(state.reveal === 0 ? 'user' : 'check', 15) + '<span>' + (state.reveal === 0 ? 'Show Alice’s edit' : 'Alice’s edit shown') + '</span></button>' +
              '<button type="button" class="btn' + (state.reveal === 1 ? ' btn--primary' : '') + '" data-action="show-bob"' + (state.reveal !== 1 ? ' disabled' : '') + '>' + ic(state.reveal === 1 ? 'user' : 'check', 15) + '<span>' + (state.reveal === 1 ? 'Show Bob’s edit' : 'Bob’s edit shown') + '</span></button>' +
            '</div>' +
            /* No summary note here: let the reader conclude from the graph.
               The concrete "both edits replace line 2" already shows the proof. */
          '</div>' +
        '</div>' +
        '<div class="conflict-version-grid">' +
          miniEditor('Alice', copy.main, '<h1>Git Basics</h1>', '<h1>Git Course</h1>', 'main', state.reveal >= 1, 0) +
          miniEditor('Bob', copy.feature, '<h1>Git Basics</h1>', '<h1>Git Tutorial</h1>', 'feature', state.reveal >= 2, 90) +
        '</div>' +
        '<div class="conflict-overlap' + (state.reveal >= 2 ? ' is-visible' : '') + '">' +
          '<div class="conflict-overlap__line"></div>' +
          '<span>' + ic('target', 15) + ' both edits replace line 2</span>' +
        '</div>' +
        '<div class="conflict-merge-zone' + (canMerge ? ' is-ready' : '') + (state.mergeState === 'conflict' ? ' is-conflict' : '') + '">' +
          '<div class="conflict-merge-zone__copy">' +
            '<span class="blocklabel">' + ic('git-merge', 14) + ' Merge attempt</span>' +
            '<strong>' + (state.mergeState === 'conflict' ? 'The merge is paused — not cancelled.' : canMerge ? 'Both edits are visible. Now try the merge.' : 'Reveal both branch edits first.') + '</strong>' +
            '<p>' + (state.mergeState === 'conflict' ? 'Git merged everything it could. Only the overlapping heading needs your decision.' : 'Type the command in the terminal and click Run. The merge result will appear right here, so you do not need to scroll back to the graph.') + '</p>' +
            mergeNowPreview() +
          '</div>' +
          terminalCard(state.terminal, state.input, !canMerge || state.mergeState !== 'idle', canMerge ? copy.mergeCommand : 'Reveal both edits first', true) +
        '</div>' +
      '</div>';
    }

    function runCollision(command, form) {
      command = command.trim();
      if (command !== copy.mergeCommand) {
        state.terminal.push('$ ' + command);
        state.terminal.push('Command not needed here. Try: ' + copy.mergeCommand);
        state.terminalFresh = 2;
        state.input = '';
        /* The terminal's own log already names the command to try, so the shake
           and hint blink are the whole message. */
        GitTerm.reject(form);
        paint();
        return;
      }
      state.terminal.push('$ ' + command);
      state.terminal.push('Auto-merging index.html');
      state.terminalFresh = 2;
      state.input = '';
      state.mergeState = 'merging';
      paint();

      later(function () {
        state.terminal.push('CONFLICT (content): Merge conflict in index.html');
        state.terminalFresh = 1;
        paint();
      }, 520);
      later(function () {
        state.terminal.push('Automatic merge failed; fix conflicts and then commit the result.');
        state.terminalFresh = 1;
        state.mergeState = 'conflict';
        paint();
        finish('Git stopped at the overlapping heading. The history is safe; the final content now needs your judgement.');
      }, 1050);
    }

    function markerZone(key, lineNo, code, cls, label) {
      var seen = state.seen[key];
      var help = copy.markerHelp[key];
      var tipUp = true;
      return '<button type="button" class="conflict-marker-zone ' + (cls || '') + (state.focus === key ? ' is-focus' : '') + (seen ? ' is-seen' : '') + (tipUp ? ' is-tip-up' : '') + '" data-marker="' + key + '"' + (!state.opened ? ' disabled' : '') + ' title="' + esc(help.text) + '">' +
        '<span class="conflict-line-no">' + esc(lineNo) + '</span>' +
        '<code>' + esc(code) + '</code>' +
        '<span class="conflict-zone-tag">' + (seen ? ic('circle-check', 14) : ic('circle-help', 14)) + esc(label) + '</span>' +
        '<span class="conflict-marker-tooltip" role="tooltip"><strong>' + esc(help.title) + '</strong><span>' + esc(help.text) + '</span></span>' +
      '</button>';
    }

    function markersView() {
      var h = copy.markerHelp;
      var focus = state.focus ? h[state.focus] : null;
      var seenCount = Object.keys(state.seen).filter(function (k) { return state.seen[k]; }).length;
      var allSeen = seenCount === 5;

      return '<div class="conflict-markers-wrap">' +
        phaseStrip(['Open the conflicted file', 'Understand the markers', 'Check your reading'], state.check === 'current' ? 3 : (state.opened ? (allSeen ? 2 : 1) : 0)) +
        '<section class="conflict-ide' + (state.opened ? ' is-open' : '') + '">' +
          '<div class="conflict-ide__top">' +
            '<div>' + ic('file-text', 16) + '<strong>' + esc(copy.file) + '</strong></div>' +
            '<span class="conflict-tab-badge">' + ic('triangle-alert', 13) + ' 1 unresolved conflict</span>' +
          '</div>' +
          (state.opened ? '<div class="conflict-marker-mini-guide">' +
            '<div><strong>What do these strange lines mean?</strong><span>Hover over a highlighted line for a short explanation, or click it to keep the explanation visible below.</span></div>' +
            '<span class="conflict-marker-count">' + seenCount + '/5 explored</span>' +
          '</div>' : '') +
          '<div class="conflict-ide__body">' +
            '<aside class="conflict-ide__sidebar">' +
              window.FileTree.panel({
                title: copy.explorer,
                nodes: repoNodes('conflict'),
                note: copy.headNote
              }) +
            '</aside>' +
            '<div class="conflict-code-editor">' +
              (!state.opened ? '<div class="conflict-editor-empty">' + ic('mouse-pointer-click', 24) + '<strong>Open index.html</strong><span>The file contains Git’s temporary conflict markers.</span><button type="button" class="btn btn--primary" data-action="open-file">' + ic('file-text', 15) + '<span>Open conflicted file</span></button></div>' :
                '<div class="conflict-code-row"><span>1</span><code>&lt;main&gt;</code></div>' +
                markerZone('head', '2', '<<<<<<< HEAD', 'is-marker', 'what is this?') +
                markerZone('current', '3', '<h1>Git Course</h1>', 'is-current', 'Alice / main') +
                markerZone('split', '4', '=======', 'is-marker', 'what is this?') +
                markerZone('incoming', '5', '<h1>Git Tutorial</h1>', 'is-incoming', 'Bob / feature') +
                markerZone('end', '6', '>>>>>>> feature/tutorial', 'is-marker', 'what is this?') +
                '<div class="conflict-code-row"><span>7</span><code>&lt;/main&gt;</code></div>') +
            '</div>' +
          '</div>' +
          '<div class="conflict-ide__status"><span>' + ic('git-branch', 12) + ' main · HEAD</span><span>' + ic('triangle-alert', 12) + ' Merge conflict</span></div>' +
        '</section>' +
        (state.opened ? '<div class="conflict-marker-summary">' +
          '<div class="conflict-marker-summary__map">' +
            '<strong>Why is the top version from main?</strong>' +
            '<span>You ran <code translate="no">git merge feature/tutorial</code> while checked out on <code translate="no">main</code>. So Git calls <code translate="no">main</code> the current branch (HEAD), and <code translate="no">feature/tutorial</code> the incoming branch.</span>' +
          '</div>' +
          (focus ? '<div class="conflict-marker-summary__focus">' + ic('circle-help', 16) + '<div><code>' + esc(focus.title) + '</code><span>' + esc(focus.text) + '</span></div></div>' :
            '<div class="conflict-marker-summary__focus is-muted">' + ic('mouse-pointer-click', 16) + '<div><strong>Try one marker</strong><span>Hover for a quick tip. Click a line if you want the explanation to stay here while you read.</span></div></div>') +
        '</div>' : '') +
        (allSeen ? '<section class="conflict-reading-check">' +
          '<div><span class="blocklabel">' + ic('target', 14) + ' Quick check</span><strong>You were on main when you ran the merge. Which heading came from main?</strong><p>The current branch is the code between &lt;&lt;&lt;&lt;&lt;&lt;&lt; HEAD and =======.</p></div>' +
          '<div class="conflict-reading-options">' +
            '<button type="button" class="btn conflict-choice' + (state.check === 'current' ? ' is-correct' : '') + '" data-reading="current">&lt;h1&gt;Git Course&lt;/h1&gt;</button>' +
            '<button type="button" class="btn conflict-choice' + (state.wrong ? ' is-wrong' : '') + '" data-reading="incoming">&lt;h1&gt;Git Tutorial&lt;/h1&gt;</button>' +
          '</div>' +
        '</section>' : '') +
        '<div class="conflict-marker-note">' + ic('lightbulb', 16) + '<div><strong>The marker lines are temporary.</strong><span>After you choose the final file content, remove &lt;&lt;&lt;&lt;&lt;&lt;&lt;, ======= and &gt;&gt;&gt;&gt;&gt;&gt;&gt;. They should never remain in the finished HTML file.</span></div></div>' +
      '</div>';
    }

    function isResolvedText(text) {
      return text.indexOf('<<<<<<<') === -1 && text.indexOf('=======') === -1 && text.indexOf('>>>>>>>') === -1 && /<h1>[^<]+<\/h1>/.test(text);
    }

    function hasAgreedText(text) {
      return isResolvedText(text) && /<h1>\s*Git Tutorial\s*<\/h1>/.test(text);
    }

    function resolveStatus() {
      if (state.committed) return { tone: 'done', icon: 'circle-check', title: 'Merge complete', detail: 'working tree clean' };
      if (state.committing) return { tone: 'working', icon: 'loader-circle', title: 'Creating merge commit', detail: 'recording final history' };
      if (state.staged) return { tone: 'staged', icon: 'file-plus', title: 'Ready to commit', detail: 'index.html staged' };
      if (state.moving) return { tone: 'working', icon: 'loader-circle', title: 'Staging resolution', detail: 'moving index.html' };
      if (state.exact) return { tone: 'resolved', icon: 'check', title: 'Final content chosen', detail: 'index.html still unstaged' };
      if (state.clean) return { tone: 'warn', icon: 'circle-help', title: 'Markers removed, but result differs', detail: 'team decision: Git Tutorial' };
      return { tone: 'conflict', icon: 'triangle-alert', title: 'Unmerged path', detail: 'both modified: index.html' };
    }

    function resolutionTimeline() {
      var active = state.committed ? 3 : state.staged || state.committing ? 2 : state.exact || state.moving ? 1 : 0;
      return phaseStrip(['Edit final content', 'Stage the resolution', 'Commit the merge'], active);
    }

    function resolveCommandCoach() {
      var title, body, pieces = '';
      if (!state.exact) {
        title = 'First choose the final file content';
        body = 'Git cannot mark the conflict as resolved until index.html contains one final version with no conflict markers.';
      } else if (state.moving) {
        title = 'Running git add index.html';
        body = 'Git is changing index.html from “unmerged” to “resolved and staged”. Your chosen file content stays the same.';
        pieces = '<div class="conflict-command-change"><span>unmerged</span>' + gconn('flush') + '<strong>resolved + staged</strong></div>';
      } else if (!state.staged) {
        title = 'Why type git add index.html?';
        body = 'Here git add does not mean “create a file”. It tells Git: “I finished resolving this file; use this version in the merge.”';
        pieces = '<div class="conflict-command-parts"><span><code>git add</code><small>mark a resolved file as ready</small></span><span><code>index.html</code><small>the file you just fixed</small></span></div>';
      } else if (state.committing) {
        title = 'Creating the merge commit';
        body = 'Git is recording the resolved file and connecting the two branch histories.';
        pieces = '<div class="conflict-command-change"><span>staged resolution</span>' + gconn('flush') + '<strong>merge commit</strong></div>';
      } else if (!state.committed) {
        title = 'Why type git commit?';
        body = 'git commit records the resolved merge in history. For this beginner step, the short command is enough. You can also use -m with your own message.';
        pieces = '<div class="conflict-command-parts"><span><code translate="no">git commit</code><small>record the resolved merge</small></span><span><code translate="no">optional: -m "your message"</code><small>write the commit message on the same line</small></span></div>';
      } else {
        title = 'What changed?';
        body = 'The conflict is resolved, the file is committed, and both histories now meet in one merge commit.';
        pieces = '<div class="conflict-command-change is-done"><span>conflict</span>' + gconn('flush') + '<strong>clean merged history</strong></div>';
      }
      return '<div class="conflict-command-coach">' +
        '<div class="conflict-command-coach__title">' + ic(state.committed ? 'circle-check' : 'lightbulb', 16) + '<strong>' + esc(title) + '</strong></div>' +
        '<p>' + esc(body) + '</p>' + pieces +
      '</div>';
    }

    function nextResolveCommand() {
      if (state.committed) return '';
      if (!state.exact) return copy.addCommand;
      if (!state.staged) return copy.addCommand;
      return copy.commitCommand;
    }

    function resolveCommandResult() {
      if (state.committed) {
        return '<div class="conflict-command-result is-done">' + ic('circle-check', 16) + '<div><strong>Merge recorded.</strong><span>Git created a merge commit. Both branch histories are now connected, and the working tree is clean.</span></div></div>';
      }
      if (state.committing) {
        return '<div class="conflict-command-result is-working">' + ic('loader-circle', 16) + '<div><strong>Creating the merge commit…</strong><span>Git is recording the resolved file together with both parent histories.</span></div></div>';
      }
      if (state.staged) {
        return '<div class="conflict-command-result is-done">' + ic('circle-check', 16) + '<div><strong>git add worked.</strong><span>index.html changed from <b>unmerged</b> to <b>resolved + staged</b>. The merge is not finished yet. Next, type <code translate="no">git commit</code>.</span></div></div>';
      }
      if (state.moving) {
        return '<div class="conflict-command-result is-working">' + ic('loader-circle', 16) + '<div><strong>Running git add index.html…</strong><span>Git is marking this resolved file as ready for the merge commit.</span></div></div>';
      }
      if (state.exact) {
        return '<div class="conflict-command-result">' + ic('terminal', 16) + '<div><strong>Next command: <code translate="no">git add index.html</code></strong><span>This tells Git: “I finished resolving this file.”</span></div></div>';
      }
      return '<div class="conflict-command-result">' + ic('mouse-pointer-click', 16) + '<div><strong>Choose the final file content first.</strong><span>After the markers are removed, the first Git command will be <code translate="no">git add index.html</code>.</span></div></div>';
    }

    function resolveCommandNote() {
      var command = nextResolveCommand();
      if (!command) return '';
      return '<details open class="lesson-hint lesson-command-note conflict-dynamic-command"><summary>' + esc(copy.command) + '</summary><pre class="lesson-code">' + esc(command) + '</pre></details>';
    }

    function resolveView() {
      var status = resolveStatus();
      var workItem = (!state.staged && !state.committed) ? copy.file : '';
      var stageItem = (state.staged && !state.committed) ? copy.file : '';
      var graphVisible = state.committing || state.committed;
      return '<div class="conflict-resolve-wrap">' +
        resolutionTimeline() +
        '<div class="conflict-agreement">' + ic('users', 18) + '<div><span class="blocklabel">Team decision</span><strong>Final heading: &lt;h1&gt;Git Tutorial&lt;/h1&gt;</strong><p>Git cannot make this product decision. Alice and Bob have agreed on the result; now you make the file match it.</p></div></div>' +
        '<div class="conflict-resolve-layout">' +
          '<section class="conflict-card conflict-resolve-editor">' +
            '<div class="conflict-card__head"><div>' + ic('file-text', 17) + '<strong>' + esc(copy.file) + '</strong></div><span class="conflict-editor-status conflict-editor-status--' + status.tone + '">' + ic(status.icon, 13) + esc(status.title) + '</span></div>' +
            '<div class="conflict-resolution-tools">' +
              '<div class="conflict-resolution-tools__intro"><strong>Choose the final heading</strong><span>This is like manually editing index.html. It is not a Git command. The team has already agreed to use Bob’s wording.</span></div>' +
              '<button type="button" class="btn conflict-resolve-choice" data-resolve="current"' + (state.staged || state.committed || state.moving ? ' disabled' : '') + '><span class="conflict-choice-badge">Option 1</span><strong>Keep Alice’s heading</strong><small>&lt;h1&gt;Git Course&lt;/h1&gt;</small></button>' +
              '<button type="button" class="btn conflict-resolve-choice is-recommended" data-resolve="incoming"' + (state.staged || state.committed || state.moving ? ' disabled' : '') + '><span class="conflict-choice-badge">Recommended</span><strong>Use Bob’s heading</strong><small>&lt;h1&gt;Git Tutorial&lt;/h1&gt; — matches the team decision</small></button>' +
              '<button type="button" class="btn conflict-resolve-choice" data-resolve="both"' + (state.staged || state.committed || state.moving ? ' disabled' : '') + '><span class="conflict-choice-badge">Option 3</span><strong>Write a different final heading</strong><small>Start from both ideas, then edit the text yourself.</small></button>' +
            '</div>' +
            '<div class="conflict-editor-shell">' +
              '<div class="conflict-editor-gutter">1<br>2<br>3<br>4<br>5<br>6<br>7</div>' +
              '<textarea class="conflict-textarea" data-resolution-editor spellcheck="false" aria-label="Resolve index.html"' + (state.staged || state.committed || state.moving ? ' disabled' : '') + '>' + esc(state.text) + '</textarea>' +
            '</div>' +
            '<div class="conflict-editor-foot">' +
              '<span>' + ic('lightbulb', 13) + (state.exact ? ' The file now matches the team decision. Next, stage it.' : state.clean ? ' The markers are gone, but the heading does not match the agreed final result yet.' : ' Delete the markers and leave only the final content your team wants.') + '</span>' +
              (state.exact && !state.staged ? '<strong>' + ic('circle-check', 13) + ' Ready to stage</strong>' : '') +
            '</div>' +
          '</section>' +
          '<div class="conflict-resolve-side">' +
            '<section class="conflict-card conflict-state-card">' +
              '<div class="conflict-card__head"><div>' + ic('workflow', 17) + '<strong>Git state</strong></div><span class="conflict-state-summary conflict-state-summary--' + status.tone + '">' + esc(status.detail) + '</span></div>' +
              /* Working/staging are a before/after pair (FileTree.pair); the old
                 flying-file animation was dropped since git add changes state,
                 not location. `state.moving` still gates input and status text. */
              '<div class="conflict-state-flow">' +
                window.FileTree.pair(
                  { title: copy.working, nodes: workItem ? stateNodes('conflict') : [], empty: copy.noFile },
                  { title: copy.staging, nodes: stageItem ? stateNodes('staged') : [], empty: copy.noFile }
                ) +
              '</div>' +
              '<div class="conflict-state-explain">' +
                '<span>' + ic('file-text', 14) + '<b>Edit</b> changes the file.</span>' +
                '<span>' + ic('file-plus', 14) + '<b>git add</b> means “I finished resolving this file.”</span>' +
                '<span>' + ic('git-commit-horizontal', 14) + '<b>git commit</b> records the merge.</span>' +
              '</div>' +
            '</section>' +
            resolveCommandCoach() +
            terminalCard(state.terminal, state.input, state.committed || state.moving || state.committing, nextResolveCommand(), false) +
            resolveCommandResult() +
            resolveCommandNote() +
          '</div>' +
        '</div>' +
        (graphVisible ? '<div class="conflict-final-history' + (state.committed ? ' is-complete' : ' is-building') + '">' +
          commonGraph({ reveal: 2, merging: state.committing, merged: state.committed, title: 'History after resolution' }) +
          '<div class="conflict-final-caption">' + (state.committed ? ic('circle-check', 18) + '<div><strong>Conflict resolved. History continues.</strong><span>The merge commit records the final file together with both parent histories.</span></div>' : ic('loader-circle', 18) + '<div><strong>Creating the merge commit…</strong><span>The two histories are about to converge.</span></div>') + '</div>' +
        '</div>' : '') +
      '</div>';
    }

    function runResolve(command) {
      command = command.trim();
      if (!command) return;
      state.terminal.push('$ ' + command);
      state.terminalFresh = 1;

      if (command === 'git status') {
        if (state.committed) {
          state.terminal.push('On branch main');
          state.terminal.push('nothing to commit, working tree clean');
          state.terminalFresh = 3;
        } else if (state.staged) {
          state.terminal.push('All conflicts fixed but you are still merging.');
          state.terminal.push('Changes to be committed: modified: index.html');
          state.terminalFresh = 3;
        } else {
          state.terminal.push('You have unmerged paths.');
          state.terminal.push('  both modified: index.html');
          state.terminalFresh = 3;
        }
        state.input = '';
        paint();
        return;
      }

      if (command === copy.addCommand) {
        if (!state.exact) {
          state.terminal.push('error: resolve index.html to the agreed final content first');
          state.terminalFresh = 2;
          state.input = '';
          feedbackMessage('The team agreed on “Git Tutorial”. Make the file match that decision before staging it.', 'warn');
          paint();
          return;
        }
        if (state.staged || state.moving) {
          state.terminal.push('index.html is already staged');
          state.terminalFresh = 2;
          state.input = '';
          paint();
          return;
        }
        state.moving = true;
        state.input = '';
        paint();
        later(function () {
          state.moving = false;
          state.staged = true;
          state.terminal.push('All conflicts fixed but you are still merging.');
          state.terminal.push('Changes to be committed: modified: index.html');
          state.terminalFresh = 2;
          feedbackMessage('Here, git add does not mean “add a new file”. It tells Git that index.html is resolved and ready to commit.', 'success');
          paint();
          /* After the first command, keep the editor and Git-state panel in
             view so the learner sees index.html move from unmerged to staged. */
          focusAfterPaint('.conflict-resolve-layout', 'start');
        }, 760);
        return;
      }

      var commitMatch = command.match(/^git\s+commit(?:\s+-m\s+(?:"[^"]*"|'[^']*'|.+))?\s*$/);
      if (commitMatch) {
        if (!state.staged) {
          state.terminal.push('error: resolve and stage index.html before committing');
          state.terminalFresh = 2;
          state.input = '';
          feedbackMessage('The merge cannot finish until the resolved file is staged.', 'warn');
          paint();
          return;
        }
        if (!state.committed && !state.committing) {
          state.committing = true;
          state.input = '';
          state.terminal.push('Creating merge commit…');
          state.terminalFresh = 1;
          paint();
          later(function () {
            state.committing = false;
            state.committed = true;
            state.terminal[state.terminal.length - 1] = '[main 9f2c7d1] Merge conflict resolved';
            state.terminal.push('Merge completed successfully.');
            state.terminalFresh = 2;
            finish('You completed the full conflict workflow: decide the final content → stage the resolved file → commit the merge.');
            /* After the second command, show the history result immediately so
               the learner sees the two branch lines converge into the merge. */
            focusAfterPaint('.conflict-final-history', 'start');
          }, 900);
        }
        return;
      }

      state.terminal.push('Command not needed in this step. Use git add index.html, git status, or git commit.');
      state.terminalFresh = 2;
      state.input = '';
      paint();
    }

    function miniMergeCase(id, title, text, left, right, status) {
      var isAuto = id === 'auto';
      var running = status === 'running';
      var complete = status === 'complete';
      var paused = status === 'paused';
      return '<section class="conflict-compare-case conflict-compare-case--' + id + (complete ? ' is-complete' : '') + (paused ? ' is-paused' : '') + '">' +
        '<div class="conflict-compare-case__head"><div><span class="blocklabel">' + (isAuto ? 'Non-overlapping edits' : 'Overlapping edits') + '</span><strong>' + esc(title) + '</strong></div>' +
          '<span class="conflict-case-status">' + (running ? ic('loader-circle', 14) + ' merging…' : complete ? ic('circle-check', 14) + ' auto-merged' : paused ? ic('triangle-alert', 14) + ' needs a decision' : ic('git-merge', 14) + ' ready') + '</span></div>' +
        '<p>' + esc(text) + '</p>' +
        '<div class="conflict-compare-editors">' +
          '<code>' + esc(left) + '</code>' + gconn('flush', { cls: 'conflict-compare-editors__arrow' }) + '<code>' + esc(right) + '</code>' +
        '</div>' +
        /* The same frame / node / edge vocabulary as the other history pictures.
           The result is one node carrying an icon, not a fourth kind of circle. */
        '<div class="gframe conflict-mini-merge-visual' + (running ? ' is-running' : '') + (complete ? ' is-complete' : '') + (paused ? ' is-paused' : '') + '" style="--gw:360;--gh:110">' +
          '<svg class="gedges" viewBox="0 0 360 110" preserveAspectRatio="none" aria-hidden="true">' +
            '<path class="gedge gedge--main" d="M58 30 C150 30 220 54 292 55"></path>' +
            '<path class="gedge gedge--feature" d="M58 80 C150 80 220 56 292 55"></path>' +
          '</svg>' +
          '<span class="gnode gnode--main" style="left:16.111%;top:27.273%;--gnode:var(--g-node-sm)"></span>' +
          '<span class="gnode gnode--feature" style="left:16.111%;top:72.727%;--gnode:var(--g-node-sm)"></span>' +
          '<span class="gnode conflict-mini-merge-visual__result" style="left:86.111%;top:50%">' +
            (complete ? ic('check', 16) : paused ? ic('triangle-alert', 16) : ic('git-merge', 16)) +
          '</span>' +
        '</div>' +
        /* Both "Run this merge" buttons are equal experiments, not "next steps",
           so they stay plain buttons; the primary style is for Continue. */
        '<button type="button" class="btn" data-case-run="' + id + '"' + (running || complete || paused ? ' disabled' : '') + '>' + ic('play', 14) + '<span>Run this merge</span></button>' +
        ((complete || paused) ? '<div class="conflict-case-result">' + (complete ? ic('circle-check', 15) + '<span>Different lines can be combined without choosing between them.</span>' : ic('triangle-alert', 15) + '<span>Same place, different result: Git pauses instead of inventing your intention.</span>') + '</div>' : '') +
      '</section>';
    }

    function meaningView() {
      var both = state.auto === 'complete' && state.conflict === 'paused';
      return '<div class="conflict-meaning-wrap">' +
        phaseStrip(['Run an automatic merge', 'Run a conflicting merge', 'Explain the difference'], state.answer === 'decision' ? 3 : (both ? 2 : state.auto === 'complete' ? 1 : 0)) +
        '<section class="conflict-meaning-intro">' +
          '<div class="conflict-meaning-icon">' + ic('git-compare', 30) + '</div>' +
          '<div><span class="blocklabel">Compare the outcomes</span><h2>Different place or same place?</h2><p>Run the left example first, then the right. Watch what happens when the edits are separate versus when both people change the same line.</p></div>' +
        '</section>' +
        '<div class="conflict-compare-grid">' +
          miniMergeCase('auto', 'Title + footer', 'Alice changes the page title while Bob changes the footer.', '<title>Git Course</title>', '<footer>2026</footer>', state.auto) +
          miniMergeCase('conflict', 'Heading + heading', 'Alice and Bob both replace the same <h1> line with different text.', '<h1>Git Course</h1>', '<h1>Git Tutorial</h1>', state.conflict) +
        '</div>' +
        (both ? '<section class="conflict-concept-check">' +
          '<div><span class="blocklabel">' + ic('circle-help', 14) + ' What did the comparison show?</span><strong>What is Git telling you when it reports a merge conflict?</strong></div>' +
          '<div class="conflict-concept-options">' +
            '<button type="button" class="conflict-concept-option' + (state.wrong === 'broken' ? ' is-wrong' : '') + '" data-meaning="broken">' + ic('triangle-alert', 18) + '<span><b>The repository is broken</b><small>One branch must be deleted.</small></span></button>' +
            '<button type="button" class="conflict-concept-option' + (state.answer === 'decision' ? ' is-correct' : '') + '" data-meaning="decision">' + ic('users', 18) + '<span><b>A human decision is needed</b><small>There is more than one plausible final result.</small></span></button>' +
            '<button type="button" class="conflict-concept-option' + (state.wrong === 'lost' ? ' is-wrong' : '') + '" data-meaning="lost">' + ic('history', 18) + '<span><b>Git lost the earlier commits</b><small>The history needs to be rebuilt.</small></span></button>' +
          '</div>' +
        '</section>' : '') +
        '<div class="conflict-principle">' + ic('lightbulb', 18) + '<div><strong>Conflict ≠ failure.</strong><span>Git deliberately stops at the boundary between what it can infer from text and what requires your team’s intent.</span></div></div>' +
      '</div>';
    }

    function paint() {
      if (mode === 'collision') board.innerHTML = collisionView();
      else if (mode === 'markers') board.innerHTML = markersView();
      else if (mode === 'resolve') board.innerHTML = resolveView();
      else board.innerHTML = meaningView();
    }

    function runMeaning(id) {
      if (id === 'auto' && state.auto === 'idle') {
        state.auto = 'running';
        paint();
        later(function () {
          state.auto = 'complete';
          paint();
        }, 850);
      }
      if (id === 'conflict' && state.conflict === 'idle') {
        state.conflict = 'running';
        paint();
        later(function () {
          state.conflict = 'paused';
          paint();
        }, 850);
      }
    }

    board.addEventListener('input', function (event) {
      if (event.target.matches('[data-gitterm-input]')) {
        state.input = event.target.value;
        return;
      }
      if (event.target.matches('[data-resolution-editor]')) {
        state.text = event.target.value;
        var wasExact = state.exact;
        state.clean = isResolvedText(state.text);
        state.exact = hasAgreedText(state.text);
        if (state.exact && !wasExact) feedbackMessage('The file now contains one clean final version that matches the team decision. Next: stage it.', 'success');
        if (!state.exact && wasExact) feedback.hidden = true;

        var statusEl = board.querySelector('.conflict-editor-status');
        var summaryEl = board.querySelector('.conflict-state-summary');
        var foot = board.querySelector('.conflict-editor-foot');
        var status = resolveStatus();
        if (statusEl) {
          statusEl.className = 'conflict-editor-status conflict-editor-status--' + status.tone;
          statusEl.innerHTML = ic(status.icon, 13) + esc(status.title);
        }
        if (summaryEl) {
          summaryEl.className = 'conflict-state-summary conflict-state-summary--' + status.tone;
          summaryEl.textContent = status.detail;
        }
        if (foot) {
          foot.innerHTML = '<span>' + ic('lightbulb', 13) + (state.exact ? ' The file now matches the team decision. Next, stage it.' : state.clean ? ' The markers are gone, but the heading does not match the agreed final result yet.' : ' Delete the markers and leave only the final content your team wants.') + '</span>' + (state.exact ? '<strong>' + ic('circle-check', 13) + ' Ready to stage</strong>' : '');
        }
      }
    });

    T.bind(board, function (id, typed, form) {
      if (mode === 'collision') runCollision(typed, form);
      else if (mode === 'resolve') runResolve(typed);
    });

    board.addEventListener('click', function (event) {
      var action = event.target.closest('[data-action]');
      if (action) {
        var actionName = action.getAttribute('data-action');
        if (mode === 'collision') {
          if (actionName === 'show-alice' && state.reveal === 0) {
            state.reveal = 1;
            feedbackMessage('Alice’s commit C changed the heading on main. The feature branch still points to the shared starting commit B.', 'success');
            paint();
          } else if (actionName === 'show-bob' && state.reveal === 1) {
            state.reveal = 2;
            feedbackMessage('Bob’s commit D changed that same heading on feature/tutorial. Now the two branches contain competing versions of line 2.', 'success');
            paint();
          }
          return;
        }
        if (mode === 'markers' && actionName === 'open-file' && !state.opened) {
          state.opened = true;
          feedbackMessage('Git inserted markers directly into index.html. Read them from top to bottom.', 'success');
          paint();
          return;
        }
      }

      var marker = event.target.closest('[data-marker]');
      if (marker && mode === 'markers' && state.opened) {
        var key = marker.getAttribute('data-marker');
        state.seen[key] = true;
        state.focus = key;
        paint();
        return;
      }

      var reading = event.target.closest('[data-reading]');
      if (reading && mode === 'markers') {
        if (reading.getAttribute('data-reading') === 'current') {
          state.check = 'current';
          state.wrong = false;
          paint();
          finish('Correct. You ran the merge while checked out on main. That makes main the current branch (HEAD), so the top block is Alice’s main-branch version.');
        } else {
          state.wrong = true;
          feedbackMessage('Not quite. feature/tutorial is the incoming branch. HEAD refers to the branch currently checked out: main.', 'warn');
          paint();
        }
        return;
      }

      var resolveBtn = event.target.closest('[data-resolve]');
      if (resolveBtn && mode === 'resolve' && !state.staged && !state.committed && !state.moving) {
        var choice = resolveBtn.getAttribute('data-resolve');
        if (choice === 'current') state.text = '<main>\n<h1>Git Course</h1>\n</main>';
        else if (choice === 'incoming') state.text = '<main>\n<h1>Git Tutorial</h1>\n</main>';
        else state.text = '<main>\n<h1>Git Course / Git Tutorial</h1>\n</main>';
        state.clean = true;
        state.exact = choice === 'incoming';
        /* Choosing a version is an editing step, not a Git command, so skip the
           global green banner - it looked like git add had already run. The
           editor footer and command coach explain the next step instead. */
        feedback.hidden = true;
        paint();
        return;
      }

      var caseRun = event.target.closest('[data-case-run]');
      if (caseRun && mode === 'meaning') {
        runMeaning(caseRun.getAttribute('data-case-run'));
        return;
      }

      var meaning = event.target.closest('[data-meaning]');
      if (meaning && mode === 'meaning') {
        var answer = meaning.getAttribute('data-meaning');
        if (answer === 'decision') {
          state.answer = 'decision';
          state.wrong = false;
          paint();
          finish('Exactly. Git has preserved both histories and is asking a human to choose the intended final content.');
        } else {
          state.answer = '';
          state.wrong = answer;
          feedbackMessage('Look at the two mini-merges again. The history still exists; only the intended final content is ambiguous.', 'warn');
          paint();
        }
      }
    });

    /* Delegated like everything else: paint() replaces the whole tree, so a
       listener on the toggle would vanish on re-render. Bind on board, once. */
    window.FileTree.bind(board);

    paint();
    return {
      pause: function () { timers.forEach(clearTimeout); timers = []; }
    };
  };
})();

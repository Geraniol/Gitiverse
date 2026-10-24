(function () {
  'use strict';

  window.CHAPTER_BEATS = window.CHAPTER_BEATS || {};

  /* Keep Chapter 10's opening card visually and behaviourally consistent with
     Chapters 8 and 9: stable card, no typing/fade transition after Continue. */
  window.CHAPTER_BEATS.undoIntro = function (host, beat, api, helpers) {
    var esc = helpers.esc, ic = helpers.ic;
    api.brief('' +
      '<div class="undo-intro">' +
        '<div class="undo-intro__icon">' + ic(beat.icon || 'rotate-ccw', 30) + '</div>' +
        '<p class="undo-intro__text">' + esc(beat.text) + '</p>' +
      '</div>');
    host.innerHTML = '';
    api.ready();
    return {};
  };

  window.CHAPTER_BEATS.undoLab = function (host, beat, api, helpers) {
    var esc = helpers.esc, ic = helpers.ic;
    var T = window.GitTerm;   /* hand-typed terminal always uses the shared component (rules 4 / 14) */
    var copy = window.CHAPTER_CONTENT.undo;
    var mode = beat.mode;
    var timers = [];
    var readySent = false;
    var feedback = null;
    var board = null;

    var state = mode === 'working' ? {
      diffOpen: false,
      sourceAnswer: '',
      decision: '',
      warned: false,
      terminal: [
        '$ git status',
        'On branch main',
        'Changes not staged for commit:',
        '  modified:   index.html'
      ],
      input: '',
      phase: 'inspect',
      restored: false,
      verified: false,
      flash: '',
      moving: false,
      animationStep: 0
    } : {
      inspected: false,
      keepAnswer: '',
      terminal: [
        '$ git status',
        'On branch main',
        'Changes to be committed:',
        '  modified:   index.html'
      ],
      input: '',
      phase: 'inspect',
      unstaged: false,
      verified: false,
      choice: '',
      flash: '',
      moving: false,
      animationStep: 0
    };

    helpers.brief('' +
      '<div class="lesson-guide__intro">' +
        '<span class="blocklabel">' + ic('book-open', 15) + ' ' + esc(copy.task) + '</span>' +
        '<h2>' + esc(beat.title) + '</h2>' +
        '<p>' + esc(beat.text) + '</p>' +
      '</div>' +
      '<div class="lesson-guide__task">' + ic('mouse-pointer-click', 20) + '<strong>' + esc(beat.task) + '</strong></div>');

    host.innerHTML = '' +
      '<div class="undo-guide">' +
        '<div class="undo-board"></div>' +
        '<div class="lesson-feedback" role="status" aria-live="polite" hidden></div>' +
      '</div>';

    board = host.querySelector('.undo-board');
    feedback = host.querySelector('.lesson-feedback');

    function later(fn, ms) {
      var id = setTimeout(fn, ms);
      timers.push(id);
      return id;
    }

    function focusAfterPaint(selector, block) {
      later(function () {
        var target = board.querySelector(selector);
        if (!target || typeof target.scrollIntoView !== 'function') return;
        target.scrollIntoView({ behavior: 'smooth', block: block || 'center', inline: 'nearest' });
      }, 100);
    }

    function normaliseCommand(command) {
      return String(command || '').trim().replace(/\s+/g, ' ');
    }

    function feedbackMessage(text, tone) {
      feedback.className = 'lesson-feedback' + (tone ? ' lesson-feedback--' + tone : '');
      feedback.innerHTML = (tone === 'warn' ? ic('triangle-alert', 17) : ic('circle-check', 17)) + '<span>' + esc(text) + '</span>';
      feedback.hidden = false;
      if (typeof feedback.scrollIntoView === 'function') {
        feedback.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }

    function finish(text) {
      if (readySent) return;
      readySent = true;
      if (text) feedbackMessage(text, 'success');
      api.ready();
    }

    function phaseStrip(labels, active) {
      return '<div class="undo-phases" aria-label="Learning sequence">' + labels.map(function (label, i) {
        var cls = i < active ? ' is-done' : i === active ? ' is-current' : '';
        return '<div class="undo-phase' + cls + '"><span>' + (i < active ? ic('check', 13) : (i + 1)) + '</span><b>' + esc(label) + '</b></div>';
      }).join('') + '</div>';
    }

    function fileCode(text, changed) {
      return '<div class="undo-code-card' + (changed ? ' is-changed' : '') + '">' +
        '<div class="undo-code-head"><span>' + ic('file-text', 14) + ' index.html</span>' +
          (changed ? '<b>' + ic('file-text', 12) + ' modified</b>' : '<b>' + ic('check', 12) + ' saved snapshot</b>') + '</div>' +
        '<div class="undo-code-body"><span>1</span><code>&lt;main&gt;</code><span>2</span><code class="' + (changed ? 'is-edit' : '') + '">' + esc(text) + '</code><span>3</span><code>&lt;/main&gt;</code></div>' +
      '</div>';
    }

    function stateCard(kind, title, subtitle, code, status, active, extra) {
      var icons = { head: 'git-commit-horizontal', stage: 'layers', work: 'file-text' };
      var statusIcon = status === 'clean' ? 'circle-check' : status === 'staged' ? 'target' : 'file-text';
      return '<section class="undo-state-card undo-state-card--' + kind + (active ? ' is-active' : '') + (extra || '') + '">' +
        '<div class="undo-state-head"><span class="undo-state-icon">' + ic(icons[kind], 18) + '</span><div><strong>' + esc(title) + '</strong><small>' + esc(subtitle) + '</small></div><b class="undo-status undo-status--' + status + '">' + ic(statusIcon, 12) + esc(status) + '</b></div>' +
        '<code class="undo-state-code">' + esc(code) + '</code>' +
      '</section>';
    }

    function terminalCard(disabled, placeholder) {
      return T.form({
        id: 'undo',
        command: placeholder || 'git status',
        value: T.valueOf(board, 'undo'),
        log: state.terminal.map(function (line) {
          return {
            text: line,
            tone: /^\$ /.test(line) ? 'cmd'
              : /warning|lost|discard/i.test(line) ? 'bad'
                : /clean|not staged|modified:/i.test(line) ? 'good' : null
          };
        }),
        run: 'Run',
        disabled: disabled
      });
    }

    function diffBlock() {
      return '<div class="undo-diff' + (state.diffOpen ? ' is-open' : '') + '">' +
        '<div class="undo-diff__head"><div><span class="blocklabel">' + ic('git-compare', 14) + ' What changed?</span><strong>One line is different from the saved version.</strong></div>' +
        '<button type="button" class="btn" data-action="toggle-diff">' + ic(state.diffOpen ? 'eye-off' : 'eye', 14) + '<span>' + (state.diffOpen ? 'Hide diff' : 'Inspect diff') + '</span></button></div>' +
        (state.diffOpen ? '<div class="undo-diff__body"><div class="is-old"><b>−</b><code>&lt;h1&gt;Git Course&lt;/h1&gt;</code><span>saved</span></div><div class="is-new"><b>+</b><code>&lt;h1&gt;Git Course for Beginners&lt;/h1&gt;</code><span>working copy</span></div></div>' :
          '<div class="undo-diff__closed">' + ic('scan-search', 18) + '<span>Inspect before you discard: this is the only copy of the new line.</span></div>') +
      '</div>';
    }

    function commandExplain(kind) {
      if (kind === 'restore') {
        return '<section class="undo-command-explain">' +
          '<div><span class="blocklabel">Why this command?</span><strong><code>git restore index.html</code></strong></div>' +
          '<div class="undo-command-parts"><span><code>git restore</code><b>replace the working copy with the saved version</b></span><span><code>index.html</code><b>the file you want to restore</b></span></div>' +
          '<p><b>Important:</b> this changes the Working Directory. The local edit you are discarding may not be recoverable.</p>' +
        '</section>';
      }
      return '<section class="undo-command-explain undo-command-explain--safe">' +
        '<div><span class="blocklabel">Why add <code>--staged</code>?</span><strong><code>git restore --staged index.html</code></strong></div>' +
        '<div class="undo-command-parts"><span><code>git restore</code><b>change a Git state back</b></span><span><code>--staged</code><b>target the Staging Area, not the working file</b></span><span><code>index.html</code><b>the file you are unstaging</b></span></div>' +
        '<p>Your edit stays in the Working Directory. Only its selection for the next commit changes.</p>' +
      '</section>';
    }

    function animationStepClass(step, current) {
      if (step > current) return ' is-done';
      if (step === current) return ' is-current';
      return '';
    }

    function restoreAnimationPanel() {
      if (mode !== 'working' || (!state.moving && !state.restored)) return '';
      var step = Math.max(1, state.animationStep || (state.restored ? 3 : 1));
      var done = state.restored && !state.moving;
      var workBody = step >= 3
        ? '<code>&lt;h1&gt;Git Course&lt;/h1&gt;</code><b class="undo-flow-badge undo-flow-badge--good">clean</b>'
        : step === 2
          ? '<code class="undo-flow-old">&lt;h1&gt;Git Course for Beginners&lt;/h1&gt;</code><span class="undo-flow-replacing">being replaced…</span>'
          : '<code>&lt;h1&gt;Git Course for Beginners&lt;/h1&gt;</code><b class="undo-flow-badge undo-flow-badge--warn">modified</b>';

      return '<section class="undo-action-animation undo-action-animation--restore' + (done ? ' is-complete' : '') + '" aria-live="polite">' +
        '<div class="undo-action-animation__head"><div><span class="blocklabel">' + ic(done ? 'circle-check' : 'play', 14) + ' ' + (done ? 'Animation complete' : 'Watch the state change') + '</span><strong>What <code>git restore index.html</code> changes</strong><p>The saved snapshot is copied into the Working Directory. Commit history stays where it is.</p></div>' +
          (done ? '<button type="button" class="btn undo-replay" data-action="replay-restore">' + ic('rotate-ccw', 14) + '<span>Replay animation</span></button>' : '') + '</div>' +
        '<div class="undo-flow-reference"><span>' + ic('git-commit-horizontal', 17) + '</span><div><b>Latest commit C</b><code>&lt;h1&gt;Git Course&lt;/h1&gt;</code></div><em>unchanged</em></div>' +
        '<div class="undo-flow-map undo-flow-map--restore">' +
          '<div class="undo-flow-node undo-flow-node--source' + (step === 1 ? ' is-current' : step > 1 ? ' is-done' : '') + '"><span class="undo-flow-icon">' + ic('layers', 19) + '</span><div><small>Saved source</small><strong>Staging Area</strong><code>&lt;h1&gt;Git Course&lt;/h1&gt;</code><b class="undo-flow-badge undo-flow-badge--good">saved</b></div></div>' +
          '<div class="undo-flow-arrow' + (step >= 2 ? ' is-active' : '') + '"><span>' + ic('arrow-right', 24) + '</span><b>' + (step < 2 ? 'waiting' : step === 2 ? 'copy saved version' : 'copied') + '</b></div>' +
          '<div class="undo-flow-node undo-flow-node--target' + (step === 2 ? ' is-current' : step >= 3 ? ' is-done' : '') + '"><span class="undo-flow-icon">' + ic('file-text', 19) + '</span><div><small>Target</small><strong>Working Directory</strong>' + workBody + '</div></div>' +
        '</div>' +
        '<div class="undo-flow-steps">' +
          '<span class="' + (step === 1 ? 'is-current' : step > 1 ? 'is-done' : '') + '"><b>1</b>Read the saved snapshot</span>' +
          '<span class="' + (step === 2 ? 'is-current' : step > 2 ? 'is-done' : '') + '"><b>2</b>Replace the working copy</span>' +
          '<span class="' + (step === 3 ? 'is-current' : '') + '"><b>3</b>Working file becomes clean</span>' +
        '</div>' +
        (done ? '<div class="undo-flow-result">' + ic('circle-check', 17) + '<div><strong>Final state stays visible</strong><span>The Working Directory now matches the saved snapshot. The discarded text is gone; commit C did not move.</span></div></div>' : '') +
      '</section>';
    }

    function unstageAnimationPanel() {
      if (mode !== 'staged' || (!state.moving && !state.unstaged)) return '';
      var step = Math.max(1, state.animationStep || (state.unstaged ? 3 : 1));
      var done = state.unstaged && !state.moving;
      var stageBody = step >= 3
        ? '<code>&lt;h1&gt;Git Course&lt;/h1&gt;</code><b class="undo-flow-badge undo-flow-badge--good">not staged</b>'
        : step === 2
          ? '<code class="undo-flow-old">&lt;h1&gt;Git Course for Beginners&lt;/h1&gt;</code><span class="undo-flow-replacing">resetting to HEAD…</span>'
          : '<code>&lt;h1&gt;Git Course for Beginners&lt;/h1&gt;</code><b class="undo-flow-badge undo-flow-badge--info">staged</b>';

      return '<section class="undo-action-animation undo-action-animation--unstage' + (done ? ' is-complete' : '') + '" aria-live="polite">' +
        '<div class="undo-action-animation__head"><div><span class="blocklabel">' + ic(done ? 'circle-check' : 'play', 14) + ' ' + (done ? 'Animation complete' : 'Watch the state change') + '</span><strong>What <code>git restore --staged index.html</code> changes</strong><p>Git resets the Staging Area to HEAD, but leaves your Working Directory edit alone.</p></div>' +
          (done ? '<button type="button" class="btn undo-replay" data-action="replay-unstage">' + ic('rotate-ccw', 14) + '<span>Replay animation</span></button>' : '') + '</div>' +
        '<div class="undo-flow-map undo-flow-map--unstage">' +
          '<div class="undo-flow-node undo-flow-node--source' + (step === 1 ? ' is-current' : step > 1 ? ' is-done' : '') + '"><span class="undo-flow-icon">' + ic('git-commit-horizontal', 19) + '</span><div><small>Saved source</small><strong>HEAD / latest commit</strong><code>&lt;h1&gt;Git Course&lt;/h1&gt;</code><b class="undo-flow-badge undo-flow-badge--good">saved</b></div></div>' +
          '<div class="undo-flow-arrow' + (step >= 2 ? ' is-active' : '') + '"><span>' + ic('arrow-right', 24) + '</span><b>' + (step < 2 ? 'waiting' : step === 2 ? 'reset staging' : 'staging reset') + '</b></div>' +
          '<div class="undo-flow-node undo-flow-node--target' + (step === 2 ? ' is-current' : step >= 3 ? ' is-done' : '') + '"><span class="undo-flow-icon">' + ic('layers', 19) + '</span><div><small>Changed state</small><strong>Staging Area</strong>' + stageBody + '</div></div>' +
          '<div class="undo-flow-keep' + (step >= 3 ? ' is-confirmed' : '') + '"><span>' + ic('shield-check', 19) + '</span><div><small>Not touched</small><strong>Working Directory</strong><code>&lt;h1&gt;Git Course for Beginners&lt;/h1&gt;</code><b>edit kept</b></div></div>' +
        '</div>' +
        '<div class="undo-flow-steps">' +
          '<span class="' + (step === 1 ? 'is-current' : step > 1 ? 'is-done' : '') + '"><b>1</b>Target the Staging Area</span>' +
          '<span class="' + (step === 2 ? 'is-current' : step > 2 ? 'is-done' : '') + '"><b>2</b>Reset staging to HEAD</span>' +
          '<span class="' + (step === 3 ? 'is-current' : '') + '"><b>3</b>Confirm the working edit stays</span>' +
        '</div>' +
        (done ? '<div class="undo-flow-result">' + ic('circle-check', 17) + '<div><strong>Final state stays visible</strong><span>The file is no longer staged, but the edited heading is still in the Working Directory.</span></div></div>' : '') +
      '</section>';
    }

    function workingView() {
      var phase = state.verified ? 4 : state.restored ? 3 : state.decision === 'discard' && state.sourceAnswer === 'stage' ? 2 : state.diffOpen ? 1 : 0;
      var workText = state.restored ? '<h1>Git Course</h1>' : '<h1>Git Course for Beginners</h1>';
      var workStatus = state.restored ? 'clean' : 'modified';
      var verificationReady = state.restored && !state.verified && !state.moving;

      return '<div class="undo-working-wrap">' +
        phaseStrip(['Inspect the edit', 'Choose your intention', 'Run restore', 'Check the result'], phase) +
        '<section class="undo-scenario-banner">' +
          '<span class="undo-scenario-icon">' + ic('file-text', 23) + '</span>' +
          '<div><span class="blocklabel">Before committing</span><strong>Your saved history is unchanged. Only the working file is different.</strong><p>You changed the heading while experimenting. You now want to throw that local edit away and return index.html to the saved version.</p></div>' +
        '</section>' +
        '<div class="undo-three-state' + (state.moving ? ' is-restoring' : '') + '">' +
          stateCard('head', copy.head, 'Commit C · recorded history', '<h1>Git Course</h1>', 'clean', false, '') +
          '<div class="undo-state-arrow">' + ic('arrow-right', 17) + '<span>same snapshot</span></div>' +
          stateCard('stage', copy.staging, 'Nothing new staged', '<h1>Git Course</h1>', 'clean', state.sourceAnswer === 'stage' || (state.moving && state.animationStep === 1), state.moving && state.animationStep === 1 ? ' is-animation-source' : '') +
          '<div class="undo-state-arrow undo-state-arrow--restore' + (state.moving && state.animationStep >= 2 ? ' is-motion-active' : '') + '">' + ic('arrow-right', 17) + '<span>' + (state.restored ? 'restored' : state.moving ? 'restoring…' : 'restore source') + '</span></div>' +
          stateCard('work', copy.working, state.restored ? 'Matches staging area' : state.moving && state.animationStep >= 2 ? 'Being replaced with the saved version' : 'Your unsaved experiment', workText, workStatus, !state.restored || (state.moving && state.animationStep >= 2), state.restored ? ' is-restored' : state.moving && state.animationStep >= 2 ? ' is-animation-target' : '') +
          /* The old .undo-travel-file card (flying from staging to working) was
             removed. is-restoring stays: it drives the restore arrow's pulse, a
             state hint rather than "a file moving". */
        '</div>' +
        diffBlock() +
        (state.diffOpen ? '<section class="undo-source-check"><div><span class="blocklabel">' + ic('circle-help', 14) + ' Read the state</span><strong>Which saved copy will Git use to replace the Working Directory here?</strong><p>Nothing new has been staged, so the Staging Area still matches the latest commit.</p></div><div class="undo-source-options">' +
          '<button type="button" class="undo-option' + (state.sourceAnswer === 'stage' ? ' is-correct' : '') + '" data-source="stage">' + ic('layers', 18) + '<span><b>The Staging Area copy</b><small>It still contains the saved heading from the latest commit.</small></span></button>' +
          '<button type="button" class="undo-option' + (state.sourceAnswer === 'work' ? ' is-wrong' : '') + '" data-source="work">' + ic('file-text', 18) + '<span><b>The modified working copy</b><small>That would not undo anything.</small></span></button>' +
        '</div></section>' : '') +
        (state.sourceAnswer === 'stage' ? '<section class="undo-decision"><div><span class="blocklabel">' + ic('workflow', 14) + ' Choose your intention</span><strong>What do you want Git to do with the new heading?</strong><p>The two choices are intentionally different.</p></div><div class="undo-decision-grid">' +
          '<button type="button" class="undo-decision-card' + (state.decision === 'keep' ? ' is-selected' : '') + '" data-decision="keep">' + ic('files', 20) + '<span><b>Keep my edit</b><small>Do not restore it yet. I may want to commit it later.</small></span></button>' +
          '<button type="button" class="undo-decision-card undo-decision-card--danger' + (state.decision === 'discard' ? ' is-selected' : '') + '" data-decision="discard">' + ic('trash-2', 20) + '<span><b>Discard the local edit</b><small>Return the working file to the saved version.</small></span></button>' +
        '</div></section>' : '') +
        (state.decision === 'keep' ? '<div class="undo-keep-note">' + ic('lightbulb', 16) + '<span>Keeping the edit means you should not run restore yet. This exercise asks you to intentionally discard it, so choose the other path when you are ready.</span></div>' : '') +
        (state.decision === 'discard' && !state.restored ? '<div class="undo-warning">' + ic('triangle-alert', 20) + '<div><strong>Uncommitted edits may be permanently lost.</strong><span>Git can restore the saved copy, but it may not be able to recover the text you throw away. Inspect first, then restore only when that is your intention.</span></div></div>' : '') +
        (state.decision === 'discard' ? commandExplain('restore') + '<div class="undo-command-zone"><div class="undo-command-copy"><span class="blocklabel">' + ic('terminal', 14) + ' Command to type</span><strong>' + (state.restored ? 'Now verify the result.' : '<code>' + esc(copy.restore) + '</code>') + '</strong><p>' + (state.restored ? 'Type git status. You should see a clean working tree.' : 'After you run it, watch the Working Directory change back to the saved heading.') + '</p></div>' + terminalCard(state.moving, verificationReady ? copy.status : copy.restore) + '</div>' : '') +
        restoreAnimationPanel() +
        (state.restored ? '<div class="undo-after-note">' + ic('circle-help', 16) + '<div><strong>Why does this match the latest commit?</strong><span>Plain <code>git restore index.html</code> restores the working file from the staging area. Here, the staging area still matches commit C, so the working file ends up matching that saved version too.</span></div></div>' : '') +
        (state.verified ? '<div class="undo-status-result">' + ic('circle-check', 18) + '<div><strong>Working tree clean</strong><span>The unwanted edit existed only before the commit. You removed it without changing commit history.</span></div></div>' : '') +
      '</div>';
    }

    function stagedPipeline() {
      var stageCode = state.unstaged ? '<h1>Git Course</h1>' : '<h1>Git Course for Beginners</h1>';
      var stageStatus = state.unstaged ? 'clean' : 'staged';
      var workCode = '<h1>Git Course for Beginners</h1>';
      return '<div class="undo-stage-pipeline' + (state.moving ? ' is-unstaging' : '') + '">' +
        stateCard('head', copy.head, 'Commit C · recorded history', '<h1>Git Course</h1>', 'clean', false, '') +
        '<div class="undo-pipe-arrow">' + ic('arrow-right', 17) + '<span>baseline</span></div>' +
        stateCard('stage', copy.staging, state.unstaged ? 'Reset to HEAD snapshot' : state.moving && state.animationStep >= 2 ? 'Resetting to HEAD snapshot' : 'Selected for next commit', stageCode, stageStatus, !state.unstaged || state.moving, state.unstaged ? ' is-reset' : state.moving && state.animationStep >= 2 ? ' is-animation-target' : '') +
        '<div class="undo-pipe-arrow' + (state.moving && state.animationStep >= 2 ? ' is-motion-active' : '') + '">' + ic('arrow-right', 17) + '<span>' + (state.unstaged ? 'edit still exists' : state.moving && state.animationStep >= 3 ? 'working edit stays' : 'same edited content') + '</span></div>' +
        stateCard('work', copy.working, state.moving && state.animationStep >= 3 ? 'Your edit is kept here' : 'Your editable file', workCode, 'modified', state.unstaged || (state.moving && state.animationStep >= 3), ' is-preserved' + (state.moving && state.animationStep >= 3 ? ' is-animation-kept' : '')) +
        /* Same reason: .undo-unstage-chip (the flying "staged change" tag) was
           removed. is-unstaging stays - it drives the staging card's release pulse. */
      '</div>';
    }

    function stagedView() {
      var phase = state.verified ? 4 : state.unstaged ? 3 : state.keepAnswer === 'work' ? 2 : state.inspected ? 1 : 0;
      var canStatus = state.unstaged && !state.verified && !state.moving;

      return '<div class="undo-staged-wrap">' +
        phaseStrip(['Inspect the states', 'Choose what to keep', 'Unstage the file', 'Check the result'], phase) +
        '<section class="undo-scenario-banner undo-scenario-banner--blue">' +
          '<span class="undo-scenario-icon">' + ic('layers', 23) + '</span>' +
          '<div><span class="blocklabel">Staged too early</span><strong>Keep the edit. Remove only its staged status.</strong><p>You already ran <code>git add index.html</code>, but you do not want this file in the next commit yet. The edited file should stay exactly as it is.</p></div>' +
        '</section>' +
        stagedPipeline() +
        '<section class="undo-stage-inspector">' +
          '<div><span class="blocklabel">' + ic('scan-search', 14) + ' State inspector</span><strong>Before you undo anything, compare what each area contains.</strong><p>A staged change is not a second physical file. Think of the staging area as Git’s selected snapshot for the next commit.</p></div>' +
          '<button type="button" class="btn' + (!state.inspected ? ' btn--primary' : '') + '" data-action="inspect-stage">' + ic(state.inspected ? 'circle-check' : 'scan-search', 14) + '<span>' + (state.inspected ? 'States inspected' : 'Inspect all three states') + '</span></button>' +
        '</section>' +
        (state.inspected ? '<div class="undo-state-explainer"><div>' + ic('git-commit-horizontal', 18) + '<b>Latest commit</b><span>Still stores “Git Course”. No history has changed.</span></div><div>' + ic('layers', 18) + '<b>Staging Area</b><span>Currently selects the edited heading for the next commit.</span></div><div>' + ic('file-text', 18) + '<b>Working Directory</b><span>Still contains the edited heading you want to keep.</span></div></div>' : '') +
        (state.inspected ? '<section class="undo-keep-check"><div><span class="blocklabel">' + ic('circle-help', 14) + ' Preserve the right state</span><strong>After unstaging, which content must still be present?</strong><p>Your goal is to change the next-commit selection, not delete the edit.</p></div><div class="undo-source-options">' +
          '<button type="button" class="undo-option' + (state.keepAnswer === 'work' ? ' is-correct' : '') + '" data-keep="work">' + ic('file-text', 18) + '<span><b>The modified working file</b><small>&lt;h1&gt;Git Course for Beginners&lt;/h1&gt;</small></span></button>' +
          '<button type="button" class="undo-option' + (state.keepAnswer === 'clean' ? ' is-wrong' : '') + '" data-keep="clean">' + ic('trash-2', 18) + '<span><b>Only the old committed version</b><small>That would discard the edit you said you want.</small></span></button>' +
        '</div></section>' : '') +
        (state.keepAnswer === 'work' ? commandExplain('unstage') + '<div class="undo-command-zone"><div class="undo-command-copy"><span class="blocklabel">' + ic('terminal', 14) + ' Command to type</span><strong>' + (state.unstaged ? 'Now verify the result.' : '<code>' + esc(copy.unstage) + '</code>') + '</strong><p>' + (state.unstaged ? 'Type git status. The file should be modified but no longer staged.' : 'After you run it, watch the Staging Area return to the saved version while the Working Directory keeps your edit.') + '</p></div>' + terminalCard(state.moving, canStatus ? copy.status : copy.unstage) + '</div>' : '') +
        unstageAnimationPanel() +
        (state.unstaged ? '<section class="undo-preserved-proof">' +
          '<div class="undo-proof-title">' + ic('shield-check', 18) + '<div><strong>Your edit survived.</strong><span><code>--staged</code> changed the staging-area selection only.</span></div></div>' +
          '<div class="undo-proof-compare"><div><span>Staging Area</span><code>&lt;h1&gt;Git Course&lt;/h1&gt;</code><b>' + ic('rotate-ccw', 13) + ' reset to HEAD</b></div><div><span>Working Directory</span><code>&lt;h1&gt;Git Course for Beginners&lt;/h1&gt;</code><b>' + ic('file-text', 13) + ' edit preserved</b></div></div>' +
        '</section>' : '') +
        (state.verified ? '<section class="undo-command-compare">' +
          '<div class="undo-command-compare__head"><span class="blocklabel">' + ic('git-compare', 14) + ' Do not mix these up</span><strong>Two restore commands. Two different targets.</strong></div>' +
          '<div class="undo-command-table"><div class="is-head"><span>Command</span><span>Changes</span><span>Working edit</span></div><div><code>git restore index.html</code><span>Working Directory</span><b class="is-loss">May be discarded</b></div><div><code>git restore --staged index.html</code><span>Staging Area</span><b class="is-safe">Kept</b></div></div>' +
          '<div class="undo-rule">' + ic('lightbulb', 17) + '<span><b>Ask one question first: what do I want to keep?</b> If you want to throw the file edit away, change the Working Directory. If you want to keep the edit but remove it from the next commit, change the Staging Area.</span></div>' +
        '</section>' : '') +
        (state.verified ? '<section class="undo-choice-check"><div><span class="blocklabel">' + ic('workflow', 14) + ' One last decision</span><strong>You staged a useful edit too early. What is the safer command for that goal?</strong></div><div class="undo-choice-row"><button type="button" class="btn' + (state.choice === 'restore' ? ' is-wrong' : '') + '" data-final-choice="restore"><code>git restore index.html</code></button><button type="button" class="btn' + (state.choice === 'unstage' ? ' btn--primary is-correct' : '') + '" data-final-choice="unstage"><code>git restore --staged index.html</code></button></div></section>' : '') +
      '</div>';
    }

    function paint() {
      state.flash = '';
      board.innerHTML = mode === 'working' ? workingView() : stagedView();
      placeFeedback();
    }

    /** Park the feedback bar just under the step strip, so it sits at the top of
     *  the exercise instead of below a board that can be 1800px tall. */
    function placeFeedback() {
      var wrap = board.firstElementChild;
      if (!wrap) { board.appendChild(feedback); return; }
      var strip = wrap.querySelector('.undo-phases');
      if (strip && strip.parentNode === wrap) wrap.insertBefore(feedback, strip.nextSibling);
      else wrap.insertBefore(feedback, wrap.firstChild);
    }

    function appendTerminal(lines) {
      lines.forEach(function (l) { state.terminal.push(l); });
      state.flash = 'fresh';
    }

    function runWorking(command, form) {
      command = normaliseCommand(command);
      if (state.moving) return;

      if (!state.restored) {
        if (command !== copy.restore) {
          var workingWhy = command === copy.unstage
            ? 'That command only changes the Staging Area. It would keep the unwanted working edit.'
            : 'This step is about replacing the unwanted working-file edit with the saved version.';
          /* The reason and the command to try are already in the terminal's own
             log; the feedback bar is not the terminal's voice. */
          appendTerminal(['$ ' + command, workingWhy, 'Try: ' + copy.restore]);
          state.input = '';
          T.reject(form);
          paint();
          return;
        }
        appendTerminal(['$ ' + command]);
        state.input = '';
        state.moving = true;
        state.animationStep = 1;
        state.phase = 'restoring';
        paint();
        focusAfterPaint('.undo-action-animation', 'center');
        later(function () {
          state.animationStep = 2;
          paint();
        }, 1300);
        later(function () {
          state.animationStep = 3;
          paint();
        }, 2700);
        later(function () {
          state.moving = false;
          state.animationStep = 3;
          state.restored = true;
          appendTerminal(['# index.html restored from the staged snapshot']);
          feedbackMessage('The Working Directory now matches the saved version. The unwanted “for Beginners” edit is gone.', 'success');
          paint();
        }, 4100);
        return;
      }

      if (!state.verified) {
        if (command !== copy.status) {
          appendTerminal(['$ ' + command, 'Verify the result with: ' + copy.status]);
          state.input = '';
          feedbackMessage('Check the repository state before you move on.', 'warn');
          paint();
          return;
        }
        appendTerminal(['$ ' + command, 'On branch main', 'nothing to commit, working tree clean']);
        state.input = '';
        state.verified = true;
        paint();
        focusAfterPaint('.undo-status-result', 'center');
        finish('Verified. The unwanted edit is gone, and commit history did not change.');
      }
    }

    function runStaged(command, form) {
      command = normaliseCommand(command);
      if (state.moving) return;

      if (!state.unstaged) {
        if (command !== copy.unstage) {
          var stagedWhy = command === copy.restore
            ? 'Plain git restore targets the Working Directory here and may discard the edit you want to keep.'
            : 'Your goal is to change the Staging Area while keeping the Working Directory edit.';
          appendTerminal(['$ ' + command, stagedWhy, 'Try: ' + copy.unstage]);
          state.input = '';
          T.reject(form);
          paint();
          return;
        }
        appendTerminal(['$ ' + command]);
        state.input = '';
        state.moving = true;
        state.animationStep = 1;
        paint();
        focusAfterPaint('.undo-action-animation', 'center');
        later(function () {
          state.animationStep = 2;
          paint();
        }, 1300);
        later(function () {
          state.animationStep = 3;
          paint();
        }, 2700);
        later(function () {
          state.moving = false;
          state.animationStep = 3;
          state.unstaged = true;
          appendTerminal(['# staging selection updated; working file unchanged']);
          feedbackMessage('Unstaged. The edit still exists in index.html, but it is no longer selected for the next commit.', 'success');
          paint();
        }, 4100);
        return;
      }

      if (!state.verified) {
        if (command !== copy.status) {
          appendTerminal(['$ ' + command, 'Verify the new state with: ' + copy.status]);
          state.input = '';
          feedbackMessage('Use git status to prove the file is modified but no longer staged.', 'warn');
          paint();
          return;
        }
        appendTerminal(['$ ' + command, 'On branch main', 'Changes not staged for commit:', '  modified:   index.html']);
        state.input = '';
        state.verified = true;
        feedbackMessage('Exactly. The file is still modified in the Working Directory, but the Staging Area no longer contains that change.', 'success');
        paint();
        focusAfterPaint('.undo-command-compare', 'center');
      }
    }

    function replayRestoreAnimation() {
      if (mode !== 'working' || !state.restored || state.moving) return;
      state.moving = true;
      state.animationStep = 1;
      paint();
      focusAfterPaint('.undo-action-animation', 'center');
      later(function () { state.animationStep = 2; paint(); }, 1300);
      later(function () { state.animationStep = 3; paint(); }, 2700);
      later(function () { state.moving = false; state.animationStep = 3; paint(); }, 4100);
    }

    function replayUnstageAnimation() {
      if (mode !== 'staged' || !state.unstaged || state.moving) return;
      state.moving = true;
      state.animationStep = 1;
      paint();
      focusAfterPaint('.undo-action-animation', 'center');
      later(function () { state.animationStep = 2; paint(); }, 1300);
      later(function () { state.animationStep = 3; paint(); }, 2700);
      later(function () { state.moving = false; state.animationStep = 3; paint(); }, 4100);
    }

    board.addEventListener('input', function (event) {
      if (event.target.matches('[data-gitterm-input]')) state.input = event.target.value;
    });

    T.bind(board, function (id, typed, form) {
      if (mode === 'working') runWorking(typed, form);
      else runStaged(typed, form);
    });

    board.addEventListener('click', function (event) {
      var action = event.target.closest('[data-action]');
      if (action) {
        var a = action.getAttribute('data-action');
        if (a === 'replay-restore') {
          replayRestoreAnimation();
          return;
        }
        if (a === 'replay-unstage') {
          replayUnstageAnimation();
          return;
        }
        if (mode === 'working' && a === 'toggle-diff') {
          state.diffOpen = !state.diffOpen;
          if (state.diffOpen) feedbackMessage('Good. The diff shows exactly what will disappear if you restore the file.', 'success');
          paint();
          return;
        }
        if (mode === 'staged' && a === 'inspect-stage') {
          state.inspected = true;
          feedbackMessage('All three states are visible. Notice that history is unchanged even though the file is staged.', 'success');
          paint();
          return;
        }
      }

      var source = event.target.closest('[data-source]');
      if (source && mode === 'working') {
        var answer = source.getAttribute('data-source');
        state.sourceAnswer = answer;
        if (answer === 'stage') feedbackMessage('Correct. Plain git restore takes the working file from the staging-area copy by default.', 'success');
        else feedbackMessage('Not quite. The working copy is the destination here, not the source.', 'warn');
        paint();
        return;
      }

      var decision = event.target.closest('[data-decision]');
      if (decision && mode === 'working' && !state.restored) {
        state.decision = decision.getAttribute('data-decision');
        if (state.decision === 'discard') feedbackMessage('That intention matches git restore. Read the warning, then run the command yourself.', 'success');
        else feedbackMessage('Good instinct if the edit might still matter. In this exercise, the scenario says you have decided the edit is wrong.', 'warn');
        paint();
        return;
      }

      var keep = event.target.closest('[data-keep]');
      if (keep && mode === 'staged') {
        var k = keep.getAttribute('data-keep');
        state.keepAnswer = k;
        if (k === 'work') feedbackMessage('Correct. Unstaging should keep the modified working file intact.', 'success');
        else feedbackMessage('That would throw away useful work. Your goal is only to remove it from the next commit.', 'warn');
        paint();
        return;
      }

      var finalChoice = event.target.closest('[data-final-choice]');
      if (finalChoice && mode === 'staged' && state.verified) {
        var choice = finalChoice.getAttribute('data-final-choice');
        state.choice = choice;
        paint();
        if (choice === 'unstage') finish('Correct. You can now separate “discard this edit” from “do not include this edit in the next commit”.');
        else feedbackMessage('That command targets the working directory and can discard the edit. The --staged form matches this goal.', 'warn');
      }
    });

    paint();
    return {
      pause: function () { timers.forEach(clearTimeout); timers = []; }
    };
  };
})();

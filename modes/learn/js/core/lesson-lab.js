/* Small guided exercises, rendered inside the shared chapter beat host.
   Repository commands are handled by the existing playground model. */
(function () {
  'use strict';
  var ORIGINAL = '<h1>Hello</h1>';
  var UPDATED = '<h1>Hello Git</h1>';
  var FILES = {
    'index.html': ORIGINAL,
    'style.css': 'h1 { color: coral; }',
    'script.js': 'console.log("Hello");'
  };

  function createExercise(mode) {
    var state = VGE.model.blankRepo();
    state.autoChanges = false;
    state.init = mode !== 'init';
    if (state.init) {
      var initial = { id: 'starter', msg: 'Starter website', branch: 'main', parents: [],
        snapshot: Object.keys(FILES), content: Object.assign({}, FILES), changes: [] };
      state.commits = [initial];
      state.byId.starter = initial;
      state.branches.main = 'starter';
    } else {
      state.work = Object.keys(FILES).map(function (path) {
        return { p: path, s: 'A', content: FILES[path], staged: false };
      });
    }
    if (mode === 'files' || mode === 'stage' || mode === 'commit') {
      state.work = [{ p: 'index.html', s: 'M', content: UPDATED, staged: mode === 'commit' }];
    }
    var session = VGE.model.createSession(state);
    return {
      state: state,
      save: function (value) {
        if (mode !== 'edit') return false;
        state.work = value === ORIGINAL ? [] : [{ p: 'index.html', s: 'M', content: value, staged: false }];
        return value === UPDATED;
      },
      run: function (raw) {
        var command = raw.trim();
        var allowed = /^git\s+status\s*$/.test(command) ||
          (mode === 'init' && /^git\s+init\s*$/.test(command)) ||
          (mode === 'stage' && /^git\s+add\s+index\.html\s*$/.test(command)) ||
          (mode === 'commit' && /^git\s+commit\s+-m\s+(["'])Update title\1\s*$/.test(command));
        if (!allowed) return { ok: false, outside: true, out: [] };
        return session.run(command);
      },
      act: function () {
        if (mode === 'edit') return { ok: this.save(UPDATED) };
        var commands = { init: 'git init', stage: 'git add index.html', commit: 'git commit -m "Update title"' };
        return commands[mode] ? this.run(commands[mode]) : { ok: false };
      },
      content: function (path) {
        var change = state.work.find(function (item) { return item.p === path; });
        if (change) return change.content;
        var head = state.byId[state.branches.main];
        return head ? head.content[path] : FILES[path];
      }
    };
  }
  window.GitLesson = { createExercise: createExercise };

  window.CHAPTER_BEATS = window.CHAPTER_BEATS || {};
  window.CHAPTER_BEATS.lessonLab = function (host, beat, api, helpers) {
    var esc = helpers.esc, ic = helpers.ic, gconn = helpers.gconn;
    var copy = window.CHAPTER_CONTENT.lab;
    var mode = beat.mode;
    var exercise = createExercise(mode);
    var seen = {}, selected = false;
    var draft = false, actionDone = false;
    var setup = mode === 'commit' ? copy.commitSetup : copy.prepared;
    /* Three beats ask for a real git command, so they use the shared terminal
       instead of a button: the command itself is what this course trains. Each
       board drives one mode, so one command and one log survive re-renders. */
    var COMMAND = { init: 'git init', stage: 'git add index.html', commit: 'git commit -m "Update title"' }[mode] || '';
    var entry = '';
    var log = [];

    /* The intro, task and setup note go in the upper card; the workspace,
       feedback and hints stay down with the thing being worked on, since you
       read them while working, not before. */
    helpers.brief('' +
      '<div class="lesson-guide__intro"><span class="blocklabel">' + ic('book-open', 15) + ' ' + esc(copy.task) + '</span>' +
      '<h2>' + esc(beat.title) + '</h2><p>' + esc(beat.text) + '</p></div>' +
      '<div class="lesson-guide__task">' + ic('mouse-pointer-click', 20) + '<strong>' + esc(beat.task) + '</strong></div>' +
      (mode !== 'flow' && mode !== 'init' ? '<p class="lesson-guide__setup">' + esc(setup) + '</p>' : ''));

    host.innerHTML = '<div class="lesson-guide">' +
      '<div class="lesson-workspace"></div>' +
      '<div class="lesson-feedback" role="status" aria-live="polite" hidden></div>' +
      '<details open class="lesson-hint"><summary>' + esc(copy.hint) + '</summary><p>' + esc(beat.hint) + '</p></details>' +
      (beat.command && mode !== 'init' ? '<details open class="lesson-hint lesson-command-note"><summary>' + esc(copy.commandHint) + '</summary><code>' + esc(beat.command) + '</code></details>' : '') +
      '</div>';
    var workspace = host.querySelector('.lesson-workspace');
    var feedback = host.querySelector('.lesson-feedback');

    function notify(text, success) {
      feedback.hidden = false;
      feedback.classList.toggle('is-success', !!success);
      feedback.textContent = text;
    }
    function done(text) {
      notify(text, true);
      api.ready();
    }
    /* A step succeeded: lock it, show the result, and hand focus to the confirm
       control so the reader can continue without hunting for it. */
    function complete() {
      actionDone = true;
      paint();
      done({ init: copy.initDone, edit: copy.editDone, stage: copy.stageDone, commit: copy.commitDone }[mode]);
      var next = host.closest('.beat').querySelector('.beat__confirm .btn');
      if (next) next.focus({ preventScroll: true });
    }
    function code(value) { return '<pre class="lesson-code">' + esc(value) + '</pre>'; }
    /* Panel titles are h3, not h2: a beat covers one topic whose title is on
       the guide card (h2), and each workspace cell (Before / After, Working
       directory / Staging area) is a section of that same topic. Spec 8. */
    function panel(title, text, body, active) {
      return '<section class="lesson-panel' + (active ? ' is-selected' : '') + '"><h3>' + esc(title) + '</h3>' +
        (text ? '<p>' + esc(text) + '</p>' : '') + body + '</section>';
    }
    function button(label, attribute, disabled, primary) {
      return '<button class="btn' + (primary ? ' btn--primary' : '') + '" type="button" ' + attribute +
        (disabled ? ' disabled' : '') + '>' + ic(disabled && actionDone ? 'check' : 'arrow-right', 17) + esc(label) + '</button>';
    }
    /* The one input surface for a git command in this lab: the shared terminal.
       It carries the reader's own typing and the lines already run, so neither
       is lost when the board is re-rendered. `disabled` marks a finished step. */
    function terminal(disabled) {
      return GitTerm.form({ id: 'git', command: COMMAND, value: entry, log: log,
        label: copy.initCommandLabel, disabled: disabled });
    }
    /* WARNING: the top `* * * website / index.html` bar was removed - a fake
       browser chrome carrying no information, just making the cell look like a
       window (spec 18: a component's shape decides what the reader learns). */
    function website(title, label, changed) {
      return '<div class="lesson-browser' + (changed ? ' is-new' : '') + '">' +
        '<div class="lesson-browser__page"><span class="lesson-browser__caption">' + esc(label) + '</span>' +
        '<strong class="lesson-browser__heading">' + esc(title) + '</strong>' +
        '<span class="lesson-browser__line" aria-hidden="true"></span><span class="lesson-browser__line" aria-hidden="true"></span></div></div>';
    }
    function source(path) {
      return '<details open class="lesson-hint lesson-source"><summary>' + esc(copy.source) + '</summary>' + code(exercise.content(path)) + '</details>';
    }
    function fileCards() {
      return FileCards.render({
        items: Object.keys(FILES).map(function (path, index) {
          var change = exercise.state.work.find(function (w) { return w.p === path; });
          return {
            id: path,
            name: path,
            note: copy.fileDescriptions[index],
            status: change ? (change.staged ? 'staged' : change.s === 'A' ? 'added' : 'modified') : null,
            picked: !!seen[path]
          };
        }),
        pick: true
      });
    }
    /* Project structure uses a plain file tree, without the fake IDE-browser
       shell. Root is `.` (hard-coded): `website` holds the three files and `.git`
       hangs off the root, since `git init` runs in the reader's project root. */
    function treeNodes(ready) {
      var nodes = [{
        name: 'website', type: 'dir', path: 'website', open: true,
        children: Object.keys(FILES).map(function (path) { return { name: path, type: 'file' }; })
      }];
      if (ready) nodes.push({ name: '.git', type: 'dir', status: 'added' });
      return nodes;
    }
    function initWorkspace() {
      var ready = exercise.state.init;
      return '<section class="lesson-init" aria-label="' + esc(copy.workspaceTitle) + '">' +
        FileTree.pair(
          { title: copy.initBefore, note: copy.initStatusBefore, nodes: treeNodes(false) },
          { title: copy.initAfter, note: ready ? copy.initStatusAfter : copy.initPending, nodes: treeNodes(ready) }
        ) +
        '<p class="lesson-init__note' + (ready ? ' is-ready' : '') + '">' +
          ic(ready ? 'circle-check' : 'git-branch', 17) +
          (ready
            ? '<strong>' + esc(copy.initTakeaway) + '</strong> ' + esc(copy.initTakeawayText)
            : esc(copy.initPrompt)) +
        '</p>' +
        terminal(ready) +
      '</section>';
    }
    function paint() {
      /* Re-rendering rebuilds the terminal, which would snap the field back to
         its saved value, so read the live field first. Once the step is done the
         field is cleared on purpose, so there is nothing to carry. */
      if (!actionDone && workspace.querySelector('[data-gitterm="git"]')) entry = GitTerm.valueOf(workspace, 'git');
      if (mode === 'init') {
        workspace.innerHTML = initWorkspace();
      } else if (mode === 'edit') {
        workspace.innerHTML = '<div class="lesson-columns">' + panel(copy.before, '', website('Hello', copy.before, false)) +
          panel(copy.after, '', website(draft ? 'Hello Git' : 'Hello', actionDone ? copy.saved : draft ? copy.draft : copy.chooseTitle, draft)) + '</div>' +
          '<div class="lesson-actions">' + button(draft ? copy.titleSelected : copy.changeTitle, 'data-title', draft, false) +
          button(actionDone ? copy.saved : copy.save, 'data-action', !draft || actionDone, true) + '</div>';
      } else if (mode === 'files') {
        workspace.innerHTML = '<div class="lesson-columns">' + panel(copy.working, copy.selectFile, fileCards()) +
          panel(copy.preview, '', '<div class="lesson-preview">' + ic('files', 32) + '</div>') + '</div>';
      } else if (mode === 'stage') {
        workspace.innerHTML = '<div class="lesson-transfer">' + panel(copy.working, copy.workingNote,
          '<button class="lesson-change' + (selected ? ' is-picked' : '') + '" type="button" data-select aria-pressed="' + selected + '"' + (actionDone ? ' disabled' : '') + '>' +
          '<span class="lesson-change__head">' + ic(selected ? 'circle-check' : 'file-text', 20) + '<strong>index.html</strong><small>' + esc(actionDone ? copy.keptFile : selected ? copy.selectedChange : copy.selectChange) + '</small></span>' +
          '<span class="lesson-change__diff"><del>Hello</del>' + gconn('flush') + '<ins>Hello Git</ins></span></button>') +
          gconn('accent lg flush', { cls: 'lesson-transfer__arrow' }) +
          panel(copy.staging, copy.stagingNote, actionDone ? '<div class="lesson-staged is-arriving">' + ic('circle-check', 22) + '<strong>index.html</strong><span>Hello Git</span><small>' + esc(copy.savedCopy) + '</small></div>' :
          '<div class="lesson-empty">' + ic('boxes', 32) + '<span>' + esc(copy.noStage) + '</span></div>', actionDone) + '</div>' +
          terminal(actionDone) +
          (!selected ? '<div class="lesson-actions"><span>' + esc(copy.stageSelectHint) + '</span></div>' : '');
      } else if (mode === 'commit') {
        workspace.innerHTML = '<div class="lesson-columns">' + panel(copy.staging, copy.stagingNote,
          actionDone ? '<div class="lesson-empty">' + ic('check', 26) + '<span>' + esc(copy.noStage) + '</span></div>' : website('Hello Git', 'index.html', false)) +
          panel(copy.repository, copy.repositoryNote, '<div class="lesson-snapshot-list"><div class="lesson-snapshot">' + ic('git-commit-horizontal', 25) +
          '<div><strong>' + esc(copy.before) + '</strong><small>Hello</small></div></div>' +
          (actionDone ? '<div class="lesson-record is-arriving">' + ic('circle-check', 26) + '<div><span>' + esc(copy.newSnapshot) + '</span><strong>' + esc(copy.commitMessage) +
            '</strong><p>Hello Git</p><small>' + esc(copy.snapshotSaved) + '</small></div></div>' : '') + '</div>', actionDone) + '</div>' +
          '<div class="lesson-actions"><div class="lesson-note"><span>' + esc(copy.commitLabel) + '</span><strong>' + esc(copy.commitMessage) + '</strong></div></div>' +
          terminal(actionDone);
      } else if (mode === 'flow') {
        workspace.innerHTML = '<div class="lesson-flow">' + [copy.working, copy.staging, copy.repository].map(function (title, i) {
          return '<button class="cap lesson-flow__card" type="button" data-flow="' + i +
            '" aria-pressed="false" aria-label="' + esc(title + '. ' + copy.flipHint) + '">' +
            '<span class="cap__inner">' +
              '<span class="cap__face cap__face--front" aria-hidden="false">' +
                '<span class="lesson-flow__number">0' + (i + 1) + '</span>' +
                '<span class="cap__icon">' + ic(['files', 'boxes', 'git-commit-horizontal'][i], 29) + '</span>' +
                '<span class="cap__label">' + esc(title) + '</span>' +
                '<span class="cap__hint">' + ic('mouse-pointer-click', 13) + esc(copy.flipHint) + '</span>' +
              '</span>' +
              '<span class="cap__face cap__face--back" aria-hidden="true">' +
                '<span class="lesson-flow__backtitle">' + ic(['files', 'boxes', 'git-commit-horizontal'][i], 22) + esc(title) + '</span>' +
                '<span class="cap__caption">' + esc(copy.flowActions[i]) + '</span>' +
                '<span class="lesson-flow__description">' + esc(copy.flowDescriptions[i]) + '</span>' +
                '<span class="cap__backhint">' + esc(copy.flipBack) + '</span>' +
              '</span>' +
            '</span></button>';
        }).join('') + '</div>';
      }
    }
    paint();

    /* One delegate on the board, installed once. paint() replaces the board's
       markup on every step, so a listener installed per render would stack up
       and fire a single submit several times over. */
    GitTerm.bind(workspace, function (id, value, form) {
      if (id !== 'git' || !COMMAND) return;
      /* A rejected command is the terminal's own business: it shakes and its hint
         blinks. The feedback bar is left for things the terminal cannot show. */
      if (!GitTerm.matches(value, COMMAND)) { GitTerm.reject(form); return; }
      /* The command NAMES the file, so typing it is the selection - requiring a
         click on the card first was the same choice made twice. The card stays as
         an optional preview: clicking it still shows the picked state. */
      if (mode === 'stage') selected = true;
      if (!exercise.act().ok) { GitTerm.reject(form); return; }
      log.push({ text: '$ ' + COMMAND, tone: 'cmd' });
      entry = '';
      complete();
    });

    /* Collapse is delegated too, for the same reason: paint() replaces the whole
       tree, so a listener on the toggle button would be gone after the next render. */
    FileTree.bind(workspace);

    workspace.addEventListener('click', function (event) {
      /* WARNING: a "click a tab to switch file" handler (`data-editor-file`) used
         to live here; that tab row was removed with the fake IDE. */
      if (event.target.closest('[data-title]') && !draft) {
        draft = true;
        paint();
        workspace.querySelector('[data-action]').focus();
      }
      if (event.target.closest('[data-select]') && !actionDone) {
        selected = !selected;
        paint();
        workspace.querySelector('[data-select]').focus();
      }
      if (event.target.closest('[data-action]') && !actionDone) {
        /* Only "save this edit" is still a button: writing a file is not a git
           command, so there is no command for the reader to type. */
        if (mode !== 'edit' || !draft) return;
        if (!exercise.act().ok) { notify(copy.commandError, false); return; }
        complete();
      }
      var file = event.target.closest('[data-fcard]');
      if (file) {
        var path = file.getAttribute('data-fcard');
        seen[path] = true;
        var index = Object.keys(FILES).indexOf(path);
        workspace.querySelector('.lesson-preview').innerHTML = '<p class="lesson-file-description">' + esc(copy.fileDescriptions[index]) + '</p>' +
          (index === 0 ? website('Hello Git', path, false) : index === 1 ? '<div class="lesson-style-preview">Hello Git</div><p>' + esc(copy.stylePreview) + '</p>' :
            '<div class="lesson-script-preview">' + ic('zap', 30) + '<p>' + esc(copy.scriptPreview) + '</p></div>') + source(path);
        file.classList.add('is-picked');
        file.setAttribute('aria-pressed', 'true');
        if (Object.keys(seen).length === 3) done(copy.filesDone);
      }
      var flow = event.target.closest('[data-flow]');
      if (flow) {
        var n = Number(flow.getAttribute('data-flow'));
        var flipped = flow.classList.toggle('is-flipped');
        if (flipped) seen[n] = true;
        flow.setAttribute('aria-pressed', String(flipped));
        flow.querySelector('.cap__face--front').setAttribute('aria-hidden', String(flipped));
        flow.querySelector('.cap__face--back').setAttribute('aria-hidden', String(!flipped));
        var title = [copy.working, copy.staging, copy.repository][n];
        flow.setAttribute('aria-label', title + '. ' + (flipped ? copy.flowDescriptions[n] + ' ' + copy.flipBack : copy.flipHint));
        if (Object.keys(seen).length === 3) done(copy.flowDone);
      }
    });
    return {};
  };
})();

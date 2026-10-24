(function () {
  'use strict';
  window.CHAPTER_BEATS = window.CHAPTER_BEATS || {};

  /* Pick the icon by what the file is, not by whether it can be clicked - the
     reader recognizes dependency dir / build output / secret / editor settings
     first, then decides to ignore it. The name is just a label. */
  var IGNORE_ICON = {
    'node_modules/': 'boxes',
    'dist/': 'layers',
    '.env': 'key-round',
    '.DS_Store': 'file-text',
    '.vscode/': 'settings'
  };

  window.CHAPTER_BEATS.topicLab = function (host, beat, api, helpers) {
    var esc = helpers.esc, ic = helpers.ic, gconn = helpers.gconn;
    var T = window.GitTerm;   /* typed terminals use the shared component (rules 4 / 14) */
    var copy = window.CHAPTER_CONTENT.topic;
    var mode = beat.mode;
    var done = false;
    var state = initial(mode);

    helpers.brief('' +
      '<div class="lesson-guide__intro"><span class="blocklabel">' + ic('book-open', 15) + ' ' + esc(copy.task) + '</span>' +
      '<h2>' + esc(beat.title) + '</h2><p>' + esc(beat.text) + '</p></div>' +
      '<div class="lesson-guide__task">' + ic('mouse-pointer-click', 20) + '<strong>' + esc(beat.task) + '</strong></div>');

    host.innerHTML = '<div class="topic-guide">' +
      '<div class="topic-board"></div>' +
      '<div class="lesson-feedback" role="status" aria-live="polite" hidden></div>' +
      (beat.command ? '<details open class="lesson-hint lesson-command-note"><summary>' + esc(copy.command) + '</summary><pre class="lesson-code">' + esc(beat.command) + '</pre></details>' : '') +
      '</div>';

    var board = host.querySelector('.topic-board');
    var feedback = host.querySelector('.lesson-feedback');

    function initial(name) {
      var base = { input: '', terminal: ['$ git status'], step: 0, picked: {}, text: '' };
      if (name === 'junk') base.terminal = ['$ git status', 'Untracked files:', '  node_modules/', '  .vscode/', '  .env', '  .DS_Store', '  dist/', '  src/index.html', '', '13,482 files detected'];
      if (name === 'ignore') base.text = 'node_modules/\ndist/\n';
      if (name === 'pitfall') base.terminal = ['$ git status', 'Untracked files:', '  .env'];
      if (name === 'empty') base.terminal = ['$ git status', 'nothing to commit, working tree clean'];
      if (name === 'gitkeep') base.terminal = ['$ git status', 'nothing to commit, working tree clean'];
      if (name === 'remote-map') base.step = 1;
      if (name === 'clone') base.terminal = ['$ pwd', '/Users/bob'];
      if (name === 'remote') base.terminal = ['$ git status', 'On branch main'];
      if (name === 'push') base.terminal = ['$ git log --oneline', 'C add footer', 'B landing page', 'A initial commit'];
      if (name === 'fetch') base.terminal = ['$ git status', 'On branch main', 'Working tree has Bob edits'];
      if (name === 'pull') base.terminal = ['$ git fetch', 'remote: new commit C downloaded'];
      if (name === 'rejected') base.terminal = ['$ git log --oneline', 'B landing page', 'A initial commit'];
      return base;
    }
    function notify(text) {
      feedback.hidden = false;
      feedback.classList.add('is-success');
      feedback.textContent = text;
    }
    function finish(text) {
      done = true;
      paint();
      notify(text);
      api.ready();
    }
    /* Which command this beat expects - the hint states it (the reader never guesses). */
    function expected() {
      if (mode === 'junk') return 'git status';
      if (mode === 'pitfall') return state.step === 0 ? 'git add .env'
        : state.step === 1 ? 'git commit -m "Add env"' : 'git status';
      if (mode === 'empty') return state.step === 0 ? 'mkdir uploads' : 'git status';
      if (mode === 'gitkeep') return state.step === 0 ? 'touch uploads/.gitkeep' : 'git add uploads/.gitkeep';
      if (mode === 'clone') return 'git clone https://example.com/team/site.git';
      if (mode === 'remote') return 'git remote -v';
      if (mode === 'push' || mode === 'rejected') return 'git push';
      if (mode === 'fetch') return 'git fetch';
      if (mode === 'pull') return 'git pull';
      return 'git status';
    }
    function terminal() {
      return T.form({
        id: 'topic',
        command: expected(),
        value: state.input,
        log: state.terminal.map(function (line) {
          return { text: line, tone: /^\$ /.test(line) ? 'cmd' : null };
        }),
        run: copy.run,
        disabled: done
      });
    }
    function paint() {
      if (mode === 'junk') paintJunk();
      else if (mode === 'classify') paintClassify();
      else if (mode === 'ignore') paintIgnore();
      else if (mode === 'remote-map') paintRemoteMap();
      else if (isRemote(mode)) paintRemote();
      else paintCommand();
      var input = board.querySelector('[data-gitterm-input]');
      if (input && !done) input.focus({ preventScroll: true });
    }
    function paintJunk() {
      board.innerHTML = '<div class="topic-layout">' +
        '<section class="topic-panel topic-count"><span>13,482</span><strong>files detected</strong><p>Git status sees source code, generated folders, local settings and secrets together. The next step is deciding what belongs in history.</p>' +
        '<div class="topic-file-strip">' +
          fileChip('index.html', 'source', 'good') + fileChip('package.json', 'metadata', 'good') +
          fileChip('node_modules/', 'generated', 'warn') + fileChip('.env', 'secret', 'danger') +
          fileChip('dist/', 'build output', 'warn') + fileChip('.DS_Store', 'local junk', 'warn') +
        '</div></section>' +
        terminal() + '</div>';
    }
    function paintClassify() {
      var items = [
        ['index.html', 'Source code', 'commit'], ['package.json', 'Configuration file', 'commit'],
        ['node_modules/', 'Installed dependency artifacts', 'ignore'], ['.env', 'Secrets / credentials', 'ignore'],
        ['.DS_Store', 'OS-generated junk files', 'ignore'], ['dist/', 'Build output artifacts', 'ignore']
      ];
      board.innerHTML = '<div class="topic-sort">' + items.map(function (it) {
        var picked = state.picked[it[0]];
        return '<div class="topic-sort-row' + (picked === it[2] ? ' is-right' : picked ? ' is-wrong' : '') + '">' +
          '<div>' + ic(it[2] === 'commit' ? 'check' : 'x', 17) + '<strong>' + esc(it[0]) + '</strong><small>' + esc(it[1]) + '</small></div>' +
          '<button type="button" class="btn" data-pick="' + esc(it[0]) + '" data-value="commit">' + esc(copy.commit) + '</button>' +
          '<button type="button" class="btn" data-pick="' + esc(it[0]) + '" data-value="ignore">' + esc(copy.ignore) + '</button>' +
        '</div>';
      }).join('') + '</div>';
    }
    function paintIgnore() {
      var rules = state.text.split(/\n/).map(function (x) { return x.trim(); }).filter(Boolean);
      var need = ['node_modules/', 'dist/', '.env', '.DS_Store', '.vscode/'];
      var items = need.map(function (f) {
        var ignored = rules.indexOf(f) !== -1;
        return {
          id: f, name: f, icon: IGNORE_ICON[f], note: copy.ignoreNotes[f],
          status: ignored ? 'ignored' : null, picked: ignored
        };
      });
      board.innerHTML = '<div class="topic-layout"><section class="topic-panel"><h3>' + ic('file-minus', 17) + '.gitignore</h3>' +
        '<textarea data-ignore-editor spellcheck="false">' + esc(state.text) + '</textarea></section>' +
        '<section class="topic-panel"><h3>' + ic('list-filter', 17) + esc(copy.ignoreLabel) + '</h3>' +
        window.FileCards.render({ pick: true, items: items }) +
        '<p>' + esc(copy.keepNote) + '</p></section></div>';
      if (!done && need.every(function (r) { return rules.indexOf(r) !== -1; })) finish(copy.ignoreDone);
    }
    function addIgnoreRule(file) {
      var rules = state.text.split(/\n/).map(function (x) { return x.trim(); }).filter(Boolean);
      if (rules.indexOf(file) === -1) rules.push(file);
      state.text = rules.join('\n') + '\n';
      paint();
    }
    function paintCommand() {
      board.innerHTML = '<div class="topic-layout">' + visualFor(mode) + terminal() + '</div>';
    }
    function paintRemoteMap() {
      board.innerHTML = '<div class="topic-layout">' + remoteVisual('map') +
        '<section class="topic-panel"><h3>' + ic('lightbulb', 17) + 'Remote model</h3><p>A remote repository is a shared Git repository. Alice and Bob both sync history with it.</p></section></div>';
      api.ready();
    }
    function paintRemote() {
      board.innerHTML = '<div class="topic-layout">' + remoteVisual(mode) + terminal() + '</div>';
    }
    function visualFor(name) {
      /* All three are "one file's current state", with nothing to pick - so they
         are pick:false cards and the note line carries the teaching. */
      if (name === 'pitfall') return '<section class="topic-panel"><h3>' + ic('triangle-alert', 17) + '.env remains tracked</h3>' +
        stateFlow([
          ['Before add', state.step === 0 ? 'active' : 'done', '.env is untracked and could still be ignored.'],
          ['After commit', state.step >= 2 ? 'active' : 'waiting', '.env is already in history, so .gitignore cannot hide it retroactively.']
        ]) +
        window.FileCards.render({ items: [{ id: '.env', name: '.env', icon: 'key-round', note: state.step >= 2 ? copy.pitfallTrackedNote : copy.pitfallNote, status: state.step >= 2 ? 'tracked' : null }] }) +
        '<p>.gitignore mainly affects untracked files.</p></section>';
      if (name === 'empty') return '<section class="topic-panel"><h3>' + ic('folder', 17) + 'uploads/</h3>' +
        repoCompare('Working folder', state.step >= 1 ? [['uploads/', 'folder exists']] : [['(no uploads folder)', 'not created yet']],
          'Git status', state.step >= 1 ? [['nothing to commit', 'empty folder has no tracked file']] : [['nothing to commit', 'before mkdir']],
          state.step >= 1) +
        '<p>Git has no file to store yet, so the folder can exist on disk without appearing in history.</p></section>';
      return '<section class="topic-panel"><h3>' + ic('file-plus', 17) + 'uploads/.gitkeep</h3>' +
        repoCompare('Working folder', state.step >= 1 ? [['uploads/.gitkeep', 'placeholder file']] : [['uploads/', 'empty folder']],
          'Git staging area', state.step >= 2 ? [['uploads/.gitkeep', 'new file staged']] : [['nothing staged', 'not part of next commit yet']],
          state.step >= 2) +
        window.FileCards.render({ items: [{ id: 'uploads/.gitkeep', name: 'uploads/.gitkeep', icon: 'file-text', note: state.step >= 2 ? copy.tracked : copy.visible }] }) +
        '<p>A placeholder file lets the folder path survive.</p></section>';
    }
    function remoteVisual(name) {
      var after = state.step > 0;
      var bob = 'A -> B';
      var remote = 'A -> B';
      var alice = 'A -> B';
      var bobNote = 'local working copy';
      var remoteNote = name === 'remote' && after ? 'origin -> https://example.com/team/site.git' : 'shared history';
      var aliceNote = 'local working copy';
      var caption = copy.remoteMapHint;
      if (name === 'clone') {
        bob = after ? 'A -> B' : '(no repo yet)';
        bobNote = after ? 'clone copied remote history' : 'Bob has not cloned yet';
        caption = after ? copy.cloneAfter : copy.cloneBefore;
      } else if (name === 'push') {
        alice = 'A -> B -> C';
        aliceNote = 'new local commit C';
        remote = after ? 'A -> B -> C' : 'A -> B';
        remoteNote = after ? 'C is now shared' : 'missing Alice commit C';
        caption = after ? copy.pushAfter : copy.pushBefore;
      } else if (name === 'fetch') {
        remote = 'A -> B -> C';
        bob = after ? 'main: A -> B · origin/main: A -> B -> C' : 'main: A -> B';
        bobNote = after ? 'downloaded history; files unchanged' : 'Bob has local edits';
        caption = after ? copy.fetchAfter : copy.fetchBefore;
      } else if (name === 'pull') {
        remote = 'A -> B -> C';
        bob = after ? 'A -> B -> C' : 'main: A -> B · origin/main: A -> B -> C';
        bobNote = after ? 'local branch integrated C' : 'remote commit is known but not integrated';
        caption = after ? copy.pullAfter : copy.pullBefore;
      } else if (name === 'rejected') {
        remote = 'A -> B -> C';
        alice = 'A -> B';
        remoteNote = 'remote is ahead';
        aliceNote = after ? 'push rejected; still missing C' : 'does not have C yet';
        caption = after ? copy.rejectedAfter : copy.rejectedBefore;
      }
      return '<section class="topic-panel topic-remote"><h3>' + ic('network', 17) + 'Team history</h3>' +
        '<p class="topic-remote-caption">' + esc(caption) + '</p>' +
        person(copy.alice, alice, 'laptop', aliceNote, name === 'push' || name === 'rejected') + gconn('both lg accent col flush', { cls: 'topic-link' }) +
        person(copy.remote, remote, 'cloud', remoteNote, name === 'remote' || name === 'push' || name === 'fetch' || name === 'pull' || name === 'rejected') + '<div class="topic-link">' + ic('arrow-down-up', 22) + '</div>' +
        person(copy.bob, bob, 'monitor', bobNote, name === 'clone' || name === 'fetch' || name === 'pull') + '</section>';
    }
    function person(title, graph, icon, note, active) {
      return '<div class="topic-person' + (active ? ' is-active' : '') + '">' + ic(icon, 18) + '<strong>' + esc(title) + '</strong><span>' + esc(graph) + '</span><small>' + esc(note || '') + '</small></div>';
    }
    function fileChip(name, label, tone) {
      return '<span class="topic-file-chip topic-file-chip--' + esc(tone) + '"><b>' + esc(name) + '</b><small>' + esc(label) + '</small></span>';
    }
    function stateFlow(rows) {
      return '<div class="topic-state-flow">' + rows.map(function (row) {
        return '<div class="topic-state-flow__item is-' + esc(row[1]) + '"><strong>' + esc(row[0]) + '</strong><span>' + esc(row[2]) + '</span></div>';
      }).join('') + '</div>';
    }
    function repoCompare(leftTitle, leftItems, rightTitle, rightItems, changed) {
      function col(title, items) {
        return '<section><h4>' + esc(title) + '</h4>' + items.map(function (item) {
          return '<div class="topic-repo-row"><strong>' + esc(item[0]) + '</strong><span>' + esc(item[1]) + '</span></div>';
        }).join('') + '</section>';
      }
      return '<div class="topic-repo-compare' + (changed ? ' is-changed' : '') + '">' + col(leftTitle, leftItems) + col(rightTitle, rightItems) + '</div>';
    }
    function isRemote(name) {
      return ['clone', 'remote', 'push', 'fetch', 'pull', 'rejected'].indexOf(name) !== -1;
    }
    function run(raw) {
      var command = String(raw || '').trim().replace(/\s+/g, ' ');
      if (!command || done) return;
      state.input = '';
      state.terminal.push('$ ' + command);
      if (mode === 'junk') {
        if (command === 'git status') finish('Git can see source files, but also generated files, local settings and secrets.');
        else bad();
      } else if (mode === 'pitfall') {
        pitfall(command);
      } else if (mode === 'empty') {
        empty(command);
      } else if (mode === 'gitkeep') {
        gitkeep(command);
      } else if (isRemote(mode)) {
        remoteRun(command);
      } else bad();
    }
    function bad() { state.terminal.push(copy.unknown); paint(); }
    function pitfall(command) {
      if (state.step === 0 && command === 'git add .env') { state.step = 1; state.terminal.push('staged .env'); paint(); }
      else if (state.step === 1 && command === 'git commit -m "Add env"') { state.step = 2; state.terminal.push('[main C] Add env'); paint(); }
      else if (state.step >= 2 && command === 'git status') { state.terminal.push('Tracked files:', '  .env'); finish(copy.pitfallDone); }
      else bad();
    }
    function empty(command) {
      if (state.step === 0 && command === 'mkdir uploads') { state.step = 1; state.terminal.push('created uploads/'); paint(); }
      else if (state.step === 1 && command === 'git status') { state.terminal.push('nothing to commit, working tree clean'); finish(copy.emptyDone); }
      else bad();
    }
    function gitkeep(command) {
      if (state.step === 0 && command === 'touch uploads/.gitkeep') { state.step = 1; state.terminal.push('created uploads/.gitkeep'); paint(); }
      else if (state.step === 1 && command === 'git add uploads/.gitkeep') { state.step = 2; state.terminal.push('Changes to be committed:', '  new file: uploads/.gitkeep'); finish(copy.gitkeepDone); }
      else bad();
    }
    function remoteRun(command) {
      if (mode === 'clone' && command.indexOf('git clone ') === 0) { state.step = 1; state.terminal.push('Cloning into site...', 'Receiving objects: done.'); finish(copy.cloneDone); }
      else if (mode === 'remote' && command === 'git remote -v') { state.step = 1; state.terminal.push('origin  https://example.com/team/site.git (fetch)', 'origin  https://example.com/team/site.git (push)'); finish(copy.remoteDone); }
      else if (mode === 'push' && command === 'git push') { state.step = 1; state.terminal.push('To https://example.com/team/site.git', '   B..C  main -> main'); finish(copy.pushDone); }
      else if (mode === 'fetch' && command === 'git fetch') { state.step = 1; state.terminal.push('From https://example.com/team/site', '   B..C  main -> origin/main', 'Working files unchanged.'); finish(copy.fetchDone); }
      else if (mode === 'pull' && command === 'git pull') { state.step = 1; state.terminal.push('Updating B..C', 'Fast-forward'); finish(copy.pullDone); }
      else if (mode === 'rejected' && command === 'git push') { state.step = 1; state.terminal.push('! [rejected] main -> main (fetch first)', 'error: failed to push some refs'); finish(copy.rejectedDone); }
      else bad();
    }

    /* Card picks use FileCards' own delegation: bound once, survives re-renders (board itself is not replaced). */
    window.FileCards.bind(board, function (id) {
      if (mode === 'ignore') addIgnoreRule(id);
    });
    board.addEventListener('click', function (event) {
      var pick = event.target.closest('[data-pick]');
      if (!pick) return;
      state.picked[pick.getAttribute('data-pick')] = pick.getAttribute('data-value');
      var right = { 'index.html': 'commit', 'package.json': 'commit', 'node_modules/': 'ignore', '.env': 'ignore', '.DS_Store': 'ignore', 'dist/': 'ignore' };
      if (Object.keys(right).every(function (k) { return state.picked[k] === right[k]; })) finish(copy.classifyDone);
      else paint();
    });
    board.addEventListener('input', function (event) {
      if (event.target.matches('[data-gitterm-input]')) state.input = event.target.value;
      if (event.target.matches('[data-ignore-editor]')) { state.text = event.target.value; paint(); }
    });
    T.bind(board, function (id, typed) { run(typed); });
    paint();
    return {};
  };
})();

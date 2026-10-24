(function () {
  'use strict';

  window.CHAPTER_BEATS = window.CHAPTER_BEATS || {};

  window.CHAPTER_BEATS.branchLab = function (host, beat, api, helpers) {
    var esc = helpers.esc, ic = helpers.ic, gnode = helpers.gnode, glegend = helpers.glegend;
    var T = window.GitTerm;
    var copy = window.CHAPTER_CONTENT.branch;
    var mode = beat.mode;
    var state = initial(mode);
    var done = false;

    helpers.brief('' +
      '<div class="lesson-guide__intro"><span class="blocklabel">' + ic('book-open', 15) + ' ' + esc(copy.task) + '</span>' +
      '<h2>' + esc(beat.title) + '</h2><p>' + esc(beat.text) + '</p></div>');

    host.innerHTML = '<div class="branch-guide">' +
      '<div class="branch-board"></div>' +
      '<div class="lesson-feedback" role="status" aria-live="polite" hidden></div>' +
      '<details open class="lesson-hint lesson-command-note"><summary>' + esc(copy.command) + '</summary><pre class="lesson-code">' + esc(beat.command) + '</pre></details>' +
      '</div>';

    var board = host.querySelector('.branch-board');
    var feedback = host.querySelector('.lesson-feedback');

    function initial(name) {
      if (name === 'need') return { current: copy.main, graph: 'main-start', terminal: ['$ git status', 'On branch main'], input: '', step: 0, visited: {} };
      if (name === 'command') return { current: copy.main, graph: 'main-start', terminal: ['$ git branch', '* main'], input: '', step: 0, visited: {} };
      if (name === 'parallel') return { current: copy.main, graph: 'parallel', terminal: ['$ git log --oneline --graph', '* C production homepage', '| * E login validation', '| * D login form', '|/', '* B starter site'], input: '', visited: {} };
      if (name === 'hotfix') return { current: copy.feature, graph: 'before-hotfix', terminal: ['$ git status', 'On branch feature/login'], input: '', step: 0, visited: {} };
      return { current: copy.feature, graph: 'before-merge', terminal: ['$ git status', 'On branch feature/login'], input: '', step: 0, visited: {} };
    }

    function graph() {
      var g = state.graph;
      if (mode === 'command') return commandCompare(g);
      return '<div class="branch-map branch-map--' + esc(g) + '">' +
        '<p class="branch-map__note">' + esc(copy.branchViewHint) + '</p>' +
        branchDiagram(g) +
        branchSummary(g) +
      '</div>';
    }
    function repoFiles(kind) {
      if (kind === 'login') return [
        ['login-form.html', 'M', '<form>Login</form>', true],
        ['auth.js', 'A', 'function signIn() { ... }', true],
        ['style.css', '-', '.button { color: red; }', false]
      ];
      return [
        ['index.html', '-', '<main>Storefront</main>', false],
        ['style.css', '-', '.button { color: red; }', false]
      ];
    }
    function repoPanel(title, branch, status, files, tone) {
      return '<section class="branch-repo branch-repo--' + esc(tone || 'main') + '">' +
        '<div class="branch-repo__head"><span>' + esc(title) + '</span><strong>' + esc(branch) + '</strong><small>' + esc(status) + '</small></div>' +
        '<ul class="branch-repo__files">' + files.map(function (file) {
          return '<li' + (file[3] ? ' class="is-new"' : '') + '><b>' + esc(file[1]) + '</b><span>' + esc(file[0]) + '</span><code>' + esc(file[2]) + '</code></li>';
        }).join('') + '</ul>' +
      '</section>';
    }
    function commandCompare(g) {
      var afterTitle = g === 'main-start' ? copy.afterCommandWaiting : g === 'feature-name' ? copy.afterBranchCreated : copy.afterSwitch;
      var afterBranch = g === 'main-start' ? copy.feature : copy.feature;
      var afterStatus = g === 'main-start' ? copy.notCreatedYet : g === 'feature-name' ? copy.branchCreatedSameFiles : copy.branchFeature;
      var afterFiles = g === 'feature-active' ? repoFiles('login') : g === 'feature-name' ? repoFiles('main') : [];
      return '<div class="branch-compare branch-compare--' + esc(g) + '">' +
        '<p class="branch-map__note">' + esc(copy.compareViewHint) + '</p>' +
        '<div class="branch-compare__grid">' +
          repoPanel(copy.beforeCommand, copy.main, copy.branchStable, repoFiles('main'), 'main') +
          (afterFiles.length
            ? repoPanel(afterTitle, afterBranch, afterStatus, afterFiles, 'feature')
            : '<section class="branch-repo branch-repo--empty"><div><strong>' + esc(afterTitle) + '</strong><p>' + esc(afterStatus) + '</p></div></section>') +
        '</div>' +
      '</div>';
    }
    function branchDiagram(g) {
      var showFeature = g !== 'main-start';
      var showHotfix = g === 'hotfix' || g === 'hotfix-created';
      var merged = g === 'merged';
      var featureEnd = merged ? 'M530 150 C640 150 660 70 740 70' : 'M530 150 L740 150';
      var hotfixPath = showHotfix ? '<path class="gedge gedge--lane gedge--hotfix" d="M400 70 C460 70 455 205 530 205 L740 205"></path>' : '';
      function gdot(x, y, label, tone, note, head) {
        return gnode({ role: tone, label: label, note: note, head: head,
          x: (x / 800 * 100).toFixed(3) + '%', y: (y / 260 * 100).toFixed(3) + '%' });
      }
      return '<div class="branch-map">' +
        '<div class="gframe branch-diagram" style="--gw:800;--gh:260" aria-label="' + esc(copy.visibleBranches) + '">' +
        '<svg class="gedges" viewBox="0 0 800 260" preserveAspectRatio="none" aria-hidden="true" focusable="false">' +
          '<path class="gedge gedge--lane gedge--main" d="M230 70 L740 70"></path>' +
          (showFeature ? '<path class="gedge gedge--lane gedge--feature" d="M400 70 C460 70 455 150 530 150 ' + featureEnd + '"></path>' : '') +
          hotfixPath +
        '</svg>' +
        /* No caption under these dots: the two on main are 49px apart in a
           half-width panel, and two captions need about 90px. The lane labels on
           the left already name the branches, so the picture loses nothing. */
        gdot(300, 70, 'A', 'root') +
        gdot(400, 70, 'B', 'main') +
        (merged ? gdot(740, 70, 'M', 'merge') : '') +
        branchLane(copy.main, 'main', g, state.current === copy.main, 'top:14%;height:26%;') +
        (showFeature ? branchLane(copy.feature, 'feature', g, state.current === copy.feature, 'top:45%;height:26%;') : '') +
        (showHotfix ? branchLane(copy.hotfix, 'hotfix', g, state.current === copy.hotfix, 'top:66%;height:26%;') : '') +
        '</div>' + glegend() +
      '</div>';
    }
    function branchFiles(name) {
      if (name === copy.feature) {
        if (state.graph === 'feature-name') return [
          ['index.html', '-', '<main>Storefront</main>'],
          ['style.css', '-', '.button { color: red; }']
        ];
        return [
          ['login-form.html', 'M', '<form>Login</form>'],
          ['auth.js', 'A', 'function signIn() { ... }'],
          ['style.css', '-', '.button { color: red; }']
        ];
      }
      if (name === copy.hotfix) {
        if (state.graph === 'hotfix-created') return [
          ['index.html', '-', '<main>Storefront</main>'],
          ['style.css', '-', '.button { color: red; }']
        ];
        return [
        ['checkout.js', 'M', 'fixPaymentBug();'],
        ['index.html', '-', '<main>Storefront</main>']
        ];
      }
      if (state.graph === 'merged') return [
        ['index.html', '-', '<main>Storefront</main>'],
        ['style.css', '-', '.button { color: red; }'],
        ['login-form.html', 'M', '<form>Login</form>'],
        ['auth.js', 'A', 'function signIn() { ... }']
      ];
      return [
        ['index.html', '-', '<main>Storefront</main>'],
        ['style.css', '-', '.button { color: red; }']
      ];
    }
    function branchStatus(name, g) {
      if (g === 'merged' && name === copy.main) return copy.branchMerged;
      if (name === copy.feature) return g === 'feature-name' ? copy.branchCreated : copy.branchFeature;
      if (name === copy.hotfix) return g === 'hotfix-created' ? copy.branchCreated : copy.branchHotfix;
      return copy.branchStable;
    }
    function branchLane(name, tone, g, active, style) {
      var files = branchFiles(name).map(function (file) {
        return '<li><span><b>' + esc(file[1]) + '</b>' + esc(file[0]) + '</span><code>' + esc(file[2]) + '</code></li>';
      }).join('');
      return '<button type="button" class="branch-lane branch-lane--' + tone + (active ? ' is-current' : '') +
        '" style="' + esc(style || '') + '" aria-label="' + esc(name + ' branch files') + '">' +
          '<span class="branch-lane__head">' +
            '<span class="branch-lane__name">' + esc(name) + '</span>' +
            '<span class="branch-lane__tip">' + esc(branchStatus(name, g)) + '</span>' +
            (active ? '<span class="branch-lane__current">' + esc(copy.currentBranch) + '</span>' : '') +
          '</span>' +
          '<span class="branch-lane__files" role="tooltip">' +
            '<span>' + esc(copy.filesOnBranch) + '</span><ul>' + files + '</ul>' +
          '</span>' +
        '</button>';
    }
    function visibleBranchNames(g) {
      var names = [copy.main];
      if (g !== 'main-start') names.push(copy.feature);
      if (g === 'hotfix' || g === 'hotfix-created') names.push(copy.hotfix);
      return names;
    }
    function branchSummary(g) {
      return '<div class="branch-summary" aria-label="' + esc(copy.branchFilesSummary) + '">' +
        visibleBranchNames(g).map(function (name) {
          var tone = name === copy.feature ? 'feature' : name === copy.hotfix ? 'hotfix' : 'main';
          var files = branchFiles(name).map(function (file) {
            return '<span><b>' + esc(file[1]) + '</b>' + esc(file[0]) + '</span>';
          }).join('');
          return '<section class="branch-summary__item branch-summary__item--' + tone + '">' +
            '<h4>' + esc(name) + '</h4><small>' + esc(branchStatus(name, g)) + '</small><div>' + files + '</div>' +
          '</section>';
        }).join('') +
      '</div>';
    }
    function workspaceNodes() {
      var files = state.graph === 'merged'
        ? [['index.html', null], ['style.css', null], ['login-form.html', 'modified'], ['auth.js', 'added']]
        : state.current === copy.feature
        ? [['login-form.html', 'modified'], ['auth.js', 'added']]
        : state.current === copy.hotfix
          ? [['checkout.js', 'modified'], ['index.html', null]]
          : [['index.html', null], ['style.css', null]];
      return files.map(function (item) {
        return { name: item[0], type: 'file', status: item[1] };
      });
    }
    function workspaceNote() {
      return copy.workspaceShowing.replace('{branch}', state.current);
    }
    function commandButtons() {
      return '';
    }
    function button(text, action, disabled) {
      return '<button class="btn btn--primary" type="button" data-action="' + esc(action) + '"' + (done || disabled ? ' disabled' : '') + '>' + ic('arrow-right', 16) + '<span>' + esc(text) + '</span></button>';
    }
    function paint() {
      board.innerHTML = '<section class="branch-task">' +
          '<div>' + ic('mouse-pointer-click', 20) + '<strong>' + esc(beat.task) + '</strong></div>' +
          '<p>' + esc(copy.branchMeaning) + '</p>' +
        '</section>' +
        '<div class="branch-layout">' +
          '<section class="branch-panel branch-panel--graph"><h3>' + ic('git-branch', 17) + esc(copy.graph) + '</h3>' + graph() + '</section>' +
          '<section class="branch-panel branch-panel--tree">' + window.FileTree.panel({ title: copy.workspace, note: workspaceNote(), nodes: workspaceNodes() }) + '<p>' + esc(copy.noCopies) + '</p></section>' +
          terminalPanel() +
        '</div><div class="lesson-actions">' + commandButtons() + '</div>';
      if (!done) {
        var input = board.querySelector('[data-gitterm-input]');
        if (input) input.focus({ preventScroll: true });
      }
    }
    /* Which command this beat expects - the hint states it (the reader never
       guesses; see git-term.js). In the `parallel` beat either order works, so the
       hint shows the one not yet done. */
    function expectedCommand() {
      if (mode === 'need') return 'git branch feature/login';
      if (mode === 'command') return state.step === 0 ? 'git branch feature/login' : 'git switch feature/login';
      if (mode === 'parallel') return state.visited.main ? 'git switch feature/login' : 'git switch main';
      if (mode === 'hotfix') return state.step === 0 ? 'git switch main' : state.step === 1 ? 'git branch hotfix' : 'git switch hotfix';
      if (mode === 'merge') return state.current === copy.main ? 'git merge feature/login' : 'git switch main';
      return 'git status';
    }
    /* One terminal component: no light outer panel, no own h3. The dark box speaks
       for itself, and "one component, one look" is why it exists. */
    function terminalPanel() {
      return T.form({
        id: 'branch',
        command: expectedCommand(),
        value: state.input,
        log: state.terminal.map(function (line) {
          return { text: line, tone: /^\$ /.test(line) ? 'cmd' : null };
        }),
        run: copy.run,
        disabled: done
      });
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
    function act(action) {
      if (done) return;
      if (mode === 'need' && action === 'feature') {
        state.graph = 'feature-name';
        state.current = copy.main;
        state.terminal = ['$ git branch feature/login', 'Created branch feature/login'];
        finish(copy.featureDone);
      } else if (mode === 'command') {
        if (action === 'feature' && state.step === 0) {
          state.step = 1;
          state.graph = 'feature-name';
          state.terminal = ['$ git branch feature/login', '$ git branch', '  feature/login', '* main'];
          paint();
        } else if (action === 'switchFeature' && state.step === 1) {
          state.current = copy.feature;
          state.graph = 'feature-active';
          state.terminal = ['$ git switch feature/login', 'Switched to branch feature/login', '', 'CURRENT BRANCH:', 'feature/login'];
          finish(copy.branchDone);
        }
      } else if (mode === 'parallel') {
        if (action === 'switchMain') { state.current = copy.main; state.visited.main = true; state.terminal = ['$ git switch main', 'Switched to branch main']; }
        if (action === 'switchFeature') { state.current = copy.feature; state.visited.feature = true; state.terminal = ['$ git switch feature/login', 'Switched to branch feature/login']; }
        if (state.visited.main && state.visited.feature) finish(copy.parallelDone);
        else paint();
      } else if (mode === 'hotfix') {
        if (action === 'switchMain') { state.current = copy.main; state.visited.main = true; state.terminal = ['$ git switch main', 'Switched to branch main']; paint(); }
        if (action === 'hotfix' && state.visited.main) {
          state.current = copy.hotfix;
          state.graph = 'hotfix';
          state.terminal = ['$ git branch hotfix', '$ git switch hotfix', 'Switched to branch hotfix'];
          finish(copy.hotfixDone);
        }
      } else if (mode === 'merge') {
        if (action === 'switchMain') { state.current = copy.main; state.visited.main = true; state.terminal = ['$ git switch main', 'Switched to branch main']; paint(); }
        if (action === 'merge' && state.visited.main) {
          state.current = copy.main;
          state.graph = 'merged';
          state.terminal = ['$ git merge feature/login', 'Merge made by the recursive strategy.', 'CURRENT BRANCH:', 'main'];
          finish(copy.mergeDone);
        }
      }
    }
    function runTerminal(raw) {
      var command = String(raw || '').trim().replace(/\s+/g, ' ');
      if (!command || done) return;
      state.input = '';
      state.terminal.push('$ ' + command);
      if (mode === 'need') runNeed(command);
      else if (mode === 'command') runCommand(command);
      else if (mode === 'parallel') runParallel(command);
      else if (mode === 'hotfix') runHotfix(command);
      else if (mode === 'merge') runMerge(command);
      else {
        state.terminal.push(copy.unknownCommand);
        paint();
      }
    }
    function pushCurrent() {
      state.terminal.push('');
      state.terminal.push('CURRENT BRANCH:');
      state.terminal.push(state.current);
    }
    function unknown() {
      state.terminal.push(copy.unknownCommand);
      paint();
    }
    function runNeed(command) {
      if (command !== 'git branch feature/login') { unknown(); return; }
      state.step = 1;
      state.graph = 'feature-name';
      state.terminal.push(copy.branchCreatedLine);
      finish(copy.featureDone);
    }
    function runCommand(command) {
      if (command === 'git branch feature/login') {
        if (state.step === 0) {
          state.step = 1;
          state.graph = 'feature-name';
          state.terminal.push(copy.branchCreatedLine);
          state.terminal.push('$ git branch');
          state.terminal.push('  feature/login');
          state.terminal.push('* main');
          paint();
        } else {
          state.terminal.push(copy.branchAlreadyExists);
          paint();
        }
      } else if (command === 'git switch feature/login') {
        if (state.step === 0) {
          state.terminal.push(copy.switchBlocked);
          paint();
        } else {
          state.current = copy.feature;
          state.graph = 'feature-active';
          state.terminal.push(copy.switchedFeatureLine);
          pushCurrent();
          finish(copy.branchDone);
        }
      } else unknown();
    }
    function runParallel(command) {
      if (command === 'git switch main') {
        state.current = copy.main;
        state.visited.main = true;
        state.terminal.push(copy.switchedMainLine);
      } else if (command === 'git switch feature/login') {
        state.current = copy.feature;
        state.visited.feature = true;
        state.terminal.push(copy.switchedFeatureLine);
      } else { unknown(); return; }
      pushCurrent();
      if (state.visited.main && state.visited.feature) finish(copy.parallelDone);
      else paint();
    }
    function runHotfix(command) {
      if (command === 'git switch main') {
        state.current = copy.main;
        state.step = Math.max(state.step, 1);
        state.terminal.push(copy.switchedMainLine);
        pushCurrent();
        paint();
      } else if (command === 'git branch hotfix') {
        if (state.current !== copy.main) {
          state.terminal.push(copy.branchFromMainFirst);
          paint();
        } else if (state.step >= 2) {
          state.terminal.push(copy.hotfixAlreadyExists);
          paint();
        } else {
          state.step = 2;
          state.graph = 'hotfix-created';
          state.terminal.push(copy.hotfixCreatedLine);
          paint();
        }
      } else if (command === 'git switch hotfix') {
        if (state.step < 2) {
          state.terminal.push(copy.hotfixSwitchBlocked);
          paint();
        } else {
          state.current = copy.hotfix;
          state.graph = 'hotfix';
          state.terminal.push(copy.switchedHotfixLine);
          pushCurrent();
          finish(copy.hotfixDone);
        }
      } else unknown();
    }
    function runMerge(command) {
      if (command === 'git switch main') {
        state.current = copy.main;
        state.step = 1;
        state.terminal.push(copy.switchedMainLine);
        pushCurrent();
        paint();
      } else if (command === 'git merge feature/login') {
        if (state.current !== copy.main) {
          state.terminal.push(copy.mergeFromMainFirst);
          paint();
        } else {
          state.graph = 'merged';
          state.terminal.push(copy.mergeCreatedLine);
          pushCurrent();
          finish(copy.mergeDone);
        }
      } else unknown();
    }

    board.addEventListener('click', function (event) {
      var btn = event.target.closest('[data-action]');
      if (btn) act(btn.getAttribute('data-action'));
    });
    /* File-tree collapse is delegated on board and bound once: paint() replaces
       the whole tree, so listeners on collapse buttons would be lost next redraw. */
    window.FileTree.bind(board);
    board.addEventListener('input', function (event) {
      if (event.target.matches('[data-gitterm-input]')) state.input = event.target.value;
    });
    /* Submit goes through the component's binding, not a hand-found form.
       `runTerminal` only reads what was typed - this beat has one terminal. */
    T.bind(board, function (id, typed) { runTerminal(typed); });
    paint();
    return {};
  };
})();

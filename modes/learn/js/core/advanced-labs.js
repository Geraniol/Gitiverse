(function () {
  'use strict';
  var G = window.AdvancedGit, beats = window.CHAPTER_BEATS = window.CHAPTER_BEATS || {};
  var saveKey = 'gitcourse.lab.chapter15.v1';
  function shell(host, beat, h, label) {
    /* One shell for every advanced lab, so this one split covers chapters
       13, 14 and 15. */
    h.brief('<div class="lesson-guide__intro"><span class="blocklabel">' + h.ic('book-open', 15) + ' ' + h.esc(label) + '</span><h2>' + h.esc(beat.title) + '</h2><p>' + h.esc(beat.text) + '</p></div>' +
      '<div class="lesson-guide__task">' + h.ic('mouse-pointer-click', 20) + '<strong>' + h.esc(beat.task) + '</strong></div>');

    host.innerHTML = '<div class="lesson-guide"><div class="advanced-board" tabindex="-1"></div>' +
      '<div class="lesson-feedback" role="status" aria-live="polite" hidden></div>' +
      '</div>';
    var feedback = host.querySelector('.lesson-feedback');
    return { board: host.querySelector('.advanced-board'),
      placeFeedback: function () { host.querySelector('.advanced-board .lesson-panel').appendChild(feedback); },
      notify: function (text, good) { feedback.hidden = false; feedback.textContent = text; feedback.classList.toggle('is-success', !!good); } };
  }
  function button(label, action, disabled, primary) { return '<button type="button" class="btn' + (primary ? ' btn--primary' : '') + '" data-action="' + action + '"' + (disabled ? ' disabled' : '') + '>' + label + '</button>'; }
  /* Section headings are h3: the beat title lives on the intro card, and the two panels are two halves of one topic. */
  function panel(title, body) { return '<section class="lesson-panel"><h3>' + title + '</h3>' + body + '</section>'; }
  function note(text) { return '<p class="advanced-note">' + text + '</p>'; }
  function code(text, h) { return '<pre class="lesson-code advanced-output" tabindex="0">' + h.esc(text) + '</pre>'; }
  function diff(before, after, h) { return '<div class="advanced-diff"><del>− ' + h.esc(before) + '</del><ins>+ ' + h.esc(after) + '</ins></div>'; }
  function select(id, label, options) { return '<label class="advanced-field">' + label + '<select id="' + id + '"><option value="">Choose…</option>' + options.map(function (v) { return '<option value="' + v[0] + '">' + v[1] + '</option>'; }).join('') + '</select></label>'; }
  /* Flattened paths -> hierarchy, since FileTree takes tree nodes: middle segments
     are dirs, the last is a file. Dirs sort before files. */
  function pathNodes(paths, mark) {
    var roots = [];
    paths.forEach(function (p) {
      var level = roots, parts = String(p).split('/').filter(Boolean);
      parts.forEach(function (part, i) {
        if (i === parts.length - 1) { level.push({ name: part, type: 'file', path: p, status: mark ? mark(p) : null }); return; }
        var dir = null;
        level.forEach(function (n) { if (n.type === 'dir' && n.name === part) dir = n; });
        if (!dir) { dir = { name: part, type: 'dir', children: [] }; level.push(dir); }
        level = dir.children;
      });
    });
    roots.sort(function (a, b) { return a.type === b.type ? 0 : (a.type === 'dir' ? -1 : 1); });
    return roots;
  }
  /* A branch name is the same pill the sandbox draws, not the words "· main"
     tacked onto the id, and not a second kind of chip. Both history passes call
     this, so a ref looks the same in every chapter. */
  function refPills(r, id, h) {
    var names = refs(r, id);
    if (!names.length) return '';
    return '<span class="advanced-graph__refs">' + names.map(function (n) {
      return '<span class="gref gref--' + (n === 'main' ? 'main' : 'feature') + '">' + h.esc(n) + '</span>';
    }).join('') + '</span>';
  }
  function refs(r, id) {
    return Object.keys(r.branches).filter(function (b) { return r.branches[b] === id; }).concat(Object.keys(r.tracking).filter(function (b) { return r.tracking[b] === id; }).map(function (b) { return 'origin/' + b; }), Object.keys(r.tags).filter(function (t) { return r.tags[t] === id; }));
  }
  function graph(r, selected, expanded, h) {
    var tips = Object.values(r.branches).concat(Object.values(r.tracking), Object.values(r.tags));
    if (r.pending) tips.push(r.pending.onto, r.pending.old);
    var all = Object.values(r.commits).filter(function (c) { return tips.some(function (id) { return G.ancestor(r, c.id, id); }); }).reverse();
    var rows = expanded ? all : all.slice(0, 7), authors = [];
    var positions = {};
    rows.forEach(function (c, i) { if (!authors.includes(c.author)) authors.push(c.author); positions[c.id] = { x: 18 + (authors.indexOf(c.author) % 3) * 21, y: i * 68 + 34 }; });

    var GW = 78, GH = rows.length * 68;
    var paths = '', dots = '';
    rows.forEach(function (c) {
      var from = positions[c.id];
      c.parents.forEach(function (id) {
        var to = positions[id];
        if (!to) return;
        paths += '<path class="gedge" d="M' + from.x + ',' + from.y +
          ' C' + from.x + ',' + (from.y + 34) + ' ' + to.x + ',' + (to.y - 34) + ' ' + to.x + ',' + to.y +
          '" pathLength="1"></path>';
      });
      /* The role comes from the commit itself: no parent makes it the root,
         more than one makes it a merge, and the branch tip is where HEAD is.
         Same three signals the sandbox draws. */
      var role = !(c.parents || []).length ? 'root'
        : (c.parents || []).length > 1 ? 'merge' : 'main';
      dots += h.gnode({ role: role, head: G.tip(r) === c.id,
        x: (from.x / GW * 100).toFixed(3) + '%', y: (from.y / GH * 100).toFixed(3) + '%',
        size: 'var(--g-node-sm)' });
    });
    /* The canvas sits above the rows but has pointer-events:none, so clicks on dots still select the row. */
    var canvas = '<div class="gframe gframe--fixed advanced-graph__canvas" style="--gw:' + GW + ';--gh:' + GH + '" aria-hidden="true">' +
      '<svg class="gedges" viewBox="0 0 ' + GW + ' ' + GH + '" preserveAspectRatio="none" focusable="false">' + paths + '</svg>' + dots + '</div>';

    var detached = r.detached || (r.pending && r.pending.method === 'rebase' ? r.pending.onto : null);
    var content = '<div class="advanced-status"><span>HEAD' + (detached ? ' · detached' : ' → ' + h.esc(r.branch)) + '</span><strong>' + h.esc(detached || G.tip(r)) + '</strong></div>';
    /* The refs are filled in afterwards, by the two passes below (they are the
       ones that know which branch HEAD is on). */
    content += '<div class="advanced-graph" aria-label="Commit graph, newest first">' + canvas + rows.map(function (c) { return '<button type="button" class="advanced-graph__row" data-node="' + c.id + '" aria-pressed="' + (selected === c.id) + '" title="' + h.esc(c.id + ': ' + c.message + '. Parents: ' + (c.parents.join(', ') || 'none')) + '"><strong>' + h.esc(c.message) + '</strong><small>' + h.esc(c.id) + '</small></button>'; }).join('') + '</div>' + h.glegend();
    if (all.length > 7) content += button(expanded ? 'Collapse older commits' : 'Show all ' + all.length + ' commits', 'expand');
    if (selected && r.commits[selected]) {
      var c = r.commits[selected];
      content += '<div class="advanced-detail"><h3>Commit ' + h.esc(c.id) + '</h3><dl>' + [['Message', c.message], ['Author', c.author], ['Recorded time', c.time], ['Parents', c.parents.join(', ') || 'None · root commit'], ['Labels', refs(r, c.id).join(', ') || 'No branch tip or tag'], ['Changed files', c.files.join(', ') || 'None']].map(function (row) { return '<dt>' + row[0] + '</dt><dd>' + h.esc(row[1]) + '</dd>'; }).join('') + '</dl><details><summary>View snapshot</summary>' + code(Object.keys(c.tree).map(function (f) { return f + '\n' + c.tree[f]; }).join('\n\n'), h) + '</details></div>';
    /* Empty-state placeholder, not explanation: it is replaced by the detail card on
       selection. It only needs to say what to do next. */
    } else content += note('Select a commit to inspect it.');
    return panel('Repository history', content);
  }
  function bindBoard(view, paint, onAction, state, onCommand) {
    view.board.addEventListener('click', function (e) {
      var node = e.target.closest('[data-node]'), action = e.target.closest('[data-action]');
      if (node) { state.selected = node.dataset.node; paint(); view.board.querySelector('[data-node="' + state.selected + '"]').focus({ preventScroll: true }); return; }
      if (!action || action.disabled) return;
      try {
        if (action.dataset.action === 'expand') state.expanded = !state.expanded;
        else onAction(action.dataset.action);
        paint();
        var focus = view.board.querySelector('[data-action="' + action.dataset.action + '"]:not(:disabled)');
        (focus || view.board).focus({ preventScroll: true });
      } catch (error) { view.notify(error.message, false); }
    });
    /* Command submit delegation is installed once on the board, so repaints keep it.
       After accepting, clear the input first: valueOf would otherwise read the
       just-typed command back. */
    if (onCommand) T.bind(view.board, function (id, typed, formEl) {
      try {
        onCommand(id, typed, formEl);
        var input = formEl.querySelector('[data-gitterm-input]');
        if (input) input.value = '';
        paint();
        var next = view.board.querySelector('[data-gitterm="' + id + '"] [data-gitterm-input]');
        (next && !next.disabled ? next : view.board).focus({ preventScroll: true });
      } catch (error) {
        if (error && error.isCommandMismatch) T.reject(formEl);
        else view.notify(error.message, false);
        var keep = formEl.querySelector('[data-gitterm-input]');
        if (keep) keep.focus({ preventScroll: true });
      }
    });
  }
  function assert(ok, message) { if (!ok) throw new Error(message); }
  /* ---- Hand-typed terminal ----
     git-term.js loads before loader.js, so T exists. Binds command + hint into one,
     and reads the current input value from the DOM so repaints do not clear it. */
  var T = window.GitTerm;
  function expect(typed, command, hint) {
    if (T.matches(typed, command)) return;
    var err = new Error(hint || 'Type the command shown under the prompt, exactly as written.');
    /* Marks a TYPED-TEXT mismatch, which the terminal reports itself (shake +
       hint blink). The state asserts below are a different thing - they explain
       the repository, and no hint can - so only this flag becomes a shake. */
    err.isCommandMismatch = true;
    throw err;
  }
  /* Per-board output lines, keyed by form id, so terminals in one beat do not share logs. */
  function term(view, s, id, command, opts) {
    opts = opts || {};
    return T.form({ id: id, command: command, value: T.valueOf(view.board, id),
      log: s.logs[id] || [], run: opts.run, note: opts.note, disabled: opts.disabled, label: opts.label });
  }
  function ran(s, id, text, tone) { (s.logs[id] = s.logs[id] || []).push({ text: text, tone: tone || 'dim' }); }
  function teamRepo(mode) {
    var r = G.create();
    G.editCommit(r, { 'README.md': 'Team page' }, 'Document the shared page', 'Bob');
    var base = G.tip(r);
    if (mode === 'develop' || mode === 'assign') return r;
    G.checkout(r, 'feature/login', base);
    G.editCommit(r, { 'login.js': 'const loginEnabled = true;', 'config.js': 'const timeout = 5000;' }, 'Add login flow', 'Alice');
    if (mode === 'conflict') {
      G.editCommit(r, { 'index.html': '<h1>PixelWorks · sign in</h1>' }, 'Add sign-in heading', 'Alice');
      r.remote['feature/login'] = G.tip(r);
      var remoteTree = G.copy(G.tree(r, base)); remoteTree['index.html'] = '<h1>Welcome to PixelWorks</h1>';
      r.remote.main = G.record(r, [base], remoteTree, 'Welcome new visitors', 'Carol'); r.tracking.main = base;
    }
    return r;
  }
  function assignmentLab(host, beat, api, h) {
    var view = shell(host, beat, h, 'Team workflow');
    var sessions = window.Chapter13Sessions, people = window.Chapter13State.assignments;
    var feedback = '', success = false;
    function paint() {
      var plan = sessions.readAssignment(), hint = view.board.querySelector('.lesson-hint');
      var hintOpen = hint && hint.open;
      var options = people.map(function (p) { return [p.branch, p.branch]; });
      var fields = people.map(function (p, i) {
        return select('assign' + i, p.role, options);
      }).join('');
      var guide = '<details class="lesson-hint"' + (hintOpen ? ' open' : '') + '><summary>Need a Hint?</summary>' +
        '<ol><li>Start with the teammate\'s responsibility: login, profiles, or the header.</li>' +
        '<li>Use feature/ for new capabilities and fix/ for the header correction.</li>' +
        '<li>Match the final word in each branch name to the work, then confirm all three assignments.</li></ol></details>';
      var preview = '<ol class="advanced-step-list">' + people.map(function (p, i) {
        return '<li>' + h.esc(p.role + ' → ' + (plan.choices[i] || 'Not assigned')) + '</li>';
      }).join('') + '</ol>' + note('Repository unchanged. This task plans branch names; it does not run Git commands.');
      if (plan.confirmed) preview += note(h.esc(beat.result));
      var storage = sessions.storageStatus();
      view.board.innerHTML = '<div class="advanced-grid">' +
        panel('Match the team\'s work', note(h.esc(beat.situation)) + fields +
          button(plan.confirmed ? 'Assignments confirmed' : 'Confirm work assignments', 'assign', plan.confirmed, !plan.confirmed) + guide) +
        panel(plan.confirmed ? 'Your confirmed plan' : 'Plan preview', preview) + '</div>' +
        (storage.message ? '<p class="advanced-note" role="status">' + h.esc(storage.message) + '</p>' : '');
      view.placeFeedback();
      people.forEach(function (p, i) {
        var field = view.board.querySelector('#assign' + i);
        field.value = plan.choices[i]; field.disabled = plan.confirmed;
      });
      view.notify(feedback || (plan.confirmed ? 'All three assignments match the team\'s responsibilities.' : 'Choose a branch for each teammate, then confirm your plan.'), success || plan.confirmed);
      api.setCompleted(plan.confirmed);
      if (plan.confirmed) api.ready(); else api.wait();
    }
    function choices() {
      return people.map(function (p, i) { return view.board.querySelector('#assign' + i).value; });
    }
    view.board.addEventListener('change', function (event) {
      if (!event.target.matches('select')) return;
      var id = event.target.id;
      try { sessions.saveAssignment(choices(), false); feedback = ''; success = false; }
      catch (error) { feedback = error.message; success = false; }
      paint(); view.board.querySelector('#' + id).focus({ preventScroll: true });
    });
    view.board.addEventListener('click', function (event) {
      var action = event.target.closest('[data-action="assign"]');
      if (!action || action.disabled) return;
      try {
        sessions.saveAssignment(choices(), true);
        feedback = 'Plan confirmed. Each branch name communicates a different responsibility.'; success = true;
      } catch (error) { feedback = error.message; success = false; }
      paint();
      (view.board.querySelector('select:not(:disabled)') || view.board).focus({ preventScroll: true });
    });
    /* Confirmation records an actual validated plan. Keyboard navigation
     * must not mark an unanswered exercise complete; section links stay free. */
    api.intercept(function () { return !sessions.readAssignment().confirmed; });
    paint(); return {};
  }
  function developmentLab(host, beat, api, h) {
    var view = shell(host, beat, h, 'Team workflow'), sessions = window.Chapter13Sessions;
    var synchronizing = beat.mode === 'synchronize', reviewing = beat.mode === 'review-workflow';
    function readTask() { return reviewing ? sessions.readReview() : synchronizing ? sessions.readSynchronization() : sessions.readDevelopment(); }
    function readRepo() { var state = sessions.read(); var selected = synchronizing || reviewing ? readTask().kind : 'main'; return state[selected] && state[selected].repo; }
    function commandHistory() { return reviewing ? sessions.readReviewHistory() : synchronizing ? sessions.readSynchronizationHistory() : sessions.readDevelopmentHistory(); }
    var display = { selected: null, expanded: reviewing, logs: {} }, lastTask = '', historyObserver;
    var scrollFrame = 0, scrollContainer = null, paused = false;
    view.board.classList.add('development-lab');
    if (synchronizing) view.board.classList.add('synchronization-lab');
    if (reviewing) {
      view.board.classList.add('review-lab');
      host.closest('.beat').classList.add('review-stage');
    }
    function synchronizationGuide(task) {
      var guides = {
        return: ['Correct Branch', 'Git integrates changes into the branch checked out by HEAD.', 'Return to feature/login as Alice.', 'git switch feature/login', 'Find HEAD in Repository history.', 'Switch to feature/login; do not create a new branch.'],
        fetch: ['Remote and Remote-Tracking Branch', 'Remote main belongs to the simulated team server. origin/main is your local record of it. Fetch refreshes that record without merging or editing working files.', 'Fetch the team updates while keeping Alice\'s work unchanged.', 'git fetch', 'Compare Remote main with Local origin/main.', 'Run git fetch, then compare the references and unchanged working files.'],
        merge: ['Merge', 'Merge combines another history with your current branch. Conflicting edits require a human decision.', 'Merge fetched origin/main into feature/login.', 'git merge origin/main', 'Check that origin/main now matches Remote main.', 'Run the merge command; a heading conflict is expected, not a lost commit.'],
        resolve: ['Conflict Resolution', 'Markers separate Current (Alice) from Incoming (Carol via origin/main). This teaching engine compares whole files rather than performing Git\'s full line-based merge.', 'Edit index.html to preserve the welcome heading and sign-in purpose, then save the file.', '', 'Read both versions. Remove the marker lines.', 'Keep "Welcome to PixelWorks" and "sign in" inside an h1 heading. Choose your own combined wording, then Save resolved file.'],
        stage: ['Stage the Resolution', 'For a conflicted file, git add copies your resolved version to the index and confirms the conflict is resolved.', 'Stage the saved index.html yourself.', 'git add index.html', 'Check that your saved heading has both required meanings and no markers.', 'Run git add index.html. Inspect the Staging Area; a commit has not happened yet.'],
        commit: ['Merge Commit', 'A merge commit records the staged result and joins two parent histories. This simulator uses a fixed merge message instead of opening an editor.', 'Create the merge commit from the Staging Area.', 'git commit', 'Inspect git diff --staged and the resolved heading.', 'Run git commit. Select the new commit to inspect its two parents.'],
        push: ['Push a Feature Branch', 'Push publishes committed history to a named remote branch. Publishing feature/login does not integrate it into main.', 'Publish the merged feature/login branch.', 'git push origin feature/login', 'Check the merge commit and clean working state.', 'Push to feature/login, then compare Local feature/login with Remote feature/login.'],
        complete: ['Synchronization Complete', 'Alice\'s published feature contains both histories and the resolved heading. Review and integration into main remain separate work.', 'Inspect the merge parents and matching local and remote feature references.', 'git status', 'Select the merge commit to inspect both parents.', 'Compare Remote main and Remote feature/login: publishing did not merge the feature into main.']
      };
      return guides[task.phase];
    }
    function reviewGuide(task) {
      var guides = {
        open: ['Pull Request', 'A PR is a hosting-platform proposal to integrate one published branch into another. It is not a Git command.', 'As Alice, open feature/login → main.', '', 'Choose Alice in the platform controls.', 'Open the PR. Compare its source and target; no Git reference moves.'],
        inspect: ['Code Review', 'Review compares the published proposal with the agreed requirements. Local edits are not visible to a reviewer.', 'As Bob, inspect config.js against the agreed 500 ms timeout.', '', 'Choose Bob and read the proposed config.js.', 'Select Inspect published config.js, then identify the incorrect value.'],
        request: ['Request Changes', 'Useful feedback identifies the behavior and explains the required correction.', 'As Bob, request the timeout correction.', '', 'Compare 5000 ms with the agreed 500 ms.', 'Choose feedback that asks for the timeout correction, then Request Changes.'],
        fix: ['Revise the Working File', 'Responding to review starts with a file edit. Saving alone does not update the index, a commit, or the PR.', 'As Alice, save timeout = 500 in config.js on feature/login.', 'git status', 'Choose Alice. If HEAD is elsewhere, switch to feature/login.', 'Enter 500 and Save config.js. Observe the unstaged change.'],
        return: ['Current Branch', 'A revision must be recorded on the branch proposed by the PR.', 'As Alice, switch to feature/login.', 'git switch feature/login', 'Check HEAD and git status.', 'Switch to the existing feature/login branch before staging or committing.'],
        stage: ['Manual Staging', 'git add copies the selected working file into the index without committing or publishing it.', 'As Alice, stage config.js yourself.', 'git add config.js', 'Inspect the Working Directory or git diff.', 'Run git add config.js and observe the Staging Area.'],
        commit: ['Manual Commit', 'A commit records the staged snapshot locally. The hosting platform still sees the earlier published commit.', 'As Alice, commit the staged correction.', 'git commit -m "Fix login timeout"', 'Inspect git diff --staged: only config.js should change.', 'Use the displayed commit message, then inspect the new graph node.'],
        push: ['Publish the Revision', 'Pushing the source branch updates the existing PR. It does not approve or merge it.', 'As Alice, push feature/login.', 'git push origin feature/login', 'Compare Local feature/login and Remote feature/login.', 'Push the committed revision, then ask Bob to re-review it.'],
        rereview: ['Review the Latest Commit', 'A review must apply to the current published revision, including the requested correction.', 'As Bob, inspect the published config.js again.', '', 'Choose Bob and compare the original proposal with the current published file.', 'Inspect the published revision before approving it.'],
        approve: ['Approval', 'Approval records agreement on a specific published commit. It does not change main.', 'As Bob, approve the corrected PR.', '', 'Confirm that the latest published config.js uses 500 ms.', 'Approve the PR, then choose Alice for the platform merge.'],
        merge: ['Platform Merge', 'The platform creates a merge commit on remote main with the base and approved feature as parents. Local branches are separate references.', 'As Alice, merge the approved PR through the interface.', '', 'Choose Alice. Check the approved commit and published feature tip.', 'Click Merge Pull Request and compare Remote main with Local main and origin/main.'],
        complete: ['Reviewed Integration', 'Remote main now contains the approved correction and both histories. Local main and origin/main have not been fetched or advanced.', 'Inspect the remote merge commit and its two parents.', 'git status', 'Select the commit labeled Remote main.', 'Compare the approved feature tip, remote main and unchanged local references.']
      };
      return guides[task.phase];
    }
    function reviewControls(r, task) {
      var actions = '', published = r.remote['feature/login'];
      if (task.phase === 'open') actions = button('Open Pull Request', 'review-open', false, true);
      if (task.phase === 'inspect' || task.phase === 'rereview') actions = button('Inspect published config.js', 'review-inspect', false, true);
      if (task.phase === 'request') actions = select('review-feedback', 'Review feedback', [
        ['timeout', 'Request the agreed 500 ms timeout'], ['approve', 'Keep 5000 ms because the file was committed'],
        ['branch', 'Rename feature/login without changing config.js']]) + button('Request Changes', 'review-request', false, true);
      if (task.phase === 'fix') actions = '<label class="advanced-field">Timeout in config.js (ms)<input data-review-timeout type="number" value="5000" min="0" step="1"></label>' + button('Save config.js', 'review-save', false, true);
      if (task.phase === 'approve') actions = button('Approve Pull Request', 'review-approve', false, true);
      if (task.phase === 'merge') actions = button('Merge Pull Request', 'review-merge', false, true);
      var inspecting = ['inspect', 'request', 'rereview', 'approve'].includes(task.phase);
      var fixing = ['fix', 'return', 'stage', 'commit', 'push'].includes(task.phase);
      var proposed = task.status !== 'Not opened' ? '<details class="review-changes"' + (inspecting ? ' open' : '') + '><summary>Inspect published changes</summary>' +
        '<h4>config.js · published snapshot</h4>' + code(G.tree(r, published)['config.js'], h) +
        '<h4>' + (task.fixCommit && published === task.fixCommit ? 'Original proposal → published correction' : 'Remote main → proposed configuration') + '</h4>' +
        diff(G.tree(r, task.fixCommit && published === task.fixCommit ? task.originalHead : task.base)['config.js'], G.tree(r, published)['config.js'], h) +
        '<details class="review-other-files"><summary>Inspect other changed files</summary>' +
        G.changes(G.tree(r, task.base), G.tree(r, published)).filter(function (file) { return file !== 'config.js'; }).map(function (file) {
          return '<h4>' + h.esc(file) + '</h4>' + diff(G.tree(r, task.base)[file] || '(absent)', G.tree(r, published)[file] || '(absent)', h);
        }).join('') + '</details></details>' : '';
      var actionArea = '<div class="review-actions">' + actions +
        (fixing ? note('Required Git operations · run these yourself in Git Terminal below.') + code('git add config.js\ngit commit -m "Fix login timeout"\ngit push origin feature/login', h) + button('Go to Terminal', 'back-to-terminal') : '') +
        '</div><p class="review-platform-feedback" role="status"></p>';
      return '<section class="review-platform" aria-label="Pull Request platform"><h4>Current PR Action</h4>' +
        (task.phase === 'open' ? note('<strong>feature/login → main</strong> · Open this proposal on the simulated hosting platform.') : '') +
        '<div class="advanced-actions" role="group" aria-label="Act as a teammate">' + ['Alice', 'Bob'].map(function (role) {
          return '<button type="button" class="btn advanced-role" data-action="review-role-' + role + '" aria-pressed="' + (task.role === role) + '">' + role + '</button>';
        }).join('') + '</div>' + note('Acting as <strong>' + task.role + '</strong> · ' + (task.role === 'Alice' ? 'PR author' : 'Code reviewer')) +
        (task.comment ? note('<strong>Bob\'s feedback</strong> · ' + h.esc(task.comment)) : '') +
        (task.approvedHead ? note('<strong>Approved commit</strong> · ' + h.esc(task.approvedHead)) : '') +
        (inspecting ? proposed + actionArea : actionArea + proposed) + '</section>';
    }
    function reviewOverview(task, r) {
      var steps = ['Open PR', 'Review', 'Fix', 'Approve', 'Merge'];
      var current = ['inspect', 'request'].includes(task.phase) ? 1 : ['fix', 'return', 'stage', 'commit', 'push'].includes(task.phase) ? 2 :
        ['rereview', 'approve'].includes(task.phase) ? 3 : ['merge', 'complete'].includes(task.phase) ? 4 : 0;
      var status = { open: 'Open', 'changes-requested': 'Changes Requested', approved: 'Approved', merged: 'Merged' }[task.status] || 'Not Opened';
      if (task.status === 'changes-requested' && task.fixCommit && r && r.remote['feature/login'] === task.fixCommit) { status = 'Updated'; current = 3; }
      if (task.status === 'approved' || task.status === 'merged') current = 4;
      return '<section class="review-overview" aria-label="Pull Request overview"><div class="review-overview__summary"><h3>Login feature</h3>' +
        '<span>Source: <strong>feature/login</strong> → Target: <strong>main</strong></span><strong class="review-status">' + h.esc(status) + '</strong>' +
        (task.started ? '<span>' + (task.kind === 'main' ? 'Main Session' : 'Prepared Practice') + '</span>' : '') +
        '</div><ol class="review-progress" aria-label="PR workflow progress">' + steps.map(function (label, i) {
          var done = task.complete || i < current;
          return '<li class="' + (done ? 'is-done' : i === current ? 'is-current' : '') + '"' + (!done && i === current ? ' aria-current="step"' : '') + '>' +
            (done ? '<span aria-hidden="true">✓ </span>' : '') + label +
            (i < steps.length - 1 ? h.gconn('faint') : '') + '</li>';
        }).join('') + '</ol></section>';
    }
    function reviewPanelBody(element, title, toolbar) {
      var body = document.createElement('div'), heading = document.createElement('header');
      body.className = 'review-panel-body';
      body.setAttribute('tabindex', '0'); body.setAttribute('aria-label', title + ' content');
      while (element.firstChild) body.appendChild(element.firstChild);
      heading.className = 'review-panel-heading';
      heading.innerHTML = '<h3>' + title + '</h3>';
      if (toolbar) heading.appendChild(toolbar);
      element.classList.add('lesson-panel', 'review-panel');
      element.append(heading, body);
    }
    function organizeReviewHistory(element) {
      var source = element.querySelector('.lesson-panel'), toolbar = element.querySelector('[data-action="back-to-terminal"]');
      if (!source) return;
      source.querySelector('h3').remove();
      if (toolbar) toolbar.remove();
      element.replaceChildren(...Array.from(source.childNodes));
      reviewPanelBody(element, 'Repository History', toolbar);
    }
    function organizeReviewLayout(task, r, saved) {
      // Move existing component nodes; their delegated handlers and state bindings stay intact.
      var layout = view.board.querySelector('.review-columns');
      var workspace = layout.querySelector(':scope > .lesson-panel'), history = layout.querySelector('.development-history');
      layout.className = 'review-layout';
      workspace.classList.add('review-workspace'); workspace.querySelector('h3').remove();
      var interaction = workspace.querySelector('.development-interaction');
      if (interaction) {
        var terminal = document.createElement('section'), observation = document.createElement('section');
        terminal.className = 'review-terminal'; terminal.innerHTML = '<h3>Git Terminal</h3>';
        terminal.appendChild(interaction.querySelector('.gitterm'));
        observation.className = 'review-observation'; observation.setAttribute('aria-label', 'Compact Observation');
        observation.append(interaction.querySelector('.development-observation'), interaction.querySelector('.synchronization-remote'));
        interaction.replaceWith(interaction.querySelector('.review-platform'));
        layout.append(terminal, observation, history);
        workspace.querySelector('.blocklabel').remove();
      }
      reviewPanelBody(workspace, 'Team Workspace');
      organizeReviewHistory(history);
      layout.insertAdjacentHTML('beforebegin', reviewOverview(task, r));
      var snapshots = view.board.querySelector('.development-snapshots');
      if (snapshots) {
        var source = snapshots.closest('.lesson-panel'), details = document.createElement('details');
        details.className = 'review-workspace-details'; details.open = saved.details;
        details.innerHTML = '<summary>Workspace Details</summary>';
        source.querySelector('h3').remove();
        details.append(...Array.from(source.childNodes));
        source.replaceWith(details);
      }
      workspace.querySelector('.review-panel-body').scrollTop = saved.workspace;
      history.querySelector('.review-panel-body').scrollTop = saved.history;
    }
    function historyRepo(r) {
      if (!reviewing) return r;
      // A presentation copy exposes server refs without pretending they were fetched.
      var displayRepo = G.copy(r);
      Object.keys(r.remote).forEach(function (name) { displayRepo.tags['Remote ' + name] = r.remote[name]; });
      return displayRepo;
    }
    function remoteObservation(r) {
      if (reviewing) return '<section class="synchronization-remote" aria-label="Remote references"><h4>Brief Remote References</h4><table><thead><tr><th>Branch</th><th>Local</th><th>Remote</th><th>Tracking</th></tr></thead><tbody>' +
        ['main', 'feature/login'].map(function (name) {
          return '<tr><th scope="row">' + name + '</th><td>' + h.esc(r.branches[name] || '—') + '</td><td>' + h.esc(r.remote[name] || 'Not published') + '</td><td>' + h.esc(r.tracking[name] || 'Not fetched') + '</td></tr>';
        }).join('') + '</tbody></table>' + note('Tracking means local origin/*. A platform merge moves remote main; local main and origin/main stay unchanged.') + '</section>';
      return '<section class="synchronization-remote" aria-label="Remote references"><h3>Remote and local references</h3><dl>' +
        [['Remote main', r.remote.main], ['Local origin/main', r.tracking.main], ['Local main', r.branches.main],
          ['Local feature/login', r.branches['feature/login']], ['Remote feature/login', r.remote['feature/login']], ['Local origin/feature/login', r.tracking['feature/login']]].map(function (ref) {
          return '<div><dt>' + ref[0] + '</dt><dd>' + h.esc(ref[1] || 'Not published') + '</dd></div>';
        }).join('') + '</dl>' + note(reviewing ? 'A platform merge updates Remote main. Local origin/main is the last fetched reference; local main and HEAD remain separate.' : 'Remote main changes only through the explicit simulated team event. origin/main updates when you fetch. Local main stays unchanged.') + '</section>';
    }
    function conflictEditor(r, task) {
      if (!r.pending) return '';
      return '<section class="synchronization-conflict" aria-label="Conflict resolution"><h3>Resolve index.html</h3>' +
        note('Alice and Carol changed the same heading. Preserve Carol\'s "Welcome to PixelWorks" wording and Alice\'s "sign in" purpose in an h1 heading. Saving edits the Working Directory only.') +
        '<div class="synchronization-versions"><div><h4>Current Version · Alice · feature/login</h4>' + code(G.tree(r, task.login)['index.html'], h) + '</div>' +
        '<div><h4>Incoming Version · Carol · origin/main</h4>' + code(G.tree(r, task.remote)['index.html'], h) + '</div></div>' +
        '<details><summary>Conflicting content and markers</summary>' + code('<<<<<<< HEAD\n' + G.tree(r, task.login)['index.html'] + '\n=======\n' + G.tree(r, task.remote)['index.html'] + '\n>>>>>>> incoming', h) + '</details>' +
        note(h.esc('<<<<<<< HEAD starts Current; ======= separates the versions; >>>>>>> incoming ends Incoming. Remove all three marker lines.')) +
        '<label class="advanced-field">Your resolved index.html<textarea data-resolution-draft rows="6" spellcheck="false">' + h.esc(task.draft) + '</textarea></label>' +
        button('Save resolved file', 'save-resolution') + '<p class="synchronization-editor-feedback" role="status"></p></section>';
    }
    function taskGuide(task) {
      if (reviewing) return reviewGuide(task);
      if (synchronizing) return synchronizationGuide(task);
      var p = task.person, files = p ? Object.keys(p.patch).join(' ') : '';
      var guides = {
        branch: ['Branch Creation', 'A branch is a movable name for a commit. Starting at main gives every teammate the same base.',
          'Create ' + (p && p.branch) + ' from main.', 'git branch ' + (p && p.branch) + ' main',
          'Check that main still points to ' + task.base + '.', 'Type the branch command with main as its starting point.', 'Observe the new label in the graph; HEAD stays on the current branch.'],
        switch: ['Switching Branches', 'Switching moves HEAD and loads that branch\'s snapshot into the workspace.',
          'Switch to ' + (p && p.branch) + '.', 'git switch ' + (p && p.branch),
          'Find the current branch in the graph.', 'Type the switch command for this teammate.', 'Check HEAD before preparing any files.'],
        prepare: ['Working Directory', 'File edits begin in the Working Directory. They are not part of a commit until you stage and commit them.',
          'Prepare and inspect ' + files + '.', '',
          'Use Load ' + (p && p.role) + '\'s Sample Changes to simulate editing this teammate\'s files.', 'Read the changed contents under Working Directory.', 'Compare them with the unchanged Staging Area and Repository.'],
        stage: ['Staging Area', 'git add copies selected file versions into the Staging Area. It does not create a commit.',
          'Stage all of this teammate\'s files: ' + files + '.', 'git add ' + files,
          'Inspect the unstaged files and their contents.', 'Use git add with the task file names; you can stage one file at a time.', 'Check the staged list and confirm the graph has not gained a commit.'],
        commit: ['Git Commit', 'git commit records the staged snapshot and moves only the current branch. Unstaged changes are not included.',
          'Record the staged work on ' + (p && p.branch) + '.', 'git commit -m "' + (p && p.message) + '"',
          'Inspect the Staging Area or run git diff --staged.', 'Type git commit -m with a short message describing this change.', 'Select the new commit in the graph to inspect its parent and files.'],
        complete: ['Parallel Development', 'Three branches now share one starting commit and contain independent changes. Main has not moved.',
          'Inspect all three feature commits and compare their parents and snapshots.', 'git status',
          'Select each branch tip in the graph.', 'Compare its parent with the initial main commit.', 'Switch between branches to see that their files remain independent.']
      };
      return guides[task.phase];
    }
    function snapshotPanel(title, snapshot, paths, mark, emptyText, id) {
      return '<div data-development-area="' + id + '">' + window.FileTree.panel({ title: title,
        nodes: pathNodes(paths, mark), empty: emptyText }) +
        (paths.length ? '<details><summary>Inspect file contents</summary>' + code(paths.map(function (file) {
          return file + '\n' + (snapshot[file] === undefined ? '(deleted)' : snapshot[file]);
        }).join('\n\n'), h) + '</details>' : '') + '</div>';
    }
    function compactObservation(r) {
      var unresolved = r.pending ? r.pending.conflicts.filter(function (f) { return !r.pending.staged.includes(f); }) : [];
      var unstaged = G.changes(r.index, r.work).filter(function (f) { return !unresolved.includes(f); }), staged = G.changes(G.tree(r, G.tip(r)), r.index).filter(function (f) { return !unresolved.includes(f); });
      var resolutionSaved = synchronizing && readTask().phase === 'stage';
      var count = Object.keys(r.commits).filter(function (id) { return !synchronizing || Object.values(r.branches).concat(Object.values(r.tracking)).some(function (ref) { return G.ancestor(r, id, ref); }); }).length, tip = r.commits[G.tip(r)];
      function cell(id, title, value, detail) {
        return '<div data-observe="' + id + '"><h4>' + title + '</h4><strong>' + h.esc(value) + '</strong><span>' + h.esc(detail) + '</span></div>';
      }
      return '<section class="development-observation" aria-label="Repository state"><div class="development-observation__heading"><h4>Observation</h4><span>HEAD → ' + h.esc(r.branch) + '</span></div>' +
        (!synchronizing && readTask().phase === 'stage' && !staged.length ? '<div class="development-file-feedback"><h4>Files Updated!</h4>' + note('The changes are now in your Working Directory. They have not been staged or committed yet.') + '</div>' : '') +
        (resolutionSaved ? '<div class="development-file-feedback"><h4>Resolution Saved</h4>' + note('Your heading is saved in the Working Directory. Git still treats the file as unmerged until you run git add index.html.') + '</div>' : '') +
        '<div class="development-flow">' +
        cell('work', 'Working Directory', unresolved.length ? (resolutionSaved ? '1 resolved · not staged' : unresolved.length + ' unresolved') : unstaged.length + ' unstaged', unresolved.length ? (resolutionSaved ? r.work['index.html'] : 'index.html: save and stage your resolution') : unstaged.join(', ') || 'No unstaged changes') + h.gconn() +
        cell('index', 'Staging Area', staged.length + ' staged', staged.join(', ') || 'No staged changes') + h.gconn() +
        cell('repository', 'Repository', count + (count === 1 ? ' commit' : ' commits'), 'HEAD ' + tip.id + ' · ' + tip.message) + '</div></section>';
    }
    /* Reuse the shared graph rows and detail view. Only Stage 2 gets wrapping
     * labels and measured row geometry, so long messages cannot skew edges. */
    function refineHistory(r) {
      r = historyRepo(r);
      if (historyObserver) historyObserver.disconnect();
      var area = view.board.querySelector('.development-history .advanced-graph');
      if (!area) return;
      area.setAttribute('tabindex', '0');
      var rows = Array.from(area.querySelectorAll('[data-node]'));
      var mergedHistory = synchronizing || rows.some(function (row) { return r.commits[row.dataset.node].parents.length > 1; });
      rows.forEach(function (row) {
        var id = row.dataset.node;
        row.querySelector('small').innerHTML = '<span>' + h.esc(id) + '</span>' + refPills(r, id, h);
        if (id === G.tip(r)) row.setAttribute('aria-current', 'true');
      });
      function layout() {
        var names = Object.keys(r.branches).filter(function (name) { return name !== 'main'; });
        if (mergedHistory) names.push('origin/main');
        var gap = 28, width = names.length * gap + 32, positions = {};
        area.style.setProperty('--history-lane-width', width + 'px');
        var last = rows[rows.length - 1];
        var height = last ? last.offsetTop + last.offsetHeight : 0;
        if (!height) return;
        rows.forEach(function (row) {
          var id = row.dataset.node, lane = 0;
          if (!G.ancestor(r, id, r.branches.main)) lane = 1 + Math.max(0, names.findIndex(function (name) { return G.ancestor(r, id, r.branches[name]); }));
          if (mergedHistory && !G.ancestor(r, id, r.branches.main)) {
            if (id === r.branches['feature/profile']) lane = 2;
            else if (id === r.branches['fix/header']) lane = 3;
            else if (id === r.tracking.main || (reviewing && id === r.remote.main) || (r.pending && id === r.pending.onto)) lane = 4;
            else lane = 1;
          }
          positions[id] = { x: 16 + lane * gap, y: row.offsetTop + row.offsetHeight / 2 };
        });
        var paths = '', dots = '';
        rows.forEach(function (row) {
          var id = row.dataset.node, from = positions[id];
          r.commits[id].parents.forEach(function (parent) {
            var to = positions[parent];
            if (!to) return;
            // Stay in the child lane until the parent row, then join in a short fan.
            var bend = Math.min(32, (to.y - from.y) / 2);
            if (mergedHistory && r.commits[id].parents.indexOf(parent) > 0) {
              // Leave a merge node diagonally, then follow the incoming lane.
              paths += '<path class="gedge" data-child="' + id + '" data-parent="' + parent + '" d="M' + from.x + ',' + from.y + ' Q' + to.x + ',' + from.y + ' ' + to.x + ',' + (from.y + bend) + ' L' + to.x + ',' + to.y + '"></path>';
              return;
            }
            paths += '<path class="gedge" data-child="' + id + '" data-parent="' + parent + '" d="M' + from.x + ',' + from.y + ' L' + from.x + ',' + (to.y - bend) + ' Q' + from.x + ',' + (to.y - bend * 0.375) + ' ' + to.x + ',' + to.y + '"></path>';
          });
          dots += '<span class="gnode gnode--main" data-graph-node="' + id + '" style="left:' + (from.x / width * 100) + '%;top:' + (from.y / height * 100) + ';--gnode:var(--g-node-sm)"></span>';
        });
        var canvas = area.querySelector('.advanced-graph__canvas');
        canvas.style.setProperty('--gw', width);
        canvas.style.setProperty('--gh', height);
        canvas.innerHTML = '<svg class="gedges" viewBox="0 0 ' + width + ' ' + height + '" preserveAspectRatio="none" focusable="false">' + paths + '</svg>' + dots;
      }
      historyObserver = new ResizeObserver(layout);
      historyObserver.observe(area);
      layout();
    }
    function historyContent(r, task) {
      var content = button('Back to Terminal', 'back-to-terminal');
      if (!synchronizing && !reviewing && task.phase === 'branch' && task.completed.length) {
        var role = task.completed[task.completed.length - 1];
        var previous = window.Chapter13State.assignments.find(function (person) { return person.role === role; });
        content += '<section class="development-transition" aria-label="Member completed"><span class="blocklabel">Learning Navigation</span><h3>' + h.esc(role) + "'s Work Committed</h3>" +
          note(h.esc(role + "'s " + (role === 'Alice' ? 'login' : 'profile') + ' changes are now recorded on ' + previous.branch + '.')) +
          button('Continue with ' + task.person.role, 'continue-development') + '</section>';
      }
      return content + graph(historyRepo(r), display.selected, display.expanded, h);
    }
    function completionContent(task) {
      if (reviewing) return task.complete ? '<section class="development-completion" aria-label="Stage completion"><h3>Stage 4 Complete!</h3>' + note('The published correction was reviewed and approved before the platform merged it into remote main. Local main and origin/main remain unchanged.') + note('Choose Next for the Chapter Recap, or revisit any section freely.') + '</section>' : '';
      if (synchronizing) return task.complete ? '<section class="development-completion" aria-label="Stage completion"><h3>Stage 3 Complete!</h3>' + note('You fetched remote updates, resolved the heading conflict, staged the result, created a two-parent merge commit and pushed feature/login. Local and remote main remain unchanged by your push.') + note('Choose Next when you are ready. Review and integration into main are separate steps.') + '</section>' : '';
      return task.complete ? '<section class="development-completion" aria-label="Stage completion"><span class="blocklabel">Learning Navigation</span><h3>Stage 2 Complete!</h3>' +
        note('You created three independent branches from main and moved each teammate\'s changes through the Working Directory, Staging Area and Repository. Main is unchanged.') +
        note('Use Next below when you are ready to continue, or revisit any section.') + '</section>' : '';
    }
    function paint() {
      var task = readTask(), r = readRepo();
      var reviewVisual = { workspace: 0, history: 0, details: false };
      if (reviewing) {
        var workspaceBody = view.board.querySelector('.review-workspace .review-panel-body');
        var historyBody = view.board.querySelector('.development-history .review-panel-body');
        var workspaceDetails = view.board.querySelector('.review-workspace-details');
        reviewVisual = { workspace: workspaceBody ? workspaceBody.scrollTop : 0, history: historyBody ? historyBody.scrollTop : 0,
          details: !!(workspaceDetails && workspaceDetails.open) };
      }
      var hint = view.board.querySelector('.lesson-hint'), taskKey = task.started ? (task.person ? task.person.role : '') + task.phase : 'start';
      if (synchronizing || reviewing) taskKey = task.kind + taskKey;
      var hintOpen = taskKey === lastTask && hint && hint.open;
      lastTask = taskKey;
      var feedback = host.querySelector('.lesson-feedback');
      var previousLog = view.board.querySelector('.gitterm__log');
      var logTop = previousLog ? previousLog.scrollTop : null;
      var content, observation = '';
      if (!task.started) {
        content = note('<strong>Situation</strong> · PixelWorks teammates will develop login, profiles and the website header on separate branches.') +
          note('<strong>Your Goal</strong> · Start a shared development practice. Stage 1 is optional; its plan will be preserved.') +
          note('Starting creates the initial main snapshot only if no Main Repository exists. Each teammate will create a branch and manually stage and commit their files.') +
          button('Start development practice', 'start-development', false, true) +
          '<details class="lesson-hint"><summary>Need a Hint?</summary><ol><li>Start the practice when you are ready.</li><li>Follow Alice, Bob and Carol through branch creation, switching, staging and committing.</li><li>You can visit any section without starting or changing this repository.</li></ol></details>';
        if (synchronizing) content = note('<strong>Situation</strong> · Alice needs the latest profile and header changes from remote main. Start explicitly to simulate Bob and Carol integrating their work. Your current branch will not change.') +
          note('<strong>Your Goal</strong> · Switch to Alice, fetch, merge, resolve, stage, commit and push. You can read every section freely.') +
          (task.mainEligible ? button('Start synchronization in Main Session', 'start-synchronization', false, true) : note('Main Session does not yet have three clean Stage 2 branches. You may finish Stage 2 or use an isolated prepared example.')) +
          note('Prepared Practice supplies the Stage 2 example in a separate slot. Starting it replaces only that prepared slot and never marks Stage 1 or Stage 2 complete.') +
          button('Start Prepared Practice', 'start-prepared-synchronization') +
          '<details class="lesson-hint"><summary>Need a Hint?</summary><p>Choose Main Session for your own completed Stage 2 work, or explicitly start Prepared Practice for an independent example.</p></details>';
        if (reviewing) content = note('<strong>Concept</strong> · A Pull Request proposes a published branch for review on a hosting platform. It is not a Git command.') +
          note('<strong>Situation</strong> · Alice has synchronized and published feature/login. Bob will review the agreed 500 ms timeout before integration into remote main.') +
          note('<strong>Your Goal</strong> · Open, inspect, request changes, manually revise and publish, re-review, approve and merge.') +
          (task.mainEligible ? button('Start review in Main Session', 'start-review', false, true) : note('Main Session needs the clean, published result of Stage 3. You can finish that exercise or explicitly use Prepared Practice.')) +
          note(task.preparedEligible ? 'Prepared Practice can continue its completed synchronization. Main Session remains separate.' : 'Prepared Practice supplies an already synchronized example. Starting it replaces only the prepared slot, preserves Main Session, and does not mark earlier stages complete.') +
          button(task.preparedEligible ? 'Continue Prepared Practice' : 'Start Prepared Practice', 'start-prepared-review') +
          '<details class="lesson-hint"><summary>Need a Hint?</summary><ol><li>Choose Main Session to review your own published Stage 3 result.</li><li>Use Prepared Practice for an independent example when the prerequisites are missing.</li><li>Browsing this section does not create or change a repository.</li></ol></details>';
      } else {
        var guide = taskGuide(task), p = task.person;
        display.logs.development = commandHistory().reduce(function (lines, record) {
          return lines.concat([{ text: '$ ' + record.command, tone: 'cmd' }, { text: record.output, tone: record.success ? 'good' : 'bad' }]);
        }, []);
        content = (reviewing ? '<p class="blocklabel">' + h.esc(task.kind === 'main' ? 'Main Session' : 'Prepared Practice') + ' · Review and Merge Changes</p>' : synchronizing ? '<p class="blocklabel">' + h.esc(task.kind === 'main' ? 'Main Session' : 'Prepared Practice') + ' · Task ' + (['return', 'fetch', 'merge', 'resolve', 'stage', 'commit', 'push'].indexOf(task.phase) + 1 || 7) + ' of 7</p>' : '<ol class="advanced-progress">' + window.Chapter13State.assignments.map(function (person) {
          return '<li class="' + (task.completed.includes(person.role) ? 'is-done' : p && p.role === person.role ? 'is-current' : '') + '"><strong>' + person.role + '</strong>' +
            '<span class="development-member-status">' + (task.completed.includes(person.role) ? '<span aria-hidden="true">✓ </span>Committed' : p && p.role === person.role ? 'In Progress' : 'Not Started') + '</span></li>';
        }).join('') + '</ol>') + '<div class="development-context"><div><h4>Concept · ' + guide[0] + '</h4>' + note(guide[1]) + '</div><div>' +
          note('<strong>Situation</strong> · ' + (reviewing ? 'Alice authors the login feature; Bob checks it against the agreed 500 ms timeout.' : synchronizing ? 'Alice is synchronising her login feature with the simulated PixelWorks remote.' : p ? h.esc(p.role + ' is developing ' + window.Chapter13State.assignments.find(function (person) { return person.role === p.role; }).work.toLowerCase() + ' on ' + p.branch + '.') : 'All three teammates have recorded their work independently.')) +
          note('<strong>Your Goal</strong> · ' + h.esc(guide[2])) + '</div></div>' +
          '<div class="development-interaction">' + (reviewing ? reviewControls(r, task) : '') + '<h4>Interaction <small>Terminal · scroll for earlier commands</small></h4>' + (task.phase === 'prepare' ? '<div class="development-sample"><span class="blocklabel">Simulated File Edit</span>' +
          note('In a real project, developers edit files in a code editor. Click below to simulate these changes.') +
          note('The changes will appear in your Working Directory. You will stage and commit them yourself.') +
          button('Load ' + p.role + "'s Sample Changes", 'prepare-development', false, true) + '</div>' : '') +
          term(view, display, 'development', guide[3] || 'git status', { note: 'Inspect with git status, git diff, or git diff --staged at any time.' }) +
          compactObservation(r) + (synchronizing ? remoteObservation(r) + conflictEditor(r, task) : reviewing ? remoteObservation(r) : '') + '</div><div class="development-result"><h4>Explanation</h4>' + note(h.esc(task.explanation)) + '</div>' +
          '<details class="lesson-hint"' + (hintOpen ? ' open' : '') + '><summary>Need a Hint?</summary><ol>' + guide.slice(4).map(function (line) { return '<li>' + h.esc(line) + '</li>'; }).join('') + '</ol></details>';
        var head = G.tree(r, G.tip(r)), unstaged = G.changes(r.index, r.work), staged = G.changes(head, r.index);
        if (r.pending) {
          var unresolved = r.pending.conflicts.filter(function (f) { return !r.pending.staged.includes(f); });
          unstaged = Array.from(new Set(unstaged.concat(unresolved)));
          staged = staged.filter(function (f) { return !unresolved.includes(f); });
        }
        observation = panel('Workspace details',
          note('Inspect file names and expand their contents to compare the three snapshots.') +
          '<div class="development-snapshots">' +
          snapshotPanel('Working Directory · unstaged changes', r.work, unstaged, function (f) { return Object.hasOwn(head, f) ? 'modified' : 'added'; }, 'No unstaged changes', 'work') +
          snapshotPanel('Staging Area · next commit changes', r.index, staged, function () { return 'staged'; }, 'No staged changes', 'index') +
          snapshotPanel('Repository · current committed files', head, Object.keys(head).sort(), null, 'No committed files', 'repository') + '</div>');
      }
      if (synchronizing && task.started) {
        var available = sessions.read();
        if (task.kind === 'prepared' && (task.mainEligible || (available.main && available.main.data.synchronization))) content += button('Use Main Session', 'start-synchronization');
        if (task.kind === 'main' && available.prepared && available.prepared.data.synchronization) content += button('Resume Prepared Practice', 'start-prepared-synchronization');
      }
      if (reviewing && task.started) {
        var choices = sessions.read();
        if (task.kind === 'prepared' && (task.mainEligible || (choices.main && choices.main.data.review))) content += button('Use Main Session', 'start-review');
        if (task.kind === 'main' && choices.prepared && choices.prepared.data.review) content += button('Resume Prepared Practice', 'start-prepared-review');
      }
      var storage = sessions.storageStatus();
      var history = '<div class="development-history">' + (r ? historyContent(r, task) : panel('Repository history', note(reviewing ? 'Start practice explicitly to inspect its repository history.' : 'No Main Repository has been initialized. Start the practice to create the shared main snapshot.'))) + '</div>';
      view.board.innerHTML = (reviewing ? '<div class="review-columns">' + panel('Team workspace', content) + history + '</div>' + observation :
        panel('Team workspace', content) + '<div class="development-details">' + history + observation + '</div>') + completionContent(task) +
        (storage.message ? note(h.esc(storage.message)) : '');
      if (reviewing) organizeReviewLayout(task, r, reviewVisual);
      var result = view.board.querySelector('.development-result');
      if (result) {
        result.after(feedback);
        feedback.hidden = true;
      } else if (reviewing) view.board.querySelector('.review-workspace .review-panel-body').appendChild(feedback);
      else view.placeFeedback();
      var log = view.board.querySelector('.gitterm__log');
      if (log) {
        log.setAttribute('tabindex', '0');
        log.setAttribute('aria-label', 'Terminal command history');
        log.scrollTop = display.followLog || logTop === null ? log.scrollHeight : logTop;
      }
      display.followLog = false;
      if (r) refineHistory(r);
      api.setCompleted(task.complete);
      if (task.complete) api.ready(); else api.wait();
    }
    function selectHistory(id, focusId) {
      var history = view.board.querySelector('.development-history');
      if (!history) return;
      var r = readRepo();
      var previousGraph = history.querySelector(reviewing ? '.review-panel-body' : '.advanced-graph');
      var scrollTop = previousGraph ? previousGraph.scrollTop : 0;
      display.selected = id;
      history.innerHTML = historyContent(r, readTask());
      if (reviewing) organizeReviewHistory(history);
      refineHistory(r);
      var area = history.querySelector('.advanced-graph');
      (reviewing ? history.querySelector('.review-panel-body') : area).scrollTop = scrollTop;
      area.setAttribute('tabindex', '0');
      var focus = focusId && history.querySelector('[data-node="' + focusId + '"]');
      (focus || area).focus({ preventScroll: true });
    }
    /* Handle selection before the shared board listener. This behavior is
     * exclusive to the Chapter 13 development history. */
    view.board.addEventListener('click', function (event) {
      var history = event.target.closest('.development-history');
      if (!history) return;
      var node = event.target.closest('[data-node], [data-graph-node]');
      if (node) {
        event.preventDefault(); event.stopPropagation();
        var id = node.dataset.node || node.dataset.graphNode;
        selectHistory(display.selected === id ? null : id, id);
      } else if (!event.target.closest('button, a, input, select, textarea, summary, .advanced-detail')) {
        event.stopPropagation();
        if (display.selected) selectHistory(null);
      }
    }, true);
    view.board.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape' || !display.selected) return;
      event.preventDefault(); event.stopPropagation();
      var node = event.target.closest('[data-node]');
      selectHistory(null, node && node.dataset.node);
    });
    // Resolve the live scroll container after repaint; navigation cancels pending work.
    function revealResult(kind) {
      cancelAnimationFrame(scrollFrame);
      scrollFrame = requestAnimationFrame(function () {
        scrollFrame = 0;
        if (paused || !host.isConnected) return;
        var beatElement = host.closest('.beat');
        if (reviewing) {
          var reviewTarget = kind === 'complete' ? beatElement.querySelector('.beat__confirm .btn--go') :
            view.board.querySelector(kind === 'history' ? '.development-history [data-node="' + G.tip(readRepo()) + '"]' :
              kind === 'review' ? '.review-actions' : kind === 'remote' ? '.synchronization-remote' :
              kind === 'work' || kind === 'observation' ? '.development-observation' : '.gitterm__row');
          if (!reviewTarget) return;
          // One call reveals the result inside its panel and any clipped outer viewport.
          // Panel headings sit outside the scroll body, so they cannot cover the target.
          reviewTarget.scrollIntoView({ block: 'nearest', inline: 'nearest',
            behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
          if (kind === 'terminal') view.board.querySelector('[data-gitterm-input]').focus({ preventScroll: true });
          return;
        }
        var target = kind === 'complete' ? beatElement.querySelector('.beat__confirm .btn--go') :
          view.board.querySelector(kind === 'history' ? '.development-history' :
            kind === 'review' ? '.review-platform' : kind === 'remote' ? '.synchronization-remote' : kind === 'conflict' ? '.synchronization-conflict' : kind === 'work' ? '[data-observe="work"]' : kind === 'observation' ? '.development-observation' : '.gitterm__row');
        if (!target) return;
        var container = target.parentElement;
        while (container && container !== document.body &&
          !(/auto|scroll/.test(getComputedStyle(container).overflowY) && container.scrollHeight > container.clientHeight)) container = container.parentElement;
        if (!container || container === document.body) container = document.scrollingElement;
        var isDocument = container === document.scrollingElement;
        var bounds = isDocument ? { top: 0, bottom: innerHeight } : container.getBoundingClientRect();
        var header = document.querySelector('.appbar').getBoundingClientRect();
        var footer = document.querySelector('.bottombar').getBoundingClientRect();
        var top = Math.max(bounds.top, header.bottom) + 16;
        var bottom = Math.min(bounds.bottom, footer.height ? footer.top : innerHeight) - 16;
        var rect = target.getBoundingClientRect(), start = rect.top, end = rect.bottom;
        if (kind === 'work') start = view.board.querySelector('.development-observation').getBoundingClientRect().top;
        if (kind === 'complete') start = view.board.querySelector('.development-completion').getBoundingClientRect().top;
        if (kind === 'observation') {
          var inputTop = view.board.querySelector('.gitterm__row').getBoundingClientRect().top;
          if (end - inputTop <= bottom - top) start = inputTop;
        }
        // Keep the whole result visible when it fits; otherwise prioritize its heading.
        var delta = end - start > bottom - top ? start - top :
          start < top ? start - top : end > bottom ? end - bottom : 0;
        if (kind === 'complete' && end - start > bottom - top) delta = end - bottom;
        scrollContainer = container;
        container.scrollTo({ top: container.scrollTop + delta,
          behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
        if (kind === 'terminal') view.board.querySelector('[data-gitterm-input]').focus({ preventScroll: true });
      });
    }
    // These are learning navigation controls, so they do not repaint or save state.
    view.board.addEventListener('click', function (event) {
      var control = event.target.closest('[data-action="back-to-terminal"], [data-action="continue-development"]');
      if (!control) return;
      event.preventDefault(); event.stopImmediatePropagation();
      revealResult('terminal');
    }, true);
    if (synchronizing) view.board.addEventListener('click', function (event) {
      if (!event.target.closest('[data-action="save-resolution"]')) return;
      event.preventDefault(); event.stopImmediatePropagation();
      try { sessions.resolveSynchronization(); paint(); revealResult('work'); }
      catch (error) { view.board.querySelector('.synchronization-editor-feedback').textContent = error.message; }
    }, true);
    if (reviewing) view.board.addEventListener('click', function (event) {
      var control = event.target.closest('[data-action^="review-"]');
      if (!control) return;
      event.preventDefault(); event.stopImmediatePropagation();
      var operation = control.dataset.action.slice(7), value;
      if (operation.startsWith('role-')) { value = operation.slice(5); operation = 'role'; }
      if (operation === 'request') value = view.board.querySelector('#review-feedback').value;
      if (operation === 'save') value = view.board.querySelector('[data-review-timeout]').value;
      try {
        var review = sessions.reviewAction(operation, value);
        paint(); view.notify(review.explanation, true);
        var focus = view.board.querySelector('[data-action="' + control.dataset.action + '"]') || view.board.querySelector('.review-actions button') || view.board;
        focus.focus({ preventScroll: true });
        revealResult(review.complete ? 'complete' : operation === 'save' ? 'observation' : 'review');
      } catch (error) {
        view.board.querySelector('.review-platform-feedback').textContent = error.message;
      }
    }, true);
    bindBoard(view, paint, function (action) {
      if (reviewing && (action === 'start-review' || action === 'start-prepared-review')) {
        sessions.startReview(action === 'start-review' ? 'main' : 'prepared'); display.selected = null;
        view.notify('Review practice started. Open the PR through the hosting-platform controls.', true); revealResult('review');
      }
      if (action === 'start-synchronization' || action === 'start-prepared-synchronization') { sessions.startSynchronization(action === 'start-synchronization' ? 'main' : 'prepared'); display.selected = null; view.notify('Practice started. The remote team event is simulated once. Switch to Alice yourself.', true); }
      if (action === 'start-development') { sessions.startDevelopment(); view.notify('Practice started. Create the first branch from main.', true); }
      if (action === 'prepare-development') {
        sessions.prepareDevelopment();
        view.notify('Files Updated! The changes are now in your Working Directory. They have not been staged or committed yet.', true);
        revealResult('work');
      }
    }, display);
    T.bind(view.board, function (id, typed, form) {
      var output, success = true, wasComplete = readTask().complete;
      try { output = reviewing ? sessions.reviewCommand(typed) : synchronizing ? sessions.synchronizationCommand(typed) : sessions.developmentCommand(typed); }
      catch (error) { output = error.message; success = false; }
      if (reviewing) sessions.recordReviewCommand(typed, output, success);
      else if (synchronizing) sessions.recordSynchronizationCommand(typed, output, success);
      else sessions.recordDevelopmentCommand(typed, output, success);
      if (success) form.querySelector('[data-gitterm-input]').value = '';
      display.followLog = true;
      paint();
      var result = view.board.querySelector('.development-result');
      result.innerHTML = '<h4>' + (success ? 'Explanation' : 'Check this command') + '</h4>' + note(h.esc(output));
      result.classList.toggle('is-error', !success);
      view.notify(output, success);
      // The compact result is the visible feedback; keep the live status for announcements.
      host.querySelector('.lesson-feedback').classList.add('development-announcement');
      var input = view.board.querySelector('[data-gitterm-input]');
      input.focus({ preventScroll: true });
      if (success) {
        if (!wasComplete && readTask().complete) revealResult('complete');
        else if ((synchronizing || reviewing) && /^git\s+(fetch|push)\b/.test(typed.trim())) revealResult('remote');
        else if (synchronizing && /^git\s+merge\b/.test(typed.trim())) revealResult('conflict');
        else if (/^git\s+(switch|checkout|branch|commit)\b/.test(typed.trim())) revealResult('history');
        else if (/^git\s+add\b/.test(typed.trim())) revealResult('observation');
      }
    });
    if (synchronizing) view.board.addEventListener('input', function (event) {
      if (!event.target.matches('[data-resolution-draft]')) return;
      var feedback = view.board.querySelector('.synchronization-editor-feedback');
      try { sessions.saveSynchronizationDraft(event.target.value); feedback.textContent = 'Draft retained. Save resolved file to update the Working Directory.'; }
      catch (error) { feedback.textContent = error.message; }
    });
    window.FileTree.bind(view.board);
    api.intercept(function () { return !readTask().complete; });
    paint(); return { pause: function () {
      paused = true; cancelAnimationFrame(scrollFrame);
      if (reviewing) {
        var containers = Array.from(view.board.querySelectorAll('.review-panel-body'));
        for (var parent = view.board.parentElement; parent; parent = parent.parentElement) containers.push(parent);
        containers.forEach(function (element) { element.scrollTo({ top: element.scrollTop, left: element.scrollLeft, behavior: 'instant' }); });
      }
      if (scrollContainer) scrollContainer.scrollTo({ top: scrollContainer.scrollTop, behavior: 'instant' });
      if (historyObserver) historyObserver.disconnect();
    } };
  }
  beats.teamRecap = function (host, beat, api, h) {
    var view = shell(host, beat, h, 'Team workflow recap');
    view.board.classList.add('team-recap');
    view.board.innerHTML = panel('The PixelWorks workflow', '<dl class="team-recap-concepts">' + beat.concepts.map(function (concept) {
      return '<div><dt>' + h.esc(concept.title) + '</dt><dd>' + h.esc(concept.text) + '</dd></div>';
    }).join('') + '</dl>' + note('Reading this summary does not create a repository or mark any earlier stage complete.'));
    api.ready();
    return {};
  };
  beats.teamLab = function (host, beat, api, h) {
    if (beat.mode === 'assign' && window.Chapter13Sessions) return assignmentLab(host, beat, api, h);
    if (beat.mode === 'develop' || beat.mode === 'synchronize' || beat.mode === 'review-workflow') return developmentLab(host, beat, api, h);
    var view = shell(host, beat, h, 'Team workflow'), mode = beat.mode;
    var s = { repo: teamRepo(mode), role: 'Alice', selected: null, expanded: false, done: false, completed: [], phase: 0, reviewed: false, fetched: false, draft: '', published: false, logs: {} };
    var roles = ['Alice', 'Bob', 'Carol'], branches = ['feature/login', 'feature/profile', 'fix/header'];
    var origin = s.repo.branches.main;
    function rolesHtml(list) { return '<div class="advanced-actions" role="group" aria-label="Act as a teammate">' + list.map(function (role) { return '<button type="button" class="btn advanced-role" aria-pressed="' + (s.role === role) + '" data-action="role-' + role + '">' + role + '</button>'; }).join('') + '</div>'; }
    function paint() {
      var r = s.repo, content = '';
      if (mode === 'assign') {
        content = roles.map(function (role, i) { return select('assign' + i, role + ' · ' + ['login', 'profile', 'header fix'][i], branches.map(function (b) { return [b, b]; })); }).join('') + button('Confirm work assignments', 'assign', s.done, true);
      } else if (mode === 'develop') {
        var bi = roles.indexOf(s.role), b = branches[bi], message = ['Add login', 'Add profile', 'Fix welcome heading'][bi];
        content = rolesHtml(roles) + note('Acting as <strong>' + s.role + '</strong> · ' + b + '. Each branch starts at the shared main snapshot.') +
          /* Do not render the commit terminal before the branch exists: disabled means "done" in this component. */
          '<div class="advanced-terms">' + term(view, s, 'branch', 'git switch -c ' + b, { disabled: !!r.branches[b], note: 'Create the branch named for your role.' }) +
          (r.branches[b] ? term(view, s, 'develop', 'git commit -m "' + message + '"', { disabled: s.completed.includes(s.role) }) : '') + '</div>' +
          note('Completed: ' + (s.completed.join(', ') || 'No features committed yet'));
      } else if (mode === 'pr') {
        /* A PR is a hosting-platform review flow, not a git command: most steps stay as
           buttons. Only the revision is a real local commit, so it uses the terminal. */
        var labels = ['Open pull request', 'Request a timeout fix', 'Commit the requested fix', 'Approve the revision', 'Merge pull request', 'Pull request merged'];
        content = note('<strong>feature/login → main</strong><br>A pull request is a hosting-platform review workflow, not a Git command.') + rolesHtml(['Alice', 'Bob']) +
          /* These are PR review steps, unrelated to files; hence advanced-step-list, not the old advanced-file-list. */
          '<ol class="advanced-step-list"><li>Open</li><li>Review and comment</li><li>Revise</li><li>Approve</li><li>Merge</li></ol>' +
          (s.phase < 3 ? diff('const timeout = 500;', 'const timeout = 5000;', h) : code('config.js: no difference from main\nconst timeout = 500;\n\nlogin.js: new login flow remains in this PR', h)) +
          note(s.phase >= 2 ? 'Bob: “Was 5000 intentional? Please keep the agreed 500 ms timeout.”' : 'Review the proposed timeout before approval.') +
          (s.phase === 2
            ? term(view, s, 'pr-commit', 'git commit -m "Restore agreed timeout"', { disabled: s.done, note: 'Alice answers the review with a local commit.' })
            : button(labels[s.phase], 'pr', s.done, true));
      } else if (mode === 'review') {
        content = rolesHtml(['Alice', 'Bob']) + (s.done ? code('config.js: no difference from main\nconst timeout = 500;', h) : diff('const timeout = 500;', 'const timeout = 5000;', h)) +
          (s.reviewed ? note('Bob requested a change: the agreed retry budget is 500 ms.') + '<label class="advanced-field">Revised timeout in milliseconds<input id="reviewTimeout" type="number" min="1" value="5000"></label>' + term(view, s, 'revise', 'git commit -m "Address timeout review"', { disabled: s.done, note: 'Commit the agreed 500 ms budget.' }) :
            select('reviewChoice', 'As Bob, choose a useful review comment', [['question', 'Was 5000 intentional? The agreed budget is 500 ms.'], ['approve', 'Looks fine; the number is larger.'], ['personal', 'Who made this mistake?']]) + button('Submit review', 'review', false, true));
      } else {
        var pending = r.pending;
        /* After resolving, add must come before commit, so the commit terminal appears only after staging. */
        var ready = !!pending && pending.staged.includes('index.html') && r.index['index.html'] === r.work['index.html'];
        content = note('Acting as Alice on feature/login. Carol has changed the same heading on the remote main branch.') + code(G.status(r), h) +
          '<div class="advanced-terms">' + term(view, s, 'fetch', 'git fetch', { disabled: s.fetched, note: 'See the remote change without touching your files.' }) +
          (s.fetched ? term(view, s, 'merge', 'git merge origin/main', { disabled: !!pending || s.merged }) : '') + '</div>';
        if (pending) content += '<label class="advanced-field">index.html · keep both “Welcome” and “sign in”<textarea id="teamConflict" spellcheck="false">' + h.esc(s.draft) + '</textarea></label>' +
          '<div class="advanced-actions">' + button('Save file', 'save') + '</div>' +
          '<div class="advanced-terms">' + term(view, s, 'stage', 'git add index.html', { disabled: ready, note: 'Save the resolved file before staging it.' }) +
          (ready ? term(view, s, 'finish', 'git commit', { disabled: s.merged }) : '') + '</div>';
        if (s.merged) content += term(view, s, 'push', 'git push origin feature/login', { disabled: s.published });
        content += '<details open class="lesson-hint"><summary>Need a hint?</summary>' + note('Remove the markers and write one h1 containing Welcome, PixelWorks and sign in. Save, stage and commit before publishing the feature branch.') + '</details>';
      }
      view.board.innerHTML = '<div class="advanced-grid">' + panel(mode === 'assign' ? 'Who owns each change?' : 'Team workspace', content) + graph(r, s.selected, s.expanded, h) + '</div>';
      view.placeFeedback();
      var editor = view.board.querySelector('#teamConflict');
      if (editor) editor.addEventListener('input', function () { s.draft = editor.value; api.wait(); });
      if (s.done) api.ready(); else api.wait();
    }
    /* Shared by the PR button and the hand-typed commit: both require the right role first. */
    function prStep() {
      var r = s.repo;
      assert(s.role === (s.phase === 1 || s.phase === 3 ? 'Bob' : 'Alice'), 'Switch to ' + (s.phase === 1 || s.phase === 3 ? 'Bob, the reviewer.' : 'Alice, the author.'));
      if (s.phase === 2) G.editCommit(r, { 'config.js': 'const timeout = 500;' }, 'Restore agreed timeout', 'Alice');
      if (s.phase === 4) { G.checkout(r, 'main'); G.integrate(r, 'feature/login', 'merge'); s.done = true; }
      s.phase++;
    }
    function announce(action) {
      view.notify(s.done ? 'Complete. The repository now records the result of your work.' : action === 'merge' ? 'Conflict found. Git needs you to decide what the final heading should say.' : 'State updated. Inspect the files and history before your next step.', s.done);
    }
    bindBoard(view, paint, function (action) {
      var r = s.repo;
      if (action.startsWith('role-')) { s.role = action.slice(5); if (mode === 'develop' && r.branches[branches[roles.indexOf(s.role)]]) G.checkout(r, branches[roles.indexOf(s.role)]); return; }
      if (action === 'assign') {
        assert(branches.every(function (b, i) { return view.board.querySelector('#assign' + i).value === b; }), 'Match each branch to the work item in its name: login, profile or header.'); s.done = true;
      } else if (action === 'pr') prStep();
      else if (action === 'review') {
        assert(s.role === 'Bob', 'Switch to Bob to review Alice’s change.');
        assert(view.board.querySelector('#reviewChoice').value === 'question', 'Focus your comment on the behaviour and the agreed requirement.'); s.reviewed = true;
      } else if (action === 'save') r.work['index.html'] = s.draft;
      announce(action);
    }, s, function (id, typed) {
      var r = s.repo;
      if (id === 'branch') {
        var bi = roles.indexOf(s.role), b = branches[bi];
        expect(typed, 'git switch -c ' + b, 'Create the branch named for your role, exactly as the hint shows.');
        G.checkout(r, b, origin);
        ran(s, id, '$ git switch -c ' + b, 'cmd'); ran(s, id, 'Switched to a new branch ' + b, 'good');
      } else if (id === 'develop') {
        var i = roles.indexOf(s.role), patch = {}, message = ['Add login', 'Add profile', 'Fix welcome heading'][i];
        expect(typed, 'git commit -m "' + message + '"');
        G.checkout(r, branches[i]);
        patch[['login.js', 'profile.js', 'index.html'][i]] = ['const loginEnabled = true;', 'const profileEnabled = true;', '<h1>Welcome to PixelWorks</h1>'][i];
        G.editCommit(r, patch, message, s.role); s.completed.push(s.role); s.done = s.completed.length === 3;
        ran(s, id, '$ git commit -m "' + message + '"', 'cmd'); ran(s, id, 'Committed as ' + s.role + '.', 'good');
      } else if (id === 'pr-commit') {
        expect(typed, 'git commit -m "Restore agreed timeout"');
        prStep();
        ran(s, id, '$ git commit -m "Restore agreed timeout"', 'cmd'); ran(s, id, 'Restored the agreed 500 ms timeout.', 'good');
      } else if (id === 'revise') {
        assert(s.role === 'Alice', 'Switch to Alice to make the requested revision.');
        assert(Number(view.board.querySelector('#reviewTimeout').value) === 500, 'The review asks for the agreed 500 ms budget.');
        expect(typed, 'git commit -m "Address timeout review"');
        G.editCommit(r, { 'config.js': 'const timeout = 500;' }, 'Address timeout review', 'Alice'); s.done = true;
        ran(s, id, '$ git commit -m "Address timeout review"', 'cmd'); ran(s, id, 'Revision committed.', 'good');
      } else if (id === 'fetch') {
        expect(typed, 'git fetch'); G.fetch(r); s.fetched = true;
        ran(s, id, '$ git fetch', 'cmd'); ran(s, id, 'origin/main updated. Your branch and files did not move.', 'dim');
      } else if (id === 'merge') {
        expect(typed, 'git merge origin/main');
        var output = G.integrate(r, r.tracking.main, 'merge'); s.draft = r.work['index.html'];
        ran(s, id, '$ git merge origin/main', 'cmd'); ran(s, id, output, /CONFLICT/.test(output) ? 'bad' : 'good');
      } else if (id === 'stage') {
        expect(typed, 'git add index.html'); G.stage(r, 'index.html');
        ran(s, id, '$ git add index.html', 'cmd'); ran(s, id, 'Staged index.html.', 'dim');
      } else if (id === 'finish') {
        expect(typed, 'git commit');
        assert(s.draft === r.work['index.html'], 'Save your latest edit before finishing.');
        assert(/^<h1>[^<>]*<\/h1>\s*$/.test(s.draft) && /welcome/i.test(s.draft) && /PixelWorks/.test(s.draft) && /sign in/i.test(s.draft), 'Keep both intentions in one heading: Welcome, PixelWorks and sign in.');
        G.finish(r); s.merged = true;
        ran(s, id, '$ git commit', 'cmd'); ran(s, id, 'Merge commit created with two parents.', 'good');
      } else if (id === 'push') {
        expect(typed, 'git push origin feature/login'); G.push(r, 'feature/login'); s.published = true; s.done = true;
        ran(s, id, '$ git push origin feature/login', 'cmd'); ran(s, id, 'Published feature/login.', 'good');
      }
      announce(id);
    }, s);
    paint(); return {};
  };

  beats.toolkitLab = function (host, beat, api, h) {
    var view = shell(host, beat, h, 'Git toolkit'), mode = beat.mode;
    var s = { repo: G.create(), phase: 0, selected: null, expanded: mode === 'bisect', done: false,
      low: null, high: null, initialGood: null, initialBad: null, candidate: null, test: null,
      decisions: [], firstBad: null, active: false, preview: null, acknowledged: false, logs: {} };
    var r = s.repo;
    host.closest('.beat').classList.add('toolkit-stage');
    view.board.classList.add('toolkit-lab');
    h.brief('<div class="toolkit-intro"><span class="blocklabel">Advanced Toolkit</span><h2>' + h.esc(beat.title) + '</h2>' +
      '<div class="toolkit-context">' + [['Concept', beat.concept], ['Situation', beat.text], ['Your Goal', beat.task]].map(function (item) {
        return '<div><h3>' + item[0] + '</h3><p>' + h.esc(item[1]) + '</p></div>';
      }).join('') + '</div></div>');
    if (mode === 'stash') { r.work['index.html'] = '<h1>PixelWorks · draft redesign</h1>'; r.untracked['notes.txt'] = 'An untracked idea'; }
    if (mode === 'cherry') {
      G.editCommit(r, { 'README.md': 'Setup guide' }, 'B · Document setup', 'Bob');
      G.checkout(r, 'feature', G.tip(r));
      G.editCommit(r, { 'feature.js': 'const preview = true;' }, 'C · Unrelated feature preview', 'Carol');
      s.target = G.editCommit(r, { 'config.js': 'const timeout = 800;' }, 'D · Timeout fix', 'Carol');
      G.checkout(r, 'main');
    }
    if (mode === 'tag' || mode === 'blame') {
      G.editCommit(r, { 'README.md': 'Setup guide' }, 'B · Document setup', 'Bob');
      s.target = G.editCommit(r, { 'config.js': 'const timeout = 5000;' },
        mode === 'tag' ? 'C · Tested stable release' : 'C · Allow slow demo servers more time', 'Alice');
      G.editCommit(r, { 'index.html': '<h1>PixelWorks · next release</h1>' }, 'D · Begin next release', 'Carol');
    }
    if (mode === 'bisect') {
      s.repo = r = G.create({ 'index.html': '<h1>PixelWorks</h1>', 'search.js': 'const searchWorks = true;' });
      s.ids = [G.tip(r)];
      for (var i = 1; i < 8; i++) s.ids.push(G.editCommit(r, { 'search.js': 'const searchWorks = ' + (i < 5 ? 'true;' : 'false;'), 'version.txt': String(i) },
        ['', 'Improve labels', 'Add keyboard navigation', 'Refine spacing', 'Update help', 'Change query matching', 'Tidy styles', 'Update documentation'][i], ['Alice', 'Bob', 'Carol'][i % 3]));
    }
    if (mode === 'clean') {
      G.editCommit(r, { '.gitignore': 'cache/\n' }, 'Ignore local cache');
      r.untracked = { 'dist/bundle.js': 'build', 'scratch.txt': 'draft note', 'cache/local.dat': 'ignored cache' };
    }
    var initial = G.copy(s), historyObserver;
    function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
    function restore(snapshot) {
      Object.keys(s).forEach(function (key) { delete s[key]; });
      Object.assign(s, G.copy(snapshot)); r = s.repo;
    }
    function requireStep(ok, problem, reason, next) {
      assert(ok, 'What went wrong: ' + problem + ' Why: ' + reason + ' What to check next: ' + next);
    }
    function bisectPass(id) { return G.tree(r, id)['search.js'] === 'const searchWorks = true;'; }
    function bisectCheckout(id) {
      r.detached = id; r.index = G.copy(G.tree(r, id)); r.work = G.copy(r.index); s.selected = id;
    }
    function chooseCandidate() {
      s.test = null;
      if (s.high - s.low === 1) {
        s.firstBad = s.ids[s.high]; s.candidate = null; s.phase = 4; bisectCheckout(s.firstBad);
      } else { s.candidate = s.ids[Math.floor((s.low + s.high) / 2)]; bisectCheckout(s.candidate); }
    }
    // This prepared file has one line and a linear history; no general blame engine is needed.
    function timeoutAnnotation() {
      var id = G.tip(r), value = G.tree(r, id)['config.js'];
      while (r.commits[id].parents.length === 1) {
        var parent = r.commits[id].parents[0];
        if (G.tree(r, parent)['config.js'] !== value) break;
        id = parent;
      }
      return { id: id, line: value, author: r.commits[id].author, message: r.commits[id].message };
    }
    function currentTask() {
      if (s.done) return 'Compare the final state with your goal, then choose Next.';
      if (mode === 'stash') return s.phase ? 'Inspect the saved stash and remaining note, then restore the draft.' : 'Inspect the modified tracked file and untracked note, then stash the draft.';
      if (mode === 'cherry') return 'Select D in Repository History, then cherry-pick its timeout fix onto main.';
      if (mode === 'tag') return 'Select the tested C commit, then name that version v1.0.';
      if (mode === 'blame') return s.phase ? 'Select the annotated commit in Repository History, read its message, then confirm.' : 'Run blame to identify the last change to the timeout line.';
      if (mode === 'clean') return s.preview ? 'Review the preview, acknowledge the deletion warning, then run the cleanup.' : 'Run a dry run to see the eligible deletion list. No files will be removed.';
      return ['Inspect the eight commits and recorded test evidence, then start bisect.',
        'Set the known-bad boundary explicitly using the latest failing commit ID.',
        'Set the known-good boundary explicitly using the earliest working commit ID.',
        s.test ? 'Classify the tested candidate: PASS is good; FAIL is bad.' : 'Run the simulated test on the current candidate before classifying it.',
        'The first bad commit is identified. Reset the bisect session to return to main.'][s.phase];
    }
    function commandHint() {
      if (mode === 'stash') return s.phase ? 'git stash pop' : 'git stash';
      if (mode === 'cherry') return 'git cherry-pick ' + s.target;
      if (mode === 'tag') return 'git tag v1.0 ' + s.target;
      if (mode === 'blame') return 'git blame config.js';
      if (mode === 'clean') return s.preview ? 'git clean -fd' : 'git clean -nd';
      return ['git bisect start', 'git bisect bad ' + s.ids[7], 'git bisect good ' + s.ids[0],
        'git bisect good · git bisect bad', 'git bisect reset', 'git bisect reset'][s.phase];
    }
    function facts(items) {
      return '<dl class="toolkit-facts">' + items.map(function (item) {
        return '<div><dt>' + h.esc(item[0]) + '</dt><dd>' + h.esc(item[1]) + '</dd></div>';
      }).join('') + '</dl>';
    }
    function fileTree(title, files, mark) {
      return window.FileTree.panel({ title: title, nodes: pathNodes(files, mark) });
    }
    function observation() {
      if (mode === 'stash') {
        var modified = G.changes(G.tree(r, G.tip(r)), r.work);
        return facts([['Modified Tracked Files', modified.join(', ') || 'None'], ['Untracked Files', Object.keys(r.untracked).join(', ') || 'None'],
          ['Stash Entry', r.stash ? 'stash@{0} · ' + G.changes(r.stash.base, r.stash.work).join(', ') : 'None'],
          ['Restored Changes', s.phase === 2 && same(r.work, initial.repo.work) ? 'Original tracked draft restored' : 'Not restored yet']]) +
          '<div class="toolkit-file-comparison"><div><h4>Tracked index.html · before stash</h4>' + code(initial.repo.work['index.html'], h) +
          '</div><div><h4>Working Directory · now</h4>' + code(r.work['index.html'], h) + '</div></div>' +
          (r.stash ? '<h4>Saved tracked draft</h4>' + code(r.stash.work['index.html'], h) : '') +
          fileTree('Working files', Object.keys(r.work).concat(Object.keys(r.untracked)), function (f) { return modified.includes(f) ? 'modified' : null; });
      }
      if (mode === 'cherry') return facts([['Source Commit', s.target + ' · on feature'],
        ['New Commit on main', s.created || 'Not created'], ['Parent of main', r.commits[G.tip(r)].parents.join(', ')],
        ['Unrelated feature.js on main', Object.hasOwn(r.work, 'feature.js') ? 'Present' : 'Absent']]) +
        '<h4>config.js · main before / now</h4>' + diff(initial.repo.work['config.js'], r.work['config.js'], h) +
        fileTree('Current main files', Object.keys(r.work), function (f) { return G.changes(initial.repo.work, r.work).includes(f) ? 'modified' : null; });
      if (mode === 'tag') return facts([['Tag v1.0', r.tags['v1.0'] || 'Not created'], ['Branch main', r.branches.main],
        ['Commit Count · before / now', Object.keys(initial.repo.commits).length + ' / ' + Object.keys(r.commits).length]]) +
        note('The graph labels distinguish the release tag from the current branch.');
      if (mode === 'blame') {
        var annotation = timeoutAnnotation(), selected = r.commits[s.selected];
        return code('config.js\n1  ' + r.work['config.js'], h) + (s.phase ? facts([['Annotated Line', '1 · ' + annotation.line],
          ['Last Changed By Commit', annotation.id], ['Selected Commit', selected ? selected.id : 'Select the annotated ID in Repository History'],
          ['Selected Commit Message', selected ? selected.message : 'Not inspected yet'], ['Repository State', same(r, initial.repo) ? 'Unchanged' : 'Changed']]) : note('Run blame to reveal the line annotation.'));
      }
      if (mode === 'bisect') {
        var remaining = s.low !== null && s.high !== null ? s.ids.slice(s.low + 1, s.high + 1) : [];
        var last = s.decisions[s.decisions.length - 1];
        return facts([['Known-good Commit · set by you', s.initialGood || 'Not set'], ['Known-bad Commit · set by you', s.initialBad || 'Not set'],
          ['Current Candidate', s.candidate || 'None'], ['HEAD / Checkout', r.detached ? r.detached + ' · detached' : r.branch + ' → ' + G.tip(r)],
          ['Current Test Result', s.test ? s.test.id + ' · ' + s.test.result : 'No test for the current candidate'],
          ['Remaining Search Range', remaining.length ? remaining.join(' → ') + ' (' + remaining.length + ' possible first-bad commits)' : 'Waiting for both boundaries'],
          ['Good / Bad Limits', remaining.length ? s.ids[s.low] + ' / ' + s.ids[s.high] : 'Not established'],
          ['First Bad Commit', s.firstBad ? s.firstBad + ' · ' + r.commits[s.firstBad].message : 'Not identified'],
          ['Bisect Session', s.active ? 'Active' : s.done ? 'Ended · returned to main' : 'Not started']]) +
          (last ? note('Last decision: ' + h.esc(last.id + ' · ' + last.result + ' → ' + last.verdict + '. Search range: ' + last.before + ' → ' + last.after + ' possible commits.')) : '');
      }
      var eligible = G.cleanPreview(r), ignored = Object.keys(r.untracked).filter(function (f) { return G.ignored(r, f); });
      return facts([['Eligible Files · now', eligible.join(', ') || 'None'], ['Ignored Files · kept', ignored.join(', ') || 'None'],
        ['Tracked Files · kept', Object.keys(r.work).join(', ')], ['Removed Files', (s.removed || []).join(', ') || 'None']]) +
        (s.preview ? '<h4>Dry-run Preview · recorded before cleanup</h4>' + code(s.preview.map(function (f) { return 'Would remove ' + f; }).join('\n'), h) +
          note(s.done ? 'Compare this preview with Removed Files above.' : 'Preview only: all listed files are still present.') : note('No dry run yet.')) +
        fileTree('Working Directory · now', Object.keys(r.work).concat(Object.keys(r.untracked)), function (f) { return G.ignored(r, f) ? 'ignored' : null; });
    }
    function resultExplanation() {
      if (s.done) return beat.result;
      if (mode === 'stash' && s.phase === 1) return 'Stash saved the tracked draft and restored its committed version in the working directory. The untracked note was excluded; it is still here.';
      if (mode === 'blame' && s.phase) return 'Blame returned a commit ID without changing files or history. Inspect that commit before confirming what you found.';
      if (mode === 'bisect' && s.phase === 1) return 'Starting opened a bisect session only. Neither boundary has been set and HEAD has not moved.';
      if (mode === 'bisect' && s.phase === 2) return 'The bad boundary is recorded. Git still needs your good boundary before choosing a candidate.';
      if (mode === 'bisect' && s.phase === 3) return 'The good boundary is excluded from possible first-bad commits; the bad boundary is included. Test the candidate before narrowing this range.';
      if (mode === 'bisect' && s.phase === 4) return 'The good and bad limits are adjacent, so the bad limit is the first bad commit. The investigation is found; reset is still required.';
      if (mode === 'clean' && s.preview) return 'The dry run listed eligible files without deleting them. Tracked files and ignored cache are excluded under these options.';
      return 'This is the initial scenario. Run the requested command to observe its effect here.';
    }
    // Reuse the graph component, then align its existing edges to wrapping rows.
    function refineHistory() {
      if (historyObserver) historyObserver.disconnect();
      var area = view.board.querySelector('.toolkit-history .advanced-graph');
      var rows = Array.from(area.querySelectorAll('[data-node]'));
      rows.forEach(function (row) {
        var id = row.dataset.node, labels = [];
        Object.keys(r.branches).forEach(function (name) { if (r.branches[name] === id) labels.push('Branch: ' + name); });
        Object.keys(r.tags).forEach(function (name) { if (r.tags[name] === id) labels.push('Tag: ' + name); });
        if (id === (r.detached || G.tip(r))) row.setAttribute('aria-current', 'true');
        row.querySelector('small').innerHTML = '<span>' + h.esc(id) + '</span>' + refPills(r, id, h);
      });
      function layout() {
        var positions = {}, width = 62, height = area.offsetHeight;
        if (!height) return;
        rows.forEach(function (row) {
          positions[row.dataset.node] = { x: G.ancestor(r, row.dataset.node, r.branches.main) ? 16 : 44, y: row.offsetTop + row.offsetHeight / 2 };
        });
        var canvas = area.querySelector('.advanced-graph__canvas'), paths = canvas.querySelectorAll('path'), dots = canvas.querySelectorAll('.gnode'), edge = 0;
        rows.forEach(function (row, index) {
          var from = positions[row.dataset.node];
          dots[index].style.left = (from.x / width * 100) + '%'; dots[index].style.top = (from.y / height * 100) + '%';
          r.commits[row.dataset.node].parents.forEach(function (parent) {
            var to = positions[parent];
            if (!to) return;
            var middle = (from.y + to.y) / 2;
            paths[edge++].setAttribute('d', 'M' + from.x + ',' + from.y + ' C' + from.x + ',' + middle + ' ' + to.x + ',' + middle + ' ' + to.x + ',' + to.y);
          });
        });
        canvas.style.setProperty('--gw', width); canvas.style.setProperty('--gh', height);
        canvas.querySelector('svg').setAttribute('viewBox', '0 0 ' + width + ' ' + height);
      }
      layout();
      if (window.ResizeObserver) { historyObserver = new ResizeObserver(layout); historyObserver.observe(area); }
    }
    function paint() {
      var oldHint = view.board.querySelector('.lesson-hint'), hintOpen = oldHint && oldHint.open;
      var extra = '';
      if (mode === 'bisect') {
        extra = facts([['Recorded working version', s.ids[0] + ' · ' + (bisectPass(s.ids[0]) ? 'PASS' : 'FAIL')],
          ['Recorded failing version', s.ids[7] + ' · ' + (bisectPass(s.ids[7]) ? 'PASS' : 'FAIL')]]);
        if (s.phase === 3) extra += button('Run Test (simulated)', 'test', !!s.test) +
          (s.test ? note('<strong>' + h.esc(s.test.id + ': ' + s.test.result) + '</strong>') : note('Run the search check on this checkout. It does not classify the commit for you.'));
      }
      if (mode === 'clean' && s.preview) extra += '<div class="toolkit-warning"><h4>Preview before deleting</h4>' +
        code(s.preview.join('\n'), h) + '<label class="advanced-check"><input id="confirmClean" type="checkbox"' + (s.acknowledged ? ' checked' : '') + (s.done ? ' disabled' : '') +
        '>I reviewed this preview. I understand that Git has no committed copy of these files and may not recover them after deletion.</label></div>';
      var content = '<h4>Current Task</h4>' + note(h.esc(currentTask())) + extra +
        '<h4 class="toolkit-terminal-title">Terminal &amp; Command History</h4>' + term(view, s, 'toolkit', commandHint(), {
          disabled: s.done, note: 'Simulated Git commands in this independent exercise.', label: 'Git command for ' + mode
        });
      if (mode === 'blame' && s.phase) content += button('Confirm investigation', 'context', s.done || s.selected !== timeoutAnnotation().id);
      content += '<div class="toolkit-feedback-slot"><h4>Task Feedback</h4></div>' +
        '<details class="lesson-hint"' + (hintOpen ? ' open' : '') + '><summary>Need a Hint?</summary><ol>' + beat.hints.map(function (hint) {
          return '<li>' + h.esc(hint) + '</li>';
        }).join('') + '</ol></details>';
      view.board.innerHTML = '<div class="advanced-grid toolkit-layout">' + panel('Practice Workspace', content) +
        '<div class="toolkit-history">' + graph(r, s.selected, s.expanded, h) + '</div></div>' +
        '<section class="toolkit-observation" aria-label="State Observation"><h3>State Observation</h3>' + observation() + '</section>' +
        '<section class="toolkit-result"><h3>Result Explanation</h3>' + note(h.esc(resultExplanation())) + '</section>' +
        /* No second "you are done" panel here: the feedback slot under the
           terminal already announces the goal, and the page's own button is the
           way onward. Two of them said the same thing on a 1700px page. */
        '<div class="toolkit-footer">' + button('Restart this exercise', 'restart') + note('Each lab is independent. Reloading starts a fresh attempt; unfinished repository state is not saved across reloads.') + '</div>';
      view.placeFeedback();
      view.board.querySelector('.toolkit-feedback-slot').appendChild(view.board.querySelector('.lesson-feedback'));
      if (view.board.querySelector('.lesson-feedback').hidden) view.notify('Ready. Inspect the initial state and follow the current task.', true);
      refineHistory();
      api.setCompleted(s.done);
      if (s.done) api.ready(); else api.wait();
    }
    function completion() {
      if (mode === 'stash') return s.phase === 2 && !r.stash && same(r.work, initial.repo.work) && same(r.untracked, initial.repo.untracked) && same(r.commits, initial.repo.commits);
      if (mode === 'cherry') return !!s.created && r.branch === 'main' && G.tip(r) === s.created &&
        s.created !== s.target && same(r.commits[s.created].parents, [initial.repo.branches.main]) &&
        same(G.changes(initial.repo.work, r.work), ['config.js']) && r.work['config.js'] === G.tree(r, s.target)['config.js'] &&
        !Object.hasOwn(r.work, 'feature.js') && r.branches.feature === initial.repo.branches.feature &&
        Object.keys(r.commits).length === Object.keys(initial.repo.commits).length + 1;
      if (mode === 'tag') return r.tags['v1.0'] === s.target && same(r.branches, initial.repo.branches) && same(r.commits, initial.repo.commits);
      if (mode === 'blame') return s.confirmed && s.phase > 0 && same(r, initial.repo);
      if (mode === 'bisect') return s.phase === 5 && !s.active && !!s.initialGood && !!s.initialBad && s.decisions.length > 0 &&
        s.high - s.low === 1 && s.firstBad === s.ids[s.high] && bisectPass(s.ids[s.low]) && !bisectPass(s.firstBad) &&
        !r.detached && r.branch === initial.repo.branch && G.tip(r) === initial.repo.branches.main &&
        same(r.work, initial.repo.work) && same(r.commits, initial.repo.commits);
      return !!s.preview && s.acknowledged && same(s.removed, s.preview) && !G.cleanPreview(r).length &&
        same(r.work, initial.repo.work) && same(r.index, initial.repo.index) && same(r.commits, initial.repo.commits) &&
        Object.keys(initial.repo.untracked).filter(function (f) { return G.ignored(initial.repo, f); }).every(function (f) { return r.untracked[f] === initial.repo.untracked[f]; });
    }
    function runCommand(typed) {
      requireStep(!s.done, 'This attempt is complete.', 'The requested outcome already exists.', 'Inspect it or restart this exercise.');
      var expected = commandHint();
      var verdict = mode === 'bisect' && s.phase === 3;
      requireStep(verdict ? T.matches(typed, 'git bisect good') || T.matches(typed, 'git bisect bad') : T.matches(typed, expected),
        'That command does not match the current task.', 'This focused lab accepts the command for its current step.', 'Use ' + expected + '. ' + currentTask());
      var output = '';
      if (mode === 'stash') {
        var pop = s.phase === 1;
        G.stash(r, pop); s.phase++;
        output = pop ? 'Tracked draft restored; the stash entry was removed. notes.txt is unchanged.' : 'Tracked draft saved to stash@{0}; notes.txt remains untracked.';
      } else if (mode === 'cherry') {
        requireStep(s.selected === s.target, 'D has not been selected.', 'The isolated fix must be identified before copying it.', 'Select D in Repository History and inspect its changed files.');
        s.created = G.cherryPick(r, s.target); s.selected = s.created;
        output = 'Applied ' + s.target + ' as new commit ' + s.created + ' on main. Inspect config.js and the absence of feature.js.';
      } else if (mode === 'tag') {
        requireStep(s.selected === s.target, 'The stable commit is not selected.', 'The release belongs on tested C, while main points to D.', 'Select C in Repository History.');
        r.tags['v1.0'] = s.target;
        output = 'Tag v1.0 → ' + r.tags['v1.0'] + '; main → ' + r.branches.main + '. No new commit.';
      } else if (mode === 'blame') {
        var annotation = timeoutAnnotation(); s.phase = 1; s.selected = null;
        output = '1  ' + annotation.id + '  (' + annotation.author + ')  ' + annotation.line;
      } else if (mode === 'bisect') {
        if (s.phase === 0) {
          s.active = true; s.phase = 1;
          output = 'Bisect session started. Good and bad boundaries are not set. HEAD remains on main.';
        } else if (s.phase === 1) {
          s.initialBad = s.ids[7]; s.high = 7; s.phase = 2;
          output = 'Known bad: ' + s.initialBad + '. Set the known-good boundary next.';
        } else if (s.phase === 2) {
          s.initialGood = s.ids[0]; s.low = 0; s.phase = 3; chooseCandidate();
          output = 'Known good: ' + s.initialGood + '. Checked out candidate ' + s.candidate + '.';
        } else if (s.phase === 3) {
          requireStep(s.active && s.test && s.test.id === s.candidate && r.detached === s.candidate,
            'The current candidate has not been tested.', 'Each decision needs evidence from this checkout.', 'Click Run Test, then classify its PASS or FAIL result.');
          var good = T.matches(typed, 'git bisect good'), mid = s.ids.indexOf(s.candidate), before = s.high - s.low;
          requireStep(good === (s.test.result === 'PASS'), 'The classification contradicts the test.', 'PASS means good; FAIL means bad.', 'Read the result for ' + s.candidate + ' and choose the matching command.');
          var decision = { id: s.candidate, result: s.test.result, verdict: good ? 'good' : 'bad', before: before };
          if (good) s.low = mid; else s.high = mid;
          decision.after = s.high - s.low; s.decisions.push(decision); chooseCandidate();
          output = 'Marked ' + decision.id + ' ' + decision.verdict + '. Range: ' + before + ' → ' + decision.after + '.\n' +
            (s.firstBad ? 'First bad commit: ' + s.firstBad + ' · ' + r.commits[s.firstBad].message : 'Next candidate: ' + s.candidate);
        } else if (s.phase === 4) {
          requireStep(s.active && s.firstBad && s.high - s.low === 1, 'The investigation is incomplete.', 'Reset completes this task only after the first bad commit is identified.', 'Test and classify the remaining candidates.');
          r.branch = initial.repo.branch; r.index = G.copy(G.tree(r, G.tip(r))); r.work = G.copy(r.index); delete r.detached;
          s.selected = G.tip(r); s.active = false; s.phase = 5;
          output = 'Bisect session ended. HEAD returned to ' + r.branch + ' at ' + G.tip(r) + '.';
        }
      } else if (mode === 'clean') {
        if (!s.preview) {
          s.preview = G.cleanPreview(r); s.acknowledged = false;
          output = s.preview.map(function (f) { return 'Would remove ' + f; }).join('\n') + '\nDry run only: no files deleted.';
        } else {
          requireStep(s.acknowledged, 'Deletion has not been acknowledged.', 'Untracked files have no committed copy for Git to restore.', 'Review the preview and check the warning before running git clean -fd.');
          s.removed = G.cleanFiles(r, s.preview);
          output = s.removed.map(function (f) { return 'Removed ' + f; }).join('\n') + '\nTracked and ignored files kept.';
        }
      }
      ran(s, 'toolkit', '$ ' + typed.trim(), 'cmd'); ran(s, 'toolkit', output, 'dim');
      s.done = !!completion();
      view.notify(s.done ? 'Goal achieved. Review State Observation and Result Explanation, then choose Next.' : output, true);
    }
    bindBoard(view, paint, function (action) {
      if (action === 'restart') {
        restore(initial);
        var hint = view.board.querySelector('.lesson-hint'), input = view.board.querySelector('[data-gitterm-input]');
        if (hint) hint.open = false;
        if (input) input.value = '';
        view.notify('Fresh attempt. This exercise has returned to its initial scenario.', true);
        return;
      }
      if (action === 'context') {
        requireStep(mode === 'blame' && s.phase > 0 && s.selected === timeoutAnnotation().id,
          'The line context has not been inspected.', 'Blame alone only reports the annotation.', 'Select its commit in Repository History and read the message.');
        s.confirmed = true; s.done = !!completion();
        view.notify('Investigation confirmed: ' + timeoutAnnotation().message + '. Repository unchanged.', true);
      } else if (action === 'test') {
        requireStep(mode === 'bisect' && s.active && s.phase === 3 && r.detached === s.candidate,
          'There is no candidate ready to test.', 'Both boundaries must be set first.', 'Follow the current task in the terminal.');
        s.test = { id: s.candidate, result: bisectPass(s.candidate) ? 'PASS' : 'FAIL' };
        ran(s, 'toolkit', 'Simulated search test · ' + s.test.id + ': ' + s.test.result, s.test.result === 'PASS' ? 'good' : 'bad');
        view.notify(s.test.result + ' at ' + s.test.id + '. Enter git bisect ' + (s.test.result === 'PASS' ? 'good' : 'bad') + ' yourself.', true);
      }
    }, s, function (id, typed) {
      // Keep rejected commands atomic, including a failed model operation.
      var before = G.copy(s);
      try { runCommand(typed); }
      catch (error) {
        restore(before);
        var message = error.message.indexOf('What went wrong:') === 0 ? error.message :
          'What went wrong: ' + error.message + ' Why: the operation could not safely finish from this state. What to check next: ' + currentTask();
        ran(s, 'toolkit', '$ ' + typed.trim(), 'cmd'); ran(s, 'toolkit', message, 'bad');
        paint();
        var input = view.board.querySelector('[data-gitterm-input]');
        if (input) input.focus({ preventScroll: true });
        throw new Error(message);
      }
    });
    view.board.addEventListener('change', function (event) {
      if (event.target.id === 'confirmClean') s.acknowledged = !!s.preview && event.target.checked;
    });
    window.FileTree.bind(view.board);
    paint();
    // Keyboard confirmation must satisfy the same goal as the visible Next button.
    api.intercept(function () { return !s.done; });
    // Cached sections keep their observer so graph geometry updates when revisited.
    return {};
  };

  function loadFinal() {
    try {
      var s = JSON.parse(localStorage.getItem(saveKey));
      if (s && s.version === 1 && Number.isInteger(s.step) && s.step >= 0 && s.step <= 6 && s.repo && s.repo.commits && s.repo.commits[G.tip(s.repo)] && s.checkpoint && s.flags && Array.isArray(s.log) && Array.isArray(s.inspected) && Array.isArray(s.completed) && typeof s.draft === 'string' && typeof s.explanation === 'string') {
        G.status(s.repo); G.status(s.checkpoint.repo);
        return s;
      }
    } catch (e) { /* Missing, outdated or invalid save: start a fresh exercise. */ }
    return window.FinalChallenge.start();
  }
  beats.finalLab = function (host, beat, api, h) {
    var F = window.FinalChallenge, view = shell(host, beat, h, 'PixelWorks · final challenge');
    var s = loadFinal(), selected = null, expanded = false, saveFailed = false;
    function save() { try { localStorage.setItem(saveKey, JSON.stringify(s)); saveFailed = false; } catch (e) { saveFailed = true; } }
    function commands() {
      var list = [
        ['git status', 'git diff', 'git rm --cached .env', 'git add .gitignore src/app.js', 'git commit -m "Prepare safe project files"'],
        ['git status', 'git fetch', 'git merge origin/main', 'git push'],
        ['git switch feature/search', 'git merge main', 'git rebase main'],
        ['git status', 'git add index.html', s.flags.strategy === 'rebase' ? 'git rebase --continue' : 'git commit -m "Resolve heading"'],
        ['git log', 'git revert ' + s.flags.bad, 'git push'],
        ['git reflog', 'git switch -c recovery <commit-id>'],
        ['git status', 'git log']
      ]; return list[s.step];
    }
    function paint() {
      var task = F.tasks[s.step], r = s.repo;
      var intro = '<ol class="advanced-progress" aria-label="Challenge checkpoints">' + ['Files', 'Remote', 'Feature', 'Conflict', 'Revert', 'Recover', 'Explain'].map(function (label, i) { return '<li class="' + (i < s.step ? 'is-done' : i === s.step ? 'is-current' : '') + '"' + (i === s.step ? ' aria-current="step"' : '') + '>' + (i + 1) + ' · ' + label + '</li>'; }).join('') + '</ol><div class="advanced-subtask"><span class="blocklabel">Checkpoint ' + (s.step + 1) + ' of 7</span>' + button('Retry this checkpoint', 'retry') + '</div><h3 class="advanced-mission-title" tabindex="-1">' + h.esc(task.title) + '</h3>' + note(h.esc(task.text));
      var workspace = code(G.status(r), h);
      if (s.step === 0) workspace += '<details><summary>Inspect working files</summary>' + code(Object.keys(r.work).concat(Object.keys(r.untracked)).map(function (f) { return f + '\n' + (r.work[f] === undefined ? r.untracked[f] : r.work[f]); }).join('\n\n'), h) + '</details>' +
        select('fileEnv', '.env · local configuration', [['ignore', 'Keep local and ignore'], ['commit', 'Commit']]) + select('fileDist', 'dist/ · generated output', [['ignore', 'Keep local and ignore'], ['commit', 'Commit']]) + select('fileSource', 'src/app.js · useful source edit', [['commit', 'Commit'], ['ignore', 'Keep local and ignore']]) + button('Save ignore rules', 'ignore', !!s.flags.saved);
      if (s.step === 3) workspace += '<div class="advanced-conflict"><label class="advanced-field">index.html · resolve the heading<textarea id="finalConflict" spellcheck="false"' + (!r.pending ? ' disabled' : '') + '>' + h.esc(s.draft) + '</textarea></label>' + button('Save edited file', 'save-heading', !r.pending) + '</div>';
      if (s.step === 6) workspace += note('Inspect these commits: <strong>' + h.esc([s.flags.bad, s.flags.reverted, s.flags.lost].join(' · ')) + '</strong>. Inspected: ' + s.inspected.length + '/3.') +
        select('historyChoice', 'What happened to the shared regression?', [['preserve', 'It remains in history; a new commit reverses its change.'], ['erase', 'Its commit was erased.']]) +
        select('strategyChoice', 'How did you update the unpublished feature?', [['merge', 'Merge: join both histories with two parents.'], ['rebase', 'Rebase: replay the feature change with a new parent.']]) +
        '<label class="advanced-field">Explain your choices and the recovery<textarea id="reflection" placeholder="I chose… The graph shows… I recovered…">' + h.esc(s.explanation) + '</textarea></label><label class="advanced-check"><input id="selfReview" type="checkbox">I checked my explanation against the graph and commit details.</label>' + note('The choices above are checked. Your written explanation is saved for self-review, not automatically graded for meaning.') + button('Complete the final review', 'reflect', s.done, true);
      if (s.step < 6) workspace += '<details open class="lesson-hint"><summary>Need a hint?</summary>' + note(h.esc(task.hint)) + '</details>';
      /* No command-guide button row here: the command list is deliberately gone
         (course-labs.js 17.2 item 5); the terminal's own note covers it. */
      workspace += T.form({ id: 'final', command: commands().join('  ·  '), value: T.valueOf(view.board, 'final'), placeholder: 'git status', run: 'Run', note: 'Also accepts status, diff and log. Nothing runs a real Git process.' }) + code(s.log.slice(-5).join('\n\n'), h);
      if (F.isComplete(s) && s.step < 6) workspace += '<div class="advanced-actions">' + button('Checkpoint complete · continue', 'next', false, true) + '</div>';
      /* The "saved in this browser" note shows only on the first checkpoint; storage
         failure is an exception and shows every time. */
      view.board.innerHTML = intro + '<div class="advanced-grid">' + panel('Your workspace', workspace) + graph(r, selected, expanded, h) + '</div>' +
        (saveFailed
          ? note('Browser storage is unavailable. Your work is kept only while this page stays open.')
          : (s.step === 0 ? note('Saved in this browser.') : ''));
      view.placeFeedback();
      if (s.step === 0 && s.flags.classified) {
        view.board.querySelector('#fileEnv').value = 'ignore'; view.board.querySelector('#fileDist').value = 'ignore'; view.board.querySelector('#fileSource').value = 'commit';
      }
      var terminal = view.board.querySelector('.gitterm + .advanced-output');
      terminal.scrollTop = terminal.scrollHeight;
      var editor = view.board.querySelector('#finalConflict'); if (editor) editor.addEventListener('input', function () { s.draft = editor.value; save(); api.wait(); });
      var reflection = view.board.querySelector('#reflection'); if (reflection) reflection.addEventListener('input', function () { s.explanation = reflection.value; s.done = false; save(); api.wait(); view.board.querySelector('[data-action="reflect"]').disabled = false; });
      if (s.step === 6) {
        if (s.done) {
          view.board.querySelector('#historyChoice').value = 'preserve'; view.board.querySelector('#strategyChoice').value = s.flags.strategy; view.board.querySelector('#selfReview').checked = true;
        }
        ['#historyChoice', '#strategyChoice', '#selfReview'].forEach(function (id) {
          view.board.querySelector(id).addEventListener('change', function () { s.done = false; save(); api.wait(); view.board.querySelector('[data-action="reflect"]').disabled = false; });
        });
      }
      if (s.done) api.ready(); else api.wait();
    }
    function report(message, good) { save(); paint(); view.notify(message, good); }
    T.bind(view.board, function (id, typed, formEl) {
      try {
        s = F.run(s, typed);
        /* Clear the input before repaint: paint uses valueOf, so a just-run command would be read back. */
        var input = formEl.querySelector('[data-gitterm-input]');
        if (input) input.value = '';
        report(F.isComplete(s) ? 'Checkpoint complete. Your repository state meets the goal.' : 'Command completed. Inspect the result before your next step.', F.isComplete(s));
        (view.board.querySelector('[data-gitterm="final"] [data-gitterm-input]') || view.board).focus({ preventScroll: true });
      } catch (error) {
        if (error && error.isCommandMismatch) T.reject(formEl);
        else view.notify(error.message, false);
        var keep = formEl.querySelector('[data-gitterm-input]');
        if (keep) keep.focus({ preventScroll: true });
      }
    });
    view.board.addEventListener('click', function (e) {
      var node = e.target.closest('[data-node]'), btn = e.target.closest('[data-action]');
      if (node) {
        selected = node.dataset.node;
        if (s.step === 6 && [s.flags.bad, s.flags.reverted, s.flags.lost].includes(selected) && !s.inspected.includes(selected)) s.inspected.push(selected);
        save(); paint(); view.board.querySelector('[data-node="' + selected + '"]').focus({ preventScroll: true }); return;
      }
      if (!btn || btn.disabled) return;
      var action = btn.dataset.action;
      try {
        /* The `cmd-N` handler (command-guide buttons filling the input) was removed with that panel. */
        if (action === 'expand') { expanded = !expanded; paint(); return; }
        if (action === 'retry') { s = F.retry(s); selected = null; report('Checkpoint restored. Earlier repairs are unchanged.', false); }
        if (action === 'next') { s = F.next(s); selected = null; report('Checkpoint saved. The next situation continues in the same repository.', true); }
        if (action === 'ignore') { s = F.ignore(s, view.board.querySelector('#fileEnv').value, view.board.querySelector('#fileDist').value, view.board.querySelector('#fileSource').value); report('Ignore rules saved. Inspect which files are still tracked.', true); }
        if (action === 'save-heading') { s = F.saveHeading(s, s.draft); report('Saved to the working tree. Staging and finishing are separate steps.', true); }
        if (action === 'reflect') { s = F.reflect(s, view.board.querySelector('#reflection').value, view.board.querySelector('#historyChoice').value, view.board.querySelector('#strategyChoice').value, view.board.querySelector('#selfReview').checked); report('All seven challenges complete. Your explanation and repaired repository are saved.', true); }
        if (action === 'next' || action === 'retry') view.board.querySelector('.advanced-mission-title').focus({ preventScroll: false });
      } catch (error) { view.notify(error.message, false); }
    });
    save(); paint(); return {};
  };
  // Keep the existing reset available before mounting a lab and after chapter switches.
  beats.finalLab.onRestart = function () { try { localStorage.removeItem(saveKey); } catch (e) { /* In-memory mode. */ } };
})();

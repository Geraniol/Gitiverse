(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./advanced-lab-model.js'));
  } else {
    root.Chapter13State = factory(root.AdvancedGit);
    root.Chapter13Sessions = root.Chapter13State.createStore(function () { return root.localStorage; });
  }
})(typeof window === 'undefined' ? globalThis : window, function (G) {
  'use strict';
  var STORAGE_KEY = 'gitcourse.lab.chapter13.v3';
  var VERSION = 1;
  var assignments = [
    { role: 'Alice', work: 'Login Feature', branch: 'feature/login' },
    { role: 'Bob', work: 'User Profiles', branch: 'feature/profile' },
    { role: 'Carol', work: 'Website Header', branch: 'fix/header' }
  ];

  var development = [
    { role: 'Alice', branch: 'feature/login', message: 'Add login', patch: {
      'login.js': 'const loginEnabled = true;', 'config.js': 'const timeout = 5000;',
      'index.html': '<h1>PixelWorks · sign in</h1>' } },
    { role: 'Bob', branch: 'feature/profile', message: 'Add profile', patch: {
      'profile.js': 'const profileEnabled = true;' } },
    { role: 'Carol', branch: 'fix/header', message: 'Fix welcome heading', patch: {
      'index.html': '<h1>Welcome to PixelWorks</h1>' } }
  ];
  function developmentView(s) {
    var d = s && s.data.development, r = s && s.repo;
    if (!d || !r) return { started: false, complete: false, completed: [] };
    var completed = development.filter(function (person) {
      var id = d.commits[person.role], c = r.commits[id];
      var expected = Object.assign({}, G.tree(r, d.base), person.patch);
      return c && c.parents.length === 1 && c.parents[0] === d.base && c.author === person.role &&
        !G.changes(expected, c.tree).length && r.branches[person.branch] && G.ancestor(r, id, r.branches[person.branch]);
    }).map(function (person) { return person.role; });
    var person = development.find(function (p) { return !completed.includes(p.role); });
    var phase = !person ? 'complete' : !r.branches[person.branch] ? 'branch' :
      r.branch !== person.branch ? 'switch' : d.prepared !== person.role ? 'prepare' :
      G.changes(r.index, r.work).length ? 'stage' : 'commit';
    return G.copy({ started: true, complete: completed.length === 3, completed: completed,
      person: person || null, phase: phase, base: d.base, explanation: d.explanation });
  }

  function assignmentResult(choices) {
    return assignments.map(function (person, i) {
      if (!choices[i]) return 'No branch is selected for ' + person.role + '. Each teammate needs a branch for their work. Check the branch name for ' + person.work.toLowerCase() + '.';
      if (choices[i] !== person.branch) return person.role + ' is assigned to ' + choices[i] + ', which does not describe ' + person.work.toLowerCase() + '. Match the branch name to this teammate\'s responsibility.';
      return '';
    }).filter(Boolean).join(' ');
  }

  function need(ok, message) { if (!ok) throw new Error(message); }
  function object(value) { return !!value && typeof value === 'object' && !Array.isArray(value); }
  function strings(value) { return object(value) && Object.values(value).every(function (v) { return typeof v === 'string'; }); }
  function empty() { return { version: VERSION, active: null, main: null, prepared: null }; }
  function validRepo(r) {
    if (!object(r) || !Number.isSafeInteger(r.serial) || r.serial < 1 || !object(r.commits) ||
        !strings(r.branches) || !Object.hasOwn(r.branches, r.branch) || !strings(r.remote) ||
        !strings(r.tracking) || !strings(r.tags) || !strings(r.work) || !strings(r.index) ||
        !strings(r.untracked) || !Array.isArray(r.reflog)) return false;
    function known(id) { return typeof id === 'string' && Object.hasOwn(r.commits, id); }
    var ids = Object.keys(r.commits);
    if (!ids.length || !ids.every(function (id) {
      var c = r.commits[id], serial = Number(id.slice(1));
      return /^c\d+$/.test(id) && serial >= 1 && serial <= r.serial && object(c) && c.id === id &&
        strings(c.tree) && typeof c.message === 'string' && typeof c.author === 'string' &&
        typeof c.time === 'string' && Array.isArray(c.files) && c.files.every(function (f) { return typeof f === 'string'; }) &&
        Array.isArray(c.parents) && c.parents.every(function (p) { return known(p) && Number(p.slice(1)) < serial; });
    })) return false;
    if (![r.branches, r.remote, r.tracking, r.tags].every(function (refs) { return Object.values(refs).every(known); })) return false;
    if (!r.reflog.every(function (entry) {
      return object(entry) && known(entry.id) && (entry.from == null || known(entry.from)) && typeof entry.reason === 'string';
    })) return false;
    if (r.pending !== null) {
      var p = r.pending;
      if (!object(p) || !['merge', 'rebase'].includes(p.method) || !known(p.old) || !known(p.onto) ||
          !Array.isArray(p.conflicts) || !p.conflicts.every(function (f) { return typeof f === 'string'; }) ||
          !Array.isArray(p.staged) || !p.staged.every(function (f) { return p.conflicts.includes(f); })) return false;
    }
    if (r.stash !== null && (!object(r.stash) || !strings(r.stash.base) || !strings(r.stash.work))) return false;
    return true;
  }
  function validSnapshot(s, planning) { return object(s) && (validRepo(s.repo) || (planning && s.repo === null)) && object(s.data); }
  function validSession(s, planning) {
    return validSnapshot(s, planning) && object(s.exercise) && typeof s.exercise.id === 'string' &&
      !!s.exercise.id.trim() && validSnapshot(s.exercise.initial, planning);
  }
  function validState(s) {
    return object(s) && s.version === VERSION && (s.main === null || validSession(s.main, true)) &&
      (s.prepared === null || validSession(s.prepared)) &&
      (s.active === null ? s.main === null && s.prepared === null :
        ['main', 'prepared'].includes(s.active) && !!s[s.active]);
  }
  function session(repo, id, data, planning) {
    need(typeof id === 'string' && !!id.trim(), 'Choose an exercise ID before starting practice.');
    var snapshot = G.copy({ repo: repo, data: data || {} });
    need(validSnapshot(snapshot, planning), 'The repository state is incomplete. Start with a valid teaching repository.');
    return { repo: snapshot.repo, data: snapshot.data, exercise: { id: id, initial: G.copy(snapshot) } };
  }

  /* The storage provider is resolved inside try/catch because accessing
   * window.localStorage itself can fail, including under file://. */
  function createStore(storage) {
    var state = null, persistence = { status: 'empty', message: '' };
    function storageObject() {
      var target = typeof storage === 'function' ? storage() : storage;
      need(target && typeof target.getItem === 'function' && typeof target.setItem === 'function', 'Storage unavailable');
      return target;
    }
    function load() {
      if (state) return;
      state = empty();
      var raw;
      try { raw = storageObject().getItem(STORAGE_KEY); }
      catch (error) {
        persistence = { status: 'memory', message: 'Browser storage is unavailable. Work will remain only while this page stays open.' };
        return;
      }
      if (raw === null) return;
      try {
        var saved = JSON.parse(raw);
        need(validState(saved), 'Invalid session');
        state = saved;
        persistence = { status: 'saved', message: '' };
      } catch (error) {
        persistence = { status: 'invalid', message: 'The saved practice could not be restored. Start a new practice to replace it.' };
      }
    }
    function persist() {
      try {
        storageObject().setItem(STORAGE_KEY, JSON.stringify(state));
        persistence = { status: 'saved', message: '' };
      } catch (error) {
        persistence = { status: 'memory', message: 'Your latest work could not be saved. It remains in this page; reloading may restore an older save.' };
      }
    }
    function existing(kind) {
      load();
      need(['main', 'prepared'].includes(kind) && state[kind], 'This practice has not started. Start a session before changing its repository.');
      return state[kind];
    }
    function read() { load(); return G.copy(state); }
    function storageStatus() { load(); return G.copy(persistence); }
    function startMain() {
      load();
      if (!state.main || state.main.repo === null) state.main = session(G.create(), 'main', state.main ? state.main.data : {});
      state.active = 'main';
      persist();
      return read();
    }
    /* Call only from an explicit start action. Replaces the single prepared
     * slot without borrowing references from, or creating, the main session. */
    function startPrepared(repo, exerciseId, data) {
      load();
      var prepared = session(repo, exerciseId, data);
      state.prepared = prepared;
      state.active = 'prepared';
      persist();
      return read();
    }
    function select(kind) {
      existing(kind);
      if (state.active !== kind) { state.active = kind; persist(); }
      return read();
    }
    /* Capture one exercise-start baseline, never a history of task snapshots.
     * Re-entering the same exercise does not move its restart point. */
    function beginExercise(kind, exerciseId) {
      var s = existing(kind);
      need(typeof exerciseId === 'string' && !!exerciseId.trim(), 'Choose an exercise ID before starting practice.');
      if (s.exercise.id !== exerciseId) {
        s.exercise = { id: exerciseId, initial: G.copy({ repo: s.repo, data: s.data }) };
        persist();
      }
      return read();
    }
    /* Lesson code edits a detached draft. Rejected operations cannot leave a
     * half-updated repository, and retained callback references cannot mutate
     * the stored state later. Only synchronous operations are accepted. */
    function update(kind, operation) {
      var s = existing(kind);
      need(typeof operation === 'function', 'Provide a repository operation before updating practice.');
      var draft = G.copy({ repo: s.repo, data: s.data });
      var result = operation(draft);
      need(!result || typeof result.then !== 'function', 'Repository operations must finish synchronously before saving.');
      need(validSnapshot(draft, kind === 'main' && s.repo === null), 'The operation produced an incomplete repository. The previous state has been kept.');
      var saved = G.copy(draft);
      s.repo = saved.repo;
      s.data = saved.data;
      persist();
      return read();
    }
    function restartCurrent() {
      load();
      if (!state.active) return read();
      var s = state[state.active], initial = G.copy(s.exercise.initial);
      s.repo = initial.repo;
      s.data = initial.data;
      persist();
      return read();
    }
    function readAssignment() {
      load();
      var saved = state.main && state.main.data.assignment;
      var choices = assignments.map(function (person, i) {
        var value = saved && Array.isArray(saved.choices) ? saved.choices[i] : '';
        return assignments.some(function (p) { return p.branch === value; }) ? value : '';
      });
      return { choices: choices, confirmed: !!(saved && saved.confirmed === true && !assignmentResult(choices)) };
    }
    function saveAssignment(choices, confirm) {
      need(Array.isArray(choices) && choices.length === assignments.length && choices.every(function (value) {
        return value === '' || assignments.some(function (p) { return p.branch === value; });
      }), 'Choose a branch from each list before saving the assignment plan.');
      if (confirm) need(!assignmentResult(choices), assignmentResult(choices));
      load();
      /* Planning is metadata only. Git initialization belongs to a later,
       * explicit startMain action, never to matching or viewing this section. */
      if (!state.main) state.main = session(null, 'assign', {}, true);
      state.main.data.assignment = { choices: choices.slice(), confirmed: !!confirm };
      state.active = 'main';
      persist();
      return readAssignment();
    }
    function restartAssignment() {
      load();
      if (state.main && Object.hasOwn(state.main.data, 'assignment')) {
        delete state.main.data.assignment;
        persist();
      }
      return readAssignment();
    }
    function readDevelopment() { load(); return developmentView(state.main); }
    function startDevelopment() {
      load();
      if (state.main && state.main.data.development) return readDevelopment();
      var current = state.main, repo = current && current.repo ? G.copy(current.repo) : G.create();
      need(repo.branch === 'main' && G.clean(repo) && !Object.keys(repo.untracked).length &&
        !development.some(function (p) { return Object.hasOwn(repo.branches, p.branch); }),
        'This repository has unfinished work or existing team branches. Starting here could overwrite your work. Check the current branch and files before starting development.');
      var next = session(repo, 'develop', current ? current.data : {});
      next.data.development = { base: repo.branches.main, commits: {}, prepared: null,
        explanation: 'Main is the shared starting snapshot. Creating a branch adds a name; it does not copy another teammate\'s later commits.' };
      state.main = next; state.active = 'main'; persist();
      return readDevelopment();
    }
    function developmentDraft(s) {
      var view = developmentView(s);
      need(view.started, 'Development has not started. Use Start development practice before running a command.');
      need(s.repo.branches.main === view.base && !s.repo.pending,
        'The shared starting point has changed or an integration is unfinished. This exercise needs its original main snapshot. Check the repository before continuing.');
      return view;
    }
    function prepareDevelopment() {
      update('main', function (s) {
        var view = developmentDraft(s), person = view.person;
        need(person && view.phase === 'prepare', 'Files cannot be prepared at this step. The current task needs its own branch and a clean workspace. Check the task and switch to the named branch first.');
        need(G.clean(s.repo) && !Object.keys(s.repo.untracked).length && G.tip(s.repo) === view.base,
          'This branch already contains work. Preparing files could replace it. Check its status and history before continuing.');
        Object.assign(s.repo.work, person.patch);
        s.data.development.prepared = person.role;
        s.data.development.explanation = person.role + '\'s changes are now in the Working Directory only. The Staging Area and commit history have not changed. Inspect the file contents before using git add.';
      });
      return readDevelopment();
    }
    function developmentCommand(typed) {
      load();
      var current = existing('main'), input = String(typed || '').trim(), r = current.repo;
      need(r && current.data.development, 'Development has not started. Use Start development practice before running a command.');
      if (/^git\s+status$/.test(input)) return G.status(r);
      if (/^git\s+diff(?:\s+--staged)?$/.test(input)) {
        var staged = /--staged$/.test(input), before = staged ? G.tree(r, G.tip(r)) : r.index, after = staged ? r.index : r.work;
        return G.changes(before, after).map(function (file) {
          return file + '\n- ' + (before[file] === undefined ? '(not present)' : before[file]) + '\n+ ' + (after[file] === undefined ? '(not present)' : after[file]);
        }).join('\n\n') || 'No changes in this comparison.';
      }
      var output;
      update('main', function (s) {
        var view = developmentDraft(s), person = view.person, repo = s.repo, d = s.data.development;
        var create = input.match(/^git\s+(branch|switch\s+-c|checkout\s+-b)\s+(\S+)(?:\s+(\S+))?$/);
        var switchTo = input.match(/^git\s+(?:switch|checkout)\s+(\S+)$/);
        var add = input.match(/^git\s+add\s+(.+)$/);
        var commit = input.match(/^git\s+commit\s+-m\s+(?:"([^"\n]+)"|'([^'\n]+)')$/);
        if (create) {
          var name = create[2], source = create[3];
          need(!Object.hasOwn(repo.branches, name), 'Branch ' + name + ' already exists. Branch names must be unique. Use git switch ' + name + ' to inspect it.');
          need(person && name === person.branch, 'This branch does not match the current teammate. Branch names identify independent tasks. Check the name shown in Your Goal.');
          need(G.clean(repo) && !Object.keys(repo.untracked).length, 'There are uncommitted changes. Switching or creating another task branch could carry unfinished work across tasks. Stage and commit the current teammate\'s files first.');
          need((!source && repo.branch === 'main') || source === 'main', 'This branch must start at the initial main commit. The current feature branch may contain another teammate\'s work. Specify main as the starting point.');
          if (create[1] === 'branch') repo.branches[name] = d.base;
          else G.checkout(repo, name, d.base);
          output = 'Created ' + name + ' at ' + d.base + ', the shared main snapshot. ' +
            (create[1] === 'branch' ? 'HEAD has not moved; switch to the new branch before preparing files.' : 'HEAD now points to the new branch. No files have been changed.');
        } else if (switchTo) {
          var target = switchTo[1];
          need(G.clean(repo) && !Object.keys(repo.untracked).length, 'There are uncommitted changes. Switching now would mix unfinished work with another task. Stage and commit the current teammate\'s files before switching.');
          need(target === 'main' || development.some(function (p) { return p.branch === target; }),
            'This branch is outside the team exercise. The task uses main and the three planned branches. Check the branch names in the task.');
          need(Object.hasOwn(repo.branches, target), 'Branch ' + target + ' does not exist yet. Switching uses an existing branch. Create the current teammate\'s branch from main first.');
          G.checkout(repo, target);
          output = 'HEAD now points to ' + target + '. The Working Directory and Staging Area match that branch\'s snapshot; other branch histories are unchanged.';
        } else if (add || commit) {
          need(person, 'All three development tasks are complete. Additional staging or commits would change the finished exercise. Inspect the graph, switch branches, or restart this practice to try again.');
          need(repo.branch === person.branch, 'You are on the wrong branch for this task. A commit belongs to the checked-out branch. Check Your Goal and switch to ' + person.branch + ' before changing files.');
          need(d.prepared === person.role, 'The task files have not been prepared. There are no task changes to stage or commit yet. Use the Load Sample Changes button for the current teammate, then inspect the Working Directory.');
          var files = Object.keys(person.patch);
          if (add) {
            var paths = add[1].trim() === '.' ? G.changes(repo.index, repo.work) : add[1].trim().split(/\s+/);
            need(paths.length && paths.every(function (file) { return files.includes(file) && repo.work[file] === person.patch[file]; }),
              'The staging request contains an unrelated, missing, or changed file. This task only stages ' + files.join(', ') + '. Check the Working Directory and use those file names.');
            paths.forEach(function (file) { G.stage(repo, file); });
            output = 'Staged ' + paths.join(', ') + '. git add copied these file versions into the Staging Area; it did not create a commit. ' +
              (G.changes(repo.index, repo.work).length ? 'Some changes are still outside the Staging Area. Inspect them before committing.' : 'The task files are ready for a commit.');
          } else {
            need(G.changes(G.tree(repo, G.tip(repo)), repo.index).length,
              'Nothing is staged. git commit records the Staging Area, not all working files. Inspect the Working Directory and run git add for the task files first.');
            var expected = Object.assign({}, G.tree(repo, d.base), person.patch);
            need(!G.changes(expected, repo.index).length,
              'The Staging Area is incomplete or contains unrelated changes. This task needs exactly ' + files.join(', ') + '. Inspect git diff --staged and stage every required file before committing.');
            need(G.tip(repo) === d.base, 'This branch no longer starts at the expected snapshot. Committing here would mix task histories. Inspect the graph and the original main commit.');
            var message = (commit[1] || commit[2]).trim();
            need(message, 'The commit message is empty. A message explains the saved change. Describe the teammate\'s work after -m.');
            var id = G.commit(repo, message, person.role);
            d.commits[person.role] = id; d.prepared = null;
            output = person.role + ' committed the staged snapshot as ' + id + '. The graph now has a new commit on ' + person.branch + '; main and the other branches have not moved.';
          }
        } else {
          throw new Error('This command is not available in the current development task. The exercise separates branch creation, switching, staging and committing. Check Your Goal or open Need a Hint?; use git status or git diff to inspect files.');
        }
        d.explanation = output;
      });
      return output;
    }
    function readDevelopmentHistory() {
      load();
      var d = state.main && state.main.data.development;
      return G.copy(d && Array.isArray(d.history) ? d.history : []);
    }
    /* Terminal records belong to this main exercise, never the active slot.
     * A rejected Git command can add a record without changing its repository. */
    function recordDevelopmentCommand(command, output, success) {
      need(typeof command === 'string' && typeof output === 'string' && typeof success === 'boolean',
        'A terminal record needs a command, output and result.');
      update('main', function (s) {
        need(s.data.development, 'Start development practice before recording terminal commands.');
        if (!Array.isArray(s.data.development.history)) s.data.development.history = [];
        s.data.development.history.push({ command: command, output: output, success: success });
      });
    }
    function restartDevelopment() {
      load();
      if (!state.main || !state.main.data.development) return readDevelopment();
      need(state.main.exercise.id === 'develop', 'A different exercise now owns the restart point. Restarting development could remove later work. Return to the current exercise to restart it.');
      state.main.repo = G.copy(state.main.exercise.initial.repo);
      delete state.main.data.development;
      persist();
      return readDevelopment();
    }
    function synchronizationKind() {
      load();
      if (state.active && (state[state.active].data.synchronization || state[state.active].data.synchronizationReady)) return state.active;
      if (state.main && state.main.data.synchronization) return 'main';
      if (state.prepared && state.prepared.data.synchronization) return 'prepared';
      return 'main';
    }
    function synchronizationEligible(s) {
      return !!(s && developmentView(s).complete && G.clean(s.repo) && !Object.keys(s.repo.untracked).length &&
        s.repo.branches.main === s.data.development.base && development.every(function (p) {
          return s.repo.branches[p.branch] === s.data.development.commits[p.role];
        }));
    }
    function resolvedHeading(value) {
      if (typeof value !== 'string' || /<<<<<<<|=======|>>>>>>>/.test(value)) return false;
      var headings = value.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/gi) || [];
      return headings.some(function (heading) {
        var text = heading.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
        return /welcome to pixelworks/i.test(text) && /sign[ -]in/i.test(text);
      });
    }
    function synchronizationView(s) {
      var d = s && s.data.synchronization, r = s && s.repo;
      if (!d) return { started: false, complete: false, phase: 'start' };
      var merge = d.merge && r.commits[d.merge];
      var expected = Object.assign({}, G.tree(r, d.login), { 'profile.js': G.tree(r, d.remote)['profile.js'] });
      if (merge) expected['index.html'] = merge.tree['index.html'];
      var merged = !!(merge && merge.parents.length === 2 && merge.parents[0] === d.login && merge.parents[1] === d.remote &&
        resolvedHeading(merge.tree['index.html']) && !G.changes(expected, merge.tree).length &&
        G.ancestor(r, d.merge, r.branches['feature/login']));
      var complete = !!(merged && d.fetched && d.staged && d.pushed && r.tracking.main === d.remote &&
        G.ancestor(r, d.merge, r.remote['feature/login']) &&
        G.ancestor(r, d.remote, r.remote.main) && r.branches.main === d.base &&
        (s.data.review || G.clean(r)));
      var phase = complete ? 'complete' : !d.returned || r.branch !== 'feature/login' ? 'return' : merged ? 'push' :
        !d.fetched ? 'fetch' : !r.pending ? 'merge' : !resolvedHeading(r.work['index.html']) ? 'resolve' :
        !r.pending.staged.includes('index.html') || r.index['index.html'] !== r.work['index.html'] ? 'stage' : 'commit';
      return G.copy({ started: true, complete: complete, phase: phase, explanation: d.explanation,
        base: d.base, login: d.login, remote: d.remote, merge: d.merge, draft: d.draft, merged: merged });
    }
    function readSynchronization() {
      var kind = synchronizationKind(), view = synchronizationView(state[kind]);
      view.kind = kind;
      view.mainEligible = synchronizationEligible(state.main);
      return view;
    }
    function startSynchronization(kind) {
      load();
      need(kind === 'main' || kind === 'prepared', 'Choose Main Session or Prepared Practice before starting.');
      if (state[kind] && state[kind].data.synchronization) { select(kind); return readSynchronization(); }
      var source;
      if (kind === 'main') {
        need(synchronizationEligible(state.main), 'Main Session is not ready. This practice needs the three clean Stage 2 branches at their original tips. Finish Stage 2 or explicitly start Prepared Practice.');
        source = G.copy({ repo: state.main.repo, data: state.main.data });
      } else {
        var repo = G.create(), base = repo.branches.main;
        var d = { base: base, commits: {}, prepared: null, explanation: 'Prepared example; these commits were supplied, not performed in Stage 2.' };
        development.forEach(function (person) {
          G.checkout(repo, person.branch, base);
          d.commits[person.role] = G.editCommit(repo, person.patch, person.message, person.role);
        });
        source = { repo: repo, data: { development: d } };
      }
      if (kind === 'prepared' && state.prepared && state.prepared.data.synchronizationReady) source = G.copy({ repo: state.prepared.repo, data: state.prepared.data });
      var next = session(source.repo, 'synchronize', source.data), r = next.repo, dev = next.data.development;
      // Simulate teammates integrating their real branch snapshots on the remote.
      // The object store is shared by this teaching model; refs distinguish visibility.
      var remoteTree = Object.assign({}, G.tree(r, dev.commits.Bob), { 'index.html': G.tree(r, dev.commits.Carol)['index.html'] });
      var remote = G.record(r, [dev.commits.Bob, dev.commits.Carol], remoteTree, 'Integrate profile and header on remote main', 'PixelWorks team');
      r.remote.main = remote;
      r.tracking.main = dev.base;
      next.data.synchronization = { base: dev.base, login: dev.commits.Alice, remote: remote,
        returned: false, fetched: false, staged: false, merge: null, pushed: false, draft: '', history: [],
        explanation: 'Simulated team event: Bob and Carol integrated their work on remote main. Local origin/main still points to the original snapshot. Switch to Alice\'s branch yourself.' };
      state[kind] = next; state.active = kind; persist();
      return readSynchronization();
    }
    function synchronizationCommand(typed) {
      var kind = synchronizationKind(), current = existing(kind), input = String(typed || '').trim();
      need(current.data.synchronization, 'Synchronization has not started. Choose the explicit start button before running commands.');
      if (/^git\s+status$/.test(input)) return G.status(current.repo);
      if (/^git\s+diff(?:\s+--staged)?$/.test(input)) {
        var r = current.repo, staged = /--staged$/.test(input);
        var before = staged ? G.tree(r, G.tip(r)) : r.index, after = staged ? r.index : r.work;
        return G.changes(before, after).map(function (f) { return f + '\n- ' + (before[f] || '(absent)') + '\n+ ' + (after[f] || '(absent)'); }).join('\n\n') || 'No changes in this comparison.';
      }
      var output;
      update(kind, function (s) {
        var r = s.repo, d = s.data.synchronization, view = synchronizationView(s);
        need(!view.complete, 'Stage 3 is already complete. Publishing again is unnecessary. Inspect the history or restart this practice.');
        if (/^git\s+(?:switch|checkout)\s+feature\/login$/.test(input)) {
          need(view.phase === 'return', 'Alice\'s branch is already selected for this task. Repeating the switch does not advance synchronization. Check Your Goal.');
          need(G.clean(r), 'Uncommitted changes prevent switching safely. Finish the current work before returning to Alice.');
          G.checkout(r, 'feature/login'); d.returned = true;
          output = 'HEAD now points to feature/login. Merge will update Alice\'s feature, while local main and the other team branches stay unchanged.';
        } else {
          need(r.branch === 'feature/login' && d.returned, 'This operation needs Alice\'s feature/login branch. Merging elsewhere would update the wrong branch. Run git switch feature/login first.');
          if (/^git\s+fetch(?:\s+origin)?$/.test(input)) {
            need(view.phase === 'fetch', 'Remote updates were already fetched or integration is in progress. Fetch does not resolve conflicts. Check the current task.');
            G.fetch(r); d.fetched = true;
            output = 'Fetch updated local origin/main to ' + d.remote + '. Remote main, local main, feature/login, the Working Directory and Staging Area were not changed by fetch. Integration is a separate operation.';
          } else if (/^git\s+merge\s+origin\/main$/.test(input)) {
            need(d.fetched && r.tracking.main === d.remote, 'The latest remote main has not been fetched. origin/main is only a local record of the remote. Run git fetch before merging.');
            need(view.phase === 'merge', 'A merge is already pending or completed. Starting another merge would skip conflict resolution. Inspect the current task and git status.');
            G.integrate(r, r.tracking.main, 'merge');
            need(r.pending && r.pending.conflicts.length === 1 && r.pending.conflicts[0] === 'index.html', 'The expected heading conflict was not found. The branch snapshots differ from this exercise. Restart the current practice to inspect its starting state.');
            // The engine stores markers in its index placeholder; pending.staged
            // is authoritative until the learner explicitly stages the resolution.
            d.draft = r.work['index.html'];
            output = 'Merge paused with a conflict in index.html. Alice changed the sign-in heading; Carol changed the welcome heading. Git cannot choose the intended text. No merge commit has been created. The non-conflicting profile.js change is staged by merge.';
          } else if (/^git\s+add\s+index\.html$/.test(input)) {
            need(r.pending && resolvedHeading(r.work['index.html']), 'index.html is not correctly resolved. Remove all conflict markers and keep both the welcome wording and sign-in purpose in an h1 heading. Save your edited file before staging.');
            need(view.phase === 'stage', 'The resolved file is already staged. Staging it again adds no new result. Inspect the Staging Area and complete the merge commit.');
            G.stage(r, 'index.html'); d.staged = true;
            output = 'git add copied the resolved index.html into the Staging Area and marked its conflict as resolved. No commit was created. Inspect the staged version before finishing the merge.';
          } else if (/^git\s+commit$/.test(input)) {
            need(view.phase === 'commit' && d.staged && r.pending && resolvedHeading(r.index['index.html']) && r.index['index.html'] === r.work['index.html'], 'The merge cannot be committed yet. Its resolved file must be saved and explicitly staged without conflict markers. Inspect git status, save the resolution and run git add index.html.');
            d.merge = G.finish(r);
            output = 'Created merge commit ' + d.merge + ' from the Staging Area. Its parents are Alice\'s previous commit and fetched origin/main. This simulator uses the merge message "Merge shared changes"; no external editor opens.';
          } else if (/^git\s+push\s+origin\s+feature\/login$/.test(input)) {
            need(view.merged && view.phase === 'push' && G.clean(r), 'The feature cannot be pushed yet. A correctly staged two-parent merge commit is required. Finish conflict resolution, git add and git commit first.');
            G.push(r, 'feature/login'); d.pushed = true;
            output = 'Remote feature/login and local origin/feature/login now point to ' + d.merge + '. Push published Alice\'s branch; it did not merge it into remote main or local main.';
          } else throw new Error('This command does not match the current synchronization task. The simulation supports the displayed operation plus git status and git diff. Check Your Goal or Need a Hint? before trying again.');
        }
        d.explanation = output;
      });
      return output;
    }
    function saveSynchronizationDraft(value) {
      update(synchronizationKind(), function (s) {
        need(s.data.synchronization && s.repo.pending, 'There is no conflict to edit. Merge the fetched origin/main before editing a resolution.');
        s.data.synchronization.draft = String(value);
      });
    }
    function resolveSynchronization() {
      update(synchronizationKind(), function (s) {
        var d = s.data.synchronization, r = s.repo;
        need(d && r.pending, 'There is no pending conflict. Fetch and merge origin/main before saving a resolution.');
        need(resolvedHeading(d.draft), 'The resolution is incomplete. Conflict markers must be removed and an h1 heading must preserve both "Welcome to PixelWorks" and "sign in". Compare Current and Incoming versions, then edit and save again.');
        r.work['index.html'] = d.draft;
        d.explanation = 'Saved your edited index.html in the Working Directory only. The conflict still needs your explicit git add index.html, followed by git commit.';
      });
      return readSynchronization();
    }
    function readSynchronizationHistory() {
      var s = read()[synchronizationKind()];
      return G.copy(s && s.data.synchronization ? s.data.synchronization.history : []);
    }
    function recordSynchronizationCommand(command, output, success) {
      update(synchronizationKind(), function (s) { s.data.synchronization.history.push({ command: command, output: output, success: success }); });
    }
    function restartSynchronization() {
      var kind = synchronizationKind(), s = state[kind];
      if (!s || !s.data.synchronization) return readSynchronization();
      need(s.exercise.id === 'synchronize', 'A later exercise owns this restart point. Return to that exercise before restarting to protect its work.');
      s.repo = G.copy(s.exercise.initial.repo);
      delete s.data.synchronization;
      // Retain this one prepared baseline so Restart never allocates another slot.
      if (kind === 'prepared') s.data.synchronizationReady = true;
      persist(); return readSynchronization();
    }
    function reviewKind() {
      load();
      if (state.active && (state[state.active].data.review || state[state.active].data.reviewReady || state[state.active].exercise.id === 'review')) return state.active;
      if (state.main && state.main.data.review) return 'main';
      if (state.prepared && state.prepared.data.review) return 'prepared';
      return state.active === 'prepared' && reviewEligible(state.prepared) ? 'prepared' : 'main';
    }
    function reviewEligible(s) {
      if (!s || !s.repo || !(synchronizationView(s).complete || s.data.reviewReady)) return false;
      var r = s.repo, head = r.branches['feature/login'];
      return !!(head && r.remote.main && G.clean(r) && !Object.keys(r.untracked).length &&
        r.remote['feature/login'] === head && G.ancestor(r, r.remote.main, head) &&
        G.tree(r, head)['config.js'] === 'const timeout = 5000;' && resolvedHeading(G.tree(r, head)['index.html']));
    }
    function reviewView(s) {
      var d = s && s.data.review, r = s && s.repo;
      if (!d) return { started: false, complete: false, phase: 'start' };
      var expected = Object.assign({}, G.tree(r, d.originalHead), { 'config.js': 'const timeout = 500;' });
      var revision = r.commits[d.fixCommit], merge = r.commits[d.mergeCommit];
      var revised = !!(revision && revision.parents.length === 1 && revision.parents[0] === d.originalHead &&
        revision.author === 'Alice' && revision.message === 'Fix login timeout' && !G.changes(expected, revision.tree).length);
      var published = revised && d.pushed && r.remote['feature/login'] === d.fixCommit;
      var approved = published && d.revisionInspected === d.fixCommit && d.approvedHead === d.fixCommit;
      var complete = !!(d.status === 'merged' && approved && merge && merge.parents.length === 2 &&
        merge.parents[0] === d.base && merge.parents[1] === d.approvedHead && !G.changes(expected, merge.tree).length &&
        r.remote.main === d.mergeCommit && r.branches.main === d.localMain);
      var phase = complete ? 'complete' : !d.status ? 'open' : !d.inspectedHead ? 'inspect' :
        d.status === 'open' ? 'request' : !d.saved ? 'fix' : r.branch !== 'feature/login' ? 'return' :
        !revised ? (!G.changes(expected, r.index).length ? 'commit' : 'stage') : !published ? 'push' :
        d.revisionInspected !== d.fixCommit ? 'rereview' : !approved ? 'approve' : 'merge';
      return G.copy({ started: true, complete: complete, phase: phase, status: d.status || 'Not opened',
        role: d.role, explanation: d.explanation, base: d.base, originalHead: d.originalHead,
        fixCommit: d.fixCommit, mergeCommit: d.mergeCommit, approvedHead: d.approvedHead, comment: d.comment });
    }
    function readReview() {
      var kind = reviewKind(), view = reviewView(state[kind]);
      view.kind = kind;
      view.mainEligible = reviewEligible(state.main);
      view.preparedEligible = reviewEligible(state.prepared);
      return view;
    }
    function preparedReviewSource() {
      // Explicit practice fixture only: no earlier-stage completion metadata is created.
      var r = G.create(), base = r.branches.main, commits = {};
      development.forEach(function (person) {
        G.checkout(r, person.branch, base);
        commits[person.role] = G.editCommit(r, person.patch, person.message, person.role);
      });
      var remoteTree = Object.assign({}, G.tree(r, commits.Bob), { 'index.html': G.tree(r, commits.Carol)['index.html'] });
      r.remote.main = G.record(r, [commits.Bob, commits.Carol], remoteTree, 'Integrate profile and header on remote main', 'PixelWorks team');
      G.checkout(r, 'feature/login'); G.fetch(r); G.integrate(r, r.tracking.main, 'merge');
      r.work['index.html'] = '<h1>Welcome to PixelWorks · sign in</h1>';
      G.stage(r, 'index.html'); G.finish(r); G.push(r, 'feature/login');
      return { repo: r, data: { reviewReady: true } };
    }
    function startReview(kind) {
      load();
      need(['main', 'prepared'].includes(kind), 'Choose Main Session or Prepared Practice before opening the review exercise.');
      if (state[kind] && state[kind].data.review) { select(kind); return readReview(); }
      var source;
      if (reviewEligible(state[kind])) source = G.copy({ repo: state[kind].repo, data: state[kind].data });
      else {
        need(kind === 'prepared', 'Main Session is not ready for review. Complete Stage 3 and publish feature/login, or explicitly start isolated Prepared Practice.');
        source = preparedReviewSource();
      }
      var next = session(source.repo, 'review', source.data), r = next.repo;
      next.data.review = { base: r.remote.main, localMain: r.branches.main, originalHead: r.remote['feature/login'],
        role: 'Alice', status: null, inspectedHead: null, saved: false, fixCommit: null, pushed: false,
        revisionInspected: null, approvedHead: null, mergeCommit: null, comment: '', history: [],
        explanation: 'The published login branch is ready for review. Opening a PR records a hosting-platform proposal; it does not change any Git reference.' };
      state[kind] = next; state.active = kind; persist(); return readReview();
    }
    function reviewAction(action, value) {
      update(reviewKind(), function (s) {
        var r = s.repo, d = s.data.review, view = reviewView(s);
        need(d, 'Review practice has not started. Choose a start button before performing review actions.');
        if (action === 'role') {
          need(['Alice', 'Bob'].includes(value), 'Choose Alice or Bob for this review.');
          d.role = value;
          d.explanation = 'Acting as ' + value + '. Changing roles does not switch Git branches or edit repository files.';
          return;
        }
        need(!view.complete, 'This PR is already merged. Inspect its merge commit or restart the current review practice.');
        var authorAction = ['open', 'save', 'merge'].includes(action);
        need(d.role === (authorAction ? 'Alice' : 'Bob'), 'The wrong teammate is acting. Alice authors and merges the PR; Bob reviews it independently. Choose ' + (authorAction ? 'Alice' : 'Bob') + ' before this operation.');
        need(r.remote.main === d.base, 'Remote main changed after this review started. The approved base is no longer current. Restart this practice before reviewing or merging another base.');
        if (action === 'open') {
          need(view.phase === 'open' && r.remote['feature/login'] === d.originalHead, 'The PR cannot be opened in this state. It must propose the published feature/login branch once. Check the current task and remote references.');
          d.status = 'open';
          d.explanation = 'Alice opened feature/login → main on the simulated hosting platform. The PR compares published snapshots; no branch moved and no commit was created.';
        } else if (action === 'inspect') {
          need(['inspect', 'rereview'].includes(view.phase), 'There is no new published revision to inspect at this step. Check the PR status and publish any local revision first.');
          if (view.phase === 'inspect') {
            need(G.tree(r, r.remote['feature/login'])['config.js'] === 'const timeout = 5000;', 'The proposed configuration differs from this exercise. Inspect the published branch and restart review if necessary.');
            d.inspectedHead = r.remote['feature/login'];
            d.explanation = 'Bob inspected the published config.js: 5000 ms is ten times the agreed 500 ms. Request a specific correction before approving.';
          } else {
            need(r.remote['feature/login'] === d.fixCommit && G.tree(r, d.fixCommit)['config.js'] === 'const timeout = 500;', 'The corrected commit is not published. A reviewer sees the remote branch, not local edits. Push the revision first.');
            d.revisionInspected = d.fixCommit;
            d.explanation = 'Bob re-reviewed the published revision. config.js now uses the agreed 500 ms; the login, profile and resolved heading remain intact. Approval is a separate decision.';
          }
        } else if (action === 'request') {
          need(view.phase === 'request' && d.inspectedHead === r.remote['feature/login'], 'The current published change has not been inspected. Review config.js before requesting changes.');
          need(value === 'timeout', 'That feedback does not address the defect. The agreement is 500 ms, while config.js proposes 5000 ms. Compare the values and request the timeout correction.');
          d.status = 'changes-requested'; d.comment = 'Please change timeout from 5000 ms to the agreed 500 ms.';
          d.explanation = 'Bob requested changes: ' + d.comment + ' The PR remains open, but it cannot be approved until Alice publishes the correction.';
        } else if (action === 'save') {
          need(view.phase === 'fix' && r.branch === 'feature/login', 'The revision cannot be saved here. Alice must edit feature/login after Bob requests changes. Check HEAD and switch to feature/login if needed.');
          need(String(value).trim() === '500', 'The timeout does not match the agreement. Bob requested 500 ms, not 5000 ms. Enter 500 and save the working file.');
          need(G.clean(r) && G.tip(r) === d.originalHead, 'The working state differs from the reviewed snapshot. Saving could overwrite unfinished changes. Inspect git status or restart the review practice.');
          r.work['config.js'] = 'const timeout = 500;'; d.saved = true;
          d.explanation = 'Alice saved config.js in the Working Directory only. The Staging Area, commit history and published PR still contain 5000 ms. Stage, commit and push the revision yourself.';
        } else if (action === 'approve') {
          need(view.phase === 'approve' && d.revisionInspected === r.remote['feature/login'], 'The latest published revision has not been re-reviewed. Approval must refer to the exact commit Bob inspected. Inspect the updated config.js first.');
          d.approvedHead = r.remote['feature/login']; d.status = 'approved';
          d.explanation = 'Bob approved commit ' + d.approvedHead + '. Approval records agreement on this exact revision; it does not move main. Alice can now merge through the platform interface.';
        } else if (action === 'merge') {
          need(view.phase === 'merge' && d.approvedHead === r.remote['feature/login'] && G.ancestor(r, d.base, d.approvedHead), 'The PR cannot be merged safely. Its published head must match Bob\'s approval and contain the remote base. Check the latest published revision and approval.');
          // Hosting-platform merge: record both parents on the server, without moving local refs.
          d.mergeCommit = G.record(r, [r.remote.main, d.approvedHead], G.tree(r, d.approvedHead), 'Merge pull request: login feature', 'Alice');
          r.remote.main = d.mergeCommit; d.status = 'merged';
          d.explanation = 'Merged the approved PR as ' + d.mergeCommit + ' on remote main. Its parents join the previous remote main and approved feature revision. Local main, origin/main, HEAD and working files stay unchanged; fetching is a separate operation.';
        } else throw new Error('This review action is not available. Check the current goal and use the corresponding platform control.');
      });
      return readReview();
    }
    function reviewCommand(typed) {
      var kind = reviewKind(), current = existing(kind), input = String(typed || '').trim();
      need(current.data.review, 'Start the review practice before running commands.');
      if (/^git\s+status$/.test(input)) return G.status(current.repo);
      if (/^git\s+diff(?:\s+--staged)?$/.test(input)) {
        var r = current.repo, staged = /--staged$/.test(input);
        var before = staged ? G.tree(r, G.tip(r)) : r.index, after = staged ? r.index : r.work;
        return G.changes(before, after).map(function (f) { return f + '\n- ' + (before[f] || '(absent)') + '\n+ ' + (after[f] || '(absent)'); }).join('\n\n') || 'No changes in this comparison.';
      }
      var output;
      update(kind, function (s) {
        var r = s.repo, d = s.data.review, view = reviewView(s);
        need(d.role === 'Alice', 'Bob is the reviewer, not the author of this revision. Choose Alice before changing or publishing feature/login.');
        need(!view.complete, 'The PR is already merged. Inspect it with git status or restart this review practice to repeat it.');
        if (/^git\s+(?:switch|checkout)\s+feature\/login$/.test(input)) {
          need(r.branch !== 'feature/login' && G.clean(r), 'Switching is unnecessary or unfinished changes prevent it. Check HEAD and git status before switching to feature/login.');
          G.checkout(r, 'feature/login'); output = 'HEAD now points to feature/login. Changing branches did not modify the published PR.';
        } else {
          need(r.branch === 'feature/login', 'This command would affect the wrong branch. Alice\'s review revision belongs on feature/login. Run git switch feature/login first.');
          var expected = Object.assign({}, G.tree(r, d.originalHead), { 'config.js': 'const timeout = 500;' });
          if (/^git\s+add\s+config\.js$/.test(input)) {
            need(view.phase === 'stage' && d.saved && !G.changes(expected, r.work).length, 'config.js is not ready to stage. Save the requested 500 ms correction in the Working Directory first, then stage exactly config.js.');
            G.stage(r, 'config.js'); output = 'Staged config.js at 500 ms. git add copied the working version into the index; no commit was created and the PR is unchanged.';
          } else if (/^git\s+commit(?:\s|$)/.test(input)) {
            need(view.phase === 'commit' && G.changes(G.tree(r, G.tip(r)), r.index).length && !G.changes(expected, r.index).length && G.tip(r) === d.originalHead,
              'The revision is not fully staged. git commit records the index, not unstaged working files. Save the correction, run git add config.js and inspect git diff --staged.');
            need(/^git\s+commit\s+-m\s+(?:"Fix login timeout"|'Fix login timeout')$/.test(input), 'This task needs the message "Fix login timeout" to describe the agreed correction. Use git commit -m "Fix login timeout" after inspecting the staged change.');
            d.fixCommit = G.commit(r, 'Fix login timeout', 'Alice');
            output = 'Created ' + d.fixCommit + ' from the staged snapshot on feature/login. Remote feature/login still has the old timeout until you push.';
          } else if (/^git\s+push\s+origin\s+feature\/login$/.test(input)) {
            need(view.phase === 'push' && G.tip(r) === d.fixCommit && G.clean(r), 'There is no clean review revision ready to publish. Save, stage and commit config.js first; then push feature/login.');
            G.push(r, 'feature/login'); d.pushed = true; d.approvedHead = null; d.revisionInspected = null;
            output = 'Published ' + d.fixCommit + '. The existing PR now shows the revised config.js. Bob must review and approve this new published commit before merge.';
          } else throw new Error('This command does not match the review task. Use git add config.js, the requested commit message, and git push origin feature/login at the corresponding steps. Pull Request actions belong to the platform controls, not Git Terminal.');
        }
        d.explanation = output;
      });
      return output;
    }
    function readReviewHistory() {
      var s = read()[reviewKind()];
      return G.copy(s && s.data.review ? s.data.review.history : []);
    }
    function recordReviewCommand(command, output, success) {
      update(reviewKind(), function (s) { s.data.review.history.push({ command: command, output: output, success: success }); });
    }
    function restartReview() {
      var kind = reviewKind(), s = state[kind];
      if (!s || !s.data.review) return readReview();
      need(s.exercise.id === 'review', 'Another exercise owns this restart point. Return to that exercise before restarting to protect its work.');
      s.repo = G.copy(s.exercise.initial.repo);
      delete s.data.review;
      persist(); return readReview();
    }
    function clear() {
      state = empty();
      try {
        storageObject().removeItem(STORAGE_KEY);
        persistence = { status: 'empty', message: '' };
      } catch (error) {
        persistence = { status: 'memory', message: 'Practice was cleared in this page, but browser storage could not be cleared. An older save may return after reload.' };
      }
      return read();
    }
    return { read: read, storageStatus: storageStatus, startMain: startMain,
      startPrepared: startPrepared, select: select, beginExercise: beginExercise,
      update: update, restartCurrent: restartCurrent, clear: clear,
      readAssignment: readAssignment, saveAssignment: saveAssignment, restartAssignment: restartAssignment,
      readDevelopment: readDevelopment, startDevelopment: startDevelopment, prepareDevelopment: prepareDevelopment,
      developmentCommand: developmentCommand, restartDevelopment: restartDevelopment,
      readSynchronization: readSynchronization, startSynchronization: startSynchronization,
      synchronizationCommand: synchronizationCommand, saveSynchronizationDraft: saveSynchronizationDraft, resolveSynchronization: resolveSynchronization,
      readSynchronizationHistory: readSynchronizationHistory, recordSynchronizationCommand: recordSynchronizationCommand, restartSynchronization: restartSynchronization,
      readDevelopmentHistory: readDevelopmentHistory, recordDevelopmentCommand: recordDevelopmentCommand,
      readReview: readReview, startReview: startReview, reviewAction: reviewAction, reviewCommand: reviewCommand,
      readReviewHistory: readReviewHistory, recordReviewCommand: recordReviewCommand, restartReview: restartReview };
  }
  return { storageKey: STORAGE_KEY, version: VERSION, createStore: createStore, assignments: G.copy(assignments) };
});

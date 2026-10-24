(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./advanced-lab-model.js'));
  else root.FinalChallenge = factory(root.AdvancedGit);
})(typeof window === 'undefined' ? globalThis : window, function (G) {
  'use strict';
  var tasks = [
    { title: 'Decide what belongs in Git', text: 'The handover includes a modified, already tracked .env, generated dist files, and a useful source change. Inspect the files and prepare a safe commit.', hint: 'Ignoring a tracked file is not enough. Keep the local .env, remove it from tracking, and commit .gitignore with the source change.' },
    { title: 'Bring the two histories together', text: 'Your local main and the remote have both advanced. Inspect the graph and publish a result that preserves both histories.', hint: 'Fetch updates origin/main; it does not change your files. Merge origin/main into main before pushing.' },
    { title: 'Update an unpublished feature', text: 'feature/search started before the team updated main. Bring main into this local-only branch. Choose either merge or rebase.', hint: 'Switch to feature/search, then merge main or rebase main. Both are valid here because this feature has not been published.' },
    { title: 'Resolve the shared heading', text: 'Keep both intentions in index.html: the team identity and search. Edit the heading yourself, stage the final text, then finish the operation you chose.', hint: 'Use one h1 containing PixelWorks, team and search, with no conflict markers. Merge finishes with a commit; rebase finishes with rebase --continue.' },
    { title: 'Undo a shared regression', text: 'The feature has been integrated into main. A teammate then published Enable verbose debug output, which enables debug logging. Undo that change without removing shared history, and publish the repair.', hint: 'Inspect the debug commit, then use git revert with its ID. Push the new compensating commit.' },
    { title: 'Rescue the experimental work', text: 'During an experiment, a hard reset moved the local experiment branch backwards. Find the lost Add keyboard help commit and give it a recovery branch without moving main.', hint: 'The reflog shows the position before reset. Inspect it, then use git switch -c recovery with the lost commit ID.' },
    { title: 'Explain the repository you repaired', text: 'Inspect the regression, its repair, and the recovered work. Explain why your integration strategy was appropriate and how the history records the repair.', hint: 'Use the commit details as evidence. Your explanation is saved for your own review; it is not automatically graded for meaning.' }
  ];
  function need(ok, message) { if (!ok) throw new Error(message); }
  function checkpoint(s) { s.checkpoint = G.copy({ repo: s.repo, flags: s.flags, log: s.log, draft: s.draft, explanation: s.explanation, inspected: s.inspected }); }
  function start() {
    var r = G.create({ 'index.html': '<h1>PixelWorks</h1>', 'src/app.js': 'const title = "Welcome";', '.env': 'DEMO_MODE=old', '.gitignore': '', 'debug.js': 'const debug = false;' });
    var b = G.editCommit(r, { 'README.md': 'PixelWorks starter' }, 'Document setup', 'Bob');
    var c = G.editCommit(r, { 'about.md': 'A friendly team project' }, 'Introduce the team', 'Carol');
    var remoteTree = G.copy(G.tree(r, b)); remoteTree['index.html'] = '<h1>PixelWorks · team</h1>';
    var remote = G.record(r, [b], remoteTree, 'Add the team heading', 'Dana');
    r.remote.main = remote; r.tracking.main = b;
    var featureTree = G.copy(G.tree(r, c)); featureTree['index.html'] = '<h1>Search PixelWorks</h1>'; featureTree['search.js'] = 'const searchEnabled = true;';
    r.branches['feature/search'] = G.record(r, [c], featureTree, 'Add search experience', 'Eli');
    r.work['.env'] = 'DEMO_MODE=local'; r.work['src/app.js'] = 'const title = "Welcome to PixelWorks";'; r.untracked['dist/bundle.js'] = 'generated output';
    var s = { version: 1, step: 0, repo: r, flags: {}, log: ['PixelWorks handover · focused teaching repository'], draft: '', explanation: '', inspected: [], completed: [], done: false };
    checkpoint(s); return s;
  }
  function isComplete(s) {
    var r = s.repo, f = s.flags;
    if (s.step === 0) return !!(f.status && f.saved && !Object.hasOwn(G.tree(r, G.tip(r)), '.env') && G.tree(r, G.tip(r))['.gitignore'] === '.env\ndist/\n');
    if (s.step === 1) return !!(f.fetched && f.published && r.remote.main === r.branches.main);
    if (s.step === 2) return !!(r.pending && f.strategy);
    if (s.step === 3) return !!(f.resolved && !r.pending && G.clean(r));
    if (s.step === 4) return !!(f.reverted && f.repairPublished && G.tree(r, G.tip(r))['debug.js'] === 'const debug = false;');
    if (s.step === 5) return !!(f.reflog && r.branches.recovery === f.lost && r.branches.main === f.mainBeforeRescue);
    return !!s.done;
  }
  function next(s) {
    need(isComplete(s) && s.step < 6, 'Complete this checkpoint before continuing.');
    var n = G.copy(s), r = n.repo;
    n.completed.push(n.step); n.step++; n.draft = ''; n.inspected = [];
    if (n.step === 3) n.draft = r.work['index.html'];
    if (n.step === 4) {
      G.checkout(r, 'main'); G.integrate(r, 'feature/search', 'merge');
      n.flags.bad = G.editCommit(r, { 'debug.js': 'const debug = true;' }, 'Enable verbose debug output', 'Dana');
      G.push(r, 'main'); n.log.push('Team event: the feature was integrated; Dana published ' + n.flags.bad + ' with debug enabled.');
    }
    if (n.step === 5) {
      n.flags.mainBeforeRescue = r.branches.main;
      G.checkout(r, 'experiment', r.branches.main);
      n.flags.lost = G.editCommit(r, { 'help.md': 'Press / to focus search.' }, 'Add keyboard help', 'You');
      G.move(r, n.flags.mainBeforeRescue, 'reset: moving to HEAD~1');
      n.log.push('Incident: experiment was reset one commit backwards. main was not moved.');
    }
    checkpoint(n); return n;
  }
  function retry(s) {
    var n = G.copy(s), saved = G.copy(s.checkpoint);
    Object.keys(saved).forEach(function (k) { n[k] = saved[k]; }); n.done = false; return n;
  }
  function run(s, input) {
    var n = G.copy(s), r = n.repo, f = n.flags, cmd = input.trim().replace(/\s+/g, ' '), output = '';
    need(cmd, 'Enter a command or choose one from the command guide.');
    if (cmd === 'git status') { f.status = true; output = G.status(r); }
    else if (cmd === 'git log' || cmd === 'git log --oneline --all') {
      var tips = cmd.endsWith('--all') ? Object.values(r.branches).concat(Object.values(r.tracking), Object.values(r.tags)) : [G.tip(r)];
      output = Object.values(r.commits).filter(function (c) { return tips.some(function (id) { return G.ancestor(r, c.id, id); }); }).reverse().map(function (c) { return c.id + ' ' + c.message; }).join('\n');
    }
    else if (cmd === 'git diff') output = G.changes(r.index, r.work).map(function (file) { return file + '\n- ' + (r.index[file] || '(absent)') + '\n+ ' + (r.work[file] || '(absent)'); }).join('\n') || 'No unstaged changes.';
    else if (n.step === 0) {
      if (cmd === 'git rm --cached .env') {
        need(Object.hasOwn(r.index, '.env'), '.env is already untracked.');
        r.untracked['.env'] = r.work['.env']; delete r.work['.env']; delete r.index['.env'];
        output = 'Staged removal from Git. The local .env still exists. Earlier commits still contain its old value; real exposed credentials must be rotated.';
      } else if (cmd === 'git add .gitignore src/app.js') {
        need(r.work['.gitignore'] === '.env\ndist/\n', 'Save ignore rules for .env and dist/ first.');
        G.stage(r, '.gitignore'); G.stage(r, 'src/app.js'); output = 'Staged ignore rules and the source change.';
      } else if (/^git commit -m ["'].+["']$/.test(cmd)) {
        need(!Object.hasOwn(r.index, '.env') && r.index['.gitignore'] === '.env\ndist/\n' && r.index['src/app.js'] === 'const title = "Welcome to PixelWorks";', 'Check the staged snapshot: exclude .env and include the source change and ignore rules.');
        G.commit(r, cmd.slice(15, -1)); f.saved = true; output = 'Committed the source and ignore rules. Local .env and dist files were kept.';
      } else throw new Error('Inspect the state, save ignore rules, untrack .env, stage the source and rules, then commit.');
    } else if (n.step === 1) {
      if (cmd === 'git fetch') { G.fetch(r); f.fetched = true; output = 'origin/main now points to ' + r.tracking.main + '. Your branch and files did not move.'; }
      else if (cmd === 'git merge origin/main') { need(f.fetched, 'Fetch the current remote history before integrating.'); output = G.integrate(r, r.tracking.main, 'merge'); }
      else if (cmd === 'git push') { G.push(r, 'main'); f.published = true; output = 'Published main with both histories intact.'; }
      else throw new Error('This checkpoint uses fetch, merge origin/main and push. Force-push would discard shared work.');
    } else if (n.step === 2) {
      if (cmd === 'git switch feature/search') { G.checkout(r, 'feature/search'); output = 'Now on the unpublished feature/search branch.'; }
      else if (cmd === 'git merge main' || cmd === 'git rebase main') {
        need(r.branch === 'feature/search', 'Switch to feature/search before updating it.');
        f.strategy = cmd.includes('rebase') ? 'rebase' : 'merge'; output = G.integrate(r, 'main', f.strategy);
      } else throw new Error('Update feature/search using merge main or rebase main.');
    } else if (n.step === 3) {
      if (cmd === 'git add index.html') { G.stage(r, 'index.html'); output = 'Staged the saved heading.'; }
      else if (/^git commit -m ["'].+["']$/.test(cmd) || cmd === 'git rebase --continue') {
        need(r.pending, 'This operation is already complete.');
        need((r.pending.method === 'rebase') === (cmd === 'git rebase --continue'), 'Finish ' + r.pending.method + ' with ' + (r.pending.method === 'rebase' ? 'git rebase --continue.' : 'git commit -m "Resolve heading".'));
        need(validHeading(r.work['index.html']) && n.draft === r.work['index.html'], 'Save a heading that includes the team identity and search before finishing.');
        G.finish(r); f.resolved = true; output = f.strategy === 'merge' ? 'Created a merge commit with two parents.' : 'Replayed the feature commit with a new ID and one parent.';
      } else throw new Error('Edit and save the heading, stage it, then finish your selected integration strategy.');
    } else if (n.step === 4) {
      if (cmd === 'git revert ' + f.bad) { need(!f.reverted, 'The regression has already been reverted.'); f.reverted = G.revert(r, f.bad); output = 'Created ' + f.reverted + ' to undo the debug change. The original commit still exists.'; }
      else if (cmd === 'git push') { need(f.reverted, 'The shared debug regression is still present. Inspect its commit before publishing.'); G.push(r, 'main'); f.repairPublished = true; output = 'Published the repair without rewriting shared history.'; }
      else throw new Error('Preserve shared history. Inspect the regression and revert its commit ID.');
    } else if (n.step === 5) {
      if (cmd === 'git reflog') { f.reflog = true; output = r.reflog.map(function (e, i) { return e.id + ' HEAD@{' + i + '} ' + e.reason; }).join('\n'); }
      else if (cmd.startsWith('git switch -c recovery ')) {
        need(f.reflog, 'Inspect the reflog before choosing a recovery target.');
        var id = cmd.slice('git switch -c recovery '.length); need(id === f.lost, 'That snapshot does not contain the lost keyboard-help work. Inspect the reflog entry.');
        G.checkout(r, 'recovery', id); output = 'Recovery points to the lost commit. main is unchanged.';
      } else throw new Error('Use reflog to find the lost commit, then create a recovery branch at that ID.');
    } else throw new Error('Inspect the history and complete the reflection below.');
    n.log.push('$ ' + cmd + '\n' + output); n.log = n.log.slice(-30); return n;
  }
  function validHeading(text) { return /^<h1>[^<>]*PixelWorks[^<>]*<\/h1>\s*$/.test(text) && /team/i.test(text) && /search/i.test(text); }
  function saveHeading(s, text) { need(s.step === 3 && s.repo.pending, 'No conflict is waiting for an edit.'); var n = G.copy(s); n.draft = text; n.repo.work['index.html'] = text; return n; }
  function ignore(s, env, dist, source) {
    need(s.step === 0, 'File classification belongs to checkpoint 1.');
    need(env === 'ignore' && dist === 'ignore' && source === 'commit', 'Reconsider: local configuration and generated output stay local; the useful source edit belongs in Git.');
    var n = G.copy(s); n.flags.classified = true; n.repo.work['.gitignore'] = '.env\ndist/\n'; n.log.push('Saved .gitignore rules for .env and dist/. Tracked files still need to be untracked.'); return n;
  }
  function reflect(s, text, history, strategy, confirmed) {
    need(s.step === 6, 'Finish the repairs before the reflection.');
    need([s.flags.bad, s.flags.reverted, s.flags.lost].every(function (id) { return s.inspected.includes(id); }), 'Inspect the regression, the revert and the recovered commit first.');
    need(history === 'preserve' && strategy === s.flags.strategy, 'Check how the graph records your integration and the shared repair.');
    need(text.trim().length >= 40 && confirmed, 'Write a short explanation and confirm that you checked it against the graph.');
    var n = G.copy(s); n.explanation = text; n.done = true; return n;
  }
  return { tasks: tasks, start: start, next: next, retry: retry, run: run, isComplete: isComplete, saveHeading: saveHeading, ignore: ignore, reflect: reflect, validHeading: validHeading };
});

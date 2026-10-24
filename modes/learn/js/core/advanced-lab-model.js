(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AdvancedGit = factory();
})(typeof window === 'undefined' ? globalThis : window, function () {
  'use strict';
  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  function keys(a, b) { return Array.from(new Set(Object.keys(a).concat(Object.keys(b)))).sort(); }
  function changes(a, b) { return keys(a, b).filter(function (k) { return a[k] !== b[k]; }); }
  function require_(ok, message) { if (!ok) throw new Error(message); }
  function tip(r) { return r.branches[r.branch]; }
  function tree(r, id) { require_(r.commits[id], 'Unknown commit: ' + id); return r.commits[id].tree; }
  function ancestor(r, older, newer) {
    if (older === newer) return true;
    var seen = {}, queue = [newer];
    while (queue.length) {
      var id = queue.shift();
      if (seen[id] || !r.commits[id]) continue;
      seen[id] = true;
      if (id === older) return true;
      queue = queue.concat(r.commits[id].parents);
    }
    return false;
  }
  function base(r, a, b) {
    var queue = [a], seen = {};
    while (queue.length) {
      var id = queue.shift();
      if (seen[id]) continue;
      seen[id] = true;
      if (ancestor(r, id, b)) return id;
      queue = queue.concat(r.commits[id].parents);
    }
    throw new Error('No shared ancestor in this exercise.');
  }
  function record(r, parents, snapshot, message, author) {
    var id = 'c' + String(++r.serial).padStart(4, '0');
    r.commits[id] = { id: id, parents: parents.slice(), tree: copy(snapshot), message: message,
      author: author || 'You', time: '2026-09-16 ' + String(9 + Math.floor(r.serial / 60)).padStart(2, '0') + ':' + String(r.serial % 60).padStart(2, '0'),
      files: changes(parents.length ? tree(r, parents[0]) : {}, snapshot) };
    return id;
  }
  function move(r, id, reason) {
    var old = tip(r);
    r.branches[r.branch] = id;
    r.reflog.unshift({ id: id, from: old, reason: reason });
    r.index = copy(tree(r, id)); r.work = copy(r.index);
  }
  function create(snapshot) {
    var r = { serial: 0, commits: {}, branches: {}, branch: 'main', remote: {}, tracking: {}, tags: {},
      reflog: [], index: {}, work: {}, untracked: {}, pending: null, stash: null };
    var id = record(r, [], snapshot || { 'index.html': '<h1>PixelWorks</h1>', 'config.js': 'const timeout = 500;' }, 'Create PixelWorks', 'Alice');
    r.branches.main = id; move(r, id, 'initial checkout'); return r;
  }
  function clean(r) { return !r.pending && !changes(r.index, tree(r, tip(r))).length && !changes(r.work, r.index).length; }
  function commit(r, message, author) {
    require_(!r.pending, 'Finish the current merge or rebase first.');
    require_(changes(tree(r, tip(r)), r.index).length, 'Nothing staged to commit.');
    var work = copy(r.work), id = record(r, [tip(r)], r.index, message, author);
    move(r, id, 'commit: ' + message); r.work = work; return id;
  }
  function editCommit(r, patch, message, author) {
    Object.keys(patch).forEach(function (k) { if (patch[k] === null) delete r.work[k]; else r.work[k] = patch[k]; });
    r.index = copy(r.work); return commit(r, message, author);
  }
  function checkout(r, name, from) {
    require_(clean(r), 'Save or finish the current work before switching branches.');
    if (from) { require_(!r.branches[name] && r.commits[from], 'Choose a new branch name and an existing commit.'); r.branches[name] = from; }
    require_(r.branches[name], 'Unknown branch: ' + name);
    var old = tip(r); r.branch = name; move(r, tip(r), 'switch: ' + name); r.reflog[0].from = old;
  }
  function combine(original, ours, theirs) {
    var result = copy(ours), conflicts = [];
    keys(original, theirs).forEach(function (file) {
      if (original[file] === theirs[file]) return;
      if (ours[file] !== original[file] && ours[file] !== theirs[file]) {
        conflicts.push(file);
        result[file] = '<<<<<<< HEAD\n' + (ours[file] || '') + '\n=======\n' + (theirs[file] || '') + '\n>>>>>>> incoming';
      } else if (theirs[file] === undefined) delete result[file]; else result[file] = theirs[file];
    });
    return { tree: result, conflicts: conflicts };
  }
  function integrate(r, target, method) {
    require_(clean(r), 'Finish or save the current work first.');
    var onto = r.branches[target] || r.tracking[target] || target;
    require_(r.commits[onto], 'Fetch first so this target is known.');
    var old = tip(r), common = base(r, old, onto), result;
    require_(method === 'merge' || method === 'rebase', 'Choose merge or rebase.');
    if (ancestor(r, onto, old)) return 'Already up to date.';
    if (common === old) { move(r, onto, 'fast-forward'); return 'Fast-forward: no new commit needed.'; }
    if (method === 'rebase') {
      require_(r.commits[old].parents.length === 1 && r.commits[old].parents[0] === common,
        'This lab supports rebasing one unpublished feature commit.');
      result = combine(tree(r, common), tree(r, onto), tree(r, old));
    } else result = combine(tree(r, common), tree(r, old), tree(r, onto));
    r.pending = { method: method, old: old, onto: onto, conflicts: result.conflicts, staged: [] };
    r.work = result.tree; r.index = copy(result.tree);
    if (result.conflicts.length) return 'CONFLICT: ' + result.conflicts.join(', ') + '. Edit the file, stage it, then finish ' + method + '.';
    finish(r); return method === 'merge' ? 'Merged both histories.' : 'Replayed the feature change as a new commit.';
  }
  function stage(r, file) {
    require_(Object.hasOwn(r.work, file) || Object.hasOwn(r.index, file), 'Unknown file.');
    if (r.pending && r.pending.conflicts.includes(file)) {
      require_(!/^(<<<<<<<|=======|>>>>>>>)/m.test(r.work[file] || ''), 'Remove every conflict marker before staging.');
      if (!r.pending.staged.includes(file)) r.pending.staged.push(file);
    }
    if (r.work[file] === undefined) delete r.index[file]; else r.index[file] = r.work[file];
  }
  function finish(r) {
    var p = r.pending;
    require_(p, 'There is no merge or rebase to finish.');
    require_(p.conflicts.every(function (f) { return p.staged.includes(f) && r.index[f] === r.work[f]; }), 'Stage the latest resolved version of every conflicting file.');
    var parents = p.method === 'merge' ? [p.old, p.onto] : [p.onto];
    var source = r.commits[p.old];
    var id = record(r, parents, r.index, p.method === 'merge' ? 'Merge shared changes' : source.message, p.method === 'rebase' ? source.author : 'You');
    r.pending = null; move(r, id, p.method + ': complete'); return id;
  }
  function fetch(r) { r.tracking = copy(r.remote); }
  function push(r, name) {
    require_(clean(r), 'Finish and commit the current work before publishing.');
    var id = tip(r), target = name || r.branch;
    require_(!r.remote[target] || ancestor(r, r.remote[target], id), 'Push rejected: the remote has commits your branch does not include. Inspect both histories.');
    r.remote[target] = id; r.tracking[target] = id;
  }
  function revert(r, id) {
    require_(clean(r), 'Finish the current work first.');
    require_(r.commits[id] && r.commits[id].parents.length === 1, 'Select a normal commit to revert.');
    var result = combine(tree(r, id), tree(r, tip(r)), tree(r, r.commits[id].parents[0]));
    require_(!result.conflicts.length, 'This revert conflicts with later changes. This focused lesson uses an isolated fix.');
    r.index = result.tree; r.work = copy(result.tree); return commit(r, 'Revert "' + r.commits[id].message + '"');
  }
  function cherryPick(r, id) {
    require_(clean(r), 'Save current work first.');
    require_(r.commits[id] && r.commits[id].parents.length === 1, 'Select one non-merge commit.');
    var c = r.commits[id], result = combine(tree(r, c.parents[0]), tree(r, tip(r)), c.tree);
    require_(!result.conflicts.length, 'This patch conflicts with the current files.');
    r.index = result.tree; r.work = copy(result.tree); return commit(r, c.message, c.author);
  }
  function stash(r, pop) {
    require_(!r.pending, 'Finish the current operation first.');
    if (pop) {
      require_(r.stash && clean(r), 'A saved stash and clean worktree are required here.');
      var result = combine(r.stash.base, r.work, r.stash.work);
      require_(!result.conflicts.length, 'Stash conflicts with current work; the saved stash is kept.');
      r.work = result.tree; r.stash = null;
    } else {
      require_(!r.stash && !clean(r), 'Make a tracked-file change first.');
      r.stash = { base: copy(tree(r, tip(r))), work: copy(r.work) };
      r.index = copy(tree(r, tip(r))); r.work = copy(r.index);
    }
  }
  function status(r) {
    var lines = [r.pending && r.pending.method === 'rebase' ? 'Detached HEAD · replaying ' + r.branch : 'On branch ' + r.branch];
    if (r.pending) lines.push(r.pending.method + ' in progress');
    var unresolved = r.pending ? r.pending.conflicts.filter(function (f) { return !r.pending.staged.includes(f); }) : [];
    if (unresolved.length) lines.push('Unmerged paths: ' + unresolved.join(', '));
    var staged = changes(tree(r, tip(r)), r.index).filter(function (f) { return !unresolved.includes(f); });
    var unstaged = changes(r.index, r.work).filter(function (f) { return !unresolved.includes(f); });
    if (staged.length) lines.push('Staged: ' + staged.join(', '));
    if (unstaged.length) lines.push('Not staged: ' + unstaged.join(', '));
    var untracked = Object.keys(r.untracked).filter(function (f) { return !ignored(r, f); });
    if (untracked.length) lines.push('Untracked: ' + untracked.join(', '));
    if (!staged.length && !unstaged.length && !untracked.length && !r.pending) lines.push('Working tree clean');
    return lines.join('\n');
  }
  function ignored(r, f) { return (r.work['.gitignore'] || '').split('\n').some(function (pattern) { return pattern && (pattern.endsWith('/') ? f.startsWith(pattern) : f === pattern); }); }
  function cleanPreview(r) { return Object.keys(r.untracked).filter(function (f) { return !ignored(r, f); }).sort(); }
  function cleanFiles(r, approved) {
    var current = cleanPreview(r);
    require_(JSON.stringify(current) === JSON.stringify(approved), 'Preview the current deletion list before confirming.');
    current.forEach(function (f) { delete r.untracked[f]; }); return current;
  }
  return { copy: copy, changes: changes, tip: tip, tree: tree, ancestor: ancestor, create: create,
    record: record, move: move, clean: clean, commit: commit, editCommit: editCommit, checkout: checkout,
    integrate: integrate, stage: stage, finish: finish, fetch: fetch, push: push, revert: revert,
    cherryPick: cherryPick, stash: stash, status: status, ignored: ignored, cleanPreview: cleanPreview, cleanFiles: cleanFiles };
});

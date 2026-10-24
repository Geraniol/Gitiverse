/* Isolated teaching repositories. The index stores CONTENT, so editing a
   staged file never silently changes the version in the next commit. */
(function () {
  'use strict';
  var ORIGINAL = '# my-project\nA practice project for learning Git.';
  var EDITED = '# my-project\nA practice project for learning Git commands.';
  function copy(value) { return Object.assign({}, value); }
  function paths(a, b) { return Array.from(new Set(Object.keys(a).concat(Object.keys(b)))).sort(); }
  function changed(a, b) { return paths(a, b).filter(function (p) { return a[p] !== b[p]; }); }
  // A line-based LCS keeps unchanged lines visible and distinguishes additions
  // from removals, including new/deleted files and comparisons in reverse order.
  function diff(a, b) {
    return changed(a, b).map(function (path) {
      var old = a[path] === undefined ? [] : a[path].split('\n');
      var next = b[path] === undefined ? [] : b[path].split('\n');
      var dp = Array.from({ length: old.length + 1 }, function () { return Array(next.length + 1).fill(0); });
      for (var i = old.length - 1; i >= 0; i--) for (var j = next.length - 1; j >= 0; j--)
        dp[i][j] = old[i] === next[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
      var lines = [], x = 0, y = 0;
      while (x < old.length || y < next.length) {
        if (x < old.length && y < next.length && old[x] === next[y]) { lines.push(' ' + old[x++]); y++; }
        else if (x < old.length && (y === next.length || dp[x + 1][y] >= dp[x][y + 1])) lines.push('-' + old[x++]);
        else lines.push('+' + next[y++]);
      }
      return 'diff --git a/' + path + ' b/' + path + '\n--- ' + (a[path] === undefined ? '/dev/null' : 'a/' + path) +
        '\n+++ ' + (b[path] === undefined ? '/dev/null' : 'b/' + path) + '\n@@ -' + (old.length ? '1,' : '0,') + old.length +
        ' +' + (next.length ? '1,' : '0,') + next.length + ' @@\n' + lines.join('\n');
    }).join('\n\n');
  }
  function create(mode) {
    var state = { folder: mode !== 'init', inside: mode !== 'init', init: mode !== 'init',
      files: mode === 'init' ? {} : { 'index.html': '<h1>Hello</h1>', 'README.md': ORIGINAL }, index: {}, commits: [], events: [] };
    if (['add', 'status', 'init'].indexOf(mode) < 0) state.index['README.md'] = ORIGINAL;
    if (mode === 'diff' || mode === 'commit') state.files['README.md'] = EDITED;
    if (mode === 'commit') state.index['README.md'] = EDITED;
    if (mode === 'challenge') {
      state.index = copy(state.files);
      state.commits.push({ id: 'start01', message: 'Starter project', content: copy(state.files), parent: null });
    }
    function head() { return state.commits.length ? state.commits[state.commits.length - 1].content : {}; }
    function status() {
      return { staged: changed(head(), state.index),
        unstaged: Object.keys(state.index).filter(function (p) { return state.index[p] !== state.files[p]; }),
        untracked: Object.keys(state.files).filter(function (p) { return !Object.prototype.hasOwnProperty.call(state.index, p); }) };
    }
    function result(ok, text) { return { ok: ok, text: text }; }
    function run(raw) {
      var cmd = raw.trim().replace(/\s+/g, ' '), match;
      if (cmd === 'mkdir my-project') {
        if (state.folder) return result(false, 'my-project already exists.');
        state.folder = true; return result(true, 'Created my-project/');
      }
      if (cmd === 'cd my-project') {
        if (!state.folder) return result(false, 'Create my-project first.');
        if (state.inside) return result(false, 'You are already inside my-project/.');
        state.inside = true; return result(true, 'You are now in my-project/');
      }
      if (cmd === 'git init') {
        if (!state.inside) return result(false, 'Step inside my-project before initializing it.');
        state.init = true; return result(true, 'Initialized Git repository in my-project/.git/\nNo commits yet.');
      }
      if (!state.init) return result(false, 'This folder is not a Git repository yet.');
      if (cmd === 'git status') {
        state.events.push('status');
        var s = status(), text = 'On branch main\n' + (state.commits.length ? '' : '\nNo commits yet\n');
        if (s.staged.length) text += '\nChanges to be committed:\n' + s.staged.map(function (p) { return '  ' + (head()[p] === undefined ? 'new file: ' : 'modified: ') + p; }).join('\n') + '\n';
        if (s.unstaged.length) text += '\nChanges not staged for commit:\n' + s.unstaged.map(function (p) { return '  modified: ' + p; }).join('\n') + '\n';
        if (s.untracked.length) text += '\nUntracked files:\n' + s.untracked.map(function (p) { return '  ' + p; }).join('\n');
        if (!s.staged.length && !s.unstaged.length && !s.untracked.length) text += '\nnothing to commit, working tree clean';
        return result(true, text);
      }
      if ((match = cmd.match(/^git add (README\.md|index\.html|\.)$/))) {
        var selected = match[1] === '.' ? Object.keys(state.files) : [match[1]];
        if (selected.some(function (p) { return state.files[p] === undefined; })) return result(false, 'That file does not exist.');
        selected.forEach(function (p) { state.index[p] = state.files[p]; }); state.events.push('add');
        return result(true, 'Selected current content: ' + selected.join(', ') + '\nYour working files stay in place.');
      }
      if (cmd === 'git diff' || cmd === 'git diff --staged' || cmd === 'git diff --cached') {
        state.events.push('diff');
        var tracked = {}; Object.keys(state.index).forEach(function (p) { tracked[p] = state.files[p]; });
        return result(true, (cmd === 'git diff' ? diff(state.index, tracked) : diff(head(), state.index)) ||
          'No differences.\nNote: git diff does not display untracked files.');
      }
      if ((match = raw.trim().match(/^git\s+commit\s+-m\s+(["'])([^\r\n]+)\1\s*$/))) {
        var message = match[2].trim();
        if (!message) return result(false, 'Write a commit message that describes your change.');
        if (!status().staged.length) return result(false, 'Nothing staged to commit. Select a change with git add first.');
        var last = state.commits[state.commits.length - 1];
        var c = { id: 'c' + String(state.commits.length + 1).padStart(6, '0'), message: message,
          content: copy(state.index), parent: last ? last.id : null };
        state.commits.push(c); state.events.push('commit');
        return result(true, '[main ' + c.id + '] ' + message + '\nRecorded the staged content locally.');
      }
      return result(false, 'This lesson supports git init, git status, git add <file>, git diff, git diff --staged and git commit -m "message".');
    }
    function save(path, value) {
      if (!Object.prototype.hasOwnProperty.call(state.files, path)) return false;
      state.files[path] = String(value); state.events.push('edit'); return true;
    }
    function checkChallenge() {
      var last = state.commits[state.commits.length - 1], s = status();
      if (state.commits.length < 2) return result(false, 'No new commit yet. Save your change in a commit first.');
      if (!/<h1>\s*Git Playground\s*<\/h1>/.test(last.content['index.html'] || '')) return result(false, 'The committed heading must read Git Playground. Check the saved snapshot, not just your editor.');
      if (s.staged.length || s.unstaged.length || s.untracked.length) return result(false, 'There are still uncommitted changes. Finish with a clean working directory.');
      if (!/(title|heading|playground)/i.test(last.message) || last.message.trim().split(/\s+/).length < 2)
        return result(false, 'Make your message more specific: mention the title, heading or Playground in a short phrase. This checker uses those words; it does not judge every possible message.');
      return result(true, 'Challenge complete. Your new heading is committed with a descriptive message, and your working directory is clean.');
    }
    return { state: state, run: run, save: save, status: status, head: head, checkChallenge: checkChallenge };
  }
  function history() {
    var base = { 'index.html': '<header class="site-header">\n  <h1>My Web Site</h1>\n</header>', 'style.css': 'h1 { color: coral; }' };
    var definitions = [
      ['e91b4', 'Initial commit', 'Mon 7 Sep 2026, 09:00', {}],
      ['7c2e0', 'Add login', 'Tue 8 Sep 2026, 10:15', { 'login.js': 'function login() {\n  return "Welcome";\n}' }],
      ['5f31a', 'Fix header', 'Wed 9 Sep 2026, 14:30', { 'index.html': '<header class="site-header">\n  <h1>Git Course</h1>\n</header>' }],
      ['b7c21', 'Add search', 'Thu 10 Sep 2026, 11:10', { 'search.js': 'function search(query) {\n  return query;\n}' }],
      ['a83f1', 'Fix search', 'Fri 11 Sep 2026, 09:24', { 'search.js': 'function search(query) {\n  return query.trim();\n}', 'style.css': 'h1 { color: coral; }\n.search { width: 100%; }' }]
    ];
    return definitions.map(function (d, i) {
      var before = i ? copy(base) : {}; Object.assign(base, d[3]);
      return { id: d[0], message: d[1], date: d[2], author: 'Alice', parent: i ? definitions[i - 1][0] : null,
        content: copy(base), changed: changed(before, base) };
    });
  }
  window.CourseLab = { create: create, diff: diff, history: history };
})();

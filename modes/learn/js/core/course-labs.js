(function () {
  'use strict';
  var beats = window.CHAPTER_BEATS = window.CHAPTER_BEATS || {};
  function shell(host, beat, helpers) {
    var esc = helpers.esc, ic = helpers.ic;
    /* Two lines, and only two: the title, then the task. The old guide stacked
       five tiers and buried the one sentence that says what to do. The paragraph
       is folded into the task line; the setup note is gone entirely. */
    helpers.brief('<div class="lesson-guide__intro"><h2>' + esc(beat.title) + '</h2></div>' +
      '<div class="lesson-guide__task">' + ic('mouse-pointer-click', 20) +
      '<span><strong>' + esc(beat.task) + '</strong> ' + esc(beat.text) + '</span></div>');

    host.innerHTML = '<div class="lesson-guide">' +
      '<div class="course-workspace"></div><div class="lesson-feedback" role="status" aria-live="polite" hidden></div>' +
      '</div>';
    return {
      workspace: host.querySelector('.course-workspace'),
      notify: function (text, good) {
        var feedback = host.querySelector('.lesson-feedback'); feedback.hidden = false;
        feedback.textContent = text; feedback.classList.toggle('is-success', !!good);
      }
    };
  }
  function button(text, attr, primary) {
    return '<button type="button" class="btn' + (primary ? ' btn--primary' : '') + '" ' + attr + '>' + text + '</button>';
  }
  function code(text, esc) {
    return '<pre class="course-output" tabindex="0">' + String(text).split('\n').map(function (line) {
      var tone = line[0] === '+' && line.slice(0, 3) !== '+++' ? 'is-add' : line[0] === '-' && line.slice(0, 3) !== '---' ? 'is-remove' : '';
      return '<span class="' + tone + '">' + esc(line) + '</span>';
    }).join('\n') + '</pre>';
  }
  beats.commandLab = function (host, beat, api, helpers) {
    var esc = helpers.esc, ic = helpers.ic, mode = beat.mode, lab = window.CourseLab.create(mode);
    var view = shell(host, beat, helpers), challenge = mode === 'challenge';
    /* The ordered plan for this lesson. Non-challenge sections walk it from top
       to bottom; the challenge has no plan and is driven by the reader. */
    var steps = (beat.commands || []).slice();
    var runs = [];            /* commands that actually ran, in canonical form */
    var TERM = 'labterm';     /* one terminal per lab - never two input surfaces */
    var challengeDone = false;
    /* The terminal's own output. GitTerm renders it, so it carries {text, tone}
       lines and not a pre-formatted string. */
    function initialLog() {
      return [{ text: challenge
        ? 'Choose an action. Its Git command and response appear here.'
        : 'Type each command in order. Git’s response appears here.', tone: 'dim' }];
    }
    var log = initialLog();
    /* The repository as the reader found it, frozen. The left panel is only
       worth looking at if it does NOT move while the right one does; reset
       re-snapshots it. */
    function liveSnap(st) { return { folder: st.folder, init: st.init, files: Object.keys(st.files).sort() }; }
    var start = liveSnap(lab.state);
    /**
     * The file structure as a tree. `my-project` is a CHILD of root: `mkdir
     * my-project` runs in the reader's current directory. snap: { folder, init,
     * files }; mark(path) -> 'added'|'modified'|'staged'|'deleted'|null.
     */
    function treeNodes(snap, mark) {
      if (!snap.folder) return [];
      var kids = [];
      /* `git init` puts the history folder INSIDE the project folder, which is
         the one thing a reader is most likely to have backwards. */
      if (snap.init) kids.push({ name: '.git', type: 'dir', path: 'my-project/.git', children: [] });
      snap.files.forEach(function (p) {
        kids.push({ name: p, type: 'file', path: 'my-project/' + p, status: mark ? mark(p) : null });
      });
      return [{ name: 'my-project', type: 'dir', path: 'my-project', open: true, children: kids }];
    }
    view.workspace.innerHTML = '<div class="course-board">' +
      '<section class="lesson-panel"><div data-tree></div>' +
      (challenge ? '<label class="course-label" for="challengeEditor">Webpage heading</label><input id="challengeEditor" class="course-select" maxlength="80" value="Hello"><div class="course-actions">' + button('Save file', 'data-save') + '</div><div class="course-preview"><small>Saved heading preview</small><strong data-preview>Hello</strong></div>' : '<div class="course-copies"></div>') +
      '</section><section class="lesson-panel course-terminal"><h3>' + ic('terminal', 18) + (challenge ? ' Choose your next action</h3>' : ' Try the commands</h3>') +
      /* No command list here on purpose: the hint under the input already names
         the exact command, and a separate list above the terminal would be a
         second place to read the same thing. */
      (challenge ? '<label class="course-label" for="commitMessage">Describe your change</label><input id="commitMessage" class="course-select" maxlength="100" placeholder="What did you change?">' : '') +
      '<div class="course-terminal-input"></div>' +
      (challenge ? '<div class="course-actions">' + button('Check my work', 'data-check') + '</div><details open class="lesson-hint"><summary>Need a reminder?</summary><p>Edit → status → diff → add → commit. Type <code>git status</code>, <code>git diff</code>, <code>git add index.html</code>, then <code>git commit -m "Update heading to Git Playground"</code>. If your message was too vague, reset this exercise and try again with a clearer description.</p></details>' : '') +
      '</section></div><div class="course-record"></div><div class="course-actions">' + button('Reset this exercise', 'data-reset', false) + '</div>';

    /** Index of the first step that has not run yet, or -1 when all are done. */
    function pendingStep() {
      for (var i = 0; i < steps.length; i++) if (runs.indexOf(steps[i]) < 0) return i;
      return -1;
    }
    function commitMessageValue() { var el = host.querySelector('#commitMessage'); return el ? el.value.trim() : ''; }
    function messageUsable(m) { return !!m && !/[\"\n\r]/.test(m); }
    /* The challenge has no fixed plan, so the hint names whatever the current
       state calls for. The commit command is built from the message field, which
       is the parameter, not a command of its own. */
    function challengeHint() {
      var s = lab.status(), m = commitMessageValue();
      if (s.staged.length) return messageUsable(m) ? 'git commit -m \"' + m + '\"' : 'git status';
      if (s.unstaged.length || s.untracked.length) return 'git add index.html';
      return 'git status';
    }
    function challengeNote() {
      var s = lab.status(), m = commitMessageValue();
      if (s.staged.length && !messageUsable(m)) return 'Write your message above first; the commit command appears here once it has one.';
      return 'Type the command yourself — there is no button. Status, then diff, then add, then commit.';
    }
    function formOpts() {
      var o = { id: TERM, value: '', log: log, run: 'Run', label: 'Git command', placeholder: 'git …' };
      if (challenge) { o.command = challengeHint(); o.note = challengeNote(); o.disabled = challengeDone; return o; }
      var i = pendingStep();
      o.command = i < 0 ? steps[steps.length - 1] : steps[i];
      o.disabled = i < 0;
      return o;
    }
    function paint() {
      var s = lab.status(), st = lab.state;
      /* The file structure, before and after. The right panel carries the
         indicators: the folder the reader is in, and which files are new, changed
         or staged. One status per row: staged beats modified beats new. */
      host.querySelector('[data-tree]').innerHTML = FileTree.pair(
        { title: 'Before', nodes: treeNodes(start, null), empty: 'Empty at the start.' },
        { title: 'After', nodes: treeNodes(liveSnap(st), function (p) {
            if (s.staged.includes(p)) return 'staged';
            if (s.unstaged.includes(p)) return 'modified';
            if (s.untracked.includes(p)) return 'added';
            return null;
          }),
          cwd: st.inside ? 'my-project' : null, empty: 'No project folder yet.',
          /* The old state readout had its own row above the list; the panel
             head is where a reader already looks for "what is this". */
          note: st.init ? 'Git ready · ' + st.commits.length + ' commit' + (st.commits.length === 1 ? '' : 's') : st.inside ? 'Inside folder' : 'Not initialized' });
      if (!challenge) {
        var copies = host.querySelector('.course-copies');
        copies.innerHTML = mode === 'diff' || mode === 'commit' ? '<div class="course-copy"><h3>Selected earlier</h3>' + code(st.index['README.md'], esc) + '<h3>On your computer now</h3>' + code(st.files['README.md'], esc) + '</div>' :
          mode === 'add' ? '<div class="course-selection"><h3>Selected for the next commit</h3><p>' + (s.staged.length ? s.staged.map(esc).join(', ') : 'Nothing selected yet.') + '</p></div>' : '';
      }
      /* Re-render the terminal from state, reading back whatever the reader has
         half-typed first - a repaint must never eat their input. */
      var box = host.querySelector('.course-terminal-input');
      var typed = GitTerm.valueOf(box, TERM);
      box.innerHTML = GitTerm.form(Object.assign(formOpts(), { value: typed }));
      var lines = box.querySelector('.gitterm__log');
      if (lines) lines.scrollTop = lines.scrollHeight;   /* the newest line is the one to read */
      var last = st.commits[st.commits.length - 1];
      host.querySelector('.course-record').innerHTML = last && (mode === 'commit' || challenge && st.commits.length > 1) ?
        '<div class="lesson-record is-arriving">' + ic('git-commit-horizontal', 24) + '<div><small>Latest saved snapshot · ' + esc(last.id) + '</small><strong>' + esc(last.message) + '</strong><span>' + Object.keys(last.content).map(esc).join(' · ') + '</span><details open class="lesson-hint"><summary>Read the committed files</summary>' + Object.keys(last.content).map(function (p) { return '<h3>' + esc(p) + '</h3>' + code(last.content[p], esc); }).join('') + '</details></div></div>' : '';
    }
    function complete() {
      var st = lab.state, ok = mode === 'init' ? st.init : mode === 'status' ? runs.includes('git status') :
        mode === 'add' ? lab.status().staged.join() === 'README.md' && runs.lastIndexOf('git status') > runs.indexOf('git add README.md') :
        mode === 'diff' ? runs.includes('git diff') : mode === 'commit' ? st.commits.length && runs[runs.length - 1] === 'git status' : false;
      if (ok) { api.ready(); view.notify(beat.takeaway, true); } else api.wait();
    }
    function focusTerm() {
      var input = host.querySelector('.course-terminal-input [data-gitterm-input]');
      if (input && !input.disabled) input.focus({ preventScroll: true });
    }
    /** Hand the accepted command to the interpreter and echo it into the log. */
    function accept(cmd) {
      var form = host.querySelector('.course-terminal-input [data-gitterm]');
      if (form) { var input = form.querySelector('[data-gitterm-input]'); if (input) input.value = ''; }
      run(cmd);
    }
    function run(cmd) {
      var result = lab.run(cmd); if (result.ok) runs.push(cmd);
      log.push({ text: '$ ' + cmd, tone: 'cmd' });
      log.push({ text: result.text, tone: result.ok ? '' : 'bad' });
      paint(); focusTerm();
      if (!result.ok) { view.notify(result.text, false); api.wait(); }
      else if (!challenge) complete();
      else { api.wait(); view.notify('Command ran. Use Check my work when your snapshot is ready.', false); }
    }
    function submitChallenge(value) {
      var m = commitMessageValue();
      var accepted = ['git status', 'git diff', 'git diff --staged', 'git add index.html', 'git add .'];
      if (messageUsable(m)) accepted.push('git commit -m \"' + m + '\"');
      for (var i = 0; i < accepted.length; i++) if (GitTerm.matches(value, accepted[i])) { accept(accepted[i]); return; }
      if (/^git commit -m\s/.test(value)) {
        view.notify(messageUsable(m) ? 'The commit command uses the message you typed above: git commit -m \"' + m + '\".' : 'Write a short message above, without double quotes, then type the commit command.', false);
        api.wait(); return;
      }
      view.notify('This exercise supports git status, git diff, git add index.html and git commit -m \"your message\".', false);
      api.wait();
    }
    function submitTerm(id, typed, form) {
      if (id !== TERM) return;
      var value = typed.trim();
      if (!value) return;
      if (challenge) { submitChallenge(value); return; }
      var i = pendingStep();
      if (i < 0) return;
      var expected = steps[i];
      if (GitTerm.matches(value, expected)) { accept(expected); return; }
      GitTerm.reject(form);
      api.wait();
    }
    /* One delegated listener, installed once: the form is rebuilt on every
       paint, so binding per-render would pile up handlers. */
    GitTerm.bind(view.workspace, submitTerm);
    /* Folding is delegated too, and for the same reason: paint() replaces the
       whole tree, so a listener attached to a twist button would be gone by
       the next command. */
    FileTree.bind(view.workspace);
    host.querySelector('[data-reset]').addEventListener('click', function () {
      lab = window.CourseLab.create(mode); start = liveSnap(lab.state); runs = []; log = initialLog(); challengeDone = false; api.wait();
      host.querySelector('.course-terminal-input').innerHTML = '';   /* really clear the field, not just its state */
      if (challenge) { host.querySelector('#challengeEditor').value = 'Hello'; host.querySelector('[data-preview]').textContent = 'Hello'; host.querySelector('#commitMessage').value = ''; }
      paint(); view.notify('Only this exercise has been reset.', false);
    });
    if (challenge) {
      host.querySelector('#challengeEditor').addEventListener('input', function () { api.wait(); });
      /* The commit command is built from this field, so the hint has to follow
         it as it is typed. */
      host.querySelector('#commitMessage').addEventListener('input', function () { api.wait(); paint(); });
      host.querySelector('[data-save]').addEventListener('click', function () {
        var title = host.querySelector('#challengeEditor').value; var value = '<h1>' + title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</h1>'; lab.save('index.html', value);
        var heading = value.match(/<h1>([^<]*)<\/h1>/);
        host.querySelector('[data-preview]').textContent = heading ? heading[1] : 'No plain-text <h1> heading found';
        paint(); api.wait(); view.notify('Saved to your working directory. This has not changed a commit or your staged copy.', false);
      });
      host.querySelector('[data-check]').addEventListener('click', function () {
        if ('<h1>' + host.querySelector('#challengeEditor').value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</h1>' !== lab.state.files['index.html']) { api.wait(); view.notify('Your editor has unsaved changes. Save the file before checking.', false); return; }
        var result = lab.checkChallenge(); view.notify(result.text, result.ok);
        if (result.ok) { challengeDone = true; paint(); api.ready(); } else api.wait();
      });
    }
    paint(); return {};
  };

  beats.historyLab = function (host, beat, api, helpers) {
    var esc = helpers.esc, ic = helpers.ic, gconn = helpers.gconn,
        gnode = helpers.gnode, grefs = helpers.grefs, glegend = helpers.glegend,
        view = shell(host, beat, helpers), mode = beat.mode;
    var history = window.CourseLab.history(), newest = history.slice().reverse(), selected = newest[0].id;
    var seen = new Set(), shown = false, pair = ['7c2e0', '5f31a'], current = 'a83f1', visited = false;
    /* What the head-step terminal has already run, so the reader can see their
       own commands next to the position they produced. */
    var log = [];
    function commit(id) { return history.find(function (c) { return c.id === id; }); }
    function details(c) {
      return '<div class="course-detail is-arriving"><span class="blocklabel">Snapshot details</span><h3>' + esc(c.message) + '</h3><dl>' +
        [['Short ID', c.id], ['Author', c.author], ['Committed', c.date], ['Parent', c.parent || 'None · first commit'], ['Changed files', c.changed.join(', ')]].map(function (row) {
          return '<div><dt>' + esc(row[0]) + '</dt><dd>' + esc(row[1]) + '</dd></div>';
        }).join('') + '</dl><p class="course-muted">Inspecting this card does not move HEAD.</p></div>';
    }
    function nodes(type) {
      return '<ol class="course-timeline" aria-label="Commit history, newest first">' + newest.map(function (c) {
        var picked = type === 'compare' ? pair.includes(c.id) : selected === c.id;
        var badge = type === 'compare' ? (pair[0] === c.id ? 'From' : pair[1] === c.id ? 'To' : '') : mode === 'head' && current === c.id ? 'HEAD' : '';
        return '<li><button type="button" class="course-node' + (picked ? ' is-picked' : '') + '" data-node="' + c.id + '" aria-pressed="' + picked + '">' +
          '<span class="course-dot" aria-hidden="true"></span><span><strong>' + esc(c.message) + '</strong><small>' + esc(c.id) + ' · ' + esc(c.date.split(',')[0]) + '</small></span>' +
          (badge ? '<b class="course-badge">' + badge + '</b>' : '') + '</button></li>';
      }).join('') + '</ol>';
    }
    function bindNodes(fn) { view.workspace.querySelectorAll('[data-node]').forEach(function (btn) { btn.addEventListener('click', function () {
      var id = btn.dataset.node; fn(id); var next = view.workspace.querySelector('[data-node="' + id + '"]'); if (next) next.focus({ preventScroll: true });
    }); }); }
    /** The two commands the head step accepts; the hint names the one that fits. */
    function visitCommand() { return 'git switch --detach ' + selected; }
    function headHint() { return current === 'a83f1' ? visitCommand() : 'git switch main'; }
    /* The hint already names the command, so the note appears only when the hint
       alone would mislead: a83f1 is main's own tip, and visiting it is not the
       exercise. Kept to one short line - this panel is dense. */
    function headNote() {
      return current === 'a83f1' && selected === 'a83f1' ? 'Pick an older snapshot first.' : '';
    }
    /** Clear a consumed field so the next command starts from an empty prompt. */
    function consume(id) {
      var form = view.workspace.querySelector('[data-gitterm="' + id + '"]');
      if (form) { var input = form.querySelector('[data-gitterm-input]'); if (input) input.value = ''; }
    }
    function focusTerm(id) {
      var input = view.workspace.querySelector('[data-gitterm="' + id + '"] [data-gitterm-input]');
      if (input && !input.disabled) input.focus({ preventScroll: true });
    }
    function showDiff() {
      var a = commit(pair[0]), b = commit(pair[1]);
      view.workspace.querySelector('[data-diff]').innerHTML = '<p class="course-muted">' + esc(a.message + ' → ' + b.message) + '</p>' +
        code('$ git diff ' + a.id + ' ' + b.id + '\n\n' + (window.CourseLab.diff(a.content, b.content) || 'No content differences.'), esc);
    }
    function paint() {
      /* Read every terminal's text back before the panel is rebuilt, so a
         repaint (a select change, a snapshot visit) is not a reset. */
      var keep = {
        hlog: GitTerm.valueOf(view.workspace, 'hlog'),
        hcompare: GitTerm.valueOf(view.workspace, 'hcompare'),
        hswitch: GitTerm.valueOf(view.workspace, 'hswitch')
      };
      if (mode === 'quiz') {
        /* Real graph: nodes are real DOM (A/B/C text, radius/stroke in CSS), only
           edges are SVG; container and viewBox share the 470:150 ratio, so the
           percentages below are viewBox coordinates. HEAD is a .grefs reference pill. */
        var quizGraph = '<div class="gframe course-head-graph" style="--gw:470;--gh:150" role="img" aria-label="History A to B to C. HEAD points to C.">' +
          '<svg class="gedges" viewBox="0 0 470 150" preserveAspectRatio="none" aria-hidden="true" focusable="false">' +
            '<path class="gedge" d="M80 75 L235 75" pathLength="1"></path>' +
            '<path class="gedge" d="M235 75 L390 75" pathLength="1"></path>' +
          '</svg>' +
          /* A is the first commit, so it carries the root ring and centre dot;
             C is where HEAD is, so its ring is heavier and it has the halo. */
          gnode({ role: 'root', label: 'A', x: '17.021%', y: '50%', note: 'Oldest commit' }) +
          gnode({ role: 'main', label: 'B', x: '50%', y: '50%', note: 'Another commit' }) +
          gnode({ role: 'main', label: 'C', x: '82.979%', y: '50%', head: true, note: 'Newest commit' }) +
          grefs('82.979%', '50%', [{ name: 'HEAD', tone: 'head' }]) +
        '</div>' + glegend();
        view.workspace.innerHTML = '<section class="lesson-panel course-head-quiz">' + quizGraph + '<div class="course-actions">' + ['A', 'B', 'C'].map(function (id) { return button('Commit ' + id, 'data-answer="' + id + '"', false); }).join('') + '</div><p class="course-muted">Choose an answer to see why.</p></section>';
        view.workspace.querySelectorAll('[data-answer]').forEach(function (btn) { btn.addEventListener('click', function () {
          var correct = btn.dataset.answer === 'C';
          view.notify(correct ? 'Correct: HEAD points to C. In this example, a new commit would use C as its parent.' : 'Commit ' + btn.dataset.answer + ' is an earlier snapshot. Follow the HEAD label under C, then try again.', correct);
          if (correct) { api.ready(); view.workspace.querySelectorAll('[data-answer]').forEach(function (b) { b.disabled = true; }); btn.classList.add('is-answer'); } else { api.wait(); btn.classList.add('is-incorrect'); }
        }); }); return;
      }
      if (mode === 'log' && !shown) {
        view.workspace.innerHTML = '<section class="lesson-panel course-log-start">' + ic('history', 40) + '<h3>A week of work, ready to read.</h3><p>Ask Git for the record. Your files stay as they are.</p>' +
          GitTerm.form({ id: 'hlog', command: 'git log', value: keep.hlog, run: 'Show full log', label: 'Git command' }) + '</section>';
        return;
      }
      if (mode === 'compare') {
        var options = newest.map(function (c) { return '<option value="' + c.id + '">' + esc(c.id + ' · ' + c.message) + '</option>'; }).join('');
        var ready = pair[0] && pair[1] && pair[0] !== pair[1];
        /* Order is deliberate: the two selectors come FIRST, because picking what
           to compare is a precondition - the command is built from it and the diff
           follows. Layout reads select, then command, then result. */
        view.workspace.innerHTML = '<section class="lesson-panel"><h3>Two saved versions</h3><div class="course-compare-pair">' + pair.map(function (id, i) { var c = commit(id); return '<div><small>' + (i ? 'To' : 'From') + '</small><strong>' + esc(c ? c.message : 'Choose a snapshot') + '</strong><code>' + esc(id) + '</code></div>'; }).join(gconn('flush')) + '</div>' +
          '<details open class="lesson-hint course-other-pair"><summary>Try two other versions</summary><label class="course-label" for="compareFrom">From</label><select class="course-select" id="compareFrom">' + options + '</select><label class="course-label" for="compareTo">To</label><select class="course-select" id="compareTo">' + options + '</select></details>' +
          (ready
            ? GitTerm.form({ id: 'hcompare', command: 'git diff ' + pair[0] + ' ' + pair[1], value: keep.hcompare, run: 'Show what changed', label: 'Git command', note: 'The From and To snapshots above build this command.' })
            : '<p class="course-empty">Choose two different snapshots above to build the git diff command.</p>') +
          '<div data-diff><p class="course-empty">Compare the versions to see the changed lines.</p></div></section>';
        var from = view.workspace.querySelector('#compareFrom'), to = view.workspace.querySelector('#compareTo');
        // Empty selections remain explicit instead of silently choosing a snapshot.
        [from, to].forEach(function (select, i) {
          var empty = document.createElement('option'); empty.value = ''; empty.textContent = 'Choose a snapshot'; select.prepend(empty); select.value = pair[i] || '';
          select.addEventListener('change', function () { pair[i] = select.value; api.wait(); paint(); view.workspace.querySelector('.course-other-pair').open = true; view.workspace.querySelector(i ? '#compareTo' : '#compareFrom').focus(); });
        });
        return;
      }
      view.workspace.innerHTML = '<div class="course-grid"><section class="lesson-panel"><h3>' + (mode === 'log' ? 'Newest first' : 'Follow the parent connections') + '</h3>' + nodes('inspect') +
        '<p class="course-muted">Newest at the top · oldest at the bottom</p></section><section class="lesson-panel">' + details(commit(selected)) +
        (mode === 'head' ? '<div class="course-head-position"><span class="blocklabel">You are here</span><strong>' + esc(current === 'a83f1' ? 'HEAD → main → a83f1' : 'HEAD → ' + current) + '</strong><p>' +
          (current === 'a83f1' ? 'You are on main, at its latest commit.' : 'You are visiting an older commit directly. main still points to a83f1.') + '</p><small>Current saved heading</small><pre>' + esc(commit(current).content['index.html']) + '</pre></div>' +
          GitTerm.form({ id: 'hswitch', command: headHint(), value: keep.hswitch, log: log, label: 'Git command', note: headNote() }) +
          '<details open class="lesson-hint"><summary>Curious about the Git terms?</summary><p>Visiting an older snapshot uses git switch --detach &lt;id&gt;. This is called detached HEAD: HEAD points directly to a commit. Returning uses git switch main. A new commit builds on the current HEAD commit.</p></details>' : '') +
        '</section></div>' + (mode === 'log' ? '<details open class="lesson-hint course-full-log"><summary>Read the full git log output</summary>' + code('$ git log\n\n' + newest.map(function (c) { return 'commit ' + c.id + ' (short ID)\nAuthor: ' + c.author + '\nDate: ' + c.date + '\n\n    ' + c.message; }).join('\n\n'), esc) + '</details>' : '');
      bindNodes(function (id) {
        selected = id; seen.add(id); paint();
        if (mode === 'log') {
          var found = id === '5f31a'; view.notify(found ? 'Found it: 5f31a · Fix header · Wednesday, 9 September. Use this short ID to identify the snapshot.' : 'This commit is from ' + commit(id).date + '. Find Wednesday, 9 September.', found);
          if (found) api.ready(); else api.wait();
        } else if (mode === 'graph') {
          view.notify(seen.size >= 2 ? 'Every node is a saved snapshot. Its parent link shows which commit came before it; the initial commit has no parent.' : 'Now select a different commit and look at its parent and changed files.', seen.size >= 2);
          if (seen.size >= 2) api.ready();
        } else view.notify('Details selected. HEAD is still at ' + current + '. Type the command below to move.', visited && current === 'a83f1');
      });
    }
    function submitTerm(id, typed, form) {
      var value = typed.trim();
      if (!value) return;
      if (id === 'hlog') {
        /* A mismatch is the terminal's to report (shake + hint blink). A valid
           command in the wrong state is not - that message explains the state,
           and no hint can. Those keep using the feedback line. */
        if (!GitTerm.matches(value, 'git log')) { GitTerm.reject(form); return; }
        shown = true; paint();
        var node = view.workspace.querySelector('[data-node]'); if (node) node.focus({ preventScroll: true });
        return;
      }
      if (id === 'hcompare') {
        if (!pair[0] || !pair[1] || pair[0] === pair[1]) { view.notify('Choose two different snapshots to compare.', false); api.wait(); return; }
        var expected = 'git diff ' + pair[0] + ' ' + pair[1];
        if (!GitTerm.matches(value, expected)) { GitTerm.reject(form); api.wait(); return; }
        consume('hcompare'); paint(); showDiff(); focusTerm('hcompare');
        api.ready(); view.notify('The − lines belong to From; the + lines belong to To. This is the net change between those snapshots. HEAD and your working files have not moved.', true);
        return;
      }
      if (id !== 'hswitch') return;
      if (GitTerm.matches(value, visitCommand())) {
        if (selected === 'a83f1') { view.notify('a83f1 is the tip of main. Pick an older snapshot in the list first.', false); api.wait(); return; }
        log.push({ text: '$ ' + visitCommand(), tone: 'cmd' });
        log.push({ text: 'HEAD now points directly to ' + selected + '. You are visiting an older version; main still points to a83f1.', tone: 'dim' });
        current = selected; visited = true; consume('hswitch'); paint(); focusTerm('hswitch'); api.wait();
        view.notify('HEAD now points directly to ' + current + '. You are looking at an older version. Your latest work is still on main. Return to main to finish.', false);
        return;
      }
      if (GitTerm.matches(value, 'git switch main')) {
        if (current === 'a83f1') { view.notify('You are already on main. Visit an older snapshot first.', false); api.wait(); return; }
        log.push({ text: '$ git switch main', tone: 'cmd' });
        log.push({ text: 'Back on main: HEAD → main → a83f1. Nothing was deleted or rewritten.', tone: 'dim' });
        current = 'a83f1'; selected = current; consume('hswitch'); paint(); focusTerm('hswitch'); api.ready();
        view.notify('Back on main: HEAD → main → a83f1. Visiting history did not delete or rewrite any commit.', true);
        return;
      }
      /* Neither accepted command was typed: the hint names both, so the terminal
         reports it. */
      GitTerm.reject(form);
      api.wait();
    }
    /* Installed once, outside paint(): the panels below are rebuilt whole, and a
       per-render bind would stack a listener for every rebuild. */
    GitTerm.bind(view.workspace, submitTerm);
    paint(); return {};
  };
})();

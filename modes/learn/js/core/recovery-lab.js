(function () {
  'use strict';

  var beats = window.CHAPTER_BEATS = window.CHAPTER_BEATS || {};

  function shell(host, beat, helpers) {
    var esc = helpers.esc;
    var ic = helpers.ic;
    /* One shell shared by every kind in this file, so this single split covers
       all of chapters 11 and 12's boards. */
    helpers.brief(
      '<div class="lesson-guide__intro">' +
        '<span class="blocklabel">' + ic('book-open', 15) + ' Guided recovery lab</span>' +
        '<h2>' + esc(beat.title) + '</h2>' +
        '<p>' + esc(beat.text) + '</p>' +
      '</div>' +
      '<div class="lesson-guide__task">' + ic('mouse-pointer-click', 20) +
        '<strong>' + esc(beat.task) + '</strong></div>');

    host.innerHTML =
      '<div class="recovery-guide">' +
        '<div class="recovery-board"></div>' +
        '<div class="lesson-feedback" role="status" aria-live="polite" hidden></div>' +
        (beat.command ? '<details open class="lesson-hint lesson-command-note"><summary>' +
          esc(beat.commandLabel || 'Git command') + '</summary><pre class="lesson-code">' +
          esc(beat.command) + '</pre></details>' : '') +

      '</div>';

    var feedback = host.querySelector('.lesson-feedback');
    return {
      board: host.querySelector('.recovery-board'),
      notify: function (text, good) {
        feedback.hidden = false;
        feedback.textContent = text;
        feedback.classList.toggle('is-success', !!good);
      }
    };
  }

  /* A commit graph. Nodes and edges share one viewBox coordinate system: the
     .gframe aspect ratio equals the viewBox's, so percentage coordinates equal
     viewBox coordinates and endpoints land on the circle centers. */
  function timeline(h, commits, pointer, note) {
    var esc = h.esc, gnode = h.gnode, grefs = h.grefs, glegend = h.glegend;
    var GW = 470, GH = 150, Y = 75;
    var step = GW / commits.length;
    function x(i) { return Math.round(step * (i + 0.5) * 1000) / 1000; }
    function pct(v, span) { return (v / span * 100).toFixed(3) + '%'; }
    var paths = '', refs = '', dots = '';
    commits.forEach(function (commit, index) {
      var fresh = commit.extra ? ' ' + commit.extra : '';
      if (index) {
        paths += '<path class="gedge' + fresh + '" d="M' + x(index - 1) + ' ' + Y +
          ' L' + x(index) + ' ' + Y + '" pathLength="1"></path>';
      }
      var isHead = pointer === commit.label;
      dots += gnode({ role: commit.role, label: commit.label, note: commit.note,
        head: isHead, cls: (isHead ? 'is-pointer' : '') + fresh,
        x: pct(x(index), GW), y: pct(Y, GH) });
      /* HEAD is a reference, not a commit, so it is a pill on the commit it
         names, not another circle - and it hangs ABOVE, because the commit's
         own caption is below. */
      if (isHead) refs += grefs(pct(x(index), GW), pct(Y, GH), [{ name: 'HEAD', tone: 'head' }]);
    });
    return '<div class="gframe recovery-graph" style="--gw:' + GW + ';--gh:' + GH +
      '" role="img" aria-label="Commit graph">' +
      '<svg class="gedges" viewBox="0 0 ' + GW + ' ' + GH + '" preserveAspectRatio="none" aria-hidden="true" focusable="false">' +
        paths + '</svg>' + refs + dots + '</div>' +
      glegend() +
      (note ? '<p class="recovery-graph__note">' + esc(note) + '</p>' : '');
  }
  /* Turn a terminal transcript into GitTerm log entries. A line starting with
     "$ " is marked 'cmd' so the component colors it like the prompt; everything
     else is ordinary output. */
  function outputLog(lines) {
    return lines.map(function (line) {
      return line.indexOf('$ ') === 0
        ? { text: line, tone: 'cmd' }
        : { text: line };
    });
  }

  /* Section titles are h3 (spec 8): a beat's title is on the guide card, and
     these cells (Commit graph / Terminal / Reflog entries) are sections of the
     same topic, not a second one. */
  function panel(ic, title, body, cls) {
    return '<section class="recovery-panel' + (cls ? ' ' + cls : '') + '">' +
      '<h3>' + ic('layers', 17) + title + '</h3>' + body + '</section>';
  }

  function mountRevert(view, beat, api, helpers) {
    var esc = helpers.esc;
    var ic = helpers.ic;
    var done = false;
    var command = 'git revert C';

    function paint() {
      /* Read the field before the innerHTML swap, or a repaint eats whatever
         the reader has half-typed. */
      var draft = GitTerm.valueOf(view.board, 'revert');
      var commits = done
        ? [{ label: 'A', role: 'root', note: 'Initial commit' },
           { label: 'B', role: 'base', note: 'Update layout' },
           { label: 'C', role: 'bad', note: 'Add search' },
           { label: 'D', role: 'good', note: 'Revert "Add search"', extra: 'is-new' }]
        : [{ label: 'A', role: 'root', note: 'Initial commit' },
           { label: 'B', role: 'base', note: 'Update layout' },
           { label: 'C', role: 'bad', note: 'Add search' }];
      var graphNote = done
        ? 'D is a new commit whose changes undo C. C is still part of the history.'
        : 'C is the latest commit, and it contains the bug.';
      var output = done
        ? ['$ ' + command, '', '[main D] Revert "Add search"', ' 1 file changed, 3 insertions(+), 3 deletions(-)']
        : ['$ git log --oneline', 'C Add search', 'B Update layout', 'A Initial commit'];

      view.board.innerHTML =
        '<div class="recovery-status ' + (done ? 'is-good' : 'is-warn') + '">' +
          '<span>' + (done ? 'After revert' : 'Current history') + '</span><strong>' +
          (done ? 'The bug is undone with a new commit' : 'A → B → C') + '</strong></div>' +
        '<div class="recovery-grid">' +
          panel(ic, 'Commit graph', timeline(helpers, commits, done ? 'D' : 'C', graphNote), 'recovery-panel--graph') +
          panel(ic, 'Terminal', GitTerm.form({
            id: 'revert', command: command, value: draft, log: outputLog(output),
            run: 'Run', disabled: done
          }), 'recovery-panel--terminal') +
        '</div>' +
        '<div class="recovery-explain">' + ic(done ? 'shield-check' : 'circle-help', 18) +
          '<div><strong>' + (done ? 'History stays intact.' : 'What should happen?') + '</strong><p>' +
          esc(done ? 'Revert introduces a compensating commit. Shared history remains safe to publish.' :
            'Revert should remove the effect of C while preserving the record that C happened.') +
          '</p></div></div>';
    }

    /* One delegated listener for the whole board, installed once: paint()
       replaces the form's markup but never the board itself. */
    GitTerm.bind(view.board, function (id, typed, form) {
      if (done || id !== 'revert') return;
      if (!GitTerm.matches(typed, command)) {
        /* The hint spells the command out, so the terminal reports the mismatch
           itself (shake + hint blink) instead of a message elsewhere. */
        GitTerm.reject(form);
        return;
      }
      done = true;
      paint();
      view.notify('Correct. Commit D undoes C without erasing C from the graph.', true);
      api.ready();
    });

    paint();
  }

  function mountReset(view, beat, api, helpers) {
    var esc = helpers.esc;
    var ic = helpers.ic;
    var done = false;
    var command = 'git reset --hard B';

    function paint() {
      var draft = GitTerm.valueOf(view.board, 'reset');
      var commits = done
        ? [{ label: 'A', role: 'root', note: 'Initial commit' },
           { label: 'B', role: 'good', note: 'Update layout' }]
        : [{ label: 'A', role: 'root', note: 'Initial commit' },
           { label: 'B', role: 'base', note: 'Update layout' },
           { label: 'C', role: 'bad', note: 'Add search' },
           { label: 'D', role: 'bad', note: 'Fix footer' }];
      var output = done
        ? ['$ ' + command, 'HEAD is now at B Update layout']
        : ['$ git log --oneline', 'D Fix footer', 'C Add search', 'B Update layout', 'A Initial commit'];

      view.board.innerHTML =
        '<div class="recovery-status ' + (done ? 'is-good' : 'is-warn') + '">' +
          '<span>' + (done ? 'After hard reset' : 'Local-only repository') + '</span><strong>' +
          (done ? 'HEAD → B' : 'HEAD → D') + '</strong></div>' +
        '<div class="recovery-grid">' +
          panel(ic, 'Commit graph', timeline(helpers, commits, done ? 'B' : 'D',
            done ? 'C and D are no longer reachable from the current branch tip.' :
              'Move the current branch pointer back to the last known-good commit.'), 'recovery-panel--graph') +
          panel(ic, 'Terminal', GitTerm.form({
            id: 'reset', command: command, value: draft, log: outputLog(output),
            run: 'Run', disabled: done
          }), 'recovery-panel--terminal') +
        '</div>' +
        '<div class="recovery-warning">' + ic('triangle-alert', 19) +
          '<div><strong>Hard reset changes three layers.</strong><p>' +
          esc(done ? 'The branch pointer, staging area and working tree now match B. C and D may still be recoverable through reflog.' :
            'This is a local-only exercise. A hard reset changes the branch pointer, staging area and working tree together.') +
          '</p></div></div>';
    }

    GitTerm.bind(view.board, function (id, typed, form) {
      if (done || id !== 'reset') return;
      if (!GitTerm.matches(typed, command)) {
        /* The hint spells the command out, so the terminal reports the mismatch
           itself (shake + hint blink) instead of a message elsewhere. */
        GitTerm.reject(form);
        return;
      }
      done = true;
      paint();
      view.notify('The pointer moved back to B. The later commits are hidden from this branch tip, not necessarily destroyed.', true);
      api.ready();
    });

    paint();
  }

  function mountModes(view, beat, api, helpers) {
    var esc = helpers.esc;
    var ic = helpers.ic;
    var chosen = null;
    var seen = {};
    var modes = [
      { id: 'soft', label: '--soft', head: 'Move to B', index: 'Preserved', tree: 'Preserved',
        note: 'Use this when you want to rebuild the commit but keep everything selected.' },
      { id: 'mixed', label: '--mixed', head: 'Move to B', index: 'Reset', tree: 'Preserved',
        note: 'This is the default mode. Changes remain in the working tree, but are unstaged.' },
      { id: 'hard', label: '--hard', head: 'Move to B', index: 'Reset', tree: 'Reset',
        note: 'Use with care: the working tree is made to match B.' }
    ];
    var layers = [
      { key: 'head', label: 'HEAD pointer' },
      { key: 'index', label: 'Index / staging' },
      { key: 'tree', label: 'Working tree' }
    ];

    view.board.innerHTML =
        '<div class="recovery-status is-info"><span>Choose a mode</span><strong>git reset [mode] B</strong></div>' +
        '<div class="recovery-mode-tabs" role="group" aria-label="Reset modes">' +
          modes.map(function (mode) {
            return '<button class="recovery-mode-tab" type="button" data-mode="' + mode.id +
              '" aria-pressed="false">' + ic('layers', 16) +
              '<span class="recovery-mode-copy"><strong>' + mode.label + '</strong><small>' + esc(mode.note) +
              '</small><small class="recovery-mode-state">Click to compare</small></span>' +
              '<span class="recovery-mode-marker" aria-hidden="true">' + ic('check', 12) + '</span></button>';
          }).join('') +
        '</div>' +
        '<section class="recovery-panel recovery-panel--table"><h3>' + ic('git-branch', 17) +
          'Live comparison</h3><p class="recovery-comparison-note" role="status" aria-live="polite" aria-atomic="true">' +
          'Choose a mode to highlight its column. When you switch, changed values are marked.</p>' +
          '<p class="recovery-table-scroll-hint">Swipe the table to compare all modes.</p>' +
          '<div class="recovery-table-wrap" role="region" aria-label="Reset mode comparison" tabindex="0"><table class="recovery-table">' +
          '<thead><tr><th scope="col">Layer</th>' + modes.map(function (mode) {
            return '<th scope="col" data-mode-column="' + mode.id + '">' + mode.label +
              '<span class="recovery-table-active" hidden>' + ic('check', 12) + ' Selected</span></th>';
          }).join('') + '</tr></thead><tbody>' + layers.map(function (layer) {
            return '<tr><th scope="row">' + layer.label + '</th>' + modes.map(function (mode) {
              return '<td data-mode-cell="' + mode.id + '" data-layer-key="' + layer.key + '">' +
                '<span class="recovery-cell-before" hidden></span><span class="recovery-cell-value">' + mode[layer.key] +
                '</span><small class="recovery-cell-change" hidden>Changed</small></td>';
            }).join('') + '</tr>';
          }).join('') +
          '</tbody></table></div></section>' +
        '<div class="recovery-layers">' +
          layers.map(function (layer) {
            return '<div class="recovery-layer" data-layer="' + layer.key + '"><span>' + layer.label +
              '</span><strong>Choose a mode</strong><small class="recovery-layer-change" hidden></small></div>';
          }).join('') +
        '</div>' +
        '<p class="recovery-progress">' + ic('scan-search', 14) + '<span>0 / 3 modes explored</span></p>';

    view.board.querySelectorAll('[data-mode]').forEach(function (button) {
      button.addEventListener('click', function () {
        if (chosen === button.dataset.mode) return;
        var previous = modes.filter(function (mode) { return mode.id === chosen; })[0];
        var completeBefore = Object.keys(seen).length === modes.length;
        chosen = button.dataset.mode;
        seen[chosen] = true;
        var selected = modes.filter(function (mode) { return mode.id === chosen; })[0];
        var changed = layers.filter(function (layer) { return previous && previous[layer.key] !== selected[layer.key]; });

        view.board.querySelector('.recovery-status strong').textContent = 'git reset ' + selected.label + ' B';
        view.board.querySelectorAll('[data-mode]').forEach(function (tab) {
          var active = tab.dataset.mode === chosen;
          tab.classList.toggle('is-selected', active);
          tab.setAttribute('aria-pressed', String(active));
          tab.querySelector('.recovery-mode-state').textContent = active ? 'Viewing this mode' : seen[tab.dataset.mode] ? 'Explored · compare again' : 'Click to compare';
        });
        view.board.querySelectorAll('[data-mode-column]').forEach(function (heading) {
          var active = heading.dataset.modeColumn === chosen;
          heading.classList.toggle('is-selected', active);
          heading.querySelector('.recovery-table-active').hidden = !active;
        });
        view.board.querySelectorAll('[data-mode-cell]').forEach(function (cell) {
          var active = cell.dataset.modeCell === chosen;
          var key = cell.dataset.layerKey;
          var differs = active && !!previous && previous[key] !== selected[key];
          cell.classList.toggle('is-selected', active);
          cell.classList.toggle('is-changed', differs);
          cell.querySelector('.recovery-cell-before').hidden = !differs;
          cell.querySelector('.recovery-cell-before').textContent = differs ? previous[key] + ' → ' : '';
          cell.querySelector('.recovery-cell-change').hidden = !differs;
        });
        layers.forEach(function (layer) {
          var card = view.board.querySelector('[data-layer="' + layer.key + '"]');
          var differs = !!previous && previous[layer.key] !== selected[layer.key];
          card.classList.toggle('is-changed', differs);
          card.querySelector('strong').textContent = selected[layer.key];
          var detail = card.querySelector('.recovery-layer-change');
          detail.hidden = !previous;
          detail.textContent = differs ? previous[layer.key] + ' → ' + selected[layer.key] : 'Same as ' + (previous ? previous.label : '');
        });
        var comparison = previous
          ? 'Compared with ' + previous.label + ': ' + changed.map(function (layer) {
              return layer.label + ' changes from ' + previous[layer.key] + ' to ' + selected[layer.key];
            }).join('; ') + '. Other layers stay the same.'
          : 'Previewing ' + selected.label + '. The highlighted column shows what happens to each layer.';
        view.board.querySelector('.recovery-comparison-note').textContent = comparison;
        view.board.querySelector('.recovery-progress span').textContent = Object.keys(seen).length + ' / 3 modes explored';
        var wrap = view.board.querySelector('.recovery-table-wrap');
        var heading = view.board.querySelector('[data-mode-column="' + chosen + '"]');
        var bounds = wrap.getBoundingClientRect();
        var column = heading.getBoundingClientRect();
        var rowLabel = view.board.querySelector('.recovery-table thead th');
        var labelWidth = getComputedStyle(rowLabel).position === 'sticky' ? rowLabel.getBoundingClientRect().width : 0;
        if (column.left < bounds.left + labelWidth) wrap.scrollLeft -= bounds.left + labelWidth - column.left;
        else if (column.right > bounds.right) wrap.scrollLeft += column.right - bounds.right;
        if (!completeBefore && Object.keys(seen).length === modes.length) api.ready();
      });
    });

  }

  function mountPublicQuiz(view, beat, api, helpers) {
    var esc = helpers.esc;
    var ic = helpers.ic;
    var answered = false;
    var selected = null;
    var options = [
      { id: 'revert', label: 'git revert C', icon: 'rotate-ccw',
        description: 'Add a new commit that undoes C.',
        why: 'Correct. Revert adds a new commit and does not rewrite the shared branch.' },
      { id: 'reset', label: 'git reset --hard B', icon: 'arrow-left',
        description: 'Move the current branch back to B.',
        why: 'Reset rewrites the current branch pointer. That can disrupt teammates who already pulled C.' },
      { id: 'delete', label: 'Delete the branch', icon: 'trash-2',
        description: 'Remove the branch name.',
        why: 'Deleting a branch does not undo a commit on the shared branch.' }
    ];

    view.board.innerHTML =
      '<div class="recovery-status is-info"><span>Shared remote branch</span><strong>main has already been pushed</strong></div>' +
      '<section class="recovery-panel recovery-panel--quiz"><h3 id="recovery-question">' + ic('users', 17) +
        'Which repair avoids rewriting public history?</h3>' +
        '<p class="recovery-quiz-hint" id="recovery-quiz-hint">Choose one answer, then check it. You can change your selection.</p>' +
        '<div class="recovery-choices" role="group" aria-labelledby="recovery-question" aria-describedby="recovery-quiz-hint">' +
        options.map(function (option, index) {
          return '<button class="recovery-choice" type="button" data-choice="' + option.id + '" aria-pressed="false">' +
            '<span class="recovery-choice-letter" aria-hidden="true">' + String.fromCharCode(65 + index) + '</span>' +
            '<span class="recovery-choice-copy"><strong>' + esc(option.label) + '</strong><small>' + esc(option.description) + '</small></span>' +
            '<span class="recovery-choice-marker" aria-hidden="true">' + ic('check', 15) + '</span></button>';
        }).join('') + '</div><div class="recovery-quiz-actions">' +
        '<span class="recovery-quiz-state">No answer selected</span>' +
        '<button class="btn btn--primary recovery-check-answer" type="button" disabled>' + ic('check', 16) + ' Check answer</button>' +
        '</div><div class="recovery-choice-feedback" role="status" aria-live="polite" aria-atomic="true"></div></section>';

    var checkButton = view.board.querySelector('.recovery-check-answer');
    var feedback = view.board.querySelector('.recovery-choice-feedback');
    var state = view.board.querySelector('.recovery-quiz-state');
    view.board.querySelectorAll('[data-choice]').forEach(function (button) {
      button.addEventListener('click', function () {
        if (answered) return;
        selected = button.dataset.choice;
        view.board.querySelectorAll('.recovery-choice').forEach(function (optionButton) {
          var active = optionButton === button;
          optionButton.classList.remove('is-wrong', 'is-correct');
          optionButton.classList.toggle('is-selected', active);
          optionButton.setAttribute('aria-pressed', String(active));
          optionButton.querySelector('.recovery-choice-marker').innerHTML = ic('check', 15);
        });
        feedback.textContent = '';
        feedback.classList.remove('is-correct', 'is-wrong');
        state.textContent = 'Option ' + button.querySelector('.recovery-choice-letter').textContent + ' selected';
        checkButton.disabled = false;
      });
    });
    checkButton.addEventListener('click', function () {
      if (answered || !selected) return;
      var choice = options.filter(function (option) { return option.id === selected; })[0];
      var correct = choice.id === 'revert';
      var button = view.board.querySelector('[data-choice="' + selected + '"]');
      button.classList.add(correct ? 'is-correct' : 'is-wrong');
      button.querySelector('.recovery-choice-marker').innerHTML = ic(correct ? 'check' : 'x', 15);
      feedback.classList.toggle('is-correct', correct);
      feedback.classList.toggle('is-wrong', !correct);
      feedback.innerHTML = ic(correct ? 'circle-check' : 'circle-help', 20) + '<span><strong>' +
        (correct ? 'History protected!' : 'Try another approach') + '</strong>' + esc(choice.why) + '</span>';
      state.textContent = correct ? 'Correct answer' : 'Choose again and check your answer';
      checkButton.disabled = !correct;
      if (correct) {
        answered = true;
        checkButton.innerHTML = ic('circle-check', 16) + ' Answer checked';
        checkButton.setAttribute('aria-disabled', 'true');
        view.board.querySelectorAll('[data-choice]').forEach(function (optionButton) {
          optionButton.disabled = true;
        });
        api.ready();
      }
    });
  }

  function mountReflog(view, beat, api, helpers) {
    var esc = helpers.esc;
    var ic = helpers.ic;
    var selected = null;
    var entries = [
      { id: '0', ref: 'HEAD@{0}', action: 'reset: moving to HEAD~3', hash: 'A', title: 'Current tip after the reset', body: '<h1>Starter page</h1>' },
      { id: '1', ref: 'HEAD@{1}', action: 'commit: Add search', hash: 'D', title: 'Add search', body: '<h1>Search page</h1>' },
      { id: '2', ref: 'HEAD@{2}', action: 'commit: Create layout', hash: 'C', title: 'Create layout', body: '<h1>Search page</h1><p>Keyboard support</p>' },
      { id: '3', ref: 'HEAD@{3}', action: 'commit: Initial commit', hash: 'B', title: 'Initial commit', body: '<h1>Starter page</h1>' }
    ];

    function paint() {
      var picked = entries.filter(function (entry) { return entry.id === selected; })[0];
      var contextGraph =
        '<div class="recovery-context-visual">' +
          panel(ic, 'Before reset', timeline(helpers,
            [{ label: 'A', role: 'root', note: 'Initial commit' },
             { label: 'B', role: 'base', note: 'Update layout' },
             { label: 'C', role: 'base', note: 'Add search' },
             { label: 'D', role: 'base', note: 'Fix footer' }], 'D',
            'HEAD is at D. HEAD~3 follows the chain back to A.'), 'recovery-panel--graph') +
          panel(ic, 'After reset', timeline(helpers,
            [{ label: 'A', role: 'good', note: 'Initial commit' },
             { label: 'B', role: 'base', note: 'Update layout' },
             { label: 'C', role: 'base', note: 'Add search' },
             { label: 'D', role: 'bad', note: 'Fix footer' }], 'A',
            'HEAD and main are now at A; HEAD@{1} still remembers D.'), 'recovery-panel--graph') +
        '</div>';

      view.board.innerHTML =
        '<div class="recovery-status is-warn"><span>OH NO.</span><strong>HEAD moved backwards, but the trail remains</strong></div>' +
        contextGraph +
        '<div class="recovery-grid">' +
          panel(ic, 'Reflog entries', '<div class="reflog-list">' + entries.map(function (entry) {
            return '<button class="reflog-entry' + (selected === entry.id ? ' is-selected' : '') +
              '" type="button" data-entry="' + entry.id + '"><span>' + entry.ref + '</span><strong>' +
              entry.action + '</strong><small>' + entry.hash + '</small></button>';
          }).join('') + '</div>', 'recovery-panel--log') +
          panel(ic, 'Snapshot inspector', picked
            ? '<div class="reflog-preview"><span class="blocklabel">' + ic('file-text', 14) + ' ' + picked.hash + '</span>' +
              '<h3>' + esc(picked.title) + '</h3><pre>' + esc(picked.body) + '</pre>' +
              '<p>Inspecting this entry does not move HEAD.</p></div>'
            : '<div class="reflog-empty">' + ic('search', 28) + '<p>Select a reflog entry to inspect its snapshot.</p></div>',
            'recovery-panel--preview') +
        '</div>' +
        '<p class="recovery-progress">' + ic('scan-search', 14) +
          esc(selected === '1' ? 'The earlier commit is located.' : 'Find the earlier commit named Add search.') + '</p>';

      view.board.querySelectorAll('[data-entry]').forEach(function (button) {
        button.addEventListener('click', function () {
          selected = button.dataset.entry;
          paint();
          var entry = entries.filter(function (item) { return item.id === selected; })[0];
          var good = selected === '1';
          view.notify(good ? 'Found it. HEAD@{1} points to commit D, the Add search snapshot.' :
            'This is a real reflog entry, but keep looking for Add search.', good);
          if (good) api.ready();
          view.board.querySelector('[data-entry="' + selected + '"]').focus();
        });
      });
    }

    paint();
  }

  function mountRecover(view, beat, api, helpers) {
    var esc = helpers.esc;
    var ic = helpers.ic;
    var used = {};
    /* The two options are separate commands against the same commit label. The
       command text lives here, not in a <pre>: GitTerm.form renders it as the
       hint, so writing it twice would just say it twice. */
    var branchCommand = 'git switch -c recovery D';
    var moveCommand = 'git reset --hard D';

    function paint() {
      /* Both fields may hold a draft when the other option is submitted. */
      var draftBranch = GitTerm.valueOf(view.board, 'branch');
      var draftMove = GitTerm.valueOf(view.board, 'move');
      var branch = used.branch ? 'recovery → D' : 'main → A';
      var moved = used.move ? 'main → D' : 'main → A';
      view.board.innerHTML =
        '<div class="recovery-status is-info"><span>Rescue target</span><strong>D · Add search</strong></div>' +
        '<div class="recovery-grid recovery-grid--rescue">' +
          panel(ic, 'Option 1 · Create a recovery branch',
            '<p class="recovery-card-copy">Safest first move: give the old commit a new name so it cannot be lost while you investigate.</p>' +
            GitTerm.form({
              id: 'branch', command: branchCommand, value: draftBranch,
              log: used.branch
                ? [{ text: '$ ' + branchCommand, tone: 'cmd' },
                   { text: "Switched to a new branch 'recovery'", tone: 'good' }]
                : [],
              run: 'Run', disabled: used.branch,
              /* The two rescue commands are peer options with equal-weight Run
                 buttons, so both use the normal style; the primary button is
                 reserved for Continue after both are tried (spec 1). */
              secondary: true
            }) +
            '<div class="recovery-result">' + esc(branch) + '</div>', 'recovery-panel--rescue') +
          panel(ic, 'Option 2 · Move the current branch',
            '<p class="recovery-card-copy">Once you are certain, move the current branch pointer back to the rescued commit.</p>' +
            GitTerm.form({
              id: 'move', command: moveCommand, value: draftMove,
              log: used.move
                ? [{ text: '$ ' + moveCommand, tone: 'cmd' },
                   { text: 'HEAD is now at D Add search', tone: 'good' }]
                : [],
              run: 'Run', disabled: used.move,
              secondary: true
            }) +
            '<div class="recovery-result">' + esc(moved) + '</div>', 'recovery-panel--rescue') +
        '</div>' +
        '<div class="recovery-explain">' + ic('shield-check', 18) +
          '<div><strong>Recovery is a two-step habit.</strong><p>Make a name for the commit first; decide what the permanent branch should do second.</p></div></div>' +
        '<p class="recovery-progress">' + ic('scan-search', 14) + esc(Object.keys(used).length + ' / 2 rescue approaches tried') + '</p>';
    }

    GitTerm.bind(view.board, function (id, typed, form) {
      var command = id === 'branch' ? branchCommand : id === 'move' ? moveCommand : null;
      if (!command || used[id]) return;
      if (!GitTerm.matches(typed, command)) {
        /* The hint spells the command out, so the terminal reports the mismatch
           itself (shake + hint blink) instead of a message elsewhere. */
        GitTerm.reject(form);
        return;
      }
      used[id] = true;
      paint();
      var complete = Object.keys(used).length === 2;
      view.notify(id === 'branch'
        ? 'The old commit now has a safe branch name: recovery.'
        : 'main now points at the rescued commit. In a real repository, inspect before pushing.', complete);
      if (complete) api.ready();
    });

    paint();
  }

  function mountChecklist(view, beat, api, helpers) {
    var esc = helpers.esc;
    var ic = helpers.ic;
    var index = 0;
    var steps = [
      { icon: 'pause', label: 'Stop and do not panic', note: 'Avoid stacking more commands on top of the mistake.' },
      { icon: 'git-branch', label: 'Run git status', note: 'Name the branch and see whether the working tree is clean.' },
      { icon: 'history', label: 'Examine git log', note: 'Read the commits that are still reachable from the current tip.' },
      { icon: 'search', label: 'Consult git reflog if needed', note: 'Look for earlier positions of HEAD.' },
      { icon: 'target', label: 'Choose a repair strategy', note: 'Create a rescue branch, reset locally or revert shared history.' }
    ];

    function paint() {
      view.board.innerHTML =
        '<div class="recovery-status is-info"><span>First aid</span><strong>' + (index >= steps.length ? 'You have a repair plan' : 'One calm step at a time') + '</strong></div>' +
        '<section class="recovery-panel recovery-panel--checklist"><div class="recovery-checklist-heading"><div><h3>' + ic('list-checks', 17) + 'Decision checklist</h3><p>Each row is a reminder. The only clickable control is the current step\'s action.</p></div><span class="recovery-checklist-count">' + Math.min(index, steps.length) + ' / ' + steps.length + '</span></div>' +
          '<ol class="recovery-checklist">' + steps.map(function (step, stepIndex) {
            var state = stepIndex < index ? 'is-done' : stepIndex === index ? 'is-current' : '';
            var status = stepIndex < index
              ? '<span class="recovery-step-status is-done">Done ' + ic('check', 14) + '</span>'
              : stepIndex === index
                ? '<span class="recovery-step-status is-current">Start here</span>'
                : '<span class="recovery-step-status">Next</span>';
            var action = stepIndex === index
              ? '<button class="btn btn--primary recovery-checklist-action" type="button" data-step="' + stepIndex + '">' + ic('arrow-right', 15) + (stepIndex === 0 ? 'Start this step' : 'Continue') + '</button>'
              : '';
            return '<li class="' + state + '"' + (stepIndex === index ? ' aria-current="step"' : '') + '>' +
              '<div class="recovery-checklist-step">' +
                '<span class="recovery-step-icon">' + ic(step.icon, 18) + '</span>' +
                '<span class="recovery-step-copy"><strong>' + esc(step.label) + '</strong><small>' + esc(step.note) + '</small></span>' +
                status +
              '</div>' + action + '</li>';
          }).join('') + '</ol>' +
          '<div class="recovery-checklist-feedback">' + (index >= steps.length
            ? 'The next command should follow from the evidence you gathered.' :
              (index === 0 ? 'Start with the first row. Its action button is the only control to press.' : 'Continue with: ' + steps[index].label + '.')) + '</div></section>' +
        '<p class="recovery-progress">' + ic('scan-search', 14) + esc(Math.min(index, steps.length) + ' / ' + steps.length + ' steps complete') + '</p>';

      view.board.querySelectorAll('[data-step]').forEach(function (button) {
        button.addEventListener('click', function () {
          if (Number(button.dataset.step) !== index) return;
          index++;
          paint();
          var complete = index >= steps.length;
          view.notify(complete ? 'That is the recovery habit: inspect first, then choose the smallest repair that fits.' :
            'Good. Now continue with the next check.', complete);
          if (complete) api.ready();
        });
      });
    }

    paint();
  }

  beats.recoveryLab = function (host, beat, api, helpers) {
    var view = shell(host, beat, helpers);
    if (beat.mode === 'revert') mountRevert(view, beat, api, helpers);
    else if (beat.mode === 'reset') mountReset(view, beat, api, helpers);
    else if (beat.mode === 'reset-modes') mountModes(view, beat, api, helpers);
    else if (beat.mode === 'public-quiz') mountPublicQuiz(view, beat, api, helpers);
    else if (beat.mode === 'reflog') mountReflog(view, beat, api, helpers);
    else if (beat.mode === 'recover') mountRecover(view, beat, api, helpers);
    else if (beat.mode === 'checklist') mountChecklist(view, beat, api, helpers);
    else {
      view.board.innerHTML = '<p class="hintline">Unknown recovery lab: ' + helpers.esc(beat.mode) + '</p>';
      api.ready();
    }
    return {};
  };
})();

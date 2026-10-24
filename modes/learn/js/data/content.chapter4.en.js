(function () {
  'use strict';
  var ui = window.CHAPTER_CONTENT.ui;
  function page(id, label, icon, title, text, task) {
    return { id: id, nav: { label: label, icon: icon }, beats: [{ kind: 'historyLab', mode: id,
      title: title, text: text, task: task, waitHint: 'Explore the example above to continue.' }] };
  }
  window.CHAPTER_CONTENT = {
    meta: { number: 4, title: 'Explore Git history', minutes: 12, nextUrl: '?ch=5' }, ui: ui,
    pages: [
      page('log', 'Read git log', 'history', 'Five snapshots. One story.',
        'Your teammate asks: “What did the project look like on Wednesday?” A commit’s date, message and short ID help you find the right moment.',
        'Show the log, then select the commit from Wednesday, 9 September.'),
      page('graph', 'Explore the graph', 'git-commit-horizontal', 'History has connections.',
        'Each dot is a commit. A connecting line joins it to its parent: the commit it was built on. Here, all five commits form one simple line.',
        'Select any two different commits to compare their details and parents.'),
      page('compare', 'Compare snapshots', 'files', 'What did the header fix change?',
        'Compare Add login with Fix header. You see the net difference between two saved snapshots, without switching versions or editing a file.',
        'Compare the selected pair. Then try any other two commits, in either direction.'),
      page('head', 'Find HEAD', 'target', 'You are here.',
        'HEAD tells Git your current position. Usually it points to a branch, such as main, and that branch points to a commit.',
        'Visit an older snapshot in this simulation, then return to main.'),
      { id: 'quiz', nav: { label: 'Check your understanding', icon: 'badge-check' }, beats: [
        { kind: 'historyLab', mode: 'quiz', title: 'Read the marker.',
          text: 'This example runs from the oldest commit on the left to the newest on the right.',
          task: 'Which commit is HEAD pointing to?', waitHint: 'Choose the commit marked by HEAD.', confirm: 'One more quick check' },
        { kind: 'quizRun', nextLabel: 'Next question', waitHint: 'Answer the statement', confirm: 'See my recap',
          statements: [
            { id: 'c4q1', icon: 'history', text: 'By default, git log shows the newest commit first.', answer: true, why: 'Read from newest to oldest. Dates and short IDs help you identify a particular snapshot.' },
            { id: 'c4q2', icon: 'files', text: 'Comparing two snapshots changes the files in your working directory.', answer: false, why: 'A diff is a read-only comparison. It shows differences between endpoints, not a checkout.' },
            { id: 'c4q3', icon: 'target', text: 'Selecting a commit to read its details automatically moves HEAD.', answer: false, why: 'Inspecting history leaves HEAD alone. Switching to a snapshot is a separate action.' }
          ], verdict: { icon: 'badge-check', headline: 'You can read the past.', text: 'A log gives the entries, a graph gives their connections, and HEAD marks your position.' } },
        { kind: 'finishPanel', icon: 'trophy', title: 'Chapter 4 complete',
          recap: 'You found a dated commit, followed parent connections, compared saved content and located HEAD.',
          model: [{ icon: 'history', label: 'Find a snapshot' }, { icon: 'files', label: 'Compare content' }, { icon: 'target', label: 'Locate HEAD' }],
          next: 'Next: learn how branches keep different lines of work separate.', confirm: 'Continue to Chapter 5' }
      ] }
    ]
  };
})();

(function () {
  'use strict';

  var ui = window.CHAPTER_CONTENT.ui;

  window.CHAPTER_CONTENT = {
    meta: { number: 11, title: 'Revert and reset', minutes: 14, nextUrl: '?ch=12' },
    ui: ui,
    pages: [
      {
        id: 'revert',
        nav: { label: 'Revert a bad commit', icon: 'rotate-ccw' },
        beats: [
          { kind: 'recoveryLab', mode: 'revert',
            title: 'Undo the effect, keep the record.',
            text: 'Commit C contains a bug, but the project history is already useful evidence. Add a new commit that reverses C instead of pretending C never happened.',
            task: 'Run the safe repair for a commit that is already part of history.',
            command: 'git revert C',
            commandLabel: 'Command to practise',
            waitHint: 'Run git revert C to create the compensating commit.' }
        ]
      },
      {
        id: 'reset',
        nav: { label: 'Reset a local branch', icon: 'arrow-left' },
        beats: [
          { kind: 'recoveryLab', mode: 'reset',
            title: 'Move the pointer back.',
            text: 'This repository is local-only. The current branch points to D, but B is the last known-good snapshot. Reset the branch and make the working tree match it.',
            task: 'Use a hard reset to return the local branch to B.',
            command: 'git reset --hard B',
            commandLabel: 'Command to practise',
            waitHint: 'Run git reset --hard B in this local-only simulation.' }
        ]
      },
      {
        id: 'reset-modes',
        nav: { label: 'Compare reset modes', icon: 'layers' },
        beats: [
          { kind: 'recoveryLab', mode: 'reset-modes',
            title: 'The mode decides what stays.',
            text: 'All reset modes move HEAD. The difference is what happens to the index and the working tree afterwards.',
            task: 'Inspect soft, mixed and hard. Watch all three repository layers change.',
            waitHint: 'Try each reset mode to compare the three layers.' }
        ]
      },
      {
        id: 'public-history',
        nav: { label: 'Protect shared history', icon: 'users' },
        beats: [
          { kind: 'recoveryLab', mode: 'public-quiz',
            title: 'A bad commit is already pushed.',
            text: 'Your teammates may have based work on the public branch. Choose the repair that communicates the undo without rewriting the branch underneath them.',
            task: 'Which approach avoids rewriting public shared history?',
            waitHint: 'Choose the command that adds a new undo commit.' }
        ]
      },
      {
        id: 'recap',
        nav: { label: 'Chapter recap', icon: 'badge-check' },
        beats: [
          { kind: 'quizRun', nextLabel: 'Next question', waitHint: 'Answer the statement', confirm: 'See my recap',
            statements: [
              { id: 'c11q1', icon: 'rotate-ccw', text: 'git revert creates a new commit that undoes earlier changes.', answer: true,
                why: 'That is why revert is the usual choice for a commit already shared with a team.' },
              { id: 'c11q2', icon: 'arrow-left', text: 'git reset --hard moves HEAD, the index and the working tree together.', answer: true,
                why: 'Hard reset makes all three layers match the target commit.' },
              { id: 'c11q3', icon: 'users', text: 'A hard reset is the safest way to repair a public branch.', answer: false,
                why: 'Public history should usually be repaired with a new commit, not rewritten underneath collaborators.' }
            ],
            verdict: { icon: 'badge-check', headline: 'Choose the layer and the audience.', text: 'Revert preserves shared history. Reset moves a local branch pointer, and its mode controls what remains in your other layers.' } },
          { kind: 'finishPanel', icon: 'trophy', title: 'Chapter 11 complete',
            recap: 'You reversed a committed change with revert, moved a local branch with reset, compared reset modes and protected public history.',
            model: [
              { icon: 'rotate-ccw', label: 'Revert shared work' },
              { icon: 'arrow-left', label: 'Reset locally' },
              { icon: 'layers', label: 'Choose a mode' }
            ],
            next: 'Next: use reflog and recovery branches when a command moves farther than intended.',
            confirm: 'Continue to Chapter 12' }
        ]
      }
    ]
  };
})();

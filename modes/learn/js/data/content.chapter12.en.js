(function () {
  'use strict';

  var ui = window.CHAPTER_CONTENT.ui;

  window.CHAPTER_CONTENT = {
    meta: { number: 12, title: 'Git first aid', minutes: 11, nextUrl: '?ch=13' },
    ui: ui,
    pages: [
      {
        id: 'reflog',
        nav: { label: 'Find the reflog trail', icon: 'history' },
        beats: [
          { kind: 'scene', icon: 'git-branch',
            text: 'Before the mistake, main has four commits: A → B → C → D, and HEAD points to D. You want to jump back three commits, so you run git reset --hard HEAD~3.',
            confirm: 'Explain the reset' },
          { kind: 'scene', icon: 'book-open',
            text: 'HEAD~3 is a relative commit reference: start at the current HEAD and follow its parent three times. In this example, D → C → B → A, so HEAD~3 means commit A. The --hard flag also makes the working files match A.',
            confirm: 'See what Git still remembers' },
          { kind: 'scene', icon: 'history',
            text: 'After the reset, main shows A, but the old tip D has not vanished from this local repository. git reflog records where HEAD has moved: HEAD@{0} is the new position after the reset, and HEAD@{1} is the position immediately before it.',
            confirm: 'Open the reflog trail' },
          { kind: 'recoveryLab', mode: 'reflog',
            title: 'Read the trail before touching anything.',
            text: 'The reflog records the earlier Add search snapshot as commit D. Find that entry and inspect it without moving HEAD.',
            task: 'Select HEAD@{1}, the position before the reset, and inspect its snapshot.',
            command: 'git reflog',
            commandLabel: 'Command to practise',
            waitHint: 'Find HEAD@{1} · commit D: Add search.' }
        ]
      },
      {
        id: 'recover',
        nav: { label: 'Rescue lost work', icon: 'shield-check' },
        beats: [
          { kind: 'scene', icon: 'history',
            text: 'The reflog points to commit D, the old Add search snapshot.',
            confirm: 'Compare the rescue choices' },
          { kind: 'scene', icon: 'git-branch',
            text: 'The current main branch is still at A. First give D a safe name with a recovery branch. Only after inspecting it should you decide whether main should move back to D.',
            confirm: 'Try the rescue commands' },
          { kind: 'recoveryLab', mode: 'recover',
            title: 'Give commit D a safe name.',
            text: 'Both rescue options below point to commit D. The first keeps a named pointer to D; the second moves main to D after you are confident it is the right snapshot.',
            task: 'Run both commands in order: create the recovery branch, then compare moving main.',
            command: 'git switch -c recovery D',
            commandLabel: 'Safer first command',
            waitHint: 'Try both rescue approaches to compare them.' }
        ]
      },
      {
        id: 'checklist',
        nav: { label: 'First-aid checklist', icon: 'list-checks' },
        beats: [
          { kind: 'recoveryLab', mode: 'checklist',
            title: 'When something goes wrong, slow down.',
            text: 'Recovery is less about memorising a magic command and more about gathering enough evidence to choose a small, reversible next step.',
            task: 'Use the labelled Start this step button, then continue from top to bottom.',
            waitHint: 'Start with the first item; only the current step is actionable.' }
        ]
      },
      {
        id: 'recap',
        nav: { label: 'Chapter recap', icon: 'badge-check' },
        beats: [
          { kind: 'quizRun', nextLabel: 'Next question', waitHint: 'Answer the statement', confirm: 'See my recap',
            statements: [
              { id: 'c12q1', icon: 'history', text: 'The reflog can show earlier positions of HEAD after a reset.', answer: true,
                why: 'Reflog records local reference movement, including the position before the reset.' },
              { id: 'c12q2', icon: 'git-branch', text: 'Creating a recovery branch can give a rescued commit a stable name.', answer: true,
                why: 'A branch name keeps the commit reachable while you inspect and decide what to do next.' },
              { id: 'c12q3', icon: 'triangle-alert', text: 'The best first response to a Git mistake is to run more commands quickly.', answer: false,
                why: 'Stop, inspect status/log/reflog and choose a repair strategy from evidence.' }
            ],
            verdict: { icon: 'shield-check', headline: 'Recovery starts with evidence.', text: 'Reflog helps you locate moved commits, a recovery branch gives them a safe name, and a checklist keeps the next action deliberate.' } },
          { kind: 'finishPanel', icon: 'trophy', title: 'Chapter 12 complete',
            recap: 'You inspected reflog, rescued a hidden commit, compared recovery paths and practised a calm first-aid routine.',
            model: [
              { icon: 'history', label: 'Find old HEAD positions' },
              { icon: 'git-branch', label: 'Name rescued work' },
              { icon: 'list-checks', label: 'Choose the next step' }
            ],
            next: 'Next, practise working as Alice, Bob and Carol through a complete team workflow.',
            confirm: 'Start Chapter 13' }
        ]
      }
    ]
  };
})();

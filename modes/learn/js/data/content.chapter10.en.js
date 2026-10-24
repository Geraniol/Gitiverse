/* Chapter 10: Undoing changes — before a commit exists. */
(function () {
  'use strict';

  var sharedUI = window.CHAPTER_CONTENT.ui;

  window.CHAPTER_CONTENT = {
    meta: { number: 10, title: 'Undoing changes', minutes: 18, nextUrl: '?ch=11' },
    ui: sharedUI,
    undo: {
      task: 'Your task',
      simulation: 'Guided simulation · your real files are untouched',
      file: 'index.html',
      branch: 'main',
      restore: 'git restore index.html',
      unstage: 'git restore --staged index.html',
      status: 'git status',
      head: 'Latest commit',
      working: 'Working Directory',
      staging: 'Staging Area',
      clean: 'clean',
      modified: 'modified',
      staged: 'staged'
    },
    pages: [
      {
        id: 'restore-working', nav: { label: 'Discard a local edit', icon: 'rotate-ccw' },
        beats: [
          {
            kind: 'undoIntro', icon: 'rotate-ccw',
            text: 'You changed index.html before committing. Sometimes you want to throw that edit away; other times you want to keep the edit but remove it from staging. This chapter shows the difference.',
            confirm: 'Start with restore'
          },
          {
            kind: 'undoLab', mode: 'working',
            title: 'First, discard an unwanted working-directory edit.',
            text: 'The latest commit is safe. Only your local copy of index.html has changed. You have decided that this edit is wrong and you want the saved version back.',
            task: 'Inspect what will be lost, then type git restore index.html. After the command runs, look at the Working Directory and verify the result with git status.',
            waitHint: 'Inspect the diff, run git restore index.html, then verify with git status.'
          }
        ]
      },
      {
        id: 'restore-staged', nav: { label: 'Unstage without losing work', icon: 'undo-2' },
        beats: [
          {
            kind: 'undoLab', mode: 'staged',
            title: 'Now keep the edit, but remove it from staging.',
            text: 'This time the edit is useful. You already staged index.html, but you do not want it in the next commit yet. The file should stay edited in your Working Directory.',
            task: 'Compare the three states, then type git restore --staged index.html. Watch the Staging Area change while the Working Directory keeps your edit. Verify with git status.',
            waitHint: 'Run git restore --staged index.html, then verify that the edit is still in the Working Directory.'
          },
          {
            kind: 'quizRun', nextLabel: 'Next question', waitHint: 'Choose true or false', confirm: 'See the result',
            statements: [
              {
                id: 'c10q1', icon: 'rotate-ccw',
                text: 'Your local edit is wrong, has not been committed, and you want the saved version back. git restore index.html fits that goal.', answer: true,
                why: 'Plain git restore changes the Working Directory. In this scenario it replaces the unwanted local edit with the saved version.'
              },
              {
                id: 'c10q2', icon: 'undo-2',
                text: 'You want to keep your edit but remove it from the next commit. git restore --staged index.html fits that goal.', answer: true,
                why: 'The --staged option targets the Staging Area. Your edited working file remains.'
              },
              {
                id: 'c10q3', icon: 'triangle-alert',
                text: 'git restore index.html and git restore --staged index.html are basically the same because both use the word restore.', answer: false,
                why: 'They target different states. Plain restore can replace the working file; --staged changes what is selected for the next commit.'
              },
              {
                id: 'c10q4', icon: 'scan-search',
                text: 'Before discarding an uncommitted edit, checking the diff or repository state is a safer habit.', answer: true,
                why: 'A discarded working-directory edit may be difficult or impossible to recover, so inspect before you remove it.'
              }
            ],
            verdict: {
              icon: 'badge-check',
              headline: 'Choose the command from what you want to keep.',
              text: 'Discard the file edit: use plain restore. Keep the edit but unstage it: use restore --staged. The key is which Git state you want to change.'
            }
          },
          {
            kind: 'finishPanel', icon: 'trophy', title: 'Chapter 10 complete',
            recap: 'You discarded an unwanted local edit, unstaged a useful edit without losing it, and learned to check the target state before undoing anything.',
            model: [
              { icon: 'rotate-ccw', label: 'git restore changes the working file' },
              { icon: 'undo-2', label: 'git restore --staged changes the staging selection' },
              { icon: 'scan-search', label: 'Inspect first when an undo may destroy work' }
            ],
            next: 'Next: what changes when the mistake has already been committed?',
            confirm: 'Start Chapter 11'
          }
        ]
      }
    ]
  };
})();

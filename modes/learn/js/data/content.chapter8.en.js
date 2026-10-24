/* Chapter 8: Merge Conflicts — detailed guided interaction. */
(function () {
  'use strict';

  var sharedUI = window.CHAPTER_CONTENT.ui;

  window.CHAPTER_CONTENT = {
    meta: { number: 8, title: 'Merge conflicts', minutes: 18, nextUrl: '?ch=9' },
    ui: sharedUI,
    conflict: {
      task: 'Your task',
      simulation: 'Guided simulation · your real files are untouched',
      command: 'Git command',
      terminal: 'Terminal',
      history: 'Commit graph',
      working: 'Working directory',
      staging: 'Staging area',
      file: 'index.html',
      explorer: 'Explorer',
      headNote: 'main (HEAD)',
      sharedVersion: 'Shared version at B',
      noFile: 'No file waiting here',
      main: 'main',
      feature: 'feature/tutorial',
      run: 'Run',
      prompt: 'Type a Git command',
      pressEnter: 'Press Enter to run',
      mergeCommand: 'git merge feature/tutorial',
      addCommand: 'git add index.html',
      commitCommand: 'git commit',
      mergeOutput: [
        'Auto-merging index.html',
        'CONFLICT (content): Merge conflict in index.html',
        'Automatic merge failed; fix conflicts and then commit the result.'
      ],
      markerHelp: {
        head: {
          title: '<<<<<<< HEAD',
          text: 'The conflict starts here. HEAD means “the branch I am on now”. In this example, HEAD points to main.'
        },
        current: {
          title: 'Current branch content',
          text: 'This block belongs to main, the current branch. It contains Alice’s version: <h1>Git Course</h1>.'
        },
        split: {
          title: '=======',
          text: 'This line separates the current-branch version above from the incoming-branch version below. Delete it when you resolve the conflict.'
        },
        incoming: {
          title: 'Incoming branch content',
          text: 'This block belongs to feature/tutorial, the branch being merged in. It contains Bob’s version: <h1>Git Tutorial</h1>.'
        },
        end: {
          title: '>>>>>>> feature/tutorial',
          text: 'The conflict ends here. feature/tutorial is the incoming branch, so the code just above this marker came from Bob’s branch.'
        }
      }
    },
    pages: [
      {
        id: 'collision', nav: { label: 'When edits collide', icon: 'git-merge' },
        beats: [
          {
            kind: 'conflictIntro', icon: 'users',
            text: 'Alice and Bob started from the same page. They worked on separate branches, and both changed the same heading in different ways.',
            confirm: 'See how the conflict is created'
          },
          {
            kind: 'conflictLab', mode: 'collision',
            title: 'Two branches changed the same heading.',
            text: 'Alice and Bob started from the same version. Alice changed the heading on main. Bob changed that same heading on feature/tutorial. You will reveal both changes and then try to merge them.',
            task: 'Step 1: show Alice’s edit. Step 2: show Bob’s edit. Step 3: type git merge feature/tutorial and run it. After each step, look at the commit graph.',
            command: 'git merge feature/tutorial',
            waitHint: 'Follow the three steps in order.'
          }
        ]
      },
      {
        id: 'markers', nav: { label: 'Read the markers', icon: 'file-text' },
        beats: [
          {
            kind: 'conflictLab', mode: 'markers',
            title: 'Git shows both versions in the file.',
            text: 'Git keeps both versions in index.html. The special marker lines tell you where your current branch ends and the incoming branch begins.',
            task: 'Open index.html. Click the marker lines to see what each one means. Then use HEAD and the branch name to work out which code came from which branch.',
            command: '<<<<<<< HEAD\n<h1>Git Course</h1>\n=======\n<h1>Git Tutorial</h1>\n>>>>>>> feature/tutorial',
            waitHint: 'Read the conflict from top to bottom.'
          }
        ]
      },
      {
        id: 'resolve', nav: { label: 'Resolve and finish', icon: 'check' },
        beats: [
          {
            kind: 'conflictLab', mode: 'resolve',
            title: 'Choose the final version, then finish the merge.',
            text: 'The team wants the final heading to be “Git Tutorial”. First choose how index.html should look. Then tell Git the file is resolved, and finally record the completed merge.',
            task: 'Step 1: choose Bob’s “Git Tutorial” version. Step 2: type git add index.html. Step 3: type git commit. The page explains what each command changes before you run it.',
            command: 'git add index.html\ngit commit',
            waitHint: 'Edit → stage → commit. Each action changes a different Git state.'
          }
        ]
      },
      {
        id: 'meaning', nav: { label: 'Why Git stops', icon: 'circle-help' },
        beats: [
          {
            kind: 'conflictLab', mode: 'meaning',
            title: 'Why does Git stop?',
            text: 'Compare two simple examples. If Alice and Bob change different places, Git can usually combine the changes. If they change the same place differently, Git stops and asks you to decide.',
            task: 'Run the left example first, then the right example. Compare the results and answer the question below.',
            waitHint: 'Try the automatic merge and the conflicting merge.'
          },
          {
            kind: 'quizRun', nextLabel: 'Next question', waitHint: 'Answer the statement', confirm: 'See the result',
            statements: [
              {
                id: 'c8q1', icon: 'git-merge',
                text: 'A merge conflict means Git has lost or damaged your branch history.', answer: false,
                why: 'Both histories are still there. Git pauses because it cannot safely infer the final content you intend.'
              },
              {
                id: 'c8q2', icon: 'target',
                text: '<<<<<<< HEAD starts the version from the branch you currently have checked out.', answer: true,
                why: 'Here HEAD points to main, so the first block is Alice’s version from main.'
              },
              {
                id: 'c8q3', icon: 'file-plus',
                text: 'After resolving the file, git add index.html tells Git that this file is resolved and ready for the merge commit.', answer: true,
                why: 'During conflict resolution, staging the cleaned file marks that path as resolved.'
              },
              {
                id: 'c8q4', icon: 'git-compare',
                text: 'Two people editing different lines of the same file must always cause a conflict.', answer: false,
                why: 'Git can usually combine non-overlapping edits automatically. The problem is competing edits to the same area.'
              }
            ],
            verdict: {
              icon: 'badge-check',
              headline: 'Git stops instead of guessing.',
              text: 'Read both versions, choose the intended result, stage the resolved file, then finish the merge.'
            }
          },
          {
            kind: 'finishPanel', icon: 'trophy', title: 'Chapter 8 complete',
            recap: 'You watched a conflict form, read its markers, resolved the file, staged the resolution and completed the merge.',
            model: [
              { icon: 'git-compare', label: 'Spot overlapping edits' },
              { icon: 'file-text', label: 'Read both versions' },
              { icon: 'git-merge', label: 'Resolve, stage, commit' }
            ],
            next: 'Next: compare merge with rebase and see how the same work can produce a different commit history.',
            confirm: 'Continue to Chapter 9'
          }
        ]
      }
    ]
  };
})();

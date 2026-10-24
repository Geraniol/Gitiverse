/* Chapter 5: Branches - Working on Multiple Things at Once. */
(function () {
  'use strict';
  var sharedUI = window.CHAPTER_CONTENT.ui;
  window.CHAPTER_CONTENT = {
    meta: { number: 5, title: 'Branches', minutes: 14, nextUrl: '?ch=6' },
    ui: sharedUI,
    branch: {
      task: 'Your task',
      /* Dead key: branch-lab.js never renders `simulation`, so this chapter has
         no "Guided simulation" banner. */
      command: 'Git command',
      current: 'Current branch',
      graph: 'Branch view',
      workspace: 'Workspace',
      terminal: 'Terminal',
      run: 'Run command',
      main: 'main',
      feature: 'feature/login',
      hotfix: 'hotfix',
      branchMeaning: 'A branch is a movable name for a line of commits. Creating feature/login gives new work a separate path while main stays stable.',
      currentBranch: 'current branch',
      visibleBranches: 'Visible branches',
      filesOnBranch: 'Files on this branch',
      branchViewHint: 'Hover or focus a branch to inspect the files that branch currently contains.',
      branchFilesSummary: 'Branch file summary',
      compareViewHint: 'Compare the repository before and after the command. New feature files appear only after switching onto the feature branch.',
      beforeCommand: 'Before command',
      afterCommandWaiting: 'After command',
      afterBranchCreated: 'After git branch',
      afterSwitch: 'After git switch',
      notCreatedYet: 'feature/login is not created yet',
      branchCreatedSameFiles: 'branch exists, files still match main',
      branchStable: 'stable files',
      branchCreated: 'created from main',
      branchFeature: 'login work',
      branchHotfix: 'urgent fix',
      branchMerged: 'combined result',
      prompt: 'Type a Git command',
      pressEnter: 'Press Enter to run',
      workspaceShowing: 'Showing files from current branch: {branch}',
      branchCreatedLine: 'Created branch feature/login',
      hotfixCreatedLine: 'Created branch hotfix',
      mergeCreatedLine: 'Merge made by the recursive strategy.',
      branchAlreadyExists: 'fatal: a branch named feature/login already exists',
      hotfixAlreadyExists: 'fatal: a branch named hotfix already exists',
      switchBlocked: 'error: pathspec feature/login did not match any branch known to Git',
      hotfixSwitchBlocked: 'error: pathspec hotfix did not match any branch known to Git',
      branchFromMainFirst: 'Create the hotfix from main. Switch to main first.',
      mergeFromMainFirst: 'Merge into main. Switch to main first.',
      unknownCommand: 'Command not available in this step. Try the command shown in Git command.',
      switchedFeatureLine: 'Switched to branch feature/login',
      switchedMainLine: 'Switched to branch main',
      switchedHotfixLine: 'Switched to branch hotfix',
      noCopies: 'No extra project folders appear. A branch is a name pointing at a line of commits.',
      needFeature: 'Create the feature branch to continue.',
      needSwitch: 'Switch branches to continue.',
      needHotfix: 'Create the hotfix branch to continue.',
      needMerge: 'Merge the feature branch to continue.',
      parallelDone: 'You moved between two lines of work. The files shown come from the branch you are on.',
      featureDone: 'feature/login now has its own next commit. main still points at B.',
      branchDone: 'Git created the branch name, then moved you onto it.',
      hotfixDone: 'The urgent repair happens on its own branch from main, separate from unfinished feature work.',
      mergeDone: 'The merge commit joins both histories. No conflict appears in this example.'
    },
    pages: [
      {
        id: 'need-branches', nav: { label: 'Why branches', icon: 'git-branch' },
        beats: [
          { kind: 'scene', icon: 'message-square-warning',
            text: 'You are building a new login feature. Then the product manager interrupts: there is an urgent production bug, and it needs a fix now.',
            confirm: 'See the problem' },
          { kind: 'branchLab', mode: 'need', title: 'Keep unfinished work away from production.',
            text: 'A branch is a movable name that points to a line of commits. Your project history is at A -> B; create a feature/login branch so login work can split away from the stable main line.',
            task: 'Create the feature/login branch.',
            command: 'git branch feature/login',
            waitHint: 'Create the feature branch.' }
        ]
      },
      {
        id: 'branch-command', nav: { label: 'Create and switch', icon: 'terminal' },
        beats: [
          { kind: 'branchLab', mode: 'command', title: 'A branch name is not enough. Move onto it.',
            text: 'First create feature/login, then switch to it. The view compares what exists before and after each command so you can see when the login files become the active work.',
            task: 'Run both branch commands.',
            command: 'git branch feature/login\ngit switch feature/login',
            waitHint: 'Run both commands.' }
        ]
      },
      {
        id: 'parallel-streams', nav: { label: 'Parallel streams', icon: 'split' },
        beats: [
          { kind: 'branchLab', mode: 'parallel', title: 'Two branches can move independently.',
            text: 'main continues from B to C. feature/login continues from B to D and E. Switch between them and watch the workspace change.',
            task: 'Visit main and feature/login.',
            command: 'git switch main\ngit switch feature/login',
            waitHint: 'Switch between both branches.' }
        ]
      },
      {
        id: 'hotfix', nav: { label: 'Urgent hotfix', icon: 'siren' },
        beats: [
          { kind: 'branchLab', mode: 'hotfix', title: 'Fix production without dragging in unfinished work.',
            text: 'The login feature is still unfinished. Create a hotfix branch from main so the repair can happen on the stable line.',
            task: 'Create the hotfix branch from main.',
            command: 'git switch main\ngit branch hotfix\ngit switch hotfix',
            waitHint: 'Create the hotfix branch.' }
        ]
      },
      {
        id: 'merge', nav: { label: 'Merge work back', icon: 'git-merge' },
        beats: [
          { kind: 'branchLab', mode: 'merge', title: 'Bring the finished feature back together.',
            text: 'When the feature is ready, switch back to main and merge it. Git creates one history that includes both lines of work.',
            task: 'Merge feature/login into main.',
            command: 'git switch main\ngit merge feature/login',
            waitHint: 'Merge the feature branch.' },
          { kind: 'quizRun', nextLabel: 'Next question', waitHint: 'Answer the statement', confirm: 'See the result',
            statements: [
              { id: 'c5q1', icon: 'copy', text: 'A Git branch makes a full copy of your whole project folder.', answer: false,
                why: 'A branch is a movable name in commit history, not a copied folder.' },
              { id: 'c5q2', icon: 'map-pin', text: 'The current branch decides where your next commit will be added.', answer: true,
                why: 'That is why the current branch banner matters before you commit.' },
              { id: 'c5q3', icon: 'git-merge', text: 'A merge can join separate lines of history.', answer: true,
                why: 'In this conflict-free example, Git joins the histories with a merge commit.' }
            ],
            verdict: { icon: 'badge-check', headline: 'Branches are parallel history.', text: 'Create a line, switch to it, work there, and merge when the line is ready.' }
          },
          { kind: 'finishPanel', icon: 'trophy', title: 'Chapter 5 complete',
            recap: 'You created branches, switched between them, isolated a hotfix and merged work back together.',
            model: [
              { icon: 'git-branch', label: 'Create a branch' },
              { icon: 'map-pin', label: 'Switch current work' },
              { icon: 'git-merge', label: 'Merge histories' }
            ],
            next: 'Next: decide what belongs in Git history.', confirm: 'Go to Chapter 6' }
        ]
      }
    ]
  };
})();

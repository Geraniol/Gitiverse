/* Chapter 2 reuses the course chrome, quiz and completion vocabulary.
   content.en.js supplies that shared UI before this chapter configuration. */
(function () {
  'use strict';
  var sharedUI = window.CHAPTER_CONTENT.ui;
  window.CHAPTER_CONTENT = {
    meta: { number: 2, title: 'What does Git manage?', minutes: 12, nextUrl: '?ch=3' },
    ui: sharedUI,
    lab: {
      task: 'Your task', simulation: 'Guided simulation · your real files are untouched',
      hint: 'Why does this work?', commandHint: 'Curious? See the Git command',
      save: 'Save this edit', before: 'Earlier snapshot', after: 'Your working copy',
      initialize: 'Initialize Repository', initializeDone: 'Repository ready',
      /* The IDE shell is gone, so the wording avoids VS Code terms. `explorer` is
         a dead key (nothing renders it) and was removed; workspaceTitle and
         sourceControl stay but use plain language instead of IDE jargon. */
      workspaceTitle: 'Your website project', sourceControl: 'What Git adds to this folder',
      initPrompt: 'Want to keep a history of this project? Start here.',
      initCommandLabel: 'Git command',
      initCommandNote: 'git init turns this folder into a repository. Type it in the terminal.',
      initEditorNote: 'Your website starts with this heading.',
      initFileNote: 'Your files stay exactly where they are.',
      initGitLabel: 'New', initGitNote: 'Git’s history folder. Shown here to help you learn; usually hidden in VS Code.',
      /* Titles for the before/after panels: each must say which moment it shows. */
      initBefore: 'Before git init', initAfter: 'After git init', initPending: 'Not yet',
      initStatusBefore: 'Git is not set up', initStatusAfter: 'Git is ready · 0 snapshots',
      initTakeaway: 'One folder, now with Git.',
      initTakeawayText: 'Initialize means “set up”. Git adds a .git folder to hold this project’s history. Your files stay the same.',
      changeTitle: 'Change title to Hello Git', titleSelected: 'New title selected',
      draft: 'Preview · not saved yet', saved: 'Saved in your working directory',
      chooseTitle: 'Try a new heading for your website.',
      stageAction: 'Stage selected change', stageActionDone: 'Change staged',
      selectChange: 'Select the changed file', selectedChange: 'Change selected',
      stageSelectHint: 'Click index.html to choose its change.',
      commitAction: 'Save a snapshot', commitActionDone: 'Snapshot saved',
      commitLabel: 'A short note for this snapshot', commitMessage: 'Update title',
      savedCopy: 'Selected copy', keptFile: 'Your file stays here',
      newSnapshot: 'New snapshot', snapshotSaved: 'Recorded locally',
      preview: 'Website preview', source: 'See the file contents',
      fileDescriptions: ['The words on your page', 'The look of your page', 'The behavior of your page'],
      stylePreview: 'This file makes the heading coral.', scriptPreview: 'This file gives the browser a small instruction.',
      flowActions: ['Edit your files', 'Choose the next change', 'Save a snapshot'],
      flipHint: 'Click to flip', flipBack: 'Click to flip back',
      folder: 'website/',
      working: 'Working directory', staging: 'Staging area', repository: 'Repository',
      workingNote: 'The files you can open and edit.', stagingNote: 'The version selected for the next commit.',
      repositoryNote: 'Snapshots already recorded by Git.',
      noStage: 'No changes selected.',
      projectFile: 'Project file', untracked: 'Untracked', modified: 'Modified', unchanged: 'Unchanged', staged: 'Staged',
      initDone: 'Done! This folder is now a Git repository. No snapshot has been saved or uploaded yet.',
      editDone: 'The file changed in your working directory. The saved snapshot still says Hello.',
      filesDone: 'All three files live in the working directory. Opening a file does not stage it or commit it.',
      stageDone: 'The current version of index.html is selected for the next commit. The file still exists in your working directory.',
      commitDone: 'Your selected version is now recorded in a new snapshot. There are no remaining changes to commit.',
      commandError: 'That action could not be completed. Return to this step and try again.',
      selectFile: 'Open each of the three files to see where your everyday work happens.',
      unchangedFiles: 'The other two files are unchanged and stay in the snapshot.',
      prepared: 'An earlier snapshot is provided for this example.',
      commitSetup: 'For this example, the new heading is already selected for the snapshot.',
      flowDone: 'Edit → select → record. You just learned the core Git workflow, without typing a command.',
      flowDescriptions: [
        'Your working directory holds the files you edit. Saving here does not create a Git commit.',
        'The staging area holds your selection for the next snapshot. Your original files stay in the working directory.',
        'A commit records that selection as a snapshot in your local repository. Nothing is uploaded.'
      ]
    },
    pages: [
      {
        id: 'init', nav: { label: 'Create a repository', icon: 'folder' },
        beats: [{ kind: 'lessonLab', mode: 'init', title: 'Your project, now with Git.',
          text: 'Imagine opening your website folder in VS Code. Your files are already here. Let’s set up Git for this project.',
          task: 'Type git init in the terminal.',
          command: 'git init', hint: 'A repository is a project folder with Git set up. You can do this on your computer without an account or an internet connection.',
          waitHint: 'Initialize your project to continue.' }]
      },
      {
        id: 'changes', nav: { label: 'Notice a change', icon: 'file-text' },
        beats: [{ kind: 'lessonLab', mode: 'edit', title: 'A small edit. A visible difference.',
          text: 'Your page currently says Hello. Change its heading to Hello Git and compare it with the starter snapshot.',
          task: 'Choose the new heading, then save your edit.',
          hint: 'The preview shows your website. Saving the edit changes the file, but your earlier Git snapshot stays the same.',
          waitHint: 'Save the updated heading to continue.' }]
      },
      {
        id: 'working-directory', nav: { label: 'Your working directory', icon: 'files' },
        beats: [{ kind: 'lessonLab', mode: 'files', title: 'This is where you work.',
          text: 'The working directory is your ordinary project folder. These are the files you open, edit and save.',
          task: 'Open index.html, style.css and script.js.',
          hint: 'Every file in this folder can be opened. Reading a file does not change its Git state.',
          waitHint: 'Explore all three project files.' }]
      },
      {
        id: 'staging', nav: { label: 'Choose what to save', icon: 'boxes' },
        beats: [{ kind: 'lessonLab', mode: 'stage', title: 'Choose the change for your next snapshot.',
          text: 'Your heading has changed, but Git has not selected it for a commit. The staging area lets you make that choice.',
          task: 'Select index.html, then add its change to the staging area.', command: 'git add index.html',
          hint: 'Staging selects the file’s content at this moment. It does not move the file out of your folder or create a commit.',
          waitHint: 'Select index.html for the next commit.' }]
      },
      {
        id: 'commit', nav: { label: 'Record a snapshot', icon: 'git-commit-horizontal' },
        beats: [{ kind: 'lessonLab', mode: 'commit', title: 'Turn your selection into a record.',
          text: 'Your selection is ready. Save it as a snapshot you can recognize later. Git calls this a commit.',
          task: 'The note is ready. Type git commit -m "Update title" to save a snapshot.',
          command: 'git commit -m "Update title"',
          hint: 'A snapshot keeps the selected content, the unchanged tracked files and a note explaining the change.',
          waitHint: 'Create the Update title commit.' }]
      },
      {
        id: 'core-model', nav: { label: 'Put it together', icon: 'badge-check' },
        beats: [
          { kind: 'lessonLab', mode: 'flow', title: 'Three places. One simple journey.',
            text: 'Git helps you choose when your everyday edits become recorded history.',
            task: 'Flip all three cards to discover what each place does.', hint: 'Editing, staging and committing are three separate actions.',
            waitHint: 'Flip all three cards to continue.', confirm: 'Check my understanding' },
          { kind: 'quizRun', nextLabel: 'Next question', waitHint: 'Answer the statement', confirm: 'See the result',
            statements: [
              { id: 'c2q1', icon: 'folder', text: 'Creating a repository immediately saves a snapshot of all your files.', answer: false,
                why: 'It creates a repository. You still need to select content and make a commit.' },
              { id: 'c2q2', icon: 'files', text: 'Your working directory contains the files you directly edit.', answer: true,
                why: 'It is your ordinary project folder, where you do your work.' },
              { id: 'c2q3', icon: 'boxes', text: 'If you edit a file after staging it, that new edit is automatically staged too.', answer: false,
                why: 'Staging captures the version you selected. Stage the file again to include a later edit.' },
              { id: 'c2q4', icon: 'git-commit-horizontal', text: 'A commit records the staged snapshot in your local repository.', answer: true,
                why: 'Committing creates a local record. Sharing it online is a separate step.' }
            ],
            verdict: { icon: 'badge-check', headline: 'The core model is yours.', text: 'Edit, select, record. Each action has a different job.' }
          },
          { kind: 'finishPanel', icon: 'trophy', title: 'Chapter 2 complete',
            recap: 'You created a repository, changed a file, staged its content and recorded a snapshot.',
            model: [ {icon:'files',label:'Edit your files'}, {icon:'boxes',label:'Choose your changes'},
              {icon:'git-commit-horizontal',label:'Save a snapshot'} ],
            next: 'Next: connect these simple actions to your first Git commands.', confirm: 'Continue to Chapter 3' }
        ]
      }
    ]
  };
})();

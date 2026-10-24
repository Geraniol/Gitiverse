(function () {
  'use strict';
  var sharedUI = window.CHAPTER_CONTENT.ui;
  window.CHAPTER_CONTENT = {
    meta: { number: 6, title: 'What should you commit?', minutes: 13, nextUrl: '?ch=7' },
    ui: sharedUI,
    topic: {
      task: 'Your task',
      terminal: 'Terminal',
      run: 'Run command',
      prompt: 'Type a Git command',
      pressEnter: 'Press Enter to run',
      command: 'Git command',
      simulation: 'Guided simulation · your real files are untouched',
      commit: 'Commit',
      ignore: 'Do not commit',
      tracked: 'Tracked by Git',
      ignored: 'Ignored',
      visible: 'Visible to Git',
      missing: 'Not shown in status',
      ignoreLabel: 'Choose what to ignore',
      /* Each card's one-line note = what the file is + the cost of ignoring it. The name is just a label. */
      ignoreNotes: {
        'node_modules/': 'Installed dependencies. Ignoring keeps generated copies out of history.',
        'dist/': 'Build output. Ignoring leaves only source in the repository.',
        '.env': 'Secrets and credentials. Ignoring keeps keys out of commit history.',
        '.DS_Store': 'OS-generated junk. Ignoring stops Finder noise from being committed.',
        '.vscode/': 'Editor settings. Ignoring keeps personal preferences out of shared history.'
      },
      keepNote: 'index.html and package.json stay visible: source and project metadata belong in history.',
      pitfallNote: 'Git already tracks this file, so adding it to .gitignore does not remove it from history.',
      pitfallTrackedNote: 'Tracked by Git already. It will keep appearing until you remove it from tracking history deliberately.',
      unknown: 'Command not available in this step. Try the command shown in Git command.',
      classifyDone: 'Good. Source and manifest files belong in history; dependencies, secrets and generated junk do not.',
      ignoreDone: '.gitignore now filters the noisy project files while source files stay visible to Git.',
      pitfallDone: '.env stays tracked because Git already started tracking it before .gitignore was updated.',
      emptyDone: 'Git status stays quiet because Git tracks files, not empty folders.',
      gitkeepDone: 'The placeholder file gives Git something to track, so the uploads folder can appear in history.'
    },
    pages: [
      { id: 'junk', nav: { label: 'Project junk', icon: 'files' },
        beats: [{ kind: 'topicLab', mode: 'junk', title: 'A real project can overwhelm Git status.',
          text: 'You run Git inside a web project and suddenly thousands of generated files appear. Before committing, decide what deserves history.',
          task: 'Run git status and inspect the avalanche.', command: 'git status', waitHint: 'Run git status.' }] },
      { id: 'belongs', nav: { label: 'What belongs', icon: 'list-checks' },
        beats: [{ kind: 'topicLab', mode: 'classify', title: 'Not every file belongs in version control.',
          text: 'Sort each item into the bucket you would commit or ignore. The goal is a clean history that another teammate can rebuild.',
          task: 'Classify every project item.', waitHint: 'Sort every item.' }] },
      { id: 'gitignore', nav: { label: '.gitignore', icon: 'file-minus' },
        beats: [{ kind: 'topicLab', mode: 'ignore', title: 'Teach Git which untracked files to ignore.',
          text: 'Add the noisy paths to .gitignore. The side panel updates as the rules match project files.',
          task: 'Add all five ignore rules.', waitHint: 'Complete the .gitignore file.' }] },
      { id: 'tracked-env', nav: { label: 'Tracked already', icon: 'triangle-alert' },
        beats: [{ kind: 'topicLab', mode: 'pitfall', title: '.gitignore is not an undo button.',
          text: 'A beginner accidentally commits .env, then adds .env to .gitignore afterward. Watch what Git still tracks.',
          task: 'Run the sequence and observe .env.', command: 'git add .env\ngit commit -m "Add env"\n# then add .env to .gitignore\ngit status',
          waitHint: 'Run the pitfall sequence.' }] },
      { id: 'empty-folders', nav: { label: 'Empty folders', icon: 'folder' },
        beats: [{ kind: 'topicLab', mode: 'empty', title: 'Empty folders disappear from Git status.',
          text: 'Create an uploads folder and ask Git what changed. The folder exists, but no file inside it exists for Git to track.',
          task: 'Create uploads/ and check status.', command: 'mkdir uploads\ngit status', waitHint: 'Create the empty folder and check status.' }] },
      { id: 'gitkeep', nav: { label: '.gitkeep', icon: 'file-plus' },
        beats: [
          { kind: 'topicLab', mode: 'gitkeep', title: 'Use a placeholder file when a folder must be preserved.',
            text: '.gitkeep is a convention, not a Git feature. It is just an empty file that lets Git store the directory path.',
            task: 'Create and stage uploads/.gitkeep.', command: 'touch uploads/.gitkeep\ngit add uploads/.gitkeep',
            waitHint: 'Create and stage the placeholder file.' },
          { kind: 'quizRun', nextLabel: 'Next question', waitHint: 'Answer the statement', confirm: 'See the result',
            statements: [
              { id: 'c6q1', icon: 'folder-input', text: 'node_modules/ should usually be committed to Git.', answer: false,
                why: 'Dependencies can be reinstalled from package metadata; committing them creates noisy history.' },
              { id: 'c6q2', icon: 'key-round', text: 'Secrets such as .env files should stay out of repository history.', answer: true,
                why: 'Secrets can leak through commits, remotes and forks.' },
              { id: 'c6q3', icon: 'file-plus', text: '.gitkeep is a community convention, not a Git built-in.', answer: true,
                why: 'Git sees a file. The name .gitkeep is just a shared habit.' }
            ],
            verdict: { icon: 'badge-check', headline: 'Clean history starts with clean inputs.', text: 'Commit source and project metadata; ignore generated files, local settings and secrets.' } },
          { kind: 'finishPanel', icon: 'trophy', title: 'Chapter 6 complete',
            recap: 'You filtered project junk, used .gitignore, learned the already-tracked pitfall and preserved an empty folder with .gitkeep.',
            model: [
              { icon: 'code-2', label: 'Commit source' },
              { icon: 'file-minus', label: 'Ignore junk' },
              { icon: 'file-plus', label: 'Track placeholders' }
            ],
            next: 'Next: share history with a remote repository.', confirm: 'Go to Chapter 7' }
        ] }
    ]
  };
})();

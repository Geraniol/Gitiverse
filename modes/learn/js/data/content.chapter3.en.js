(function () {
  'use strict';
  var ui = window.CHAPTER_CONTENT.ui;
  function page(id, label, title, text, task, setup, commands, takeaway) {
    return { id: id, nav: { label: label, icon: 'terminal' }, beats: [{ kind: 'commandLab', mode: id,
      title: title, text: text, task: task, setup: setup, commands: commands, takeaway: takeaway,
      waitHint: 'Complete the task above to continue.' }] };
  }
  window.CHAPTER_CONTENT = {
    meta: { number: 3, title: 'Your first Git commands', minutes: 15, nextUrl: '?ch=4' }, ui: ui,
    pages: [
      page('init', 'Start a project', 'This time, you drive.',
        'You already know edit, select, record. Now meet the commands behind those actions, one small step at a time.',
        'Create a folder, step inside it, then initialize Git. Type each command in the terminal.',
        'A new, empty exercise. Your Chapter 2 project is untouched.',
        ['mkdir my-project', 'cd my-project', 'git init'], 'Your project is now a repository: an ordinary folder plus .git. No files have been committed.'),
      page('status', 'Read git status', 'Ask Git what it sees.',
        'Two files have been prepared in your new project. Git can see them, but neither has been selected for a commit.',
        'Run git status and find the two untracked files.',
        'Fresh example: Git is initialized; index.html and README.md exist. There are no commits.',
        ['git status'], 'Untracked means Git has not added this file to its index. git status reports the state; it does not change your files.'),
      page('add', 'Choose with git add', 'One file. Your choice.',
        'README.md is ready. The webpage is not. Choose just the README for your first snapshot.',
        'Run git add README.md, then git status to check your selection.',
        'Fresh example: both files start untracked, with no commits.',
        ['git add README.md', 'git status'], 'README.md is staged; index.html is still untracked. Staging copies content into the selection and leaves your working files in place.'),
      page('diff', 'Inspect with git diff', 'Spot the edit after staging.',
        'You selected README.md, then added the word “commands” to the file. The staged copy still holds the earlier wording.',
        'Run git diff to compare your working file with the staged copy.',
        'Prepared example: README.md is staged, with one later edit. index.html remains untracked.',
        ['git diff', 'git diff --staged'], 'Plain git diff compares working content with staged content. Red − lines are removed; green + lines are added. Use --staged to compare the selection with the last commit.'),
      page('commit', 'Record with git commit', 'Make the first record.',
        'Your README is ready and selected. Give the snapshot a name so you can recognize it later.',
        'Commit the staged README, then check what is still uncommitted.',
        'Prepared example: the latest README edit has already been staged for you. No commits yet.',
        ['git commit -m "Initial commit"', 'git status'], 'Your first commit saved README.md. The webpage is still untracked because you did not select it. Only selected changes become part of this snapshot.'),
      { id: 'challenge', nav: { label: 'Your challenge', icon: 'trophy' }, beats: [
        { kind: 'commandLab', mode: 'challenge', title: 'One small change. Your turn.',
          text: 'Make the webpage heading say Git Playground. Save a clean snapshot with a short message that describes the change.',
          task: 'Change the heading, save your file, then choose the actions you need.',
          setup: 'Independent challenge: a starter commit already contains both files. Your earlier exercises are untouched.',
          commands: [], waitHint: 'Create and check your new snapshot.', confirm: 'Finish my challenge' },
        { kind: 'finishPanel', icon: 'trophy', title: 'Chapter 3 complete',
          recap: 'You initialized a repository, read its status, inspected a change, selected content and saved a commit.',
          model: [{ icon: 'file-text', label: 'Edit & inspect' }, { icon: 'boxes', label: 'Select content' }, { icon: 'git-commit-horizontal', label: 'Record it' }],
          next: 'Next: use the history you create. Explore a log, compare snapshots and find HEAD.', confirm: 'Continue to Chapter 4' }
      ] }
    ]
  };
})();

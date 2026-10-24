(function () {
  'use strict';
  var sharedUI = window.CHAPTER_CONTENT.ui;
  window.CHAPTER_CONTENT = {
    meta: { number: 7, title: 'Remotes and teams', minutes: 15, nextUrl: '?ch=8' },
    ui: sharedUI,
    topic: {
      task: 'Your task',
      terminal: 'Terminal',
      run: 'Run command',
      prompt: 'Type a Git command',
      pressEnter: 'Press Enter to run',
      command: 'Git command',
      simulation: 'Guided simulation · your real files are untouched',
      alice: 'Alice local',
      bob: 'Bob local',
      remote: 'Remote repository',
      remoteMapHint: 'Three repositories can have different histories. Commands move commits between them.',
      cloneBefore: 'Before clone, Bob has no local copy. The remote already has the project history.',
      cloneAfter: 'After clone, Bob local has the same commits as the remote.',
      pushBefore: 'Before push, Alice has commit C locally but the remote does not.',
      pushAfter: 'After push, commit C is on the remote for teammates to receive.',
      fetchBefore: 'Before fetch, Bob has local work and the remote has a newer commit.',
      fetchAfter: 'After fetch, Bob knows origin/main moved to C, but his working files stay unchanged.',
      pullBefore: 'Before pull, Bob has downloaded remote history but main has not integrated it.',
      pullAfter: 'After pull, Bob local main catches up to the remote commit.',
      rejectedBefore: 'Before push, Alice is missing commit C that already exists on the remote.',
      rejectedAfter: 'After rejection, nothing is overwritten. Alice must fetch first.',
      unknown: 'Command not available in this step. Try the command shown in Git command.',
      cloneDone: 'Bob now has the same commit history as the remote repository.',
      remoteDone: 'origin is the default remote name. It is conventional, not magic.',
      pushDone: 'Alice pushed her local commit to the shared remote.',
      fetchDone: 'Bob downloaded the new remote history without changing his working files.',
      pullDone: 'Pull fetched remote history and integrated it into Bob local.',
      rejectedDone: 'The push is rejected because the remote has a commit Alice does not have yet.'
    },
    pages: [
      { id: 'two-computers', nav: { label: 'Two computers', icon: 'monitor-smartphone' },
        beats: [
          { kind: 'scene', icon: 'users',
            text: 'You have worked alone successfully. Now Bob joins. Your local Git history is no longer the only copy that matters.',
            confirm: 'Show the team model' },
          { kind: 'topicLab', mode: 'remote-map', title: 'Local repositories sync through a remote.',
            text: 'Alice and Bob each have a local Git repository. The remote repository is the shared meeting point between them.',
            task: 'Inspect the team diagram.', waitHint: 'Continue when the relationship is clear.' }
        ] },
      { id: 'clone', nav: { label: 'Clone', icon: 'download-cloud' },
        beats: [{ kind: 'topicLab', mode: 'clone', title: 'Bob starts by copying the remote history.',
          text: 'git clone creates a local repository with the commits already stored on the remote.',
          task: 'Clone the remote repository.', command: 'git clone https://example.com/team/site.git',
          waitHint: 'Run git clone.' }] },
      { id: 'remote', nav: { label: 'Remote names', icon: 'cloud' },
        beats: [{ kind: 'topicLab', mode: 'remote', title: 'origin is a name, not a special server.',
          text: 'A remote has a local nickname. The default nickname created by clone is usually origin.',
          task: 'List configured remotes.', command: 'git remote -v', waitHint: 'Run git remote -v.' }] },
      { id: 'push', nav: { label: 'Push', icon: 'upload-cloud' },
        beats: [{ kind: 'topicLab', mode: 'push', title: 'Push sends local commits to the remote.',
          text: 'Alice has a new local commit. Push transfers that commit to the shared remote so Bob can receive it later.',
          task: 'Push Alice’s commit.', command: 'git push', waitHint: 'Run git push.' }] },
      { id: 'fetch', nav: { label: 'Fetch', icon: 'refresh-cw' },
        beats: [{ kind: 'topicLab', mode: 'fetch', title: 'Fetch downloads history without touching your files.',
          text: 'Bob can ask the remote what changed. His current working files stay exactly as they are.',
          task: 'Fetch remote updates.', command: 'git fetch', waitHint: 'Run git fetch.' }] },
      { id: 'pull', nav: { label: 'Pull', icon: 'git-pull-request' },
        beats: [{ kind: 'topicLab', mode: 'pull', title: 'Pull means fetch, then integrate.',
          text: 'For now, treat pull as a combined action: get remote updates, then bring them into the current branch.',
          task: 'Pull the remote update into Bob local.', command: 'git pull', waitHint: 'Run git pull.' }] },
      { id: 'rejected', nav: { label: 'Push rejected', icon: 'ban' },
        beats: [
          { kind: 'topicLab', mode: 'rejected', title: 'Push can fail when the remote is ahead.',
            text: 'Alice tries to push from A -> B, but the remote already has A -> B -> C. Git refuses to overwrite shared history.',
            task: 'Try the push and read the rejection.', command: 'git push', waitHint: 'Run git push.' },
          { kind: 'quizRun', nextLabel: 'Next question', waitHint: 'Answer the statement', confirm: 'See the result',
            statements: [
              { id: 'c7q1', icon: 'cloud', text: 'origin is the conventional default name for a remote.', answer: true,
                why: 'It is a local nickname created by clone in most repositories.' },
              { id: 'c7q2', icon: 'refresh-cw', text: 'git fetch changes your current working files immediately.', answer: false,
                why: 'Fetch downloads remote history. Integrating it is a separate step.' },
              { id: 'c7q3', icon: 'upload-cloud', text: 'A push can be rejected if the remote has commits you do not have.', answer: true,
                why: 'Git avoids overwriting shared history that your local repository has not seen.' }
            ],
            verdict: { icon: 'badge-check', headline: 'Remote work is history synchronization.', text: 'Clone copies history, push shares yours, fetch receives theirs and pull combines fetch with integration.' } },
          { kind: 'finishPanel', icon: 'trophy', title: 'Chapter 7 complete',
            recap: 'You cloned a remote, inspected origin, pushed, fetched, pulled and saw why push can be rejected.',
            model: [
              { icon: 'download-cloud', label: 'Clone' },
              { icon: 'upload-cloud', label: 'Push' },
              { icon: 'refresh-cw', label: 'Fetch / pull' }
            ],
            next: 'Chapter 8 will use this setup to explain conflicts.', confirm: 'Start Chapter 8' }
        ] }
    ]
  };
})();

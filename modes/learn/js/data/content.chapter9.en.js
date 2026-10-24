/* Chapter 9: Merge vs Rebase — compare two ways of bringing histories together. */
(function () {
  'use strict';

  var sharedUI = window.CHAPTER_CONTENT.ui;

  window.CHAPTER_CONTENT = {
    meta: { number: 9, title: 'Merge vs rebase', minutes: 22, nextUrl: '?ch=10' },
    ui: sharedUI,
    rebase: {
      task: 'Your task',
      simulation: 'Guided simulation · your real repository is untouched',
      history: 'Commit graph',
      run: 'Run the comparison',
      reset: 'Reset history',
      merge: 'Merge',
      rebase: 'Rebase onto main',
      replay: 'Replay animation',
      continue: 'Continue',
      main: 'main',
      feature: 'feature/login',
      original: 'Original commit',
      rewritten: 'Rewritten commit',
      shared: 'Shared history',
      local: 'Local history'
    },
    pages: [
      {
        id: 'merge', nav: { label: 'Merge the histories', icon: 'git-merge' },
        beats: [
          {
            kind: 'rebaseIntro', icon: 'users',
            text: 'You started a login feature from commit B. While you worked on D and E, main moved forward with C and F. Your feature now needs the latest work from main.',
            confirm: 'Start with merge'
          },
          {
            kind: 'rebaseLab', mode: 'merge',
            title: 'First, bring main into your feature branch with merge.',
            text: 'You are working on feature/login. Your feature has commits D and E, while main has moved forward to C and F. Both lines of work are useful.',
            task: 'Type git merge main. Then look at the commit graph and see what Git adds without moving the commits that already exist.',
            waitHint: 'Run git merge main, inspect the result, then answer the short check.'
          }
        ]
      },
      {
        id: 'rebase', nav: { label: 'Rebase onto main', icon: 'refresh-cw' },
        beats: [
          {
            kind: 'rebaseLab', mode: 'rebase',
            title: 'Now start from the same history and try rebase.',
            text: 'You are still on feature/login. This time Git will take the changes from D and E and replay them after the latest main commit F.',
            task: 'Type git rebase main. Keep your eyes on the graph while D and E are replayed as D′ and E′.',
            waitHint: 'Watch the animation, compare before and after, then answer the short check.'
          }
        ]
      },
      {
        id: 'identity', nav: { label: 'Why commits change', icon: 'git-commit-horizontal' },
        beats: [
          {
            kind: 'rebaseLab', mode: 'identity',
            title: 'Why did D become D′?',
            text: 'A commit remembers both the change and where that change sits in history. Before rebase, D was built on B. After rebase, Git applies the same change again on top of F, creating D′.',
            task: 'Compare D and D′ step by step: same code change, different parent, therefore a different commit identity.',
            waitHint: 'Follow B → D and F → D′, then answer the short check.'
          }
        ]
      },
      {
        id: 'shared-risk', nav: { label: 'When rebase becomes risky', icon: 'users' },
        beats: [
          {
            kind: 'rebaseLab', mode: 'risk',
            title: 'Why can rebase be risky after teammates already use your commits?',
            text: 'Alice and Bob both have D and E. Bob has already built X on top of E. If Alice rebases now, she creates D′ and E′, while Bob still has the old D and E.',
            task: 'Type git rebase main for Alice, then compare Alice’s new history with Bob’s existing copy.',
            waitHint: 'Run the rebase, compare the two histories, then answer the short check.'
          }
        ]
      },
      {
        id: 'compare', nav: { label: 'Decision lab: merge or rebase?', icon: 'git-compare' },
        beats: [
          {
            kind: 'rebaseLab', mode: 'compare',
            title: 'Use the right method for the situation.',
            text: 'You already know what merge and rebase do. Now apply that knowledge in two realistic situations: one shared branch and one private branch.',
            task: 'Scenario A: protect shared history with merge. Scenario B: keep a private feature history simple with rebase. Choose first, then run the command.',
            waitHint: 'Complete both scenarios and compare why each choice fits.'
          },
          {
            kind: 'quizRun', nextLabel: 'Next question', waitHint: 'Answer the statement', confirm: 'See the result',
            statements: [
              {
                id: 'c9q1', icon: 'git-merge',
                text: 'If a teammate already built work on top of D and E, merge is usually the safer beginner choice because it keeps those commits.', answer: true,
                why: 'Merge adds a new meeting point instead of replacing the commits your teammate already depends on.'
              },
              {
                id: 'c9q2', icon: 'refresh-cw',
                text: 'If a feature branch is still private, rebase can be a reasonable way to replay the work on top of the latest main.', answer: true,
                why: 'No teammate depends on the old D and E, so replacing them with D′ and E′ does not invalidate someone else’s history.'
              },
              {
                id: 'c9q3', icon: 'users',
                text: 'Rebase is always wrong once Git history has diverged.', answer: false,
                why: 'Rebase is useful. The key question is whether other people already depend on the commits you are rewriting.'
              },
              {
                id: 'c9q4', icon: 'git-compare',
                text: 'Merge and rebase can integrate similar code while recording different commit histories.', answer: true,
                why: 'Merge keeps existing commits and adds a join; rebase creates replacement commits on a new base.'
              }
            ],
            verdict: {
              icon: 'badge-check',
              headline: 'Choose from the collaboration situation, not from a fixed rule.',
              text: 'Shared history usually favours preserving existing commits. Private history gives you more freedom to rewrite your own commits.'
            }
          },
          {
            kind: 'finishPanel', icon: 'trophy', title: 'Chapter 9 complete',
            recap: 'You learned how merge and rebase record history differently, why rebased commits become new identities, and how shared versus private history changes the safest choice.',
            model: [
              { icon: 'git-merge', label: 'Merge keeps existing commits and adds a join' },
              { icon: 'refresh-cw', label: 'Rebase creates replacement commits on a new base' },
              { icon: 'users', label: 'Choose based on whether the history is shared or still private' }
            ],
            next: 'Next: undo changes before committing without losing work you still want to keep.',
            confirm: 'Finish chapter & return home'
          }
        ]
      }
    ]
  };
})();

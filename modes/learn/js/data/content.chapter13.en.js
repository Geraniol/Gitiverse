(function () {
  'use strict';
  var ui = window.CHAPTER_CONTENT.ui;
  var chapter = {
  "meta": {
    "number": 13,
    "title": "Team workflow",
    "minutes": 20,
    "nextUrl": "?ch=14"
  },
  "pages": [
    {
      "id": "assign",
      "refreshOnVisit": true,
      "nav": {
        "label": "Plan the Team Workflow",
        "icon": "users"
      },
      "beats": [
        {
          "kind": "teamLab",
          "mode": "assign",
          "title": "Stage 1 — Plan the Team Workflow",
          "text": "A feature branch keeps unfinished work separate from main. Clear names describe the work: feature/ for a new capability, fix/ for a correction. Changes on one branch do not automatically update another branch.",
          "situation": "PixelWorks is updating its website. Alice builds login, Bob adds user profiles, and Carol fixes the website header. Plan a separate branch for each teammate.",
          "task": "Match each teammate to the branch that describes their responsibility, then confirm the plan.",
          "result": "Each teammate now has a named place to develop independently. This is a saved plan: matching did not create branches, change files, or make commits. Branch creation comes in the development exercise.",
          "waitHint": "Complete the exercise to continue."
        }
      ]
    },
    {
      "id": "develop",
      "refreshOnVisit": true,
      "restartInPlace": true,
      "nav": {
        "label": "Develop on Separate Branches",
        "icon": "git-branch"
      },
      "beats": [
        {
          "kind": "teamLab",
          "mode": "develop",
          "title": "Stage 2 — Develop on Separate Branches",
          "text": "Develop as Alice, Bob and Carol from the same main snapshot. Follow each change from Working Directory to Staging Area to Repository, and see how separate branches keep the team’s work independent.",
          "task": "Create and switch branches, inspect prepared files, then manually stage and commit each teammate’s work.",
          "waitHint": "Complete the exercise to continue."
        }
      ]
    },
    {
      "id": "conflict",
      "refreshOnVisit": true,
      "restartInPlace": true,
      "nav": {
        "label": "Get Team Updates and Resolve Conflicts",
        "icon": "git-merge"
      },
      "beats": [
        {
          "kind": "teamLab",
          "mode": "synchronize",
          "title": "Stage 3 — Get Team Updates and Resolve Conflicts",
          "text": "Work as Alice to retrieve remote team updates, resolve a heading conflict and publish your feature branch. Fetch, merge and push have different effects; observe each one.",
          "task": "Resolve the heading manually, save, stage, commit and push the feature branch.",
          "waitHint": "Complete the exercise to continue."
        }
      ]
    },
    {
      "id": "pr",
      "nav": {
        "label": "Review and Merge Changes",
        "icon": "git-pull-request"
      },
      "beats": [
        {
          "kind": "teamLab",
          "mode": "review-workflow",
          "title": "Stage 4 — Review and Merge Changes",
          "text": "Propose the published login feature, review the timeout, and publish a manual correction before approval and integration. Pull Requests are hosting-platform features, separate from Git commands.",
          "task": "Act as Alice to open, revise and merge; act as Bob to inspect, request changes and approve.",
          "waitHint": "Complete the exercise to continue."
        }
      ],
      "refreshOnVisit": true,
      "restartInPlace": true
    },
    {
      "id": "recap",
      "nav": {
        "label": "Chapter recap",
        "icon": "badge-check"
      },
      "beats": [
        {
          "kind": "teamRecap",
          "title": "Stage 5 — Chapter Recap",
          "text": "Recall how PixelWorks moved from branch planning to reviewed integration. You can read this recap at any time without starting a repository.",
          "task": "Review the concepts, then answer six short knowledge checks.",
          "concepts": [
            {
              "title": "Branch Planning",
              "text": "Name branches after their work: feature/login, feature/profile and fix/header."
            },
            {
              "title": "Independent Development",
              "text": "Create each team branch from the same main commit. A commit moves only the current branch."
            },
            {
              "title": "Working Directory",
              "text": "File edits start here. Saving a file does not stage or commit it."
            },
            {
              "title": "Staging Area",
              "text": "git add copies selected file versions into the index for the next commit."
            },
            {
              "title": "Git Commit",
              "text": "git commit records the staged snapshot locally, leaving unstaged changes outside that commit."
            },
            {
              "title": "Fetch and Merge",
              "text": "Fetch refreshes remote-tracking references. Merge integrates another history into the current branch."
            },
            {
              "title": "Merge Conflict Resolution",
              "text": "Compare both versions, edit the intended result, remove markers, then stage and commit the resolution."
            },
            {
              "title": "Push",
              "text": "Push publishes committed history to a remote branch. Publishing a feature does not merge it into main."
            },
            {
              "title": "Pull Request",
              "text": "A hosting-platform proposal to integrate a published source branch into a target branch; not a Git command."
            },
            {
              "title": "Code Review",
              "text": "Check the behavior against the requirement, request a specific correction, then re-review and approve the published revision."
            }
          ]
        },
        {
          "kind": "quizRun",
          "nextLabel": "Next question",
          "waitHint": "Answer the statement",
          "confirm": "See my recap",
          "statements": [
            {
              "id": "c13v3q0",
              "icon": "circle-help",
              "text": "Creating Bob's branch from Alice's latest feature commit keeps their initial development histories independent.",
              "answer": false,
              "why": "Bob should start feature/profile from the shared initial main commit. Starting from Alice's feature would include her work; a descriptive branch name alone does not isolate history."
            },
            {
              "id": "c13v3q1",
              "icon": "circle-help",
              "text": "Saving a working file and running git add creates a new commit.",
              "answer": false,
              "why": "Saving changes the Working Directory. git add copies that version into the Staging Area. Only git commit records the staged snapshot in repository history."
            },
            {
              "id": "c13v3q2",
              "icon": "circle-help",
              "text": "Fetching remote changes automatically merges them and rewrites the current working files.",
              "answer": false,
              "why": "Fetch updates remote-tracking information such as origin/main. Merge is a separate operation that integrates the fetched history into the current branch."
            },
            {
              "id": "c13v3q3",
              "icon": "circle-help",
              "text": "After editing away conflict markers, the resolved file still needs git add before the merge commit.",
              "answer": true,
              "why": "Editing supplies the intended file content. Staging records that resolved version, then the merge commit joins both parent histories."
            },
            {
              "id": "c13v3q4",
              "icon": "circle-help",
              "text": "Pushing Alice's corrected feature/login automatically merges the Pull Request into main.",
              "answer": false,
              "why": "Push publishes the source branch and updates the existing PR. Opening, reviewing, approving and merging a PR are separate hosting-platform actions, not built-in Git commands."
            },
            {
              "id": "c13v3q5",
              "icon": "circle-help",
              "text": "Bob should re-review the published 500 ms correction before approving that revision.",
              "answer": true,
              "why": "Useful code review checks the agreed behavior. Approval must refer to the latest published commit; a local edit or an earlier approval is not enough."
            }
          ],
          "verdict": {
            "icon": "shield-check",
            "headline": "Understand the state behind each action.",
            "text": "Plan separate branches, stage and commit deliberately, synchronize, then review a published revision before integration. Knowledge checks do not complete earlier exercises."
          }
        },
        {
          "kind": "finishPanel",
          "icon": "trophy",
          "title": "Chapter Recap Complete",
          "recap": "You have completed the recap. Earlier practice stages keep their own completion records; revisit any section to practise the full PixelWorks workflow.",
          "model": [
            {
              "icon": "git-branch",
              "label": "Plan and develop"
            },
            {
              "icon": "git-merge",
              "label": "Synchronize and publish"
            },
            {
              "icon": "shield-check",
              "label": "Review and integrate"
            }
          ],
          "next": "Next, explore six tools for the situations that do not happen every day.",
          "confirm": "Start Chapter 14"
        }
      ],
      "restartInPlace": true
    }
  ]
};
  chapter.ui = ui;
  /* Rebind on every chapter visit; shared lab scripts are loaded only once. */
  chapter.onRestart = function (pageId) {
    if (!window.Chapter13Sessions) return;
    if (pageId === 'assign') window.Chapter13Sessions.restartAssignment();
    else if (pageId === 'develop') window.Chapter13Sessions.restartDevelopment();
    else if (pageId === 'conflict') window.Chapter13Sessions.restartSynchronization();
    else if (pageId === 'pr') window.Chapter13Sessions.restartReview();
    // Restarting the recap only resets its UI; repositories and prior progress stay intact.
  };
  window.CHAPTER_CONTENT = chapter;
})();

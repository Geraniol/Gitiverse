(function () {
  'use strict';
  var ui = window.CHAPTER_CONTENT.ui;
  var chapter = {
  "meta": {
    "number": 15,
    "title": "Final challenge",
    "minutes": 25,
    "nextUrl": "index.html"
  },
  "pages": [
    {
      "id": "briefing",
      "nav": {
        "label": "Your PixelWorks handover",
        "icon": "book-open"
      },
      "beats": [
        {
          "kind": "scene",
          "icon": "users",
          "text": "Welcome to PixelWorks. You inherit a compact repository with work from five contributors, an unpublished search feature and a remote that has moved on. Seven connected challenges will take you from file hygiene to recovery. Your actions carry forward; each checkpoint can be retried.",
          "confirm": "Inspect the repository"
        }
      ]
    },
    {
      "id": "mission",
      "nav": {
        "label": "Repair the repository",
        "icon": "wrench"
      },
      "beats": [
        {
          "kind": "finalLab",
          "mode": "mission",
          "title": "Make this repository ready for the team.",
          "text": "Inspect first, choose an action, and check the resulting state. You can type commands or fill them from the command guide. This is one continuous repository, saved in your browser.",
          "task": "Complete all seven checkpoints. Use the graph and hints whenever you need them.",
          "waitHint": "Complete the exercise to continue."
        }
      ]
    },
    {
      "id": "recap",
      "nav": {
        "label": "Chapter recap",
        "icon": "badge-check"
      },
      "beats": [
        {
          "kind": "quizRun",
          "nextLabel": "Next question",
          "waitHint": "Answer the statement",
          "confirm": "See my recap",
          "statements": [
            {
              "id": "c15q0",
              "icon": "circle-help",
              "text": "Adding .env to .gitignore removes it from earlier commits.",
              "answer": false,
              "why": "Ignore rules do not rewrite history or untrack existing files. Real exposed credentials need rotation."
            },
            {
              "id": "c15q1",
              "icon": "circle-help",
              "text": "A new recovery branch can preserve a lost commit without moving main.",
              "answer": true,
              "why": "A branch gives the recovered commit a reachable name while leaving main untouched."
            },
            {
              "id": "c15q2",
              "icon": "circle-help",
              "text": "Merge and rebase always create the same parent relationships.",
              "answer": false,
              "why": "A true merge joins histories with two parents. Rebase recreates the feature change on a new parent."
            }
          ],
          "verdict": {
            "icon": "shield-check",
            "headline": "Explain the result, not just the command.",
            "text": "You prepared a safe commit, integrated remote work, resolved a conflict, preserved shared history and rescued a lost experiment."
          }
        },
        {
          "kind": "finishPanel",
          "icon": "trophy",
          "title": "Chapter 15 complete",
          "recap": "You prepared a safe commit, integrated remote work, resolved a conflict, preserved shared history and rescued a lost experiment.",
          "model": [
            {
              "icon": "git-branch",
              "label": "Read the history"
            },
            {
              "icon": "search",
              "label": "Inspect the evidence"
            },
            {
              "icon": "shield-check",
              "label": "Choose a safe next step"
            }
          ],
          "next": "Keep the habit: inspect the state, make one deliberate change, then inspect again.",
          "confirm": "Finish course & return home"
        }
      ]
    }
  ]
};
  chapter.ui = ui;
  window.CHAPTER_CONTENT = chapter;
})();

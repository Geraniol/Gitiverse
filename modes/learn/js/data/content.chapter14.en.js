(function () {
  'use strict';
  var ui = window.CHAPTER_CONTENT.ui;
  var chapter = {
  "meta": {
    "number": 14,
    "title": "Advanced toolkit",
    "minutes": 18,
    "nextUrl": "?ch=15"
  },
  "pages": [
    {
      "id": "stash",
      "nav": {
        "label": "Pause unfinished work",
        "icon": "boxes"
      },
      "beats": [
        {
          "kind": "toolkitLab",
          "mode": "stash",
          "title": "Pause Unfinished Work — git stash",
          "text": "An urgent task interrupts your edits to index.html. You also have an untracked notes.txt with a personal idea.",
          "task": "Save the tracked draft, observe the working files, then restore the draft without creating a commit.",
          "waitHint": "Finish this exercise, or choose any section from the navigation.",
          "concept": "Git stash temporarily saves uncommitted changes to tracked files. Plain git stash leaves untracked files in place.",
          "hints": [
            "Run git stash and compare index.html with notes.txt.",
            "Run git stash pop to restore the draft. A successful pop removes the stash entry."
          ],
          "result": "You restored the tracked draft and removed its stash entry. The untracked note stayed in place, and no commit was created.",
          "confirm": "Next"
        }
      ]
    },
    {
      "id": "cherry",
      "nav": {
        "label": "Copy one useful fix",
        "icon": "git-commit-horizontal"
      },
      "beats": [
        {
          "kind": "toolkitLab",
          "mode": "cherry",
          "title": "Copy One Useful Fix — git cherry-pick",
          "text": "The feature branch has C, an unrelated feature preview, followed by D, a timeout fix. Main needs only the fix.",
          "task": "Find D in Repository History and apply its fix to main. Check that feature.js stays absent.",
          "waitHint": "Finish this exercise, or choose any section from the navigation.",
          "concept": "Cherry-pick applies the changes from one selected commit to your current branch, creating a new commit.",
          "hints": [
            "Select D and inspect its message and changed files.",
            "Use its commit ID with git cherry-pick. Compare the new commit with D and their different parents."
          ],
          "result": "Main now has a new commit containing D's timeout fix. D remains on feature; C's preview was not copied because cherry-pick applies only the selected change.",
          "confirm": "Next"
        }
      ]
    },
    {
      "id": "tag",
      "nav": {
        "label": "Name a release",
        "icon": "badge-check"
      },
      "beats": [
        {
          "kind": "toolkitLab",
          "mode": "tag",
          "title": "Name a Release — git tag",
          "text": "Commit C is the tested stable release. Main has already advanced to Commit D.",
          "task": "Create v1.0 on C while keeping main at D and the commit count unchanged.",
          "waitHint": "Finish this exercise, or choose any section from the navigation.",
          "concept": "A lightweight tag names a particular commit. A branch usually moves with new commits; a normal tag stays at its chosen version.",
          "hints": [
            "Select the tested C commit in Repository History.",
            "Use git tag v1.0 followed by C's commit ID. Without the ID, Git would tag the current commit instead."
          ],
          "result": "The v1.0 tag marks C while main still points to D. Creating this tag added a reference, not a commit; the tag will not automatically follow main.",
          "confirm": "Next"
        }
      ]
    },
    {
      "id": "blame",
      "nav": {
        "label": "Find a line’s context",
        "icon": "search"
      },
      "beats": [
        {
          "kind": "toolkitLab",
          "mode": "blame",
          "title": "Find a Line's Context — git blame",
          "text": "The timeout line in config.js has an unexpectedly large value. You need the context behind that change.",
          "task": "Run blame, select the timeout line's commit in Repository History, read its message, then confirm your finding.",
          "waitHint": "Finish this exercise, or choose any section from the navigation.",
          "concept": "Git blame identifies the commit that last changed each line. Use it to investigate code history, not to assign personal blame.",
          "hints": [
            "Run git blame config.js and read the commit ID beside the timeout line.",
            "Select that ID in Repository History. Read its message before confirming the investigation."
          ],
          "result": "You traced the timeout line to its last change and inspected the commit message. That message provides context, though it may not explain every reason. The repository is unchanged.",
          "confirm": "Next"
        }
      ]
    },
    {
      "id": "bisect",
      "nav": {
        "label": "Find the first bad commit",
        "icon": "search"
      },
      "beats": [
        {
          "kind": "toolkitLab",
          "mode": "bisect",
          "title": "Find the First Bad Commit — git bisect",
          "text": "Search worked in the earliest version but fails in the latest. Eight commits contain one regression.",
          "task": "Set both boundaries yourself, test and classify each candidate, identify the first bad commit, then return to main.",
          "waitHint": "Finish this exercise, or choose any section from the navigation.",
          "concept": "Git bisect narrows a bug search between a known-good version and a known-bad version. Git chooses a candidate; you test it and report good or bad.",
          "hints": [
            "Inspect the recorded working and failing versions, then run git bisect start. Starting alone sets no boundaries.",
            "Enter git bisect bad with the known-bad ID, then git bisect good with the known-good ID.",
            "Run Test for each candidate. PASS means git bisect good; FAIL means git bisect bad.",
            "After the first bad commit is identified, run git bisect reset to return to main."
          ],
          "result": "Each tested decision narrowed the range until only the first bad commit remained. Git chose the candidates; you supplied the results. Reset ended the session and returned HEAD to main.",
          "confirm": "Next"
        }
      ]
    },
    {
      "id": "clean",
      "nav": {
        "label": "Preview before deleting",
        "icon": "trash-2"
      },
      "beats": [
        {
          "kind": "toolkitLab",
          "mode": "clean",
          "title": "Preview Before Deleting — git clean",
          "text": "The working directory contains generated dist/bundle.js, an untracked scratch.txt, and ignored cache/local.dat.",
          "task": "Preview eligible deletions, acknowledge the warning, then remove only the previewed files.",
          "waitHint": "Finish this exercise, or choose any section from the navigation.",
          "concept": "Git clean removes eligible untracked files. Preview first: Git may not be able to recover a file it never committed.",
          "hints": [
            "Run git clean -nd: -n previews and -d includes untracked directories.",
            "Review the list and confirm the warning. The preview does not delete files.",
            "Run git clean -fd: -f forces removal. Tracked and ignored files stay under these options."
          ],
          "result": "The cleanup removed only the previewed untracked files. Tracked files and ignored cache remain. Here -n previews, -d includes untracked directories, and -f performs removal.",
          "confirm": "Next"
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
              "id": "c14q0",
              "icon": "circle-help",
              "text": "Plain git stash includes untracked files by default.",
              "answer": false,
              "why": "Plain stash saves tracked changes. Including untracked files requires an extra option such as -u."
            },
            {
              "id": "c14q1",
              "icon": "circle-help",
              "text": "Cherry-picking Commit D automatically copies every earlier commit from its feature branch.",
              "answer": false,
              "why": "Cherry-pick applies the change introduced by D, not the entire branch history."
            },
            {
              "id": "c14q2",
              "icon": "circle-help",
              "text": "A v1.0 tag automatically follows main when the branch advances.",
              "answer": false,
              "why": "The tag stays on its selected commit while the branch can move forward."
            },
            {
              "id": "c14q3",
              "icon": "circle-help",
              "text": "git blame can identify the commit that last changed a line.",
              "answer": true,
              "why": "Inspect the reported commit to find the message and context behind that line."
            },
            {
              "id": "c14q4",
              "icon": "circle-help",
              "text": "Running git bisect start automatically identifies the known-good and known-bad commits.",
              "answer": false,
              "why": "You must explicitly establish both boundaries before Git can narrow the search."
            },
            {
              "id": "c14q5",
              "icon": "circle-help",
              "text": "git clean -nd previews eligible deletions without removing files.",
              "answer": true,
              "why": "The -n option shows a dry run; -d includes eligible untracked directories."
            }
          ],
          "verdict": {
            "icon": "shield-check",
            "headline": "Choose a tool by the problem it solves.",
            "text": "Stash pauses unfinished work. Cherry-pick applies one fix. Tag marks a version. Blame traces a line. Bisect finds the first bad commit. Clean previews and removes untracked files."
          }
        },
        {
          "kind": "finishPanel",
          "icon": "trophy",
          "title": "Chapter 14 complete",
          "recap": "Stash pauses unfinished work. Cherry-pick applies one fix. Tag marks a version. Blame traces a line. Bisect finds the first bad commit. Clean previews and removes untracked files.",
          "model": [
            {
              "icon": "boxes",
              "label": "Stash — pause unfinished work"
            },
            {
              "icon": "git-commit-horizontal",
              "label": "Cherry-pick — apply a specific fix"
            },
            {
              "icon": "badge-check",
              "label": "Tag — mark a release"
            },
            {
              "icon": "search",
              "label": "Blame — investigate a line"
            },
            {
              "icon": "search",
              "label": "Bisect — find the first bad commit"
            },
            {
              "icon": "trash-2",
              "label": "Clean — preview, then remove"
            }
          ],
          "next": "Next, diagnose and repair a PixelWorks repository across seven connected challenges.",
          "confirm": "Start Chapter 15"
        }
      ]
    }
  ]
};
  chapter.ui = ui;
  window.CHAPTER_CONTENT = chapter;
})();

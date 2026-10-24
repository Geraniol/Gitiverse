
(function () {
  'use strict';
  var sharedUI = window.CHAPTER_CONTENT.ui;

  window.CHAPTER_CONTENT = {

  meta: {
    number: 1,
    /* Every other chapter carried a title; the rail and bottom bar have a slot
       that expects one. */
    title: 'Why do we need Git?',
    minutes: 8,
    nextUrl: '?ch=2'
  },

  /* Shared, not owned: the same object course.en.js published. */
  ui: sharedUI,

  pages: [

    {
      id: 'chaos',
      nav: { label: 'Version chaos', icon: 'files' },

      beats: [
        {
          kind: 'scene',
          icon: 'folder-clock',
          text: 'A colleague left the team. This is the project folder they handed over.',
          confirm: 'Open the folder'
        },

        {
          kind: 'fileGuess',
          question: {
            icon: 'circle-help',
            text: 'Which file holds the latest, correct version?'
          },
          hint: 'Pick the one you would trust',
          picked: 'Your pick: {name}',
          waitHint: 'Pick a file to continue',
          confirm: 'Check my answer',
          files: [
            { name: 'file.docx',             date: '2025-03-02', size: '18 KB', icon: 'file-text' },
            { name: 'file.v2.docx',          date: '2025-03-18', size: '42 KB', icon: 'file-text' },
            { name: 'file_new.docx',         date: '2025-04-05', size: '12 KB', icon: 'file-text' },
            { name: 'file_new.v2.docx',      date: '2025-05-22', size: '31 KB', icon: 'file-text' },
            { name: 'file_final.docx',       date: '2025-06-09', size: '24 KB', icon: 'file-text' },
            { name: 'file_final_real.docx',  date: '2025-07-14', size: '27 KB', icon: 'file-text' },
            { name: 'file_super_final.docx', date: '2025-08-01', size: '9 KB',  icon: 'file-text' },
            { name: 'file_modified.docx',    date: '2025-11-04', size: '15 KB', icon: 'file-text' }
          ]
        },

        {
          kind: 'answerReveal',
          icon: 'triangle-alert',
          headline: 'Nobody knows.',
          pickedEcho: 'You picked {name}. Nothing in this folder can confirm that choice.',
          pickedNone: 'And no choice here could be confirmed.',
          rules: [
            {
              icon: 'arrow-down', label: 'First A–Z', file: 'file.docx',
              short: 'the oldest file here'
            },
            {
              icon: 'clock', label: 'Newest', file: 'file_modified.docx',
              short: 'the name says “modified”'
            },
            {
              icon: 'database', label: 'Largest', file: 'file.v2.docx',
              short: 'a plain v2, beating every “final”'
            },
            {
              icon: 'sparkles', label: 'Sounds final', file: 'file_super_final.docx',
              short: 'and it is the smallest of all'
            }
          ],
          verdict: {
            icon: 'triangle-alert',
            headline: 'Four ways to guess. Four different files.',
            text: 'A file name, a timestamp and a file size are not a history. None of them can say what changed, or why.'
          }
        }
      ]
    },

    {
      id: 'naming',
      nav: { label: 'Your own rule', icon: 'calendar-days' },

      beats: [
        {
          kind: 'scene',
          icon: 'calendar-days',
          text: 'A date, a version number, and discipline. That should fix it.',
          parts: [
            { text: 'YYYY', tone: 'date' },
            { text: 'MM', tone: 'date' },
            { text: 'DD', tone: 'date' },
            { text: '_', tone: 'sep' },
            { text: 'Filename', tone: 'name' },
            { text: '_v', tone: 'ver' },
            { text: 'NN', tone: 'ver' },
            { text: '.ext', tone: 'ext' }
          ],
          confirm: 'Follow the rule'
        },

        {
          kind: 'filePile',
          waitHint: 'Let two weeks pass to see what the folder becomes.',
          machine: {
            stem: 'report',
            ext: 'docx',
            /* One entry per save, in order: the day, and which version of that
               day's file it became. Several days have more than one - the point
               of the `_vNN` slot above. */
            saves: [
              { date: '20260914', v: 1, detail: 'First save on 14 Sep.' },
              { date: '20260914', v: 2, detail: 'Saved again the same day.' },
              { date: '20260915', v: 1, detail: 'A new day; the count restarts.' },
              { date: '20260916', v: 1, detail: 'New day; back to v01.' },
              { date: '20260916', v: 2, detail: 'Second save on the 16th.' },
              { date: '20260916', v: 3, detail: 'Third save on the 16th.' },
              { date: '20260917', v: 1, detail: 'New day; back to v01.' },
              { date: '20260918', v: 1, detail: 'New day; back to v01.' },
              { date: '20260918', v: 2, detail: 'Second save on the 18th.' },
              { date: '20260921', v: 1, detail: 'New day; back to v01.' },
              { date: '20260922', v: 1, detail: 'New day; back to v01.' },
              { date: '20260922', v: 2, detail: 'Second save on the 22nd.' },
              { date: '20260922', v: 3, detail: 'Third save on the 22nd.' },
              { date: '20260923', v: 1, detail: 'New day; back to v01.' }
            ]
          },
          confirm: 'Continue'
        },

        {
          kind: 'painHunt',
          prompt: {
            icon: 'circle-help',
            text: 'Tap every problem this rule still has.'
          },
          foundLabel: 'problems found',
          waitHint: 'Find all five',
          pains: [
            {
              id: 'tedious', icon: 'refresh-cw',
              label: 'Renaming is manual work',
              note: 'Every save needs a new name, typed by hand.'
            },
            {
              id: 'growth', icon: 'layers',
              label: 'Folders keep growing',
              note: 'Versions pile up forever. Nobody deletes any.'
            },
            {
              id: 'why', icon: 'circle-help',
              label: 'The reason is lost',
              note: 'v07 says nothing about what changed or why.'
            },
            {
              id: 'overwrite', icon: 'users',
              label: 'Teammates collide',
              note: 'Two people, one file name, one overwritten afternoon.'
            },
            {
              id: 'rollback', icon: 'undo-2',
              label: 'Rolling back is guesswork',
              note: 'Which old copy is safe to return to? Unknown.'
            }
          ],
          verdict: {
            icon: 'triangle-alert',
            headline: 'A naming rule is not a history.',
            text: 'It renames the mess. It does not record what changed, who changed it, or why.'
          }
        }
      ]
    },

    {
      id: 'vcs',
      nav: { label: 'The idea', icon: 'database' },

      beats: [
        {
          kind: 'scene',
          icon: 'lightbulb',
          text: 'Stop naming copies. Let a system watch the changes instead.',
          confirm: 'Show me'
        },

        {
          kind: 'pipelineRun',
          flipHint: 'Tap a card',
          backHint: 'Tap to flip back',
          stages: [
            { icon: 'file-text',             label: 'Files',   note: 'You just edit your work',
              detail: 'You save the file. So far it is just a save.' },
            { icon: 'zap',                   label: 'Changes', note: 'Every edit is noticed',
              detail: 'Git notices which lines differ from the last version.' },
            { icon: 'git-commit-horizontal', label: 'Git',     note: 'It records each change',
              detail: 'It records the difference, plus who, when, and why.' },
            { icon: 'history',               label: 'History', note: 'A timeline you can revisit',
              detail: 'Now any recorded point can be reopened or restored.' }
          ],
          waitHint: 'Flip all four cards to continue',
          confirm: 'Continue'
        },

        {
          /* Three layers, each a step further in. One button narrows the long
             name to the one tool the course uses; each layer says what is LEFT
             there - the category, the acronym, the tool. */
          kind: 'funnelReveal',
          waitHint: 'Follow the name in to continue',
          steps: [
            { text: 'Version Control System', short: 'the category',
              detail: 'Every tool that watches your changes lives here.' },
            { text: 'VCS', short: 'the acronym',
              detail: 'The same idea, shortened — the long name is gone.' },
            { text: 'Git', short: 'the one you will use',
              detail: 'One tool from that family. This course uses this one.' }
          ],
          verdict: {
            icon: 'lightbulb',
            headline: 'Git is a Version Control System.',
            text: 'You edit files. It remembers the story — every change, in order, with a reason attached.'
          }
        }
      ]
    },

    {
      id: 'capabilities',
      nav: { label: 'What Git does', icon: 'sparkles' },

      beats: [
        {
          kind: 'scene',
          icon: 'sparkles',
          text: 'Once the project keeps its own history, six things become possible.',
          confirm: 'Show the six'
        },

        {
          kind: 'capabilityCards',
          flipHint: 'Tap a card',
          backHint: 'Tap to flip back',
          waitHint: 'Flip all six cards',
          /* WARNING: these six back captions were rewritten. The old wording
             ("Reopen any earlier state.") assumed the reader knew what a commit
             is. Each now names an action they have done and what it becomes. */
          cards: [
            {
              id: 'record', icon: 'git-commit-horizontal', label: 'Record history',
              caption: 'Git keeps every saved version for you, in order. No more v01, v02, v03.',
              demo: 'commits'
            },
            {
              id: 'travel', icon: 'history', label: 'Go back in time',
              caption: 'Open the file as it was last Tuesday. Nothing you did since is undone.',
              demo: 'timeline'
            },
            {
              id: 'branch', icon: 'git-branch', label: 'Branch out',
              caption: 'Try a risky change in a copy. If it goes wrong, your real files are untouched.',
              demo: 'branch'
            },
            {
              id: 'merge', icon: 'git-merge', label: 'Bring work together',
              caption: 'Two people change the same project at once. Git combines both sets of changes.',
              demo: 'merge'
            },
            {
              id: 'team', icon: 'users', label: 'Work as a team',
              caption: 'Everyone works on one project. No more emailing copies back and forth.',
              demo: 'team'
            },
            {
              id: 'automate', icon: 'bot', label: 'Automate the rest',
              caption: 'Git can run your tests every time you save, so a broken change is caught early.',
              demo: 'automate'
            }
          ]
        }
      ]
    },

    {
      id: 'git-vs-github',
      nav: { label: 'Git ≠ GitHub', icon: 'git-compare' },

      beats: [
        {
          kind: 'scene',
          icon: 'git-compare',
          text: 'Two names you will hear together constantly. They are not the same thing.',
          confirm: 'Sort them out'
        },

        {
          kind: 'bucketSort',
          prompt: {
            icon: 'mouse-pointer-click',
            text: 'Sort each card into the right column.'
          },
          waitHint: 'Place all eight cards',
          buckets: [
            { id: 'git',      title: 'Git',             subtitle: 'A tool on your computer',        icon: 'laptop' },
            { id: 'platform', title: 'GitHub / GitLab', subtitle: 'Websites that host repositories', icon: 'cloud' }
          ],
          chips: [
            { id: 'tool',    icon: 'git-branch',       label: 'Version control tool', bucket: 'git' },
            { id: 'local',   icon: 'laptop',           label: 'Runs on your machine', bucket: 'git' },
            { id: 'offline', icon: 'zap',              label: 'Works fully offline',  bucket: 'git' },
            { id: 'tracks',  icon: 'history',          label: 'Tracks file history',  bucket: 'git' },
            { id: 'hosting', icon: 'cloud',            label: 'Hosts repos online',   bucket: 'platform' },
            { id: 'pr',      icon: 'git-pull-request', label: 'Pull requests',        bucket: 'platform' },
            { id: 'issues',  icon: 'list-checks',      label: 'Issue tracking',       bucket: 'platform' },
            { id: 'perms',   icon: 'lock',             label: 'Team permissions',     bucket: 'platform' }
          ],
          verdict: {
            icon: 'lightbulb',
            headline: 'Git is the engine. GitHub is a garage.',
            text: 'Git works with no internet and no account. GitHub and GitLab are hosting platforms built around it.'
          }
        }
      ]
    },

    {
      id: 'quiz',
      nav: { label: 'Check yourself', icon: 'badge-check' },

      beats: [
        {
          kind: 'quizRun',
          nextLabel: 'Next question',
          waitHint: 'Answer the statement',
          confirm: 'See the result',
          statements: [
            {
              id: 'q1', icon: 'git-merge',
              text: 'Git can automatically resolve every merge conflict.',
              answer: false,
              why: 'When two people change the same line, only a human can decide the right result.'
            },
            {
              id: 'q2', icon: 'git-compare',
              text: 'Git and GitHub are the same thing.',
              answer: false,
              why: 'Git is a local tool. GitHub is one of several platforms that host Git repositories.'
            },
            {
              id: 'q3', icon: 'history',
              text: 'Git can record the change history of your project.',
              answer: true,
              why: 'That is its whole job: keep every change, in order, with a message.'
            },
            {
              id: 'q4', icon: 'shield-check',
              text: 'Git guarantees your code has zero bugs.',
              answer: false,
              why: 'Git stores what you wrote. It cannot tell whether what you wrote is correct.'
            }
          ],
          verdict: {
            icon: 'badge-check',
            headline: 'Four claims, checked.',
            text: 'Git records history and hands you the tools. It does not think for you.'
          }
        },

        {
          kind: 'finishPanel',
          icon: 'trophy',
          title: 'Chapter 1 complete',
          recap: 'You now know why Git exists — and what it is for.',
          model: [
            { icon: 'file-text',             label: 'You edit files' },
            { icon: 'git-commit-horizontal', label: 'Git records changes' },
            { icon: 'history',               label: 'History grows' }
          ],
          next: 'Next: what exactly does Git manage?',
          confirm: 'Next chapter'
        }
      ]
    }
  ]
  };
})();

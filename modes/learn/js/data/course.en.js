
window.CHAPTER_CONTENT = {

  ui: {
    /* The project name. It appears in the rail, in the document title and in
       the tutor's system prompt — all three read it from here, so a rename
       is a one-line edit. */
    brand: 'Git Adventure',
    theme: {
      toDark: 'Switch to night mode',
      toLight: 'Switch to daylight mode'
    },
    nav: {
      homeTitle: 'Back to home',
      chapters: 'Choose chapter',
      restart: 'Restart chapter',
      steps: 'Chapter steps'
    },
    minutes: 'min',

    rail: {
      progress: 'Study Progress',
      chapters: 'Chapters',
      section: 'Section',
      chapterShort: 'Ch.',
      chapterOf: 'Chapter {n} / {total}',
      /* A bare fraction, used by both of the strip's readouts and by the
         section count in the phone's bottom bar — they all say "n of m" and
         nothing else. `chapterOf` above is the one that spells the word. */
      count: '{n} / {total}',
      /* The strip is 96px wide: "Study Progress" does not fit, "Progress"
         does. The long form is what the wide column shows. */
      progressShort: 'Progress',
      pickTitle: 'Choose a chapter',
      pickClose: 'Close the chapter list'
    },

    chapters: [
      { number: 1,  title: 'Why do we need Git?',     sections: 6, minutes: 8,  href: '?ch=1' },
      { number: 2,  title: 'What does Git manage?',   sections: 6, minutes: 12, href: '?ch=2' },
      { number: 3,  title: 'Your first Git commands', sections: 6, minutes: 15, href: '?ch=3' },
      { number: 4,  title: 'Explore Git history',     sections: 5, minutes: 12, href: '?ch=4' },
      { number: 5,  title: 'Branches',                sections: 5, minutes: 14, href: '?ch=5' },
      { number: 6,  title: 'What should you commit?', sections: 6, minutes: 13, href: '?ch=6' },
      { number: 7,  title: 'Remotes and teams',       sections: 7, minutes: 15, href: '?ch=7' },
      { number: 8,  title: 'Merge conflicts',         sections: 4, minutes: 18, href: '?ch=8' },
      { number: 9,  title: 'Merge vs rebase',         sections: 5, minutes: 22, href: '?ch=9' },
      { number: 10, title: 'Undoing changes',         sections: 2, minutes: 18, href: '?ch=10' },
      { number: 11, title: 'Revert and reset',        sections: 5, minutes: 14, href: '?ch=11' },
      { number: 12, title: 'Git first aid',           sections: 4, minutes: 11, href: '?ch=12' },
      { number: 13, title: 'Team workflow',           sections: 5, minutes: 20, href: '?ch=13' },
      { number: 14, title: 'Advanced toolkit',        sections: 7, minutes: 18, href: '?ch=14' },
      { number: 15, title: 'Final challenge',         sections: 3, minutes: 25, href: '?ch=15' }
    ],
    confirm: 'Continue',
    nextChapter: 'More chapters are coming soon.',
    nextStep: 'Next: {name}',
    answer: {
      yes: 'True',
      no: 'False',
      correct: 'Correct',
      wrong: 'Not quite',
      score: 'Score'
    },

    /* The playground is one icon button in the app bar. It carries no label
       — the title says what it is, which is where an icon button keeps it. */
    practice: {
      title: 'Open Git Playground'
    },

    /* The tutor panel, opened from the button in the bottom-right corner. */
    chat: {
      open: 'Ask AI',
      title: 'Ask AI',
      close: 'Close Ask AI',
      reading: 'Reading',
      placeholder: 'Ask about what is on screen…',
      send: 'Send',
      thinking: 'Thinking…',
      empty: 'Stuck? Ask about the step you are on.',
      clear: 'Clear this conversation',
      cleared: 'Conversation cleared.',

      /* The transcript is kept in localStorage, so clearing it throws away
         saved material — worth a second look, like the settings clears. */
      clearTitle: 'Clear this conversation?',
      clearBody: 'The whole transcript goes, including the copy saved in this browser.',
      clearGo: 'Clear conversation',
      needSetup: 'Add an endpoint and a model in Settings first.',
      unreachable: 'Could not reach the model.',
      noAnswer: 'The model returned nothing.',

      /* Two canned questions, one tap away. `text` is both the chip and what
         gets sent, so the label can never drift from the question. */
      presetsLabel: 'Try asking',
      presets: [
        { icon: 'circle-help', text: 'What should I do now' },
        { icon: 'book-open', text: 'Explain this' }
      ],

      promptIntro: 'You are a patient tutor inside "{brand}", an interactive course. The learner is reading a lesson right now. Answer only about what they can see, in two or three short sentences or one small code block. If the material on screen does not contain the answer, say so plainly instead of inventing Git behaviour.',
      promptChapter: 'Chapter',
      promptStep: 'Current step',
      promptMoment: 'Moment within that step',
      promptFinished: 'Steps already finished',
      promptOnScreen: 'Exactly what is on the learner’s screen right now',
      promptAsk: 'Answer the question they ask about the above.'
    },

    settings: {
      open: 'Settings',
      title: 'Settings',
      close: 'Close settings',
      endpoint: 'Endpoint URL',
      endpointHint: 'Base URL of an OpenAI-compatible service',
      endpointPlaceholder: 'http://127.0.0.1:23333/v1/',
      key: 'API Key',
      keyShow: 'Show key',
      keyHide: 'Hide key',
      model: 'Model Name',
      test: 'Test',
      testing: 'Testing',
      ok: 'Connected',
      fail: 'Failed',
      needEndpoint: 'enter an endpoint URL first',
      latency: '{ms} ms',
      timedOut: 'no reply within {seconds}s',
      unreachable: 'could not reach the endpoint (offline, or blocked by CORS)',
      httpError: 'the endpoint replied {status}',
      record: 'Learning record',
      recordNote: 'Clears every chapter’s finished steps and page progress. Your AI conversations are kept.',
      clear: 'Clear learning record',
      cleared: 'Learning record cleared in every chapter.',
      clearAll: 'Clear all data',
      clearAllLabel: 'Everything',
      clearAllNote: 'Removes every chapter’s record and AI conversation, plus the shared theme and API settings.',
      clearAllDone: 'All chapter records, conversations and settings cleared.',

      confirm: {
        cancel: 'Cancel',
        recordTitle: 'Clear the learning record in every chapter?',
        recordBody: 'This removes {count} finished steps across the course. Your AI conversations and settings are kept.',
        recordBodyNone: 'No steps are finished in any chapter yet.',
        recordGo: 'Clear learning record',
        allTitle: 'Clear all data?',
        allBody: 'This removes every chapter’s learning record and AI conversation, and the shared theme, endpoint, key and model. There is no undo.',
        allGo: 'Clear all data'
      }
    }
  }
};

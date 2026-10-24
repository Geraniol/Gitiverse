# Gitiverse

Gitiverse is derived from **Visual Git Explorer**, the project completed by **Team 24 - Bugs Help Bugs** for **DECO7381 Design Computing Studio 3: Build** at the University of Queensland.

Original team repository (Private): <https://github.com/Studio3Build-2026s2/team-24-bugs-help-bugs>

Gitiverse is a browser-based learning environment for Git, aimed at people who are new to version control. It combines a guided course with an open practice sandbox, so a learner can read about a concept, run the matching command, and see the repository change immediately.

Both interfaces are driven by a simulated Git model written in JavaScript. No real repository is read or modified, and the application runs from static files with no server, no build step, and no dependency installation. The only optional network feature is the AI tutor, which stays disabled until the user configures an OpenAI-compatible endpoint.

## Background

The brief (project #6) asked for a visual Git explorer that makes version control understandable as a graph of commits and references. The team designed a browser-based tool for Git beginners, with safe experimentation, immediate visual feedback, and explanations of what each command changes. The final scope concentrated on the fifteen teaching chapters and the practice interface; broader features such as instructor authoring, persistent accounts, and real remote repositories were deferred.

## Acknowledgements

Third-party material:

- Lucide icon paths, inlined in `modes/shared/js/icons.js`. The set is ISC licensed, with MIT for the icons derived from Feather.
- vis-network 10.1.2, vendored for the practice commit graph and dual licensed under Apache 2.0 or MIT. The renderer falls back to a team-authored SVG implementation when the library is unavailable.

No project-wide licence is declared in this repository; the notices above apply to the bundled components.

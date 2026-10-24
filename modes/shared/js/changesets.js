'use strict';
window.VGE = window.VGE || {};

VGE.CHANGESETS = [
  { label:'项目脚手架', changes:[
    { p:'README.md', s:'A', content:'# visual-git\n\nAn interactive Git sandbox.\n' },
    { p:'.gitignore', s:'A', content:'node_modules/\n.env\n' },
    { p:'src/index.ts', s:'A', content:"export function main() {\n  greet('scaffold');\n}\n" },
    { p:'src/utils.ts', s:'A', content:"export function greet(n: string) {\n  console.log('hello ' + n);\n}\n" },
    { p:'src/graph/renderer.ts', s:'A', content:"export function render() {\n  // draw the commit graph\n}\n" },
    { p:'styles/main.css', s:'A', content:"body { margin: 0; font-family: sans-serif; }\n" } ],
    en:{ label:'Project scaffold' } },
  { label:'导航组件', changes:[
    { p:'src/components/NavBar.tsx', s:'A', content:"export const NavBar = () => <nav>Home</nav>;\n" },
    { p:'src/components/NavBar.test.ts', s:'A', content:"import { NavBar } from './NavBar'; // test stub\n" },
    { p:'src/index.ts', s:'M', content:"export function main() {\n  document.body.appendChild(NavBar());\n  greet('with nav');\n}\n" },
    { p:'styles/main.css', s:'M', content:"body { margin: 6px; font-family: system-ui; }\n" } ],
    en:{ label:'Nav component' } },
  { label:'文档与清理', changes:[
    { p:'docs/git-basics.md', s:'A', content:'# Git Basics\n\nSummary of the official tutorial.\n' },
    { p:'README.md', s:'M', content:'# visual-git\n\nAn interactive Git sandbox.\n\n## Collaborating\n\nPull before you push.\n' },
    { p:'src/utils.ts', s:'D' } ],
    en:{ label:'Docs & cleanup' } },
];

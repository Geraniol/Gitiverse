'use strict';
window.VGE = window.VGE || {};

let SUGGEST_CMD = '';
let modalAction = 'reset';   /* which action the shared confirm modal is running */

/* Kinds of the shared confirm modal: title/body/OK i18n keys in one place,
   so adding a kind is one line instead of a copied markup block. */
const CONFIRM_KINDS = {
  reset:          { title:'modal.resetTitle',     body:'modal.reset',          ok:'modal.okReset' },
  clearAI:        { title:'cfg.clearTitle',       body:'cfg.clearBody',        ok:'cfg.clearOk' },
};
function openConfirm(kind){
  const k = CONFIRM_KINDS[kind] || CONFIRM_KINDS.reset;
  modalAction = kind;
  $('mTitle').textContent = VGE.i18n.t(k.title);
  $('mBody').innerHTML = VGE.i18n.t(k.body);
  $('mOk').textContent = VGE.i18n.t(k.ok);
  $('mask').classList.add('on');
}
/* Close the confirm modal. */
function dismissMask(){
  $('mask').classList.remove('on');
}
/* Suggestion chips are generated per language. Only two generic prompts fit the
   narrow chat area, covering "I am stuck" and "I do not get what just happened". */
const suggestions = () => ['sug.q0','sug.q1'].map(k => VGE.i18n.t(k));
function renderSugs(){
  const sg = $('sugs'); if(!sg) return;
  /* chip is the base class (components/buttons.css); sug is only a JS/test hook */
  sg.innerHTML = suggestions().map(s => '<button class="sug chip">' + esc(s) + '</button>').join('');
  sg.querySelectorAll('.sug').forEach(b => b.addEventListener('click', ()=> askAI(b.textContent)));
}

function execInto(raw){
  const br = repo.HEAD, initd = repo.init;
  const r = interpret(raw);
  return { raw:raw, out:r.out, ok:r.ok, br:br, initd:initd };
}
/* Support a && b chains: split into separate history entries, like a real shell. */
function splitChain(raw){ return String(raw).split('&&').map(s => s.trim()).filter(Boolean); }
function runCommand(raw){
  raw = String(raw || '').trim(); if(!raw) return;
  /* Real-repo mode sent commands to a backend, not the sandbox engine. */
  if(cursor < repo.log.length - 1) repo.log = repo.log.slice(0, cursor + 1);
  splitChain(raw).forEach(c => repo.log.push(execInto(c)));
  cursor = repo.log.length - 1;
  renderAll();
}
function rewindTo(i){
  const keep = repo.log.slice();
  resetHash(); primeColors();
  repo = blankRepo(); repo.log = keep;
  for(let k = 0; k <= i; k++){
    const e = execInto(keep[k].raw);
    keep[k].out = e.out; keep[k].ok = e.ok; keep[k].br = e.br; keep[k].initd = e.initd;
  }
  cursor = i; lastSig = '';
  renderAll();
}

/* Append a bubble and return it; streaming fills it character by character. */
function chat(html, who){
  const b = $('chat'), d = document.createElement('div');
  d.className = 'bub ' + (who || 'ai'); d.innerHTML = html;
  b.appendChild(d); b.scrollTop = b.scrollHeight;
  return d;
}
function scrollChat(){ const b = $('chat'); if(b) b.scrollTop = b.scrollHeight; }

/* Minimal inline markdown: only turn `code` into <code>. Must run after esc(),
   so model output is plain text first and can never inject HTML. */
function mdInline(s){ return String(s).replace(/`([^`\n]+)`/g, '<code>$1</code>'); }

/* Translate HTTP/network failures into a prompt the user can act on. */
function aiErrHTML(e){
  const T = VGE.i18n.t.bind(VGE.i18n), m = esc((e && e.msg) || '');
  let msg;
  const ep = esc((e && e.endpoint) || '');
  const nm = esc((e && e.name) || '');
  if(e && e.timeout)                msg = T('ai.errTimeout', { n:Math.round(VGE.ai.IDLE_MS / 1000) });
  /* status 0 = no response at all, usually CORS or no network. The message says
     only that. */
  else if(!e || e.status === 0)     msg = T('ai.errNet',     { msg:m, endpoint:ep, name:nm });
  else if(e.status === 401 || e.status === 403) msg = T('ai.err401', { code:e.status, msg:m });
  else if(e.status === 404)         msg = T('ai.err404',     { msg:m });
  else if(e.status === 429)         msg = T('ai.err429');
  else if(e.status >= 500)          msg = T('ai.err5xx',     { code:e.status });
  else                              msg = T('ai.errOther',   { code:e.status, msg:m });
  return svgIcon('alert','xs') + ' ' + msg;
}
/* AI-readable snapshot of the current state, as plain data. Same policy as
   aiStateText() in ai.js: no course/step, mode or identity. The sent text is
   built there; this object is for the offline answerer and debugging. */
function aiContext(){
  const P = pending();   /* merge or rebase in progress; report unresolved files to the model */
  return {
    branch: repo.HEAD, commits: repo.commits.length,
    branches: Object.keys(repo.branches),
    staged: staged().length, unstaged: unstaged().length,
    conflicted: P ? P.open : [],
    operation: repo.rebase ? 'rebase' : (repo.merging ? 'merge' : null),
  };
}
let nodeDiffProvider = null;   /* (path) => HTML or Promise<HTML>, supplied by whoever opens the panel */

/* Change stats: added / modified / deleted / total. */
function nodeStatsHTML(changes){
  const t = VGE.i18n.t.bind(VGE.i18n), n = { A:0, M:0, D:0 };
  (changes || []).forEach(ch => { if(n[ch.s] !== undefined) n[ch.s]++; });
  return '<div class="node-stats">'
    + '<span class="ns a">+' + n.A + ' ' + esc(t('legend.add')) + '</span>'
    + '<span class="ns m">~' + n.M + ' ' + esc(t('legend.mod')) + '</span>'
    + '<span class="ns d">-' + n.D + ' ' + esc(t('legend.del')) + '</span>'
    + '<span class="ns n">' + esc(t('node.files', { n:(changes || []).length })) + '</span></div>';
}
/* Directory view of changed files (only touched files; intermediate dirs filled in). */
function nodeTreeHTML(changes){
  const list = changes || [];
  if(!list.length)
    return '<div class="sub" style="margin-top:8px">' + esc(VGE.i18n.t('node.noChanges')) + '</div>';
  const stat = {};
  list.forEach(ch => stat[ch.p] = { states:[{ s:ch.s, staged:false }], s:ch.s, staged:false });
  const files = list.map(ch => ch.p).sort();
  return '<div class="tree node-tree">' + treeHTML(buildTree(files), stat, false, -1) + '</div>';
}

function openNodePanel(html, diffFor){
  const body = $('nodeBody'), mask = $('maskNode');
  if(!body || !mask) return;
  nodeDiffProvider = diffFor || null;
  body.innerHTML = html;
  body.scrollTop = 0;
  /* Bind file rows with dataset + closure, not selectors: paths may hold quotes or backslashes. */
  body.querySelectorAll('.tnode[data-path]').forEach(row => {
    row.classList.add('clickable');
    row.addEventListener('click', () => toggleNodeFile(row, row.dataset.path));
  });
  paintIcons(body);
  mask.classList.add('on');
}
function closeNodePanel(){
  const mask = $('maskNode');
  if(mask) mask.classList.remove('on');
  nodeDiffProvider = null;
}
/* Expand/collapse one file's diff (accordion; independent, several can be open). */
async function toggleNodeFile(row, path){
  const next = row.nextElementSibling;
  if(next && next.classList.contains('nodediff')){      /* already open -> collapse */
    next.remove();
    row.classList.remove('open');
    const b = row.querySelector('.nd-stat'); if(b) b.remove();
    return;
  }
  const box = document.createElement('div');
  box.className = 'nodediff';
  box.innerHTML = '<div class="sub">' + esc(VGE.i18n.t('node.diffLoading')) + '</div>';
  row.after(box);
  row.classList.add('open');
  let html = '';
  try{
    html = nodeDiffProvider ? await nodeDiffProvider(path) : '';
  }catch(e){
    html = '<div class="sub">' + esc(String((e && e.message) || e)) + '</div>';
  }
  if(!box.isConnected) return;                          /* collapsed or panel closed meanwhile */
  box.innerHTML = html || '<div class="sub">' + esc(VGE.i18n.t('node.diffNone')) + '</div>';
  paintIcons(box);
  /* Append +n -m at the row end so the biggest change is obvious at a glance. */
  const plus = (html.match(/class="l add"/g) || []).length;
  const minus = (html.match(/class="l del"/g) || []).length;
  if(plus || minus){
    const badge = document.createElement('span');
    badge.className = 'nd-stat';
    badge.innerHTML = '<span class="p">+' + plus + '</span><span class="m">−' + minus + '</span>';
    row.appendChild(badge);
  }
}
/* Sandbox: both sides live in memory, so diffs are computed synchronously.
   diffProvider's signature is always (path) => HTML; the panel only knows the
   path (data-path), and each mode looks up the change object itself. */
function sandboxDiffFor(c, changes){
  const pContent = c.parents.length ? contentOf(repo.byId[c.parents[0]]) : {};
  const byPath = {};
  (changes || []).forEach(ch => { byPath[ch.p] = ch; });
  return path => {
    const ch = byPath[path] || { p:path, s:'M' };
    const before = pContent[path] || '', after = (c.content || {})[path] || '';
    const t = VGE.i18n.t.bind(VGE.i18n);
    const d = diffLines(before, after);
    /* When content is identical (e.g. only a mode change), say so instead of an empty box. */
    if(!d.some(x => x.t === '+' || x.t === '-'))
      return '<div class="sub">' + esc(t('node.diffNone')) + '</div>';
    const kind = ch.s === 'A' ? t('explain.added') : ch.s === 'D' ? t('legend.del') : t('explain.modified');
    return '<div class="diffbox"><div class="cap">' + svgIcon('fileCode','xs') + esc(path)
      + '<span style="margin-left:auto;color:var(--muted);font-weight:500">' + esc(kind) + '</span></div>'
      + '<div class="dl">' + d.map(x => '<div class="l ' + (x.t === '+' ? 'add' : x.t === '-' ? 'del' : '') + '">'
        + (x.t === '+' ? '+' : x.t === '-' ? '-' : ' ') + ' ' + esc(x.l) + '</div>').join('') + '</div></div>';
  };
}
function explainNode(id){
  const t = VGE.i18n.t.bind(VGE.i18n);
  /* Real repo: diff is not local, so it is lazy-loaded from the backend. */
  if(String(id).indexOf('ref:') === 0){
    const ref = graphRefs().find(r => 'ref:' + r.name === id);
    const remote = ref && ref.remote;
    if(remote){
      openNodePanel(t('explain.origin', { ref: esc(ref.name.slice(7)), tip: esc(ref.tip) }));
    } else {
      const b = ref ? ref.name : String(id).slice(4);
      openNodePanel(t('explain.branch', { name: esc(b), tip: esc(tipOf(b) || '—') }));
    }
    return;
  }
  const c = graphCommitById(id); if(!c) return;
  const remote = !repo.byId[id];
  const refs = refsAt(id);
  let html = t('explain.commitHead', { id: esc(c.id), msg: esc(c.msg) });
  const bits = [
    remote ? t('explain.remote') : t('explain.branchOf', { branch: esc(c.branch) }),
    t('explain.parents', { parents: c.parents.length ? c.parents.map(esc).join(', ') : t('explain.parentNone') }),
    t('explain.snapshot', { n: c.snapshot.length }),
  ];
  if(c.isMerge) bits.push(t('explain.merge'));
  if(refs.length) bits.push(t('explain.refs', { refs: esc(refs.join(', ')) }));
  html += t('explain.sub', { bits: bits.join(' · ') });
  const changes = (c.isMerge && c.parents.length)
    ? (repo.byId[c.parents[1]] ? repo.byId[c.parents[1]].changes : c.changes || [])
    : (c.changes || []);
  /* Stats + directory view; diffs wait for a file click (content is in memory, so sync). */
  html += nodeStatsHTML(changes) + nodeTreeHTML(changes);
  openNodePanel(html, sandboxDiffFor(c, changes));
}

/* Ask entry point: without a key use the built-in offline answer (works with no
   network); with a key hand off to VGE.ai streaming, rendered word by word. */
function askAI(q){
  q = String(q || '').trim(); if(!q) return;
  /* No "You" speaker label on question bubbles: alignment and colour already show the role. */
  chat(esc(q), 'me');
  if(!VGE.ai.isReady()){
    chat(VGE.ai.answer(q, aiContext()));
    return;
  }
  streamAI(q);
}
/* Streaming: insert an empty bubble, repaint per delta. Each delta re-escapes the
   whole text, so model HTML shows as text. Replies are short; full repaint is cheap. */
function streamAI(q){
  const bub = chat('', 'ai');
  bub.classList.add('stream');
  const caret = document.createElement('span');
  caret.className = 'caret';
  bub.appendChild(caret);

  let raw = '';
  const paint = () => {
    bub.innerHTML = raw ? mdInline(esc(raw))
                        : '<span class="sub">' + esc(VGE.i18n.t('ai.streaming')) + '</span>';
    bub.appendChild(caret);
    scrollChat();
  };
  paint();
  /* Start the request before refreshing chrome: aiAsk sets busy synchronously
     before its first await. */
  const pending = VGE.ai.ask(q, { onDelta: t => { raw += t; paint(); } });
  renderAiChrome();

  pending.then(r => {
    bub.classList.remove('stream');
    if(caret.parentNode) caret.remove();
    if(r.ok){
      bub.innerHTML = raw ? mdInline(esc(raw)) : esc(VGE.i18n.t('ai.errEmpty'));
      if(!raw) bub.classList.add('err');
    }else if(r.reason === 'aborted'){
      bub.innerHTML = (raw ? mdInline(esc(raw)) : '') + ' <span class="sub">' + esc(VGE.i18n.t('ai.stopped')) + '</span>';
    }else if(r.reason === 'empty'){
      bub.classList.add('err');
      bub.innerHTML = svgIcon('alert','xs') + ' ' + esc(VGE.i18n.t('ai.errEmpty'));
    }else{
      bub.classList.add('err');
      bub.innerHTML = aiErrHTML(r.err);
    }
    paintIcons(bub);
    renderAiChrome();
    scrollChat();
  });
}

/* Input placeholder: one command likely useful right now, plus why. Chosen from
   repo state only (staged -> commit, unstaged -> add, else -> log). Commands stay
   plain English: they are copied into a terminal. */
function updateSuggestion(){
  const inp = $('cmdInput');
  let cmd, why;
  if(!repo.init){
    cmd = 'git init'; why = VGE.i18n.t('sug.noRepo');
  } else if(staged().length){
    cmd = 'git commit -m "update"'; why = VGE.i18n.t('sug.staged');
  } else if(unstaged().length){
    cmd = 'git add .'; why = VGE.i18n.t('sug.unstaged');
  } else {
    cmd = 'git log'; why = VGE.i18n.t('sug.history');
  }
  SUGGEST_CMD = cmd;
  inp.placeholder = cmd + '   — ' + why;
}
/* Refresh the page title for the current language. */
function renderTitle(){
  document.title = VGE.i18n.t('app.title');
}

/* Terminal prompt. Colours use tokens so they stay legible in the dark theme. */
function updatePrompt(){
  $('psPrefix').innerHTML = VGE.i18n.t('term.prompt')
    + (repo.init ? ' <span style="color:var(--term-amber)">(' + esc(repo.HEAD) + ')</span>' : '') + ' $';
}

function cfgMsg(text, kind){
  const el = $('aiCfgMsg');
  el.className = 'cfg-msg' + (text ? ' on ' + (kind || '') : '');
  el.innerHTML = text || '';
  if(text) paintIcons(el);
}
function openAiCfg(){
  const c = VGE.ai.config();
  $('aiEndpoint').value = c.endpoint;
  $('aiKey').value      = c.apiKey;
  $('aiModel').value    = c.model;
  $('aiKey').type       = 'password';
  $('aiKeyEye').innerHTML = svgIcon('eye','sm');
  cfgMsg('');
  syncLangSeg();
  openedCfg = { endpoint:c.endpoint, model:c.model };    /* compared on close to decide whether to clear chat history */
  $('maskCfg').classList.add('on');
  setTimeout(()=>{ $('aiKey').focus(); }, 30);
}
/* Model/endpoint captured on open, to tell whether the user really switched models. */
let openedCfg = null;
function closeAiCfg(){
  $('maskCfg').classList.remove('on');
  const c = VGE.ai.config();
  const changed = openedCfg && (c.model !== openedCfg.model || c.endpoint !== openedCfg.endpoint);
  openedCfg = null;
  if(changed){ VGE.ai.resetHistory(); renderAll(); }
}
/* Read a config from the form (usable for a connection test before saving). */
function readAiForm(){
  /* Only three inputs; reply limit/temperature use config defaults (see aiBlankCfg in ai.js). */
  return {
    endpoint: $('aiEndpoint').value,
    apiKey:   $('aiKey').value,
    model:    $('aiModel').value,
  };
}
/* Validate a form: return the first error, or null when fine. */
function aiFormError(f){
  const T = VGE.i18n.t.bind(VGE.i18n);
  if(!VGE.ai.isValidEndpoint(f.endpoint)) return T('cfg.errEndpoint');
  if(!f.apiKey.trim())                    return T('cfg.errKey');
  if(!f.model.trim())                     return T('cfg.errModel');
  return null;
}
let autoSaveTimer = null;
/* Save as you type: 600ms after the last edit, validate and persist. Empty form
   saves nothing; invalid input shows a red hint and keeps the last good config;
   valid input is saved with a green "saved" note. */
function autoSaveAiCfg(){
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(()=>{
    const f = readAiForm();
    const blank = !f.endpoint.trim() && !f.apiKey.trim() && !f.model.trim();
    if(blank){ cfgMsg(''); return; }
    const err = aiFormError(f);
    if(err) return cfgMsg(svgIcon('alert','xs') + ' ' + esc(err), 'bad');
    if(!VGE.ai.saveConfig(f)) return cfgMsg(svgIcon('alert','xs') + ' ' + esc(VGE.i18n.t('cfg.errLocal')), 'bad');
    cfgMsg(svgIcon('circleCheck','xs') + ' ' + esc(VGE.i18n.t('cfg.autoSaved')), 'ok');
  }, 600);
}
async function testAiCfg(){
  const btn = $('aiCfgTest');
  btn.disabled = true;
  cfgMsg(esc(VGE.i18n.t('cfg.testing')));
  const r = await VGE.ai.test(readAiForm());
  btn.disabled = false;
  if(r.ok){
    cfgMsg(svgIcon('circleCheck','xs') + ' '
         + esc(VGE.i18n.t('cfg.testOk', { model:r.model, ms:r.ms })), 'ok');
    return;
  }
  /* Pass the vendor error body through: when CORS blocks a direct call it is the only clue. */
  const detail = r.code === 'endpoint' ? VGE.i18n.t('cfg.errEndpoint')
               : r.code === 'key'      ? VGE.i18n.t('cfg.errKey')
               : r.code === 'model'    ? VGE.i18n.t('cfg.errModel')
               : r.code === 'timeout'  ? VGE.i18n.t('cfg.testTimeout')
               : (r.status ? r.status + ' · ' : '') + (r.msg || VGE.i18n.t('cfg.testNet'));
  cfgMsg(svgIcon('alert','xs') + ' ' + esc(VGE.i18n.t('cfg.testFail', { msg:detail })), 'bad');
}
function toggleAiKeyEye(){
  const inp = $('aiKey'), show = inp.type === 'password';
  inp.type = show ? 'text' : 'password';
  $('aiKeyEye').innerHTML = svgIcon(show ? 'eyeOff' : 'eye','sm');
}
/* Language slider: segmented buttons built from VGE.i18n.supported, with the pill
   moved to the current language. data-cur positions the pill (translateX by one
   cell); .on sets the text colour. */
function syncLangSeg(){
  const seg = $('langSeg'); if(!seg) return;
  const codes = VGE.i18n.supported;
  const label = c => VGE.i18n.t('cfg.lang.' + (c === 'zh-CN' ? 'zh' : 'en'));
  let btns = [...seg.querySelectorAll('.seg-opt')];
  if(btns.length !== codes.length){          /* rebuild only when the language list changes */
    btns.forEach(b => b.remove());
    btns = codes.map(c => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'seg-opt'; b.dataset.lang = c;
      b.setAttribute('role', 'radio');
      seg.appendChild(b);
      return b;
    });
  }
  btns.forEach((b, i) => {
    b.textContent = label(codes[i]);      /* label follows the UI language */
    const on = codes[i] === VGE.i18n.current;
    b.classList.toggle('on', on);
    b.setAttribute('aria-checked', String(on));
  });
  seg.dataset.cur = VGE.i18n.current;
  /* Pill position uses data-idx (0-based); CSS reads only this, so adding a language needs no CSS change. */
  seg.dataset.idx = String(Math.max(0, codes.indexOf(VGE.i18n.current)));
}

const SEED_CMDS = [
  'git init',
  'git add .',
  'git commit -m "Add project scaffold"',
  'git branch feature',
  'git switch feature',
  'git add .',
  'git commit -m "Add navigation bar"',
  'git switch main',
  'git add .',
  'git commit -m "Update docs and cleanup"',
];
/* Reset only repo state + UI, not the chat log (used when importing a course). */
function resetSandboxState(cmds){
  resetHash(); primeColors(); collapsed.clear();
  repo = blankRepo(); cursor = -1; lastSig = '';
  if(net){ net.destroy(); net = null; }
  (cmds || []).forEach(raw => splitChain(raw).forEach(c => repo.log.push(execInto(c))));
  cursor = repo.log.length - 1;
  renderAll();
}
function boot(seed){
  resetSandboxState(seed);
  $('chat').innerHTML = '';
  chat(VGE.i18n.t('chat.greet'));
  renderAll();
}
function resetSandbox(){
  boot([]);
  chat(VGE.i18n.t('chat.reset'));
  if(VGE.tour) VGE.tour.restart();
}

(function bind(){
  const inp = $('cmdInput');
  /* In stacked mode `ai ...` switches to the AI assistant instead of running a sandbox command. */
  const stackedTakes = v => !(VGE.tour && VGE.tour.active()) && !!(VGE.stacked && VGE.stacked.takeTerminalInput(v));
  $('runBtn').addEventListener('click', ()=>{
    if(stackedTakes(inp.value)){ inp.value = ''; return; }
    runCommand(inp.value); inp.value = ''; updateSuggestion();
  });
  inp.addEventListener('keydown', e=>{
    if(e.key === 'Enter'){
      e.preventDefault(); // A successful tour step may move focus onto its Continue button.
      if(stackedTakes(inp.value)){ inp.value = ''; updateSuggestion(); return; }
      runCommand(inp.value); inp.value = ''; updateSuggestion();
    }
    else if(e.key === 'Tab' && !inp.value){ e.preventDefault(); inp.value = SUGGEST_CMD; updateSuggestion(); }
    else if(e.key === 'ArrowUp' && !inp.value && repo.log.length){ e.preventDefault(); inp.value = repo.log[cursor >= 0 ? cursor : 0].raw; updateSuggestion(); }
  });

  $('chips').addEventListener('click', e=>{
    const b = e.target.closest('.chip'); if(!b) return;
    inp.value = b.dataset.cmd; inp.focus(); updateSuggestion();
  });

  /* AI: the send button becomes Stop while streaming. */
  /* The AI input only asks questions (also in stacked mode); use the toggle button to return to the terminal. */
  $('aiSend').addEventListener('click', ()=>{
    if(VGE.ai.busy()){ VGE.ai.abort(); return; }
    askAI($('aiInput').value); $('aiInput').value = '';
  });
  $('aiInput').addEventListener('keydown', e=>{
    if(e.key === 'Enter'){ askAI($('aiInput').value); $('aiInput').value = ''; }
  });
  renderSugs();   /* suggestion chips are built per language */

  $('themeBtn').addEventListener('click', ()=> VGE.theme.toggle());
  VGE.theme.onChange(()=> renderGraph());

  /* AI config modal */
  $('aiCfgBtn').addEventListener('click', openAiCfg);
  $('aiStatus').addEventListener('click', openAiCfg);
  $('aiCfgTest').addEventListener('click', testAiCfg);
  $('aiCfgClear').addEventListener('click', ()=> openConfirm('clearAI'));
  $('aiKeyEye').addEventListener('click', toggleAiKeyEye);
  /* Event delegation: the segmented buttons are generated by syncLangSeg(). */
  $('langSeg').addEventListener('click', e => {
    const btn = e.target.closest('.seg-opt');
    if(btn && btn.dataset.lang !== VGE.i18n.current) applyLang(btn.dataset.lang);
  });
  /* Reset layout posts no chat message: the result is visible on screen immediately. */
  $('layoutReset').addEventListener('click', ()=> VGE.layout.reset());
  $('maskCfg').addEventListener('click', e=>{ if(e.target === $('maskCfg')) closeAiCfg(); });
  /* All three inputs save as you type (no cancel/save buttons in the footer). */
  ['aiEndpoint','aiKey','aiModel'].forEach(id =>
    $(id).addEventListener('input', autoSaveAiCfg));

  $('gFit').addEventListener('click', ()=>{ hideNodeTip(); net ? doFit(300) : renderGraph(); });
  setDirIcon();
  $('gDir').addEventListener('click', ()=>{
    gDir = gDir === 'LR' ? 'UD' : 'LR';
    setDirIcon();
    hideNodeTip();
    /* Do NOT call doFit here: renderGraph() below already schedules doFit(280)
       when gDir (part of sig) changes. Two fits 1ms apart fight over the zoom. */
    if(net) net.setOptions(visOptions());
    renderGraph();
  });

  $('resetBtn').addEventListener('click', ()=>{
    /* Reset button in the top bar: the only "clear sandbox" entry, opens the confirm modal. */
    openConfirm('reset');
  });
  $('mCancel').addEventListener('click', dismissMask);
  $('mOk').addEventListener('click', ()=>{
    $('mask').classList.remove('on');
    if(modalAction === 'clearAI'){ VGE.ai.clearConfig(); renderAll(); chat(svgIcon('trash','xs') + ' ' + esc(VGE.i18n.t('cfg.cleared'))); return; }
    /* Only one confirm remains: reset the sandbox. */
    resetSandbox();
  });
  $('mask').addEventListener('click', e=>{ if(e.target === $('mask')) dismissMask(); });
  /* Hover tip is interactive: entering cancels the close, leaving restarts the timer (bound once). */
  VGE.render.initNodeTip();
  /* Node detail panel closes via the X button, mask click or Esc, like other modals. */
  $('nodeClose').addEventListener('click', closeNodePanel);
  $('maskNode').addEventListener('click', e=>{ if(e.target === $('maskNode')) closeNodePanel(); });
  document.addEventListener('keydown', e=>{
    if(e.key === 'Escape'){
      dismissMask();
      closeAiCfg();          /* unified exit: also clears chat history when the model changed */
      closeNodePanel();
    }
  });

  window.addEventListener('resize', ()=>{ hideNodeTip(); if(!HAS_VIS) renderGraph(); });
})();

/* Graph toolbar direction button: the icon shows the current layout (side by side =
   horizontal, stacked = vertical). The old svg must be cleared, since paintIcons
   only fills empty nodes. */
function setDirIcon(){
  const el = $('gDir'); if(!el) return;
  const ic = el.querySelector('.ic'); if(!ic) return;
  const want = gDir === 'LR' ? 'layoutArrowRight' : 'layoutArrowDown';
  if(ic.dataset.ic === want) return;
  ic.dataset.ic = want;
  ic.innerHTML = '';
  paintIcons(el);
}

function applyLang(code){
  VGE.i18n.setLang(code);                       /* set current + refresh [data-i18n]/[data-i18n-ph] */
  try{ localStorage.setItem(VGE.i18n.STORE_KEY, VGE.i18n.current); }catch(e){ /* private mode */ }
  document.documentElement.setAttribute('lang', code);
  renderAll();                                  /* repaint chrome + panels (chrome uses VGE.i18n.t) */
  syncLangSeg();                                /* the settings language slider follows the current language */
  /* The bottom-panel toggle label is JS-written (state-dependent), so data-i18n cannot cover it. */
  if(VGE.stacked) VGE.stacked.refresh();
}
window.__setLang = applyLang;

/* Export the control layer for external extension. */
VGE.app = {
  runCommand: runCommand, rewindTo: rewindTo, askAI: askAI,
  boot: boot, resetSandbox: resetSandbox, aiContext: aiContext,
  openAiCfg: openAiCfg, openConfirm: openConfirm,
  openNodePanel: openNodePanel, closeNodePanel: closeNodePanel,
  nodeStatsHTML: nodeStatsHTML, nodeTreeHTML: nodeTreeHTML,
};

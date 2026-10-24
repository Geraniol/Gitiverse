'use strict';
window.VGE = window.VGE || {};

(function(){

const STACK_Q = '(max-width:1080px)';      /* matches the responsive.css breakpoint */
const HOVER_GRACE_MS = 320;                /* grace period between leaving the button and the panel closing */

let pinned = false;                        /* clicked to pin: once pinned, it does not close on mouse-out */
let hideTimer = null;

const $ = id => document.getElementById(id);
const isStacked = () => window.matchMedia(STACK_Q).matches;
/* which panel row 3 currently shows ('term' | 'ai') */
const bottomPanel = () => document.body.classList.contains('stack-ai') ? 'ai' : 'term';

function openFiles(){
  cancelHide();
  document.body.classList.add('files-open');
  const b = $('filesToggle'); if(b) b.setAttribute('aria-expanded', 'true');
}
function closeFiles(){
  cancelHide();
  pinned = false;
  document.body.classList.remove('files-open');
  const b = $('filesToggle'); if(b) b.setAttribute('aria-expanded', 'false');
}
function cancelHide(){ if(hideTimer){ clearTimeout(hideTimer); hideTimer = null; } }
function scheduleHide(){
  cancelHide();
  if(pinned) return;
  hideTimer = setTimeout(()=>{ hideTimer = null; closeFiles(); }, HOVER_GRACE_MS);
}

function bindFiles(){
  const btn = $('filesToggle'), box = $('colLeft'), close = $('filesClose');
  if(!btn || !box) return;

  btn.addEventListener('pointerenter', ()=>{ if(isStacked()) openFiles(); });
  btn.addEventListener('pointerleave', ()=>{ if(isStacked()) scheduleHide(); });
  btn.addEventListener('click', ev => {
    ev.stopPropagation();
    if(!isStacked()) return;               /* button is hidden on desktop anyway; fallback */
    if(pinned || document.body.classList.contains('files-open')) closeFiles();
    else { pinned = true; openFiles(); }
  });
  /* keyboard: focusing the button counts as "wants to see", and blur uses the same grace */
  btn.addEventListener('focus', ()=>{ if(isStacked()) openFiles(); });
  btn.addEventListener('blur', ()=>{ if(isStacked() && !pinned) scheduleHide(); });

  /* the panel itself: do not close while the pointer is inside */
  box.addEventListener('pointerenter', cancelHide);
  box.addEventListener('pointerleave', ()=>{ if(isStacked()) scheduleHide(); });

  if(close) close.addEventListener('click', ev => { ev.stopPropagation(); closeFiles(); });

  /* pinned and clicking outside the panel -> close */
  document.addEventListener('pointerdown', ev => {
    if(!pinned || !document.body.classList.contains('files-open')) return;
    if(box.contains(ev.target) || btn.contains(ev.target)) return;
    closeFiles();
  });
  document.addEventListener('keydown', ev => {
    if(ev.key === 'Escape' && document.body.classList.contains('files-open')) closeFiles();
  });
}

/* Switch to the target panel and focus its input. Transition is opacity +
   visibility only, so wait for the fade-in: focus() on a hidden element fails. */
function showBottom(which){
  if(!isStacked()) return;
  document.body.classList.toggle('stack-ai', which === 'ai');
  syncTip();
  focusSoon(which === 'ai' ? $('aiInput') : $('cmdInput'));
}
function focusSoon(el){
  if(!el) return;
  let tries = 0;
  const tick = () => {
    try{ el.focus(); }catch(e){ /* ignore */ }
    if(document.activeElement === el) return;
    if(++tries > 25) return;
    setTimeout(tick, 16);
  };
  tick();
}
function caretToEnd(el){
  try{ const n = el.value.length; el.setSelectionRange(n, n); }catch(e){ /* not a text field */ }
}
/* Merge text into the target input: append after any existing draft.
   A move within CONTINUE_MS is a continuation of the same switch, so join
   directly without a space - otherwise "what is" becomes "wh at is". */
const CONTINUE_MS = 400;
let lastMoveAt = 0;
function mergeInto(el, text, at){
  const cur = el.value.replace(/\s+$/, '');
  const cont = (at - lastMoveAt) < CONTINUE_MS;      /* continuation of the same switch */
  el.value = cur ? (cont ? cur + text : cur + ' ' + text) : text;
  lastMoveAt = at;
  caretToEnd(el);
}

const GIT_HEADING = /^\s*g(i(t)?)?\s*$/i;      /* incomplete git: g / gi / git (+space) */
const GIT_START   = /^\s*git\b/i;              /* already a git command */
const AI_TOKEN    = /^\s*ai\b[ \t]*/i;         /* leading ai token */

/* Right after switching to AI the user may still be typing the leading "ai"
   token one letter at a time. While the field only holds a partial token, eat
   it; stop once the content settles into something else. */
let stripToken = false;
const TOKEN_PARTIAL = /^\s*a(i(\s)?)?$/i;      /* a / ai / ai+space: still just the token */
/* Only strip the token when it is complete and followed by content. Partial
   states ("a", "ai", "ai ") must be watched: clearing too early deletes the
   "a" and the remaining "i" can never be recognised. */
function eatAiToken(){
  if(!stripToken) return;
  const ai = $('aiInput'); if(!ai) return;
  const v = ai.value;
  if(TOKEN_PARTIAL.test(v)) return;              /* still just the token -> keep watching */
  const m = /^\s*ai\b[ 	]*/.exec(v);
  if(m && m[0].length < v.length){               /* token followed by content -> strip it */
    ai.value = v.slice(m[0].length);
    caretToEnd(ai);
    stripToken = false;
    return;
  }
  stripToken = false;                            /* content is unrelated now, stop */
}
function switchToAi(text){
  const cmd = $('cmdInput'), ai = $('aiInput');
  if(!cmd || !ai) return false;
  cmd.value = '';
  const raw = String(text || '');
  const q = raw.replace(AI_TOKEN, '').trim();
  if(q) mergeInto(ai, q, Date.now());
  /* keep watching while it is still the token / token+content (typing often starts with a) */
  stripToken = TOKEN_PARTIAL.test(ai.value) || /^\s*ai\b/.test(ai.value);
  eatAiToken();
  showBottom('ai');
  caretToEnd(ai);
  return true;
}
/* Terminal input: leave if it does not start with git. Returns whether it switched. */
function onTerminalTyping(){
  const cmd = $('cmdInput');
  if(!cmd) return false;
  const v = cmd.value;
  if(!v.trim()) return false;                  /* empty: do nothing */
  if(GIT_HEADING.test(v) || GIT_START.test(v)) return false;
  return switchToAi(v);
}
/* Fallback for the Enter/button paths: normal typing is already handled at the
   input stage; this catches whole-paste-then-Enter and script-filled values. */
function takeTerminalInput(raw){
  if(!isStacked()) return false;              /* stacked mode only: desktop has two columns, nothing to move */
  const inp = $('cmdInput');
  if(inp && String(raw == null ? '' : raw) !== inp.value) inp.value = String(raw == null ? '' : raw);
  return inp ? onTerminalTyping() : false;
}
/* Switch button + hover tip: each panel has one button in its input row, showing
   the icon of the panel it goes to, so JS never changes the icon. One tip,
   attached to body (a card's overflow:hidden would clip it). */
function setTipFor(target){
  const tip = $('panelTip'); if(!tip) return;
  /* the argument is the TARGET panel (where the button goes), not the current one */
  tip.textContent = VGE.i18n.t(target === 'ai' ? 'stack.tipToAi' : 'stack.tipToTerm');
}
/* The visible button always goes to the other panel, so the text follows the
   other one. Past bug: passing the current panel as target left the tip reading
   "back to terminal" while the button actually went to AI. */
function syncTip(){ setTipFor(bottomPanel() === 'ai' ? 'term' : 'ai'); }
/* tip follows the button: read its position on show (fixed, so no clipping) */
function showTipAt(btn){
  const tip = $('panelTip'); if(!tip || !btn) return;
  tip.classList.add('on');
  const r = btn.getBoundingClientRect();
  const w = tip.offsetWidth, h = tip.offsetHeight;
  let left = r.left;                                        /* left-aligned with the button */
  left = Math.max(8, Math.min(left, document.documentElement.clientWidth - w - 8));
  let top = r.bottom + 8;                                   /* below the button */
  if(top + h > document.documentElement.clientHeight - 8) top = r.top - h - 8;
  tip.style.left = Math.round(left) + 'px';
  tip.style.top = Math.round(top) + 'px';
}
function hideTip(){
  const tip = $('panelTip'); if(tip) tip.classList.remove('on');
}
function bindSwitch(){
  document.addEventListener('click', ev => {
    const b = ev.target.closest ? ev.target.closest('.pswitch') : null;
    if(!b || !isStacked()) return;                /* button only shows in stacked mode */
    showBottom(b.dataset.panel === 'ai' ? 'ai' : 'term');
  });
  document.addEventListener('mouseover', ev => {
    const b = ev.target.closest ? ev.target.closest('.pswitch') : null;
    if(b && isStacked()) showTipAt(b);
  });
  document.addEventListener('mouseout', ev => {
    const b = ev.target.closest ? ev.target.closest('.pswitch') : null;
    if(b && !b.contains(ev.relatedTarget)) hideTip();
  });
  /* keyboard: show the tip when the button is tab-focused */
  document.addEventListener('focusin', ev => {
    const b = ev.target.closest ? ev.target.closest('.pswitch') : null;
    if(b && isStacked()) showTipAt(b);
  });
  document.addEventListener('focusout', hideTip);
  setTipFor(bottomPanel());
}
/* refresh the tip text after a language change (button aria uses data-i18n) */
function refresh(){ syncTip(); }

/* Clear state when the width returns to desktop, otherwise stack-ai stays on
   body and the next narrow layout would mysteriously open on the AI panel. */
function onBreakpoint(){
  if(isStacked()){ syncTip(); return; }
  closeFiles();
  stripToken = false;                       /* mode changed, token window is void */
  hideTip();
  document.body.classList.remove('stack-ai');
  setTipFor('ai');                          /* tip is hidden on desktop, either target is fine */
}

function init(){
  bindFiles();
  bindSwitch();
  document.body.classList.remove('stack-ai');   /* default to terminal */
  /* switch while typing: on input, no Enter or click needed */
  const ci = $('cmdInput'), ai = $('aiInput');
  if(ci) ci.addEventListener('input', ()=>{
    if(isStacked() && !(VGE.tour && VGE.tour.active())) onTerminalTyping();
  });
  /* The AI input no longer triggers any panel switch (user asked for no
     auto-jump in AI). It only eats a leftover "ai" token. */
  if(ai) ai.addEventListener('input', eatAiToken);
  syncTip();                                /* default is terminal -> tip reads "switch to AI" */
  const mq = window.matchMedia(STACK_Q);
  if(mq.addEventListener) mq.addEventListener('change', onBreakpoint);
  else if(mq.addListener) mq.addListener(onBreakpoint);
}

VGE.stacked = {
  init: init, isStacked: isStacked, bottomPanel: bottomPanel,
  openFiles: openFiles, closeFiles: closeFiles, showBottom: showBottom,
  takeTerminalInput: takeTerminalInput,
  refresh: refresh, setTipFor: setTipFor,
};

})();

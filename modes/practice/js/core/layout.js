'use strict';
window.VGE = window.VGE || {};

(function(){

const STORE_KEY = 'vge.layout.v1';
/* Stacked (half-screen) row ratios, stored separately.
   Key bumped v1 -> v2: rows went from three to two, so old three-value data
   has no meaning here - the new key discards it instead of migrating. */
const STORE_STACK = 'vge.layout.stack.v2';
const GRID_QUERY = '(min-width:1081px)';     /* matches the responsive.css breakpoint */
const STACK_QUERY = '(max-width:1080px)';    /* the other half of the same breakpoint */

/* Limits. Defaults are not hard-coded: the first drag measures the current
   rendered width, so the drag never jumps when CSS defaults change. */
const LIMITS = { colL:[200, 620], colR:[210, 700], mid:320, row:[22, 88],
                 ws:[112, 560] };   /* workspace height (px): 112 = card head 38 + padding 20 + stats bar ~50 */
/* Minimum height to keep for the file tree (card head 38 + legend 28 +
   two rows 44 + padding). The workspace drag max is computed from it so a
   short window never squeezes the tree away. */
const TREE_MIN = 150;

let L = null;                 /* desktop: { colL, colR, rows:[mid, right], ws } */
let S = null;                 /* stacked: { rows:[r1,r2] }, values are fr ratios */
let raf = null;

const isGrid = () => window.matchMedia(GRID_QUERY).matches;
const isStack = () => window.matchMedia(STACK_QUERY).matches;
const STACK_MIN = 80;                        /* min height per row (px), clamped while dragging */
const STACK_FR = [0.25, 8];                  /* stored fr ratio bounds, guards against bad values */
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function load(){
  let raw = null;
  try{ raw = JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); }catch(e){ /* ignore */ }
  if(!raw || typeof raw !== 'object') return null;
  const n = {
    colL: Number(raw.colL), colR: Number(raw.colR),
    rows: Array.isArray(raw.rows) ? raw.rows.map(Number) : [],
    ws: Number(raw.ws),
  };
  /* Old data stored three row values; the left column's row now uses --ws-h
     (px) instead, so drop the first item on read. This migrates old
     localStorage instead of rejecting it as a bad value. */
  if(n.rows.length === 3) n.rows = n.rows.slice(1);
  if(!isFinite(n.colL) || !isFinite(n.colR) || n.rows.length !== 2 || n.rows.some(r => !isFinite(r))) return null;
  n.colL = clamp(n.colL, LIMITS.colL[0], LIMITS.colL[1]);
  n.colR = clamp(n.colR, LIMITS.colR[0], LIMITS.colR[1]);
  n.rows = n.rows.map(r => clamp(r, LIMITS.row[0], LIMITS.row[1]));
  /* ws was added later: missing in old data, left null so cards.css
     --ws-h fallback decides the default height. */
  n.ws = (isFinite(n.ws) && n.ws > 0) ? clamp(n.ws, LIMITS.ws[0], LIMITS.ws[1]) : null;
  return n;
}
function save(){
  if(!L) return;
  /* Guard: never persist a NaN layout. ws may be null (workspace not
     dragged yet), which is not a bad value. */
  if(!isFinite(L.colL) || !isFinite(L.colR) || L.rows.some(r => !isFinite(r))) return;
  if(L.ws != null && !(isFinite(L.ws) && L.ws > 0)) return;
  try{ localStorage.setItem(STORE_KEY, JSON.stringify(L)); }catch(e){ /* private mode */ }
}

function loadStack(){
  let raw = null;
  try{ raw = JSON.parse(localStorage.getItem(STORE_STACK) || 'null'); }catch(e){ /* ignore */ }
  /* Only two rows are accepted; old three-row data is rejected here too,
     so a three-value ratio never feeds a two-row grid. */
  if(!raw || !Array.isArray(raw.rows) || raw.rows.length !== 2) return null;
  const rows = raw.rows.map(Number);
  if(rows.some(r => !isFinite(r) || r <= 0)) return null;
  return { rows: rows.map(r => clamp(r, STACK_FR[0], STACK_FR[1])) };
}
function saveStack(){
  if(!S) return;
  if(S.rows.some(r => !isFinite(r) || r <= 0)) return;      /* never store bad values */
  try{ localStorage.setItem(STORE_STACK, JSON.stringify(S)); }catch(e){ /* private mode */ }
}
function applyStack(){
  const root = document.documentElement;
  if(!S){
    ['--st-r1','--st-r2','--st-r3'].forEach(n => root.style.removeProperty(n));
    return;
  }
  S.rows.forEach((r, i) => root.style.setProperty('--st-r' + (i + 1), r + 'fr'));
  /* With two rows, --st-r3 should no longer exist. An old inline variable
     would linger on <html> and mislead later debugging, so remove it. */
  root.style.removeProperty('--st-r3');
}
/* The two cards that share space when stacked: the commit graph and the
   current bottom card (terminal or AI). Callers index [0] and [1], so
   exactly two must be found or the terminal would be treated as row 2. */
function stackCards(){
  const graph = document.querySelector('#colMid > .graph-card');
  const bottom = document.body.classList.contains('stack-ai')
    ? document.getElementById('aiCard') : document.getElementById('termCard');
  const list = [graph, bottom].filter(Boolean);
  return list.length === 2 ? list : null;
}
/* Measure current row heights into fr ratios (first-drag start point, not hard-coded) */
function measureStackCurrent(){
  const cards = stackCards(); if(!cards) return null;
  const h = cards.map(el => el.getBoundingClientRect().height);
  if(h.some(x => !(x > 0))) return null;
  const unit = Math.min.apply(null, h);
  return { rows: h.map(x => Math.round(x / unit * 1000) / 1000) };
}
/* Drag the "graph | bottom" boundary: one row grows exactly as much as the
   other shrinks. The two-row skeleton has only this boundary, so only st0
   is accepted - st1's handle is no longer created (see makeSplitters). */
function dragStack(id, y){
  if(id !== 'st0') return;
  const cards = stackCards(); if(!cards) return;
  if(!S) S = measureStackCurrent();
  if(!S) return;
  const r = cards.map(el => el.getBoundingClientRect());
  let h = r.map(x => x.height);
  const total = h[0] + h[1];
  if(!(total > 0)) return;
  const v = clamp(y - r[0].top, STACK_MIN, h[0] + h[1] - STACK_MIN);
  h = [v, h[0] + h[1] - v];
  const unit = Math.min.apply(null, h);
  S = { rows: h.map(x => Math.round(clamp(x / unit, STACK_FR[0], STACK_FR[1]) * 1000) / 1000) };
  applyStack();
}

function apply(){
  const root = document.documentElement;
  if(!L){ root.style.removeProperty('--col-l'); root.style.removeProperty('--col-r');
          root.style.removeProperty('--row-mid'); root.style.removeProperty('--row-right');
          applyWsVar();
          document.body.classList.remove('layout-custom'); return; }
  /* Row percentages are re-clamped for the current window: stored values may not fit a smaller one. */
  const rows = effectiveRows() || L.rows;
  root.style.setProperty('--col-l', L.colL + 'px');
  root.style.setProperty('--col-r', L.colR + 'px');
  root.style.setProperty('--row-mid',   rows[0] + '%');
  /* --row-right is now unread: no rule references it since the right column
     holds a single AI card. It is written on purpose - L.rows stays a
     two-value array (vge.layout.v1 stores two), so no migration is needed. */
  root.style.setProperty('--row-right', rows[1] + '%');
  applyWsVar();
  document.body.classList.add('layout-custom');
}

/* Workspace height (left column's second card). Only applies in the desktop
   three-column layout - the stacked overlay keeps the CSS default. The max
   is computed per window, always leaving TREE_MIN for the file tree. */
function effectiveWs(){
  if(!L || !(L.ws > 0)) return null;
  const main = document.querySelector('.main');
  const col = main ? main.querySelectorAll(':scope > .col')[0] : null;
  const H = col ? col.getBoundingClientRect().height : 0;
  if(!(H > 0)) return Math.round(clamp(L.ws, LIMITS.ws[0], LIMITS.ws[1]));
  const cs = window.getComputedStyle(col);
  const gap = parseFloat(cs.rowGap || cs.gap) || 0;
  const max = Math.max(H - TREE_MIN - gap, LIMITS.ws[0]);
  return Math.round(clamp(L.ws, LIMITS.ws[0], Math.min(LIMITS.ws[1], max)));
}
function applyWsVar(){
  const root = document.documentElement;
  const ws = (L && isGrid()) ? effectiveWs() : null;
  if(ws == null){ root.style.removeProperty('--ws-h'); return; }
  const v = ws + 'px';
  if(root.style.getPropertyValue('--ws-h') !== v) root.style.setProperty('--ws-h', v);
}

function makeSplitters(){
  const main = document.querySelector('.main');
  if(!main || main.querySelector('.split')) return;
  /* row2 (right column's card boundary) is gone with the task-guide card: the
     right column now holds one card, so there is nothing to drag. st1 is gone
     too - stacking leaves only the "graph | bottom" boundary. */
  [['col0','col'],['col1','col'],['row0','row'],['row1','row'],
   ['st0','row']].forEach(([id, kind]) => {
    const el = document.createElement('div');
    el.className = 'split split-' + kind;
    el.dataset.split = id;
    el.setAttribute('role', 'separator');
    el.setAttribute('aria-label', kind === 'col' ? 'resize columns' : 'resize rows');
    main.appendChild(el);
  });
}
function positionSplitters(){
  const main = document.querySelector('.main');
  if(!main) return;
  const splitters = main.querySelectorAll('.split');
  if(!splitters.length) return;

  /* Stacked: show only the between-rows handle (the two-row skeleton has one),
     positioned at the bottom card's top edge, i.e. the first card's bottom. */
  if(isStack()){
    /* This branch returns before reclampRows(), so --ws-h must be released here:
       otherwise a desktop 311px workspace would carry into the overlay and
       squeeze the file tree. */
    applyWsVar();
    const cards = stackCards();
    const mr2 = main.getBoundingClientRect();
    for(let i = 0; i < 1; i++){
      const el = main.querySelector('.split[data-split="st' + i + '"]');
      if(!el || !cards) continue;
      /* Explicit block: .split is display:none by default and the desktop set is
         opened by a media query; the stacked side has none, so set it here
         (clearing it falls back to none). */
      el.style.display = 'block';
      const cr = cards[i].getBoundingClientRect();
      const y = cr.bottom;
      el.style.left = Math.round(cr.left - mr2.left) + 'px';
      el.style.top = Math.round(y - mr2.top - 3) + 'px';
      el.style.width = Math.round(cr.width) + 'px';
      el.style.height = '7px';
    }
    splitters.forEach(el => { if(!/^st\d+$/.test(el.dataset.split)) el.style.display = 'none'; });
    return;
  }
  if(!isGrid()){ splitters.forEach(el => { el.style.display = 'none'; }); return; }
  /* On returning to wide screen the stacked handle must be hidden explicitly:
     its inline display:block beats the media query and would stay on the page
     at stale stacked coordinates. */
  splitters.forEach(el => { el.style.display = /^st\d+$/.test(el.dataset.split) ? 'none' : ''; });

  /* On resize the same percentage may no longer fit. Re-clamp the row values
     for the current window, writing CSS variables only and not L, so growing
     the window back restores the user's intent. */
  reclampRows();

  const mr = main.getBoundingClientRect();
  const cols = Array.prototype.slice.call(main.querySelectorAll(':scope > .col'));

  /* Draw each handle centered on the boundary CSS actually adjusts. Do not use
     nextElementSibling as "the next block" (hidden elements measure 0), and do
     not center it in the column gap (the drag would lag by half a gap). */
  for(let i = 0; i < 2; i++){
    const el = main.querySelector('.split[data-split="col' + i + '"]');
    const a = cols[i], b = cols[i + 1];
    if(!el || !a || !b) continue;
    const x = i === 0 ? a.getBoundingClientRect().right : b.getBoundingClientRect().left;
    el.style.left = Math.round(x - mr.left - 3) + 'px';
    el.style.top = '0px';
    el.style.width = '7px';
    el.style.height = Math.round(mr.height) + 'px';
  }
  for(const i of [0, 1]){
    const el = main.querySelector('.split[data-split="row' + i + '"]');
    const col = cols[i];
    if(!el || !col) continue;
    /* With the conflict panel active the workspace is :has(.confl-hd){flex:1 1
       auto;height:auto}, so --ws-h no longer sets its height. The handle would
       be a dead drag target, so hide it. */
    if(i === 0 && col.querySelector('#wsCard .confl-hd')){ el.style.display = 'none'; continue; }
    const cards = Array.prototype.filter.call(col.children, c => c.classList.contains('card'));
    const first = cards[0];
    if(!first) continue;
    const y = first.getBoundingClientRect().bottom;
    el.style.left = Math.round(col.getBoundingClientRect().left - mr.left) + 'px';
    el.style.top = Math.round(y - mr.top - 3) + 'px';
    el.style.width = Math.round(col.getBoundingClientRect().width) + 'px';
    el.style.height = '7px';
  }
}
/* main's padding is not part of the grid track, so the drag math must use the
   content box - otherwise the boundary sits one padding (12px) off the cursor. */
function contentBox(el){
  const b = el.getBoundingClientRect();
  const cs = window.getComputedStyle(el);
  const pl = parseFloat(cs.paddingLeft) || 0, pr = parseFloat(cs.paddingRight) || 0;
  const pt = parseFloat(cs.paddingTop) || 0, pb = parseFloat(cs.paddingBottom) || 0;
  return { left:b.left + pl, right:b.right - pr, top:b.top + pt, bottom:b.bottom - pb,
           width:b.width - pl - pr, height:b.height - pt - pb };
}
/* Coalesce into one frame so a drag does not force a layout read per event */
function schedulePosition(){
  if(raf) return;
  raf = (window.requestAnimationFrame || (fn => setTimeout(fn, 16)))(() => {
    raf = null;
    positionSplitters();
  });
}

/* Max % the first card may take in a column. Not hard-coded to 88%: the
   cards pushed down have minimum heights, and over-dragging would make the
   column taller than .main, scrolling and reflowing the page. */
function rowMaxPct(col, first){
  const H = col.getBoundingClientRect().height;
  if(!(H > 0)) return LIMITS.row[1];
  const cs = window.getComputedStyle(col);
  const gap = parseFloat(cs.rowGap || cs.gap) || 0;
  let need = 0, n = 0;
  Array.prototype.forEach.call(col.children, el => {
    if(el === first) return;
    /* a display:none child is not a flex item and has no gap */
    if(window.getComputedStyle(el).display === 'none') return;
    n++;
    /* cards use min-height (0 if none); non-cards (identity bars) are flex:none, so use actual height */
    const min = parseFloat(window.getComputedStyle(el).minHeight) || 0;
    need += (el.classList.contains('card') ? min : el.getBoundingClientRect().height);
  });
  need += gap * n;
  const firstMin = parseFloat(window.getComputedStyle(first).minHeight) || 0;
  const usable = Math.max(H - need, firstMin);
  return clamp(Math.round(usable / H * 1000) / 10, LIMITS.row[0], LIMITS.row[1]);
}
/* The column's height-fixed card, whose height the row splitter adjusts */
function firstCardOf(col){
  return Array.prototype.filter.call(col.children, c => c.classList.contains('card'))[0] || null;
}
/* Row percentages for rendering: stored values may exceed a smaller window,
   so re-clamp for the current one. L is deliberately not rewritten so
   growing the window back restores the user's intent. */
function effectiveRows(){
  if(!L) return null;
  const main = document.querySelector('.main');
  if(!main) return L.rows.slice();
  const cols = Array.prototype.slice.call(main.querySelectorAll(':scope > .col'));
  /* L.rows[0] maps to the middle column (cols[1]), L.rows[1] to the right (cols[2]) */
  return L.rows.map((v, i) => {
    const col = cols[i + 1]; if(!col) return v;
    const first = firstCardOf(col); if(!first) return v;
    return Math.min(v, rowMaxPct(col, first));
  });
}

/* Rewrite the row variables to the current window's max, only when a value
   actually changed, to avoid invalidating styles every frame. */
function reclampRows(){
  if(!L) return;
  const rows = effectiveRows();
  if(!rows) return;
  const root = document.documentElement;
  ['--row-mid','--row-right'].forEach((name, i) => {
    const v = rows[i] + '%';
    if(root.style.getPropertyValue(name) !== v) root.style.setProperty(name, v);
  });
  applyWsVar();          /* workspace height is re-clamped too (releasing to the default when stacked) */
}

/* Measure the three column widths and each column's first-card height as the custom-layout start point */
function measureCurrent(){
  const main = document.querySelector('.main');
  const cols = main ? Array.prototype.slice.call(main.querySelectorAll(':scope > .col')) : [];
  const wsCard = document.getElementById('wsCard');
  const out = { colL:246, colR:492, rows:[50, 58], ws:null };   /* only two row values: middle / right */
  if(cols.length === 3){
    out.colL = Math.round(cols[0].getBoundingClientRect().width) || out.colL;
    out.colR = Math.round(cols[2].getBoundingClientRect().width) || out.colR;
    /* Middle column defaults to 50% (graph and terminal split evenly, see
       graph.css); this is only a fallback when no real height is measurable
       (jsdom / first frame), otherwise the measured value is used. */
    const DEFAULTS = [50, 58];
    out.rows = [1, 2].map((ci, k) => {
      const col = cols[ci];
      const cards = Array.prototype.filter.call(col.children, c => c.classList.contains('card'));
      const first = cards[0];
      const h = col.getBoundingClientRect().height;
      if(!first || !h) return DEFAULTS[k];
      const pct = first.getBoundingClientRect().height / h * 100;
      return (isFinite(pct) && pct > 0) ? Math.round(pct * 10) / 10 : DEFAULTS[k];
    });
  }
  /* The first drag starts from the currently rendered workspace height (not a
     hard-coded 210), so changing CSS defaults or a recent drag never jumps. */
  if(wsCard){
    const h = Math.round(wsCard.getBoundingClientRect().height);
    if(h > 0) out.ws = h;
  }
  return out;
}

function onDown(ev){
  const el = ev.currentTarget;
  const id = el.dataset.split;
  if(!id) return;
  ev.preventDefault();
  try{ el.setPointerCapture(ev.pointerId); }catch(e){ /* old browsers */ }
  document.body.classList.add('resizing');
  /* The first drag enables the custom layout, starting from the current rendered size, not a hard-coded default */
  if(isStack()){ if(!S) S = measureStackCurrent(); }
  else if(!L) L = measureCurrent();

  const move = e => { dragTo(id, e.clientX, e.clientY); };
  const up = e => {
    try{ el.releasePointerCapture(ev.pointerId); }catch(err){ /* already released */ }
    document.body.classList.remove('resizing');
    el.removeEventListener('pointermove', move);
    el.removeEventListener('pointerup', up);
    el.removeEventListener('pointercancel', up);
    save();
    if(isStack()) saveStack();
    schedulePosition();
  };
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
}
function dragTo(id, x, y){
  const main = document.querySelector('.main');
  if(!main) return;
  /* Coordinates must be finite: some synthetic events (or a failed measurement)
     give undefined, which would produce NaN written to CSS variables and
     localStorage and break the layout. */
  if(!isFinite(x) || !isFinite(y)) return;
  /* Stacked mode adjusts row heights, not column widths, so it uses another path */
  if(id === 'st0' || id === 'st1'){ dragStack(id, y); schedulePosition(); return; }
  const mb = contentBox(main);        /* content box: main's padding is not part of the grid track */
  if(id === 'col0' || id === 'col1'){
    /* left hugs the left, right hugs the right; the middle column keeps a floor so it is not squeezed away */
    const maxSide = mb.width - LIMITS.mid - 24;      /* two 12px gaps */
    if(id === 'col0') L.colL = Math.round(clamp(x - mb.left, LIMITS.colL[0], Math.min(LIMITS.colL[1], maxSide - LIMITS.colR[0])));
    else              L.colR = Math.round(clamp(mb.right - x, LIMITS.colR[0], Math.min(LIMITS.colR[1], maxSide - LIMITS.colL[0])));
  }else{
    const ci = Number(id.slice(3));              /* the number in the handle name is the column index (0|1|2) */
    const col = main.querySelectorAll(':scope > .col')[ci];
    if(!col) return;
    const cr = col.getBoundingClientRect();     /* .col has no padding, so border-box is the content box */
    if(ci === 0){
      const cs = window.getComputedStyle(col);
      const gap = parseFloat(cs.rowGap || cs.gap) || 0;
      const max = Math.max(cr.height - TREE_MIN - gap, LIMITS.ws[0]);
      L.ws = Math.round(clamp(cr.bottom - y - gap, LIMITS.ws[0], Math.min(LIMITS.ws[1], max)));
    }else{
      /* max computed live: the column's other cards still keep their minimum heights */
      const first = firstCardOf(col);
      const maxPct = first ? rowMaxPct(col, first) : LIMITS.row[1];
      L.rows[ci - 1] = Math.round(clamp((y - cr.top) / cr.height * 100, LIMITS.row[0], maxPct) * 10) / 10;
    }
  }
  apply();
  schedulePosition();
}

function init(){
  makeSplitters();
  L = load();
  S = loadStack();
  apply(); applyStack();
  positionSplitters();
  const main = document.querySelector('.main');
  document.querySelectorAll('.split').forEach(el => el.addEventListener('pointerdown', onDown));
  window.addEventListener('resize', schedulePosition);
  /* ResizeObserver covers height changes from card content; jsdom lacks it, so
     this falls back to window resize plus renderAll. */
  if(typeof ResizeObserver === 'function' && main){
    try{ new ResizeObserver(schedulePosition).observe(main); }catch(e){ /* ignore */ }
  }
}
function reset(){
  L = null; S = null;
  try{ localStorage.removeItem(STORE_KEY); localStorage.removeItem(STORE_STACK); }catch(e){ /* private mode */ }
  apply(); applyStack();
  schedulePosition();
}
/* Called by renderAll: content changes alter card heights, so splitters follow */
function refresh(){ schedulePosition(); }
const current = () => (L ? JSON.parse(JSON.stringify(L)) : null);
const isCustom = () => !!L;
const currentStack = () => (S ? JSON.parse(JSON.stringify(S)) : null);
const isStackCustom = () => !!S;

VGE.layout = {
  init: init, reset: reset, refresh: refresh,
  current: current, isCustom: isCustom,
  currentStack: currentStack, isStackCustom: isStackCustom,
};

})();

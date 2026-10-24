'use strict';
window.VGE = window.VGE || {};

const $ = id => document.getElementById(id);
const MONO_FACE = 'Consolas, Menlo, monospace';
const HAS_VIS = !!(window.vis && window.vis.Network);

function tok(){
  const cs = getComputedStyle(document.documentElement);
  const get = (n, fb) => (cs.getPropertyValue(n) || '').trim() || fb;
  const accent = get('--accent', '#e8542f');
  return {
    accent:   accent,
    accentInk:get('--accent-ink', '#ffffff'),
    panel:    get('--panel',    '#ffffff'),
    panel2:   get('--panel-2',  '#f6f8fc'),
    line2:    get('--line-2',   '#cdd5e5'),
    ink:      get('--ink',      '#0e1526'),
    ink3:     get('--ink-3',    '#64708c'),
    muted:    get('--muted',    '#98a3bd'),
    ok:       get('--ok',       '#16a34a'),
    mod:      get('--mod',      '#d97706'),
    accentGlow:'color-mix(in srgb, ' + accent + ' 35%, transparent)',
    accentHalo:'color-mix(in srgb, ' + accent + ' 14%, transparent)'
  };
}

const collapsed = new Set();        /* collapsed directories */
let net = null, nodesDS = null, edgesDS = null;
let visOK = true;                   /* vis-network usable at runtime (else fall back to SVG) */
let gDir = 'LR', lastSig = '', fitting = false, tipFor = null;

const fileIcon = p => /\.(ts|tsx|js|jsx|css|json)$/.test(p) ? 'fileCode' : 'fileText';

function buildTree(paths){
  const root = { name:'', dir:true, kids:{} };
  paths.forEach(p=>{
    const segs = p.split('/'); let cur = root;
    segs.forEach((s,i)=>{
      const last = i === segs.length - 1;
      if(!cur.kids[s]) cur.kids[s] = { name:s, dir:!last, kids:{}, path:segs.slice(0,i+1).join('/') };
      cur = cur.kids[s];
    });
  });
  return root;
}
function sortKids(node){
  return Object.keys(node.kids).map(k => node.kids[k]).sort((a,b)=>
    a.dir !== b.dir ? (a.dir ? -1 : 1) : a.name.localeCompare(b.name));
}
function countFiles(node){
  return sortKids(node).reduce((n,k) => n + (k.dir ? countFiles(k) : 1), 0);
}
function treeHTML(node, stat, showDots, depth){
  let h = '';
  const lockOpen = depth < 0;
  sortKids(node).forEach(k=>{
    if(k.dir){
      const isCol = !lockOpen && collapsed.has(k.path);
      h += '<div class="tnode dir'+(isCol?' collapsed':'')+'" data-dir="'+esc(k.path)+'">'
         +   '<span class="ic chev">'+'<svg viewBox="0 0 24 24">'+IC.chevronDown+'</svg></span>'
         +   svgIcon(isCol ? 'folder' : 'folderOpen','fic')
         +   '<span class="nm">'+esc(k.name)+'</span>'
         +   '<span class="cnt">'+countFiles(k)+'</span>'
         + '</div>'
         + '<div class="tchildren'+(isCol?' hide':'')+'">'+treeHTML(k, stat, showDots, depth+1)+'</div>';
    }else{
      const st = stat[k.path];
      /* A path can carry several states at once - real Git "partial staging"
         means the same file has both staged and unstaged changes. List all
         states rather than hiding any behind a single badge. */
      const states = st ? st.states : [];
      const confl = pending() && pending().open.indexOf(k.path) >= 0;
      const badge = confl
        ? '<span class="badge C" title="'+VGE.i18n.t('cf.head')+'">!</span>'
        : states.map(x => '<span class="badge '+x.s+'" title="'
            + (x.staged ? VGE.i18n.t('legend.staged') : VGE.i18n.t('legend.unstaged'))
            + '">'+x.s+'</span>').join('');
      /* data-path feeds the node-detail panel: its file rows open a diff.
         Attribute only, no handler, so the left file tree is unaffected. */
      h += '<div class="tnode'+(states.some(x => x.s === 'D') ? ' del' : '')+(confl ? ' confl' : '')
         + '" title="'+esc(k.path)+'" data-path="'+esc(k.path)+'">'
         +   '<span class="ic chev"></span>'
         +   svgIcon(fileIcon(k.name),'fic')
         +   '<span class="nm">'+esc(k.name)+'</span>'
         +   (badge ? '<span style="margin-left:auto"></span>' + badge : '')
         +   (states.length && showDots && !confl
              ? states.map(x => '<span class="sdot '+(x.staged?'staged':'unstaged')+'" title="'
                  + (x.staged ? VGE.i18n.t('legend.staged') : VGE.i18n.t('legend.unstaged'))
                  + '" style="margin-left:5px"></span>').join('')
              : '')
         + '</div>';
    }
  });
  return h;
}
function workStat(){
  const stat = {};
  repo.work.forEach(w => {
    (stat[w.p] = stat[w.p] || { states: [] }).states.push({ s:w.s, staged:w.staged });
  });
  /* Compat: also expose the first state as s / staged for single-state callers */
  Object.keys(stat).forEach(p => {
    stat[p].s = stat[p].states[0].s;
    stat[p].staged = stat[p].states[0].staged;
  });
  return stat;
}
function renderTree(){
  const box = $('treeBox');
  const hint = VGE.i18n.t('card.treeHint', { br: repo.init ? repo.HEAD : VGE.i18n.t('card.treeEmpty') });
  $('treeHint').textContent = repo.init ? hint : VGE.i18n.t('card.treeEmpty');
  if(!repo.init){
    box.innerHTML = '<div class="tip warn" style="margin:6px 4px">'+svgIcon('alert')
      + '<span>' + VGE.i18n.t('ws.treeNoInit') + '</span></div>';
    paintIcons(box); return;
  }
  const paths = new Set(headSnapshot());
  repo.work.forEach(w => paths.add(w.p));
  if(!paths.size){ box.innerHTML = '<div class="prev-empty" style="padding:10px 6px">' + VGE.i18n.t('ws.treeEmpty') + '</div>'; return; }
  box.innerHTML = '<div class="tree">' + treeHTML(buildTree(Array.from(paths).sort()), workStat(), true, 0) + '</div>';
  paintIcons(box);
  box.querySelectorAll('.tnode.dir').forEach(el=>{
    el.addEventListener('click', ()=>{
      const p = el.dataset.dir;
      collapsed.has(p) ? collapsed.delete(p) : collapsed.add(p);
      renderTree();
    });
  });
}

function renderWorkspace(){
  const box = $('wsBox'), S = staged(), U = unstaged(), tracked = headSnapshot().length;
  const t = VGE.i18n.t.bind(VGE.i18n);
  const PEND = pending();
  if(PEND){
    const m = PEND;
    /* Merge and rebase share this panel (same state shape); only the wording differs */
    const rebasing = !!repo.rebase;
    let h = '<div class="confl-hd">' + svgIcon('alert','sm') + '<b>' + t(rebasing ? 'cf.headRebase' : 'cf.head') + '</b>'
      + '<span class="n">' + t('cf.unresolved', { n: m.open.length }) + '</span></div>'
      + '<div class="confl-desc">' + t(rebasing ? 'cf.descRebase' : 'cf.desc', { name: esc(m.other) }) + '</div>';
    if(m.open.length){
      m.open.forEach(p=>{
        const mineC = contentOf(repo.byId[m.mine])[p] || '';
        const theirsC = contentOf(repo.byId[m.theirs])[p] || '';
        h += '<div class="cf-file" data-p="'+esc(p)+'">'
          + '<div class="cf-name">'+svgIcon('fileCode','xs')+'<span>'+esc(p)+'</span></div>'
          + '<div class="cf-mk"><span class="h">' + t('cf.headMine') + '</span><span class="t">' + t('cf.headTheirs') + '</span></div>'
          + '<div class="cf-code"><span class="m">'+esc(mineC)+'</span><span class="t">'+esc(theirsC)+'</span></div>'
          + '<div class="cf-btns">'
          + '<button class="cfb btn btn--sm" data-mode="mine" data-p="'+esc(p)+'">' + t('cf.mine') + '</button>'
          + '<button class="cfb btn btn--sm" data-mode="theirs" data-p="'+esc(p)+'">' + t('cf.theirs') + '</button>'
          + '<button class="cfb btn btn--sm both" data-mode="both" data-p="'+esc(p)+'">' + t('cf.both') + '</button>'
          + '</div></div>';
      });
    }
    box.innerHTML = h; paintIcons(box);
    box.querySelectorAll('.cfb').forEach(b =>
      b.addEventListener('click', ()=>{ resolveConflict(b.dataset.p, b.dataset.mode); }));
    return;
  }
  let h = '<div class="stat-row">'
    + '<div class="stat'+(S.length?' hi':'')+'"><div class="v">'+S.length+'</div><div class="k">'+ t('stat.staged') +'</div></div>'
    + '<div class="stat"><div class="v">'+U.length+'</div><div class="k">'+ t('stat.unstaged') +'</div></div>'
    + '<div class="stat"><div class="v">'+tracked+'</div><div class="k">'+ t('stat.tracked') +'</div></div>'
    + '</div>';

  /* Stats bar plus the staged-commit preview. The old .tip boxes are gone: they
     pushed this fixed-height card around, and one referenced a deleted course
     guide. The terminal and AI assistant carry hints now. */
  if(S.length){
    h += '<div class="sec-cap" style="margin-top:10px">'+svgIcon('gitCommit','xs')+' ' + t('ws.willContain') + '<span class="n">'+S.length+'</span></div>';
    h += '<div class="prev-list">';
    S.slice(0,7).forEach(f=>{ h += '<div class="r"><span class="badge '+f.s+'">'+f.s+'</span><span>'+esc(f.p)+'</span></div>'; });
    if(S.length > 7) h += '<div class="r" style="color:var(--muted)">' + t('ws.moreFiles', { n: S.length-7 }) + '</div>';
    h += '</div>';
  }
  box.innerHTML = h; paintIcons(box);
}

const FIT_MIN_SCALE = 0.2;
function doFit(dur){
  if(!net) return;
  const box = $('gnet');
  const w = Math.max(1, box.clientWidth - 26);      /* leave a margin so edge nodes are not clipped */
  const h = Math.max(1, box.clientHeight - 26);
  const pos = net.getPositions(), ids = Object.keys(pos);
  /* Nodes have width/height; a constant allowance suffices to decide the fallback */
  const spanX = ids.length ? Math.max(...ids.map(i => pos[i].x)) - Math.min(...ids.map(i => pos[i].x)) + 90 : 0;
  const spanY = ids.length ? Math.max(...ids.map(i => pos[i].y)) - Math.min(...ids.map(i => pos[i].y)) + 90 : 0;
  const want = ids.length ? Math.min(w / spanX, h / spanY) : 1;
  const anim = dur ? { animation:{ duration:dur } } : { animation:false };

  fitting = true;
  if(want >= FIT_MIN_SCALE){
    net.fit(anim);
  }else{
    /* Fit would shrink to unreadable -> pin to the bound, aimed at HEAD (detached HEAD -> that commit) */
    const anchor = repo.init
      ? (repo.detached ? repo.HEAD : (repo.branches[repo.HEAD] || null))
      : null;
    if(anchor && pos[anchor]) net.focus(anchor, { scale:FIT_MIN_SCALE, animation:anim.animation });
    else net.moveTo({ scale:FIT_MIN_SCALE, animation:anim.animation });
  }
  setTimeout(()=>{ fitting = false; }, (dur || 0) + 150);
}
const refsAt = id => graphRefs().filter(r => r.tip === id).map(r => r.name);
const SHA_FULL = /^[0-9a-f]{40}$/i;
const SHA_SHOW = 7, TITLE_SHOW = 18;
function shortText(s){
  const v = String(s == null ? '' : s);
  if(SHA_FULL.test(v)) return v.slice(0, SHA_SHOW);
  return v.length > TITLE_SHOW ? v.slice(0, TITLE_SHOW) + '…' : v;
}
/* Semantic alias: callers know they pass a SHA */
const shortId = shortText;

/* Built per draw rather than once at load: it carries the surface and the root
   colour, so it has to follow the theme like everything else. */
function rootNodeSVG(T){
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' +
    '<circle cx="12" cy="12" r="9.2" fill="' + T.panel + '" stroke="' + T.mod + '" stroke-width="2.6"/>' +
    '<circle cx="12" cy="12" r="2.9" fill="' + T.mod + '"/></svg>');
}
function graphCommits(){
  const reach = new Set();
  Object.keys(repo.branches).forEach(b => { const t = tipOf(b); if(t) ancestors(t).forEach(id => reach.add(id)); });
  return repo.commits.filter(c => reach.has(c.id));
}
function graphRefs(){
  const T = tok(), refs = [];
  Object.keys(repo.branches).forEach(b=>{ const t = tipOf(b); if(!t) return;
    refs.push({ name:b, tip:t, color:(b===repo.HEAD?T.accent:branchColor(b)), head:b===repo.HEAD }); });
  return refs;
}
function graphCommitById(id){ return repo.byId[id] || null; }
function graphData(){
  const T = tok();
  const nodes = [], edges = [];
  const headTip = tipOf(repo.HEAD);
  const commits = graphCommits();
  const ids = new Set(commits.map(c => c.id));   /* only reachable commits get nodes; no dangling edges */
  commits.forEach(c=>{
    const isHead = c.id === headTip;
    const isRoot = !(c.parents || []).length;      /* no parents = root commit (first node) */
    const ring = isRoot ? T.mod : (c.isMerge ? T.ok : (c.color || branchColor(c.branch || 'main')));
    nodes.push({
      id:c.id, kind:'commit',
      label:'<b>'+shortId(c.id)+'</b>\n'+shortText(c.msg),
      title:c.id,                        /* full SHA still reachable; display uses the first 7 */
      shape: isRoot ? 'image' : 'dot',
      image: isRoot ? rootNodeSVG(T) : undefined,
      /* image shape scales with size*2 (viewBox 24x24, ring outer r 9.2): size 12
         gives outer r ~10px, matching a normal dot node (r=10). */
      size: isRoot ? 12 : (c.isMerge ? 13 : 10),
      borderWidth:isHead ? 4 : (c.isMerge ? 3.5 : 2.5),
      color:{ background:T.panel,
              border:ring,
              /* hover only changes fill; ring color keeps the type readable */
              highlight:{ background:T.panel2, border:ring },
              hover:{ background:T.panel2, border:ring } },
      shadow:isHead ? { enabled:true, color:T.accentGlow, size:12, x:0, y:0 } : { enabled:false }
    });
    (c.parents || []).forEach((p,i)=>{
      if(!ids.has(p)) return;   /* parent unreachable (happens mid-rebase) -> no dangling edge */
      /* One connector colour for both kinds of parent. The dashes already say
         "this is a second parent" - two greys said the same thing twice, and
         only one of them was a token. */
      edges.push({ from:p, to:c.id, dashes:i > 0,
        color:{ color:T.line2, highlight:T.muted, hover:T.muted },
        width:i > 0 ? 1.8 : 2.2 });
    });
  });
  graphRefs().forEach(r=>{
    nodes.push({
      id:'ref:'+r.name, kind:'ref',
      /* detached HEAD: the name is already HEAD, so no "HEAD -> HEAD" prefix */
      label:(r.head && r.name !== 'HEAD' ? 'HEAD → ' : '') + r.name,
      shape:'box', borderWidth:0, margin:{ top:5, bottom:5, left:9, right:9 },
      color:{ background:r.color, border:'transparent',
              highlight:{ background:r.color, border:'transparent' },
              hover:{ background:r.color, border:'transparent' } },
      font:{ multi:false, face:MONO_FACE, size:11, color:T.accentInk, bold:{ color:T.accentInk } },
      shadow:{ enabled:true, color:'rgba(16,24,40,.16)', size:6, x:0, y:2 }
    });
    edges.push({ from:r.tip, to:'ref:'+r.name, dashes:[4,3], width:2.2,
      color:{ color:r.color, highlight:r.color, hover:r.color, opacity:0.85 } });
  });
  return { nodes:nodes, edges:edges };
}
function graphFontOptions(){
  const T = tok();
  return { multi:'html', face:MONO_FACE, size:11, color:T.ink3, vadjust:1,
           bold:{ face:MONO_FACE, size:12, color:T.ink, mod:'bold' } };
}
function visOptions(){
  return {
    autoResize:true,
    layout:{ improvedLayout:true, hierarchical:{
      enabled:true, direction:gDir, sortMethod:'directed', shakeTowards:'roots',
      levelSeparation:gDir === 'LR' ? 132 : 96,
      nodeSpacing:gDir === 'LR' ? 78 : 132,
      treeSpacing:110, blockShifting:true, edgeMinimization:true, parentCentralization:true } },
    physics:{ enabled:false },
    interaction:{ hover:true, hoverConnectedEdges:false, dragNodes:false,
                  dragView:true, zoomView:true, selectConnectedEdges:false, tooltipDelay:1e6 },
    nodes:{ font:graphFontOptions(), chosen:false },
    edges:{ arrows:{ to:{ enabled:false } }, selectionWidth:0,
            smooth:{ enabled:true, type:'cubicBezier',
                     forceDirection:gDir === 'LR' ? 'horizontal' : 'vertical', roundness:0.55 } }
  };
}
function renderGraph(){
  const engine = HAS_VIS ? 'vis-network' : VGE.i18n.t('graph.engineSvg');
  const dirLabel = gDir === 'LR' ? VGE.i18n.t('graph.lr') : VGE.i18n.t('graph.ud');
  $('gEngine').innerHTML = svgIcon('info','xs') + ' ' + engine + ' · ' + dirLabel;
  paintIcons($('gEngine'));

  /* Top badge: live per mode/commit (was previously static) */
  $('graphMeta').textContent = repo.init
    ? VGE.i18n.t('graph.meta', { br: repo.HEAD, n: repo.commits.length, b: Object.keys(repo.branches).length })
    : VGE.i18n.t('graph.metaEmpty');

  if(!repo.commits.length){
    if(net){ net.destroy(); net = null; }
    $('gnet').innerHTML = '<div style="position:absolute;inset:0;display:flex;flex-direction:column;'
      + 'align-items:center;justify-content:center;gap:7px;color:var(--muted);font-size:var(--fs-md);text-align:center;padding:0 24px">'
      + svgIcon('gitCommit','lg') + '<div>' + (repo.init ? VGE.i18n.t('graph.emptyInit') : VGE.i18n.t('graph.emptyNoRepo')) + '</div></div>';
    paintIcons($('gnet'));
    $('gsvg').style.display = 'none';
    return;
  }
  if(!HAS_VIS || !visOK){
    /* Destroy the vis instance before falling back to SVG: otherwise net stays
       non-null while the container is cleared, leaving an orphan instance that
       keeps animating and can never return to vis. */
    if(net){ try{ net.destroy(); }catch(_){ } net = null; lastSig = ''; }
    renderGraphSVG(); return;
  }

  /* Wrap vis init/update in try-catch: any error falls back to SVG so renderAll
     never stops (otherwise the terminal/right rail/AI would not update). */
  try{
    const data = graphData();
    const sig = JSON.stringify([data.nodes.map(n=>n.id+n.label+n.borderWidth), data.edges.map(e=>e.from+'>'+e.to), gDir]);
    if(!net){
      $('gnet').innerHTML = '';
      nodesDS = new vis.DataSet(data.nodes); edgesDS = new vis.DataSet(data.edges);
      net = new vis.Network($('gnet'), { nodes:nodesDS, edges:edgesDS }, visOptions());
      net.on('hoverNode', e => showNodeTip(e.node));
      net.on('blurNode', scheduleHideNodeTip);   /* grace period: let the pointer move into the tooltip */
      net.on('dragStart', hideNodeTip);
      net.on('zoom', ()=>{ if(!fitting) hideNodeTip(); });
      net.on('click', e => { hideNodeTip(); if(e.nodes.length) explainNode(e.nodes[0]); });
      net.once('afterDrawing', ()=> doFit(0));
    }else{
      nodesDS.clear(); edgesDS.clear();
      nodesDS.add(data.nodes); edgesDS.add(data.edges);
      /* The label colour is an option, not node data, and vis keeps the object
         it was constructed with - so a theme change has to be pushed here or the
         labels stay in the old theme's ink. */
      net.setOptions({ nodes:{ font:graphFontOptions() } });
    }
    if(sig !== lastSig){ lastSig = sig; setTimeout(()=> doFit(280), 30); }
    $('gsvg').style.display = 'none';
  }catch(e){
    console.warn('[Git Playground] vis-network failed to initialise; falling back to SVG:', e);
    visOK = false; lastSig = '';
    if(net){ try{ net.destroy(); }catch(_){ } net = null; }
    renderGraphSVG();
  }
}

function tipContent(c){
  const stat = {};
  (c.changes || []).forEach(ch => stat[ch.p] = { states:[{ s:ch.s, staged:false }], s:ch.s, staged:false });
  const refs = refsAt(c.id);
  const T = tok();
  /* Same rule as the node ring, so the pill in the tooltip names the commit in
     the colour the commit is already drawn in. */
  const badge = c.isMerge ? T.ok : (c.id === tipOf(repo.HEAD) ? T.accent : (c.color || branchColor(c.branch || 'main')));
  const n = { A:0, M:0, D:0 }; (c.changes || []).forEach(ch => n[ch.s]++);
  const head = '<div class="gtip-h">' + svgIcon(c.isMerge ? 'gitMerge' : 'gitCommit','sm')
    + '<span class="hh" title="' + esc(c.id) + '">' + esc(shortId(c.id)) + '</span>'
    + '<span class="bb" style="background:' + badge + '">' + esc(c.branch) + (c.isMerge ? ' · merge' : '') + '</span></div>'
    + '<div class="gtip-m">' + esc(c.msg) + (refs.length ? '<br><span style="color:var(--muted);font-size:var(--fs-sm)">refs: ' + esc(refs.join(', ')) + '</span>' : '') + '</div>'
    + '<div class="gtip-s">'
    + (n.A ? '<span style="color:var(--ok)">+' + n.A + '</span>' : '')
    + (n.M ? '<span style="color:var(--mod)">~' + n.M + '</span>' : '')
    + (n.D ? '<span style="color:var(--del)">-' + n.D + '</span>' : '') + '</div>';

  /* Every commit in the sandbox carries a full snapshot, so content is always
     present. (The lazy-load-from-backend branch was removed with local-repo mode.) */
  if(!c.snapshot) return head;

  const paths = new Set(c.snapshot);
  (c.changes || []).forEach(ch => { if(ch.s === 'D') paths.add(ch.p); });
  return head
    + '<div class="gtip-s" style="margin-top:-2px"><span>' + svgIcon('folderTree','xs')
    + esc(VGE.i18n.t('graph.snapCount', { n:String(c.snapshot.length) })) + '</span></div>'
    + '<div class="gtip-t"><div class="tree">' + treeHTML(buildTree(Array.from(paths).sort()), stat, false, -1) + '</div></div>'
    + '<div class="gtip-f">' + svgIcon('info','xs') + ' ' + VGE.i18n.t('real.snapFoot') + '</div>';
}
function placeTip(x, y){
  const tip = $('gtip'), W = window.innerWidth, H = window.innerHeight;
  tip.style.visibility = 'hidden'; tip.classList.add('on');
  const tw = tip.offsetWidth, th = tip.offsetHeight;
  let left = x + 24, top = y - th / 2;
  if(left + tw > W - 10) left = x - tw - 24;
  if(left < 10) left = 10;
  top = Math.min(Math.max(10, top), Math.max(10, H - th - 10));
  tip.style.left = Math.round(left) + 'px';
  tip.style.top = Math.round(top) + 'px';
  tip.style.visibility = '';
}
/* force=true refreshes in place after lazy-load backfill: tipFor already equals
   id, so without this flag the dedupe check below would block the update. */
function showNodeTip(id, pt, force){
  cancelHideNodeTip();      /* cancel the previous node's pending close, which would kill this tooltip */
  if(String(id).indexOf('ref:') === 0) return hideNodeTip();
  const c = graphCommitById(id); if(!c) return;
  const tip = $('gtip');
  if(force || tipFor !== id){
    tip.innerHTML = tipContent(c); paintIcons(tip); tipFor = id;
  }
  let p = pt;
  if(!p && net){
    const r = $('graphWrap').getBoundingClientRect();
    const d = net.canvasToDOM(net.getPositions([id])[id]);
    p = { x:d.x + r.left, y:d.y + r.top };
  }
  if(!p) return;
  placeTip(p.x, p.y);
}
/* Grace period for closing the hover tooltip. Its file tree is a scroll container,
   and blurNode / mouseleave fire instantly - without the grace the pointer can
   never reach it. 260ms covers the gap. */
const TIP_GRACE_MS = 260;
let tipCloseTimer = null;
function cancelHideNodeTip(){
  if(tipCloseTimer){ clearTimeout(tipCloseTimer); tipCloseTimer = null; }
}
function scheduleHideNodeTip(){
  cancelHideNodeTip();
  tipCloseTimer = setTimeout(hideNodeTip, TIP_GRACE_MS);
}
function hideNodeTip(){ cancelHideNodeTip(); $('gtip').classList.remove('on'); tipFor = null; }

function initNodeTip(){
  const tip = $('gtip');
  if(!tip || tip.dataset.tipBound === '1') return;
  tip.dataset.tipBound = '1';
  tip.addEventListener('mouseenter', cancelHideNodeTip);
  tip.addEventListener('mouseleave', scheduleHideNodeTip);
}

function renderGraphSVG(){
  const T = tok();
  const svg = $('gsvg'), NS = 'http://www.w3.org/2000/svg';
  $('gnet').innerHTML = ''; svg.style.display = 'block'; svg.innerHTML = '';
  const cs = graphCommits(), lanes = {}, laneOf = b => (b in lanes ? lanes[b] : (lanes[b] = Object.keys(lanes).length));
  cs.forEach(c => laneOf(c.branch));
  const horiz = gDir === 'LR';
  const X = i => horiz ? 62 + i * 128 : 66 + laneOf(cs[i].branch) * 128;
  const Y = i => horiz ? 52 + laneOf(cs[i].branch) * 84 : 46 + i * 74;
  const idx = {}; cs.forEach((c,i) => idx[c.id] = i);
  const mk = (t, a) => { const e = document.createElementNS(NS, t); for(const k in a) e.setAttribute(k, a[k]); return e; };

  cs.forEach((c,i)=>{
    (c.parents || []).forEach((p,k)=>{
      if(!(p in idx)) return;
      const x1 = X(idx[p]), y1 = Y(idx[p]), x2 = X(i), y2 = Y(i), mx = (x1 + x2) / 2;
      svg.appendChild(mk('path', { d:horiz ? 'M'+x1+' '+y1+' C '+mx+' '+y1+', '+mx+' '+y2+', '+x2+' '+y2
                                            : 'M'+x1+' '+y1+' C '+x1+' '+((y1+y2)/2)+', '+x2+' '+((y1+y2)/2)+', '+x2+' '+y2,
        stroke:T.line2, 'stroke-width':k > 0 ? 1.8 : 2.2,
        'stroke-dasharray':k > 0 ? '4 4' : '', fill:'none' }));
    });
  });
  cs.forEach((c,i)=>{
    const x = X(i), y = Y(i), isHead = c.id === tipOf(repo.HEAD);
    const isRoot = !(c.parents || []).length;
    const ring = isRoot ? T.mod : (c.isMerge ? T.ok : (c.color || branchColor(c.branch || 'main')));
    const g = mk('g', { style:'cursor:pointer' });
    if(isHead) g.appendChild(mk('circle', { cx:x, cy:y, r:c.isMerge ? 18 : 15, fill:T.accentHalo }));
    /* Same rules as the vis path: hollow white, ring color/width by type -
       normal thin, merge thick green, root amber + center dot; HEAD thickens. */
    g.appendChild(mk('circle', { cx:x, cy:y, r:c.isMerge ? 12 : 9.5,
      fill:T.panel,
      stroke:ring,
      'stroke-width':isHead ? 4 : (c.isMerge ? 3.5 : 2.5) }));
    if(isRoot) g.appendChild(mk('circle', { cx:x, cy:y, r:c.isMerge ? 3.4 : 2.9, fill:T.mod }));
    const t1 = mk('text', { x:x, y:y + 26, 'text-anchor':'middle', 'font-size':11.5, 'font-weight':700,
      'font-family':'Consolas, Menlo, monospace', fill:T.ink }); t1.textContent = shortId(c.id);
    const t2 = mk('text', { x:x, y:y + 39, 'text-anchor':'middle', 'font-size':10.5,
      'font-family':'Consolas, Menlo, monospace', fill:T.muted });
    t2.textContent = shortText(c.msg);
    g.appendChild(t1); g.appendChild(t2);
    g.addEventListener('mousemove', ev => showNodeTip(c.id, { x:ev.clientX, y:ev.clientY }));
    g.addEventListener('mouseleave', scheduleHideNodeTip);
    g.addEventListener('click', ()=>{ hideNodeTip(); explainNode(c.id); });
    svg.appendChild(g);
    graphRefs().filter(r => r.tip === c.id).forEach((r,k)=>{
      const lbl = (r.head ? 'HEAD → ' : '') + r.name, w = lbl.length * 6.6 + 14;
      const bx = x - w / 2, by = y - 40 - k * 22;
      svg.appendChild(mk('rect', { x:bx, y:by, width:w, height:18, rx:5, fill:r.color }));
      const tb = mk('text', { x:x, y:by + 12.5, 'text-anchor':'middle', 'font-size':10.5, fill:T.accentInk,
        'font-family':'Consolas, Menlo, monospace' }); tb.textContent = lbl;
      svg.appendChild(tb);
      svg.appendChild(mk('line', { x1:x, y1:by + 18, x2:x, y2:y - (c.isMerge ? 12 : 10),
        stroke:r.color, 'stroke-width':1.6, 'stroke-dasharray':'3 3' }));
    });
  });
  const w = Math.max(...cs.map((c,i) => X(i))) + 90, h = Math.max(...cs.map((c,i) => Y(i))) + 70;
  svg.setAttribute('viewBox', '0 0 ' + Math.max(w, 320) + ' ' + Math.max(h, 190));
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
}

function promptHTML(br, initd){
  return '<span class="pth">visual-git</span>'
       + (initd && br ? ' <span class="br">(' + esc(br) + ')</span>' : '')
       + ' <span class="sig">$</span>';
}
function renderTerminal(){
  const box = $('termOut');
  if(!repo.log.length){
    box.innerHTML = '<div class="term-empty">' + svgIcon('terminal','lg')
      + '<div>' + VGE.i18n.t('term.ready') + '</div></div>';
    paintIcons(box); return;
  }
  const rewound = cursor < repo.log.length - 1;
  box.innerHTML = '';
  repo.log.forEach((e,i)=>{
    const line = document.createElement('div');
    line.className = 'tline' + (i > cursor ? ' past' : '') + (rewound && i === cursor ? ' active' : '');
    let h = '<div class="tcmd"><span class="tprompt">' + promptHTML(e.br, e.initd) + '</span>'
          + '<span class="cmdtext" title="' + VGE.i18n.t('term.hoverCmd') + '">' + esc(e.raw) + '</span>'
          + '<button class="trewind" data-rw="' + i + '">' + svgIcon('cornerUpLeft','xs')
          + (i > cursor ? ' ' + VGE.i18n.t('term.replay') : ' ' + VGE.i18n.t('term.rewind')) + '</button>'
          + '</div>';
    (e.out || []).forEach(o=>{
      if(o.c === 'note') h += '<div class="tout note">' + svgIcon('info','xs') + '<span>' + esc(o.t) + '</span></div>';
      else h += '<div class="tout ' + (o.c || '') + '">' + esc(o.t) + '</div>';
    });
    line.innerHTML = h;
    box.appendChild(line);
  });
  if(rewound){
    const n = document.createElement('div');
    n.className = 'term-note';
    n.innerHTML = svgIcon('cornerUpLeft','xs') + '<span>' + VGE.i18n.t('term.rewound', { n: cursor + 1 }) + ' ' + VGE.i18n.t('term.rewoundTail') + '</span>';
    box.appendChild(n);
  }
  paintIcons(box);
  box.querySelectorAll('.trewind').forEach(b=>{
    b.addEventListener('click', ev=>{
      ev.stopPropagation();
      rewindTo(+b.dataset.rw);
    });
  });
  box.querySelectorAll('.cmdtext').forEach((t,i)=>{
    t.addEventListener('click', ()=>{ $('cmdInput').value = repo.log[i].raw; $('cmdInput').focus(); });
  });
  if(!rewound) box.scrollTop = box.scrollHeight;
  else{
    const el = box.children[cursor];
    if(el) box.scrollTop = Math.max(0, el.offsetTop - box.clientHeight / 2);
  }
}

function renderAiChrome(){
  const T = VGE.i18n.t.bind(VGE.i18n);
  const btn = $('aiSend'), st = $('aiStatus'), cog = $('aiCfgBtn');
  const busy = !!(VGE.ai && VGE.ai.busy && VGE.ai.busy());
  const c = (VGE.ai && VGE.ai.config) ? VGE.ai.config() : null;
  const ready = !!(VGE.ai && VGE.ai.isReady && VGE.ai.isReady());

  if(btn){
    btn.classList.toggle('stop', busy);
    btn.innerHTML = svgIcon(busy ? 'x' : 'send', 'sm')
      + ' <span>' + T(busy ? 'btn.stop' : 'btn.send') + '</span>';
  }
  if(st){
    st.classList.toggle('on', ready);
    st.innerHTML = '<span class="dot"></span><span>' + esc(ready ? T('ai.statusOn', { model:c.model }) : T('ai.statusOff')) + '</span>';
    st.title = ready ? T('ai.statusOnTip', { model:c.model, endpoint:c.endpoint }) : T('ai.statusOffTip');
  }
  if(cog) cog.classList.toggle('ready', ready);
}

/* Refresh all: mode chrome first (title/repo name/icons/mode tag), then each panel, isolating exceptions */
function renderAll(){
  const safe = f => { try{ f(); }catch(e){ console.warn('[Git Playground] render:', e); } };
  safe(renderTitle);   /* document.title refreshes with language */
  safe(renderTree); safe(renderWorkspace); safe(renderGraph);
  safe(renderTerminal);
  safe(renderSugs);   /* AI suggestion chips refresh with language */
  safe(renderAiChrome);   /* AI config badge + send/stop button */
  safe(updatePrompt); safe(updateSuggestion);
  /* Repaint [data-ic] after the full redraw so no static icon stays blank */
  paintIcons(document);
  /* Panel content changed -> card height may change -> move dividers (no-op if absent) */
  safe(() => { if(VGE.layout) VGE.layout.refresh(); });
  safe(() => { if(VGE.tour) VGE.tour.sync(); });
}

/* Exports */
VGE.render = {
  renderAll: renderAll, renderTree: renderTree, renderWorkspace: renderWorkspace,
  renderGraph: renderGraph, renderTerminal: renderTerminal,
  renderAiChrome: renderAiChrome,
  graphRefs: graphRefs, graphCommitById: graphCommitById,
  showNodeTip: showNodeTip, hideNodeTip: hideNodeTip, placeTip: placeTip,
  initNodeTip: initNodeTip,
  fitMinScale: FIT_MIN_SCALE
};

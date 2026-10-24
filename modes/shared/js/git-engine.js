'use strict';
window.VGE = window.VGE || {};

var repo = null;            /* current local repository */
var cursor = -1;            /* terminal history pointer */

var SEED = 0, BC = {};
const BR_MAIN = '#7c3aed';
const BR_PALETTE = ['#2563eb','#0891b2','#c2410c','#4d7c0f','#be185d'];


function resetHash(){ SEED = 0x2f6f1a3; }
function nextHash(){ SEED = (SEED*1664525 + 1013904223)>>>0; return SEED.toString(16).padStart(8,'0').slice(0,7); }
function branchColor(n){
  if(n === 'main'){ BC.main = BR_MAIN; return BR_MAIN; }
  if(!(n in BC)){
    /* Count only non-main branches: main does not consume a palette slot */
    const used = Object.keys(BC).filter(k => k !== 'main').length;
    BC[n] = BR_PALETTE[used % BR_PALETTE.length];
  }
  return BC[n];
}
function primeColors(){ BC = {}; branchColor('main'); branchColor('feature'); }

function blankRepo(){
  return { init:false, commits:[], byId:{}, branches:{}, HEAD:'main',
           work:[], csIndex:0, log:[], merging:null, rebase:null };
}
function tipOf(b){ return repo.branches[b] || null; }
function headCommit(){ const id = tipOf(repo.HEAD); return id ? repo.byId[id] : null; }
function headSnapshot(){ const c = headCommit(); return c ? c.snapshot : []; }
function applyChanges(base, changes){
  const set = new Set(base);
  changes.forEach(c => c.s === 'D' ? set.delete(c.p) : set.add(c.p));
  return Array.from(set).sort();
}
/* Full file-content table for a commit, from parent content + this change */
function buildContent(parentContent, changes){
  const c = Object.assign({}, parentContent || {});
  changes.forEach(ch => { if(ch.s === 'D') delete c[ch.p]; else c[ch.p] = ch.content || ''; });
  return c;
}
function loadChangeset(){
  const cs = VGE.CHANGESETS[repo.csIndex % VGE.CHANGESETS.length];
  repo.csIndex++;
  const present = new Set(headSnapshot());
  repo.work = cs.changes
    .filter(c => c.s === 'A' ? !present.has(c.p) : present.has(c.p))
    .map(c => ({ p:c.p, s:c.s, content:c.content, staged:false }));
  if(!repo.work.length && repo.csIndex < VGE.CHANGESETS.length * 2) loadChangeset();
}
const staged   = () => repo.work.filter(w => w.staged);
const unstaged = () => repo.work.filter(w => !w.staged);
/* Ancestor set: used to detect fast-forward */
function ancestors(id, acc, store){
  acc = acc || new Set(); store = store || repo.byId;
  if(!id || acc.has(id) || !store[id]) return acc;
  acc.add(id);
  (store[id].parents || []).forEach(p => ancestors(p, acc, store));
  return acc;
}

const contentOf = c => (c && c.content) ? c.content : {};
/* Simple line-level diff (line-by-line, enough to show what changed) */
function diffLines(a, b){
  const A = (a || '').split('\n'), B = (b || '').split('\n'), res = [];
  const setB = new Set(B), setA = new Set(A);
  A.forEach(l => { if(!setB.has(l)) res.push({ t:'-', l }); });
  B.forEach(l => { if(!setA.has(l)) res.push({ t:'+', l }); });
  return res.length ? res : [{ t:' ', l:'' }];
}
function merge3(base, mine, theirs){
  base = base || {}; mine = mine || {}; theirs = theirs || {};
  const keys = new Set([].concat(Object.keys(base), Object.keys(mine), Object.keys(theirs)));
  const content = {}, conflicts = [];
  keys.forEach(p=>{
    const b = (p in base) ? base[p] : undefined;
    const m = (p in mine) ? mine[p] : undefined;
    const t = (p in theirs) ? theirs[p] : undefined;
    /* undefined always means "file does not exist": both missing = agree, skip content */
    if(m === t){ if(m !== undefined) content[p] = m; }
    else if(m === b){ if(t !== undefined) content[p] = t; }   /* I did not touch it -> take theirs */
    else if(t === b){ if(m !== undefined) content[p] = m; }   /* they did not touch it -> take mine */
    else { content[p] = '<<<<<<< HEAD\n'+(m||'')+'=======\n'+(t||'')+'>>>>>>> incoming'; conflicts.push(p); }
  });
  return { content, conflicts };
}
/* Nearest common ancestor (along the local commit graph) */
function mergeBase(a, b){
  const A = ancestors(a);
  let cur = b;
  while(cur && !A.has(cur)) cur = (repo.byId[cur].parents || [])[0];
  return cur;
}
/* Merge another line into the current branch. Conflict -> merging state, else a merge commit */
function doMerge(out, otherTipId, otherLabel){
  const cur = tipOf(repo.HEAD);
  if(!cur || !otherTipId || cur === otherTipId){ out.push(L('Already up to date.')); return { ok:true, out, clean:true }; }
  const baseId = mergeBase(cur, otherTipId);
  const base = contentOf(baseId ? repo.byId[baseId] : null);
  const mine = contentOf(repo.byId[cur]);
  const theirs = contentOf(repo.byId[otherTipId]);
  const m3 = merge3(base, mine, theirs);
  if(m3.conflicts.length){
    repo.merging = { other:otherLabel, branch:repo.HEAD, mine:cur, theirs:otherTipId, base:baseId,
      open:m3.conflicts.slice(), resolved:{}, fullContent:m3.content,
      staged:false, changes:(repo.byId[otherTipId].changes || []) };
    m3.conflicts.forEach(p => out.push(L('CONFLICT (content): Merge conflict in '+p,'red')));
    out.push(L('Automatic merge failed; fix conflicts and then commit the result.','err'));
    out.push(L('  (right side of the panel: pick keep-mine / keep-theirs / both per file)','dim'));
    /* Moved from the deleted backend error table (api.err.*) into a normal entry */
    out.push(NOTE(T('git.merge.bothChanged', { files:m3.conflicts.join(', ') })));
    return { ok:false, out, clean:false };
  }
  const id = nextHash(); const content = m3.content; const snap = Object.keys(content).sort();
  repo.commits.push({ id:id, msg:'Merge branch \''+otherLabel+'\' into '+repo.HEAD, branch:repo.HEAD,
    parents:[cur, otherTipId], isMerge:true, snapshot:snap, content:content,
    changes:(repo.byId[otherTipId].changes || []), color:'#16a34a' });
  repo.byId[id] = repo.commits[repo.commits.length-1]; repo.branches[repo.HEAD] = id;
  out.push(L("Merge made by the 'ort' strategy."));
  out.push(L(' '+snap.length+' file(s) changed.','dim'));
  return { ok:true, out, clean:true };
}
/* In-progress "pending operation": merge and rebase produce the same conflict
   shape. The conflict panel, git add's "mark resolved", and git status all use
   this one shape, so rebase needs no parallel state or UI. */
function pending(){ return repo.merging || repo.rebase || null; }
/* Conflict panel button: choose a resolution for one file and drop it from "open" */
function resolveConflict(path, mode){
  const P = pending(); if(!P) return;
  const mine = contentOf(repo.byId[P.mine])[path] || '';
  const theirs = contentOf(repo.byId[P.theirs])[path] || '';
  const pick = mode === 'mine' ? mine : mode === 'theirs' ? theirs : (mine + theirs);
  P.fullContent[path] = pick;
  P.resolved[path] = pick;
  P.open = P.open.filter(p => p !== path);
  renderAll();
}
/* Once all conflicts are resolved, git add marks "ready to conclude" */
function stageMerge(out){
  const P = pending();
  if(P.open.length){
    out.push(L('U (unmerged)  ' + P.open[0],'red'));
    out.push(L('Unmerged paths: '+P.open.length,'err'));
    out.push(NOTE(T('git.commit.nofiles', { n:P.open.length })));
    return { ok:false };
  }
  P.staged = true;
  /* Which command concludes: git commit for merge, git rebase --continue for rebase */
  if(repo.rebase){
    out.push(L('All conflicts fixed but you are still rebasing.','gr'));
    out.push(L('  (use "git rebase --continue" to go on)','dim'));
  } else {
    out.push(L('All conflicts fixed but you are still merging.','gr'));
    out.push(L('  (use "git commit" to conclude the merge)','dim'));
  }
  return { ok:true };
}


function replayNext(out){
  const P = repo.rebase;
  if(!P.todo.length) return true;
  const srcId = P.todo[0], src = repo.byId[srcId];
  const parentId = tipOf(repo.HEAD);                  /* the new HEAD being built */
  const origParent = (src.parents || [])[0] || null;  /* this commit's original parent */
  /* 3-way merge: original parent as base, new HEAD as ours, replayed commit as theirs */
  const m3 = merge3(contentOf(origParent ? repo.byId[origParent] : null),
                    contentOf(repo.byId[parentId]), contentOf(src));
  if(m3.conflicts.length){
    P.mine = parentId; P.theirs = srcId; P.base = origParent;
    P.other = P.ontoLabel;                            /* used for the conflict panel title */
    P.open = m3.conflicts.slice(); P.resolved = {}; P.fullContent = m3.content;
    P.staged = false; P.changes = src.changes || [];
    m3.conflicts.forEach(p => out.push(L('CONFLICT (content): Merge conflict in '+p,'red')));
    out.push(L('error: could not apply '+srcId.slice(0,7)+'... '+src.msg,'err'));
    out.push(L('hint: fix conflicts, mark them with "git add", then run "git rebase --continue"','dim'));
    out.push(NOTE(T('git.rebase.conflict', { commit:srcId.slice(0,7), onto:P.ontoLabel })));
    return false;
  }
  /* no conflict: make the replay commit - new parent, new ID, original message */
  const id = nextHash(), content = m3.content;
  const c = { id:id, msg:src.msg, branch:repo.HEAD, parents:[parentId], isMerge:false,
              snapshot:Object.keys(content).sort(), content:content,
              changes:src.changes || [], color:branchColor(repo.HEAD) };
  repo.commits.push(c); repo.byId[id] = c; repo.branches[repo.HEAD] = id;
  P.todo.shift(); P.done.push(id);
  out.push(L('Applying: '+src.msg,'dim'));
  out.push(L('  '+srcId.slice(0,7)+' → '+id+'  (new commit id)','dim'));
  return replayNext(out);
}

/* Replay done: clear state, report success */
function finishRebase(out){
  const P = repo.rebase; repo.rebase = null;
  out.push(L('Successfully rebased and updated refs/heads/'+P.branch+'.','gr'));
  out.push(NOTE(T('git.rebase.done', { branch:P.branch, onto:P.ontoLabel, n:P.done.length })));
  return { ok:true, out:out };
}

/* Start a rebase: compute which commits to replay, then replay them */
function doRebase(out, ontoId, ontoLabel){
  const cur = tipOf(repo.HEAD);
  if(!cur || !ontoId){ out.push(L('fatal: ' + T('git.rebase.nocommit'),'err')); return { ok:false, out:out }; }
  if(ancestors(cur).has(ontoId)){                 /* target already on my line -> nothing to do */
    out.push(L('Current branch '+repo.HEAD+' is up to date.'));
    out.push(NOTE(T('git.rebase.uptodate', { branch:repo.HEAD, onto:ontoLabel })));
    return { ok:true, out:out };
  }
  if(ancestors(ontoId).has(cur)){                 /* I am behind the target -> fast-forward, nothing to replay */
    repo.branches[repo.HEAD] = ontoId;
    out.push(L('Successfully rebased and updated refs/heads/'+repo.HEAD+'.','gr'));
    out.push(NOTE(T('git.rebase.ff', { branch:repo.HEAD, onto:ontoLabel })));
    return { ok:true, out:out };
  }
  /* Collect "target..HEAD": walk first-parent, oldest first */
  const baseId = mergeBase(cur, ontoId), todo = [];
  let x = cur;
  while(x && x !== baseId){ todo.unshift(x); x = (repo.byId[x].parents || [])[0]; }
  repo.rebase = { onto:ontoId, ontoLabel:ontoLabel, branch:repo.HEAD, original:cur, base:baseId,
                  todo:todo, done:[], open:[], resolved:{}, fullContent:{}, staged:false };
  repo.branches[repo.HEAD] = ontoId;              /* HEAD lands on the target tip first */
  out.push(L('First, rewinding head to replay your work on top of it...','dim'));
  out.push(NOTE(T('git.rebase.replaying', { branch:repo.HEAD, onto:ontoLabel, n:todo.length })));
  if(!replayNext(out)) return { ok:false, out:out };
  return finishRebase(out);
}

/* git rebase --continue: conclude the current (conflict-resolved) commit, then keep replaying */
function rebaseContinue(out){
  const P = repo.rebase;
  if(P.open.length){
    out.push(L('You must edit all merge conflicts and then mark them as resolved using git add','err'));
    out.push(NOTE(T('git.commit.nofiles', { n:P.open.length })));
    return { ok:false, out:out };
  }
  if(!P.staged){
    out.push(L('No changes - did you forget to use "git add"?','err'));
    out.push(L('Otherwise, please use "git rebase --skip" to skip this patch.','dim'));
    return { ok:false, out:out };
  }
  const src = repo.byId[P.theirs], content = P.fullContent, id = nextHash();
  const c = { id:id, msg:src.msg, branch:repo.HEAD, parents:[P.mine], isMerge:false,
              snapshot:Object.keys(content).sort(), content:content,
              changes:src.changes || [], color:branchColor(repo.HEAD) };
  repo.commits.push(c); repo.byId[id] = c; repo.branches[repo.HEAD] = id;
  P.todo.shift(); P.done.push(id);
  out.push(L('  '+P.theirs.slice(0,7)+' → '+id+'  '+src.msg,'dim'));
  /* Clear this round's conflict fields, continue with the next */
  P.open = []; P.resolved = {}; P.fullContent = {}; P.staged = false; P.changes = [];
  if(!replayNext(out)) return { ok:false, out:out };
  return finishRebase(out);
}

/* git rebase --skip: drop the current commit, keep replaying the rest */
function rebaseSkip(out){
  const P = repo.rebase;
  out.push(L('Dropped '+P.theirs.slice(0,7)+'... '+repo.byId[P.theirs].msg,'dim'));
  P.todo.shift();
  P.open = []; P.resolved = {}; P.fullContent = {}; P.staged = false; P.changes = [];
  if(!replayNext(out)) return { ok:false, out:out };
  return finishRebase(out);
}

/* git rebase --abort: return to the pre-rebase position and drop the replayed commits */
function rebaseAbort(out){
  const P = repo.rebase;
  repo.branches[P.branch] = P.original;
  /* replayed commits are now unreachable - remove them so no dangling nodes remain */
  P.done.forEach(id => {
    const i = repo.commits.findIndex(c => c.id === id);
    if(i >= 0) repo.commits.splice(i, 1);
    delete repo.byId[id];
  });
  repo.rebase = null;
  out.push(L('Rebase aborted; '+P.branch+' restored to '+P.original.slice(0,7)+'.','gr'));
  out.push(NOTE(T('git.rebase.aborted', { branch:P.branch, id:P.original })));
  return { ok:true, out:out };
}

const L  = (t, c) => ({ t:t, c:c||'' });
const NOTE = t => ({ t:t, c:'note' });
const T  = function(){ return VGE.i18n.t.apply(VGE.i18n, arguments); };
function needRepo(out){
  if(repo.init) return false;
  out.push(L('fatal: not a git repository (or any of the parent directories): .git','err'));
  return true;
}
function fileStatWord(s){ return s === 'A' ? 'new file:  ' : s === 'M' ? 'modified:  ' : 'deleted:   '; }

function interpret(raw){
  const text = String(raw || '').trim();
  const out = [];
  if(!text) return { ok:false, out:[] };
  const parts = text.split(/\s+/);
  const isGit = parts[0] === 'git';
  const cmd = isGit ? (parts[1] || '') : parts[0];
  const argv = isGit ? parts.slice(2) : parts.slice(1);
  const flags = argv.filter(a => a.startsWith('-'));
  const rest  = argv.filter(a => !a.startsWith('-'));
  const quoted = (text.match(/-m\s*["'](.+?)["']/) || [])[1];

  if(!isGit){
    out.push(L(T('git.notgit', { cmd: parts[0] }),'err'));
    out.push(NOTE(T('git.onlygit')));
    return { ok:false, out:out };
  }

  switch(cmd){
    case 'init': {
      if(repo.init){ out.push(L('Reinitialized existing Git repository in /sandbox/visual-git/.git/')); return { ok:true, out:out }; }
      repo.init = true; repo.HEAD = 'main'; branchColor('main');
      if(repo.autoChanges !== false) loadChangeset();
      out.push(L('Initialized empty Git repository in /sandbox/visual-git/.git/'));
      out.push(NOTE(T('git.init.note')));
      return { ok:true, out:out };
    }
    case 'status': {
      if(needRepo(out)) return { ok:false, out:out };
      /* rebase in progress: report "rebasing" in real git's wording and list unresolved paths */
      if(repo.rebase){
        const R = repo.rebase;
        out.push(L('interactive rebase in progress; onto '+R.onto.slice(0,7)));
        out.push(L('You are currently rebasing branch \''+repo.HEAD+'\' on \''+R.onto.slice(0,7)+'\'.','dim'));
        if(R.open.length){
          out.push(L('  (fix conflicts and then run "git rebase --continue")','dim'));
          out.push(L('  (use "git rebase --skip" to skip this patch)','dim'));
        } else if(R.staged){
          out.push(L('  (all conflicts fixed: run "git rebase --continue")','dim'));
        }
        out.push(L('  (use "git rebase --abort" to check out the original branch)','dim'));
        if(R.open.length){
          out.push(L('\nUnmerged paths:'));
          out.push(L('  (use "git add <file>..." to mark resolution)','dim'));
          R.open.forEach(p => out.push(L('        both modified:   '+p,'red')));
        }
        out.push(NOTE(T('git.status.rebasing', { branch:repo.HEAD, onto:R.ontoLabel })));
        return { ok:true, out:out };
      }
      out.push(L('On branch '+repo.HEAD));
      if(!tipOf(repo.HEAD)) out.push(L('\nNo commits yet'));
      const S = staged(), U = unstaged();
      if(S.length){
        out.push(L('\nChanges to be committed:'));
        out.push(L('  (use "git restore --staged <file>..." to unstage)','dim'));
        S.forEach(f => out.push(L('        '+fileStatWord(f.s)+f.p,'gr')));
      }
      if(U.length){
        out.push(L('\nChanges not staged for commit:'));
        out.push(L('  (use "git add <file>..." to update what will be committed)','dim'));
        U.forEach(f => out.push(L('        '+fileStatWord(f.s)+f.p,'red')));
      }
      if(!S.length && !U.length) out.push(L('\nnothing to commit, working tree clean'));
      return { ok:true, out:out };
    }
    case 'add': {
      if(needRepo(out)) return { ok:false, out:out };
      /* during merge or rebase: git add means "mark this file resolved" */
      if(pending()){ const r = stageMerge(out); return { ok:r.ok, out:out }; }
      const target = rest[0] || '';
      if(!target){
        out.push(L('Nothing specified, nothing added.','err'));
        out.push(L("hint: Maybe you wanted to say 'git add .'?",'dim'));
        return { ok:false, out:out };
      }
      const hit = (target === '.' || target === '-A' || target === '*')
        ? repo.work.filter(w => !w.staged)
        : repo.work.filter(w => !w.staged && w.p.indexOf(target) === 0);
      if(!hit.length){
        const known = repo.work.length || headSnapshot().length;
        if(target !== '.' && known){
          out.push(L("fatal: pathspec '"+target+"' did not match any files",'err'));
          return { ok:false, out:out };
        }
        out.push(NOTE(T('git.add.fresh')));
        return { ok:true, out:out };
      }
      hit.forEach(w => w.staged = true);
      const n = { A:0, M:0, D:0 }; hit.forEach(w => n[w.s]++);
      out.push(NOTE(T('git.add.staged', { n:hit.length, a:n.A, m:n.M, d:n.D })));
      return { ok:true, out:out };
    }
    case 'commit': {
      if(needRepo(out)) return { ok:false, out:out };
      /* rebase concludes with git rebase --continue, not git commit */
      if(repo.rebase){
        out.push(L('fatal: You are in the middle of a rebase -- cannot commit.','err'));
        out.push(L('  (use "git rebase --continue" to go on)','dim'));
        out.push(NOTE(T('git.commit.duringRebase')));
        return { ok:false, out:out };
      }
      if(repo.merging){
        if(repo.merging.open.length){
          out.push(L('You have unmerged paths.','err'));
          out.push(L('  (fix conflicts and run "git add" to mark resolution)','dim'));
          out.push(NOTE(T('git.commit.nofiles', { n: repo.merging.open.length })));
          return { ok:false, out:out };
        }
        if(!repo.merging.staged){
          out.push(L('error: Committing is not possible because you have unmerged files.','err'));
          out.push(L("hint: Fix them up in the work tree, and then use 'git add <file>' to mark resolution.",'dim'));
          return { ok:false, out:out };
        }
        if(!quoted && flags.indexOf('-m') < 0){
          out.push(L('hint: ' + T('git.commit.mergemsg'),'dim'));
          return { ok:false, out:out };
        }
        const msg = quoted || 'Merge branch \'' + repo.merging.other + '\' into ' + repo.HEAD;
        const id = nextHash();
        const content = repo.merging.fullContent;
        const snap = Object.keys(content).sort();
        repo.commits.push({ id:id, msg:msg, branch:repo.HEAD,
          parents:[repo.merging.mine, repo.merging.theirs], isMerge:true,
          snapshot:snap, content:content, changes:(repo.merging.changes||[]), color:'#16a34a' });
        repo.byId[id] = repo.commits[repo.commits.length-1];
        repo.branches[repo.HEAD] = id;
        repo.merging = null; repo.work = [];
        out.push(L("Merge made by the 'ort' strategy.","gr"));
        out.push(NOTE(T('git.commit.mergeNote')));
        return { ok:true, out:out };
      }
      const S = staged();
      if(!S.length){
        out.push(L('On branch '+repo.HEAD));
        out.push(L('nothing added to commit but untracked files present','err'));
        out.push(L('hint: ' + T('git.commit.nostaged'),'dim'));
        return { ok:false, out:out };
      }
      if(!quoted && flags.indexOf('-m') < 0){
        out.push(L('hint: ' + T('git.commit.needmsg'),'dim'));
        return { ok:false, out:out };
      }
      const msg = quoted || '(no message)';
      const parentId = tipOf(repo.HEAD);
      const isRoot = !parentId;
      const id = nextHash();
      const snap = applyChanges(parentId ? repo.byId[parentId].snapshot : [], S);
      const content = buildContent(parentId ? repo.byId[parentId].content : {}, S);
      const c = { id:id, msg:msg, branch:repo.HEAD, parents:parentId ? [parentId] : [],
                  isMerge:false, snapshot:snap, content:content, changes:S.map(x=>({p:x.p,s:x.s,content:x.content})),
                  color:branchColor(repo.HEAD) };
      repo.commits.push(c); repo.byId[id] = c; repo.branches[repo.HEAD] = id;
      repo.work = unstaged();
      /* After commit, if the workspace is empty, auto-load the next batch so there is always something to edit */
      if(!repo.work.length && repo.autoChanges !== false) loadChangeset();
      const ins = S.filter(x=>x.s!=='D').length * 17 + 6, del = S.filter(x=>x.s==='D').length * 23;
      out.push(L('['+repo.HEAD+(isRoot?' (root-commit)':'')+' '+id+'] '+msg));
      out.push(L(' '+S.length+' file'+(S.length>1?'s':'')+' changed, '+ins+' insertion(+)'+(del?', '+del+' deletion(-)':''),'dim'));
      return { ok:true, out:out };
    }
    case 'branch': {
      if(needRepo(out)) return { ok:false, out:out };
      if(!rest.length){
        Object.keys(repo.branches).forEach(b =>
          out.push(L((b === repo.HEAD ? '* ' : '  ') + b + '  ' + tipOf(b), b === repo.HEAD ? 'gr' : '')));
        if(!Object.keys(repo.branches).length) out.push(NOTE(T('git.branch.none')));
        return { ok:true, out:out };
      }
      const n = rest[0];
      if(repo.branches[n]){ out.push(L("fatal: a branch named '"+n+"' already exists",'err')); return { ok:false, out:out }; }
      const t = tipOf(repo.HEAD);
      if(!t){ out.push(L("fatal: not a valid object name: '"+repo.HEAD+"'",'err'));
              out.push(NOTE(T('git.branch.pointer'))); return { ok:false, out:out }; }
      repo.branches[n] = t; branchColor(n);
      out.push(NOTE(T('git.branch.created', { name:n, tip:t, head:repo.HEAD })));
      return { ok:true, out:out };
    }
    case 'switch': case 'checkout': {
      if(needRepo(out)) return { ok:false, out:out };
      /* no branch switching during merge/rebase: conclude or abort first */
      if(pending()){ out.push(L('fatal: cannot switch branches with an operation in progress','err')); out.push(NOTE(T('git.op.busy'))); return { ok:false, out:out }; }
      const create = flags.indexOf('-c') >= 0 || flags.indexOf('-b') >= 0;
      const n = rest[0];
      if(!n){ out.push(L('fatal: missing branch name','err')); return { ok:false, out:out }; }
      if(create){
        if(repo.branches[n]){ out.push(L("fatal: a branch named '"+n+"' already exists",'err')); return { ok:false, out:out }; }
        const t = tipOf(repo.HEAD);
        if(!t){ out.push(L("fatal: not a valid object name: '"+repo.HEAD+"'",'err')); return { ok:false, out:out }; }
        repo.branches[n] = t; branchColor(n); repo.HEAD = n;
        out.push(L("Switched to a new branch '"+n+"'"));
        return { ok:true, out:out };
      }
      if(!repo.branches[n]){
        out.push(L("fatal: invalid reference: '"+n+"'",'err'));
        out.push(L('hint: ' + T('git.switch.hint'),'dim'));
        return { ok:false, out:out };
      }
      if(n === repo.HEAD){ out.push(L("Already on '"+n+"'")); return { ok:true, out:out }; }
      repo.HEAD = n;
      out.push(L("Switched to branch '"+n+"'"));
      if(staged().length || unstaged().length) out.push(NOTE(T('git.switch.carry')));
      return { ok:true, out:out };
    }
    case 'merge': {
      if(needRepo(out)) return { ok:false, out:out };
      if(pending()){ out.push(L('fatal: cannot merge with an operation in progress','err')); out.push(NOTE(T('git.op.busy'))); return { ok:false, out:out }; }
      const s = rest[0];
      if(!s){ out.push(L('fatal: ' + T('git.merge.none'),'err')); return { ok:false, out:out }; }
      if(!repo.branches[s]){ out.push(L("merge: "+s+" - not something we can merge",'err')); return { ok:false, out:out }; }
      if(s === repo.HEAD){ out.push(L('Already up to date.')); return { ok:true, out:out }; }
      const other = tipOf(s);
      const cur = tipOf(repo.HEAD);
      if(!cur || !other){ out.push(L('fatal: ' + T('git.merge.nocommit'),'err')); return { ok:false, out:out }; }
      if(ancestors(cur).has(other)){ out.push(L('Already up to date.')); return { ok:true, out:out }; }
      if(ancestors(other).has(cur)){
        repo.branches[repo.HEAD] = other;
        out.push(L('Updating '+cur.slice(0,7)+'..'+other.slice(0,7)));
        out.push(L('Fast-forward','gr'));
        out.push(NOTE(T('git.merge.ff', { head: repo.HEAD })));
        return { ok:true, out:out };
      }
      return doMerge(out, other, s);
    }
    case 'log': {
      if(needRepo(out)) return { ok:false, out:out };
      if(!repo.commits.length){ out.push(L('fatal: your current branch \''+repo.HEAD+'\' does not have any commits yet','err')); return { ok:false, out:out }; }
      const seen = ancestors(tipOf(repo.HEAD));
      repo.commits.slice().reverse().filter(c => seen.has(c.id)).forEach(c=>{
        const refs = Object.keys(repo.branches).filter(b => tipOf(b) === c.id);
        const tag = refs.length ? ' (' + refs.map(r => (r===repo.HEAD?'HEAD -> ':'')+r).join(', ') + ')' : '';
        out.push(L(c.id + tag + ' ' + c.msg, refs.length ? 'gr' : ''));
      });
      return { ok:true, out:out };
    }
    case 'rebase': {
      if(needRepo(out)) return { ok:false, out:out };
      /* three exits: --continue / --skip / --abort (all require a rebase in progress) */
      if(flags.indexOf('--abort') >= 0){
        if(!repo.rebase){ out.push(L('No rebase in progress?','err')); out.push(NOTE(T('git.rebase.noProgress'))); return { ok:false, out:out }; }
        return rebaseAbort(out);
      }
      if(flags.indexOf('--continue') >= 0){
        if(!repo.rebase){ out.push(L('No rebase in progress?','err')); out.push(NOTE(T('git.rebase.noProgress'))); return { ok:false, out:out }; }
        return rebaseContinue(out);
      }
      if(flags.indexOf('--skip') >= 0){
        if(!repo.rebase){ out.push(L('No rebase in progress?','err')); out.push(NOTE(T('git.rebase.noProgress'))); return { ok:false, out:out }; }
        return rebaseSkip(out);
      }
      /* start a new rebase: first rule out "already running" and "merging" */
      if(repo.rebase){ out.push(L('fatal: It seems that there is already a rebase in progress.','err')); out.push(NOTE(T('git.rebase.busy'))); return { ok:false, out:out }; }
      if(repo.merging){ out.push(L('fatal: It seems that there is already a merge in progress.','err')); out.push(NOTE(T('git.op.busy'))); return { ok:false, out:out }; }
      const s = rest[0];
      if(!s){ out.push(L('fatal: ' + T('git.rebase.none'),'err')); return { ok:false, out:out }; }
      if(!repo.branches[s]){ out.push(L("fatal: invalid upstream '"+s+"'",'err')); out.push(NOTE(T('git.rebase.nobranch', { name:s }))); return { ok:false, out:out }; }
      if(s === repo.HEAD){ out.push(L('fatal: cannot rebase a branch onto itself','err')); return { ok:false, out:out }; }
      return doRebase(out, tipOf(s), s);
    }
    case 'reset': case 'revert': case 'cherry-pick': {
      out.push(L(T('git.unsupported', { cmd:cmd }),'err'));
      out.push(NOTE(T(cmd === 'reset' ? 'git.reset.note' : 'git.rebase.generic', { cmd: cmd })));
      return { ok:false, out:out };
    }
    default:
      out.push(L(T('git.badcmd', { cmd: cmd }),'err'));
      out.push(NOTE(T('git.supported', { cmds: 'init · status · add · commit · branch · switch · merge · rebase · log' })));
      return { ok:false, out:out };
  }
}

VGE.model = {
  /* Guided lessons own an isolated repository, using the same interpreter.
     The sandbox keeps its existing global repository and automatic exercises. */
  createSession: function(initial) {
    const state = initial || blankRepo();
    return {
      state: state,
      run: function(raw) {
        const previous = repo;
        repo = state;
        try { return interpret(raw); }
        finally { repo = previous; }
      }
    };
  },
  interpret: interpret, blankRepo: blankRepo, tipOf: tipOf, headSnapshot: headSnapshot,
  staged: staged, unstaged: unstaged, ancestors: ancestors, branchColor: branchColor,
  resolveConflict: resolveConflict, doMerge: doMerge, diffLines: diffLines,
  loadChangeset: loadChangeset, contentOf: contentOf
};

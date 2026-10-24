/* Guide an uninitialized sandbox on entry; progress follows the real repository state. */
'use strict';
(function () {
  const order = ['tree', 'init', 'files', 'add', 'commit', 'graph', 'ai'];
  const targets = { tree:'#treeCard', init:'#termCard', files:'#treeCard', add:'#termCard', commit:'#termCard', graph:'.graph-card', ai:'#aiCard' };
  const copy = {
    en: {
      label:'PLAYGROUND TOUR', skip:'Skip tour', next:'Continue', finish:'Start exploring', waiting:'Waiting for your command',
      tree:['Your project lives here', 'The File Tree shows your project files and their Git status. Its empty-state hint tells you where to begin: initialize a repository in the terminal.', 'Next, let’s run <code>git init</code>.'],
      init:['Create your repository', 'Type <code>git init</code> in the terminal below, then press Enter or click Run. This playground will load sample project files into the File Tree.', 'Follow the hint in the input field: <code>git init</code>.'],
      files:['Your files are ready', 'The File Tree now contains your sample files. They have not been committed yet. Next, stage them and save your first snapshot.', 'Look at the new files, then continue to the terminal.'],
      add:['Try a command shortcut', 'The status, add ., commit and other buttons fill a command into the terminal. Click <strong>add .</strong>, then press Enter or Run to stage your files. You can also type the command yourself.', 'Follow the input hint: <code>git add .</code> (with a space before the dot).'],
      commit:['Save your first commit', 'Your files are staged. Click <strong>commit</strong> to fill the next command, then press Enter or Run. You can edit the message or type your own command.', 'Run <code>git commit -m "update"</code> to save a snapshot.'],
      graph:['See your history take shape', 'Your first commit is now a node in the Commit Graph. Branch labels show where branches point, and HEAD marks your current position. Hover over a node to see its file snapshot; click it for details after the tour.', 'Use the graph to connect file snapshots, commits and branches.'],
      ai:['Ask the AI Assistant', 'Type a question in the conversation box below and press Enter or Send. Ask about a Git command, an error, or what the graph means. The assistant can help you decide what to try next.', 'For example: “What is the difference between add and commit?”']
    },
    zh: {
      label:'练习场入门引导', skip:'跳过引导', next:'继续', finish:'开始探索', waiting:'等待你运行命令',
      tree:['这里存放你的项目文件', 'File Tree（文件结构）展示项目文件及其 Git 状态。现在还没有仓库，文件树中的初始提示会告诉你：先到终端初始化仓库。', '接下来，在终端运行 <code>git init</code>。'],
      init:['初始化你的仓库', '在下方终端输入 <code>git init</code>，然后按回车或点击“运行”。这个练习沙盒会载入示例项目文件，文件树中就会出现文件。', '按照输入框的提示输入：<code>git init</code>。'],
      files:['文件已经出现了', '文件树现在展示了示例项目文件，它们还没有被提交。接下来，我们先暂存这些文件，再保存第一次提交。', '看看新出现的文件，然后继续到终端。'],
      add:['试试快捷命令按钮', '上方的 status、add .、commit 等按钮都是快捷指令。点击 <strong>add .</strong> 会自动填入命令，再按回车或点击“运行”暂存文件。你也可以手动输入。', '跟随输入框提示运行 <code>git add .</code>，注意点号前有空格。'],
      commit:['保存第一次提交', '文件已暂存。按照输入框的新提示点击 <strong>commit</strong>，命令会自动填入终端，再按回车或点击“运行”。你也可以修改提交信息，或手动输入命令。', '运行 <code>git commit -m "update"</code>，保存文件快照。'],
      graph:['用提交图理解当前状态', '第一次提交已经出现在 Commit Graph 中。每个节点保存一次文件快照，分支标签显示分支指向哪个提交，HEAD 标出你当前的位置。悬停节点可查看文件快照；结束引导后点击节点可查看详情。', '结合文件快照、提交节点和分支标签，理解文件与分支的位置。'],
      ai:['向 AI Assistant 提问', '在下方对话框输入问题，按回车或点击“发送”即可向 AI 提问。你可以询问 Git 命令、报错原因，或让它解释提交图中的状态。', '例如：“add 和 commit 有什么区别？”']
    }
  };
  let root, dialog, spotlight, blockers, step, frame, lastGeometry = '', previousFocus, lang;
  let savedDescription;
  const q = selector => document.querySelector(selector);
  const words = () => copy[VGE.i18n.current.startsWith('zh') ? 'zh' : 'en'];
  const active = () => !!root;
  function init() {
    // Entry is state-based, regardless of URL or an old completion/skip record.
    // Do not restart a running tour or interrupt an already initialized repository.
    if (!repo || repo.init || active()) return;
    start();
  }
  // Explicit sandbox resets can replay the tour regardless of entry URL or past dismissal.
  function start() {
    if (active()) { show('tree'); return; }
    previousFocus = document.activeElement;
    root = document.createElement('div');
    root.className = 'practice-tour';
    root.innerHTML = '<div class="tour-spotlight" aria-hidden="true"></div>' +
      '<div class="tour-blocker"></div>'.repeat(4) +
      '<section class="tour-dialog" role="dialog" aria-modal="true" aria-labelledby="tourTitle" aria-describedby="tourBody tourAction" tabindex="-1"></section>';
    document.body.append(root);
    dialog = root.querySelector('.tour-dialog');
    spotlight = root.querySelector('.tour-spotlight');
    blockers = [...root.querySelectorAll('.tour-blocker')];
    document.body.classList.add('tour-active');
    root.addEventListener('click', e => {
      if (e.target.closest('[data-tour-skip]')) finish();
      else if (e.target.closest('[data-tour-next]')) {
        if (step === 'ai') finish();
        else if (step === 'files') show(repo.commits.length ? 'graph' : staged().length ? 'commit' : 'add');
        else show(order[order.indexOf(step) + 1]);
      }
    });
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('focusin', onFocus, true);
    document.addEventListener('click', guardClick, true);
    show('tree');
    frame = requestAnimationFrame(track);
  }
  function show(next) {
    restoreDescription();
    step = next;
    lang = VGE.i18n.current;
    const t = words(), item = t[step], index = order.indexOf(step);
    const waiting = ['init','add','commit'].includes(step);
    root.dataset.step = step;
    document.body.classList.toggle('tour-tree', step === 'tree' || step === 'files');
    if (VGE.stacked) {
      VGE.stacked.closeFiles();
    }
    document.body.classList.toggle('stack-ai', step === 'ai');
    document.querySelectorAll('.tour-command').forEach(el => el.classList.remove('tour-command'));
    const accent = step === 'add' ? q('[data-cmd="git add ."]') : step === 'commit' ? q('[data-cmd^="git commit"]') : step === 'ai' ? q('.chat-input') : null;
    if (accent) accent.classList.add('tour-command');
    dialog.innerHTML = '<div class="tour-kicker">' + t.label + ' · ' + (index + 1) + ' / ' + order.length + '</div>' +
      '<h2 id="tourTitle">' + item[0] + '</h2><p id="tourBody">' + item[1] + '</p>' +
      '<div class="tour-action" id="tourAction">' + item[2] + '</div>' +
      '<div class="tour-progress" aria-hidden="true">' + order.map((_, i) => '<i class="' + (i <= index ? 'done' : '') + '"></i>').join('') + '</div>' +
      '<div class="tour-footer"><button type="button" class="btn btn--sm" data-tour-skip>' + t.skip + '</button>' +
      (waiting ? '<span class="tour-wait" role="status">' + t.waiting + '</span>' : '<button type="button" class="btn btn--primary btn--sm" data-tour-next>' + (step === 'ai' ? t.finish : t.next) + '</button>') + '</div>';
    const input = waiting ? q('#cmdInput') : step === 'ai' ? q('#aiInput') : null;
    if (input) {
      savedDescription = [input, input.getAttribute('aria-describedby')];
      input.setAttribute('aria-describedby', 'tourTitle tourBody tourAction');
    }
    lastGeometry = '';
    position();
    (input || dialog.querySelector('[data-tour-next]')).focus({ preventScroll:true });
  }
  function sync() {
    if (!active()) return;
    // A failed command never advances. Rewinding also returns to the missing prerequisite.
    if (['init','add','commit'].includes(step)) {
      if (!repo.init && step !== 'init') show('init');
      else if (step === 'init' && repo.init) show('files');
      else if (repo.commits.length && step !== 'init') show('graph');
      else if (step === 'add' && staged().length) show('commit');
      else if (step === 'commit' && !staged().length) show('add');
    }
    if (lang !== VGE.i18n.current) show(step);
  }
  function position() {
    const target = q(targets[step]);
    const r = target.getBoundingClientRect(), w = innerWidth, h = innerHeight;
    const x = Math.max(4, r.left - 3), y = Math.max(4, r.top - 3);
    const right = Math.min(w - 4, r.right + 3), bottom = Math.min(h - 4, r.bottom + 3);
    const geometry = [x,y,right,bottom,w,h,dialog.offsetHeight].join(',');
    if (geometry === lastGeometry) return;
    lastGeometry = geometry;
    const rect = (el,l,t,width,height) => Object.assign(el.style, { left:l+'px', top:t+'px', width:Math.max(0,width)+'px', height:Math.max(0,height)+'px' });
    rect(spotlight,x,y,right-x,bottom-y);
    rect(blockers[0],0,0,w,y); rect(blockers[1],0,bottom,w,h-bottom);
    rect(blockers[2],0,y,x,bottom-y); rect(blockers[3],right,y,w-right,bottom-y);
    const dw = Math.min(330,w-24), gap = 16, margin = 12;
    dialog.style.width = dw+'px';
    // Prefer a side with room; otherwise use the larger space above/below the target.
    let dx,dy,maxHeight;
    if (w-right >= dw+gap+margin || x >= dw+gap+margin) {
      dx = w-right >= dw+gap+margin ? right+gap : x-gap-dw;
      maxHeight = h-2*margin;
      dialog.style.maxHeight = maxHeight+'px';
      dy = Math.max(margin,Math.min(y,h-dialog.offsetHeight-margin));
    } else {
      const above = y-margin-gap, below = h-bottom-margin-gap;
      const useAbove = above >= below;
      maxHeight = Math.max(100,useAbove ? above : below);
      dialog.style.maxHeight = maxHeight+'px';
      dx = Math.max(margin,Math.min(x,w-dw-margin));
      dy = useAbove ? Math.max(margin,y-gap-dialog.offsetHeight) : bottom+gap;
    }
    dialog.style.left = dx+'px'; dialog.style.top = dy+'px';
  }
  function track() {
    if (!active()) return;
    // The responsive layout resets its panel at a breakpoint; keep the tour target visible.
    document.body.classList.toggle('stack-ai', step === 'ai');
    position();
    frame = requestAnimationFrame(track);
  }
  function allowed(el) {
    if (root.contains(el)) return true;
    if (['init','add','commit'].includes(step)) return !!el.closest('#cmdInput, #runBtn, #chips');
    if (step === 'ai') return !!el.closest('#aiInput, #aiSend');
    return false;
  }
  function guardClick(e) {
    if (!allowed(e.target)) { e.preventDefault(); e.stopImmediatePropagation(); }
  }
  function onFocus(e) {
    if (!allowed(e.target)) dialog.focus({ preventScroll:true });
  }
  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); finish(); return; }
    if (e.key !== 'Tab') return;
    // Keep keyboard navigation inside the explanation and the live controls it teaches.
    const controls = [...document.querySelectorAll('button, input, [tabindex="0"]')].filter(el =>
      allowed(el) && !el.disabled && el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden');
    const index = controls.indexOf(document.activeElement);
    const next = (index + (e.shiftKey ? -1 : 1) + controls.length) % controls.length;
    e.preventDefault(); e.stopImmediatePropagation(); controls[next].focus({ preventScroll:true });
  }
  function restoreDescription() {
    if (!savedDescription) return;
    const [input, original] = savedDescription;
    if (original === null) input.removeAttribute('aria-describedby');
    else input.setAttribute('aria-describedby', original);
    savedDescription = null;
  }
  function finish() {
    const destination = step === 'ai' ? q('#aiInput') : q('#cmdInput');
    restoreDescription();
    cancelAnimationFrame(frame);
    document.removeEventListener('keydown',onKey,true);
    document.removeEventListener('focusin',onFocus,true);
    document.removeEventListener('click',guardClick,true);
    document.body.classList.remove('tour-active','tour-tree');
    document.querySelectorAll('.tour-command').forEach(el => el.classList.remove('tour-command'));
    root.remove(); root = null;
    (destination || previousFocus).focus({ preventScroll:true });
  }
  VGE.tour = { init, sync, active, restart:start };
})();

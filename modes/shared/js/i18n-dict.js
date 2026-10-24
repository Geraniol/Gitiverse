'use strict';
window.VGE = window.VGE || {};

VGE.i18n = {
  /* Default language: English. A switch to Chinese is stored in localStorage. */
  current: 'en-US',
  STORE_KEY: 'vge.lang',
  supported: ['en-US', 'zh-CN'],   /* English first: default language, and the order in the settings dropdown */

  dict: {
    'zh-CN': {
      /* ---- <title> and brand ---- */
      'app.title':            'Git Playground · 交互式 Git 沙盒',
      'app.brand':            'Git Playground',
      'nav.homeTitle':        '返回首页',
      'nav.lesson':           '返回课程',
      'nav.lessonTitle':      '返回刚才的学习章节',

      /* ---- card titles and hints ---- */
      'card.tree':            '文件结构',
      'card.treeHint':        '工作区 · {br}',
      'card.treeEmpty':       '尚未初始化',
      'card.ws':              '工作区',
      'card.wsHint':          '待提交',
      'card.graph':           '提交图',
      'card.graphHint':       '悬停看目录快照 · 点击看提交详情',
      'card.term':            '命令终端',
      'card.termHint':        '悬停任意一行可回溯到该步',
      'card.ai':              'AI 助手',
      'files.toggle':         '文件与工作区',
      'files.toggleTitle':    '展开文件与工作区（悬停展开 · 点击固定）',
      'files.toggleAria':     '切换"文件与工作区"面板',
      'files.closeAria':      '收起文件与工作区',

      /* ---- legend ---- */
      'legend.add':           '新增',
      'legend.mod':           '修改',
      'legend.del':           '删除',
      'legend.staged':        '已暂存',
      'legend.unstaged':      '未暂存',
      'legend.commit':        '普通提交',
      'legend.merge':         '合并提交',
      'legend.root':          '根提交',
      'legend.head':          'HEAD',
      'legend.headTitle':     'HEAD 指向的提交：环更粗并带一层琥珀色光晕',
      'legend.branch':        '分支引用',

      /* ---- terminal ---- */
      'term.placeholder':     '输入 git 命令…',
      'term.run':             '运行',
      'term.prompt':          'visual-git',

      /* ---- buttons / actions ---- */
      'btn.send':             '发送',
      'btn.stop':             '停止',
      'btn.cancel':           '取消',

      /* ---- commit graph badges ---- */
      'graph.meta':           'HEAD → {br} · {n} 提交 · {b} 分支',
      'graph.metaEmpty':      '尚未初始化仓库',
      'graph.lr':             '横向',
      'graph.ud':             '纵向',

      /* ---- AI chat ---- */
      'ai.placeholder':       '向 AI 提问，例如：merge 和 rebase 有什么区别？',

      /* ---- working tree hints ---- */
      'ws.willContain':       '提交将包含',
      'ws.moreFiles':         '… 另外 {n} 个文件',
      'ws.treeEmpty':         '工作区为空。',
      'ws.treeNoInit':        '当前目录还不是 Git 仓库。运行 <code>git init</code> 后，这里会显示工作区的目录结构。',

      /* ---- commit graph ---- */
      'graph.emptyInit':      '仓库已初始化，但还没有提交。<br>暂存改动后运行 <code style="font-family:var(--font-mono)">git commit -m "…"</code> 生成第一个节点。',
      'graph.emptyNoRepo':    '还不是 Git 仓库。<br>先运行 <code style="font-family:var(--font-mono)">git init</code>。',

      /* ---- terminal ---- */
      'term.ready':           '沙盒终端已就绪。<br>输入 <b style="color:#9fc3ef">git init</b> 开始，或点击下方常用命令。',
      'term.rewound':         '已回溯到第 <b>{n}</b> 条命令。',
      'term.rewoundTail':     '下方灰色命令尚未重放；此时执行新命令会从这里另起一条历史。',
      'term.rewind':          '回溯至此',
      'term.replay':          '重放至此',
      'term.hoverCmd':        '点击填回输入框',

      /* ---- conflict panel ---- */
      'cf.head':              '合并冲突',
      'cf.headRebase':        '重放冲突',
      'cf.unresolved':        '{n} 处未解决',
      'cf.desc':              '{name} 与本地都改了同一处，Git 停在这里等你裁决。',
      'cf.descRebase':        '把你重放到 {name} 上的提交和它撞在同一处，Git 停在这里等你裁决。',
      'cf.mine':              '保留我的',
      'cf.theirs':            '保留对方',
      'cf.both':              '都保留',
      'cf.headMine':          'HEAD（你的）',
      'cf.headTheirs':        'incoming（对方的）',

      /* ---- stats bar ---- */
      'stat.staged':          '已暂存',
      'stat.unstaged':        '未暂存',
      'stat.tracked':         '已跟踪',

      /* ---- greeting and chat ---- */
      /* The closing clause about the task guide on the right was dropped:
         that card is gone from the UI. */
      /* The opening line now introduces the sandbox itself - no curriculum,
         just free play and a reset button. */
      'chat.courseStart':     '欢迎来到 <b>Git Playground</b> —— 一个可以随便试的 Git 沙盒，敲坏了点顶栏的重置就能重来。<br><b>先动手吧：在终端运行 <code>git init</code>。</b>',
      'chat.greet':           '我是你的 Git 导师。<b>中间</b>是实时提交图 —— 把鼠标悬到任意节点上，可以看到那一刻的目录快照；<b>下方</b>终端里悬停任意一行可回溯到那一步。',
      'chat.reset':           '沙盒已重置：提交、分支、命令历史全部清空，任务回到第 1 步。<span class="sub">真实仓库不受任何影响。</span>',

      /* ---- dialogs ---- */
      'modal.reset':          '将清空当前沙盒仓库的全部提交、分支与命令历史，任务进度回到第 1 步。<br>此操作只影响沙盒，不会触碰任何真实仓库。',
      'modal.resetTitle':     '重置练习沙盒',
      'modal.okReset':        '确认重置',

      /* ---- AI answers ---- */
      /* The "what next" answer is now generic advice pointing only at things
         that exist in the UI; the course panel and its steps are gone. */
      'ai.freeform':          '沙盒里没有规定动作 —— 先 <code>git status</code> 看当前状态，再决定 add / commit / branch。<span class="sub">想从头来过就点顶栏的重置。</span>',
      'ai.rebase':            '<b>merge</b> 保留真实分叉，产生一个有两个父节点的合并提交；<b>rebase</b> 把你的提交逐个「搬」到目标分支顶端，历史变成一条直线，但提交 ID 全变了。<span class="sub">口诀：已推送到远端的提交不要 rebase。</span>',
      'ai.reset':             '<code>reset --hard</code> 会同时移动分支指针并丢弃工作区改动。已提交的内容通常还能用 <code>git reflog</code> 找回，<b>但未提交的改动找不回来</b>。<span class="sub">学习模式里随便试 —— 沙盒仓库随时可重置。</span>',
      'ai.staging':           '暂存区是工作区和仓库之间的一层缓冲。<code>git add</code> 把改动放进去，<code>git commit</code> 才把里面的内容固化成快照。<span class="sub">它的价值在于：可以把一次混乱的修改拆成几条语义清晰的提交。</span>',
      'ai.merge':             '合并时 Git 找到两条分支的共同祖先，把各自的改动叠加。改到同一文件同一处就会冲突，需要你手动裁决后再 <code>git add</code> + <code>git commit</code>。',
      'ai.branch':            '分支就是一个指向提交的指针。当前有 <b>{branches}</b>，HEAD 在 <b>{head}</b> 上。',
      'ai.commit':            '提交保存的是「整个目录在那一刻的完整快照」，不是行级差异。当前共 {n} 个提交，悬停提交图上的节点可以看到各自的目录结构。',
      'ai.fallback':          '试试在提交图上悬停任意节点，看看那一刻的目录长什么样；或者问我「当前该做什么？」。<span class="sub">本沙盒支持：init · status · add · commit · branch · switch · merge · log</span>',

      /* ---- AI settings dialog ---- */
      'cfg.title':            'AI 模型配置',
      'cfg.intro':            '填入任意 OpenAI 兼容接口。',
      'cfg.language':         '界面语言',
      'cfg.lang.zh':          '中文',
      'cfg.lang.en':          'English',
      'cfg.endpoint':         '接口地址',
      'cfg.endpointPh':       'https://api.deepseek.com/chat/completions',
      'cfg.key':              'API Key',
      'cfg.keyPh':            'sk-…',
      'cfg.model':            '模型名称',
      'cfg.modelPh':          'deepseek-flash',
      'cfg.test':             '测试',
      'cfg.testing':          '测试中…',
      'cfg.testOk':           '连接成功：{model} 已响应（{ms} ms）',
      'cfg.testFail':         '连接失败：{msg}',
      'cfg.testTimeout':      '请求超时，端点无响应',
      'cfg.testNet':          '无法连接 —— 先检查端点地址与网络',
      'cfg.dataLabel':        '数据',
      'cfg.autoSaved':        '已自动保存',
      'cfg.clear':            '清除数据',
      'cfg.clearTitle':       '清除 AI 配置',
      'cfg.clearBody':        '将从本机浏览器删除已保存的接口地址、API Key、模型名称与多轮对话上下文。',
      'cfg.clearOk':          '确认清除',
      'cfg.cleared':          'AI 配置已清除。',
      'cfg.errEndpoint':      '接口地址必须以 http:// 或 https:// 开头',
      'cfg.errKey':           '请填写 API Key',
      'cfg.errModel':         '请填写模型名称',
      'cfg.errLocal':         '配置无法写入浏览器存储（可能处于隐私 / 无痕模式）',

      /* ---- AI status and errors ---- */
      'ai.statusOff':         '未配置 · 点此设置',
      'ai.statusOffTip':      '尚未接入真实模型，点击填写 API Key 与端点',
      'ai.statusOn':          '{model}',
      'ai.statusOnTip':       '已接入 {model}\n{endpoint}',
      'ai.streaming':         '正在生成…',
      'ai.stopped':           '（已停止）',
      'ai.errTimeout':        '模型 {n} 秒无响应，已中止。请重试或换一个模型。',
      /* Matches learn.html: one "could not connect" line, no troubleshooting
         tutorial in the chat. */
      /* CORS is still possible with other providers or a corporate middlebox,
         so the text stays generic and names no provider. */
      'ai.errNet':            '连不上 <code>{endpoint}</code>。<span class="sub">离线、端点填错，或者被浏览器的跨域策略挡了。点设置里的「测试连接」可以确认。</span>',
      'ai.err401':            '密钥无效或无权限（{code}）：{msg}',
      'ai.err404':            '端点或模型名不存在（404）：{msg}',
      'ai.err429':            '触发限流（429），稍后再试',
      'ai.err5xx':            '服务端错误（{code}），稍后再试',
      'ai.errOther':          '请求失败（{code}）：{msg}',
      'ai.errEmpty':          '模型返回了空内容。若用的是会"先思考再回答"的模型（如 deepseek-flash），思考过程可能占满了回复上限 —— 请调高设置里的「回复上限」，或直接重试。',
      /* 'ai.fileWarn' was removed: it told people to start a Node server for a
         page designed to open from disk. ai.errNet covers real failures. */

      /* ---- local repository mode (v4) ---- */
      'real.snapFoot':        '该提交时刻的目录快照 · 点击节点查看改动详情',

      /* ---- directory browser ---- */

      /* ---- teaching mode: import custom course content ---- */

      /* ---- settings dialog / layout ---- */
      'cfg.settings':         '设置',
      'cfg.aiSection':        'AI 设置',
      'layout.title':         '系统',
      'layout.label':         '布局',
      'layout.reset':         '重置布局',
      /* Third settings row: the local repo write toggle (label varies - see syncWriteMode). */

      /* ---- git command interpreter hints ---- */
      'git.notgit':           'bash: {cmd}: command not found',
      'git.onlygit':          '沙盒只接受以 git 开头的命令。',
      'git.badcmd':           "git: '{cmd}' is not a git command. See 'git --help'.",
      'git.merge.bothChanged': '两条分支都改了 {files}，Git 无法替你决定用哪一边。',
      'git.supported':        '本沙盒支持：{cmds}',
      'git.unsupported':      "'{cmd}' 尚未在本沙盒实现",

      /* ---- interpreter step hints ---- */
      'git.init.note':        '仓库已创建，但还没有任何提交 —— main 是一条「尚未诞生」的分支。',
      'git.add.fresh':        '暂存区已是最新 —— 没有新的改动需要加入。',
      'git.add.staged':       '已暂存 {n} 个改动（新增 {a} · 修改 {m} · 删除 {d}）。git add 本身没有输出，这是沙盒的说明。',
      'git.commit.nofiles':   '还有 {n} 个文件没决定保留哪边。先在下方的冲突面板里挑，再 git add。',
      'git.commit.mergeNote': '冲突已解决，合并提交记录了两条分支的汇合。',
      'git.commit.nostaged':  '先运行 git add . 把改动放入暂存区',
      'git.commit.needmsg':   '请用 git commit -m "message" 的形式提供说明',
      'git.commit.mergemsg':  '请用 git commit -m "merge" 的形式收尾合并',
      'git.commit.duringRebase': 'rebase 进行中不能用 git commit 收尾 —— 用 git rebase --continue。',
      'git.branch.none':      '还没有任何分支 —— 第一个提交会自动创建 main。',
      'git.branch.pointer':   '分支是「指向某个提交的指针」，所以必须先有一个提交。',
      'git.branch.created':   '已创建分支 {name} → {tip}。它和 {head} 指向同一个提交，HEAD 没有移动。',
      'git.switch.carry':     '未提交的改动会跟着你一起切过来 —— 它们还不属于任何分支。',
      'git.switch.hint':      '用 git branch 查看已有分支，或加 -c 新建',
      'git.merge.none':       '需要指定要合并进来的分支名。',
      'git.merge.nocommit':   '无法合并：分支尚无提交',
      'git.merge.ff':         '没有分叉，Git 直接把 {head} 指针前移，不产生新提交。',
      'git.op.busy':          '有进行中的合并 / rebase，先收尾（或 git rebase --abort）再继续。',
      'git.status.rebasing':  '{branch} 正在 rebase 到 {onto}：上面列的是还没解决的文件。',
      'git.rebase.none':      '需要指定要重放到的分支名，例如 git rebase main。',
      'git.rebase.nobranch':  '没有名为 {name} 的分支，无法 rebase。',
      'git.rebase.nocommit':  '无法 rebase：当前分支尚无提交',
      'git.rebase.uptodate':  '{branch} 已经包含 {onto}，无需 rebase。',
      'git.rebase.ff':        '没有分叉，{branch} 直接前移到 {onto} —— 没有需要重放的提交。',
      'git.rebase.replaying': '先回到 {onto}，再把你在 {branch} 上的 {n} 个提交逐个重放上去。',
      'git.rebase.conflict':  '重放提交 {commit} 时和 {onto} 撞车：在下方冲突面板里裁决，git add 后再 git rebase --continue。',
      'git.rebase.done':      'rebase 完成：{n} 个提交被重放到 {onto}。注意它们的提交 ID 全部换新 —— 内容一样，身份不同。',
      'git.rebase.noProgress':'当前没有进行中的 rebase。',
      'git.rebase.busy':      '已经有一次 rebase 在跑：先 git rebase --continue 或 --abort。',
      'git.rebase.aborted':   'rebase 已中止：{branch} 回到 {id}，重放出来的提交被丢弃。',
      'git.reset.note':       'reset --hard 会丢弃提交。真实仓库里请先 git reflog 找回落点，或先复制一份到沙盒试跑。',
      'git.rebase.generic':   '{cmd} 会改写历史，本沙盒暂未实现。想亲手体会"改写历史"，用 git rebase。',

      /* ---- AI suggestions ---- */
      'sug.noRepo':            '还不是 Git 仓库',
      'sug.staged':           '暂存区还有内容待提交',
      'sug.unstaged':         '工作区有未暂存的改动',
      'sug.history':          '回看一遍完整历史',
      'sug.q0':               '现在应该做什么',
      'sug.q1':               '解释一下这个操作',

      /* ---- node explanations ---- */
      'explain.origin':       '<b>origin/{ref}</b> 是共享远端的引用，指向 <code>{tip}</code>。<span class="sub">灰色代表"在服务器上"，不是你本地的提交。别人 push 上来后它会前移；你 pull 才能把它带到本地。</span>',
      'explain.branch':       '<b>{name}</b> 是一个分支引用，当前指向 <code>{tip}</code>。它本身只是一个记录提交 ID 的小文件。',
      'explain.commitHead':   '提交 <code>{id}</code> · {msg}',
      'explain.sub':          '<span class="sub">{bits}</span>',
      'explain.remote':       '该提交目前只在<b>共享远端</b>上',
      'explain.branchOf':     '分支：{branch}',
      'explain.parents':      '父节点：{parents}',
      'explain.parentNone':   '无（根提交）',
      'explain.snapshot':     '快照含 {n} 个文件',
      'explain.merge':        '<b>合并提交</b>，有两个父节点',
      'explain.refs':         '引用：{refs}',
      'explain.added':        '新增',
      'explain.modified':     '修改',
    },
    'en-US': {
      'nav.homeTitle':        'Back to home',
      'nav.lesson':           'Back to lesson',
      'nav.lessonTitle':      'Back to lesson',
      'app.title':            'Git Playground · Interactive Git Sandbox',
      'app.brand':            'Git Playground',
      'card.tree':            'File Tree',
      'card.treeHint':        'Workspace · {br}',
      'card.treeEmpty':       'Uninitialized',
      'card.ws':              'Workspace',
      'card.wsHint':          'To be committed',
      'card.graph':           'Commit Graph',
      'card.graphHint':       'Hover for the snapshot · click for details',
      'card.term':            'Terminal',
      'card.termHint':        'Hover any line to rewind to it',
      'card.ai':              'AI Assistant',
      'files.toggle':         'Files & workspace',
      'files.toggleTitle':    'Show files & workspace (hover to expand · click to pin)',
      'files.toggleAria':     'Toggle the files & workspace panel',
      'files.closeAria':      'Close files & workspace',
      'legend.add':           'Added',
      'legend.mod':           'Modified',
      'legend.del':           'Deleted',
      'legend.staged':        'Staged',
      'legend.unstaged':      'Unstaged',
      'legend.commit':        'Normal commit',
      'legend.merge':         'Merge commit',
      'legend.root':          'Root commit',
      'legend.head':          'HEAD',
      'legend.headTitle':     'The commit HEAD points at: a thicker ring with an amber glow',
      'legend.branch':        'Branch ref',
      'term.placeholder':     'Type a git command…',
      'term.run':             'Run',
      'term.prompt':          'visual-git',
      'btn.send':             'Send',
      'btn.stop':             'Stop',
      'btn.cancel':           'Cancel',
      'graph.meta':           'HEAD → {br} · {n} commits · {b} branches',
      'graph.metaEmpty':      'No repo yet',
      'graph.lr':             'LR',
      'graph.ud':             'UD',
      'ai.placeholder':       'Ask the AI, e.g. What is the diff between merge and rebase?',

      'ws.willContain':       'The commit will include',
      'ws.moreFiles':         '… and {n} more file(s)',
      'ws.treeEmpty':         'The workspace is empty.',
      'ws.treeNoInit':        'This folder is not a Git repository yet. Run <code>git init</code> and the workspace files will be listed here.',

      'graph.emptyInit':      'Repo initialized, but no commits yet.<br>Stage changes then run <code style="font-family:var(--font-mono)">git commit -m "…"</code> to make the first node.',
      'graph.emptyNoRepo':    'Not a Git repository yet.<br>First run <code style="font-family:var(--font-mono)">git init</code>.',

      'term.ready':           'The sandbox terminal is ready.<br>Type <b style="color:#9fc3ef">git init</b> to start, or click a common command below.',
      'term.rewound':         'Rewound to command <b>{n}</b>.',
      'term.rewoundTail':     'The grey commands below are not replayed yet; running a new command here starts a fresh history.',
      'term.rewind':          'Rewind here',
      'term.replay':          'Replay here',
      'term.hoverCmd':        'Click to refill the input',

      'cf.head':              'Merge conflict',
      'cf.headRebase':        'Rebase conflict',
      'cf.unresolved':        '{n} unresolved',
      'cf.desc':              '{name} and your local changes touched the same spot; Git stopped here for you to decide.',
      'cf.descRebase':        'The commit you are replaying onto {name} touches the same spot; Git stopped here for you to decide.',
      'cf.mine':              'Keep mine',
      'cf.theirs':            'Keep theirs',
      'cf.both':              'Keep both',
      'cf.headMine':          'HEAD (yours)',
      'cf.headTheirs':        'incoming (theirs)',

      'stat.staged':          'Staged',
      'stat.unstaged':        'Unstaged',
      'stat.tracked':         'Tracked',

      /* See the zh block: the task-guide clause was dropped with that card. */
      /* See the zh block: no curriculum any more, just the sandbox and a first command. */
      'chat.courseStart':     'Welcome to <b>Git Playground</b> — a Git sandbox you cannot break; reset from the top bar whenever you like.<br><b>Start here: run <code>git init</code> in the terminal.</b>',
      'chat.greet':           'I\'m your Git tutor. The <b>middle</b> panel is the live commit graph — hover any node to see that commit\'s directory snapshot; hover any line in the <b>terminal below</b> to rewind to it.',
      'chat.reset':           'Sandbox reset: commits, branches and command history cleared; back to task 1.<span class="sub">Real repos are unaffected.</span>',

      'modal.reset':          'This clears all commits, branches and command history of the current sandbox and returns tasks to step 1.<br>Only the sandbox is affected — no real repo is touched.',
      'modal.resetTitle':     'Reset the sandbox',
      'modal.okReset':        'Confirm reset',

      /* See the zh block: the three step-shaped answers went away with the course engine. */
      'ai.freeform':          'There is no prescribed order here — run <code>git status</code>, then decide between add / commit / branch.<span class="sub">Reset from the top bar to start over.</span>',
      'ai.rebase':            '<b>merge</b> keeps the real fork and produces a two-parent merge commit; <b>rebase</b> moves your commits one by one onto the target branch, leaving a straight history — but all commit IDs change.<span class="sub">Rule of thumb: never rebase commits you already pushed.</span>',
      'ai.reset':             '<code>reset --hard</code> moves the branch pointer and discards working-tree changes. Committed content can usually be recovered with <code>git reflog</code>, <b>but uncommitted changes are lost</b>.<span class="sub">Try freely in practice mode — the sandbox is always resettable.</span>',
      'ai.staging':           'The staging area is a buffer between the working tree and the repo. <code>git add</code> puts changes in; <code>git commit</code> freezes them into a snapshot.<span class="sub">Its value: you can split a messy pile of edits into several clean commits.</span>',
      'ai.merge':             'On merge, Git finds the common ancestor of two branches and layers their changes. Changing the same lines of the same file causes a conflict; you resolve it, then <code>git add</code> + <code>git commit</code>.',
      'ai.branch':            'A branch is just a pointer to a commit. Currently: <b>{branches}</b>, and HEAD is on <b>{head}</b>.',
      'ai.commit':            'A commit stores a full snapshot of the directory at that moment, not line diffs. There are {n} commits now; hover nodes on the graph to see each one\'s tree.',
      'ai.fallback':          'Try hovering a node on the graph to see that commit\'s tree, or ask me "what should I do now?".<span class="sub">This sandbox supports: init · status · add · commit · branch · switch · merge · log</span>',

      /* ---- AI settings dialog ---- */
      'cfg.title':            'AI model settings',
      'cfg.intro':            'Any OpenAI-compatible endpoint works.',
      'cfg.language':         'Interface language',
      'cfg.lang.zh':          'Chinese',
      'cfg.lang.en':          'English',
      'cfg.endpoint':         'Endpoint',
      'cfg.endpointPh':       'https://api.deepseek.com/chat/completions',
      'cfg.key':              'API key',
      'cfg.keyPh':            'sk-…',
      'cfg.model':            'Model',
      'cfg.modelPh':          'deepseek-flash',
      'cfg.test':             'Test',
      'cfg.testing':          'Testing…',
      'cfg.testOk':           'Connected: {model} replied ({ms} ms)',
      /* Replaces the old " - via the local backend" suffix (the relay is gone).
         States the constraint plainly instead of picking a provider for you. */
      'cfg.testFail':         'Connection failed: {msg}',
      'cfg.testTimeout':      'Request timed out — the endpoint did not respond',
      'cfg.testNet':          'could not connect — check the endpoint address and your network',
      'cfg.dataLabel':        'Data',
      'cfg.autoSaved':        'Saved automatically',
      'cfg.clear':            'Clear data',
      'cfg.clearTitle':       'Clear AI settings',
      'cfg.clearBody':        'Deletes the saved endpoint, API key, model name and conversation context from this browser.',
      'cfg.clearOk':          'Clear it',
      'cfg.cleared':          'AI settings cleared.',
      'cfg.errEndpoint':      'Endpoint must start with http:// or https://',
      'cfg.errKey':           'Please enter an API key',
      'cfg.errModel':         'Please enter a model name',
      'cfg.errLocal':         'Could not write to browser storage (private / incognito mode?)',

      /* ---- AI status & errors ---- */
      'ai.statusOff':         'Not configured · click to set up',
      'ai.statusOffTip':      'No live model yet — click to enter an API key and endpoint',
      'ai.statusOn':          '{model}',
      'ai.statusOnTip':       'Connected: {model}\n{endpoint}',
      'ai.streaming':         'Generating…',
      'ai.stopped':           '(stopped)',
      'ai.errTimeout':        'No response for {n}s — aborted. Try again or switch models.',
      /* Matches learn.html's register ("could not reach the endpoint (offline, or blocked by CORS)"). */
      /* Was asserting "DeepSeek does not send CORS headers" - measured, it does. */
      'ai.errNet':            'Could not reach <code>{endpoint}</code>.<span class="sub">Offline, wrong endpoint, or blocked by the browser\'s CORS policy. Try <b>Test connection</b> in settings to confirm.</span>',
      'ai.err401':            'Invalid key or no permission ({code}): {msg}',
      'ai.err404':            'Endpoint or model not found (404): {msg}',
      'ai.err429':            'Rate limited (429) — try again shortly',
      'ai.err5xx':            'Server error ({code}) — try again shortly',
      'ai.errOther':          'Request failed ({code}): {msg}',
      'ai.errEmpty':          'The model returned nothing. With a model that thinks before answering (e.g. deepseek-flash) the reasoning trace can eat the whole reply cap — raise the reply cap in settings, or just retry.',
      /* 'ai.fileWarn' removed - it told people to start a Node server before
         opening a page that is now designed to be opened straight from disk. */

      /* ---- Local repository mode (v4) ---- */
      'real.snapFoot':        'Directory snapshot at this commit · click the node for details',

      /* ---- Directory browser ---- */

      /* ---- Teaching mode: import custom course content ---- */

      /* ---- Settings dialog / layout ---- */
      'cfg.settings':         'Settings',
      'cfg.aiSection':        'AI settings',
      'layout.title':         'System',
      'layout.label':         'Layout',
      'layout.reset':         'Reset layout',

      'git.notgit':           'bash: {cmd}: command not found',
      'git.onlygit':          'The sandbox only accepts commands starting with git.',
      'git.badcmd':           "git: '{cmd}' is not a git command. See 'git --help'.",
      'git.merge.bothChanged': 'Both branches changed {files}; Git cannot decide which side to keep.',
      'git.supported':        'This sandbox supports: {cmds}',
      'git.unsupported':      "'{cmd}' is not implemented in this sandbox yet",

      'git.init.note':        'Repo created, but no commits yet — main is a branch that was never "born".',
      'git.add.fresh':        'Staging area is up to date — nothing new to add.',
      'git.add.staged':       'Staged {n} change(s) (added {a} · modified {m} · deleted {d}). git add itself prints nothing; this is the sandbox explaining.',
      'git.commit.nofiles':   '{n} file(s) still undecided. Pick in the conflict panel below, then git add.',
      'git.commit.mergeNote': 'Conflict resolved; the merge commit records the join of both branches.',
      'git.commit.nostaged':  'First run git add . to put changes into the staging area',
      'git.commit.needmsg':   'Provide a message with git commit -m "message"',
      'git.commit.mergemsg':  'Finish the merge with git commit -m "merge"',
      'git.commit.duringRebase': 'You are in the middle of a rebase — finish with git rebase --continue, not git commit.',
      'git.branch.none':      'No branches yet — the first commit auto-creates main.',
      'git.branch.pointer':   'A branch is a pointer to a commit, so you need a commit first.',
      'git.branch.created':   'Created branch {name} → {tip}. It points to the same commit as {head}; HEAD did not move.',
      'git.switch.carry':     'Uncommitted changes come along with you — they don\'t belong to any branch yet.',
      'git.switch.hint':      'Use git branch to list branches, or add -c to create one',
      'git.merge.none':       'Specify the branch to merge in.',
      'git.merge.nocommit':   'Cannot merge: the branch has no commits yet',
      'git.merge.ff':         'No fork; Git just moves the {head} pointer forward without a new commit.',
      'git.op.busy':          'A merge / rebase is in progress — finish it (or git rebase --abort) first.',
      'git.status.rebasing':  '{branch} is being rebased onto {onto}; the files above are still unresolved.',
      'git.rebase.none':      'Name the branch to replay onto, e.g. git rebase main.',
      'git.rebase.nobranch':  'No branch named {name} to rebase onto.',
      'git.rebase.nocommit':  'Cannot rebase: the current branch has no commits yet',
      'git.rebase.uptodate':  '{branch} already contains {onto}; nothing to rebase.',
      'git.rebase.ff':        'No fork; {branch} moves straight to {onto} — there are no commits to replay.',
      'git.rebase.replaying': 'Rewinding to {onto}, then replaying the {n} commit(s) you made on {branch} on top of it.',
      'git.rebase.conflict':  'Replaying {commit} collides with {onto}: decide in the conflict panel below, git add, then git rebase --continue.',
      'git.rebase.done':      'Rebase complete: {n} commit(s) replayed onto {onto}. Every one got a new commit ID — same content, different identity.',
      'git.rebase.noProgress':'No rebase in progress.',
      'git.rebase.busy':      'A rebase is already running: git rebase --continue or --abort first.',
      'git.rebase.aborted':   'Rebase aborted: {branch} is back at {id}, and the replayed commits were dropped.',
      'git.reset.note':       'reset --hard discards commits. In a real repo, find the point with git reflog first, or try it on a sandbox copy.',
      'git.rebase.generic':   '{cmd} rewrites history and is not implemented in this sandbox yet. To feel history rewriting yourself, use git rebase.',

      'sug.noRepo':            'not a Git repo yet',
      'sug.staged':           'Staged content waiting to be committed',
      'sug.unstaged':         'Unstaged working-tree changes',
      'sug.history':          'Review the full history',
      'sug.q0':               'What should I do now',
      'sug.q1':               'Explain this operation',

      'explain.origin':       '<b>origin/{ref}</b> is a shared-remote ref pointing to <code>{tip}</code>.<span class="sub">Grey means "on the server", not your local commits. It advances when others push; you pull to bring it local.</span>',
      'explain.branch':       '<b>{name}</b> is a branch ref pointing to <code>{tip}</code>. It is just a small file recording a commit id.',
      'explain.commitHead':   'Commit <code>{id}</code> · {msg}',
      'explain.sub':          '<span class="sub">{bits}</span>',
      'explain.remote':       'this commit is only on the <b>shared remote</b>',
      'explain.branchOf':     'Branch: {branch}',
      'explain.parents':      'Parents: {parents}',
      'explain.parentNone':   'none (root)',
      'explain.snapshot':     '{n} file(s) in snapshot',
      'explain.merge':        '<b>merge commit</b>, two parents',
      'explain.refs':         'Refs: {refs}',
      'explain.added':        'added',
      'explain.modified':     'modified',
    }
  },

  /* Translate. vars: {name:value} placeholders; falls back to zh-CN. */
  t: function(key, vars){
    var d = this.dict[this.current] || this.dict['zh-CN'];
    var out = d[key] !== undefined ? d[key] : this.dict['zh-CN'][key];
    if(out === undefined) return key;
    if(vars) Object.keys(vars).forEach(function(k){
      out = out.split('{' + k + '}').join(vars[k]);
    });
    return out;
  },

  /* current language */
  lang: function(){ return this.current; },

  /* Switch language and refresh every data-i18n / data-i18n-ph element. */
  setLang: function(code){
    if(this.dict[code]) this.current = code;
    this.apply();
  },

  /* Fill [data-i18n] with textContent, [data-i18n-ph] with placeholder,
     [data-i18n-title] with title, [data-i18n-aria] with aria-label. The last
     two let static icon buttons follow the language too. */
  apply: function(root){
    var r = root || document;
    r.querySelectorAll('[data-i18n]').forEach(function(el){
      el.textContent = VGE.i18n.t(el.dataset.i18n);
    });
    r.querySelectorAll('[data-i18n-ph]').forEach(function(el){
      el.placeholder = VGE.i18n.t(el.dataset.i18nPh);
    });
    r.querySelectorAll('[data-i18n-title]').forEach(function(el){
      el.title = VGE.i18n.t(el.dataset.i18nTitle);
    });
    r.querySelectorAll('[data-i18n-aria]').forEach(function(el){
      el.setAttribute('aria-label', VGE.i18n.t(el.dataset.i18nAria));
    });
  },

  /* Replace {name} placeholders; arrays are mapped item by item. */
  sub: function(val, vars){
    if(Array.isArray(val)) return val.map(function(v){ return VGE.i18n._sub(v, vars); });
    return VGE.i18n._sub(val, vars);
  },
  _sub: function(s, vars){
    if(!s || !vars) return s;
    Object.keys(vars).forEach(function(k){ s = s.split('{' + k + '}').join(vars[k]); });
    return s;
  },

  /* Read a content entity's localised field. Entities default to Chinese; an
     `en` override object supplies English. Arrays (e.g. steps) and {name}
     placeholders are supported. */
  c: function(item, field, vars){
    if(!item) return '';
    var useEn = this.current === 'en-US';
    var val;
    if(useEn && item.en && item.en[field] !== undefined) val = item.en[field];
    else if(item[field] !== undefined) val = item[field];
    else if(item.en && item.en[field] !== undefined) val = item.en[field];
    else val = '';
    return this.sub(val, vars);
  },

  /* current language code */
  code: function(){ return this.current; }
};

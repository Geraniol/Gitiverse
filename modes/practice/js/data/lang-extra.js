'use strict';


(function mergeChromeI18n(){
  if(!(window.VGE && VGE.i18n && VGE.i18n.dict)) return;
  var zh = VGE.i18n.dict['zh-CN'] || {};
  var en = VGE.i18n.dict['en-US'] || {};

  var EXTRA = {
    /* ---- bottom panel switch (terminal <-> AI): button aria names + hover tips ---- */
    'stack.toTermAria':   ['切换到命令终端', 'Switch to the command terminal'],
    'stack.toAiAria':     ['切换到 AI 助手', 'Switch to the AI assistant'],
    'stack.tipToTerm':    ['切回命令终端', 'Back to the command terminal'],
    'stack.tipToAi':      ['切到 AI 助手 · 输入非 git 内容会自动切过去', 'Switch to the AI assistant · typing anything but git switches automatically'],
    /* The short label on the language button is written in the current UI
       language. Keeping it in the dictionary rather than app.js lets the "no
       Chinese literals in the English UI" gate judge by ownership, not exemption. */
    'graph.fit':          ['自适应视图', 'Fit the view'],
    'graph.dir':          ['切换横向 / 纵向排布', 'Toggle horizontal / vertical layout'],
    'graph.engineSvg':    ['内置 SVG（CDN 不可用）', 'built-in SVG (CDN unavailable)'],
    'graph.snapCount':    ['{n} 个文件', '{n} files'],
    'btn.resetTitle':     ['重置练习沙盒', 'Reset the practice sandbox'],
    /* The top-bar light/dark toggle. The label says what clicking will do, not
       the current state - same rule as chapter_1's theme-toggle. */
    'theme.toggle':       ['切换明暗主题', 'Switch light / dark theme'],
    'cfg.keyEyeAria':     ['显示 / 隐藏密钥', 'Show / hide the API key'],
    'ai.listSep':         ['、', ', '],
    /* commit node details panel (opens on graph node click) */
    'node.title':         ['节点详情', 'Node details'],
    'node.files':         ['共 {n} 个文件', '{n} file(s)'],
    'node.diffLoading':   ['正在读取 diff…', 'Loading diff…'],
    'node.diffNone':      ['这个文件没有可显示的文本差异', 'No textual diff for this file'],
    'node.noChanges':     ['这次提交没有文件改动', 'No file changes in this commit'],
    'btn.closeAria':      ['关闭', 'Close'],
  };
  Object.keys(EXTRA).forEach(function(k){
    zh[k] = EXTRA[k][0];
    en[k] = EXTRA[k][1];
  });
})();

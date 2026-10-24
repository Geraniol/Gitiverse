'use strict';

(function init(){
  /* 1. Language: default English, but remember the last choice. Must be set before apply(). */
  let savedLang = null;
  try{ savedLang = localStorage.getItem(VGE.i18n.STORE_KEY); }catch(e){ /* private mode */ }
  if(savedLang && VGE.i18n.dict[savedLang]) VGE.i18n.current = savedLang;
  document.documentElement.setAttribute('lang', VGE.i18n.current);
  VGE.i18n.apply(document);

  /* 1.2 Theme. The inline <head> script already set data-theme; this is idempotent and adds the system listener. */
  VGE.theme.init();

  /* 1.5 Load the saved AI config before the first renderAll, or the badge flashes "unconfigured". */
  VGE.ai.loadConfig();

  /* 1.6 Refresh the AI badge once. No backend probe here: it fails under file:// and AI no longer uses forwarding. */
  VGE.render.renderAiChrome();

  /* 2. Boot the sandbox from "no repository yet"; the user types commands in the terminal. */
  boot([]);
  /* Opening message: tells the learner how the UI works. */
  chat(VGE.i18n.t('chat.courseStart'));

  /* 3. Paint [data-ic] on the static skeleton (appbar, card heads, legends, modals). Dynamic content is handled by each render. */
  paintIcons(document);

  /* 4. Init the language slider in settings (labels follow the UI language). */
  syncLangSeg();

  /* 5. Resizable layout: load saved sizes and attach splitters (after first paint, to measure real sizes). */
  VGE.layout.init();

  /* 6. Stacked mode: collapse button and terminal/AI toggle (delegated; only effective at the right width). */
  if(VGE.stacked) VGE.stacked.init();
  if(VGE.tour) VGE.tour.init();
})();

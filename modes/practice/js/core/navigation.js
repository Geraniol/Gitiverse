/* Return to the chapter that opened this playground, retaining its step.
   A direct/homepage visit has no lesson to return to, so this link stays
   hidden - the brand in the corner is the way home. */
'use strict';
(function () {
  var link = document.getElementById('returnToLesson');
  if (!link) return;
  var source = new URL(window.location.href).searchParams.get('returnTo');
  if (!source) return;

  try {
    /* prototype root = two levels up from this page (modes/practice/ -> root). */
    var root = new URL('../../', window.location.href);
    var target = new URL(source, root);
    /* This page's directory. Judge by directory, not filename - survives moves and renames. */
    var here = window.location.pathname.replace(/[^/]*$/, '');
    if (target.protocol !== root.protocol || target.host !== root.host ||
        target.username || target.password ||
        !target.pathname.startsWith(root.pathname) ||
        target.pathname.indexOf(here) === 0) return;
    link.href = target.href;
    link.hidden = false;
  } catch (e) { /* Invalid destinations leave this link hidden; the brand is home. */ }
})();

'use strict';
window.VGE = window.VGE || {};

(function(){

const STORE_KEY = 'vge.theme';          /* stores only 'light' | 'dark' */
const root = document.documentElement;
const media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

function stored(){
  try{ return localStorage.getItem(STORE_KEY); }catch(e){ return null; }   /* private mode */
}
function save(v){
  try{ localStorage.setItem(STORE_KEY, v); }catch(e){ /* private mode: cannot persist, but still applies now */ }
}
const systemPref = () => (media && media.matches) ? 'dark' : 'light';

/* Apply the theme. The button label is neutral ("toggle theme"), since only one string per language exists. */
/* Anything painted by script (a <canvas> cannot resolve `var()`) has to be told
   when the theme moves. Kept here, at the one choke point every path goes
   through - toggle(), init() and the system listener. */
const listeners = [];
function apply(mode){
  root.setAttribute('data-theme', mode);
  listeners.forEach(fn => { try{ fn(mode); }catch(e){ console.warn('[theme] listener failed', e); } });
}
function onChange(fn){ listeners.push(fn); }
function current(){ return root.getAttribute('data-theme') || 'light'; }
function toggle(){
  const next = current() === 'dark' ? 'light' : 'dark';
  save(next);
  apply(next);
  return next;
}
function init(){
  apply(stored() || systemPref());
  /* Follow the system only when the user has not chosen. Uses addEventListener, not the old addListener API. */
  if(media && media.addEventListener){
    media.addEventListener('change', e => {
      if(!stored()) apply(e.matches ? 'dark' : 'light');
    });
  }
}
/* Reset layout does not reset the theme; this is a reset hook for future use. */
function reset(){
  try{ localStorage.removeItem(STORE_KEY); }catch(e){ /* private mode */ }
  apply(systemPref());
}

VGE.theme = { init:init, toggle:toggle, apply:apply, current:current, reset:reset, onChange:onChange };

})();

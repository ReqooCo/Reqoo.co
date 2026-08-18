/* REQOO PKSK V65 — WRITING INTRO OVERLAY FIX */
(function(){
'use strict';
function writingVisible(){
  const w=document.getElementById('writing');
  if(!w)return false;
  const s=getComputedStyle(w);
  return s.display!=='none' && s.visibility!=='hidden' && w.getBoundingClientRect().height>0;
}
function clearStaleNav(){
  if(!writingVisible())return;
  document.body.classList.remove('nav-open');
  const nav=document.getElementById('navCard');
  if(nav)nav.classList.remove('mobile-open');
  document.documentElement.classList.remove('nav-open');
  const stale=document.querySelectorAll('.nav-backdrop,.mobile-backdrop,.backdrop');
  stale.forEach(el=>{ if(!el.closest('#writing')){el.classList.remove('active','open','show');el.setAttribute('aria-hidden','true');el.style.pointerEvents='none';} });
}
function boot(){
  clearStaleNav();
  const mo=new MutationObserver(clearStaleNav);
  mo.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style','hidden','aria-hidden']});
  setInterval(clearStaleNav,500);
  window.addEventListener('pageshow',clearStaleNav);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

/* REQOO PKSK V64 — COMPATIBILITY SHELL
   Interaction is owned by v65 unified layer. Do not attach competing click handlers here. */
(function(){
'use strict';
function clearLayers(){
  try{if(typeof window.toggleMobileNav==='function')window.toggleMobileNav(false)}catch(_){}
  document.body.classList.remove('nav-open');
  document.documentElement.classList.remove('nav-open');
  const nav=document.getElementById('navCard');
  if(nav)nav.classList.remove('mobile-open');
  document.querySelectorAll('.nav-backdrop,.mobile-backdrop,.backdrop').forEach(el=>{
    if(el.closest('#writing'))return;
    el.classList.remove('active','open','show');
    el.setAttribute('aria-hidden','true');
    el.style.pointerEvents='none';
    el.style.display='none';
  });
}
function boot(){
  clearLayers();
  const mo=new MutationObserver(clearLayers);
  mo.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style','disabled','hidden','aria-hidden']});
  setTimeout(()=>mo.disconnect(),120000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

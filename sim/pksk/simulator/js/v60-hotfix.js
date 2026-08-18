/* REQOO PKSK V60 HOTFIX
   - Force HANTAR A + B to execute on mobile even when the navigation card is open.
   - Bypass the old confirm/overlay hit-testing path and call finishAB directly.
*/
(function(){
  'use strict';
  function install(){
    if(window.__reqooV60FinishInstalled)return;
    window.__reqooV60FinishInstalled=true;
    document.addEventListener('click',function(e){
      const b=e.target&&e.target.closest?e.target.closest('.finish-btn'):null;
      if(!b)return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if(typeof window.finishAB==='function' && window.phase==='ab'){
        window.finishAB(false);
      }
    },true);
    document.addEventListener('touchend',function(e){
      const b=e.target&&e.target.closest?e.target.closest('.finish-btn'):null;
      if(!b)return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if(typeof window.finishAB==='function' && window.phase==='ab'){
        window.finishAB(false);
      }
    },true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();

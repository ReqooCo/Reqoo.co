/* REQOO PKSK V64 — HARDEN BAHAGIAN C SUBMIT */
(function(){
'use strict';
function words(){const e=document.getElementById('essay');const t=String(e&&e.value||'').trim();return t?t.split(/\s+/).filter(Boolean).length:0;}
function bind(){
 const b=[...document.querySelectorAll('#writing button')].find(x=>String(x.textContent||'').includes('HANTAR BAHAGIAN C'));
 const e=document.getElementById('essay');
 if(!b||!e)return false;
 if(b.dataset.v64Bound==='1')return true;
 b.dataset.v64Bound='1';b.type='button';b.removeAttribute('onclick');
 b.addEventListener('click',function(ev){
   ev.preventDefault();ev.stopPropagation();
   const n=words(),status=document.getElementById('minStatus');
   if(n<100){
     if(status){status.textContent=`Minimum 100 patah perkataan — masih kurang ${100-n} patah perkataan`;status.className='warn';}
     e.focus();try{e.scrollIntoView({behavior:'smooth',block:'center'});}catch(_){ }
     return false;
   }
   if(typeof window.finishWriting==='function'){
     try{window.finishWriting(false);}catch(err){
       try{if(typeof window.pkskReportError==='function')window.pkskReportError('WRITE_SUBMIT_FAILED',err&&err.message||String(err));}catch(_){ }
       if(status){status.textContent='Ralat semasa menghantar. Sila cuba sekali lagi.';status.className='bad';}
     }
   }
   return false;
 },true);
 return true;
}
function boot(){if(bind())return;const mo=new MutationObserver(()=>{if(bind())mo.disconnect()});mo.observe(document.documentElement,{subtree:true,childList:true});setTimeout(()=>mo.disconnect(),30000);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

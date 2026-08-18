/* REQOO PKSK V64 — BAHAGIAN C CONTROLS */
(function(){
'use strict';
function words(){const e=document.getElementById('essay');const t=String(e&&e.value||'').trim();return t?t.split(/\s+/).filter(Boolean).length:0;}
function findButton(text){return [...document.querySelectorAll('button')].find(x=>String(x.textContent||'').replace(/\s+/g,' ').trim().includes(text));}
function bindCStart(){
 const b=findButton('MULA BAHAGIAN C');
 if(!b)return false;
 if(b.dataset.v64StartBound==='1')return true;
 b.dataset.v64StartBound='1';
 b.type='button';
 b.removeAttribute('onclick');
 b.disabled=false;
 b.style.pointerEvents='auto';
 b.style.position='relative';
 b.style.zIndex='10001';
 b.addEventListener('click',function(ev){
   ev.preventDefault();ev.stopPropagation();
   try{
     if(typeof window.startWriting==='function'){window.startWriting();return false;}
     const w=document.getElementById('writing');
     if(w){document.querySelectorAll('section').forEach(x=>x.classList.add('hidden'));w.classList.remove('hidden');}
   }catch(err){
     try{if(typeof window.pkskReportError==='function')window.pkskReportError('WRITE_START_FAILED',err&&err.message||String(err));}catch(_){ }
   }
   return false;
 },true);
 return true;
}
function bindSubmit(){
 const b=[...document.querySelectorAll('#writing button')].find(x=>String(x.textContent||'').includes('HANTAR BAHAGIAN C'));
 const e=document.getElementById('essay');
 if(!b||!e)return false;
 if(b.dataset.v64Bound==='1')return true;
 b.dataset.v64Bound='1';b.type='button';b.removeAttribute('onclick');b.disabled=false;b.style.pointerEvents='auto';b.style.position='relative';b.style.zIndex='10001';
 b.addEventListener('click',function(ev){
   ev.preventDefault();ev.stopPropagation();
   const n=words(),status=document.getElementById('minStatus');
   if(status){status.textContent=n>=100?'✓ Minimum dicapai':`Minimum 100 patah perkataan — jawapan tetap boleh dihantar (${n} patah perkataan)`;status.className=n>=100?'good':'warn';}
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
function bind(){return bindCStart()||bindSubmit();}
function boot(){
 let tries=0;
 const run=()=>{tries++;const a=bindCStart(),b=bindSubmit();if(a&&b)return;if(tries<120)setTimeout(run,250);};
 run();
 const mo=new MutationObserver(()=>{bindCStart();bindSubmit();});
 mo.observe(document.documentElement,{subtree:true,childList:true});
 setTimeout(()=>mo.disconnect(),60000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

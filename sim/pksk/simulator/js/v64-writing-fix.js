/* REQOO PKSK V64 — CANONICAL BAHAGIAN C CONTROLLER */
(function(){
'use strict';

function wordCount(){
  const e=document.getElementById('essay');
  const t=String(e&&e.value||'').trim();
  return t?t.split(/\s+/).filter(Boolean).length:0;
}

function clearNavState(){
  try{ if(typeof window.toggleMobileNav==='function') window.toggleMobileNav(false); }catch(_){}
  document.body.classList.remove('nav-open');
  document.documentElement.classList.remove('nav-open');
  const nav=document.getElementById('navCard');
  if(nav)nav.classList.remove('mobile-open');
  document.querySelectorAll('.nav-backdrop,.mobile-backdrop,.backdrop').forEach(el=>{
    el.classList.remove('active','open','show');
    el.setAttribute('aria-hidden','true');
    el.style.pointerEvents='none';
  });
}

function setButtonReady(b){
  if(!b)return;
  b.type='button';
  b.disabled=false;
  b.removeAttribute('disabled');
  b.style.pointerEvents='auto';
  b.style.touchAction='manipulation';
  b.style.position='relative';
  b.style.zIndex='10001';
}

function findStart(){
  return [...document.querySelectorAll('#briefing button, button')]
    .find(b=>/MULA BAHAGIAN C/i.test(String(b.textContent||'')));
}

function findSubmit(){
  return [...document.querySelectorAll('#writing button')]
    .find(b=>/HANTAR BAHAGIAN C/i.test(String(b.textContent||'')));
}

function bindStart(){
  const b=findStart();
  if(!b)return false;
  if(b.dataset.reqooCStart==='1')return true;
  b.dataset.reqooCStart='1';
  setButtonReady(b);
  b.onclick=null;
  b.addEventListener('click',function(ev){
    ev.preventDefault();
    ev.stopPropagation();
    ev.stopImmediatePropagation();
    clearNavState();
    try{
      if(typeof window.startWriting==='function') window.startWriting();
      else {
        const w=document.getElementById('writing');
        document.querySelectorAll('section').forEach(x=>x.classList.add('hidden'));
        if(w)w.classList.remove('hidden');
      }
    }catch(err){
      try{window.pkskReportError?.('WRITE_START_FAILED',err?.message||String(err));}catch(_){}
    }
  },true);
  return true;
}

function bindSubmit(){
  const b=findSubmit();
  const e=document.getElementById('essay');
  if(!b||!e)return false;
  if(b.dataset.reqooCSubmit==='1')return true;
  b.dataset.reqooCSubmit='1';
  setButtonReady(b);
  b.onclick=null;
  b.addEventListener('click',function(ev){
    ev.preventDefault();
    ev.stopPropagation();
    ev.stopImmediatePropagation();
    const n=wordCount();
    const status=document.getElementById('minStatus');
    if(status){
      status.textContent=n>=100?'✓ Minimum dicapai':`Minimum 100 patah perkataan — jawapan tetap boleh dihantar (${n} patah perkataan)`;
      status.className=n>=100?'good':'warn';
    }
    try{
      if(typeof window.finishWriting==='function') window.finishWriting(false);
    }catch(err){
      try{window.pkskReportError?.('WRITE_SUBMIT_FAILED',err?.message||String(err));}catch(_){}
      if(status){status.textContent='Ralat semasa menghantar. Sila cuba sekali lagi.';status.className='bad';}
    }
  },true);
  return true;
}

function keepWritingInteractive(){
  const w=document.getElementById('writing');
  if(!w||w.classList.contains('hidden'))return;
  clearNavState();
  w.style.position='relative';
  w.style.zIndex='30';
  const e=document.getElementById('essay');
  if(e){e.style.position='relative';e.style.zIndex='31';e.style.pointerEvents='auto';}
  w.querySelectorAll('button').forEach(setButtonReady);
}

function boot(){
  let tries=0;
  const run=()=>{
    tries++;
    const a=bindStart();
    const b=bindSubmit();
    keepWritingInteractive();
    if(tries<160 && (!a||!b))setTimeout(run,250);
  };
  run();
  const mo=new MutationObserver(()=>{
    bindStart();bindSubmit();keepWritingInteractive();
  });
  mo.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style','disabled','hidden','aria-hidden']});
  setTimeout(()=>mo.disconnect(),60000);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();

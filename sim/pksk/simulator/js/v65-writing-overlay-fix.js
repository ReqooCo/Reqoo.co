/* REQOO PKSK — UNIFIED INTERACTION PATCH
   One interaction layer for A+B briefing, C briefing and C submit.
   Important: this file does not change bank content, scoring rules or Section A mixing.
*/
(function(){
'use strict';

const $=id=>document.getElementById(id);

function visible(id){
  const el=$(id);
  if(!el)return false;
  const s=getComputedStyle(el);
  return !el.classList.contains('hidden') && s.display!=='none' && s.visibility!=='hidden' && el.getBoundingClientRect().height>0;
}

/* Remove stale mobile-navigation/backdrop layers before ANY exam CTA is tapped.
   The previous patch only did this after Writing was visible, leaving the C briefing
   underneath an invisible/click-blocking layer. */
function clearStaleLayers(){
  const active=visible('briefing')||visible('exam')||visible('writing')||visible('result');
  if(!active)return;
  try{ if(typeof window.toggleMobileNav==='function') window.toggleMobileNav(false); }catch(_){}
  document.body.classList.remove('nav-open');
  document.documentElement.classList.remove('nav-open');
  const nav=$('navCard');
  if(nav)nav.classList.remove('mobile-open');
  document.querySelectorAll('.nav-backdrop,.mobile-backdrop,.backdrop').forEach(el=>{
    if(el.closest('#writing'))return;
    el.classList.remove('active','open','show');
    el.setAttribute('aria-hidden','true');
    el.style.pointerEvents='none';
    el.style.display='none';
  });
}

function prepareButton(b){
  if(!b)return;
  b.type='button';
  b.disabled=false;
  b.removeAttribute('disabled');
  b.style.pointerEvents='auto';
  b.style.touchAction='manipulation';
  b.style.position='relative';
  b.style.zIndex='10002';
}

function startButton(){
  return [...document.querySelectorAll('#briefing button,button')]
    .find(b=>/MULA BAHAGIAN (?:A\s*\+\s*B|C)/i.test(String(b.textContent||'')));
}

function submitButton(){
  return [...document.querySelectorAll('#writing button,button')]
    .find(b=>/HANTAR BAHAGIAN C/i.test(String(b.textContent||'')));
}

function bindStart(){
  const b=startButton();
  if(!b)return false;
  if(b.dataset.reqooUnifiedStart==='1')return true;
  b.dataset.reqooUnifiedStart='1';
  prepareButton(b);
  b.onclick=null;
  b.addEventListener('click',function(ev){
    ev.preventDefault();
    ev.stopPropagation();
    ev.stopImmediatePropagation();
    clearStaleLayers();
    const text=String(b.textContent||'');
    try{
      if(/BAHAGIAN C/i.test(text)){
        if(typeof window.startWriting==='function')window.startWriting();
        else { const w=$('writing'); document.querySelectorAll('section').forEach(x=>x.classList.add('hidden')); if(w)w.classList.remove('hidden'); }
      }else{
        if(typeof window.startAB==='function')window.startAB();
      }
    }catch(err){
      try{window.pkskReportError?.('UNIFIED_START_FAILED',err?.message||String(err));}catch(_){}
    }
  },true);
  return true;
}

function wordCount(){
  const e=$('essay');
  const t=String(e&&e.value||'').trim();
  return t?t.split(/\s+/).filter(Boolean).length:0;
}

function bindSubmit(){
  const b=submitButton(),e=$('essay');
  if(!b||!e)return false;
  if(b.dataset.reqooUnifiedSubmit==='1')return true;
  b.dataset.reqooUnifiedSubmit='1';
  prepareButton(b);
  b.onclick=null;
  b.addEventListener('click',function(ev){
    ev.preventDefault();
    ev.stopPropagation();
    ev.stopImmediatePropagation();
    const n=wordCount(),status=$('minStatus');
    /* Word count is feedback only. It MUST NOT block submission. */
    if(status){
      status.textContent=n>=100?'✓ Minimum dicapai':`Minimum 100 patah perkataan — jawapan tetap boleh dihantar (${n} patah perkataan)`;
      status.className=n>=100?'good':'warn';
    }
    try{
      if(typeof window.finishWriting==='function')window.finishWriting(false);
      else try{window.pkskReportError?.('WRITE_SUBMIT_MISSING','finishWriting tidak tersedia');}catch(_){}
    }catch(err){
      try{window.pkskReportError?.('WRITE_SUBMIT_FAILED',err?.message||String(err));}catch(_){}
      if(status){status.textContent='Ralat semasa menghantar. Sila cuba sekali lagi.';status.className='bad';}
    }
  },true);
  return true;
}

function keepInteractive(){
  clearStaleLayers();
  const briefing=$('briefing');
  if(briefing&&visible('briefing')){
    briefing.style.position='relative';
    briefing.style.zIndex='40';
    briefing.style.pointerEvents='auto';
    const b=startButton();
    if(b)prepareButton(b);
  }
  const writing=$('writing');
  if(writing&&visible('writing')){
    writing.style.position='relative';
    writing.style.zIndex='40';
    writing.style.pointerEvents='auto';
    const e=$('essay');
    if(e){e.style.position='relative';e.style.zIndex='41';e.style.pointerEvents='auto';e.style.touchAction='manipulation';}
    writing.querySelectorAll('button').forEach(prepareButton);
  }
}

function boot(){
  let tries=0;
  const run=()=>{
    tries++;
    clearStaleLayers();
    const a=bindStart();
    const b=bindSubmit();
    keepInteractive();
    if(tries<240 && (!a||!b))setTimeout(run,250);
  };
  run();
  const mo=new MutationObserver(()=>{
    clearStaleLayers();
    bindStart();
    bindSubmit();
    keepInteractive();
  });
  mo.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style','disabled','hidden','aria-hidden']});
  setTimeout(()=>mo.disconnect(),120000);
  window.addEventListener('pageshow',()=>{clearStaleLayers();bindStart();bindSubmit();keepInteractive();});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();

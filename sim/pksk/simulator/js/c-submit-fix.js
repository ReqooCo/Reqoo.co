(function(){
  function findButton(){
    return Array.from(document.querySelectorAll('button')).find(function(btn){
      const t=(btn.textContent||'').replace(/\s+/g,' ').trim().toUpperCase();
      return t.includes('HANTAR BAHAGIAN C');
    });
  }

  function bind(){
    const btn=findButton();
    if(!btn||btn.__cSubmitFix)return;
    btn.__cSubmitFix=true;
    btn.type='button';
    btn.removeAttribute('onclick');
    btn.addEventListener('click',function(e){
      e.preventDefault();
      e.stopPropagation();
      if(typeof phase!=='undefined'&&phase!=='c')return;
      if(typeof finishWriting!=='function')return;
      btn.disabled=true;
      const old=btn.textContent;
      btn.textContent='MEMPROSES...';
      try{
        finishWriting(false);
      }catch(err){
        console.error('[PKSK C SUBMIT]',err);
        btn.disabled=false;
        btn.textContent=old;
        const status=document.getElementById('minStatus');
        if(status)status.textContent='Ralat menghantar. Sila cuba sekali lagi.';
      }
    },false);
  }

  bind();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);
  const observer=new MutationObserver(bind);
  observer.observe(document.body,{childList:true,subtree:true});
  setInterval(bind,1000);
})();

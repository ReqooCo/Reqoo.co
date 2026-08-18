(function(){
  function syncUrl(){
    const sel=document.getElementById('setSelect');
    if(!sel)return;
    const n=Number(sel.value);
    if(!Number.isInteger(n)||n<1||n>50)return;
    const url=new URL(window.location.href);
    url.searchParams.set('set',String(n));
    window.history.replaceState({set:n},'',url.toString());
  }

  function bind(){
    const sel=document.getElementById('setSelect');
    if(!sel||sel.__setUrlFix)return;
    sel.__setUrlFix=true;
    sel.addEventListener('change',function(){
      // selectSet() loads the selected JSON asynchronously. Keep the URL
      // aligned with the user's selected set after the app accepts it.
      setTimeout(syncUrl,0);
    });
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);
  else bind();
  const observer=new MutationObserver(bind);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  setInterval(bind,1000);
})();

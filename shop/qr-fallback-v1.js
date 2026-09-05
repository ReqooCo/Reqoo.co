(()=>{
'use strict';
const FALLBACK='/shop/maybank-qr.jpg';
function guard(root=document){
  root.querySelectorAll('img.qr,#qrPreview img').forEach(img=>{
    if(img.dataset.reqooQrGuard==='1')return;
    img.dataset.reqooQrGuard='1';
    img.dataset.reqooQrOriginal=img.getAttribute('src')||'';
    img.src=FALLBACK;
    img.addEventListener('error',()=>{
      if(img.dataset.reqooQrFallbackApplied==='1')return;
      img.dataset.reqooQrFallbackApplied='1';
      img.src=FALLBACK;
    },{once:true});
  });
}
const observer=new MutationObserver(mutations=>mutations.forEach(m=>m.addedNodes.forEach(n=>{
  if(n.nodeType===1)guard(n);
})));
observer.observe(document.documentElement,{childList:true,subtree:true});
guard();
})();

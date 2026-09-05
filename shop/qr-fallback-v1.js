(()=>{
'use strict';
const FALLBACK='/shop/maybank-qr.jpg';
function guard(root=document){root.querySelectorAll('img.qr,#qrPreview img').forEach(img=>{
  if(img.dataset.reqooQrFallback==='1')return;
  img.dataset.reqooQrFallback='1';
  img.addEventListener('error',()=>{
    if(img.dataset.reqooQrFallbackApplied==='1')return;
    img.dataset.reqooQrFallbackApplied='1';
    img.src=FALLBACK;
  },{once:true});
});}
new MutationObserver(mutations=>mutations.forEach(m=>m.addedNodes.forEach(n=>{if(n.nodeType===1)guard(n)}))).observe(document.documentElement,{childList:true,subtree:true});
guard();
})();

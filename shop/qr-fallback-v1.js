(()=>{
'use strict';
const FALLBACK='/shop/maybank-qr.jpg';
function guard(root=document){
  const nodes=[];
  if(root.nodeType===1&&root.matches?.('img.qr,#qrPreview img'))nodes.push(root);
  if(root.querySelectorAll)nodes.push(...root.querySelectorAll('img.qr,#qrPreview img'));
  nodes.forEach(img=>{
    if(img.dataset.reqooQrFallback==='1')return;
    img.dataset.reqooQrFallback='1';
    const src=String(img.getAttribute('src')||'');
    if(/maybank-qr-premium\.svg(?:\?|$)/i.test(src)){
      img.dataset.reqooQrFallbackApplied='1';
      img.src=FALLBACK;
      return;
    }
    img.addEventListener('error',()=>{
      if(img.dataset.reqooQrFallbackApplied==='1')return;
      img.dataset.reqooQrFallbackApplied='1';
      img.src=FALLBACK;
    },{once:true});
  });
}
new MutationObserver(mutations=>mutations.forEach(m=>m.addedNodes.forEach(n=>{if(n.nodeType===1)guard(n)}))).observe(document.documentElement,{childList:true,subtree:true});
guard();
})();

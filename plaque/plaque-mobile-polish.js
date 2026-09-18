(()=>{'use strict';
const FALLBACK='/plaque/assets/v5/hero-plaque.webp?v=3';
function fixImage(img){
  if(!img || img.dataset.rqFallbackBound==='1') return;
  img.dataset.rqFallbackBound='1';
  img.addEventListener('error',()=>{
    if(img.src.includes('hero-plaque.webp')) return;
    img.src=FALLBACK;
  },{once:true});
}
function bindImages(root=document){
  root.querySelectorAll('img').forEach(fixImage);
}
function toggleBar(){
  const bar=document.getElementById('mobileLandingBar');
  if(!bar) return;
  const show=window.innerWidth<=700 &&
    !document.body.classList.contains('modalOpen') &&
    window.scrollY>520;
  bar.classList.toggle('is-visible',show);
}
document.addEventListener('DOMContentLoaded',()=>{
  bindImages();
  toggleBar();
  const observer=new MutationObserver(muts=>{
    for(const m of muts){
      for(const n of m.addedNodes){
        if(n.nodeType!==1) continue;
        if(n.tagName==='IMG') fixImage(n);
        if(n.querySelectorAll) bindImages(n);
      }
    }
    toggleBar();
  });
  observer.observe(document.body,{childList:true,subtree:true});
});
window.addEventListener('scroll',toggleBar,{passive:true});
window.addEventListener('resize',toggleBar);
window.addEventListener('pageshow',()=>{bindImages();toggleBar()});
})();
(()=>{'use strict';const API='https://api.reqoo.co',ID='__SHOP_VISUALS__',N=11;const arr=v=>{try{const x=typeof v==='string'?JSON.parse(v):v;return Array.isArray(x)?x:[]}catch{return[]}},bust=u=>{if(!u)return'';return String(u)+(String(u).includes('?')?'&':'?')+'v='+Date.now()};
async function getVisuals(){
  let v=[];
  try{const r=await fetch(API+'/api/shop-visuals?t='+Date.now(),{cache:'no-store'});if(r.ok){const j=await r.json();v=arr(j.images)}}catch(e){}
  if(!v.some(Boolean)){
    try{const r=await fetch(API+'/api/products?t='+Date.now(),{cache:'no-store'});if(r.ok){const j=await r.json();const p=(j.products||[]).find(x=>String(x.id)===ID);v=arr(p?.images)}}catch(e){}
  }
  return Array.from({length:N},(_,i)=>v[i]||'');
}
function apply(v){
  const d=v[0],m=v[1]||d;if(!d&&!m)return false;
  window.__REQOO_CUSTOM_HERO__=true;
  const hero=()=>{const u=bust(innerWidth<=760?m:d);if(!u)return;document.querySelectorAll('#heroMainImage,#heroSideImage1,#heroSideImage2').forEach(x=>{x.src=u;x.removeAttribute('srcset');x.style.display='block';x.style.opacity='1';x.style.visibility='visible'});const main=document.querySelector('.hero-product-main');if(main){main.style.backgroundImage=`url("${u}")`;main.style.backgroundSize='cover';main.style.backgroundPosition='center'}};
  hero();
  const f=document.querySelector('.featured-dark'),l=document.querySelector('.featured-light');[[f,v[7]],[l,v[8]]].forEach(([e,u])=>{if(e&&u){e.style.backgroundImage=`linear-gradient(90deg,rgba(15,12,8,.92),rgba(15,12,8,.48)),url("${bust(u)}")`;e.style.backgroundSize='cover';e.style.backgroundPosition='center'}});
  addEventListener('resize',hero,{passive:true});
  setInterval(hero,1000);setTimeout(hero,500);setTimeout(hero,2000);setTimeout(hero,5000);return true;
}
async function load(){try{const v=await getVisuals();apply(v)}catch(e){}}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load);else load()})();
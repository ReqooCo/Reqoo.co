(()=>{
'use strict';
const API='/api/shop';
const MEDIA='/api/shop-media';
const money=n=>'RM'+Number(n||0).toFixed(2);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const img=u=>{u=String(u||'').trim();if(!u)return '';if(/^https?:\/\//i.test(u)||u.startsWith('/'))return u;return new URL(u.replace(/^\.\//,''),location.href).href};
let lastProducts=[];
function normalizeVariant(v){
  if(Array.isArray(v))return [String(v[0]??''),Number(v[1]??0),v[2]||'',v[3]||''];
  if(v&&typeof v==='object')return [String(v.name??v.title??''),Number(v.price??v.priceMinor/100??0),v.image||'',v.id||''];
  return null;
}
async function transformProductsResponse(response){
  try{
    const j=await response.clone().json();
    if(!j||!Array.isArray(j.products))return response;
    lastProducts=j.products;
    const products=j.products.map(p=>({...p,variants:(Array.isArray(p.variants)?p.variants:[]).map(normalizeVariant).filter(v=>v&&v[0])}));
    return new Response(JSON.stringify({...j,products}),{status:response.status,statusText:response.statusText,headers:new Headers(response.headers)});
  }catch(e){return response}
}
const nativeFetch=window.fetch.bind(window);
window.fetch=async function(input,init){
  const url=typeof input==='string'?input:(input&&input.url)||'';
  const response=await nativeFetch(input,init);
  if(/\/api\/shop(?:\?|$)/i.test(url)&&/[?&]action=listProducts(?:&|$)/i.test(url))return transformProductsResponse(response);
  return response;
};
async function media(action,id){try{const r=await nativeFetch(MEDIA+'?action='+action+'&productId='+encodeURIComponent(id)+'&_='+Date.now(),{cache:'no-store'});const j=await r.json();return j.ok?j:{}}catch(e){return {}}}
function modal(){return document.getElementById('modal')}
function addGallery(m,urls){
  const main=m?.querySelector('.two>div:first-child');if(!main||!urls.length)return;
  let g=main.querySelector('.reqoo-v8-gallery');
  if(!g){g=document.createElement('div');g.className='reqoo-v8-gallery';g.style.cssText='display:flex;gap:8px;flex-wrap:wrap;margin-top:10px';main.appendChild(g)}
  g.innerHTML=urls.map((u,i)=>`<button type="button" data-src="${esc(img(u))}" aria-label="Gambar ${i+1}" style="width:58px;height:58px;padding:0;border:1px solid ${i?'#444':'#d9b45e'};background:#080808;border-radius:8px;overflow:hidden"><img src="${esc(img(u))}" alt="" style="width:100%;height:100%;object-fit:cover"></button>`).join('');
  const mainImg=main.querySelector(':scope > img');
  g.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{if(mainImg)mainImg.src=b.dataset.src;g.querySelectorAll('button').forEach(x=>x.style.borderColor='#444');b.style.borderColor='#d9b45e'}));
}
function makeVariantButtons(m){
  const sel=m?.querySelector('#variant');if(!sel||sel.dataset.v8==='1')return;
  const opts=[...sel.options];if(!opts.length)return;
  sel.dataset.v8='1';sel.style.display='none';
  const wrap=document.createElement('div');wrap.className='reqoo-v8-variants';wrap.style.cssText='display:flex;gap:8px;flex-wrap:wrap;margin:4px 0 10px';
  opts.forEach((o,i)=>{const b=document.createElement('button');b.type='button';b.dataset.index=String(i);b.style.cssText='flex:1 1 120px;min-height:46px;padding:9px 12px;border:1px solid #3a3a3a;border-radius:11px;background:#0b0b0b;color:#fff;font-weight:700;text-align:left;cursor:pointer';b.innerHTML=esc(o.textContent||o.value);b.onclick=()=>{sel.value=String(i);sel.dispatchEvent(new Event('change',{bubbles:true}));wrap.querySelectorAll('button').forEach(x=>{x.style.borderColor='#3a3a3a';x.style.background='#0b0b0b'});b.style.borderColor='#d9b45e';b.style.background='#171208'};wrap.appendChild(b)});
  sel.parentNode.insertBefore(wrap,sel);
  wrap.querySelector('button')?.click();
}
async function enhanceModal(){
  const m=modal();if(!m?.classList.contains('open'))return;
  const title=m.querySelector('#mTitle')?.textContent?.trim();if(!title)return;
  const p=lastProducts.find(x=>String(x.name||'').trim().toLowerCase()===title.toLowerCase());if(!p)return;
  const label=[...m.querySelectorAll('label')].find(x=>/Pilihan\s*\/\s*saiz/i.test(x.textContent||''));if(label)label.textContent='Pilihan / variasi';
  makeVariantButtons(m);
  const v=await media('variantImages',p.id),g=await media('listImages',p.id);
  const variantImgs=(v.variants||[]).map(x=>x.image).filter(Boolean);
  const images=(g.images||[]).map(x=>x.url||x.image||x).filter(Boolean);
  const all=[...new Set([...(images.length?images:[]),...variantImgs])];
  if(all.length>1)addGallery(m,all);
}
function observe(){
  const run=()=>{setTimeout(enhanceModal,20);setTimeout(enhanceModal,250);setTimeout(enhanceModal,700)};
  document.addEventListener('click',e=>{const b=e.target.closest?.('[data-product-id]');if(b)run()},{capture:true});
  const mo=new MutationObserver(muts=>{for(const x of muts){if(x.type==='attributes'||x.addedNodes?.length){const m=modal();if(m?.classList.contains('open')){run();break}}}});
  if(document.body)mo.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
  run();
}
function start(){observe();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();

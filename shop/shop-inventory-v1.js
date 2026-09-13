(()=>{
'use strict';
const API='/api/shop?action=listProducts',CART_KEY='reqoo_shop_cart_v4',LOW=5;
let catalog=new Map(),timer=0;
const num=v=>v==null||v===''?null:Number(v);
function readCart(){try{const x=JSON.parse(localStorage.getItem(CART_KEY)||'[]');return Array.isArray(x)?x:[]}catch{return []}}
function variantMap(){const out=new Map();for(const p of catalog.values())for(const v of p.variants||[])out.set(`${p.id}|${v.id||v.name}`,v);return out}
function productState(p){const vs=(p?.variants||[]).filter(v=>v.active!==false);if(!vs.length)return{kind:'none'};const tracked=vs.filter(v=>num(v.stock)!==null);if(!tracked.length)return{kind:'open'};if(vs.every(v=>num(v.stock)!==null&&num(v.stock)<=0))return{kind:'out'};if(vs.every(v=>num(v.stock)!==null)&&tracked.reduce((s,v)=>s+Math.max(0,num(v.stock)||0),0)<=LOW)return{kind:'low'};return{kind:'open'};}
function badge(card,text,kind){let b=card.querySelector('.inventoryBadge');if(!b){b=document.createElement('span');b.className='inventoryBadge';const body=card.querySelector('.productBody');body?.insertBefore(b,body.querySelector('h3')||body.firstChild)}b.className=`inventoryBadge ${kind}`;b.textContent=text;}
function decorateProducts(){document.querySelectorAll('.productCard').forEach(card=>{const id=card.querySelector('[data-product]')?.dataset.product,p=catalog.get(String(id||''));if(!p)return;const state=productState(p),btn=card.querySelector('.shopBtn[data-product]');if(state.kind==='out'){badge(card,'STOK HABIS','out');if(btn){btn.textContent='Stok habis';btn.disabled=true;btn.setAttribute('aria-disabled','true')}}else if(state.kind==='low'){badge(card,'STOK RENDAH','low');if(btn?.disabled){btn.disabled=false;btn.removeAttribute('aria-disabled');btn.textContent='Lihat pilihan'}}else card.querySelector('.inventoryBadge')?.remove();});}
function cartLimit(item,m){const v=m.get(`${item.productId}|${item.variantId||item.variant}`);return num(v?.stock);}
function decorateCart(){const cart=readCart(),m=variantMap();document.querySelectorAll('#drawer [data-qty][data-delta="1"]').forEach(btn=>{const i=Number(btn.dataset.qty),item=cart[i],limit=item?cartLimit(item,m):null;if(limit!==null&&item&&Number(item.q)>=limit){btn.disabled=true;btn.title='Stok maksimum telah dipilih';}})}
function decorate(){decorateProducts();decorateCart()}
function schedule(){clearTimeout(timer);timer=setTimeout(decorate,40)}
async function refresh(){try{const r=await fetch(API,{cache:'no-store'}),j=await r.json();if(!r.ok||j.ok===false)return;catalog=new Map((j.products||[]).map(p=>[String(p.id),p]));decorate()}catch{}}
document.addEventListener('click',e=>{const plus=e.target.closest('#drawer [data-qty][data-delta="1"]');if(!plus)return;const cart=readCart(),item=cart[Number(plus.dataset.qty)],limit=item?cartLimit(item,variantMap()):null;if(limit!==null&&item&&Number(item.q)>=limit){e.preventDefault();e.stopImmediatePropagation();const box=document.querySelector('#drawer [data-status]');if(box){box.hidden=false;box.textContent='Kuantiti maksimum ikut stok tersedia telah dicapai.'}}},true);
new MutationObserver(schedule).observe(document.documentElement,{subtree:true,childList:true});
window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
refresh();setInterval(refresh,60000);
})();

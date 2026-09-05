(()=>{
'use strict';
const API='/api/shop?action=listProducts';
let stockMap=new Map(),selectedProduct='',selectedVariant=0;
const nativeFetch=window.fetch.bind(window);
function key(id){return String(id??'')}
function build(products){stockMap=new Map((Array.isArray(products)?products:[]).map(p=>[key(p.id),p]));refresh()}
async function watchFetch(input){try{const url=new URL(typeof input==='string'?input:input?.url||'',location.href);if(url.pathname==='/api/shop'&&url.searchParams.get('action')==='listProducts'){const r=await nativeFetch(input);r.clone().json().then(j=>build(j.products||[])).catch(()=>{});return r}}catch{}return nativeFetch(input)}
window.fetch=watchFetch;
function product(id){return stockMap.get(key(id))}
function variantStock(p,index){const vars=Array.isArray(p?.variants)?p.variants:[];const v=vars[index];if(!v)return null;return v.stock==null||v.stock===''?null:Number(v.stock)}
function soldOut(p){const vars=Array.isArray(p?.variants)?p.variants.filter(v=>v&&v.price>0):[];return vars.length>0&&vars.every(v=>v.stock!=null&&Number(v.stock)<=0)}
function markCard(btn,p){if(!btn||!p)return;if(soldOut(p)){btn.disabled=true;btn.textContent='Stok Habis';btn.setAttribute('aria-disabled','true');btn.style.opacity='.48';btn.style.cursor='not-allowed'}else if(btn.dataset.reqooStockDisabled==='1'){btn.disabled=false;btn.textContent='Pilih';btn.removeAttribute('aria-disabled');btn.style.opacity='';btn.style.cursor='';delete btn.dataset.reqooStockDisabled}}
function refreshCards(){document.querySelectorAll('[data-product]').forEach(btn=>{const p=product(btn.dataset.product);if(!p)return;markCard(btn,p)})}
function refreshModal(){const modal=document.getElementById('modal');if(!modal?.classList.contains('open')||!selectedProduct)return;const p=product(selectedProduct);if(!p)return;const vars=Array.isArray(p.variants)&&p.variants.length?p.variants:(Number(p.basePrice||0)>0?[{name:'Standard',price:Number(p.basePrice),stock:null}]:[]);modal.querySelectorAll('[data-v]').forEach(btn=>{const i=Number(btn.dataset.v),s=variantStock({variants:vars},i),disabled=s!==null&&s<=0;btn.disabled=disabled;btn.style.opacity=disabled?'.42':'';btn.style.cursor=disabled?'not-allowed':'';const small=btn.querySelector('small');if(small&&!small.dataset.reqooOriginal)small.dataset.reqooOriginal=small.textContent;if(disabled&&small)small.textContent='Stok Habis';else if(small&&small.dataset.reqooOriginal)small.textContent=small.dataset.reqooOriginal});const q=modal.querySelector('#detailQty'),add=modal.querySelector('#addToCart');const s=variantStock({variants:vars},selectedVariant);if(q){q.min='1';if(s!==null){q.max=String(Math.max(1,s));if(Number(q.value)>s)q.value=String(Math.max(1,s));if(s<=0)q.value='1'}else q.removeAttribute('max')}if(add){const blocked=s!==null&&s<=0;add.disabled=blocked;add.style.opacity=blocked?'.48':'';add.style.cursor=blocked?'not-allowed':'';add.textContent=blocked?'Stok Habis':'Tambah ke Cart'}}
function refresh(){refreshCards();refreshModal()}
document.addEventListener('click',e=>{const card=e.target.closest('[data-product]');if(card&&!card.disabled){selectedProduct=card.dataset.product;selectedVariant=0;setTimeout(refreshModal,0);return}const v=e.target.closest('#modal [data-v]');if(v&&!v.disabled){selectedVariant=Number(v.dataset.v);setTimeout(refreshModal,0)}},true);
document.addEventListener('input',e=>{if(e.target.id!=='detailQty'||!selectedProduct)return;const p=product(selectedProduct),s=variantStock(p,selectedVariant);if(s!==null&&Number(e.target.value)>s)e.target.value=String(s);if(Number(e.target.value)<1)e.target.value='1'},true);
new MutationObserver(()=>refresh()).observe(document.documentElement,{childList:true,subtree:true});
})();

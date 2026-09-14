(()=>{
'use strict';
const ADMIN_WA='60103982803';
function addButton(){
 const modal=document.getElementById('checkout');
 const success=modal?.querySelector('.successModal');
 if(!success||success.querySelector('#whatsappOrder'))return;
 const ref=success.querySelector('.orderRef')?.textContent?.trim()||'';
 const amount=Array.from(success.querySelectorAll('b')).map(x=>x.textContent?.trim()).find(x=>/^RM\d+(?:\.\d{2})?$/.test(x))||'';
 const text=`Assalamualaikum REQOO, saya baru membuat order ${ref ? ref+' ' : ''}${amount ? 'berjumlah '+amount+'. ' : ''}Mohon semak order saya. Terima kasih.`;
 const a=document.createElement('a');
 a.id='whatsappOrder';a.className='shopBtn wide';a.href=`https://wa.me/${ADMIN_WA}?text=${encodeURIComponent(text)}`;a.target='_blank';a.rel='noopener';a.textContent='WhatsApp Admin';a.style.background='#25D366';a.style.color='#fff';
 success.querySelector('#doneCheckout')?.before(a);
}

const galleryCache=new Map();
async function fetchGallery(productId){
 if(!productId)return [];
 if(galleryCache.has(productId))return galleryCache.get(productId);
 const u=new URL('/api/shop',location.origin);u.searchParams.set('action','listProductImages');u.searchParams.set('productId',productId);
 try{const r=await fetch(u,{cache:'no-store'}),d=await r.json();const images=r.ok&&d.ok&&Array.isArray(d.images)?d.images.map(x=>x.url).filter(Boolean):[];galleryCache.set(productId,images);return images}catch{return []}
}
function injectGallery(productId,images){
 const modal=document.getElementById('modal'),thumbs=modal?.querySelector('#thumbs'),main=modal?.querySelector('#detailImage');
 if(!thumbs||!main||!images.length)return;
 const existing=new Set([...thumbs.querySelectorAll('.thumb')].map(x=>x.dataset.src).filter(Boolean));
 images.forEach((url,i)=>{if(existing.has(url))return;const b=document.createElement('button');b.className='thumb';b.type='button';b.dataset.src=url;b.setAttribute('aria-label',`Gambar ${existing.size+i+1}`);const im=document.createElement('img');im.src=url;im.alt='';b.appendChild(im);b.addEventListener('click',()=>{main.src=url;thumbs.querySelectorAll('.thumb').forEach(x=>x.classList.toggle('active',x.dataset.src===url))});thumbs.appendChild(b)});
 if(images[0]&&!main.src)main.src=images[0];
}
function enableProductGallery(){
 document.addEventListener('click',e=>{const target=e.target.closest('[data-product]');if(!target)return;const productId=target.dataset.product;if(!productId)return;setTimeout(async()=>injectGallery(productId,await fetchGallery(productId)),0)},true);
}

function addOptionStyles(){
 if(document.getElementById('rqOptionStyles'))return;
 const s=document.createElement('style');s.id='rqOptionStyles';s.textContent=`.rqOptionPicker{display:grid;gap:12px;margin-top:12px}.rqOptionGroup>span{display:block;color:#aaa;font-size:9px;font-weight:850;letter-spacing:.7px;margin-bottom:7px}.rqOptionButtons{display:flex;flex-wrap:wrap;gap:7px}.rqOptionBtn{min-width:64px;border:1px solid #3a3b3b;background:#0b0c0c;color:#eee;border-radius:10px;padding:10px 12px;font:inherit;font-size:11px;font-weight:800;cursor:pointer}.rqOptionBtn.active{border-color:#d9b45e;background:#1b1810;color:#f4dd98;box-shadow:0 0 0 1px #d9b45e}.rqOptionBtn:disabled{opacity:.35;cursor:not-allowed;text-decoration:line-through}.rqOptionPicker+.rqNativeVariantHidden{display:none!important}@media(max-width:480px){.rqOptionBtn{flex:1 1 calc(50% - 7px);min-width:0;padding:11px 9px}}`;
 document.head.appendChild(s);
}
function optionMeta(opt,index){
 const text=(opt.textContent||'').trim(),name=text.split(' · ')[0].trim(),parts=name.split('/').map(x=>x.trim()).filter(Boolean);
 if(parts.length!==2)return null;
 return {index,size:parts[0],color:parts[1],disabled:opt.disabled};
}
function enhanceVariantPicker(){
 const modal=document.getElementById('modal'),select=modal?.querySelector('#variantSelect');
 if(!select||select.dataset.rqEnhanced==='1')return;
 const meta=[...select.options].map(optionMeta).filter(Boolean);
 if(meta.length!==select.options.length||meta.length<2)return;
 const sizes=[...new Set(meta.map(x=>x.size))],colors=[...new Set(meta.map(x=>x.color))];
 if(!sizes.length||!colors.length)return;
 addOptionStyles();select.dataset.rqEnhanced='1';select.classList.add('rqNativeVariantHidden');
 const label=select.previousElementSibling;if(label?.tagName==='LABEL')label.style.display='none';
 const box=document.createElement('div');box.className='rqOptionPicker';box.innerHTML=`<div class="rqOptionGroup"><span>SAIZ</span><div class="rqOptionButtons" data-rq-sizes></div></div><div class="rqOptionGroup"><span>WARNA</span><div class="rqOptionButtons" data-rq-colors></div></div>`;select.before(box);
 let current=meta.find(x=>x.index===select.selectedIndex&&!x.disabled)||meta.find(x=>!x.disabled)||meta[0];
 const find=(size,color)=>meta.find(x=>x.size===size&&x.color===color&&!x.disabled);
 const choose=(m)=>{if(!m)return;current=m;select.selectedIndex=m.index;select.dispatchEvent(new Event('change',{bubbles:true}));render()};
 const render=()=>{
  box.querySelector('[data-rq-sizes]').innerHTML=sizes.map(size=>{const enabled=meta.some(x=>x.size===size&&!x.disabled);return `<button type="button" class="rqOptionBtn ${current?.size===size?'active':''}" data-size="${size.replace(/"/g,'&quot;')}" ${enabled?'':'disabled'}>${size}</button>`}).join('');
  box.querySelector('[data-rq-colors]').innerHTML=colors.map(color=>{const enabled=!!find(current?.size,color);return `<button type="button" class="rqOptionBtn ${current?.color===color?'active':''}" data-color="${color.replace(/"/g,'&quot;')}" ${enabled?'':'disabled'}>${color}</button>`}).join('');
  box.querySelectorAll('[data-size]').forEach(b=>b.onclick=()=>choose(find(b.dataset.size,current?.color)||meta.find(x=>x.size===b.dataset.size&&!x.disabled)));
  box.querySelectorAll('[data-color]').forEach(b=>b.onclick=()=>choose(find(current?.size,b.dataset.color)));
 };
 select.addEventListener('change',()=>{const m=meta.find(x=>x.index===select.selectedIndex);if(m){current=m;render()}});
 render();if(current&&select.selectedIndex!==current.index)choose(current);
}
function watchProductModal(){
 const modal=document.getElementById('modal');if(!modal)return;
 new MutationObserver(()=>requestAnimationFrame(enhanceVariantPicker)).observe(modal,{childList:true,subtree:true});enhanceVariantPicker();
}
function boot(){
 const root=document.getElementById('checkout');if(root){new MutationObserver(addButton).observe(root,{childList:true,subtree:true});addButton()}
 enableProductGallery();watchProductModal();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

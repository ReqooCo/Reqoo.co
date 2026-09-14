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
 a.id='whatsappOrder';
 a.className='shopBtn wide';
 a.href=`https://wa.me/${ADMIN_WA}?text=${encodeURIComponent(text)}`;
 a.target='_blank';
 a.rel='noopener';
 a.textContent='WhatsApp Admin';
 a.style.background='#25D366';
 a.style.color='#fff';
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
 images.forEach((url,i)=>{
  if(existing.has(url))return;
  const b=document.createElement('button');b.className='thumb';b.type='button';b.dataset.src=url;b.setAttribute('aria-label',`Gambar ${existing.size+i+1}`);
  const im=document.createElement('img');im.src=url;im.alt='';b.appendChild(im);
  b.addEventListener('click',()=>{main.src=url;thumbs.querySelectorAll('.thumb').forEach(x=>x.classList.toggle('active',x.dataset.src===url))});
  thumbs.appendChild(b);
 });
 if(images[0]&&!main.src)main.src=images[0];
}
function enableProductGallery(){
 document.addEventListener('click',e=>{
  const target=e.target.closest('[data-product]');if(!target)return;
  const productId=target.dataset.product;if(!productId)return;
  setTimeout(async()=>injectGallery(productId,await fetchGallery(productId)),0);
 },true);
}
function boot(){
 const root=document.getElementById('checkout');
 if(root){new MutationObserver(addButton).observe(root,{childList:true,subtree:true});addButton()}
 enableProductGallery();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

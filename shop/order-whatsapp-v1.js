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
function boot(){
 const root=document.getElementById('checkout');
 if(!root)return;
 new MutationObserver(addButton).observe(root,{childList:true,subtree:true});
 addButton();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

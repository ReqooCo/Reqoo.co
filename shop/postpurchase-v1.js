(()=>{
'use strict';
const attach=()=>{document.querySelectorAll('.successModal').forEach(box=>{if(box.dataset.rqAccount)return;const ref=box.querySelector('.orderRef')?.textContent?.trim();if(!ref)return;box.dataset.rqAccount='1';const a=document.createElement('a');a.className='shopBtn wide secondary';a.href='/shop/account.html';a.textContent='Semak status pesanan';a.style.marginTop='8px';const done=box.querySelector('#doneCheckout');done?.insertAdjacentElement('afterend',a);try{sessionStorage.setItem('REQOO_LAST_ORDER',ref)}catch{}})};new MutationObserver(attach).observe(document.body,{childList:true,subtree:true});attach();
})();

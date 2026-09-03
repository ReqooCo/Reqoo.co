(()=>{
  const API='/api/pksk-delete';
  const TOKEN=()=>localStorage.getItem('reqoo_admin_token')||'';
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const call=(action,extra={})=>new Promise(resolve=>{
    const cb='pkskDelete_'+Date.now()+'_'+Math.floor(Math.random()*99999);
    const sc=document.createElement('script');let done=false;
    const timer=setTimeout(()=>finish({ok:false,error:'Server mengambil masa terlalu lama.'}),12000);
    const finish=r=>{if(done)return;done=true;clearTimeout(timer);delete window[cb];sc.remove();resolve(r||{ok:false,error:'Sambungan gagal.'})};
    window[cb]=finish;sc.onerror=()=>finish({ok:false,error:'Sambungan API gagal.'});
    sc.src=API+'?'+new URLSearchParams({action,callback:cb,token:TOKEN(),...extra});
    document.body.appendChild(sc);
  });
  async function remove(btn,orderNo,status){
    const paid=String(status||'').toUpperCase()==='PAID';
    if(paid){
      const typed=prompt('Order ini sudah PAID. Untuk padam sepenuhnya, taip DELETE:');
      if(typed!=='DELETE')return;
    }else if(!confirm('Padam order '+orderNo+'?\n\nOrder, license/device/progress berkaitan dan bukti R2 akan dipadam.'))return;
    btn.disabled=true;btn.textContent='PADAM…';
    const r=await call('deletePKSKOrder',{orderNo,forcePaid:paid?'DELETE':''});
    if(!r?.ok){alert(r?.error||'Gagal padam order.');btn.disabled=false;btn.textContent='DELETE';return;}
    location.reload();
  }
  function enhance(){
    document.querySelectorAll('#orderCards .item').forEach(item=>{
      if(item.querySelector('.rq-delete-order'))return;
      const code=item.querySelector('.code')?.textContent?.trim();
      if(!code)return;
      const status=item.querySelector('.status')?.textContent?.trim().toUpperCase()||'';
      const actions=item.querySelector('.item-actions');
      if(!actions)return;
      const b=document.createElement('button');
      b.className='danger rq-delete-order';
      b.type='button';
      b.textContent='DELETE';
      b.title='Padam order / data testing';
      b.onclick=()=>remove(b,code,status);
      actions.appendChild(b);
    });
  }
  const style=document.createElement('style');
  style.textContent='.rq-delete-order{background:#fff!important;color:#a33b3b!important;border:1px solid #e2b0b0!important}.rq-delete-order:hover{background:#fff3f3!important;border-color:#b33b3b!important}.rq-delete-order:disabled{opacity:.55;cursor:wait}';
  document.head.appendChild(style);
  const observer=new MutationObserver(enhance);
  observer.observe(document.body,{childList:true,subtree:true});
  setTimeout(enhance,300);
})();

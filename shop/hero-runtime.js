(() => {
  const API='/api/shop';
  const nativeFetch=window.fetch.bind(window);
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));

  // Keep the existing Shop UI and checkout. Only switch the payment method.
  window.fetch=async function(input,init){
    const url=typeof input==='string'?input:(input&&input.url)||'';
    const method=(init&&init.method)||(input&&input.method)||'GET';
    if(method.toUpperCase()==='POST' && /\/api\/shop(?:\?|$)/.test(url) && init && typeof init.body==='string'){
      try{const d=JSON.parse(init.body);if(d&&d.action==='createOrder'){d.payment=d.total?'manual_qr':'quotation';init={...init,body:JSON.stringify(d)}}}catch(_){}
    }
    return nativeFetch(input,init);
  };

  async function applyQR(){
    const box=document.querySelector('#checkoutBody .paybox');
    if(!box)return;
    try{
      const r=await nativeFetch(API+'?action=paymentConfig&_='+Date.now(),{cache:'no-store'});
      const j=await r.json();
      const qr=String(j?.qrUrl||'').trim();
      box.innerHTML=`<h3>Bayaran QR</h3>${qr?`<img src="${esc(qr)}" alt="QR Payment" style="width:min(260px,80%);background:#fff;border-radius:12px;padding:8px;max-height:300px;object-fit:contain">`:'<div style="padding:18px;border:1px dashed #705d32;border-radius:12px;color:#aaa">QR pembayaran belum ditetapkan.<br>Sila tetapkan di Shop Admin.</div>'}<p class="muted">${esc(j?.accountName||'Pembayaran REQOO.CO')}</p><p class="muted">${esc(j?.instructions||'Buat pembayaran melalui QR, kemudian upload bukti pembayaran.')}</p><label style="text-align:left">Bukti pembayaran</label><input id="receiptFile" type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onchange="previewReceipt(event)"><div id="receiptName" class="muted" style="text-align:left">PNG / JPG / WEBP / PDF — maksimum 5MB</div><div id="receiptPreview" class="receiptPreview"></div>`;
      const btn=document.querySelector('#checkoutBody .wa');
      if(btn)btn.textContent='Hantar Order & Bukti Pembayaran';
    }catch(_){
      box.innerHTML='<h3>Bayaran QR</h3><p class="muted">Tidak dapat memuatkan tetapan QR. Sila refresh.</p><label style="text-align:left">Bukti pembayaran</label><input id="receiptFile" type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onchange="previewReceipt(event)"><div id="receiptName" class="muted" style="text-align:left">PNG / JPG / WEBP / PDF — maksimum 5MB</div><div id="receiptPreview" class="receiptPreview"></div>';
    }
  }

  function patchCheckout(){setTimeout(applyQR,0)}
  const originalOpen=window.openCheckout;
  if(typeof originalOpen==='function'){
    window.openCheckout=function(){const r=originalOpen.apply(this,arguments);patchCheckout();return r};
  }else{
    setTimeout(()=>{const fn=window.openCheckout;if(typeof fn==='function')window.openCheckout=function(){const r=fn.apply(this,arguments);patchCheckout();return r}},100);
  }

  function replaceBillplzText(){
    const root=document.body;if(!root)return;
    const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const a=[];let n;
    while(n=w.nextNode())a.push(n);
    a.forEach(x=>{if(/Billplz/i.test(x.nodeValue))x.nodeValue=x.nodeValue.replace(/Billplz Secure Payment/gi,'QR Payment').replace(/Billplz/gi,'QR Payment')});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',replaceBillplzText,{once:true});else replaceBillplzText();
})();

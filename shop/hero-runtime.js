(() => {
  const API='/api/shop';
  const nativeFetch=window.fetch.bind(window);
  const SHOP_QR='/shop/maybank-qr-ab-art-trading.svg?v=1';
  const SHOP_ACCOUNT='Ab Art Trading';
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const fileData=file=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)});

  // Preserve the existing Shop UI. Payment is embedded directly in checkout,
  // following the same simple QR -> proof upload flow used by PKSK.
  window.fetch=async function(input,init){
    const url=typeof input==='string'?input:(input&&input.url)||'';
    const method=(init&&init.method)||(input&&input.method)||'GET';
    if(method.toUpperCase()==='POST' && /\/api\/shop(?:\?|$)/.test(url) && init && typeof init.body==='string'){
      try{
        const d=JSON.parse(init.body);
        if(d&&d.action==='createOrder'){
          d.payment='manual_qr';
          const file=document.getElementById('receiptFile')?.files?.[0];
          if(file){
            if(file.size>5*1024*1024)throw new Error('Resit terlalu besar. Maksimum 5MB.');
            if(!['image/png','image/jpeg','image/webp','application/pdf'].includes(file.type))throw new Error('Format resit tidak disokong.');
            d.receipt={name:file.name,type:file.type,data:await fileData(file)};
          }else if(Array.isArray(d.items)&&d.items.length){
            throw new Error('Sila upload bukti pembayaran QR dahulu.');
          }
          init={...init,body:JSON.stringify(d)};
        }
      }catch(e){
        if(e instanceof Error && /Resit|Format resit|bukti pembayaran/.test(e.message))throw e;
      }
    }
    return nativeFetch(input,init);
  };

  window.previewReceipt=async function(ev){
    const file=ev?.target?.files?.[0],name=document.getElementById('receiptName'),preview=document.getElementById('receiptPreview');
    if(!file)return;
    if(file.size>5*1024*1024){if(name)name.textContent='Fail terlalu besar — maksimum 5MB';if(preview)preview.innerHTML='';ev.target.value='';return}
    if(name)name.textContent=`${file.name} — ${(file.size/1024/1024).toFixed(2)}MB`;
    if(preview&&file.type.startsWith('image/')){const u=URL.createObjectURL(file);preview.innerHTML=`<img src="${u}" alt="Bukti pembayaran" style="max-width:100%;max-height:180px;border-radius:10px;margin-top:8px">`}
    else if(preview)preview.innerHTML='<div class="muted" style="margin-top:8px">PDF akan dihantar bersama order.</div>';
  };

  function applyQR(){
    const box=document.querySelector('#checkoutBody .paybox');
    if(!box||box.dataset.reqooQr==='1')return;
    box.dataset.reqooQr='1';
    box.innerHTML=`<h3>Bayaran QR</h3><p class="muted" style="margin:4px 0 10px">Scan QR di bawah untuk membuat pembayaran.</p><img src="${SHOP_QR}" alt="QR Payment Maybank" style="display:block;width:min(280px,86%);margin:0 auto;background:#fff;border-radius:12px;padding:8px;max-height:320px;object-fit:contain"><p style="font-weight:700;margin:10px 0 2px">${SHOP_ACCOUNT}</p><p class="muted" style="margin:0 0 10px">Sila pastikan jumlah bayaran sama seperti jumlah order.</p><label style="text-align:left">Bukti pembayaran</label><input id="receiptFile" type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onchange="previewReceipt(event)"><div id="receiptName" class="muted" style="text-align:left">PNG / JPG / WEBP / PDF — maksimum 5MB</div><div id="receiptPreview" class="receiptPreview"></div>`;
    const btn=document.querySelector('#checkoutBody .wa');
    if(btn)btn.textContent='Hantar Order & Bukti Pembayaran';
  }

  function patchCheckout(){setTimeout(applyQR,0)}
  const originalOpen=window.openCheckout;
  if(typeof originalOpen==='function')window.openCheckout=function(){const r=originalOpen.apply(this,arguments);patchCheckout();return r};
  else setTimeout(()=>{const fn=window.openCheckout;if(typeof fn==='function')window.openCheckout=function(){const r=fn.apply(this,arguments);patchCheckout();return r}},100);

  function replaceBillplzText(root=document.body){
    if(!root)return;
    const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const a=[];let n;
    while(n=w.nextNode())a.push(n);
    a.forEach(x=>{if(/Billplz/i.test(x.nodeValue))x.nodeValue=x.nodeValue.replace(/Billplz Secure Payment/gi,'QR Payment').replace(/Billplz/gi,'QR Payment')});
  }
  function scan(){replaceBillplzText();applyQR()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scan,{once:true});else scan();
  const observer=new MutationObserver(()=>{replaceBillplzText();applyQR()});
  if(document.body)observer.observe(document.body,{childList:true,subtree:true});
})();
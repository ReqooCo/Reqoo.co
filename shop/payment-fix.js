(()=>{
  const PAY='REQOO_PAYMENT_METHOD';
  const money2=n=>typeof money==='function'?money(n):'RM'+Number(n||0).toFixed(2);
  const baseTotal=()=>typeof cartTotal==='function'?cartTotal():0;
  const shipTotal=()=>typeof shippingTotal==='function'?shippingTotal():0;
  const esc2=s=>typeof esc==='function'?esc(s):String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const selected=()=>document.querySelector('input[name="reqooPayment"]:checked')?.value||'BILLPLZ';
  function setButton(){const b=document.getElementById('reqooSubmitBtn');if(!b)return;const qr=selected()==='MAYBANK_QR';b.textContent=qr?'Hantar Bukti & Order':'Teruskan ke Pembayaran Billplz';}
  const oldToggle=window.toggleReqooPayment;
  window.toggleReqooPayment=function(){if(typeof oldToggle==='function')oldToggle();setButton();};
  function imageData(file){return new Promise((resolve,reject)=>{if(!file)return resolve(null);if(!file.type.startsWith('image/')){const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);return}const img=new Image(),r=new FileReader();r.onload=()=>{img.onload=()=>{const max=1400,scale=Math.min(1,max/Math.max(img.width,img.height)),w=Math.max(1,Math.round(img.width*scale)),h=Math.max(1,Math.round(img.height*scale)),c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h);resolve(c.toDataURL('image/jpeg',.72))};img.onerror=reject;img.src=r.result};r.onerror=reject;r.readAsDataURL(file)});}
  window.submitOrder=async function(){
    const name=document.getElementById('buyerName')?.value.trim()||'',phone=document.getElementById('buyerPhone')?.value.trim()||'',addr=document.getElementById('buyerAddress')?.value.trim()||'';
    if(!name||!phone){alert('Sila isi nama dan No. WhatsApp.');return}
    const shippingId=document.getElementById('shippingSelect')?.value||'';
    if(typeof SHIPPING_OPTIONS!=='undefined'&&SHIPPING_OPTIONS.length&&!shippingId){alert('Sila pilih kaedah penghantaran dahulu.');return}
    const method=baseTotal()>0?selected():'BILLPLZ',file=method==='MAYBANK_QR'?document.getElementById('qrReceiptFile')?.files?.[0]:null;
    if(method==='MAYBANK_QR'&&!file){alert('Sila upload bukti pembayaran dahulu.');return}
    const btn=document.getElementById('reqooSubmitBtn');if(btn){btn.disabled=true;btn.textContent='⏳ Menyimpan order...';btn.style.opacity='.65'}
    try{
      let receipt=null;if(file){if(file.size>12000000){throw new Error('Fail resit terlalu besar. Sila pilih gambar yang lebih kecil.')}receipt={name:file.name,type:file.type,data:await imageData(file)};}
      const items=cart.map(x=>({name:x.product.name,productId:x.product.id,category:x.product.category,variant:x.variant,qty:x.q,unitPrice:x.unitPrice,originalUnitPrice:x.originalUnitPrice,promo:x.promo||'',promoId:x.promoId||'',promoTitle:x.promoTitle||'',customText:x.name||'',note:x.note||''}));
      const payload={action:'createOrder',orderNo:window.currentOrderNo,name,phone,address:addr,itemCount:cart.reduce((a,x)=>a+x.q,0),subtotal:baseTotal(),shippingId,shipping:shipTotal(),total:baseTotal()+shipTotal(),paymentMethod:method,items,receipt};
      const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),25000);
      const r=await fetch('/api/shop',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:ctl.signal});clearTimeout(timer);
      const db=await r.json();
      if(!db.ok)throw new Error(db.error||'Order gagal disimpan.');
      if(db.payment?.billUrl){location.href=db.payment.billUrl;return}
      document.getElementById('checkoutBody').innerHTML=`<div class="success" style="text-align:center;padding:28px 20px"><div style="font-size:42px;margin-bottom:10px">✓</div><h3 style="font-size:24px;margin:0 0 8px">${method==='MAYBANK_QR'?'Order Menunggu Semakan':'Order Diterima'}</h3><p style="font-size:14px;color:#ddd;margin:0 0 6px">No. Order: <b>${esc2(db.orderRef||window.currentOrderNo)}</b></p><p class="muted" style="max-width:520px;margin:10px auto 18px">${method==='MAYBANK_QR'?'Bayaran QR dan bukti pembayaran telah diterima. Kami akan semak bayaran dan kemaskini status order.':'Order telah berjaya disimpan dalam sistem REQOO.CO.'}</p><div style="background:#0b0b0b;border:1px solid #3b3222;border-radius:14px;padding:14px;text-align:left"><div style="color:#8fd18f;font-weight:900">✓ STATUS: ${method==='MAYBANK_QR'?'MENUNGGU SEMAKAN':'DITERIMA'}</div><div class="muted" style="margin-top:5px">${method==='MAYBANK_QR'?'Tidak perlu bayar semula. Admin akan semak resit.':'Anda akan dibawa ke halaman Billplz untuk pembayaran.'}</div></div><button class="btn" style="margin-top:14px" onclick="closePay();cart=[];update()">Selesai</button></div>`;
      try{sessionStorage.removeItem('REQOO_PROMO')}catch(e){}
    }catch(e){console.error(e);alert(e?.name==='AbortError'?'Sistem mengambil masa terlalu lama. Sila cuba semula.':(e?.message||'Tidak dapat sambung ke sistem order.'));if(btn){btn.disabled=false;setButton();btn.style.opacity='1'}}
  };
  setTimeout(setButton,0);
})();

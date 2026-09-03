(()=>{
  const PAY='REQOO_PAYMENT_METHOD';
  const esc2=s=>typeof esc==='function'?esc(s):String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const money2=n=>typeof money==='function'?money(n):'RM'+Number(n||0).toFixed(2);
  const baseTotal=()=>typeof cartTotal==='function'?cartTotal():0;
  const shipTotal=()=>typeof shippingTotal==='function'?shippingTotal():0;
  const shippingHtml=()=>{
    if(typeof SHIPPING_OPTIONS==='undefined'||!SHIPPING_OPTIONS.length)return '<label>Penghantaran</label><div class="muted">Pilihan penghantaran belum ditetapkan. Sila hubungi REQOO.</div>';
    return `<label>Penghantaran</label><select id="shippingSelect" onchange="refreshCheckoutTotal()"><option value="">Pilih kaedah penghantaran</option>${SHIPPING_OPTIONS.map(s=>`<option value="${esc2(s.id)}">${esc2(s.name)} — ${money2(s.price)}</option>`).join('')}</select>`;
  };
  function selected(){return document.querySelector('input[name="reqooPayment"]:checked')?.value||'BILLPLZ'}
  window.toggleReqooPayment=function(){
    const qr=selected()==='MAYBANK_QR';
    const q=document.getElementById('qrPaymentPanel');
    const b=document.getElementById('billplzPaymentPanel');
    if(q)q.style.display=qr?'block':'none';
    if(b)b.style.display=qr?'none':'block';
    try{sessionStorage.setItem(PAY,selected())}catch(e){}
  };
  window.openCheckout=function(){
    if(!cart.length){alert('Cart masih kosong.');return}
    closeCart();
    const no='RQ'+new Date().toISOString().replace(/[-:TZ.]/g,'').slice(0,14);window.currentOrderNo=no;
    const base=baseTotal();
    const lines=cart.map(x=>{
      const promo=x.promo&&x.originalUnitPrice!==x.unitPrice;
      return `<div style="padding:9px 0;border-bottom:1px solid #222"><b>${esc2(x.product.name)}</b> — ${esc2(x.variant)} × ${x.q}<br>${promo?`<span style="text-decoration:line-through;color:#777">Harga asal: ${money2(x.originalUnitPrice*x.q)}</span><br><span style="color:#f2d68d;font-weight:900">🔥 Harga promo: ${money2(x.unitPrice*x.q)}</span>`:`Harga: ${x.unitPrice?money2(x.unitPrice*x.q):'Quotation'}`}</div>`;
    }).join('');
    let saved='BILLPLZ';try{saved=sessionStorage.getItem(PAY)||'BILLPLZ'}catch(e){}
    document.getElementById('checkoutBody').innerHTML=`
      <div class="summary"><b>No. Order: ${no}</b><div style="margin-top:8px">${cart.reduce((a,x)=>a+x.q,0)} unit</div>${lines}<div style="margin-top:12px">Subtotal: <b>${base?money2(base):'Quotation'}</b></div><div style="margin-top:6px">Postage: <b id="shippingAmount">RM0.00</b></div><div id="checkoutGrandTotal" style="font-size:24px;margin-top:12px;color:var(--gold)">${base?money2(base):'Quotation'}</div></div>
      <label>Nama</label><input id="buyerName" placeholder="Nama penuh">
      <label>No. WhatsApp</label><input id="buyerPhone" placeholder="01xxxxxxxx">
      <label>Alamat penghantaran</label><textarea id="buyerAddress" rows="3" placeholder="Alamat penuh"></textarea>
      ${shippingHtml()}
      ${base?`<div style="margin-top:18px;font-size:12px;color:#aaa">Pilih kaedah pembayaran</div>
      <div class="choice" style="margin-top:8px">
        <label class="field" style="cursor:pointer;border-color:${saved==='BILLPLZ'?'#8d7440':'#2b2b2b'}"><input type="radio" name="reqooPayment" value="BILLPLZ" ${saved==='BILLPLZ'?'checked':''} onchange="toggleReqooPayment()"> <b>💳 Billplz</b><br><span class="muted">Online payment • Recommended</span></label>
        <label class="field" style="cursor:pointer;border-color:${saved==='MAYBANK_QR'?'#8d7440':'#2b2b2b'}"><input type="radio" name="reqooPayment" value="MAYBANK_QR" ${saved==='MAYBANK_QR'?'checked':''} onchange="toggleReqooPayment()"> <b>📱 Maybank QR</b><br><span class="muted">Manual • Semakan diperlukan</span></label>
      </div>
      <div id="billplzPaymentPanel" class="paybox" style="margin-top:12px;display:${saved==='BILLPLZ'?'block':'none'}"><h3>Bayar dengan Billplz</h3><p class="muted">Pembayaran online melalui halaman Billplz yang selamat. Selepas bayaran berjaya, status order akan dikemaskini secara automatik.</p></div>
      <div id="qrPaymentPanel" class="paybox" style="margin-top:12px;display:${saved==='MAYBANK_QR'?'block':'none'}"><h3>Bayar melalui Maybank QR</h3><img src="/shop/assets/maybank-qr.svg" alt="Maybank QR" style="width:min(280px,90%);margin:8px auto;display:block;background:#fff;border-radius:12px;padding:10px"><p class="muted">Scan QR untuk membuat pembayaran. Selepas itu upload bukti pembayaran di bawah. Order akan berstatus <b>Menunggu Semakan</b>.</p><label style="text-align:left">Bukti pembayaran / resit</label><input id="qrReceiptFile" type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onchange="previewReqooReceipt(this)"><div id="qrReceiptPreview" class="receiptPreview"></div></div>`:`<div class="paybox" style="margin-top:12px"><h3>Quotation</h3><p class="muted">Produk ini memerlukan semakan harga. Hantar order untuk quotation.</p></div>`}
      <button id="reqooSubmitBtn" class="wa" onclick="submitOrder()">${base?(saved==='MAYBANK_QR'?'Hantar Bukti & Order':'Teruskan ke Pembayaran Billplz'):'Hantar Order untuk Quotation'}</button>`;
    document.getElementById('payModal').classList.add('open');
    if(typeof refreshCheckoutTotal==='function')refreshCheckoutTotal();
    toggleReqooPayment();
  };
  window.previewReqooReceipt=function(input){
    const box=document.getElementById('qrReceiptPreview'),f=input?.files?.[0];if(!box)return;
    if(!f){box.style.display='none';return}
    if(f.type.startsWith('image/')){const r=new FileReader();r.onload=()=>{box.innerHTML=`<img src="${r.result}" style="max-width:100%;max-height:260px;border-radius:10px">`;box.style.display='flex'};r.readAsDataURL(f)}else{box.innerHTML=`<span class="muted">PDF resit dipilih: ${esc2(f.name)}</span>`;box.style.display='flex'}
  };
  const readFile=f=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(f)});
  window.submitOrder=async function(){
    const name=document.getElementById('buyerName')?.value.trim()||'',phone=document.getElementById('buyerPhone')?.value.trim()||'',addr=document.getElementById('buyerAddress')?.value.trim()||'';
    if(!name||!phone){alert('Sila isi nama dan No. WhatsApp.');return}
    const shippingId=document.getElementById('shippingSelect')?.value||'';
    if(typeof SHIPPING_OPTIONS!=='undefined'&&SHIPPING_OPTIONS.length&&!shippingId){alert('Sila pilih kaedah penghantaran dahulu.');return}
    const method=baseTotal()>0?selected():'BILLPLZ';
    const receiptFile=method==='MAYBANK_QR'?document.getElementById('qrReceiptFile')?.files?.[0]:null;
    if(method==='MAYBANK_QR'&&!receiptFile){alert('Sila upload bukti pembayaran dahulu.');return}
    const btn=document.getElementById('reqooSubmitBtn');if(btn){btn.disabled=true;btn.textContent='⏳ Menyimpan order...';btn.style.opacity='.65'}
    const items=cart.map(x=>({name:x.product.name,productId:x.product.id,category:x.product.category,variant:x.variant,qty:x.q,unitPrice:x.unitPrice,originalUnitPrice:x.originalUnitPrice,promo:x.promo||'',promoId:x.promoId||'',promoTitle:x.promoTitle||'',customText:x.name||'',note:x.note||''}));
    let receipt=null;if(receiptFile)receipt={name:receiptFile.name,type:receiptFile.type,data:await readFile(receiptFile)};
    const total=baseTotal()+shipTotal();
    const payload={action:'createOrder',orderNo:window.currentOrderNo,name,phone,address:addr,itemCount:cart.reduce((a,x)=>a+x.q,0),subtotal:baseTotal(),shippingId,shipping:shipTotal(),total,paymentMethod:method,items,receipt};
    try{
      const r=await fetch('/api/shop',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}),db=await r.json();
      if(!db.ok){alert(db.error||'Order gagal disimpan.');if(btn){btn.disabled=false;btn.textContent=method==='MAYBANK_QR'?'Hantar Bukti & Order':'Teruskan ke Pembayaran Billplz';btn.style.opacity='1'}return}
      if(db.payment?.billUrl){location.href=db.payment.billUrl;return}
      document.getElementById('checkoutBody').innerHTML=`<div class="success" style="text-align:center;padding:28px 20px"><div style="font-size:42px;margin-bottom:10px">✓</div><h3 style="font-size:24px;margin:0 0 8px">${method==='MAYBANK_QR'?'Order Menunggu Semakan':'Order Diterima'}</h3><p style="font-size:14px;color:#ddd;margin:0 0 6px">No. Order: <b>${esc2(db.orderRef||window.currentOrderNo)}</b></p><p class="muted" style="max-width:520px;margin:10px auto 18px">${method==='MAYBANK_QR'?'Bayaran QR dan bukti pembayaran telah diterima. Kami akan semak bayaran dan kemaskini status order.':'Order telah berjaya disimpan dalam sistem REQOO.CO.'}</p><div style="background:#0b0b0b;border:1px solid #3b3222;border-radius:14px;padding:14px;text-align:left"><div style="color:#8fd18f;font-weight:900">✓ STATUS: ${method==='MAYBANK_QR'?'MENUNGGU SEMAKAN':'DITERIMA'}</div><div class="muted" style="margin-top:5px">${method==='MAYBANK_QR'?'Tidak perlu bayar semula. Admin akan semak resit.':'Anda akan dibawa ke halaman Billplz untuk pembayaran.'}</div></div><button class="btn" style="margin-top:14px" onclick="closePay();cart=[];update()">Selesai</button></div>`;
      try{sessionStorage.removeItem('REQOO_PROMO')}catch(e){}
    }catch(e){console.error(e);alert('Tidak dapat sambung ke sistem order. Sila cuba lagi.');if(btn){btn.disabled=false;btn.textContent=method==='MAYBANK_QR'?'Hantar Bukti & Order':'Teruskan ke Pembayaran Billplz';btn.style.opacity='1'}}
  };
})();

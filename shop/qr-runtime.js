(() => {
  const API='/api/shop';
  let paymentConfig={};
  const esc2=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const money2=n=>'RM'+Number(n||0).toFixed(2);
  const fileData=file=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)});
  async function config(){try{const r=await fetch(API+'?action=paymentConfig&_='+Date.now(),{cache:'no-store'});paymentConfig=await r.json()}catch(_){paymentConfig={}}}
  function shipping(){const el=document.getElementById('shippingSelect');if(!el)return 0;const s=(window.SHIPPING_OPTIONS||[]).find(x=>String(x.id)===String(el.value));return s?Number(s.price||0):0}
  function openQRCheckout(){
    if(!window.cart?.length){alert('Cart masih kosong.');return}
    window.closeCart?.();
    const no='RQ'+new Date().toISOString().replace(/[-:TZ.]/g,'').slice(0,14);window.currentOrderNo=no;
    const base=window.cart.reduce((a,x)=>a+Number(x.unitPrice||0)*Number(x.q||1),0),ship=shipping(),total=base+ship;
    const lines=window.cart.map(x=>`<div style="padding:9px 0;border-bottom:1px solid #222"><b>${esc2(x.product.name)}</b> — ${esc2(x.variant)} × ${x.q}<br>${x.unitPrice?money2(x.unitPrice*x.q):'Quotation'}${x.promoTitle?`<br><span style="color:#f2d68d">🔥 ${esc2(x.promoTitle)}</span>`:''}</div>`).join('');
    const qr=paymentConfig.qrUrl?`<img src="${esc2(paymentConfig.qrUrl)}" alt="QR Payment" style="width:min(280px,85%);max-height:300px;object-fit:contain;background:#fff;border-radius:12px;padding:10px">`:'<div style="padding:25px;border:1px dashed #705d32;border-radius:12px;color:#aaa">QR pembayaran belum ditetapkan.<br>Sila tetapkan di Shop Admin.</div>';
    const shipHtml=(window.SHIPPING_OPTIONS||[]).length?`<label>Penghantaran</label><select id="shippingSelect" onchange="window.__qrRefresh()"><option value="">Pilih kaedah penghantaran</option>${window.SHIPPING_OPTIONS.map(s=>`<option value="${esc2(s.id)}">${esc2(s.name)} — ${money2(s.price)}</option>`).join('')}</select>`:'';
    document.getElementById('checkoutBody').innerHTML=`<div class="summary"><b>No. Order: ${no}</b><div style="margin-top:8px">${window.cart.reduce((a,x)=>a+x.q,0)} unit</div>${lines}<div style="margin-top:12px">Subtotal: <b>${base?money2(base):'Quotation'}</b></div><div>Postage: <b id="shippingAmount">${money2(ship)}</b></div><div id="checkoutGrandTotal" style="font-size:24px;margin-top:10px;color:var(--gold)">Jumlah: ${total?money2(total):'Quotation'}</div></div><label>Nama</label><input id="buyerName" placeholder="Nama penuh"><label>No. WhatsApp</label><input id="buyerPhone" placeholder="01xxxxxxxx"><label>Alamat penghantaran</label><textarea id="buyerAddress" rows="3" placeholder="Alamat penuh"></textarea>${shipHtml}<div class="paybox"><h3>Bayaran QR</h3>${qr}<p class="muted">${esc2(paymentConfig.accountName||'Pembayaran REQOO.CO')}</p><p class="muted">${esc2(paymentConfig.instructions||'Buat pembayaran melalui QR, kemudian upload screenshot/resit di bawah.')}</p><label style="text-align:left">Upload bukti pembayaran</label><input id="receiptFile" type="file" accept="image/png,image/jpeg,image/webp,application/pdf"><div class="muted" style="text-align:left">PNG / JPG / WEBP / PDF — maksimum 5MB</div></div><button id="qrSubmit" class="wa" onclick="window.__qrSubmit()">${total?'Hantar Order & Bukti Pembayaran':'Hantar Order untuk Quotation'}</button>`;
    document.getElementById('payModal').classList.add('open');
    window.__qrRefresh();
  }
  window.__qrRefresh=()=>{const base=(window.cart||[]).reduce((a,x)=>a+Number(x.unitPrice||0)*Number(x.q||1),0),s=shipping(),t=base+s;if(document.getElementById('shippingAmount'))document.getElementById('shippingAmount').textContent=money2(s);if(document.getElementById('checkoutGrandTotal'))document.getElementById('checkoutGrandTotal').textContent=t?money2(t):'Quotation'};
  window.__qrSubmit=async()=>{
    const name=document.getElementById('buyerName')?.value.trim(),phone=document.getElementById('buyerPhone')?.value.trim(),address=document.getElementById('buyerAddress')?.value.trim(),file=document.getElementById('receiptFile')?.files?.[0],sid=document.getElementById('shippingSelect')?.value||'';
    if(!name||!phone){alert('Sila isi nama dan No. WhatsApp.');return}
    if((window.SHIPPING_OPTIONS||[]).length&&!sid){alert('Sila pilih kaedah penghantaran dahulu.');return}
    if(file&&file.size>5*1024*1024){alert('Fail resit terlalu besar. Maksimum 5MB.');return}
    const btn=document.getElementById('qrSubmit');if(btn){btn.disabled=true;btn.textContent='⏳ Menyimpan order...'}
    try{
      const items=(window.cart||[]).map(x=>({productId:x.product.id,variant:x.variant,qty:x.q,customText:x.name||'',note:x.note||'',addons:x.addons||[],promo:x.promo||''}));
      const receipt=file?{name:file.name,type:file.type,data:await fileData(file)}:null;
      const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'createOrder',name,phone,address,shippingId,items,receipt,referralCode:''})});
      const j=await r.json();if(!j.ok)throw Error(j.error||'Order gagal disimpan');
      const msg=encodeURIComponent(`ORDER REQOO.CO\nNo. Order: ${j.orderRef}\nNama: ${name}\nWhatsApp: ${phone}\nJumlah: ${money2(j.amount)}\nStatus: PENDING PAYMENT — bukti telah dimuat naik.`);
      window.LAST_WA_URL='https://wa.me/60103982803?text='+msg;
      document.getElementById('checkoutBody').innerHTML=`<div class="success" style="text-align:center;padding:28px 20px"><div style="font-size:42px">✓</div><h3 style="font-size:24px;margin:8px 0">Order Diterima</h3><p>No. Order: <b>${esc2(j.orderRef)}</b></p><p class="muted">Order telah direkod dalam sistem. Status: <b>PENDING PAYMENT</b>. Kami akan semak bukti pembayaran sebelum memproses order.</p><button class="btn" style="width:100%;background:linear-gradient(135deg,var(--gold),#e7c777);color:#080808" onclick="window.open(window.LAST_WA_URL,'_blank')">📱 Hantar Ringkasan ke WhatsApp</button><button class="btn" style="width:100%;margin-top:10px" onclick="closePay();window.cart=[];update()">Selesai</button></div>`;
    }catch(e){alert(e.message||'Order gagal');if(btn){btn.disabled=false;btn.textContent='Hantar Order & Bukti Pembayaran'}}
  };
  window.openCheckout=openQRCheckout;
  config();
})();

/* REQOO Shop runtime: preserve the existing Shop UI, harden QR checkout, and expose the existing backend flow. */
(()=>{
  const API='/api/shop';
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const money=n=>'RM'+Number(n||0).toFixed(2);
  async function patchCheckout(){
    const root=document.querySelector('#checkoutBody');
    if(!root)return;
    const pay=root.querySelector('.paybox');
    if(!pay)return;
    try{const r=await fetch(API+'?action=paymentConfig',{cache:'no-store'}),j=await r.json();
      pay.innerHTML=`<div style="font-weight:900;letter-spacing:1px;color:#d9b45e">BAYARAN QR</div><p style="color:#aaa;font-size:11px;margin:7px 0 12px">${esc(j.instructions||'Scan QR, buat bayaran dan upload screenshot resit.')}</p>${j.qrUrl?`<img src="${esc(j.qrUrl)}" alt="QR pembayaran" style="width:min(260px,80%);background:#fff;border-radius:12px;padding:8px">`:'<div style="padding:20px;border:1px dashed #5b4b2a;border-radius:12px;color:#aaa">QR pembayaran belum ditetapkan. Sila tetapkan di Shop Admin.</div>'}<div style="margin-top:10px;font-size:11px;color:#bbb">${esc(j.accountName||'')}</div>`;
    }catch{}
  }
  function ensureReceipt(){
    const root=document.querySelector('#checkoutBody');if(!root)return;
    const inputs=[...root.querySelectorAll('input[type=file]')];
    if(!inputs.length)return;
    const f=inputs.find(x=>/receipt|resit|payment/i.test(x.id+' '+x.name+' '+x.accept))||inputs[0];
    if(f){f.accept='image/png,image/jpeg,image/webp,application/pdf';f.setAttribute('data-reqoo-receipt','1');}
  }
  function forceQR(){
    const orig=window.fetch;if(window.__reqooQRFetch)return;window.__reqooQRFetch=1;
    window.fetch=async function(input,init){
      try{const u=typeof input==='string'?input:(input?.url||'');const m=(init?.method||input?.method||'GET').toUpperCase();if(m==='POST'&&u.includes('/api/shop')){let d=null;try{d=typeof init?.body==='string'?JSON.parse(init.body):null}catch{}if(d?.action==='createOrder'){d.payment='manual_qr';const ni={...(init||{}),body:JSON.stringify(d)};return orig(input,ni)}}}catch{}
      return orig(input,init);
    };
  }
  function scan(){patchCheckout();ensureReceipt();forceQR();}
  scan();new MutationObserver(scan).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
})();

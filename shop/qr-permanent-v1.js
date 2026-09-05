(()=>{
'use strict';
const QR='https://raw.githubusercontent.com/ReqooCo/Reqoo.co/main/shop/maybank-qr.jpg?v=1';
const ACCOUNT='Ab Art Trading';
const INSTRUCTIONS='Scan QR dan pastikan jumlah bayaran sama seperti jumlah order.';
const originalFetch=window.fetch.bind(window);
function isPaymentConfig(input){
  try{
    const u=new URL(typeof input==='string'?input:input?.url||'',location.href);
    return u.pathname==='/api/shop'&&u.searchParams.get('action')==='paymentConfig';
  }catch{return false}
}
window.fetch=async function(input,init){
  if(isPaymentConfig(input)){
    return new Response(JSON.stringify({ok:true,qrUrl:QR,accountName:ACCOUNT,instructions:INSTRUCTIONS}),{status:200,headers:{'content-type':'application/json;charset=UTF-8','cache-control':'no-store'}});
  }
  return originalFetch(input,init);
};
function forceQR(root=document){
  root.querySelectorAll('img.qr').forEach(img=>{
    if(img.dataset.reqooPermanentQr==='1')return;
    img.dataset.reqooPermanentQr='1';
    img.src=QR;
  });
}
new MutationObserver(mutations=>mutations.forEach(m=>m.addedNodes.forEach(n=>{if(n.nodeType===1)forceQR(n)}))).observe(document.documentElement,{childList:true,subtree:true});
forceQR();
})();

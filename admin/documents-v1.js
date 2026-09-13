(()=>{
'use strict';
const API='/api/shop-admin';
const TOKEN_KEY='reqoo_admin_token';
let orders=[];
let activeDoc=null;
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>'RM'+(Number(n||0)/100).toFixed(2);
const token=()=>localStorage.getItem(TOKEN_KEY)||'';

async function api(action,extra={}){
  const u=new URL(API,location.origin);
  u.searchParams.set('action',action);
  Object.entries(extra).forEach(([k,v])=>{if(v!==undefined&&v!==null&&v!=='')u.searchParams.set(k,v)});
  const r=await fetch(u,{headers:{'X-Admin-Token':token()},cache:'no-store'});
  let d={}; try{d=await r.json()}catch{}
  if(r.status===401){location.href='/admin/?return='+encodeURIComponent(location.pathname);throw Error('Sesi Admin tamat.');}
  if(!r.ok||!d.ok)throw Error(d.error||'Request gagal');
  return d;
}

function status(o){return String(o.payment_status||o.paymentStatus||'pending').toLowerCase()}
function ref(o){return o.order_no||o.orderNo||o.id||'—'}
function customer(o){return o.customer_name||o.customerName||o.name||'Customer'}
function phone(o){return o.phone||o.customer_phone||o.customerPhone||''}
function total(o){
  const cents=o.total_minor??o.totalMinor??o.amount_minor??o.amountMinor;
  if(cents!==undefined&&cents!==null)return Number(cents||0);
  return Math.round(Number(o.total||o.amount||0)*100);
}
function dateFmt(v){if(!v)return'—';const d=new Date(v);return Number.isNaN(d.getTime())?String(v):d.toLocaleDateString('ms-MY',{day:'2-digit',month:'short',year:'numeric'})}
function docNo(type,o){const p=type==='quotation'?'QT':type==='invoice'?'INV':'RC';return p+'-'+String(ref(o)).replace(/[^A-Za-z0-9]/g,'').slice(-18).toUpperCase()}

function render(){
  const q=$('docSearch').value.trim().toLowerCase();
  const list=orders.filter(o=>!q||[ref(o),customer(o),phone(o)].join(' ').toLowerCase().includes(q));
  $('docList').innerHTML=list.map(o=>`<article class="rqDocRow"><div class="rqDocRef">${esc(ref(o))}<div class="rqDocMeta">${esc(dateFmt(o.created_at||o.createdAt))}</div></div><div class="rqDocCustomer"><b>${esc(customer(o))}</b><span>${esc(phone(o)||'Tiada WhatsApp')}</span></div><div class="rqDocAmount">${money(total(o))}</div><div class="rqDocStatus"><span class="rqDocBadge ${status(o)==='paid'?'paid':'pending'}">${status(o)==='paid'?'PAID':'PENDING'}</span></div><div class="rqDocButtons"><button class="btn" data-doc="quotation" data-id="${esc(o.id||ref(o))}">Quotation</button><button class="btn" data-doc="invoice" data-id="${esc(o.id||ref(o))}">Invoice</button><button class="btn" data-doc="receipt" data-id="${esc(o.id||ref(o))}" ${status(o)==='paid'?'':'disabled'}>Receipt</button></div></article>`).join('')||'<div class="rqDocsState">Tiada order dijumpai.</div>';
  document.querySelectorAll('[data-doc]').forEach(b=>b.addEventListener('click',()=>openDoc(b.dataset.doc,b.dataset.id)));
}

async function load(){
  try{
    $('docState').textContent='Memuatkan order…';
    const d=await api('listOrders',{limit:100});
    orders=Array.isArray(d.orders)?d.orders:[];
    $('docOrders').textContent=orders.length;
    $('docPaid').textContent=orders.filter(o=>status(o)==='paid').length;
    $('docPending').textContent=orders.filter(o=>status(o)!=='paid').length;
    $('docState').textContent=orders.length?'':'Belum ada order.';
    render();
  }catch(e){$('docState').textContent=e.message}
}

function itemName(i){return i.product_name||i.product_name_snapshot||i.name||'Item'}
function itemQty(i){return Number(i.qty??i.quantity??1)}
function itemUnit(i){return Number(i.unit_price_minor??i.unitPriceMinor??0)}
function itemLine(i){return Number(i.line_total_minor??i.lineTotalMinor??(itemQty(i)*itemUnit(i)))}

async function openDoc(type,id){
  try{
    const d=await api('getOrder',{id,orderRef:id});
    const o=d.order||orders.find(x=>String(x.id||ref(x))===String(id))||{};
    if(type==='receipt'&&status(o)!=='paid')throw Error('Receipt hanya boleh dikeluarkan selepas bayaran disahkan.');
    const items=Array.isArray(d.items)?d.items:(Array.isArray(d.order_items)?d.order_items:[]);
    activeDoc={type,o,items,payment:d.payment||null};
    $('docModalTitle').textContent=type==='quotation'?'Quotation':type==='invoice'?'Invoice':'Official Receipt';
    $('docPreview').innerHTML=paper(type,o,items);
    $('docModal').classList.add('open');
    $('docModal').setAttribute('aria-hidden','false');
  }catch(e){alert(e.message)}
}

function paper(type,o,items){
  const title=type==='quotation'?'QUOTATION':type==='invoice'?'INVOICE':'OFFICIAL RECEIPT';
  const paid=status(o)==='paid';
  const rows=(items.length?items:[{product_name:'Order '+ref(o),qty:1,unit_price_minor:total(o),line_total_minor:total(o)}]).map(i=>`<tr><td>${esc(itemName(i))}${i.variation_name?`<br><small>${esc(i.variation_name)}</small>`:''}</td><td>${itemQty(i)}</td><td>${money(itemUnit(i)||itemLine(i))}</td><td>${money(itemLine(i))}</td></tr>`).join('');
  const subtotal=Number(o.subtotal_minor??o.subtotalMinor??total(o));
  const discount=Number(o.discount_minor??o.discountMinor??0);
  const shipping=Number(o.shipping_minor??o.shippingMinor??0);
  const tax=Number(o.tax_minor??o.taxMinor??0);
  const grand=total(o)||(subtotal-discount+shipping+tax);
  return `<section class="rqPaper"><div class="rqPaperTop"><div><div class="rqPaperBrand">REQOO<span>.CO</span></div><div class="rqDocMeta">Quality · Design · Innovation</div></div><div class="rqPaperType"><h1>${title}</h1><small>${esc(docNo(type,o))}</small></div></div><div class="rqPaperGrid"><div><div class="rqPaperLabel">BILL TO</div><b>${esc(customer(o))}</b><br><span>${esc(phone(o)||'—')}</span>${o.email?`<br><span>${esc(o.email)}</span>`:''}</div><div><div class="rqPaperLabel">DETAIL</div><b>Order:</b> ${esc(ref(o))}<br><b>Issued:</b> ${esc(dateFmt(new Date().toISOString()))}<br><b>Status:</b> ${type==='quotation'?'DRAFT':paid?'PAID':'UNPAID'}</div></div>${type==='receipt'?'<div class="rqReceiptNote">Bayaran telah disahkan oleh Admin Reqoo.</div>':''}<table class="rqPaperTable"><thead><tr><th>DESCRIPTION</th><th>QTY</th><th>UNIT</th><th>AMOUNT</th></tr></thead><tbody>${rows}</tbody></table><div class="rqPaperTotals"><div><span>Subtotal</span><b>${money(subtotal)}</b></div>${discount?`<div><span>Discount</span><b>- ${money(discount)}</b></div>`:''}${shipping?`<div><span>Shipping</span><b>${money(shipping)}</b></div>`:''}${tax?`<div><span>Tax</span><b>${money(tax)}</b></div>`:''}<div class="grand"><span>Total</span><b>${money(grand)}</b></div></div><div class="rqPaperFoot">Document generated from REQOO Admin. ${type==='quotation'?'Quotation ini bukan bukti pembayaran.':type==='invoice'?'Invoice status bergantung pada status bayaran order.':'Receipt ini dikeluarkan selepas bayaran disahkan.'}</div></section>`;
}

function close(){ $('docModal').classList.remove('open');$('docModal').setAttribute('aria-hidden','true') }
function printDoc(){
  if(!activeDoc)return;
  const w=window.open('','_blank');
  if(!w)return alert('Benarkan popup untuk Print / Save PDF.');
  const body=paper(activeDoc.type,activeDoc.o,activeDoc.items);
  w.document.write('<!doctype html><html><head><title>'+esc(docNo(activeDoc.type,activeDoc.o))+'</title><style>body{font-family:Arial,sans-serif;margin:0;padding:24px;color:#222}.rqPaper{max-width:760px;margin:auto}.rqPaperTop,.rqPaperGrid{display:flex;justify-content:space-between;gap:30px}.rqPaperGrid{margin:28px 0}.rqPaperBrand{font-size:24px;font-weight:900}.rqPaperBrand span{color:#aa7f28}.rqPaperType{text-align:right}.rqPaperType h1{margin:0}.rqPaperLabel{font-size:9px;color:#777;font-weight:800;letter-spacing:1px;margin-bottom:5px}.rqPaperTable{width:100%;border-collapse:collapse}.rqPaperTable th,.rqPaperTable td{padding:10px 8px;border-bottom:1px solid #ddd;text-align:left;font-size:11px}.rqPaperTable td:last-child,.rqPaperTable th:last-child{text-align:right}.rqPaperTotals{width:340px;margin:18px 0 0 auto}.rqPaperTotals div{display:flex;justify-content:space-between;padding:6px 0;font-size:11px}.rqPaperTotals .grand{font-size:15px;font-weight:900;border-top:1px solid #aaa}.rqPaperFoot{margin-top:34px;padding-top:14px;border-top:1px solid #ddd;font-size:9px;color:#777}.rqReceiptNote{margin:16px 0;padding:10px;background:#eef8f3}.rqDocMeta{font-size:10px;color:#777}@media print{body{padding:0}}</style></head><body>'+body+'</body></html>');
  w.document.close();
  w.focus();
  setTimeout(()=>w.print(),150);
}

$('refreshDocs').addEventListener('click',load);
$('docSearch').addEventListener('input',render);
$('docClose').addEventListener('click',close);
$('docCloseBottom').addEventListener('click',close);
$('docPrint').addEventListener('click',printDoc);
$('docModal').addEventListener('click',e=>{if(e.target.id==='docModal')close()});
if(!token())location.href='/admin/?return='+encodeURIComponent(location.pathname);else load();
})();

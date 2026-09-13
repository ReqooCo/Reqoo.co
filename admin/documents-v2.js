(()=>{
'use strict';
const API='/api/shop-admin',TOKEN_KEY='reqoo_admin_token';
let orders=[],documents=[],activeDoc=null,docSettings={};
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>'RM'+(Number(n||0)/100).toFixed(2);
const token=()=>localStorage.getItem(TOKEN_KEY)||'';
function toast(msg,err=false){const el=$('docsToast');el.textContent=msg;el.className='rqDocsToast show'+(err?' err':'');clearTimeout(toast.t);toast.t=setTimeout(()=>el.className='rqDocsToast',2600)}
async function api(action,extra={},method='GET'){
  let url=new URL(API,location.origin),opt={method,headers:{'X-Admin-Token':token()},cache:'no-store'};
  if(method==='GET'){url.searchParams.set('action',action);Object.entries(extra).forEach(([k,v])=>{if(v!==undefined&&v!==null&&v!=='')url.searchParams.set(k,v)});}else{opt.headers['Content-Type']='application/json';opt.body=JSON.stringify({action,...extra});}
  const r=await fetch(url,opt);let d={};try{d=await r.json()}catch{}
  if(r.status===401){location.href='/admin/?return='+encodeURIComponent(location.pathname);throw Error('Sesi Admin tamat.');}
  if(!r.ok||!d.ok)throw Error(d.error||'Request gagal');return d;
}
function orderStatus(o){return String(o.payment_status||o.paymentStatus||o.payment||'pending').toLowerCase()}
function orderRef(o){return o.order_no||o.orderNo||o.order_ref||o.id||'—'}
function customer(o){return o.customer_name||o.customerName||o.name||'Customer'}
function phone(o){return o.phone||o.customer_phone||o.customerPhone||''}
function total(o){const cents=o.total_minor??o.totalMinor??o.amount_minor??o.amountMinor;if(cents!==undefined&&cents!==null)return Number(cents||0);return Math.round(Number(o.total||o.amount||0)*100)}
function dateFmt(v){if(!v)return'—';const d=new Date(v);return Number.isNaN(d.getTime())?String(v):d.toLocaleDateString('ms-MY',{day:'2-digit',month:'short',year:'numeric'})}
function typeLabel(t){return t==='quotation'?'Quotation':t==='invoice'?'Invoice':t==='receipt'?'Official Receipt':'Delivery Order'}
function typeShort(t){return t==='quotation'?'QT':t==='invoice'?'INV':t==='receipt'?'RC':'DO'}
function savedFor(orderId,type){return documents.find(d=>String(d.order_id)===String(orderId)&&d.type===type)}
function renderOrders(){
  const q=$('docSearch').value.trim().toLowerCase(),list=orders.filter(o=>!q||[orderRef(o),customer(o),phone(o)].join(' ').toLowerCase().includes(q));
  $('docList').innerHTML=list.map(o=>{
    const id=o.id||orderRef(o),paid=orderStatus(o)==='paid';
    const saved=['quotation','invoice','receipt','delivery_order'].filter(t=>savedFor(id,t)).map(typeShort).join(' · ');
    return `<article class="rqDocRow"><div class="rqDocRef">${esc(orderRef(o))}<div class="rqDocMeta">${esc(dateFmt(o.created_at||o.createdAt))}</div>${saved?`<span class="rqDocSaved">Saved: ${esc(saved)}</span>`:''}</div><div class="rqDocCustomer"><b>${esc(customer(o))}</b><span>${esc(phone(o)||'Tiada WhatsApp')}</span></div><div class="rqDocAmount">${money(total(o))}</div><div class="rqDocStatus"><span class="rqDocBadge ${paid?'paid':'pending'}">${paid?'PAID':'PENDING'}</span></div><div class="rqDocButtons"><button class="btn" data-create="quotation" data-id="${esc(id)}">Quotation</button><button class="btn" data-create="invoice" data-id="${esc(id)}">Invoice</button><button class="btn" data-create="receipt" data-id="${esc(id)}" ${paid?'':'disabled'}>Receipt</button><button class="btn" data-create="delivery_order" data-id="${esc(id)}">DO</button></div></article>`;
  }).join('')||'<div class="rqDocsState">Tiada order dijumpai.</div>';
  document.querySelectorAll('[data-create]').forEach(b=>b.addEventListener('click',()=>createAndOpen(b.dataset.create,b.dataset.id)));
}
function renderHistory(){
  $('docSaved').textContent=documents.length;
  $('docHistory').innerHTML=documents.map(d=>`<article class="rqHistRow"><div><div class="rqHistType">${esc(typeLabel(d.type).toUpperCase())}</div><div class="rqHistNo">${esc(d.number)}</div></div><div class="rqHistDate">${esc(dateFmt(d.issued_at||d.created_at))}</div><div class="rqHistCustomer">${esc(d.customer_name||'Customer')}<br><span class="rqDocMeta">${esc(d.customer_phone||'')}</span></div><div><span class="rqDocBadge ${String(d.payment_status).toLowerCase()==='paid'?'paid':'pending'}">${esc(String(d.status||'issued').toUpperCase())}</span></div><div class="rqHistActions"><button class="btn" data-open-doc="${esc(d.id)}">Buka</button><button class="btn" data-share-doc="${esc(d.id)}">WhatsApp</button></div></article>`).join('')||'<div class="rqDocsState">Belum ada dokumen rasmi dijana.</div>';
  document.querySelectorAll('[data-open-doc]').forEach(b=>b.addEventListener('click',()=>openSaved(b.dataset.openDoc)));
  document.querySelectorAll('[data-share-doc]').forEach(b=>b.addEventListener('click',async()=>{await openSaved(b.dataset.shareDoc,false);shareWhatsApp()}));
}
async function load(){
  try{
    $('docState').textContent='Memuatkan order…';
    const [o,d,s]=await Promise.all([api('listOrders',{limit:100}),api('listDocuments',{limit:100}),api('documentSettings')]);
    orders=Array.isArray(o.orders)?o.orders:[];documents=Array.isArray(d.documents)?d.documents:[];docSettings=s.settings||{};
    $('docOrders').textContent=orders.length;$('docPaid').textContent=orders.filter(x=>orderStatus(x)==='paid').length;$('docState').textContent=orders.length?'':'Belum ada order.';
    fillSettings();renderOrders();renderHistory();
  }catch(e){$('docState').textContent=e.message;toast(e.message,true)}
}
async function createAndOpen(type,id){
  try{toast('Menjana '+typeLabel(type)+'…');const d=await api('createDocument',{type,orderId:id},'POST');activeDoc=d.document;if(d.created){documents.unshift(activeDoc);toast(activeDoc.number+' disimpan');}else toast(activeDoc.number+' sudah wujud');renderOrders();renderHistory();showDocument();}catch(e){toast(e.message,true)}
}
async function openSaved(id,show=true){try{const d=await api('getDocument',{documentId:id});activeDoc=d.document;if(show)showDocument();return activeDoc}catch(e){toast(e.message,true);throw e}}
function showDocument(){if(!activeDoc)return;$('docModalTitle').textContent=typeLabel(activeDoc.type)+' · '+activeDoc.number;$('docPreview').innerHTML=paper(activeDoc);$('docWhatsapp').style.display=activeDoc.customer_phone?'':'none';$('docModal').classList.add('open');$('docModal').setAttribute('aria-hidden','false')}
function paper(doc){
  const c=doc.company||{},isDO=doc.type==='delivery_order',isPaid=String(doc.payment_status).toLowerCase()==='paid'||doc.status==='paid';
  const rows=(doc.items||[]).map(i=>isDO?`<tr><td>${esc(i.description)}${i.variation?`<br><small>${esc(i.variation)}</small>`:''}</td><td>${Number(i.quantity||1)}</td></tr>`:`<tr><td>${esc(i.description)}${i.variation?`<br><small>${esc(i.variation)}</small>`:''}</td><td>${Number(i.quantity||1)}</td><td>${money(i.unit_price_minor)}</td><td>${money(i.line_total_minor)}</td></tr>`).join('');
  const companyLines=[c.registrationNo?`No. Daftar: ${c.registrationNo}`:'',c.address||'',c.phone||'',c.email||''].filter(Boolean).join('\n');
  const detail=`<b>Order:</b> ${esc(doc.order_id)}<br><b>Issued:</b> ${esc(dateFmt(doc.issued_at))}${doc.due_at?`<br><b>${doc.type==='quotation'?'Valid until':'Due'}:</b> ${esc(dateFmt(doc.due_at))}`:''}<br><span class="rqPaperStatus ${isPaid?'paid':'unpaid'}">${isPaid?'PAID':doc.type==='quotation'?'ISSUED':'UNPAID'}</span>`;
  const table=isDO?`<table class="rqPaperTable"><thead><tr><th>DESCRIPTION</th><th>QTY</th></tr></thead><tbody>${rows}</tbody></table>`:`<table class="rqPaperTable"><thead><tr><th>DESCRIPTION</th><th>QTY</th><th>UNIT</th><th>AMOUNT</th></tr></thead><tbody>${rows}</tbody></table>`;
  const totals=isDO?'':`<div class="rqPaperTotals"><div><span>Subtotal</span><b>${money(doc.subtotal_minor)}</b></div>${Number(doc.discount_minor)?`<div><span>Discount</span><b>- ${money(doc.discount_minor)}</b></div>`:''}${Number(doc.shipping_minor)?`<div><span>Shipping</span><b>${money(doc.shipping_minor)}</b></div>`:''}${Number(doc.tax_minor)?`<div><span>Tax</span><b>${money(doc.tax_minor)}</b></div>`:''}<div class="grand"><span>Total</span><b>${money(doc.total_minor)}</b></div></div>`;
  const bank=!isDO&&c.bank?`<div class="rqPaperBank"><b>PAYMENT DETAILS</b><br>${esc(c.bank)}</div>`:'';
  const foot=doc.type==='quotation'?'Quotation ini bukan bukti pembayaran.':doc.type==='invoice'?'Invoice ini merekodkan amaun yang perlu dibayar.':doc.type==='receipt'?'Official Receipt ini dikeluarkan selepas bayaran disahkan.':'Delivery Order mengesahkan item untuk penghantaran/serahan.';
  return `<section class="rqPaper"><div class="rqPaperTop"><div><div class="rqPaperBrand">${esc(c.companyName||'REQOO')}<span>${(c.companyName||'REQOO.CO').includes('.CO')?'.CO':''}</span></div><div class="rqDocMeta">Quality · Design · Innovation</div><div class="rqPaperCompany">${esc(companyLines)}</div></div><div class="rqPaperType"><h1>${esc(typeLabel(doc.type).toUpperCase())}</h1><small>${esc(doc.number)}</small></div></div><div class="rqPaperGrid"><div><div class="rqPaperLabel">BILL TO</div><b>${esc(doc.customer_name||'Customer')}</b><br><span>${esc(doc.customer_phone||'—')}</span>${doc.customer_email?`<br><span>${esc(doc.customer_email)}</span>`:''}</div><div><div class="rqPaperLabel">DETAIL</div>${detail}</div></div>${doc.type==='receipt'?'<div class="rqReceiptNote">Bayaran telah disahkan oleh Admin Reqoo.</div>':''}${table}${totals}${bank}<div class="rqPaperFoot">${esc(foot)}<br>Generated from REQOO Admin · ${esc(doc.number)}</div></section>`;
}
function close(){ $('docModal').classList.remove('open');$('docModal').setAttribute('aria-hidden','true') }
function printDoc(){if(!activeDoc)return;const w=window.open('','_blank');if(!w)return toast('Benarkan popup untuk Print / Save PDF.',true);w.document.write('<!doctype html><html><head><title>'+esc(activeDoc.number)+'</title><link rel="stylesheet" href="/admin/documents-v1.css?v=1"><link rel="stylesheet" href="/admin/documents-v2.css?v=1"><style>body{background:#fff!important;padding:18px}.rqPaper{box-shadow:none;border:0}@media print{body{padding:0}}</style></head><body>'+paper(activeDoc)+'</body></html>');w.document.close();w.focus();setTimeout(()=>w.print(),350)}
function waPhone(v){let n=String(v||'').replace(/\D/g,'');if(n.startsWith('0'))n='60'+n.slice(1);return n}
function shareWhatsApp(){if(!activeDoc)return;const n=waPhone(activeDoc.customer_phone);if(!n)return toast('Nombor WhatsApp pelanggan tiada.',true);const link=location.origin.replace('admin.','')+'/d/'+encodeURIComponent(activeDoc.share_token);const text=`Salam ${activeDoc.customer_name||''}, ini ${typeLabel(activeDoc.type)} ${activeDoc.number} daripada Reqoo.co.\n\n${link}`;window.open('https://wa.me/'+n+'?text='+encodeURIComponent(text),'_blank','noopener')}
function fillSettings(){const s=docSettings;$('sCompany').value=s.companyName||'REQOO.CO';$('sReg').value=s.registrationNo||'';$('sAddress').value=s.address||'';$('sPhone').value=s.phone||'';$('sEmail').value=s.email||'';$('sBank').value=s.bank||'';$('sQuoteDays').value=s.quoteValidDays??7;$('sInvoiceDays').value=s.invoiceDueDays??14}
async function saveSettings(){try{const payload={companyName:$('sCompany').value,registrationNo:$('sReg').value,address:$('sAddress').value,phone:$('sPhone').value,email:$('sEmail').value,bank:$('sBank').value,quoteValidDays:$('sQuoteDays').value,invoiceDueDays:$('sInvoiceDays').value};const d=await api('saveDocumentSettings',payload,'POST');docSettings=d.settings||payload;toast('Maklumat syarikat disimpan');$('docsSettings').classList.remove('open')}catch(e){toast(e.message,true)}}
$('refreshDocs').addEventListener('click',load);$('docSearch').addEventListener('input',renderOrders);$('toggleSettings').addEventListener('click',()=>$('docsSettings').classList.toggle('open'));$('saveSettings').addEventListener('click',saveSettings);$('docClose').addEventListener('click',close);$('docCloseBottom').addEventListener('click',close);$('docPrint').addEventListener('click',printDoc);$('docWhatsapp').addEventListener('click',shareWhatsApp);$('docModal').addEventListener('click',e=>{if(e.target.id==='docModal')close()});
if(!token())location.href='/admin/?return='+encodeURIComponent(location.pathname);else load();
})();

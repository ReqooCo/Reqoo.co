(()=>{
'use strict';
const API='/api/shop-admin';
let orders=[],documents=[],activeDoc=null,docSettings={},ordersLoaded=false,ordersLoading=null,settingsLoaded=false,settingsLoading=null,docsLoading=null,documentsReady=false;const deepParams=new URLSearchParams(location.search),initialDocOrder=deepParams.get('order')||'',initialDocQuery=deepParams.get('q')||'';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>'RM'+(Number(n||0)/100).toFixed(2);
const toMinor=v=>Math.max(0,Math.round((Number(v)||0)*100));
const LEGAL_NAME='AB ART TRADING',SSM_NO='201903337879 (003053605-X)';
function cleanField(v){const s=String(v??'').trim();return !s||/^(?:-|—|n\/?a|none|null)$/i.test(s)?'':s}
function toast(msg,err=false){const el=$('docsToast');el.textContent=msg;el.className='rqDocsToast show'+(err?' err':'');clearTimeout(toast.t);toast.t=setTimeout(()=>el.className='rqDocsToast',2600)}
async function api(action,extra={},method='GET'){
  let url=new URL(API,location.origin),opt={method,headers:{},cache:'no-store'};
  if(method==='GET'){url.searchParams.set('action',action);Object.entries(extra).forEach(([k,v])=>{if(v!==undefined&&v!==null&&v!=='')url.searchParams.set(k,v)});}
  else{opt.headers['Content-Type']='application/json';opt.body=JSON.stringify({action,...extra});}
  const r=await fetch(url,opt);let d={};try{d=await r.json()}catch{}
  if(r.status===401){location.href='/admin/?return='+encodeURIComponent(location.pathname+location.search);throw Error('Sesi Admin tamat.');}
  if(!r.ok||!d.ok)throw Error(d.error||'Request gagal');return d;
}
function orderStatus(o){return String(o.payment_status||o.paymentStatus||o.payment||'pending').toLowerCase()}
function orderRef(o){return o.order_no||o.orderNo||o.order_ref||o.id||'—'}
function customer(o){return o.customer_name||o.customerName||o.name||'Customer'}
function phone(o){return o.phone||o.customer_phone||o.customerPhone||''}
function total(o){const cents=o.total_minor??o.totalMinor??o.amount_minor??o.amountMinor;if(cents!==undefined&&cents!==null)return Number(cents||0);return Math.round(Number(o.total||o.amount||0)*100)}
function dateFmt(v){if(!v)return'—';const d=new Date(v);return Number.isNaN(d.getTime())?String(v):d.toLocaleDateString('ms-MY',{day:'2-digit',month:'short',year:'numeric'})}
function typeLabel(t){return t==='quotation'?'Quotation':t==='invoice'?'Invoice':t==='receipt'?'Official Receipt':'Delivery Order'}
function typeShort(t){return t==='invoice'?'INV':t==='receipt'?'RC':'DO'}
function quoteMeta(doc){return doc?.company&&typeof doc.company.quoteMeta==='object'?doc.company.quoteMeta:{}}
function savedFor(orderId,type){return documents.find(d=>String(d.order_id)===String(orderId)&&d.type===type)}
function replaceDocument(doc){const ix=documents.findIndex(x=>String(x.id)===String(doc.id));if(ix>=0)documents[ix]=doc;else documents.unshift(doc)}
function renderOrders(){
  const q=$('docSearch').value.trim().toLowerCase(),list=orders.filter(o=>!q||[orderRef(o),customer(o),phone(o)].join(' ').toLowerCase().includes(q));
  $('docList').innerHTML=list.map(o=>{
    const id=o.id||orderRef(o),paid=orderStatus(o)==='paid';
    const saved=['invoice','receipt','delivery_order'].filter(t=>savedFor(id,t)).map(typeShort).join(' · ');
    return `<article class="rqDocRow"><div class="rqDocRef">${esc(orderRef(o))}<div class="rqDocMeta">${esc(dateFmt(o.created_at||o.createdAt))}</div>${saved?`<span class="rqDocSaved">Saved: ${esc(saved)}</span>`:''}</div><div class="rqDocCustomer"><b>${esc(customer(o))}</b><span>${esc(phone(o)||'Tiada WhatsApp')}</span></div><div class="rqDocAmount">${money(total(o))}</div><div class="rqDocStatus"><span class="rqDocBadge ${paid?'paid':'pending'}">${paid?'PAID':'PENDING'}</span></div><div class="rqDocButtons"><button class="btn" data-create="invoice" data-id="${esc(id)}">Invoice</button><button class="btn" data-create="receipt" data-id="${esc(id)}" ${paid?'':'disabled'}>Receipt</button><button class="btn" data-create="delivery_order" data-id="${esc(id)}">DO</button></div></article>`;
  }).join('')||'<div class="rqDocsState">Tiada order dijumpai.</div>';
  document.querySelectorAll('[data-create]').forEach(b=>b.addEventListener('click',()=>createAndOpen(b.dataset.create,b.dataset.id)));
}
function publishDocuments(){
  window.__REQOO_DOCUMENTS__=documents.slice();
  document.dispatchEvent(new CustomEvent('rq:documents-changed',{detail:{documents:window.__REQOO_DOCUMENTS__}}));
  if(!documentsReady){
    documentsReady=true;
    document.documentElement.dataset.rqDocumentsReady='1';
    document.dispatchEvent(new CustomEvent('rq:documents-ready',{detail:{documents:window.__REQOO_DOCUMENTS__,count:documents.length}}));
  }
}
function renderHistory(){
  $('docSaved').textContent=documents.length;
  $('docHistory').innerHTML=documents.map(d=>{
    const quote=d.type==='quotation',paid=!quote&&String(d.payment_status).toLowerCase()==='paid';
    const status=quote?String(d.status||'issued').toUpperCase():(paid?'PAID':String(d.status||'issued').toUpperCase());
    return `<article class="rqHistRow"><div><div class="rqHistType">${esc(typeLabel(d.type).toUpperCase())}</div><div class="rqHistNo">${esc(d.number)}</div></div><div class="rqHistDate">${esc(dateFmt(d.issued_at||d.created_at))}</div><div class="rqHistCustomer">${esc(d.customer_name||'Customer')}<br><span class="rqDocMeta">${esc(d.customer_phone||'')}</span></div><div><span class="rqDocBadge ${paid?'paid':'pending'}">${esc(status)}</span></div><div class="rqHistActions"><button class="btn" data-open-doc="${esc(d.id)}">Buka</button><button class="btn" data-share-doc="${esc(d.id)}">WhatsApp</button></div></article>`;
  }).join('')||'<div class="rqDocsState">Belum ada dokumen rasmi dijana.</div>';
  document.querySelectorAll('[data-open-doc]').forEach(b=>b.addEventListener('click',()=>openSaved(b.dataset.openDoc)));
  document.querySelectorAll('[data-share-doc]').forEach(b=>b.addEventListener('click',async()=>{await openSaved(b.dataset.shareDoc,false);shareWhatsApp()}));
  publishDocuments();
}
async function loadSettings(force=false){
  if(settingsLoaded&&!force)return docSettings;
  if(settingsLoading)return settingsLoading;
  settingsLoading=api('documentSettings').then(s=>{
    docSettings=s.settings||{};settingsLoaded=true;fillSettings();fillQuoteDefaults();return docSettings;
  }).catch(e=>{console.warn('REQOO document settings:',e);return docSettings}).finally(()=>{settingsLoading=null});
  return settingsLoading;
}
async function loadOrders(force=false){
  if(ordersLoaded&&!force)return orders;
  if(ordersLoading)return ordersLoading;
  $('docState').textContent='Memuatkan order…';
  ordersLoading=api('listOrders',{limit:1000}).then(o=>{
    orders=Array.isArray(o.orders)?o.orders:[];ordersLoaded=true;
    $('docOrders').textContent=orders.length;$('docPaid').textContent=orders.filter(x=>['paid','partial'].includes(orderStatus(x))).length;
    $('docState').textContent=orders.length?'':'Belum ada order.';renderOrders();return orders;
  }).catch(e=>{$('docState').textContent=e.message;toast(e.message,true);return orders}).finally(()=>{ordersLoading=null});
  return ordersLoading;
}
async function load(force=false){
  if(docsLoading)return docsLoading;
  if(!documents.length)$('docHistory').innerHTML='<div class="rqDocsState">Memuatkan dokumen…</div>';
  docsLoading=api('listDocuments',{limit:150}).then(d=>{
    documents=Array.isArray(d.documents)?d.documents:[];renderHistory();return documents;
  }).catch(e=>{$('docHistory').innerHTML='<div class="rqDocsState">'+esc(e.message)+'</div>';toast(e.message,true);throw e}).finally(()=>{docsLoading=null});
  const result=await docsLoading;
  if(ordersLoaded)loadOrders(true);
  return result;
}
async function applyDeepLink(){let term=initialDocQuery;if(initialDocOrder){try{const exact=await api('listDocuments',{orderId:initialDocOrder,limit:50}),seen=new Set(documents.map(d=>String(d.id)));for(const d of exact.documents||[]){if(!seen.has(String(d.id))){documents.push(d);seen.add(String(d.id))}}renderHistory()}catch{}await loadOrders();const match=orders.find(o=>String(o.id||'')===initialDocOrder||orderRef(o)===initialDocOrder);term=match?orderRef(match):initialDocOrder;const panel=$('rqOrderSourcePanel'),btn=$('toggleOrderDrawer');panel?.classList.add('open');btn?.classList.add('active');btn?.setAttribute('aria-expanded','true');setTimeout(()=>panel?.scrollIntoView({behavior:'smooth',block:'start'}),40)}if(term){$('docSearch').value=term;renderOrders();const unified=$('docUnifiedSearch');if(unified){unified.value=term;setTimeout(()=>unified.dispatchEvent(new Event('input',{bubbles:true})),0)}}}
async function createAndOpen(type,id){
  try{toast('Menjana '+typeLabel(type)+'…');const d=await api('createDocument',{type,orderId:id},'POST');activeDoc=d.document;if(d.created){documents.unshift(activeDoc);toast(activeDoc.number+' disimpan');}else toast(activeDoc.number+' sudah wujud');renderOrders();renderHistory();showDocument();}catch(e){toast(e.message,true)}
}
async function openSaved(id,show=true){try{const d=await api('getDocument',{documentId:id});activeDoc=d.document;if(show)showDocument();return activeDoc}catch(e){toast(e.message,true);throw e}}
function showDocument(){
  if(!activeDoc)return;
  const meta=quoteMeta(activeDoc),canConvert=activeDoc.type==='quotation'&&meta.source==='custom'&&!meta.convertedOrderId;
  $('docModalTitle').textContent=typeLabel(activeDoc.type)+' · '+activeDoc.number;
  $('docPreview').innerHTML=paper(activeDoc);
  $('docWhatsapp').style.display=activeDoc.customer_phone?'':'none';
  $('docConvert').style.display=canConvert?'':'none';
  $('docModal').classList.add('open');$('docModal').setAttribute('aria-hidden','false');
}
function customerBlock(doc,meta){
  const name=cleanField(doc.customer_name)||'Customer',attention=cleanField(meta.attention),phone=cleanField(doc.customer_phone),email=cleanField(doc.customer_email),address=cleanField(meta.customerAddress);
  const contacts=[phone?`<div><span>TEL / WHATSAPP</span><b>${esc(phone)}</b></div>`:'',email?`<div><span>EMAIL</span><b>${esc(email)}</b></div>`:''].join('');
  return `<div class="rqPaperCustomer"><div class="rqPaperCustomerName">${esc(name)}</div>${attention?`<div class="rqPaperAttention"><span>ATTN</span><b>${esc(attention)}</b></div>`:''}${contacts?`<div class="rqPaperCustomerContacts">${contacts}</div>`:''}${address?`<div class="rqPaperCustomerAddress"><span>ADDRESS</span><p>${esc(address)}</p></div>`:''}</div>`;
}
function paymentTerms(meta,isQuote){
  const pct=Math.max(0,Math.min(100,Number(meta?.depositPercent||0)));
  if(!isQuote||pct<=0)return'';
  const balance=Math.max(0,100-pct);
  return `<div class="rqPaperPaymentTerms"><b>PAYMENT TERMS</b><p>${esc(pct)}% deposit is required to confirm the order and commence artwork preparation and production. The remaining ${esc(balance)}% balance must be paid in full before delivery or collection.</p></div>`;
}
function paper(doc){
  const c=doc.company||{},meta=quoteMeta(doc),isQuote=doc.type==='quotation',isDO=doc.type==='delivery_order',isPaid=!isQuote&&(String(doc.payment_status).toLowerCase()==='paid'||doc.status==='paid');
  const rows=(doc.items||[]).map(i=>isDO?`<tr><td>${esc(i.description)}${i.variation?`<br><small>${esc(i.variation)}</small>`:''}</td><td>${Number(i.quantity||1)}</td></tr>`:`<tr><td>${esc(i.description)}${i.variation?`<br><small>${esc(i.variation)}</small>`:''}</td><td>${Number(i.quantity||1)}</td><td>${money(i.unit_price_minor)}</td><td>${money(i.line_total_minor)}</td></tr>`).join('');
  const regNo=cleanField(c.registrationNo)||SSM_NO,companyLines=[cleanField(c.address),cleanField(c.phone),cleanField(c.email)].filter(Boolean).join('\n');
  const statusText=isQuote?String(doc.status||'issued').toUpperCase():(isPaid?'PAID':'UNPAID');
  const converted=isQuote&&meta.convertedOrderNo?`<br><b>Order:</b> ${esc(meta.convertedOrderNo)}`:'';
  const detail=`${!isQuote?`<b>Order:</b> ${esc(doc.order_id)}<br>`:''}<b>Issued:</b> ${esc(dateFmt(doc.issued_at))}${doc.due_at?`<br><b>${isQuote?'Valid until':'Due'}:</b> ${esc(dateFmt(doc.due_at))}`:''}${converted}<br><span class="rqPaperStatus ${isPaid?'paid':'unpaid'}">${esc(statusText)}</span>`;
  const table=isDO?`<table class="rqPaperTable"><thead><tr><th>DESCRIPTION</th><th>QTY</th></tr></thead><tbody>${rows}</tbody></table>`:`<table class="rqPaperTable"><thead><tr><th>DESCRIPTION</th><th>QTY</th><th>UNIT</th><th>AMOUNT</th></tr></thead><tbody>${rows}</tbody></table>`;
  const totals=isDO?'':`<div class="rqPaperTotals"><div><span>Subtotal</span><b>${money(doc.subtotal_minor)}</b></div>${Number(doc.discount_minor)?`<div><span>Discount</span><b>- ${money(doc.discount_minor)}</b></div>`:''}${Number(doc.shipping_minor)?`<div><span>Delivery / Other</span><b>${money(doc.shipping_minor)}</b></div>`:''}${Number(doc.tax_minor)?`<div><span>Tax</span><b>${money(doc.tax_minor)}</b></div>`:''}<div class="grand"><span>Total</span><b>${money(doc.total_minor)}</b></div>${isQuote&&Number(meta.depositPercent)>0?`<div class="deposit"><span>Deposit ${esc(meta.depositPercent)}%</span><b>${money(Math.round(Number(doc.total_minor||0)*Number(meta.depositPercent)/100))}</b></div>`:''}</div>`;
  const bank=!isDO&&c.bank?`<div class="rqPaperBank"><b>PAYMENT DETAILS</b><br>${esc(c.bank)}</div>`:'';
  const quoteInfo=isQuote&&(meta.notes||meta.terms)?`<div class="rqPaperQuoteInfo">${meta.notes?`<div><b>NOTES</b><p>${esc(meta.notes)}</p></div>`:''}${meta.terms?`<div><b>TERMS & CONDITIONS</b><p>${esc(meta.terms)}</p></div>`:''}</div>`:'';
  const foot=isQuote?'Quotation ini bukan bukti pembayaran.':doc.type==='invoice'?'Invoice ini merekodkan amaun yang perlu dibayar.':doc.type==='receipt'?'Official Receipt ini dikeluarkan selepas bayaran disahkan.':'Delivery Order mengesahkan item untuk penghantaran/serahan.';
  return `<section class="rqPaper"><div class="rqPaperTop"><div><div class="rqPaperBrand">${esc(c.companyName||'REQOO.CO')}</div><div class="rqPaperLegal">by ${esc(LEGAL_NAME)}</div><div class="rqPaperReg">SSM: ${esc(regNo)}</div><div class="rqDocMeta">Quality · Design · Innovation</div><div class="rqPaperCompany">${esc(companyLines)}</div></div><div class="rqPaperType"><h1>${esc(typeLabel(doc.type).toUpperCase())}</h1><small>${esc(doc.number)}</small></div></div><div class="rqPaperGrid"><div><div class="rqPaperLabel">BILL TO</div>${customerBlock(doc,meta)}</div><div><div class="rqPaperLabel">DETAIL</div>${detail}</div></div>${doc.type==='receipt'?'<div class="rqReceiptNote">Bayaran telah disahkan oleh Admin Reqoo.</div>':''}${table}${totals}${paymentTerms(meta,isQuote)}${quoteInfo}${bank}<div class="rqPaperFoot">${esc(foot)}<br>Generated from REQOO Admin · ${esc(doc.number)}</div></section>`;
}
function close(){ $('docModal').classList.remove('open');$('docModal').setAttribute('aria-hidden','true') }
function printDoc(){if(!activeDoc)return;const w=window.open('','_blank');if(!w)return toast('Benarkan popup untuk Print / Save PDF.',true);w.document.write('<!doctype html><html><head><title>'+esc(activeDoc.number)+'</title><link rel="stylesheet" href="/admin/document-template-v4.css?v=1"><link rel="stylesheet" href="/admin/document-deposit-note-v1.css?v=2"><style>body{background:#fff!important;padding:18px}.rqPaper{box-shadow:none;border:0}@media print{body{padding:0}.rqPaper{min-height:0!important;break-inside:auto!important}.rqPaperFoot{margin-top:18px!important}}</style></head><body>'+paper(activeDoc)+'</body></html>');w.document.close();w.focus();setTimeout(()=>w.print(),350)}
function waPhone(v){let n=String(v||'').replace(/\D/g,'');if(n.startsWith('0'))n='60'+n.slice(1);return n}
function shareWhatsApp(){
  if(!activeDoc)return;
  const n=waPhone(activeDoc.customer_phone);if(!n)return toast('Nombor WhatsApp pelanggan tiada.',true);
  const link=location.origin.replace('admin.','')+'/d/'+encodeURIComponent(activeDoc.share_token);
  const amount=activeDoc.type==='delivery_order'?'':money(activeDoc.total_minor),kind=typeLabel(activeDoc.type);
  const text=`Salam ${activeDoc.customer_name||''},\n\nREQOO.CO telah mengeluarkan ${kind} ${activeDoc.number}.${amount?'\nJumlah: '+amount:''}\n\nPautan rasmi REQOO.CO untuk semak dokumen:\n${link}\n\nPautan ini menggunakan domain rasmi reqoo.co. Boleh tekan untuk lihat dokumen penuh atau simpan PDF.`;
  window.open('https://wa.me/'+n+'?text='+encodeURIComponent(text),'_blank','noopener');
  const meta=quoteMeta(activeDoc);
  if(activeDoc.type==='quotation'&&meta.source==='custom'&&String(activeDoc.status||'issued').toLowerCase()==='issued'){
    api('updateCustomQuotationStatus',{documentId:activeDoc.id,status:'sent'},'POST').then(d=>{activeDoc=d.document;replaceDocument(activeDoc);renderHistory();if($('docModal').classList.contains('open'))showDocument()}).catch(()=>{});
  }
}
async function convertActiveQuote(){
  if(!activeDoc||activeDoc.type!=='quotation')return;
  if(!confirm(`Convert ${activeDoc.number} kepada order? Harga dan item quotation akan dikunci ke order baru.`))return;
  const btn=$('docConvert'),old=btn.textContent;btn.disabled=true;btn.textContent='Converting…';
  try{
    const d=await api('convertCustomQuotationToOrder',{documentId:activeDoc.id},'POST');
    activeDoc=d.document;replaceDocument(activeDoc);
    const ref=d.order?.order_no||d.order?.id||'order baru';
    toast(`Order ${ref} berjaya dibuat`);
    await load(true);if(ordersLoaded)await loadOrders(true);
    const fresh=await openSaved(activeDoc.id,false);activeDoc=fresh;showDocument();
  }catch(e){toast(e.message,true)}finally{btn.disabled=false;btn.textContent=old}
}
function fillSettings(){const s=docSettings;$('sCompany').value=s.companyName||'REQOO.CO';$('sReg').value=s.registrationNo||SSM_NO;$('sAddress').value=s.address||'';$('sPhone').value=s.phone||'';$('sEmail').value=s.email||'';$('sBank').value=s.bank||'';$('sQuoteDays').value=s.quoteValidDays??7;$('sInvoiceDays').value=s.invoiceDueDays??14}
async function saveSettings(){try{const payload={companyName:$('sCompany').value,registrationNo:$('sReg').value,address:$('sAddress').value,phone:$('sPhone').value,email:$('sEmail').value,bank:$('sBank').value,quoteValidDays:$('sQuoteDays').value,invoiceDueDays:$('sInvoiceDays').value};const d=await api('saveDocumentSettings',payload,'POST');docSettings=d.settings||payload;fillQuoteDefaults();toast('Maklumat syarikat disimpan');$('docsSettings').classList.remove('open')}catch(e){toast(e.message,true)}}
function addQuoteItem(data={}){
  const row=document.createElement('div');row.className='rqQuoteItem';
  row.innerHTML=`<input data-q="description" placeholder="Contoh: Premium 3D Plaque" value="${esc(data.description||'')}"><input data-q="variation" placeholder="A4 / Gold / Custom" value="${esc(data.variation||'')}"><input data-q="quantity" type="number" min="0.001" step="1" value="${Number(data.quantity||1)}"><input data-q="unit" type="number" min="0" step="0.01" value="${Number(data.unit||0)}"><b data-q-total>RM0.00</b><button type="button" class="rqQuoteRemove" aria-label="Buang item">×</button>`;
  $('quoteItems').append(row);row.querySelectorAll('input').forEach(i=>i.addEventListener('input',recalcQuote));row.querySelector('.rqQuoteRemove').addEventListener('click',()=>{row.remove();if(!$('quoteItems').children.length)addQuoteItem();recalcQuote()});recalcQuote();
}
function quoteRows(){return [...$('quoteItems').querySelectorAll('.rqQuoteItem')]}
function recalcQuote(){let subtotal=0;quoteRows().forEach(row=>{const qty=Math.max(0,Number(row.querySelector('[data-q="quantity"]').value)||0),unit=toMinor(row.querySelector('[data-q="unit"]').value),line=Math.round(qty*unit);subtotal+=line;row.querySelector('[data-q-total]').textContent=money(line)});const discount=Math.min(subtotal,toMinor($('qDiscount').value)),shipping=toMinor($('qShipping').value),grand=Math.max(0,subtotal-discount+shipping);$('qSubtotal').textContent=money(subtotal);$('qDiscountView').textContent='- '+money(discount);$('qShippingView').textContent=money(shipping);$('qTotal').textContent=money(grand)}
function fillQuoteDefaults(){if($('qValidDays'))$('qValidDays').value=docSettings.quoteValidDays??7}
function resetQuoteForm(){['qCustomer','qPhone','qEmail','qAttention','qAddress','qNotes','qTerms'].forEach(id=>$(id).value='');$('qDiscount').value='0';$('qShipping').value='0';$('qDeposit').value='0';fillQuoteDefaults();$('quoteItems').innerHTML='';addQuoteItem();recalcQuote()}
function quotePayload(){const items=quoteRows().map(row=>({description:row.querySelector('[data-q="description"]').value.trim(),variation:row.querySelector('[data-q="variation"]').value.trim(),quantity:Number(row.querySelector('[data-q="quantity"]').value)||0,unitPriceMinor:toMinor(row.querySelector('[data-q="unit"]').value)})).filter(x=>x.description&&x.quantity>0);return {customerName:$('qCustomer').value.trim(),customerPhone:$('qPhone').value.trim(),customerEmail:$('qEmail').value.trim(),attention:$('qAttention').value.trim(),customerAddress:$('qAddress').value.trim(),items,validDays:Number($('qValidDays').value||docSettings.quoteValidDays||7),discountMinor:toMinor($('qDiscount').value),shippingMinor:toMinor($('qShipping').value),depositPercent:Number($('qDeposit').value||0),notes:$('qNotes').value.trim(),terms:$('qTerms').value.trim()}}
async function createCustomQuote(){const payload=quotePayload();if(!payload.customerName)return toast('Masukkan nama pelanggan / syarikat.',true);if(!payload.items.length)return toast('Masukkan sekurang-kurangnya satu item.',true);const btn=$('qCreate'),old=btn.textContent;btn.disabled=true;btn.textContent='Creating…';try{const d=await api('createCustomQuotation',payload,'POST');activeDoc=d.document;documents.unshift(activeDoc);renderHistory();toast(activeDoc.number+' berjaya dibuat');showDocument();resetQuoteForm();$('quoteBuilderBody').classList.remove('open');$('toggleQuoteBuilder').textContent='+ Quotation Baru'}catch(e){toast(e.message,true)}finally{btn.disabled=false;btn.textContent=old}}
$('refreshDocs').addEventListener('click',()=>{load(true);if(ordersLoaded)loadOrders(true);if(settingsLoaded)loadSettings(true)});$('docSearch').addEventListener('input',renderOrders);$('toggleOrderDrawer').addEventListener('click',()=>{if(!ordersLoaded)loadOrders()});$('toggleSettings').addEventListener('click',()=>{const panel=$('docsSettings');panel.classList.toggle('open');if(panel.classList.contains('open'))loadSettings()});$('saveSettings').addEventListener('click',saveSettings);$('toggleQuoteBuilder').addEventListener('click',()=>{const body=$('quoteBuilderBody');body.classList.toggle('open');if(body.classList.contains('open'))loadSettings();$('toggleQuoteBuilder').textContent=body.classList.contains('open')?'Tutup':'+ Quotation Baru'});$('qAddItem').addEventListener('click',()=>addQuoteItem());$('qReset').addEventListener('click',resetQuoteForm);$('qCreate').addEventListener('click',createCustomQuote);$('qDiscount').addEventListener('input',recalcQuote);$('qShipping').addEventListener('input',recalcQuote);$('docClose').addEventListener('click',close);$('docCloseBottom').addEventListener('click',close);$('docPrint').addEventListener('click',printDoc);$('docWhatsapp').addEventListener('click',shareWhatsApp);$('docConvert').addEventListener('click',convertActiveQuote);$('docModal').addEventListener('click',e=>{if(e.target.id==='docModal')close()});
addQuoteItem();
load().then(applyDeepLink).catch(()=>{});
})();

(()=>{
'use strict';
const API='/api/shop-admin';
let documentOffset=0,documentTotal=0,documentHasMore=false,documentSeq=0,documentFilter='all';
let orders=[],documents=[],activeDoc=null,editingQuoteId=null,docSettings={},ordersLoaded=false,ordersLoading=null,orderOffset=0,orderTotal=0,orderHasMore=false,orderLoadSeq=0,settingsLoaded=false,settingsLoading=null,docsLoading=null,documentsReady=false;const deepParams=new URLSearchParams(location.search),initialDocOrder=deepParams.get('order')||'',initialDocQuery=deepParams.get('q')||'';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>'RM'+(Number(n||0)/100).toFixed(2);
const toMinor=v=>Math.max(0,Math.round((Number(v)||0)*100));
const LEGAL_NAME='AB ART TRADING',SSM_NO='201903337879 (003053605-X)';
const DEFAULT_BANK_DETAILS='Bank: MAYBANK\nAccount Name: AB ART TRADING\nAccount No: 566010635319';
function cleanField(v){const s=String(v??'').trim();return !s||/^(?:-|—|n\/?a|none|null)$/i.test(s)?'':s}
function normalizeBankDetails(v){return cleanField(v).replace(/\\n/g,'\n').replace(/5660\s*1063\s*5319/g,'566010635319')}
function toast(msg,err=false){const el=$('docsToast');el.textContent=msg;el.className='rqDocsToast show'+(err?' err':'');clearTimeout(toast.t);toast.t=setTimeout(()=>el.className='rqDocsToast',2600)}
async function api(action,extra={},method='GET'){
  let url=new URL(API,location.origin),opt={method,headers:{},cache:'no-store'};
  if(method==='GET'){url.searchParams.set('action',action);Object.entries(extra).forEach(([k,v])=>{if(v!==undefined&&v!==null&&v!=='')url.searchParams.set(k,v)});}
  else{opt.headers['Content-Type']='application/json';opt.body=JSON.stringify({action,...extra});}
  const r=await fetch(url,opt);let d={};try{d=await r.json()}catch{}
  if(r.status===401){location.href='/admin/?return='+encodeURIComponent(location.pathname+location.search);throw Error('Admin session expired.');}
  if(!r.ok||!d.ok)throw Error(d.error||'Request failed');return d;
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
  $('docList').innerHTML=orders.map(o=>{
    const id=o.id||orderRef(o),paid=orderStatus(o)==='paid';
    const serverTypes=String(o.document_types||'').split(',').filter(Boolean),saved=['invoice','receipt','delivery_order'].filter(t=>savedFor(id,t)||serverTypes.includes(t)).map(typeShort).join(' · '),quote=savedFor(id,'quotation'),depositPct=Math.max(0,Math.min(100,Number(quoteMeta(quote).depositPercent||0))),invoiceLabel=depositPct>0&&depositPct<100?`Deposit Invoice ${depositPct}%`:'Invois';
    return `<article class="rqDocRow"><div class="rqDocRef">${esc(orderRef(o))}<div class="rqDocMeta">${esc(dateFmt(o.created_at||o.createdAt))}</div>${saved?`<span class="rqDocSaved">Saved: ${esc(saved)}</span>`:''}</div><div class="rqDocCustomer"><b>${esc(customer(o))}</b><span>${esc(phone(o)||'No WhatsApp number')}</span></div><div class="rqDocAmount">${money(total(o))}</div><div class="rqDocStatus"><span class="rqDocBadge ${paid?'paid':'pending'}">${paid?'PAID':'PENDING'}</span></div><div class="rqDocButtons"><button class="btn" data-create="invoice" data-id="${esc(id)}">${esc(invoiceLabel)}</button><button class="btn" data-create="receipt" data-id="${esc(id)}" ${paid?'':'disabled'}>Receipt</button><button class="btn" data-create="delivery_order" data-id="${esc(id)}">DO</button></div></article>`;
  }).join('')||'<div class="rqDocsState">No orders found.</div>';
  const more=$('loadMoreDocOrders');if(more){more.hidden=!orderHasMore;more.disabled=false;more.textContent='Load more'}
  $('docState').textContent=orders.length?`${orders.length} of ${orderTotal} padanan dipaparkan · carian server-side.`:'No orders found.';
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

  $('docHistory').innerHTML=documents.map(d=>{
    const quote=d.type==='quotation',paid=!quote&&String(d.payment_status).toLowerCase()==='paid';
    const status=quote?String(d.status||'issued').toUpperCase():(paid?'PAID':String(d.status||'issued').toUpperCase());
    return `<article class="rqHistRow" data-document-type="${esc(d.type)}" data-document-id="${esc(d.id)}"><div><div class="rqHistType">${esc(typeLabel(d.type).toUpperCase())}</div><div class="rqHistNo">${esc(d.number)}</div></div><div class="rqHistDate">${esc(dateFmt(d.issued_at||d.created_at))}</div><div class="rqHistCustomer">${esc(d.customer_name||'Customer')}<br><span class="rqDocMeta">${esc(d.customer_phone||'')}</span></div><div><span class="rqDocBadge ${paid?'paid':'pending'}">${esc(status)}</span></div><div class="rqHistActions"><button class="btn primary" data-open-doc="${esc(d.id)}">${quote?(d.status==='accepted'?'Teruskan ke order':'Semak quotation'):'Pratonton'}</button><details class="rqDocumentMore"><summary aria-label="Tindakan lain untuk ${esc(d.number)}">Lagi</summary><div class="rqDocumentMenu">${d.payment_id?'':`<button class="btn" data-share-doc="${esc(d.id)}">WhatsApp</button>`}</div></details></div></article>`;
  }).join('')||'<div class="rqDocsState">No official documents yet.</div>';
  document.querySelectorAll('[data-open-doc]').forEach(b=>b.addEventListener('click',async()=>{await openSaved(b.dataset.openDoc);if(activeDoc?.type==='quotation'&&activeDoc.status==='accepted')$('docConvert').focus()}));
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
async function loadOrders(reset=false){
  const seq=++orderLoadSeq;if(reset){orderOffset=0;orders=[]}
  if(ordersLoading&&!reset)return ordersLoading;
  $('docState').textContent=reset?'Loading orders…':'Loading more…';
  const offset=reset?0:orderOffset;
  ordersLoading=api('ordersDashboard',{q:$('docSearch').value.trim(),filter:'all',limit:80,offset}).then(o=>{
    if(seq!==orderLoadSeq)return orders;
    const batch=Array.isArray(o.orders)?o.orders:[];
    orders=reset?batch:[...orders,...batch.filter(n=>!orders.some(x=>String(x.id)===String(n.id)))];
    ordersLoaded=true;orderOffset=Number(o.offset||0)+batch.length;orderTotal=Number(o.total||0);orderHasMore=!!o.hasMore;
    $('docOrders').textContent=Number(o.stats?.total||0);$('docPaid').textContent=Number(o.stats?.paymentReady||0);
    renderOrders();return orders;
  }).catch(e=>{if(seq===orderLoadSeq){$('docState').textContent=e.message;toast(e.message,true)}return orders}).finally(()=>{ordersLoading=null});
  return ordersLoading;
}
async function load(force=false,append=false){
  const seq=++documentSeq,offset=append?documentOffset:0;
  const host=$('docHistory'),state=$('docResultsState'),more=$('loadMoreDocuments');
  host.setAttribute('aria-busy','true');state.textContent='Loading documents…';more.disabled=true;
  if(!append){documents=[];host.innerHTML='<div class="rqDocsState">Loading documents…</div>'}
  try{
    const d=await api('listDocuments',{limit:80,offset,q:$('docUnifiedSearch').value.trim(),type:documentFilter==='all'?'':documentFilter});
    if(seq!==documentSeq)return;
    const batch=Array.isArray(d.documents)?d.documents:[],seen=new Set(documents.map(x=>String(x.id)));
    documents=append?[...documents,...batch.filter(x=>!seen.has(String(x.id)))]:batch;
    documentOffset=Number(d.offset||0)+batch.length;documentTotal=Number(d.total??documents.length);documentHasMore=!!d.hasMore;
    if(d.stats){window.__REQOO_DOCUMENT_COUNTS__=d.stats;document.dispatchEvent(new CustomEvent('rq:documents-counts',{detail:d.stats}))}
    renderHistory();state.textContent=documents.length+' of '+documentTotal+' documents · searching all records';
    more.hidden=!documentHasMore;
    return documents;
  }catch(e){if(seq===documentSeq){state.textContent='Unable to load documents. '+e.message;host.innerHTML='<div class="rqDocsState">Try again using the Refresh button.</div>';toast(e.message,true)}}
  finally{if(seq===documentSeq){host.setAttribute('aria-busy','false');more.disabled=false}}
}
let documentSearchTimer;
$('docUnifiedSearch').addEventListener('input',()=>{clearTimeout(documentSearchTimer);if(document.documentElement.dataset.rqFinanceMode!=='1')documentSearchTimer=setTimeout(()=>load(true),260)});
document.addEventListener('rq:documents-type-filter',e=>{clearTimeout(documentSearchTimer);documentFilter=e.detail.type;load(true)});
$('loadMoreDocuments').addEventListener('click',()=>load(false,true));
async function applyDeepLink(){if($('rqOrderWorkspaces'))return;let term=initialDocQuery;if(initialDocOrder){try{const exact=await api('listDocuments',{orderId:initialDocOrder,limit:50}),seen=new Set(documents.map(d=>String(d.id)));for(const d of exact.documents||[]){if(!seen.has(String(d.id))){documents.push(d);seen.add(String(d.id))}}renderHistory()}catch{}let match=null;try{const detail=await api('getOrder',{orderId:initialDocOrder});match=detail.order||null}catch{}term=match?orderRef(match):initialDocOrder;$('docSearch').value=term;await loadOrders(true);if(match&&!orders.some(o=>String(o.id)===String(match.id))){orders.unshift(match);renderOrders()}const panel=$('rqOrderSourcePanel'),btn=$('toggleOrderDrawer');panel?.classList.add('open');btn?.classList.add('active');btn?.setAttribute('aria-expanded','true');setTimeout(()=>panel?.scrollIntoView({behavior:'smooth',block:'start'}),40)}if(term){const unified=$('docUnifiedSearch');if(unified){unified.value=term;setTimeout(()=>unified.dispatchEvent(new Event('input',{bubbles:true})),0)}}}
async function createAndOpen(type,id){
  try{toast('Menjana '+typeLabel(type)+'…');const d=await api('createDocument',{type,orderId:id},'POST');activeDoc=d.document;if(d.created){documents.unshift(activeDoc);toast(activeDoc.number+' saved');}else toast(activeDoc.number+' already exists');renderOrders();renderHistory();showDocument();}catch(e){toast(e.message,true)}
}
async function openSaved(id,show=true){const receipt=documents.find(d=>String(d.id)===String(id)&&d.payment_id);if(receipt){document.dispatchEvent(new CustomEvent('rq:documents-open-payment',{detail:{id:receipt.payment_id}}));return receipt}try{const d=await api('getDocument',{documentId:id});activeDoc=d.document;if(show)showDocument();return activeDoc}catch(e){toast(e.message,true);throw e}}
function showDocument(){
  if(!activeDoc)return;
  const meta=quoteMeta(activeDoc),isCustomQuote=activeDoc.type==='quotation'&&meta.source==='custom',canConvert=isCustomQuote&&!meta.convertedOrderId&&!['rejected','expired','cancelled'].includes(String(activeDoc.status||'').toLowerCase()),canEdit=canConvert,pct=Math.max(0,Math.min(100,Number(meta.depositPercent||0))),canDepositInvoice=isCustomQuote&&!!meta.convertedOrderId&&pct>0&&pct<100;
  $('docModalTitle').textContent=typeLabel(activeDoc.type)+' · '+activeDoc.number;
  $('docPreview').innerHTML=paper(activeDoc);
  $('docWhatsapp').style.display=activeDoc.customer_phone?'':'none';
  $('docEdit').style.display=canEdit?'':'none';
  $('docConvert').style.display=canConvert?'':'none';
  $('docDepositInvoice').style.display=canDepositInvoice?'':'none';
  if(canDepositInvoice)$('docDepositInvoice').textContent='Lihat invois';
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
  const c=doc.company||{},meta=quoteMeta(doc),isQuote=doc.type==='quotation',isInvoice=doc.type==='invoice',isDO=doc.type==='delivery_order',payState=String(doc.payment_status||'pending').toLowerCase(),isPaid=!isQuote&&(payState==='paid'||doc.status==='paid'),depositPct=Math.max(0,Math.min(100,Number(meta.depositPercent||0))),depositInvoice=isInvoice&&depositPct>0&&depositPct<100,depositMinor=depositInvoice?Math.round(Number(doc.total_minor||0)*depositPct/100):0,balanceAfterDeposit=depositInvoice?Math.max(0,Number(doc.total_minor||0)-depositMinor):0;
  const rows=(doc.items||[]).map(i=>isDO?`<tr><td>${esc(i.description)}${i.variation?`<br><small>${esc(i.variation)}</small>`:''}</td><td>${Number(i.quantity||1)}</td></tr>`:`<tr><td>${esc(i.description)}${i.variation?`<br><small>${esc(i.variation)}</small>`:''}</td><td>${Number(i.quantity||1)}</td><td>${money(i.unit_price_minor)}</td><td>${money(i.line_total_minor)}</td></tr>`).join('');
  const regNo=cleanField(c.registrationNo)||SSM_NO,companyLines=[cleanField(c.address),cleanField(c.phone),cleanField(c.email)].filter(Boolean).join('\n');
  const statusText=isQuote?String(doc.status||'issued').toUpperCase():(isPaid?'PAID':payState==='partial'?'PARTIAL':depositInvoice?'DEPOSIT DUE':'UNPAID');
  const converted=isQuote&&meta.convertedOrderNo?`<br><b>Order:</b> ${esc(meta.convertedOrderNo)}`:'';
  const detail=`${!isQuote?`<b>Order:</b> ${esc(doc.order_id)}<br>`:''}<b>Issued:</b> ${esc(dateFmt(doc.issued_at))}${doc.due_at?`<br><b>${isQuote?'Valid until':'Due'}:</b> ${esc(dateFmt(doc.due_at))}`:''}${converted}<br><span class="rqPaperStatus ${isPaid?'paid':'unpaid'}">${esc(statusText)}</span>`;
  const table=isDO?`<table class="rqPaperTable"><thead><tr><th>DESCRIPTION</th><th>QTY</th></tr></thead><tbody>${rows}</tbody></table>`:`<table class="rqPaperTable"><thead><tr><th>DESCRIPTION</th><th>QTY</th><th>UNIT PRICE</th><th>AMOUNT</th></tr></thead><tbody>${rows}</tbody></table>`;
  const invoiceDepositRows=depositInvoice?(payState==='partial'?`<div class="deposit"><span>Deposit Received ${esc(depositPct)}%</span><b>${money(depositMinor)}</b></div><div><span>Balance Due</span><b>${money(balanceAfterDeposit)}</b></div>`:`<div class="deposit"><span>Deposit Required ${esc(depositPct)}%</span><b>${money(depositMinor)}</b></div><div class="deposit"><span>AMOUNT DUE NOW</span><b>${money(depositMinor)}</b></div><div><span>Balance After Deposit</span><b>${money(balanceAfterDeposit)}</b></div>`):'';
  const totals=isDO?'':`<div class="rqPaperTotals"><div><span>Subtotal</span><b>${money(doc.subtotal_minor)}</b></div>${Number(doc.discount_minor)?`<div><span>Discount</span><b>- ${money(doc.discount_minor)}</b></div>`:''}${Number(doc.shipping_minor)?`<div><span>Delivery / Other</span><b>${money(doc.shipping_minor)}</b></div>`:''}${Number(doc.tax_minor)?`<div><span>Tax</span><b>${money(doc.tax_minor)}</b></div>`:''}<div class="grand"><span>Total Order</span><b>${money(doc.total_minor)}</b></div>${isQuote&&Number(meta.depositPercent)>0?`<div class="deposit"><span>Deposit ${esc(meta.depositPercent)}%</span><b>${money(Math.round(Number(doc.total_minor||0)*Number(meta.depositPercent)/100))}</b></div>`:''}${invoiceDepositRows}</div>`;
  const bankDetails=normalizeBankDetails(c.bank)||DEFAULT_BANK_DETAILS,bank=!isDO?`<div class="rqPaperBank"><b>PAYMENT DETAILS</b><br>${esc(bankDetails)}</div>`:'';
  const quoteInfo=isQuote&&(meta.notes||meta.terms)?`<div class="rqPaperQuoteInfo">${meta.notes?`<div><b>NOTES</b><p>${esc(meta.notes)}</p></div>`:''}${meta.terms?`<div><b>TERMS & CONDITIONS</b><p>${esc(meta.terms)}</p></div>`:''}</div>`:'';
  const foot=isQuote?'This quotation is not proof of payment.':doc.type==='invoice'?(depositInvoice?'This invoice shows the full order value and the deposit currently due.':'This invoice records the amount due.'):doc.type==='receipt'?'This official receipt was issued after payment confirmation.':'This delivery order confirms the items for delivery or collection.';
  return `<section class="rqPaper"><div class="rqPaperTop"><div><div class="rqPaperBrand">${esc(c.companyName||'REQOO.CO')}</div><div class="rqPaperLegal">by ${esc(LEGAL_NAME)}</div><div class="rqPaperReg">SSM: ${esc(regNo)}</div><div class="rqDocMeta">Quality · Design · Innovation</div><div class="rqPaperCompany">${esc(companyLines)}</div></div><div class="rqPaperType"><h1>${esc(typeLabel(doc.type).toUpperCase())}</h1><small>${esc(doc.number)}</small></div></div><div class="rqPaperGrid"><div><div class="rqPaperLabel">BILL TO</div>${customerBlock(doc,meta)}</div><div><div class="rqPaperLabel">DETAIL</div>${detail}</div></div>${doc.type==='receipt'?'<div class="rqReceiptNote">Payment has been confirmed by REQOO Admin.</div>':''}${table}${totals}${paymentTerms(meta,isQuote)}${quoteInfo}${bank}<div class="rqPaperFoot">${esc(foot)}<br>Generated from REQOO Admin · ${esc(doc.number)}</div></section>`;
}
function close(){ $('docModal').classList.remove('open');$('docModal').setAttribute('aria-hidden','true') }
function printDoc(){if(!activeDoc)return;const w=window.open('','_blank');if(!w)return toast('Benarkan popup untuk Print / Save PDF.',true);w.document.write('<!doctype html><html><head><title>'+esc(activeDoc.number)+'</title><link rel="stylesheet" href="/admin/document-template-v4.css?v=3"><link rel="stylesheet" href="/admin/document-deposit-note-v1.css?v=2"><style>body{background:#fff!important;padding:18px}.rqPaper{box-shadow:none;border:0}@media print{body{padding:0}.rqPaper{min-height:0!important;break-inside:auto!important}.rqPaperFoot{margin-top:18px!important}}</style></head><body>'+paper(activeDoc)+'</body></html>');w.document.close();w.focus();setTimeout(()=>w.print(),350)}
function waPhone(v){let n=String(v||'').replace(/\D/g,'');if(n.startsWith('0'))n='60'+n.slice(1);return n}
function shareWhatsApp(){
  if(!activeDoc)return;
  const n=waPhone(activeDoc.customer_phone);if(!n)return toast('Customer WhatsApp number is missing.',true);
  const link=location.origin.replace('admin.','')+'/d/'+encodeURIComponent(activeDoc.share_token),meta=quoteMeta(activeDoc),pct=Math.max(0,Math.min(100,Number(meta.depositPercent||0))),depositInvoice=activeDoc.type==='invoice'&&pct>0&&pct<100&&String(activeDoc.payment_status||'pending').toLowerCase()!=='paid',dueNow=depositInvoice?(String(activeDoc.payment_status||'pending').toLowerCase()==='partial'?Math.max(0,Number(activeDoc.total_minor||0)-Math.round(Number(activeDoc.total_minor||0)*pct/100)):Math.round(Number(activeDoc.total_minor||0)*pct/100)):Number(activeDoc.total_minor||0);
  const amount=activeDoc.type==='delivery_order'?'':money(dueNow),kind=typeLabel(activeDoc.type),amountLabel=depositInvoice?'Amount Due Now':'Amount';
  const text=`Salam ${activeDoc.customer_name||''},\n\nREQOO.CO telah mengeluarkan ${kind} ${activeDoc.number}.${amount?'\n'+amountLabel+': '+amount:''}\n\nPautan rasmi REQOO.CO untuk semak dokumen:\n${link}\n\nPautan ini menggunakan domain rasmi reqoo.co. Boleh tekan untuk lihat dokumen penuh atau simpan PDF.`;
  window.open('https://wa.me/'+n+'?text='+encodeURIComponent(text),'_blank','noopener');
  if(activeDoc.type==='quotation'&&meta.source==='custom'&&String(activeDoc.status||'issued').toLowerCase()==='issued'){
    api('updateCustomQuotationStatus',{documentId:activeDoc.id,status:'sent'},'POST').then(d=>{activeDoc=d.document;replaceDocument(activeDoc);renderHistory();if($('docModal').classList.contains('open'))showDocument()}).catch(()=>{});
  }
}
function quoteDays(doc){const a=new Date(doc?.issued_at||''),b=new Date(doc?.due_at||'');if(!Number.isNaN(a.getTime())&&!Number.isNaN(b.getTime()))return Math.max(0,Math.round((b-a)/86400000));return Number(docSettings.quoteValidDays||7)}
function editActiveQuote(){
  if(!activeDoc||activeDoc.type!=='quotation')return;const meta=quoteMeta(activeDoc);if(meta.convertedOrderId)return toast('A quotation already converted to an order cannot be edited.',true);
  editingQuoteId=activeDoc.id;$('qCustomer').value=activeDoc.customer_name||'';$('qPhone').value=activeDoc.customer_phone||'';$('qEmail').value=activeDoc.customer_email||'';$('qAttention').value=meta.attention||'';$('qAddress').value=meta.customerAddress||'';$('qNotes').value=meta.notes||'';$('qTerms').value=meta.terms||'';$('qValidDays').value=quoteDays(activeDoc);$('qDiscount').value=(Number(activeDoc.discount_minor||0)/100).toFixed(2);$('qShipping').value=(Number(activeDoc.shipping_minor||0)/100).toFixed(2);$('qDeposit').value=String(meta.depositPercent??50);$('qDeposit').dataset.userTouched='1';$('quoteItems').innerHTML='';(activeDoc.items||[]).forEach(i=>addQuoteItem({description:i.description,variation:i.variation,quantity:i.quantity,unit:Number(i.unit_price_minor||0)/100}));if(!$('quoteItems').children.length)addQuoteItem();recalcQuote();$('qCreate').textContent='Save changes';$('qReset').textContent='Cancel';close();document.dispatchEvent(new Event('rq:quotation-editing'));$('quoteBuilderBody').classList.add('open');$('toggleQuoteBuilder').textContent='Close';setTimeout(()=>$('rqQuoteComposer')?.scrollIntoView({behavior:'smooth',block:'start'}),40)
}
async function createDepositInvoice(){
  if(!activeDoc||activeDoc.type!=='quotation')return;const meta=quoteMeta(activeDoc),orderId=meta.convertedOrderId,pct=Math.max(0,Math.min(100,Number(meta.depositPercent||0)));if(!orderId||!(pct>0&&pct<100))return toast('This quotation has no valid deposit.',true);
  const btn=$('docDepositInvoice'),old=btn.textContent;btn.disabled=true;btn.textContent='Menyediakan…';
  try{
    const summaryData=await api('paymentSummary',{orderId}),s=summaryData.summary||{},depositMinor=Math.round(Number(activeDoc.total_minor||0)*pct/100);
    if(String(s.paymentStatus||'pending').toLowerCase()==='paid'&&depositMinor<Number(s.totalMinor||activeDoc.total_minor||0)){
      if(!confirm('Order sekarang tersalah status FULL PAID. Tukar kepada DEPOSIT '+pct+'% ('+money(depositMinor)+') sebelum buat invoice?'))return;
      await api('correctPayment',{orderId,actualPaidMinor:depositMinor,paymentType:'deposit',reason:'Correction from quotation deposit flow: full paid tersalah tekan'},'POST');
    }
    const d=await api('createDocument',{type:'invoice',orderId},'POST');activeDoc=d.document;replaceDocument(activeDoc);renderHistory();renderOrders();toast(activeDoc.number+' · Deposit '+pct+'%');showDocument()
  }catch(e){toast(e.message,true)}finally{btn.disabled=false;btn.textContent=old}
}
async function convertActiveQuote(){
  if(!activeDoc||activeDoc.type!=='quotation')return;
  const quote=activeDoc,meta=quoteMeta(quote),pct=Math.max(0,Math.min(100,Number(meta.depositPercent||0)));
  if(meta.convertedOrderId)return toast('This quotation has already been converted to an order.',true);
  if(['rejected','expired','cancelled'].includes(String(quote.status||'').toLowerCase()))return toast('This quotation is closed and cannot be converted. Create a new quotation.',true);
  const itemCount=(quote.items||[]).length,total=money(quote.total_minor||0),deposit=pct>0&&pct<100?`\nDeposit ${pct}%: ${money(Math.round(Number(quote.total_minor||0)*pct/100))}`:'';
  if(!confirm(`Has the customer approved quotation ${quote.number}?\n\n${itemCount} item(s) · Total ${total}${deposit}\n\nConfirm only after receiving customer approval. This creates an order; no payment will be recorded automatically.`))return;
  const btn=$('docConvert'),old=btn.textContent;btn.disabled=true;btn.textContent='Creating order…';
  try{
    if(!meta.convertedOrderId&&quote.status!=='accepted')await api('updateCustomQuotationStatus',{documentId:quote.id,status:'accepted'},'POST');
    const d=await api('convertCustomQuotationToOrder',{documentId:quote.id},'POST');
    const convertedQuote=d.document;replaceDocument(convertedQuote);
    const orderId=d.order?.id||quoteMeta(convertedQuote).convertedOrderId,ref=d.order?.order_no||orderId||'order baru';
    if(orderId&&pct>0&&pct<100){
      const invoiceData=await api('createDocument',{type:'invoice',orderId},'POST');
      activeDoc=invoiceData.document;replaceDocument(activeDoc);renderHistory();
      toast(`Order ${ref} and deposit invoice (${pct}%) created`);
      await load(true);if(ordersLoaded)await loadOrders(true);showDocument();if(orderId)document.dispatchEvent(new CustomEvent('rq:documents-open-flow',{detail:{key:orderId}}));return;
    }
    activeDoc=convertedQuote;toast(`Order ${ref} created`);
    await load(true);if(ordersLoaded)await loadOrders(true);
    const fresh=await openSaved(activeDoc.id,false);activeDoc=fresh;showDocument();if(orderId)document.dispatchEvent(new CustomEvent('rq:documents-open-flow',{detail:{key:orderId}}));
  }catch(e){toast(e.message,true)}finally{btn.disabled=false;btn.textContent=old}
}
function fillSettings(){const s=docSettings;$('sCompany').value=s.companyName||'REQOO.CO';$('sReg').value=s.registrationNo||SSM_NO;$('sAddress').value=s.address||'';$('sPhone').value=s.phone||'';$('sEmail').value=s.email||'';$('sBank').value=normalizeBankDetails(s.bank)||DEFAULT_BANK_DETAILS;$('sQuoteDays').value=s.quoteValidDays??7;$('sInvoiceDays').value=s.invoiceDueDays??14}
async function saveSettings(){try{const payload={companyName:$('sCompany').value,registrationNo:$('sReg').value,address:$('sAddress').value,phone:$('sPhone').value,email:$('sEmail').value,bank:$('sBank').value,quoteValidDays:$('sQuoteDays').value,invoiceDueDays:$('sInvoiceDays').value};const d=await api('saveDocumentSettings',payload,'POST');docSettings=d.settings||payload;fillQuoteDefaults();toast('Maklumat syarikat saved');$('docsSettings').classList.remove('open')}catch(e){toast(e.message,true)}}
function addQuoteItem(data={}){
  const row=document.createElement('div');row.className='rqQuoteItem';
  row.innerHTML=`<label class="rqQuoteItemField rqQuoteDescription"><span>ITEM / DESCRIPTION</span><input data-q="description" placeholder="Contoh: Kotak - Hard Cover" value="${esc(data.description||'')}"></label><label class="rqQuoteItemField rqQuoteVariation"><span>VARIATION / SIZE</span><input data-q="variation" placeholder="Contoh: Custom Size" value="${esc(data.variation||'')}"></label><label class="rqQuoteItemField rqQuoteQty"><span>QUANTITY (UNIT)</span><input data-q="quantity" type="number" min="0.001" step="1" inputmode="decimal" value="${Number(data.quantity||1)}"></label><label class="rqQuoteItemField rqQuoteUnit"><span>PRICE / UNIT (RM)</span><input data-q="unit" type="number" min="0" step="0.01" inputmode="decimal" value="${Number(data.unit||0)}"></label><div class="rqQuoteAmount"><span>AMOUNT</span><div><b data-q-total>RM0.00</b><small data-q-calc></small></div></div><button type="button" class="rqQuoteRemove" aria-label="Buang item">×</button>`;
  $('quoteItems').append(row);row.querySelectorAll('input').forEach(i=>i.addEventListener('input',recalcQuote));row.querySelector('.rqQuoteRemove').addEventListener('click',()=>{row.remove();if(!$('quoteItems').children.length)addQuoteItem();recalcQuote()});recalcQuote();
}
function quoteRows(){return [...$('quoteItems').querySelectorAll('.rqQuoteItem')]}
function recalcQuote(){let subtotal=0;quoteRows().forEach(row=>{const qty=Math.max(0,Number(row.querySelector('[data-q="quantity"]').value)||0),unit=toMinor(row.querySelector('[data-q="unit"]').value),line=Math.round(qty*unit);subtotal+=line;row.querySelector('[data-q-total]').textContent=money(line);const calc=row.querySelector('[data-q-calc]');if(calc)calc.textContent=qty&&unit?qty+' unit × '+money(unit):''});const discount=Math.min(subtotal,toMinor($('qDiscount').value)),shipping=toMinor($('qShipping').value),grand=Math.max(0,subtotal-discount+shipping);$('qSubtotal').textContent=money(subtotal);$('qDiscountView').textContent='- '+money(discount);$('qShippingView').textContent=money(shipping);$('qTotal').textContent=money(grand)}
function fillQuoteDefaults(){if($('qValidDays'))$('qValidDays').value=docSettings.quoteValidDays??7}
function resetQuoteForm(){quoteDirty=false;editingQuoteId=null;['qCustomer','qPhone','qEmail','qAttention','qAddress','qNotes','qTerms'].forEach(id=>$(id).value='');$('qDiscount').value='0';$('qShipping').value='0';$('qDeposit').value='50';$('qDeposit').dataset.userTouched='';fillQuoteDefaults();$('quoteItems').innerHTML='';addQuoteItem();recalcQuote();$('qCreate').textContent='Create & Preview Quotation';$('qReset').textContent='Reset'}
function quotePayload(){const items=quoteRows().map(row=>({description:row.querySelector('[data-q="description"]').value.trim(),variation:row.querySelector('[data-q="variation"]').value.trim(),quantity:Number(row.querySelector('[data-q="quantity"]').value)||0,unitPriceMinor:toMinor(row.querySelector('[data-q="unit"]').value)})).filter(x=>x.description&&x.quantity>0);return {customerName:$('qCustomer').value.trim(),customerPhone:$('qPhone').value.trim(),customerEmail:$('qEmail').value.trim(),attention:$('qAttention').value.trim(),customerAddress:$('qAddress').value.trim(),items,validDays:Number($('qValidDays').value||docSettings.quoteValidDays||7),discountMinor:toMinor($('qDiscount').value),shippingMinor:toMinor($('qShipping').value),depositPercent:Number($('qDeposit').value||0),notes:$('qNotes').value.trim(),terms:$('qTerms').value.trim()}}
async function createCustomQuote(){if(quoteRows().some(r=>!r.querySelector('[data-q=description]').value.trim()||!Number.isFinite(Number(r.querySelector('[data-q=quantity]').value))||Number(r.querySelector('[data-q=quantity]').value)<=0||!Number.isFinite(Number(r.querySelector('[data-q=unit]').value))||Number(r.querySelector('[data-q=unit]').value)<0))return toast('Check each item description, quantity and unit price.',true);const payload=quotePayload();if(!payload.customerName)return toast('Enter a customer or company name.',true);if(!payload.items.length)return toast('Add at least one item.',true);const btn=$('qCreate'),wasEditing=!!editingQuoteId,editId=editingQuoteId,old=btn.textContent;btn.disabled=true;btn.textContent=wasEditing?'Saving…':'Creating…';try{const d=await api(wasEditing?'updateCustomQuotation':'createCustomQuotation',wasEditing?{documentId:editId,...payload}:payload,'POST');activeDoc=d.document;if(wasEditing)replaceDocument(activeDoc);else documents.unshift(activeDoc);renderHistory();toast(activeDoc.number+(wasEditing?' updated':' created'));try{localStorage.removeItem(draftKey)}catch{}resetQuoteForm();$('quoteBuilderBody').classList.remove('open');$('toggleQuoteBuilder').textContent='+ New quotation';showDocument()}catch(e){toast(e.message,true)}finally{btn.disabled=false;if(editingQuoteId)btn.textContent=old}}
document.addEventListener('rq:documents-edit-id',async e=>{const id=e?.detail?.id;if(!id)return;try{await openSaved(id,false);editActiveQuote()}catch{}});
document.addEventListener('rq:documents-open-id',e=>{const id=e?.detail?.id;if(id)openSaved(id)});document.addEventListener('rq:documents-share-id',async e=>{const id=e?.detail?.id;if(id){await openSaved(id,false);shareWhatsApp()}});$('refreshDocs').addEventListener('click',()=>{load(true);if(ordersLoaded)loadOrders(true);if(settingsLoaded)loadSettings(true)});let orderSearchTimer;$('docSearch').addEventListener('input',()=>{clearTimeout(orderSearchTimer);orderSearchTimer=setTimeout(()=>loadOrders(true),260)});$('toggleOrderDrawer').addEventListener('click',()=>{if(!ordersLoaded)loadOrders(true)});$('loadMoreDocOrders')?.addEventListener('click',()=>loadOrders(false));$('toggleSettings').addEventListener('click',()=>{const panel=$('docsSettings');panel.classList.toggle('open');if(panel.classList.contains('open'))loadSettings()});$('saveSettings').addEventListener('click',saveSettings);$('toggleQuoteBuilder').addEventListener('click',()=>{const body=$('quoteBuilderBody');body.classList.toggle('open');if(body.classList.contains('open'))loadSettings();$('toggleQuoteBuilder').textContent=body.classList.contains('open')?'Tutup':'+ Quotation Baru'});$('qAddItem').addEventListener('click',()=>addQuoteItem());$('qReset').addEventListener('click',resetQuoteForm);$('qCreate').addEventListener('click',createCustomQuote);$('qDiscount').addEventListener('input',recalcQuote);$('qShipping').addEventListener('input',recalcQuote);$('docClose').addEventListener('click',close);$('docCloseBottom').addEventListener('click',close);$('docPrint').addEventListener('click',printDoc);$('docWhatsapp').addEventListener('click',shareWhatsApp);$('docEdit').addEventListener('click',editActiveQuote);$('docConvert').addEventListener('click',convertActiveQuote);$('docDepositInvoice').addEventListener('click',createDepositInvoice);$('docModal').addEventListener('click',e=>{if(e.target.id==='docModal')close()});

// Explicit device draft: never silently replace an open quotation.
let draftKey='rq_quoteDraft_v1';let quoteDirty=false,lookupSeq=0,lookupTimer;
const draftBar=document.createElement('div');draftBar.className='rqDraftBar';draftBar.innerHTML='<button class="btn" type="button" id="qSaveDraft">Save draft on this device</button><button class="btn" type="button" id="qRestoreDraft">Restore draft</button><span id="qDraftState" role="status"></span>';
$('quoteItems').before(draftBar);
const customerPick=document.createElement('div');customerPick.id='qCustomerMatches';customerPick.className='rqCustomerMatches';$('qCustomer').parentElement.append(customerPick);
$('qCustomer').addEventListener('input',()=>{clearTimeout(lookupTimer);const request=++lookupSeq;lookupTimer=setTimeout(async()=>{const q=$('qCustomer').value.trim();customerPick.replaceChildren();if(q.length<2)return;try{const r=await fetch('/api/admin-business?action=customerLookup&q='+encodeURIComponent(q),{cache:'no-store'}),d=await r.json();if(request!==lookupSeq||!r.ok)return;for(const c of d.customers||[]){const b=document.createElement('button');b.type='button';b.className='btn';b.textContent=c.name+' · '+(c.phone||c.email||'');b.onclick=()=>{$('qCustomer').value=c.name;$('qPhone').value=c.phone||'';$('qEmail').value=c.email||'';customerPick.replaceChildren();quoteDirty=true};customerPick.append(b)}}catch{}},260)});
$('qPhone').addEventListener('change',async()=>{const phone=$('qPhone').value.trim();if(phone.length<6)return;try{const r=await fetch('/api/admin-business?action=customerLookup&q='+encodeURIComponent(phone),{cache:'no-store'}),d=await r.json();if(r.ok&&(d.customers||[]).some(c=>c.phone&&c.name!==$('qCustomer').value.trim()))$('qDraftState').textContent='Nombor ini sudah mempunyai pelanggan. Semak nama untuk elak rekod berganda.'}catch{}});
$('rqQuoteComposer')?.addEventListener('input',()=>{quoteDirty=true});
window.addEventListener('beforeunload',e=>{if(quoteDirty){e.preventDefault();e.returnValue=''}});
$('qReset').addEventListener('click',e=>{if(quoteDirty&&!confirm('Buang perubahan quotation yang belum saved?')){e.stopImmediatePropagation();e.preventDefault()}},true);
async function resolveDraftKey(){const r=await fetch('/api/admin-business?action=identity',{cache:'no-store'}),d=await r.json();if(!r.ok||!d.identity?.id)throw Error('Sesi perlu aktif untuk draf peribadi.');draftKey='rq_quoteDraft_v1:'+d.identity.id}
$('qSaveDraft').onclick=async()=>{const snapshot={at:Date.now(),payload:quotePayload(),editingQuoteId};try{await resolveDraftKey();localStorage.setItem(draftKey,JSON.stringify(snapshot));quoteDirty=JSON.stringify(quotePayload())!==JSON.stringify(snapshot.payload);$('qDraftState').textContent='Draft saved on this device.'}catch{$('qDraftState').textContent='Unable to save draft. Do not close this page.'}};
$('qRestoreDraft').onclick=async()=>{try{await resolveDraftKey();const d=JSON.parse(localStorage.getItem(draftKey)||'null');if(!d||Date.now()-d.at>7*86400000){localStorage.removeItem(draftKey);throw Error('No active draft. Drafts are saved for 7 days.')}if(quoteDirty&&!confirm('Gantikan perubahan semasa dengan draf?'))return;const p=d.payload;editingQuoteId=d.editingQuoteId||'';const fields={qCustomer:'customerName',qPhone:'customerPhone',qEmail:'customerEmail',qAttention:'attention',qAddress:'customerAddress',qNotes:'notes',qTerms:'terms',qValidDays:'validDays',qDeposit:'depositPercent'};for(const [id,k] of Object.entries(fields))$(id).value=p[k]??'';$('qDiscount').value=(p.discountMinor/100).toFixed(2);$('qShipping').value=(p.shippingMinor/100).toFixed(2);$('quoteItems').replaceChildren();for(const i of p.items||[])addQuoteItem({...i,unit:i.unitPriceMinor/100});if(!quoteRows().length)addQuoteItem();$('qCreate').textContent=editingQuoteId?'Save changes':'Cipta sebut harga';recalcQuote();quoteDirty=false;$('qDraftState').textContent='Draft restored.'}catch(e){$('qDraftState').textContent=e.message}};

addQuoteItem();
load().then(applyDeepLink).catch(()=>{});
})();

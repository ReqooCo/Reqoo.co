(()=>{
'use strict';
const API='/api/shop-admin';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>'RM'+(Number(n||0)/100).toFixed(2);
let docs=[],summaries=new Map(),payments=[],paymentsHasMore=false,paymentOffset=0,paymentQuery='',activeInvoice=null,activeReceipt=null,refreshTimer=0,searchTimer=0,loading=false,initialReady=false;
async function api(action,extra={},method='GET'){
 const url=new URL(API,location.origin),opt={method,headers:{},cache:'no-store'};
 if(method==='GET'){url.searchParams.set('action',action);Object.entries(extra).forEach(([k,v])=>{if(v!==undefined&&v!==null&&v!=='')url.searchParams.set(k,v)})}
 else{opt.headers['Content-Type']='application/json';opt.body=JSON.stringify({action,...extra})}
 const r=await fetch(url,opt);let d={};try{d=await r.json()}catch{}
 if(r.status===401){location.href='/admin/?return='+encodeURIComponent(location.pathname+location.search);throw Error('Sesi Admin tamat.')}
 if(!r.ok||d.ok===false)throw Error(d.error||'Request gagal');return d
}
function dateFmt(v){if(!v)return'—';const d=new Date(v);return Number.isNaN(d.getTime())?String(v):d.toLocaleDateString('ms-MY',{day:'2-digit',month:'short',year:'numeric'})}
function methodLabel(v){return({bank_transfer:'Bank Transfer',cash:'Cash',qr:'QR / DuitNow',toyyibpay:'ToyyibPay',other:'Other'})[v]||String(v||'—')}
function typeLabel(v){return({deposit:'Deposit',partial:'Partial Payment',final:'Final Payment',full:'Full Payment'})[v]||String(v||'Payment')}
function ensureModal(){
 if(!$('#rqPaymentModal'))document.body.insertAdjacentHTML('beforeend',`<div class="rqPaymentModal" id="rqPaymentModal" aria-hidden="true"><div class="rqPaymentBox"><div class="rqPaymentHead"><div><div class="rqDocsEyebrow">PAYMENT</div><h2 id="rqPayTitle">Record Payment</h2><p id="rqPaySub">Rekod bayaran yang telah diterima.</p></div><button class="rqPaymentClose" id="rqPayClose" type="button">×</button></div><div class="rqPaymentBody"><div class="rqPaymentSummary"><div><span>Total</span><b id="rqPayTotal">RM0.00</b></div><div><span>Paid</span><b id="rqPayPaid">RM0.00</b></div><div class="due"><span>Balance</span><b id="rqPayBalance">RM0.00</b></div></div><div class="rqPaymentGrid"><div class="rqPaymentField"><label>AMOUNT (RM) *</label><input id="rqPayAmount" type="number" min="0.01" step="0.01"></div><div class="rqPaymentField"><label>PAYMENT TYPE</label><select id="rqPayType"><option value="deposit">Deposit</option><option value="partial">Partial</option><option value="final">Final</option><option value="full">Full</option></select></div><div class="rqPaymentField"><label>METHOD</label><select id="rqPayMethod"><option value="bank_transfer">Bank Transfer</option><option value="qr">QR / DuitNow</option><option value="cash">Cash</option><option value="toyyibpay">ToyyibPay</option><option value="other">Other</option></select></div><div class="rqPaymentField"><label>DATE</label><input id="rqPayDate" type="date"></div><div class="rqPaymentField full"><label>REFERENCE</label><input id="rqPayRef" maxlength="160" placeholder="Bank ref / transaction ID (optional)"></div><div class="rqPaymentField full"><label>NOTE</label><textarea id="rqPayNote" maxlength="1000" placeholder="Contoh: Deposit 50% diterima"></textarea></div></div><div class="rqPaymentActions"><button class="btn" id="rqPayCancel" type="button">Cancel</button><button class="btn primary" id="rqPaySave" type="button">Save Payment & Create Receipt</button></div><div class="rqPaymentStatus" id="rqPayStatus"></div></div></div></div><div class="rqPaymentModal" id="rqReceiptModal" aria-hidden="true"><div class="rqPaymentBox"><div class="rqPaymentHead"><div><div class="rqDocsEyebrow">OFFICIAL RECEIPT</div><h2 id="rqReceiptTitle">Receipt</h2><p>Bayaran telah direkodkan dalam REQOO.</p></div><button class="rqPaymentClose" id="rqReceiptClose" type="button">×</button></div><div id="rqReceiptPaper"></div><div class="rqPaymentBody" style="padding-top:0"><div class="rqPaymentActions"><button class="btn" id="rqReceiptCloseBottom" type="button">Tutup</button><button class="btn primary" id="rqReceiptPrint" type="button">Print / Save PDF</button></div></div></div></div>`);
 if(!$('#rqPaymentPager'))$('#docHistory')?.insertAdjacentHTML('afterend','<div class="rqPaymentPager" id="rqPaymentPager"><button class="btn" id="rqLoadMorePayments" type="button" hidden>Load More Receipts</button></div>');
 const closePay=()=>{$('#rqPaymentModal')?.classList.remove('open');$('#rqPaymentModal')?.setAttribute('aria-hidden','true')},closeRc=()=>{$('#rqReceiptModal')?.classList.remove('open');$('#rqReceiptModal')?.setAttribute('aria-hidden','true')};
 if($('#rqPayClose'))$('#rqPayClose').onclick=closePay;if($('#rqPayCancel'))$('#rqPayCancel').onclick=closePay;if($('#rqReceiptClose'))$('#rqReceiptClose').onclick=closeRc;if($('#rqReceiptCloseBottom'))$('#rqReceiptCloseBottom').onclick=closeRc;if($('#rqPaySave'))$('#rqPaySave').onclick=savePayment;if($('#rqReceiptPrint'))$('#rqReceiptPrint').onclick=printReceipt;if($('#rqLoadMorePayments'))$('#rqLoadMorePayments').onclick=loadMorePayments;
}
function invoiceByNumber(n){return docs.find(d=>d.type==='invoice'&&String(d.number)===String(n))||null}
function sumFor(orderId,doc){
 const total=Number(doc?.total_minor||0),legacyPaid=String(doc?.payment_status||'').toLowerCase()==='paid'||String(doc?.status||'').toLowerCase()==='paid',s=summaries.get(String(orderId));
 if(s){if(legacyPaid&&Number(s.paidMinor||0)===0)return{...s,totalMinor:total,paidMinor:total,balanceMinor:0,paymentStatus:'paid'};return s}
 return{orderId,totalMinor:total,paidMinor:legacyPaid?total:0,balanceMinor:legacyPaid?0:total,paymentStatus:legacyPaid?'paid':'pending'}
}
function enrichInvoices(){
 $$('#docHistory .rqHistRow').forEach(row=>{
  const type=(row.querySelector('.rqHistType')?.textContent||'').toLowerCase();if(!type.includes('invoice'))return;
  const number=row.querySelector('.rqHistNo')?.textContent?.trim(),doc=invoiceByNumber(number);if(!doc)return;
  const s=sumFor(doc.order_id,doc),target=row.querySelector('.rqHistNo')?.parentElement;
  let meta=target?.querySelector('.rqPaymentMeta');if(!meta&&target){meta=document.createElement('div');meta.className='rqPaymentMeta';target.appendChild(meta)}
  const metaHtml=`<span>Total <b>${money(s.totalMinor)}</b></span><span>Paid <b class="${s.balanceMinor===0?'settled':''}">${money(s.paidMinor)}</b></span><span>Balance <b class="${s.balanceMinor===0?'settled':'balance'}">${money(s.balanceMinor)}</b></span>`;if(meta&&meta.innerHTML!==metaHtml)meta.innerHTML=metaHtml;
  const badge=row.querySelector('.rqDocBadge');if(badge&&s.paymentStatus){const label=s.paymentStatus==='partial'?'PARTIAL':s.paymentStatus==='paid'?'PAID':badge.textContent;if(badge.textContent!==label)badge.textContent=label;badge.classList.toggle('paid',s.paymentStatus==='paid');badge.classList.toggle('pending',s.paymentStatus!=='paid')}
  const acts=row.querySelector('.rqHistActions');if(!acts)return;let btn=acts.querySelector('.rqRecordPaymentBtn');
  if(s.balanceMinor>0){if(!btn){btn=document.createElement('button');btn.type='button';btn.className='btn rqRecordPaymentBtn';btn.textContent='Record Payment';acts.prepend(btn)}btn.onclick=()=>openPayment(doc,s)}else if(btn)btn.remove()
 })
}
function clearPaymentRows(){$$('#docHistory .rqPaymentReceiptRow').forEach(r=>r.remove())}
function injectPaymentReceipts(){
 const host=$('#docHistory');if(!host)return;
 payments.slice().reverse().forEach(p=>{if(host.querySelector(`[data-payment-id="${CSS.escape(String(p.id))}"]`))return;const row=document.createElement('article');row.className='rqHistRow rqPaymentReceiptRow';row.dataset.paymentId=p.id;row.innerHTML=`<div><div class="rqHistType">OFFICIAL RECEIPT</div><div class="rqHistNo">${esc(p.receipt_number)}</div></div><div class="rqHistDate">${esc(dateFmt(p.paid_at))}</div><div class="rqHistCustomer">${esc(p.customer_name||'Customer')}<br><span class="rqDocMeta">${esc(p.invoice_number||p.order_no||'')}</span><div class="rqPaymentMeta"><span>${esc(typeLabel(p.payment_type))}</span><span><b>${money(p.amount_minor)}</b></span></div></div><div><span class="rqDocBadge paid">PAID</span></div><div class="rqHistActions"><button class="btn" type="button" data-open-payment="${esc(p.id)}">Buka</button></div>`;host.prepend(row)});
 $$('[data-open-payment]').forEach(b=>b.onclick=()=>openReceipt(b.dataset.openPayment));
 const pager=$('#rqLoadMorePayments');if(pager){pager.hidden=!paymentsHasMore;pager.disabled=false;pager.textContent='Load More Receipts'}
 document.dispatchEvent(new Event('rq:documents-payment-rows-changed'))
}
function openPayment(doc,s){
 ensureModal();activeInvoice={doc,summary:s};$('#rqPayTitle').textContent='Record Payment · '+doc.number;$('#rqPaySub').textContent=(doc.customer_name||'Customer')+' · '+(doc.order_id||'');$('#rqPayTotal').textContent=money(s.totalMinor);$('#rqPayPaid').textContent=money(s.paidMinor);$('#rqPayBalance').textContent=money(s.balanceMinor);
 const first=Number(s.paidMinor||0)===0,defaultMinor=first?Math.min(s.balanceMinor,Math.round(s.totalMinor*.5)):s.balanceMinor;$('#rqPayAmount').value=(defaultMinor/100).toFixed(2);$('#rqPayType').value=first?(defaultMinor>=s.totalMinor?'full':'deposit'):'final';$('#rqPayMethod').value='bank_transfer';$('#rqPayDate').value=new Date().toLocaleDateString('en-CA');$('#rqPayRef').value='';$('#rqPayNote').value=first?'Deposit diterima':'Baki bayaran diterima';$('#rqPayStatus').textContent='';$('#rqPayStatus').className='rqPaymentStatus';$('#rqPaymentModal').classList.add('open');$('#rqPaymentModal').setAttribute('aria-hidden','false')
}
async function savePayment(){
 if(!activeInvoice)return;const btn=$('#rqPaySave'),status=$('#rqPayStatus'),amount=Math.round(Number($('#rqPayAmount').value||0)*100);if(amount<=0){status.textContent='Masukkan amaun bayaran yang sah.';status.className='rqPaymentStatus err';return}if(amount>activeInvoice.summary.balanceMinor){status.textContent='Amaun melebihi baki '+money(activeInvoice.summary.balanceMinor)+'.';status.className='rqPaymentStatus err';return}
 btn.disabled=true;status.className='rqPaymentStatus';status.textContent='Merekod bayaran & menjana receipt…';
 try{const d=await api('recordPayment',{orderId:activeInvoice.doc.order_id,amountMinor:amount,paymentType:$('#rqPayType').value,method:$('#rqPayMethod').value,paidAt:$('#rqPayDate').value,reference:$('#rqPayRef').value.trim(),note:$('#rqPayNote').value.trim()},'POST');status.textContent='Berjaya · '+d.payment.receipt_number;$('#rqPaymentModal').classList.remove('open');await refreshData(true);await openReceipt(d.payment.id);document.getElementById('refreshDocs')?.click()}catch(e){status.textContent=e.message||'Bayaran gagal direkod.';status.className='rqPaymentStatus err'}finally{btn.disabled=false}
}
async function openReceipt(id){ensureModal();try{const d=await api('getPaymentReceipt',{paymentId:id}),r=d.receipt;activeReceipt=r;$('#rqReceiptTitle').textContent='Official Receipt · '+r.receipt_number;$('#rqReceiptPaper').innerHTML=receiptPaper(r);$('#rqReceiptModal').classList.add('open');$('#rqReceiptModal').setAttribute('aria-hidden','false')}catch(e){alert(e.message||'Receipt tidak dapat dibuka.')}}
function receiptPaper(r){const c=r.company||{},company=[c.address,c.phone,c.email].filter(Boolean).join('\n');return `<section class="rqReceiptPaper"><div class="rqReceiptTop"><div><div class="rqReceiptBrand">${esc(c.companyName||'REQOO.CO')}</div><div class="rqReceiptCompany">AB ART TRADING${c.registrationNo?'\nSSM: '+esc(c.registrationNo):''}${company?'\n'+esc(company):''}</div></div><div class="rqReceiptTitle"><h1>OFFICIAL RECEIPT</h1><b>${esc(r.receipt_number)}</b></div></div><div class="rqReceiptGrid"><div class="rqReceiptBlock"><span>Received From</span><b>${esc(r.customer_name||'Customer')}</b><div class="rqReceiptCompany">${esc(r.customer_phone||'')}${r.customer_email?' · '+esc(r.customer_email):''}</div></div><div class="rqReceiptBlock"><span>Date</span><b>${esc(dateFmt(r.paid_at))}</b></div></div><div class="rqReceiptAmount"><span>AMOUNT RECEIVED</span><b>${money(r.amount_minor)}</b></div><table class="rqReceiptDetails"><tr><td>Payment Type</td><td>${esc(typeLabel(r.payment_type))}</td></tr><tr><td>Payment Method</td><td>${esc(methodLabel(r.method))}</td></tr>${r.reference?`<tr><td>Reference</td><td>${esc(r.reference)}</td></tr>`:''}<tr><td>Invoice</td><td>${esc(r.invoice_number||'—')}</td></tr><tr><td>Order</td><td>${esc(r.order_no||r.order_id||'—')}</td></tr><tr><td>Invoice Total</td><td>${money(r.summary?.totalMinor)}</td></tr><tr><td>Total Paid</td><td>${money(r.summary?.paidMinor)}</td></tr><tr><td>Balance</td><td><b>${money(r.summary?.balanceMinor)}</b></td></tr>${r.note?`<tr><td>Note</td><td>${esc(r.note)}</td></tr>`:''}</table><div class="rqReceiptFoot">Bayaran ini telah direkod dan disahkan oleh Admin REQOO.CO.<br>Generated from REQOO Admin · ${esc(r.receipt_number)}</div></section>`}
function printReceipt(){if(!activeReceipt)return;const html=receiptPaper(activeReceipt),w=window.open('','_blank');if(!w)return alert('Benarkan popup untuk Print / Save PDF.');w.document.write(`<!doctype html><html><head><title>${esc(activeReceipt.receipt_number)}</title><link rel="stylesheet" href="/admin/documents-payment-v1.css?v=2"><style>body{margin:0;background:#fff;font-family:Arial,sans-serif}.rqReceiptPaper{max-width:760px;margin:auto;padding:34px}@media print{.rqReceiptPaper{padding:18px}}</style></head><body>${html}</body></html>`);w.document.close();w.focus();setTimeout(()=>w.print(),350)}
function snapshotPayload(data){return{documents:docs.slice(),payments:payments.slice(),summaries:[...summaries.values()],stats:data.stats||{},paymentsHasMore,at:Date.now()}}
async function refreshData(resetPayments=true){
 if(loading)return;loading=true;ensureModal();
 try{
  const shared=Array.isArray(window.__REQOO_DOCUMENTS__)?window.__REQOO_DOCUMENTS__:[],orderIds=[...new Set(shared.filter(x=>x.type==='invoice').map(x=>String(x.order_id||'')).filter(Boolean))];
  paymentQuery=($('#docUnifiedSearch')?.value||'').trim();
  const d=await api('documentsFinanceDashboard',{orderIds,includePayments:true,paymentLimit:80,paymentOffset:resetPayments?0:paymentOffset,q:paymentQuery},'POST');
  docs=shared.slice();summaries=new Map((d.summaries||[]).map(x=>[String(x.orderId),x]));
  if(resetPayments){payments=Array.isArray(d.payments)?d.payments:[];paymentOffset=payments.length;clearPaymentRows()}else{const seen=new Set(payments.map(x=>String(x.id)));for(const p of d.payments||[])if(!seen.has(String(p.id))){payments.push(p);seen.add(String(p.id))}paymentOffset=Number(d.paymentOffset||0)+(d.payments||[]).length}
  paymentsHasMore=!!d.paymentsHasMore;enrichInvoices();injectPaymentReceipts();
  const snapshot=snapshotPayload(d);window.__REQOO_DOCS_FINANCE__=snapshot;document.dispatchEvent(new CustomEvent('rq:documents-finance-ready',{detail:snapshot}))
 }catch(e){console.warn('REQOO payment UI:',e)}finally{loading=false}
}
async function loadMorePayments(){if(!paymentsHasMore||loading)return;const b=$('#rqLoadMorePayments');if(b){b.disabled=true;b.textContent='Memuatkan…'}await refreshData(false)}
function scheduleRefresh(ms=220){if(!initialReady)return;clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>refreshData(true),ms)}
function init(){
 ensureModal();
 const start=()=>{if(initialReady)return;initialReady=true;setTimeout(()=>refreshData(true),120)};
 if(document.documentElement.dataset.rqDocumentsReady==='1')start();else document.addEventListener('rq:documents-ready',start,{once:true});
 document.addEventListener('rq:documents-changed',()=>scheduleRefresh(260));
 $('#docUnifiedSearch')?.addEventListener('input',()=>{if(document.documentElement.dataset.rqFinanceMode==='1')return;clearTimeout(searchTimer);searchTimer=setTimeout(()=>refreshData(true),260)});
 document.addEventListener('rq:documents-finance-mode-exit',()=>refreshData(true));
 document.addEventListener('rq:documents-record-payment',e=>{const doc=e?.detail?.document,summary=e?.detail?.summary;if(doc&&summary)openPayment(doc,summary)});
 document.getElementById('refreshDocs')?.addEventListener('click',()=>{if(initialReady)setTimeout(()=>refreshData(true),500)})
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
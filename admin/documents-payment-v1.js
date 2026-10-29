(()=>{
'use strict';
const API='/api/shop-admin';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>'RM'+(Number(n||0)/100).toFixed(2);
let docs=[],summaries=new Map(),activeInvoice=null,activeReceipt=null,refreshTimer=0,loading=false,refreshQueued=false,initialReady=false;
async function api(action,extra={},method='GET'){
 const url=new URL(API,location.origin),opt={method,headers:{},cache:'no-store'};
 if(method==='GET'){url.searchParams.set('action',action);Object.entries(extra).forEach(([k,v])=>{if(v!==undefined&&v!==null&&v!=='')url.searchParams.set(k,v)})}
 else{opt.headers['Content-Type']='application/json';opt.body=JSON.stringify({action,...extra})}
 const r=await fetch(url,opt);let d={};try{d=await r.json()}catch{}
 if(r.status===401){location.href='/admin/?return='+encodeURIComponent(location.pathname+location.search);throw Error('Sesi Admin tamat.')}
 if(!r.ok||d.ok===false)throw Error(d.error||'Request gagal');return d
}
function dateFmt(v){if(!v)return'—';const d=new Date(v);return Number.isNaN(d.getTime())?String(v):d.toLocaleDateString('ms-MY',{day:'2-digit',month:'short',year:'numeric'})}
function methodLabel(v){return({bank_transfer:'Pindahan bank',cash:'Tunai',qr:'QR / DuitNow',toyyibpay:'ToyyibPay',other:'Lain-lain'})[v]||String(v||'—')}
function typeLabel(v){return({deposit:'Deposit',partial:'Bayaran separa',final:'Bayaran akhir',full:'Bayaran penuh'})[v]||String(v||'Bayaran')}
function ensureModal(){
 if(!$('#rqPaymentModal'))document.body.insertAdjacentHTML('beforeend',`<div class="rqPaymentModal" id="rqPaymentModal" aria-hidden="true"><div class="rqPaymentBox"><div class="rqPaymentHead"><div><div class="rqDocsEyebrow">BAYARAN</div><h2 id="rqPayTitle">Rekod bayaran</h2><p id="rqPaySub">Rekod bayaran yang telah diterima.</p></div><button class="rqPaymentClose" id="rqPayClose" type="button">×</button></div><div class="rqPaymentBody"><div class="rqPaymentSummary"><div><span>Jumlah</span><b id="rqPayTotal">RM0.00</b></div><div><span>Dibayar</span><b id="rqPayPaid">RM0.00</b></div><div class="due"><span>Baki</span><b id="rqPayBalance">RM0.00</b></div></div><div class="rqPaymentGrid"><div class="rqPaymentField"><label>Jumlah (RM) *</label><input id="rqPayAmount" type="number" min="0.01" step="0.01"></div><div class="rqPaymentField"><label>Jenis bayaran (automatik)</label><select id="rqPayType" disabled><option value="deposit">Deposit</option><option value="partial">Separa</option><option value="final">Akhir</option><option value="full">Penuh</option></select></div><div class="rqPaymentField"><label>Kaedah</label><select id="rqPayMethod"><option value="bank_transfer">Pindahan bank</option><option value="qr">QR / DuitNow</option><option value="cash">Tunai</option><option value="toyyibpay">ToyyibPay</option><option value="other">Lain-lain</option></select></div><div class="rqPaymentField"><label>Tarikh</label><input id="rqPayDate" type="date"></div><div class="rqPaymentField full"><label>Rujukan</label><input id="rqPayRef" maxlength="160" placeholder="Rujukan transaksi bank (jika ada)"></div><div class="rqPaymentField full"><label>Nota</label><textarea id="rqPayNote" maxlength="1000" placeholder="Contoh: Deposit 50% diterima"></textarea></div></div><div class="rqPaymentSummary" aria-live="polite"><div><span>Baki selepas bayaran</span><b id="rqPayAfter">RM0.00</b></div></div><div class="rqPaymentActions"><button class="btn" id="rqPayCancel" type="button">Batal</button><button class="btn primary" id="rqPaySave" type="button">Simpan bayaran</button></div><div class="rqPaymentStatus" id="rqPayStatus"></div></div></div></div><div class="rqPaymentModal" id="rqReceiptModal" aria-hidden="true"><div class="rqPaymentBox"><div class="rqPaymentHead"><div><div class="rqDocsEyebrow">RESIT RASMI</div><h2 id="rqReceiptTitle">Resit</h2><p>Bayaran telah direkodkan dalam REQOO.</p></div><button class="rqPaymentClose" id="rqReceiptClose" type="button">×</button></div><div id="rqReceiptPaper"></div><div class="rqPaymentBody" style="padding-top:0"><div class="rqPaymentActions"><button class="btn" id="rqReceiptCloseBottom" type="button">Tutup</button><button class="btn primary" id="rqReceiptPrint" type="button">Cetak / Simpan PDF</button></div></div></div></div>`);
 const closePay=()=>{$('#rqPaymentModal')?.classList.remove('open');$('#rqPaymentModal')?.setAttribute('aria-hidden','true')},closeRc=()=>{$('#rqReceiptModal')?.classList.remove('open');$('#rqReceiptModal')?.setAttribute('aria-hidden','true')};
 if($('#rqPayClose'))$('#rqPayClose').onclick=closePay;if($('#rqPayCancel'))$('#rqPayCancel').onclick=closePay;if($('#rqReceiptClose'))$('#rqReceiptClose').onclick=closeRc;if($('#rqReceiptCloseBottom'))$('#rqReceiptCloseBottom').onclick=closeRc;if($('#rqPaySave'))$('#rqPaySave').onclick=savePayment;if($('#rqPayAmount'))$('#rqPayAmount').addEventListener('input',updatePaymentPreview);if($('#rqReceiptPrint'))$('#rqReceiptPrint').onclick=printReceipt;
}
function invoiceByNumber(n){return docs.find(d=>d.type==='invoice'&&String(d.number)===String(n))||null}
function sumFor(orderId,doc){
 const total=Number(doc?.total_minor||0),legacyPaid=String(doc?.payment_status||'').toLowerCase()==='paid'||String(doc?.status||'').toLowerCase()==='paid',s=summaries.get(String(orderId));
 if(s){if(legacyPaid&&Number(s.paidMinor||0)===0)return{...s,totalMinor:total,paidMinor:total,balanceMinor:0,paymentStatus:'paid'};return s}
 return{orderId,totalMinor:total,paidMinor:legacyPaid?total:0,balanceMinor:legacyPaid?0:total,paymentStatus:legacyPaid?'paid':'pending'}
}
function enrichInvoices(){
 $$('#docHistory .rqHistRow').forEach(row=>{
  const number=row.querySelector('.rqHistNo')?.textContent?.trim(),doc=invoiceByNumber(number);if(!doc)return;
  const s=sumFor(doc.order_id,doc),target=row.querySelector('.rqHistNo')?.parentElement;
  let meta=target?.querySelector('.rqPaymentMeta');if(!meta&&target){meta=document.createElement('div');meta.className='rqPaymentMeta';target.appendChild(meta)}
  const metaHtml=`<span>Jumlah <b>${money(s.totalMinor)}</b></span><span>Dibayar <b class="${s.balanceMinor===0?'settled':''}">${money(s.paidMinor)}</b></span><span>Baki <b class="${s.balanceMinor===0?'settled':'balance'}">${money(s.balanceMinor)}</b></span>`;if(meta&&meta.innerHTML!==metaHtml)meta.innerHTML=metaHtml;
  const badge=row.querySelector('.rqDocBadge');if(badge&&s.paymentStatus){const label=s.paymentStatus==='partial'?'SEPARA':s.paymentStatus==='paid'?'LUNAS':badge.textContent;if(badge.textContent!==label)badge.textContent=label;badge.classList.toggle('paid',s.paymentStatus==='paid');badge.classList.toggle('pending',s.paymentStatus!=='paid')}
  const acts=row.querySelector('.rqHistActions');if(!acts)return;let btn=acts.querySelector('.rqRecordPaymentBtn');
  const preview=acts.querySelector('[data-open-doc]');if(preview)preview.classList.toggle('primary',s.balanceMinor<=0);
  if(s.balanceMinor>0){if(!btn){btn=document.createElement('button');btn.type='button';btn.className='btn primary rqRecordPaymentBtn';btn.textContent='Rekod bayaran';acts.prepend(btn)}btn.onclick=()=>openPayment(doc,s)}else if(btn)btn.remove();
  let fix=acts.querySelector('.rqCorrectPaymentBtn');if(s.paymentStatus==='paid'){if(!fix){fix=document.createElement('button');fix.type='button';fix.className='btn rqCorrectPaymentBtn';fix.textContent='Betulkan bayaran';(acts.querySelector('.rqDocumentMenu')||acts).append(fix)}fix.onclick=()=>correctPaid(doc,s)}else if(fix)fix.remove()
 })
}
function updatePaymentPreview(){
 if(!activeInvoice)return;
 const raw=$('#rqPayAmount').value,amount=Math.round(Number(raw||0)*100),remaining=Number(activeInvoice.summary.balanceMinor||0),first=Number(activeInvoice.summary.paidMinor||0)===0;
 const valid=raw!==''&&Number.isFinite(amount)&&amount>0&&amount<=remaining;
 $('#rqPayAfter').textContent=valid?money(remaining-amount):'—';
 $('#rqPayType').value=first?(amount>=remaining?'full':'deposit'):(amount>=remaining?'final':'partial');
 $('#rqPaySave').disabled=!valid;
}
function openPayment(doc,s){
 ensureModal();activeInvoice={doc,summary:s,requestId:crypto.randomUUID()};$('#rqPayTitle').textContent='Rekod bayaran · '+doc.number;$('#rqPaySub').textContent=(doc.customer_name||'Pelanggan')+' · '+(doc.order_no||doc.number||'');$('#rqPayTotal').textContent=money(s.totalMinor);$('#rqPayPaid').textContent=money(s.paidMinor);$('#rqPayBalance').textContent=money(s.balanceMinor);
 const first=Number(s.paidMinor||0)===0,defaultMinor=first?Math.min(s.balanceMinor,Math.round(s.totalMinor*.5)):s.balanceMinor;$('#rqPayAmount').value=(defaultMinor/100).toFixed(2);$('#rqPayType').value=first?(defaultMinor>=s.totalMinor?'full':'deposit'):'final';$('#rqPayMethod').value='bank_transfer';$('#rqPayDate').value=new Date().toLocaleDateString('en-CA');$('#rqPayRef').value='';$('#rqPayNote').value=first?'Deposit diterima':'Baki bayaran diterima';updatePaymentPreview();$('#rqPayStatus').textContent='';$('#rqPayStatus').className='rqPaymentStatus';$('#rqPaymentModal').classList.add('open');$('#rqPaymentModal').setAttribute('aria-hidden','false')
}
async function correctPaid(doc,s){
 try{
  const d=await api('paymentSummary',{orderId:doc.order_id}),summary=d.summary||s,pays=summary.payments||[];
  if(summary.paymentStatus!=='paid'){await refreshData();return}
  if(pays.length!==1){alert('Pembetulan automatik hanya untuk order dengan satu rekod bayaran. Semak Payment Timeline dahulu.');return}
  const suggested=(summary.totalMinor/2/100).toFixed(2),raw=prompt('Berapa bayaran sebenar yang sudah diterima?\n\nMasukkan 0 jika BELUM TERIMA BAYARAN.\nContoh deposit 50%: '+suggested,suggested);
  if(raw===null)return;const actual=Math.round(Number(raw||0)*100);
  if(!Number.isFinite(actual)||actual<0||actual>=summary.totalMinor){alert('Masukkan RM0.00 atau amaun yang kurang daripada jumlah invoice.');return}
  const reset=actual===0,balance=summary.totalMinor-actual,next=reset?'BELUM BAYAR':'SEPARA';
  if(!confirm('Tukar status daripada PAID kepada '+next+'?\n\nPaid sebenar: '+money(actual)+'\nBalance: '+money(balance)))return;
  await api('correctPayment',{orderId:doc.order_id,actualPaidMinor:actual,paymentType:'deposit',reason:reset?'Admin correction: full paid tersalah tekan; bayaran belum diterima':'Admin correction: full paid tersalah tekan; bayaran sebenar deposit/partial'},'POST');
  await refreshData();document.getElementById('refreshDocs')?.click();alert(reset?'Status dipulihkan kepada BELUM BAYAR.':'Status dibetulkan kepada PARTIAL.')
 }catch(e){alert(e.message||'Pembetulan payment gagal.')}
}
async function savePayment(){
 if(!activeInvoice)return;const btn=$('#rqPaySave'),status=$('#rqPayStatus'),amount=Math.round(Number($('#rqPayAmount').value||0)*100);if(amount<=0){status.textContent='Masukkan amaun bayaran yang sah.';status.className='rqPaymentStatus err';return}if(amount>activeInvoice.summary.balanceMinor){status.textContent='Amaun melebihi baki '+money(activeInvoice.summary.balanceMinor)+'.';status.className='rqPaymentStatus err';return}
 btn.disabled=true;status.className='rqPaymentStatus';status.textContent='Merekod bayaran & menjana receipt…';
 try{const d=await api('recordPayment',{orderId:activeInvoice.doc.order_id,requestId:activeInvoice.requestId,amountMinor:amount,paymentType:$('#rqPayType').value,method:$('#rqPayMethod').value,paidAt:$('#rqPayDate').value,reference:$('#rqPayRef').value.trim(),note:$('#rqPayNote').value.trim()},'POST');status.textContent='Berjaya · '+d.payment.receipt_number;$('#rqPaymentModal').classList.remove('open');await refreshData();await openReceipt(d.payment.id);document.getElementById('refreshDocs')?.click()}catch(e){status.textContent=e.message||'Bayaran gagal direkod.';status.className='rqPaymentStatus err'}finally{btn.disabled=false}
}
async function openReceipt(id){ensureModal();try{const d=await api('getPaymentReceipt',{paymentId:id}),r=d.receipt;activeReceipt=r;$('#rqReceiptTitle').textContent='Official Receipt · '+r.receipt_number;$('#rqReceiptPaper').innerHTML=receiptPaper(r);$('#rqReceiptModal').classList.add('open');$('#rqReceiptModal').setAttribute('aria-hidden','false')}catch(e){alert(e.message||'Receipt tidak dapat dibuka.')}}
function receiptPaper(r){const c=r.company||{},company=[c.address,c.phone,c.email].filter(Boolean).join('\n');return `<section class="rqReceiptPaper"><div class="rqReceiptTop"><div><div class="rqReceiptBrand">${esc(c.companyName||'REQOO.CO')}</div><div class="rqReceiptCompany">AB ART TRADING${c.registrationNo?'\nSSM: '+esc(c.registrationNo):''}${company?'\n'+esc(company):''}</div></div><div class="rqReceiptTitle"><h1>RESIT RASMI</h1><b>${esc(r.receipt_number)}</b></div></div><div class="rqReceiptGrid"><div class="rqReceiptBlock"><span>Diterima daripada</span><b>${esc(r.customer_name||'Customer')}</b><div class="rqReceiptCompany">${esc(r.customer_phone||'')}${r.customer_email?' · '+esc(r.customer_email):''}</div></div><div class="rqReceiptBlock"><span>Tarikh</span><b>${esc(dateFmt(r.paid_at))}</b></div></div><div class="rqReceiptAmount"><span>JUMLAH DITERIMA</span><b>${money(r.amount_minor)}</b></div><table class="rqReceiptDetails"><tr><td>Jenis bayaran</td><td>${esc(typeLabel(r.payment_type))}</td></tr><tr><td>Kaedah bayaran</td><td>${esc(methodLabel(r.method))}</td></tr>${r.reference?`<tr><td>Reference</td><td>${esc(r.reference)}</td></tr>`:''}<tr><td>Invoice</td><td>${esc(r.invoice_number||'—')}</td></tr><tr><td>Order</td><td>${esc(r.order_no||'—')}</td></tr><tr><td>Jumlah invois</td><td>${money(r.summary?.totalMinor)}</td></tr><tr><td>Jumlah dibayar</td><td>${money(r.summary?.paidMinor)}</td></tr><tr><td>Baki</td><td><b>${money(r.summary?.balanceMinor)}</b></td></tr>${r.note?`<tr><td>Note</td><td>${esc(r.note)}</td></tr>`:''}</table><div class="rqReceiptFoot">Bayaran ini telah direkod dan disahkan oleh Admin REQOO.CO.<br>Generated from REQOO Admin · ${esc(r.receipt_number)}</div></section>`}
function printReceipt(){if(!activeReceipt)return;const html=receiptPaper(activeReceipt),w=window.open('','_blank');if(!w)return alert('Benarkan popup untuk Cetak / Simpan PDF.');w.document.write(`<!doctype html><html><head><title>${esc(activeReceipt.receipt_number)}</title><link rel="stylesheet" href="/admin/documents-payment-v1.css?v=2"><style>body{margin:0;background:#fff;font-family:Arial,sans-serif}.rqReceiptPaper{max-width:760px;margin:auto;padding:34px}@media print{.rqReceiptPaper{padding:18px}}</style></head><body>${html}</body></html>`);w.document.close();w.focus();setTimeout(()=>w.print(),350)}
function snapshotPayload(data){return{documents:docs.slice(),payments:[],summaries:[...summaries.values()],stats:data.stats||{},at:Date.now()}}
async function refreshData(){
 if(loading){refreshQueued=true;return}loading=true;ensureModal();
 try{
  const shared=Array.isArray(window.__REQOO_DOCUMENTS__)?window.__REQOO_DOCUMENTS__:[],orderIds=[...new Set(shared.filter(x=>x.type==='invoice').map(x=>String(x.order_id||'')).filter(Boolean))];
  const d=await api('documentsFinanceDashboard',{orderIds,includePayments:false},'POST');
  if(window.__REQOO_DOCUMENTS__!==shared){refreshQueued=true;return}
  docs=shared.slice();summaries=new Map((d.summaries||[]).map(x=>[String(x.orderId),x]));
  enrichInvoices();
  const snapshot=snapshotPayload(d);window.__REQOO_DOCS_FINANCE__=snapshot;document.dispatchEvent(new CustomEvent('rq:documents-finance-ready',{detail:snapshot}))
 }catch(e){console.warn('REQOO payment UI:',e)}finally{loading=false;if(refreshQueued){refreshQueued=false;setTimeout(()=>refreshData(),0)}}
}
function scheduleRefresh(ms=220){if(!initialReady)return;clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>refreshData(),ms)}
function init(){
 ensureModal();
 const start=()=>{if(initialReady)return;initialReady=true;setTimeout(()=>refreshData(),120)};
 if(document.documentElement.dataset.rqDocumentsReady==='1')start();else document.addEventListener('rq:documents-ready',start,{once:true});
 document.addEventListener('rq:documents-changed',()=>scheduleRefresh(260));
 document.addEventListener('rq:documents-finance-mode-exit',()=>refreshData());
 document.addEventListener('rq:documents-record-payment',e=>{const doc=e?.detail?.document,summary=e?.detail?.summary;if(doc&&summary)openPayment(doc,summary)});document.addEventListener('rq:documents-open-payment',e=>{const id=e?.detail?.id;if(id)openReceipt(id)});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
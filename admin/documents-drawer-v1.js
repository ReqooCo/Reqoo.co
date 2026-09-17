(()=>{
'use strict';
const API='/api/shop-admin',TOKEN_KEY='reqoo_admin_token';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
const money=n=>'RM'+(Number(n||0)/100).toFixed(2);
const dateFmt=v=>{if(!v)return'—';const d=new Date(v);return Number.isNaN(d.getTime())?String(v):d.toLocaleDateString('ms-MY',{day:'2-digit',month:'short',year:'numeric'})};
const methodLabel=v=>({bank_transfer:'Bank Transfer',cash:'Cash',qr:'QR / DuitNow',toyyibpay:'ToyyibPay',other:'Other'})[String(v||'').toLowerCase()]||String(v||'—');
const paymentType=v=>({deposit:'Deposit',partial:'Partial Payment',final:'Final Payment',full:'Full Payment'})[String(v||'').toLowerCase()]||String(v||'Payment');
const docLabel=v=>({quotation:'Quotation',invoice:'Invoice',receipt:'Official Receipt',delivery_order:'Delivery Order'})[v]||String(v||'Document');
const docIcon=v=>({quotation:'QT',invoice:'IN',delivery_order:'DO',receipt:'RC'})[v]||'DC';
let docs=[],payments=[],selectedNumber='',activeOrderId='',loading=false,cacheAt=0;

async function api(action,extra={}){
 const url=new URL(API,location.origin);url.searchParams.set('action',action);Object.entries(extra).forEach(([k,v])=>{if(v!==undefined&&v!==null&&v!=='')url.searchParams.set(k,v)});
 const r=await fetch(url,{headers:{'X-Admin-Token':localStorage.getItem(TOKEN_KEY)||''},cache:'no-store'});let d={};try{d=await r.json()}catch{}
 if(r.status===401){location.href='/admin/?return='+encodeURIComponent(location.pathname);throw Error('Sesi Admin tamat.')}
 if(!r.ok||d.ok===false)throw Error(d.error||'Request gagal');return d;
}
function ensureDrawer(){
 if($('#rqDocDrawer'))return;
 document.body.insertAdjacentHTML('beforeend',`<div class="rqDocDrawerBackdrop" id="rqDocDrawerBackdrop"></div><aside class="rqDocDrawer" id="rqDocDrawer" aria-hidden="true" aria-label="Document details"><div class="rqDocDrawerHead"><div><div class="rqDocDrawerEyebrow">DOCUMENT FLOW</div><h2 id="rqDocDrawerTitle">Document Details</h2><p id="rqDocDrawerSub">Quotation → Invoice → Payment → Receipt → Delivery Order</p></div><button class="rqDocDrawerClose" id="rqDocDrawerClose" type="button" aria-label="Tutup">×</button></div><div class="rqDocDrawerBody" id="rqDocDrawerBody"><div class="rqDocDrawerLoading">Pilih mana-mana dokumen untuk lihat aliran lengkap.</div></div></aside>`);
 $('#rqDocDrawerClose').onclick=closeDrawer;$('#rqDocDrawerBackdrop').onclick=closeDrawer;
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('#rqDocDrawer')?.classList.contains('open'))closeDrawer()});
}
function closeDrawer(){const d=$('#rqDocDrawer'),b=$('#rqDocDrawerBackdrop');d?.classList.remove('open');b?.classList.remove('open');d?.setAttribute('aria-hidden','true');document.body.classList.remove('rqDocDrawerOpen')}
function showDrawer(){ensureDrawer();$('#rqDocDrawer').classList.add('open');$('#rqDocDrawerBackdrop').classList.add('open');$('#rqDocDrawer').setAttribute('aria-hidden','false');document.body.classList.add('rqDocDrawerOpen')}
async function refreshData(force=false){
 if(loading)return;if(!force&&Date.now()-cacheAt<5000&&docs.length)return;loading=true;
 try{const [d,p]=await Promise.all([api('listDocuments',{limit:300}),api('listPayments',{limit:300})]);docs=Array.isArray(d.documents)?d.documents:[];payments=Array.isArray(p.payments)?p.payments:[];cacheAt=Date.now()}finally{loading=false}
}
function rowNumber(row){return row?.querySelector('.rqHistNo')?.textContent?.trim()||''}
function same(a,b){return String(a??'')===String(b??'')}
function findDoc(number){return docs.find(d=>same(d.number,number))||null}
function findPayment(number){return payments.find(p=>same(p.receipt_number,number))||null}
function chainDocs(orderId){const order={quotation:1,invoice:2,delivery_order:3,receipt:4};return docs.filter(d=>same(d.order_id,orderId)).sort((a,b)=>(order[a.type]||9)-(order[b.type]||9)||String(a.created_at||'').localeCompare(String(b.created_at||'')))}
function chainPayments(orderId){return payments.filter(p=>same(p.order_id,orderId)).sort((a,b)=>String(a.paid_at||a.created_at||'').localeCompare(String(b.paid_at||b.created_at||'')))}
async function safeSummary(orderId){if(!orderId||String(orderId).startsWith('custom:'))return null;try{return (await api('paymentSummary',{orderId})).summary||null}catch{return null}}
function docStatus(doc,summary){
 if(doc.type==='invoice'&&summary){const s=String(summary.paymentStatus||'pending').toLowerCase();return{label:s==='paid'?'PAID':s==='partial'?'PARTIAL':'UNPAID',cls:s==='paid'?'paid':s==='partial'?'partial':''}}
 const s=String(doc.status||doc.payment_status||'issued').toLowerCase();return{label:s.toUpperCase(),cls:s==='paid'||s==='accepted'?'paid':s==='partial'?'partial':''};
}
function customerFrom(doc,pay,chain){const source=doc||chain.find(Boolean)||{};return{name:source.customer_name||pay?.customer_name||'Customer',phone:source.customer_phone||pay?.customer_phone||'',email:source.customer_email||pay?.customer_email||''}}
function triggerDocument(number){
 const row=$$('#docHistory .rqHistRow').find(r=>rowNumber(r)===String(number));const btn=row?.querySelector('[data-open-doc]');if(btn){btn.click();return true}return false;
}
function triggerReceipt(id){const row=$$('#docHistory .rqHistRow').find(r=>same(r.dataset.paymentId,id));const btn=row?.querySelector('[data-open-payment]');if(btn){btn.click();return true}return false}
function triggerRecordPayment(invoiceNumber){
 const tryClick=()=>{const row=$$('#docHistory .rqHistRow').find(r=>rowNumber(r)===String(invoiceNumber));const btn=row?.querySelector('.rqRecordPaymentBtn');if(btn){btn.click();return true}return false};
 if(tryClick())return;document.getElementById('refreshDocs')?.click();setTimeout(tryClick,500);
}
function chainHtml(chain,summary){
 if(!chain.length)return'<div class="rqPaymentEmpty">Belum ada dokumen berkaitan.</div>';
 return `<div class="rqDocChain">${chain.map(d=>{const st=docStatus(d,summary),current=same(d.number,selectedNumber);return `<div class="rqDocChainItem${current?' current':''}"><div class="rqDocChainIcon">${esc(docIcon(d.type))}</div><div class="rqDocChainText"><b>${esc(docLabel(d.type))} · ${esc(d.number)}</b><span>${esc(dateFmt(d.issued_at||d.created_at))}${d.due_at?' · Due '+esc(dateFmt(d.due_at)):''}</span></div><div class="rqDocChainActions"><span class="rqDocMiniStatus ${st.cls}">${esc(st.label)}</span><button class="rqDocMiniBtn" type="button" data-drawer-open-doc="${esc(d.number)}">Open</button></div></div>`}).join('')}</div>`;
}
function paymentsHtml(list){
 if(!list.length)return'<div class="rqPaymentEmpty">Belum ada bayaran direkodkan untuk order ini.</div>';
 return `<div class="rqPaymentTimeline">${list.map(p=>`<div class="rqPaymentEvent"><div class="rqPaymentEventTop"><div><b>${esc(paymentType(p.payment_type))}</b><div class="rqPaymentEventMeta">${esc(dateFmt(p.paid_at))} · ${esc(methodLabel(p.method))}${p.reference?' · Ref '+esc(p.reference):''}</div></div><b class="rqPaymentEventAmount">${money(p.amount_minor)}</b></div><button class="rqPaymentReceiptLink" type="button" data-drawer-open-payment="${esc(p.id)}">${esc(p.receipt_number)} · Open receipt</button></div>`).join('')}</div>`;
}
async function openByNumber(number){
 ensureDrawer();selectedNumber=number;showDrawer();$('#rqDocDrawerTitle').textContent=number||'Document Details';$('#rqDocDrawerBody').innerHTML='<div class="rqDocDrawerLoading">Memuatkan document flow…</div>';
 try{
  await refreshData(true);const selectedDoc=findDoc(number),selectedPay=findPayment(number),orderId=selectedDoc?.order_id||selectedPay?.order_id||'';activeOrderId=orderId;
  if(!orderId){$('#rqDocDrawerBody').innerHTML='<div class="rqDocDrawerLoading">Dokumen tidak dijumpai dalam ledger semasa.</div>';return}
  const chain=chainDocs(orderId),payList=chainPayments(orderId),summary=await safeSummary(orderId),invoice=chain.find(d=>d.type==='invoice'),quote=chain.find(d=>d.type==='quotation'),customer=customerFrom(selectedDoc,selectedPay,chain);
  const fallbackTotal=Number(invoice?.total_minor??quote?.total_minor??selectedDoc?.total_minor??0),rawPaid=payList.reduce((s,p)=>s+Number(p.amount_minor||0),0),total=Number(summary?.totalMinor??fallbackTotal),paid=Number(summary?.paidMinor??Math.min(total,rawPaid)),balance=Number(summary?.balanceMinor??Math.max(0,total-rawPaid)),overpaid=Number(summary?.overpaidMinor??Math.max(0,rawPaid-total)),orderNo=summary?.orderNo||selectedPay?.order_no||(!String(orderId).startsWith('custom:')?orderId:'Custom quotation');
  $('#rqDocDrawerSub').textContent=`${customer.name} · ${orderNo}`;
  $('#rqDocDrawerBody').innerHTML=`<div class="rqDocDrawerCustomer"><div class="rqDocDrawerCustomerTop"><div><h3>${esc(customer.name)}</h3><p>${esc([customer.phone,customer.email].filter(Boolean).join(' · ')||'Tiada contact disimpan')}</p></div><span class="rqDocDrawerOrder">${esc(orderNo)}</span></div></div><div class="rqDocDrawerMoney"><div><span>TOTAL</span><b>${money(total)}</b></div><div class="paid"><span>PAID</span><b>${money(paid)}</b></div><div class="balance"><span>BALANCE</span><b>${money(balance)}</b></div></div>${overpaid>0?`<div class="rqDocDrawerAlert">Historical overpayment detected: ${money(overpaid)}. Payment baru telah disekat sehingga data disemak.</div>`:''}<section class="rqDocDrawerSection"><div class="rqDocDrawerSectionHead"><h4>Document Flow</h4><span class="rqDocDrawerCount">${chain.length} document${chain.length===1?'':'s'}</span></div>${chainHtml(chain,summary)}</section><section class="rqDocDrawerSection"><div class="rqDocDrawerSectionHead"><h4>Payment Timeline</h4><span class="rqDocDrawerCount">${payList.length} payment${payList.length===1?'':'s'}</span></div>${paymentsHtml(payList)}</section><div class="rqDocDrawerFooter"><button class="btn" id="rqDrawerOpenSelected" type="button">Open Selected</button>${invoice&&balance>0?`<button class="btn primary" id="rqDrawerRecordPayment" type="button">Record Payment · ${money(balance)}</button>`:''}</div>`;
  $$('[data-drawer-open-doc]').forEach(b=>b.onclick=e=>{e.stopPropagation();triggerDocument(b.dataset.drawerOpenDoc)});$$('[data-drawer-open-payment]').forEach(b=>b.onclick=e=>{e.stopPropagation();triggerReceipt(b.dataset.drawerOpenPayment)});
  $('#rqDrawerOpenSelected').onclick=()=>{if(selectedPay)triggerReceipt(selectedPay.id);else if(selectedDoc)triggerDocument(selectedDoc.number)};
  const payBtn=$('#rqDrawerRecordPayment');if(payBtn&&invoice)payBtn.onclick=()=>triggerRecordPayment(invoice.number);
 }catch(e){$('#rqDocDrawerBody').innerHTML=`<div class="rqDocDrawerLoading">${esc(e.message||'Gagal memuatkan document flow.')}</div>`}
}
function bindRows(){
 $$('#docHistory .rqHistRow').forEach(row=>{
  if(row.dataset.drawerBound==='1')return;row.dataset.drawerBound='1';row.tabIndex=0;row.title='Klik untuk lihat document flow & payment timeline';
  row.addEventListener('click',e=>{if(e.target.closest('button,a,input,select,textarea'))return;const n=rowNumber(row);if(n)openByNumber(n)});
  row.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&!e.target.closest('button,a,input,select,textarea')){e.preventDefault();const n=rowNumber(row);if(n)openByNumber(n)}});
 });
}
function init(){ensureDrawer();bindRows();const h=$('#docHistory');if(h)new MutationObserver(()=>{cacheAt=0;setTimeout(bindRows,0)}).observe(h,{childList:true,subtree:true});document.getElementById('refreshDocs')?.addEventListener('click',()=>{cacheAt=0})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();

(()=>{
'use strict';
const API='/api/shop-admin',TOKEN_KEY='reqoo_admin_token';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
const money=n=>'RM'+(Number(n||0)/100).toFixed(2);
const dateFmt=v=>{if(!v)return'—';const d=new Date(v);return Number.isNaN(d.getTime())?String(v):d.toLocaleDateString('ms-MY',{day:'2-digit',month:'short',year:'numeric'})};
let docs=[],payments=[],summaries=new Map(),active='all',loading=false,timer=0,drawerTimer=0;

async function api(action,extra={}){
 const url=new URL(API,location.origin);url.searchParams.set('action',action);Object.entries(extra).forEach(([k,v])=>{if(v!==undefined&&v!==null&&v!=='')url.searchParams.set(k,v)});
 const r=await fetch(url,{headers:{'X-Admin-Token':localStorage.getItem(TOKEN_KEY)||''},cache:'no-store'});let d={};try{d=await r.json()}catch{}
 if(r.status===401){location.href='/admin/?return='+encodeURIComponent(location.pathname);throw Error('Sesi Admin tamat.')}
 if(!r.ok||d.ok===false)throw Error(d.error||'Request gagal');return d;
}
function ensureUi(){
 if(!$('#rqDocsFinanceStats')){
  const stats=$('.rqDocsStats');
  stats?.insertAdjacentHTML('afterend',`<section class="rqDocsFinanceStats" id="rqDocsFinanceStats" aria-label="Invoice payment summary"><button class="rqFinanceStat" type="button" data-rq-fin-filter="outstanding"><span>OUTSTANDING</span><strong id="rqOutstandingAmount">RM0.00</strong><small id="rqOutstandingCount">0 invoices</small></button><button class="rqFinanceStat overdue" type="button" data-rq-fin-filter="overdue"><span>OVERDUE</span><strong id="rqOverdueAmount">RM0.00</strong><small id="rqOverdueCount">0 invoices</small></button><button class="rqFinanceStat due" type="button" data-rq-fin-filter="due_soon"><span>DUE IN 7 DAYS</span><strong id="rqDueSoonAmount">RM0.00</strong><small id="rqDueSoonCount">0 invoices</small></button></section>`);
 }
 if(!$('#rqFinanceFilters')){
  const toolbar=$('.rqDocsUnifiedToolbar');
  toolbar?.insertAdjacentHTML('afterend',`<div class="rqFinanceFilters" id="rqFinanceFilters" aria-label="Payment status filters"><button class="rqFinanceFilter active" type="button" data-rq-fin-filter="all">All finance <em id="rqFinAll">0</em></button><button class="rqFinanceFilter" type="button" data-rq-fin-filter="outstanding">Outstanding <em id="rqFinOutstanding">0</em></button><button class="rqFinanceFilter" type="button" data-rq-fin-filter="partial">Partial <em id="rqFinPartial">0</em></button><button class="rqFinanceFilter" type="button" data-rq-fin-filter="due_soon">Due soon <em id="rqFinDue">0</em></button><button class="rqFinanceFilter" type="button" data-rq-fin-filter="overdue">Overdue <em id="rqFinOverdue">0</em></button><button class="rqFinanceFilter" type="button" data-rq-fin-filter="paid">Paid <em id="rqFinPaid">0</em></button></div>`);
 }
 $$('[data-rq-fin-filter]').forEach(b=>{if(b.dataset.rqFinBound==='1')return;b.dataset.rqFinBound='1';b.addEventListener('click',()=>setFilter(b.dataset.rqFinFilter||'all'))});
}
function startOfDay(v){const d=v instanceof Date?v:new Date(v);if(Number.isNaN(d.getTime()))return null;return new Date(d.getFullYear(),d.getMonth(),d.getDate())}
function dueDays(v){const due=startOfDay(v),today=startOfDay(new Date());return !due||!today?null:Math.round((due-today)/86400000)}
function rowNumber(row){return row?.querySelector('.rqHistNo')?.textContent?.trim()||''}
function same(a,b){return String(a??'')===String(b??'')}
function invoiceStatus(doc){
 const s=summaries.get(String(doc.order_id))||{},total=Number(s.totalMinor??doc.total_minor??0),paid=Number(s.paidMinor??0),balance=Number(s.balanceMinor??Math.max(0,total-paid)),paymentStatus=String(s.paymentStatus||doc.payment_status||'pending').toLowerCase(),days=dueDays(doc.due_at),isPaid=(balance<=0&&total>0)||paymentStatus==='paid',outstanding=!isPaid&&balance>0,partial=outstanding&&paid>0,overdue=outstanding&&days!==null&&days<0,dueSoon=outstanding&&days!==null&&days>=0&&days<=7;
 return{total,paid,balance,isPaid,outstanding,partial,overdue,dueSoon,days};
}
function dueLabel(st,doc){
 if(st.isPaid)return'PAID';
 if(!doc.due_at||st.days===null)return'';
 if(st.days<0)return`${Math.abs(st.days)} day${Math.abs(st.days)===1?'':'s'} overdue`;
 if(st.days===0)return'Due today';
 if(st.days===1)return'Due tomorrow';
 return`Due in ${st.days} days`;
}
function decorateRows(){
 const invoices=new Map(docs.filter(d=>d.type==='invoice').map(d=>[String(d.number),d]));
 $$('#docHistory .rqHistRow').forEach(row=>{
  const doc=invoices.get(rowNumber(row));row.classList.remove('rqInvoiceOverdue','rqInvoiceDueSoon');
  const old=row.querySelector('.rqDueMeta');if(old)old.remove();
  if(!doc){row.dataset.rqFinanceMatch=active==='all'?'1':'0';return}
  const st=invoiceStatus(doc);row.dataset.rqFinOutstanding=st.outstanding?'1':'0';row.dataset.rqFinPartial=st.partial?'1':'0';row.dataset.rqFinDueSoon=st.dueSoon?'1':'0';row.dataset.rqFinOverdue=st.overdue?'1':'0';row.dataset.rqFinPaid=st.isPaid?'1':'0';
  if(st.overdue)row.classList.add('rqInvoiceOverdue');else if(st.dueSoon)row.classList.add('rqInvoiceDueSoon');
  const label=dueLabel(st,doc),statusCell=row.querySelector('.rqDocBadge')?.parentElement;if(label&&statusCell){const meta=document.createElement('div');meta.className='rqDueMeta'+(st.overdue?' overdue':st.isPaid?' paid':'');meta.textContent=label;statusCell.appendChild(meta)}
  row.dataset.rqFinanceMatch=matches(st)?'1':'0';
 });
 document.dispatchEvent(new CustomEvent('rq:documents-finance-filter',{detail:{filter:active}}));
}
function matches(st){if(active==='all')return true;if(active==='outstanding')return st.outstanding;if(active==='partial')return st.partial;if(active==='due_soon')return st.dueSoon;if(active==='overdue')return st.overdue;if(active==='paid')return st.isPaid;return true}
function setText(id,v){const el=document.getElementById(id);if(el)el.textContent=String(v)}
function updateSummary(){
 const list=docs.filter(d=>d.type==='invoice').map(d=>({doc:d,st:invoiceStatus(d)}));
 const outstanding=list.filter(x=>x.st.outstanding),overdue=list.filter(x=>x.st.overdue),due=list.filter(x=>x.st.dueSoon),partial=list.filter(x=>x.st.partial),paid=list.filter(x=>x.st.isPaid);
 setText('rqOutstandingAmount',money(outstanding.reduce((s,x)=>s+x.st.balance,0)));setText('rqOutstandingCount',`${outstanding.length} invoice${outstanding.length===1?'':'s'}`);
 setText('rqOverdueAmount',money(overdue.reduce((s,x)=>s+x.st.balance,0)));setText('rqOverdueCount',`${overdue.length} invoice${overdue.length===1?'':'s'}`);
 setText('rqDueSoonAmount',money(due.reduce((s,x)=>s+x.st.balance,0)));setText('rqDueSoonCount',`${due.length} invoice${due.length===1?'':'s'}`);
 setText('rqFinAll',list.length);setText('rqFinOutstanding',outstanding.length);setText('rqFinPartial',partial.length);setText('rqFinDue',due.length);setText('rqFinOverdue',overdue.length);setText('rqFinPaid',paid.length);
}
function setFilter(v){active=v||'all';$$('[data-rq-fin-filter]').forEach(b=>b.classList.toggle('active',(b.dataset.rqFinFilter||'all')===active));decorateRows();if(active!=='all')$('.rqDocsUnifiedPanel')?.scrollIntoView({behavior:'smooth',block:'start'})}
function waPhone(v){let n=String(v||'').replace(/\D/g,'');if(n.startsWith('0'))n='60'+n.slice(1);return n}
function reminderMessage(customer,invoice,st){
 const name=customer||'Tuan/Puan',due=invoice.due_at?dateFmt(invoice.due_at):'';let dueText='masih mempunyai baki tertunggak.';
 if(st.days!==null&&st.days<0)dueText=`telah lewat ${Math.abs(st.days)} hari daripada tarikh akhir ${due}.`;
 else if(st.days===0)dueText=`perlu dibayar hari ini (${due}).`;
 else if(st.days!==null&&st.days>0)dueText=`perlu dibayar sebelum ${due}.`;
 return `Salam ${name}, peringatan mesra daripada Reqoo.co untuk Invoice ${invoice.number}. Baki semasa ${money(st.balance)} ${dueText}\n\nJika bayaran telah dibuat, boleh abaikan mesej ini atau maklumkan kepada kami. Terima kasih.`;
}
function drawerContext(){
 const number=$('#rqDocDrawerTitle')?.textContent?.trim()||'',doc=docs.find(d=>same(d.number,number)),pay=payments.find(p=>same(p.receipt_number,number)),orderId=doc?.order_id||pay?.order_id||'';
 if(!orderId)return null;const invoice=docs.find(d=>d.type==='invoice'&&same(d.order_id,orderId));if(!invoice)return null;
 const st=invoiceStatus(invoice),phone=invoice.customer_phone||doc?.customer_phone||pay?.customer_phone||'',customer=invoice.customer_name||doc?.customer_name||pay?.customer_name||'Customer';return{invoice,st,phone,customer};
}
function enhanceDrawer(){
 const body=$('#rqDocDrawerBody');if(!body||!$('#rqDocDrawer')?.classList.contains('open'))return;const ctx=drawerContext();if(!ctx)return;
 body.querySelector('[data-rq-overdue-due]')?.remove();body.querySelector('.rqReminderBtn')?.remove();
 const moneyBox=body.querySelector('.rqDocDrawerMoney');
 if(moneyBox&&ctx.invoice.due_at){const label=ctx.st.isPaid?'PAID':ctx.st.overdue?`OVERDUE · ${Math.abs(ctx.st.days)} day${Math.abs(ctx.st.days)===1?'':'s'}`:ctx.st.days===0?'DUE TODAY':ctx.st.days===1?'DUE TOMORROW':ctx.st.days!==null?`DUE IN ${ctx.st.days} DAYS`:'DUE';moneyBox.insertAdjacentHTML('afterend',`<div class="rqDocDrawerDue${ctx.st.overdue?' overdue':''}" data-rq-overdue-due="1"><span>Invoice due · ${esc(dateFmt(ctx.invoice.due_at))}</span><b>${esc(label)}</b></div>`)}
 const footer=body.querySelector('.rqDocDrawerFooter'),phone=waPhone(ctx.phone);if(footer&&ctx.st.balance>0&&phone){const b=document.createElement('button');b.type='button';b.className='btn rqReminderBtn';b.textContent='WhatsApp Reminder';b.onclick=()=>window.open('https://wa.me/'+phone+'?text='+encodeURIComponent(reminderMessage(ctx.customer,ctx.invoice,ctx.st)),'_blank','noopener');footer.prepend(b)}
}
function watchDrawer(){
 const body=$('#rqDocDrawerBody');if(!body||body.dataset.rqOverdueObserved==='1')return;body.dataset.rqOverdueObserved='1';new MutationObserver(()=>{clearTimeout(drawerTimer);drawerTimer=setTimeout(enhanceDrawer,40)}).observe(body,{childList:true});
}
async function refresh(){
 if(loading)return;loading=true;ensureUi();
 try{const [d,s,p]=await Promise.all([api('listDocuments',{limit:300}),api('paymentSummary'),api('listPayments',{limit:300})]);docs=Array.isArray(d.documents)?d.documents:[];payments=Array.isArray(p.payments)?p.payments:[];summaries=new Map((s.summaries||[]).map(x=>[String(x.orderId),x]));updateSummary();decorateRows();enhanceDrawer()}catch(e){console.warn('REQOO overdue dashboard:',e);$$('#docHistory .rqHistRow').forEach(r=>r.dataset.rqFinanceMatch='1');document.dispatchEvent(new CustomEvent('rq:documents-finance-filter',{detail:{filter:'all'}}))}finally{loading=false}
}
function schedule(ms=120){clearTimeout(timer);timer=setTimeout(refresh,ms)}
function init(){ensureUi();schedule(50);const h=$('#docHistory');if(h)new MutationObserver(()=>schedule(100)).observe(h,{childList:true});new MutationObserver(()=>{watchDrawer();setTimeout(enhanceDrawer,50)}).observe(document.body,{childList:true});watchDrawer();document.getElementById('refreshDocs')?.addEventListener('click',()=>schedule(420))}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();

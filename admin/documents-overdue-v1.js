(()=>{
'use strict';
const API='/api/shop-admin',TOKEN_KEY='reqoo_admin_token';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const money=n=>'RM'+(Number(n||0)/100).toFixed(2);
let docs=[],summaries=new Map(),active='all',loading=false,timer=0;

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
function invoiceStatus(doc){
 const s=summaries.get(String(doc.order_id))||{},total=Number(s.totalMinor??doc.total_minor??0),paid=Number(s.paidMinor??0),balance=Number(s.balanceMinor??Math.max(0,total-paid)),paymentStatus=String(s.paymentStatus||doc.payment_status||'pending').toLowerCase(),days=dueDays(doc.due_at),isPaid=balance<=0&&total>0||paymentStatus==='paid',outstanding=!isPaid&&balance>0,partial=outstanding&&paid>0,overdue=outstanding&&days!==null&&days<0,dueSoon=outstanding&&days!==null&&days>=0&&days<=7;
 return{total,paid,balance,isPaid,outstanding,partial,overdue,dueSoon,days};
}
function dueLabel(st,doc){
 if(st.isPaid)return'PAID';
 if(!doc.due_at)return'';
 if(st.days===null)return'';
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
async function refresh(){
 if(loading)return;loading=true;ensureUi();
 try{const [d,s]=await Promise.all([api('listDocuments',{limit:300}),api('paymentSummary')]);docs=Array.isArray(d.documents)?d.documents:[];summaries=new Map((s.summaries||[]).map(x=>[String(x.orderId),x]));updateSummary();decorateRows()}catch(e){console.warn('REQOO overdue dashboard:',e);$$('#docHistory .rqHistRow').forEach(r=>r.dataset.rqFinanceMatch='1');document.dispatchEvent(new CustomEvent('rq:documents-finance-filter',{detail:{filter:'all'}}))}finally{loading=false}
}
function schedule(ms=120){clearTimeout(timer);timer=setTimeout(refresh,ms)}
function init(){ensureUi();schedule(50);const h=$('#docHistory');if(h)new MutationObserver(()=>schedule(100)).observe(h,{childList:true});document.getElementById('refreshDocs')?.addEventListener('click',()=>schedule(420));document.addEventListener('rq:payment-updated',()=>schedule(120))}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();

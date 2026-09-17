(()=>{
'use strict';
const API='/api/shop-admin',TOKEN_KEY='reqoo_admin_token',FRESH_MS=30000;
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const token=()=>localStorage.getItem(TOKEN_KEY)||document.cookie.match(/(?:^|;\s*)reqoo_admin_token=([^;]+)/)?.[1]||'';
const money=n=>'RM'+(Number(n||0)/100).toLocaleString('en-MY',{minimumFractionDigits:2,maximumFractionDigits:2});
let busy=false,lastLoad=0,data=null;

function ensure(){
 if($('#rqOverviewV2'))return $('#rqOverviewV2');
 const host=document.querySelector('#adminApp section');if(!host)return null;
 const n=document.createElement('section');n.id='rqOverviewV2';n.className='rqDash';
 n.innerHTML=`<div class="rqDashHead"><div><div class="label">COMMAND CENTER</div><h2>Apa yang perlu dibuat sekarang?</h2><p>Sales, kutipan, production, invoice dan customer dalam satu pandangan.</p></div><button class="btn rqDashRefresh" id="rqDashRefresh">↻ Refresh</button></div>
 <div class="rqKpis" id="rqKpis"></div>
 <div class="rqDashGrid rqDashGridTop">
  <article class="rqDashPanel rqAttentionPanel"><div class="rqDashPanelHead"><div><small>ACTION QUEUE</small><h3>Perlu perhatian</h3></div><a href="/admin/documents.html">Documents →</a></div><div id="rqAttention"></div></article>
  <article class="rqDashPanel"><div class="rqDashPanelHead"><div><small>QUICK ACTIONS</small><h3>Buka workspace</h3></div></div><div class="rqActionGrid"><a class="rqAction primary" href="/admin/documents.html"><b>+ Quotation / Invoice</b><span>Create, collect payment & receipt</span></a><a class="rqAction" href="/shop/admin.html#orders"><b>Orders</b><span>Semak order & bayaran</span></a><a class="rqAction" href="/shop/admin.html#production"><b>Production</b><span>Due date, PIC & priority</span></a><a class="rqAction" href="/admin/customers.html"><b>Customers</b><span>History, outstanding & repeat buyer</span></a><a class="rqAction" href="/admin/finance.html"><b>Finance</b><span>Revenue, pending & AOV</span></a><a class="rqAction" href="/sim/pksk/admin/"><b>PKSK</b><span>Payment, license & progress</span></a></div></article>
 </div>
 <div class="rqDashGrid rqDashGridBottom">
  <article class="rqDashPanel"><div class="rqDashPanelHead"><div><small>CUSTOMERS</small><h3>Customer terbaru</h3></div><a href="/admin/customers.html">Customers →</a></div><div id="rqCustomers"></div></article>
  <article class="rqDashPanel"><div class="rqDashPanelHead"><div><small>LATEST ORDERS</small><h3>Order terbaru</h3></div><a href="/shop/admin.html#orders">Orders →</a></div><div id="rqLatest"></div></article>
 </div>
 <article class="rqDashPanel rqRevenuePanel"><div class="rqDashPanelHead"><div><small>REVENUE</small><h3>Paid revenue · 6 bulan</h3></div><a href="/admin/finance.html">Finance →</a></div><div class="rqTrend" id="rqTrend"></div></article>
 <div class="rqDashFoot" id="rqDashFoot" role="status" aria-live="polite"></div>`;
 host.prepend(n);document.body.classList.add('rqOverviewV2');$('#rqDashRefresh')?.addEventListener('click',()=>load(true));return n;
}
function ref(o){return o.orderNo||o.order_no||o.order_ref||o.id||'Order'}
function customer(o){return o.name||o.customer_name||o.customerName||'-'}
function created(o){return o.created_at||o.createdAt||o.timestamp||''}
function fmtDate(v){if(!v)return'—';const d=new Date(v);return Number.isNaN(d.getTime())?'—':d.toLocaleDateString('ms-MY',{day:'2-digit',month:'short'})}
function fmtDateLong(v){if(!v)return'—';const d=new Date(v);return Number.isNaN(d.getTime())?'—':d.toLocaleDateString('ms-MY',{day:'2-digit',month:'short',year:'numeric'})}
function plural(n,word){return `${Number(n||0)} ${word}${Number(n||0)===1?'':'s'}`}
function amount(o){return money(o.total_minor!=null?o.total_minor:Math.round(Number(o.total||0)*100))}
function renderAttention(cc,due,pending){
 const invoice=(Array.isArray(cc.invoice_due)?cc.invoice_due:[]).map(x=>({kind:x.days_to_due<0?'invoice_overdue':'invoice_due',href:'/admin/documents.html',title:`${x.number||'Invoice'} · ${x.customer_name||'Customer'}`,sub:x.days_to_due<0?`${Math.abs(x.days_to_due)} hari overdue · baki ${money(x.balance_minor)}`:x.days_to_due===0?`Due hari ini · baki ${money(x.balance_minor)}`:`Due ${fmtDateLong(x.due_at)} · baki ${money(x.balance_minor)}`,value:money(x.balance_minor)}));
 const production=due.map(x=>({kind:x.due_date===new Date().toISOString().slice(0,10)?'production_today':'production_overdue',href:'/shop/admin.html#production',title:`${ref(x)} · ${customer(x)}`,sub:`Production due ${x.due_date||'—'}${x.assigned_to?' · '+x.assigned_to:''}`,value:amount(x)}));
 const pay=pending.map(o=>({kind:'payment',href:'/shop/admin.html#orders',title:`${ref(o)} · ${customer(o)}`,sub:'Bayaran belum disahkan',value:amount(o)}));
 const list=[...invoice.filter(x=>x.kind==='invoice_overdue'),...invoice.filter(x=>x.kind==='invoice_due'),...production,...pay].slice(0,12);
 $('#rqAttention').innerHTML=list.length?`<div class="rqOpsList">${list.map(x=>{const badge=x.kind==='invoice_overdue'?'OVERDUE INVOICE':x.kind==='invoice_due'?'DUE SOON':x.kind==='production_overdue'?'PRODUCTION OVERDUE':x.kind==='production_today'?'PRODUCTION TODAY':'PAYMENT';const cls=x.kind.includes('overdue')?'red':x.kind==='invoice_due'?'gold':x.kind==='production_today'?'blue':'';return `<a class="rqOpsRow rqOpsLink" href="${x.href}"><div><b>${esc(x.title)}</b><small>${esc(x.sub)}</small></div><div class="rqOpsRight"><strong>${esc(x.value)}</strong><span class="rqBadge ${cls}">${badge}</span></div></a>`}).join('')}</div>`:'<div class="rqDashEmpty rqAllClear"><b>✓ Tiada perkara kritikal.</b><span>Invoice dan production terkawal buat masa ini.</span></div>';
}
function renderCustomers(list){
 $('#rqCustomers').innerHTML=list.length?`<div class="rqOpsList">${list.map(c=>`<a class="rqOpsRow rqOpsLink" href="/admin/customers.html"><div><b>${esc(c.name||'Customer')}</b><small>${esc(c.phone||c.email||'Tiada contact')} · ${plural(c.order_count,'order')}</small></div><div class="rqOpsRight"><strong>${money(c.paid_value_minor||0)}</strong><span class="rqBadge green">${fmtDate(c.last_order_at||c.created_at)}</span></div></a>`).join('')}</div>`:'<div class="rqDashEmpty">Belum ada customer.</div>';
}
function render(){
 ensure();if(!data)return;
 const k=data.kpis||{},cc=data.commandCenter||{},due=Array.isArray(data.due)?data.due:[],pending=Array.isArray(data.pending)?data.pending:[],latest=Array.isArray(data.latest)?data.latest:[],trend=Array.isArray(data.trend)?data.trend:[],customers=Array.isArray(cc.recent_customers)?cc.recent_customers:[];
 $('#rqKpis').innerHTML=`
  <a class="rqKpi ok" href="/admin/finance.html"><small>TODAY COLLECTED</small><b>${money(cc.today_collected_minor||0)}</b><span>${plural(cc.today_collected_count,'payment')} diterima</span></a>
  <a class="rqKpi danger" href="/admin/documents.html"><small>OUTSTANDING</small><b>${money(cc.outstanding_minor||0)}</b><span>${plural(cc.outstanding_count,'invoice/order')} berbaki</span></a>
  <a class="rqKpi" href="/shop/admin.html#production"><small>TO PRODUCE</small><b>${Number(k.processing_count||0)}</b><span>${Number(k.due_today||0)} due hari ini · ${Number(k.overdue||0)} overdue</span></a>
  <a class="rqKpi warn" href="/admin/documents.html"><small>DUE IN 7 DAYS</small><b>${Number(cc.due_soon_count||0)}</b><span>${money(cc.due_soon_minor||0)} perlu dikutip</span></a>
  <a class="rqKpi danger" href="/admin/documents.html"><small>OVERDUE INVOICES</small><b>${Number(cc.overdue_invoice_count||0)}</b><span>${money(cc.overdue_invoice_minor||0)} tertunggak</span></a>
  <a class="rqKpi ok" href="/admin/finance.html"><small>PAID REVENUE · 30D</small><b>${money(k.paid_revenue_30)}</b><span>${plural(k.paid_orders_30,'paid order')}</span></a>`;
 renderAttention(cc,due,pending);renderCustomers(customers);
 const max=Math.max(1,...trend.map(x=>Number(x.revenue_minor||0)));$('#rqTrend').innerHTML=trend.length?trend.map(x=>{const d=new Date(String(x.month)+'-01T00:00:00'),v=Number(x.revenue_minor||0);return `<div class="rqTrendCol"><span>${money(v).replace('.00','')}</span><div class="rqTrendBar" style="height:${Math.max(2,Math.round(v/max*100))}px"></div><small>${d.toLocaleDateString('ms-MY',{month:'short'})}</small></div>`}).join(''):'<div class="rqDashEmpty">Belum ada paid revenue.</div>';
 $('#rqLatest').innerHTML=latest.length?`<div class="rqOpsList">${latest.map(o=>{const p=String(o.payment_status||o.payment||'pending').toLowerCase(),f=String(o.fulfillment_status||o.status||'pending').toLowerCase(),lab=f==='fulfilled'?'SIAP':f==='processing'?'PROSES':p==='paid'?'PAID':'PENDING',cls=f==='fulfilled'||p==='paid'?'green':f==='processing'?'blue':'';return `<a class="rqOpsRow rqOpsLink" href="/shop/admin.html#orders"><div><b>${esc(ref(o))}</b><small>${esc(customer(o))} · ${fmtDate(created(o))}</small></div><div class="rqOpsRight"><strong>${amount(o)}</strong><span class="rqBadge ${cls}">${lab}</span></div></a>`}).join('')}</div>`:'<div class="rqDashEmpty">Belum ada order.</div>';
 $('#rqDashFoot').textContent=`Business date ${cc.business_date||'—'} · Dikemas kini ${new Date(lastLoad).toLocaleTimeString('ms-MY',{hour:'2-digit',minute:'2-digit'})} · Today Collected ikut payment ledger bila tersedia.`;
}
async function load(force=false){
 ensure();if(!token()||busy)return;if(!force&&data&&Date.now()-lastLoad<FRESH_MS){render();return}busy=true;$('#rqDashRefresh').disabled=true;$('#rqDashFoot').textContent='Memuatkan command center…';
 try{const r=await fetch(`${API}?action=dashboardSummary`,{headers:{'X-Admin-Token':decodeURIComponent(token())},cache:'no-store'}),j=await r.json().catch(()=>({}));if(!r.ok||!j.ok)throw Error(j.error||'Gagal memuatkan dashboard');data=j;lastLoad=Date.now();render()}catch(e){$('#rqDashFoot').textContent=e.message||'Dashboard gagal dimuatkan.'}finally{busy=false;$('#rqDashRefresh').disabled=false}
}
function boot(){ensure();if(token())load()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
window.addEventListener('focus',()=>{if(token()&&Date.now()-lastLoad>=FRESH_MS)load()});
window.addEventListener('reqoo:admin-ready',()=>load(true));
})();
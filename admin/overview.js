(()=>{
'use strict';
const API='/api/shop-admin',FRESH_MS=30000;
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>'RM'+(Number(n||0)/100).toLocaleString('en-MY',{minimumFractionDigits:2,maximumFractionDigits:2});
let busy=false,lastLoad=0,data=null;

function ensure(){
 if($('#rqOverviewV2'))return $('#rqOverviewV2');
 const host=document.querySelector('#adminApp section');if(!host)return null;
 const n=document.createElement('section');n.id='rqOverviewV2';n.className='rqDash';
 n.innerHTML=`<div class="rqDashHead"><div><div class="label">RINGKASAN</div><h2>Hari ini</h2><p>Jualan, kutipan, pengeluaran, invois dan pelanggan dalam satu paparan.</p></div><button class="btn rqDashRefresh" id="rqDashRefresh">Muat semula</button></div>
 <div class="rqKpis" id="rqKpis"></div>
 <div class="rqDashGrid rqDashGridTop">
  <article class="rqDashPanel rqFollowupPanel"><div class="rqDashPanelHead"><div><small>TINDAKAN SUSULAN HARIAN</small><h3>Perlu tindakan <span class="rqFollowupCount" id="rqFollowupCount"></span></h3></div><a href="/admin/customers.html">Pelanggan →</a></div><div id="rqFollowups"></div></article>
  <article class="rqDashPanel"><div class="rqDashPanelHead"><div><small>TINDAKAN PANTAS</small><h3>Tindakan</h3></div></div><div class="rqActionGrid"><a class="rqAction primary" href="/admin/documents.html?view=quotations&new=1"><b>+ Sebut harga</b></a><a class="rqAction" href="/admin/documents.html?view=orders"><b>Pesanan</b><span>Semak pesanan dan bayaran</span></a><a class="rqAction" href="/admin/documents.html?view=orders&filter=working"><b>Dalam kerja</b><span>Tarikh siap, petugas dan keutamaan</span></a><a class="rqAction" href="/admin/customers.html"><b>Pelanggan</b><span>Sejarah, baki dan pelanggan berulang</span></a><a class="rqAction" href="/admin/finance.html"><b>Kewangan</b><span>Hasil jualan, baki dan purata pesanan</span></a></div></article>
 </div>
 <div class="rqDashGrid rqDashGridBottom">
  <article class="rqDashPanel"><div class="rqDashPanelHead"><div><small>PELANGGAN</small><h3>Pelanggan terkini</h3></div><a href="/admin/customers.html">Pelanggan →</a></div><div id="rqCustomers"></div></article>
  <article class="rqDashPanel"><div class="rqDashPanelHead"><div><small>PESANAN TERKINI</small><h3>Pesanan terkini</h3></div><a href="/admin/documents.html?view=orders">Pesanan →</a></div><div id="rqLatest"></div></article>
 </div>
 <article class="rqDashPanel rqRevenuePanel"><div class="rqDashPanelHead"><div><small>HASIL JUALAN</small><h3>Kutipan · 6 bulan</h3></div><a href="/admin/finance.html">Kewangan →</a></div><div class="rqTrend" id="rqTrend"></div></article>
 <div class="rqDashFoot" id="rqDashFoot" role="status" aria-live="polite"></div>`;
 host.prepend(n);document.body.classList.add('rqOverviewV2');$('#rqDashRefresh')?.addEventListener('click',()=>load(true));return n;
}
function ref(o){return o.orderNo||o.order_no||o.order_ref||o.id||'Order'}
function customer(o){return o.name||o.customer_name||o.customerName||'-'}
function created(o){return o.created_at||o.createdAt||o.timestamp||''}
function fmtDate(v){if(!v)return'—';const d=new Date(v);return Number.isNaN(d.getTime())?'—':d.toLocaleDateString('ms-MY',{day:'2-digit',month:'short'})}
function fmtDateLong(v){if(!v)return'—';const d=new Date(`${String(v).slice(0,10)}T00:00:00`);return Number.isNaN(d.getTime())?'—':d.toLocaleDateString('ms-MY',{day:'2-digit',month:'short',year:'numeric'})}
function plural(n,word){const count=Number(n||0);return `${count} ${word}${/^(order|payment|task)$/.test(word)&&count!==1?'s':''}`}
function amount(o){return money(o.total_minor!=null?o.total_minor:Math.round(Number(o.total||0)*100))}
function waPhone(v){let n=String(v||'').replace(/\D/g,'');if(n.startsWith('0'))n='60'+n.slice(1);return n}
function followupMeta(f){
 if(f.kind==='invoice_overdue')return{label:'INVOIS TERTUNGGAK',cls:'red',sub:`${Number(f.days_overdue||0)} hari lewat · baki ${money(f.amount_minor)}`};
 if(f.kind==='invoice_due')return{label:Number(f.days_to_due||0)===0?'PERLU DIBAYAR HARI INI':'HAMPIR TAMAT TEMPOH',cls:'gold',sub:Number(f.days_to_due||0)===0?`Perlu dibayar hari ini · baki ${money(f.amount_minor)}`:`Tarikh akhir ${fmtDateLong(f.due_date)} · baki ${money(f.amount_minor)}`};
 if(f.kind==='production_overdue')return{label:'PENGELUARAN LEWAT',cls:'red',sub:`${Number(f.days_overdue||0)} hari lewat${f.assigned_to?' · '+f.assigned_to:''}`};
 if(f.kind==='production_today')return{label:'PENGELUARAN HARI INI',cls:'blue',sub:`Siap hari ini${f.assigned_to?' · '+f.assigned_to:''}`};
 if(f.kind==='payment_pending')return{label:'SUSULAN BAYARAN',cls:'gold',sub:`Belum bayar ${Number(f.age_days||1)} hari · ${money(f.amount_minor)}`};
 return{label:'SUSULAN PELANGGAN',cls:'green',sub:`Tiada pesanan ${Number(f.age_days||45)} hari · jumlah ${money(f.amount_minor)}`};
}
function followupMessage(f){
 const name=f.customer_name||'Tuan/Puan',reference=f.reference||f.order_no||'';
 if(f.kind==='invoice_overdue')return `Salam ${name}, peringatan mesra daripada Reqoo.co untuk Invoice ${reference}. Baki ${money(f.amount_minor)} telah lewat ${Number(f.days_overdue||0)} hari. Mohon maklumkan status pembayaran ya. Terima kasih.`;
 if(f.kind==='invoice_due')return `Salam ${name}, peringatan mesra daripada Reqoo.co untuk Invoice ${reference}. Baki ${money(f.amount_minor)} perlu dibayar ${Number(f.days_to_due||0)===0?'hari ini':'pada '+fmtDateLong(f.due_date)}. Terima kasih.`;
 if(f.kind==='payment_pending')return `Salam ${name}, kami nak follow-up Order ${reference}. Bayaran masih belum disahkan dalam sistem. Jika dah buat bayaran, boleh kongsikan bukti pembayaran ya. Terima kasih.`;
 return `Salam ${name}, saya dari Reqoo.co. Nak follow-up, kalau ada keperluan tempahan custom atau gift untuk masa terdekat boleh terus bagitahu ya. Terima kasih.`;
}
function waLink(f){const n=waPhone(f.phone);return n?`https://wa.me/${n}?text=${encodeURIComponent(followupMessage(f))}`:''}
function renderFollowups(cc){
 const list=Array.isArray(cc.followups)?cc.followups:[];const count=$('#rqFollowupCount');if(count)count.textContent=list.length?`${list.length} tugasan`:'';
 $('#rqFollowups').innerHTML=list.length?`<div class="rqFollowupList">${list.map(f=>{const m=followupMeta(f),wa=f.contactable===false?'':waLink(f),priority=String(f.priority||'normal').toUpperCase(),open=f.action_url||'/admin/';return `<div class="rqFollowupRow ${esc(f.priority||'normal')}"><div class="rqFollowupPriority"><span>${priority}</span></div><div class="rqFollowupMain"><b>${esc(f.customer_name||'Pelanggan')} · ${esc(f.reference||'')}</b><small>${esc(m.sub)}</small><span class="rqBadge ${m.cls}">${esc(m.label)}</span></div><div class="rqFollowupActions">${f.amount_minor?`<strong>${money(f.amount_minor)}</strong>`:''}<div>${wa?`<a class="rqMiniAction wa" href="${wa}" target="_blank" rel="noopener">WhatsApp</a>`:''}<a class="rqMiniAction" href="${esc(open)}">Open</a></div></div></div>`}).join('')}</div>`:'<div class="rqDashEmpty rqAllClear"><b>✓ Tiada follow-up kritikal hari ini.</b><span>Invoice, payment dan production nampak terkawal.</span></div>';
}
function renderCustomers(list){
 $('#rqCustomers').innerHTML=list.length?`<div class="rqOpsList">${list.map(c=>`<a class="rqOpsRow rqOpsLink" href="/admin/customers.html"><div><b>${esc(c.name||'Pelanggan')}</b><small>${esc(c.phone||c.email||'Tiada maklumat hubungan')} · ${plural(c.order_count,'order')}</small></div><div class="rqOpsRight"><strong>${money(c.paid_value_minor||0)}</strong><span class="rqBadge green">${fmtDate(c.last_order_at||c.created_at)}</span></div></a>`).join('')}</div>`:'<div class="rqDashEmpty">Belum ada customer.</div>';
}
function render(){
 ensure();if(!data)return;
 const k=data.kpis||{},cc=data.commandCenter||{},latest=Array.isArray(data.latest)?data.latest:[],trend=Array.isArray(data.trend)?data.trend:[],customers=Array.isArray(cc.recent_customers)?cc.recent_customers:[];
 $('#rqKpis').innerHTML=`
  <a class="rqKpi ok" href="/admin/finance.html"><small>KUTIPAN HARI INI</small><b>${money(cc.today_collected_minor||0)}</b><span>${plural(cc.today_collected_count,'bayaran')} diterima</span></a>
  <a class="rqKpi danger" href="/admin/documents.html"><small>BAKI</small><b>${money(cc.outstanding_minor||0)}</b><span>${plural(cc.outstanding_count,'invois/pesanan')} berbaki</span></a>
  <a class="rqKpi" href="/admin/documents.html?view=orders&filter=working"><small>DALAM KERJA</small><b>${Number(k.to_produce_count??k.processing_count??0)}</b><span>${Number(k.due_today||0)} perlu siap hari ini · ${Number(k.overdue||0)} lewat</span></a>
  <a class="rqKpi warn" href="/admin/documents.html"><small>PERLU DIKUTIP</small><b>${Number(cc.due_soon_count||0)}</b><span>${money(cc.due_soon_minor||0)} perlu dikutip</span></a>
  <a class="rqKpi danger" href="/admin/documents.html"><small>LEWAT BAYAR</small><b>${Number(cc.overdue_invoice_count||0)}</b><span>${money(cc.overdue_invoice_minor||0)} tertunggak</span></a>
  <a class="rqKpi ok" href="/admin/finance.html"><small>KUTIPAN · 30 HARI</small><b>${money(k.paid_revenue_30)}</b><span>${plural(k.paid_orders_30,'pesanan berbayar')}</span></a>`;
 renderFollowups(cc);renderCustomers(customers);
 const max=Math.max(1,...trend.map(x=>Number(x.revenue_minor||0)));$('#rqTrend').innerHTML=trend.length?trend.map(x=>{const d=new Date(String(x.month)+'-01T00:00:00'),v=Number(x.revenue_minor||0);return `<div class="rqTrendCol"><span>${money(v).replace('.00','')}</span><div class="rqTrendBar" style="height:${Math.max(2,Math.round(v/max*100))}px"></div><small>${d.toLocaleDateString('ms-MY',{month:'short'})}</small></div>`}).join(''):'<div class="rqDashEmpty">Belum ada hasil jualan berbayar.</div>';
 $('#rqLatest').innerHTML=latest.length?`<div class="rqOpsList">${latest.map(o=>{const p=String(o.payment_status||o.payment||'pending').toLowerCase(),f=String(o.fulfillment_status||o.status||'pending').toLowerCase(),lab=f==='fulfilled'?'SIAP':f==='processing'?'PROSES':p==='paid'?'PAID':p==='partial'?'DEPOSIT':'PENDING',cls=f==='fulfilled'||p==='paid'?'green':f==='processing'?'blue':p==='partial'?'gold':'';return `<a class="rqOpsRow rqOpsLink" href="/admin/documents.html?view=orders&order=${encodeURIComponent(o.id||o.orderId||o.order_no||o.orderNo||o.order_ref||'')}"><div><b>${esc(ref(o))}</b><small>${esc(customer(o))} · ${fmtDate(created(o))}</small></div><div class="rqOpsRight"><strong>${amount(o)}</strong><span class="rqBadge ${cls}">${lab}</span></div></a>`}).join('')}</div>`:'<div class="rqDashEmpty">Belum ada order.</div>';
 $('#rqDashFoot').textContent=`Business date ${cc.business_date||'—'} · ${Number(cc.followup_whatsapp_count||0)} WhatsApp follow-up tersedia · Dikemas kini ${new Date(lastLoad).toLocaleTimeString('ms-MY',{hour:'2-digit',minute:'2-digit'})}.`;
}
async function load(force=false){
 ensure();if(busy)return;if(!force&&data&&Date.now()-lastLoad<FRESH_MS){render();return}busy=true;$('#rqDashRefresh').disabled=true;$('#rqDashFoot').textContent='Memuatkan command center…';
 try{const r=await fetch(`${API}?action=dashboardSummary`,{cache:'no-store'}),j=await r.json().catch(()=>({}));if(!r.ok||!j.ok)throw Error(j.error||'Gagal memuatkan dashboard');data=j;lastLoad=Date.now();render()}catch(e){$('#rqDashFoot').textContent=e.message||'Dashboard gagal dimuatkan.'}finally{busy=false;$('#rqDashRefresh').disabled=false}
}
function boot(){ensure();load()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
window.addEventListener('focus',()=>{if(Date.now()-lastLoad>=FRESH_MS)load()});
window.addEventListener('reqoo:admin-ready',()=>load(true));
})();
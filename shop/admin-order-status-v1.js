(()=>{
'use strict';
const API='/api/shop-admin';
const token=()=>{const m=document.cookie.match(/(?:^|;\s*)reqoo_admin_token=([^;]+)/);return decodeURIComponent(m?.[1]||'')||localStorage.getItem('reqoo_admin_token')||localStorage.getItem('REQOO_ADMIN_TOKEN')||''};
function statusOf(o){const p=String(o?.payment_status||o?.payment||'').toLowerCase(),f=String(o?.fulfillment_status||'').toLowerCase();if(p==='failed')return['failed','FAILED'];if(f==='fulfilled')return['fulfilled','SIAP'];if(f==='processing')return['processing','DALAM PROSES'];if(p==='paid')return['paid','PAID'];return['pending','PENDING']}
async function loadOrders(){const u=new URL(API,location.origin);u.searchParams.set('action','listOrders');const h={},t=token();if(t)h['X-Admin-Token']=t;const r=await fetch(u,{headers:h,cache:'no-store'}),j=await r.json().catch(()=>({}));if(!r.ok||!j.ok)throw Error(j.error||`HTTP ${r.status}`);return j.orders||[]}
function mapRows(orders){const table=document.getElementById('ordersTable');if(!table)return;const byRef=new Map();for(const o of orders){for(const key of [o.id,o.orderNo,o.order_ref])if(key!=null)byRef.set(String(key),o)}table.querySelectorAll('.orderRow:not(.orderHead)').forEach(row=>{const ref=row.querySelector('div:first-child b')?.textContent?.trim();if(!ref)return;const o=byRef.get(ref);if(!o)return;const badge=row.querySelector('.status');if(!badge)return;const[cls,label]=statusOf(o);badge.className=`status ${cls}`;badge.textContent=label;row.dataset.reqooStatus=cls})}
let busy=false;
async function sync(){if(busy||!document.getElementById('ordersTable'))return;busy=true;try{mapRows(await loadOrders())}catch{}finally{busy=false}}
const obs=new MutationObserver(()=>{clearTimeout(obs._t);obs._t=setTimeout(sync,80)});const start=()=>{const table=document.getElementById('ordersTable');if(table)obs.observe(table,{childList:true,subtree:true});sync()};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.addEventListener('focus',sync);setInterval(sync,30000);
})();

(()=>{
'use strict';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
let activeFilter='all';
function rowType(row){
 return row.dataset.documentType||(window.__REQOO_DOCUMENTS__||[]).find(d=>String(d.id)===row.dataset.documentId)?.type||'other';
}
function rows(){return $$('#docHistory .rqHistRow')}
function syncCounts(){
 const counts=window.__REQOO_DOCUMENT_COUNTS__||{};
 const set=(id,n)=>{const el=document.getElementById(id);if(el)el.textContent=n===undefined?'—':String(n)};
 set('docSaved',counts.all);set('docQuoteCount',counts.quotation);set('docInvoiceCount',counts.invoice);set('docReceiptCount',counts.receipt);
 $$('.rqDocTab').forEach(b=>{const badge=b.querySelector('em');if(badge)badge.textContent=counts[b.dataset.docFilter]??'—'});
}
function applyFilter(){
 let shown=0;
 rows().forEach(row=>{
   // Search is authoritative on the server, including order references absent from row text.
   const type=rowType(row),okType=activeFilter==='all'||type===activeFilter,okFinance=row.dataset.rqFinanceMatch!=='0',show=okType&&okFinance;
   row.hidden=!show;if(show)shown++;
 });
 const empty=$('#docUnifiedEmpty');if(empty)empty.hidden=shown>0||$('#docHistory')?.getAttribute('aria-busy')==='true';
 $$('.rqDocTab').forEach(b=>{const on=b.dataset.docFilter===activeFilter;b.classList.toggle('active',on);b.setAttribute('aria-selected',on?'true':'false')});
}
function refreshUnified(){syncCounts();applyFilter()}
function initTabs(){
 $$('.rqDocTab').forEach(b=>b.addEventListener('click',()=>{activeFilter=b.dataset.docFilter||'all';document.dispatchEvent(new CustomEvent('rq:documents-type-filter',{detail:{type:activeFilter}}));applyFilter()}));
 $('#docUnifiedSearch')?.addEventListener('input',applyFilter);
 document.addEventListener('rq:documents-finance-filter',applyFilter);
}
function initOrderDrawer(){
 const panel=$('#rqOrderSourcePanel'),btn=$('#toggleOrderDrawer'),close=$('#closeOrderDrawer');
 const toggle=force=>{if(!panel)return;const open=force??!panel.classList.contains('open');panel.classList.toggle('open',open);btn?.classList.toggle('active',open);btn?.setAttribute('aria-expanded',open?'true':'false');if(open)setTimeout(()=>panel.scrollIntoView({behavior:'smooth',block:'start'}),20)};
 btn?.addEventListener('click',()=>toggle());close?.addEventListener('click',()=>toggle(false));
}
function initQuoteComposer(){
 const body=$('#quoteBuilderBody'),panel=$('#rqQuoteComposer'),btn=$('#toggleQuoteBuilder');if(!body||!panel||!btn)return;
 const sync=()=>{const open=body.classList.contains('open');panel.classList.toggle('open',open);btn.classList.toggle('active',open);btn.setAttribute('aria-expanded',open?'true':'false');if(open)setTimeout(()=>panel.scrollIntoView({behavior:'smooth',block:'start'}),20)};
 new MutationObserver(sync).observe(body,{attributes:true,attributeFilter:['class']});btn.addEventListener('click',()=>setTimeout(sync,0));sync();
}
function initObserver(){const h=$('#docHistory');if(!h)return;new MutationObserver(()=>setTimeout(refreshUnified,0)).observe(h,{childList:true,subtree:true});setTimeout(refreshUnified,100)}
function initDialogs(){
 let current=null,returnTo=null;
 const sync=()=>{const next=$('.rqPaymentModal.open')||$('.rqDocsModal.open')||$('.rqDocDrawer.open');if(next===current)return;
  if(next){if(!current)returnTo=document.activeElement;current=next;next.setAttribute('role','dialog');next.setAttribute('aria-modal','true');next.querySelector('button')?.focus()}
  else{current=null;if(returnTo?.isConnected)returnTo.focus();returnTo=null}
 };
 new MutationObserver(sync).observe(document.body,{subtree:true,attributes:true,attributeFilter:['class']});
 document.addEventListener('keydown',e=>{if(!current)return;
  if(e.key==='Escape'){e.preventDefault();current.querySelector('.rqDocsClose,.rqPaymentClose,.rqDocDrawerClose')?.click();return}
  if(e.key!=='Tab')return;
  const focusable=[...current.querySelectorAll('button,input,textarea,select,a[href],summary,[tabindex="0"]')].filter(x=>!x.disabled&&x.getClientRects().length);
  const first=focusable[0],last=focusable.at(-1);if(!first)return;
  if(e.shiftKey&&(document.activeElement===first||!current.contains(document.activeElement))){e.preventDefault();last.focus()}
  else if(!e.shiftKey&&(document.activeElement===last||!current.contains(document.activeElement))){e.preventDefault();first.focus()}
 });
}
function init(){document.addEventListener('rq:documents-counts',syncCounts);initTabs();initOrderDrawer();initQuoteComposer();initObserver();initDialogs()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();

(()=>{
'use strict';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
let activeFilter='all';
function rowType(row){
 const t=(row.querySelector('.rqHistType')?.textContent||'').trim().toLowerCase();
 if(t.includes('quotation'))return'quotation';
 if(t.includes('invoice'))return'invoice';
 if(t.includes('receipt'))return'receipt';
 if(t.includes('delivery'))return'delivery_order';
 return'other';
}
function rows(){return $$('#docHistory .rqHistRow')}
function syncCounts(){
 const all=rows();
 const set=(id,n)=>{const el=document.getElementById(id);if(el)el.textContent=String(n)};
 set('docSaved',all.length);
 set('docQuoteCount',all.filter(r=>rowType(r)==='quotation').length);
 set('docInvoiceCount',all.filter(r=>rowType(r)==='invoice').length);
 set('docReceiptCount',all.filter(r=>rowType(r)==='receipt').length);
 $$('.rqDocTab').forEach(b=>{const type=b.dataset.docFilter,count=type==='all'?all.length:all.filter(r=>rowType(r)===type).length;const badge=b.querySelector('em');if(badge)badge.textContent=String(count)});
}
function applyFilter(){
 const q=($('#docUnifiedSearch')?.value||'').trim().toLowerCase();
 let shown=0;
 rows().forEach(row=>{
   const type=rowType(row),okType=activeFilter==='all'||type===activeFilter,okSearch=!q||row.textContent.toLowerCase().includes(q),okFinance=row.dataset.rqFinanceMatch!=='0',show=okType&&okSearch&&okFinance;
   row.hidden=!show;if(show)shown++;
 });
 const empty=$('#docUnifiedEmpty');if(empty)empty.hidden=shown>0;
 $$('.rqDocTab').forEach(b=>{const on=b.dataset.docFilter===activeFilter;b.classList.toggle('active',on);b.setAttribute('aria-selected',on?'true':'false')});
}
function refreshUnified(){syncCounts();applyFilter()}
function initTabs(){
 $$('.rqDocTab').forEach(b=>b.addEventListener('click',()=>{activeFilter=b.dataset.docFilter||'all';applyFilter()}));
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
function init(){initTabs();initOrderDrawer();initQuoteComposer();initObserver()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();

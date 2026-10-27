(()=>{'use strict';
function info(text,label='Maklumat'){const d=document.createElement('details');d.className='rqInfo';const s=document.createElement('summary');s.textContent='ⓘ';s.setAttribute('aria-label',label);const p=document.createElement('span');p.textContent=text;d.append(s,p);return d}
window.reqooInfo=info;
function simplify(root=document){for(const p of root.querySelectorAll('.rqDocsHead p,.rqDocsPanelHead>div>p,.rqDashHead p,.rqFinanceHead p,.rqCustomersHead p,.rqProductsHead p,.rqProductionHead p,.rqQuoteHint')){if(p.dataset.infoReady)continue;p.dataset.infoReady='1';const h=p.parentElement.querySelector('h1,h2,h3');if(h&&p.textContent.trim()){if(!h.querySelector('.rqInfo'))h.append(info(p.textContent.trim(),'Maklumat '+h.textContent));p.hidden=true}}
if(location.pathname==='/admin/'||location.pathname==='/admin/index.html')document.querySelectorAll('.hero').forEach(x=>x.hidden=true);
}
simplify();let pending=false;new MutationObserver(()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;simplify()})}).observe(document.body,{childList:true,subtree:true});
document.addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelectorAll('.rqInfo[open]').forEach(d=>{d.open=false;d.querySelector('summary').focus()})});
document.addEventListener('rq:identity',e=>{if(e.detail.role==='owner')return;document.querySelectorAll('[data-owner-only]').forEach(n=>n.hidden=true)});
})();

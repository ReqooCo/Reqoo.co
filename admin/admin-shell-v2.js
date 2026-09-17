(()=>{
'use strict';
const path=location.pathname,hash=location.hash;
const isShop=/\/shop\/admin\.html$/i.test(path),isOverview=/\/admin\/?$/i.test(path),isOrders=/\/admin\/orders\.html$/i.test(path),isProduction=/\/admin\/production\.html$/i.test(path),isProducts=/\/admin\/products\.html$/i.test(path),isDocuments=/\/admin\/documents\.html$/i.test(path),isCustomers=/\/admin\/customers\.html$/i.test(path),isFinance=/\/admin\/finance\.html$/i.test(path);
document.body.classList.add('rq-admin-shell');
const active=()=>isOverview?'overview':isOrders?'orders':isProduction?'production':isDocuments?'documents':isProducts?'products':isCustomers?'customers':isFinance?'finance':isShop?(hash==='#products'?'products':'orders'):/settings\.html$/i.test(path)?'settings':/sim\/pksk\/admin|admin\/sim(?:-v2)?\.html/i.test(path)?'pksk':'overview';
const A=active();
const groups=[
 ['WORKFLOW',[
  ['overview','⌂','Overview','/admin/'],
  ['orders','▤','Orders','/admin/orders.html'],
  ['production','◫','Production','/admin/production.html'],
  ['documents','▧','Documents','/admin/documents.html']
 ]],
 ['CATALOG & CRM',[
  ['products','◇','Products','/admin/products.html'],
  ['customers','♙','Customers','/admin/customers.html']
 ]],
 ['INSIGHTS',[
  ['finance','◉','Finance','/admin/finance.html']
 ]],
 ['TOOLS',[
  ['pksk','◎','PKSK','/sim/pksk/admin/'],
  ['settings','⚙','Settings','/admin/settings.html']
 ]]
];
const item=([k,i,t,u],mobile=false)=>`<a href="${u}" class="${A===k?'active':''}" data-rq-admin="${k}">${mobile?`<span>${i}</span>${t}`:`<span class="rqAdminIcon">${i}</span><span>${t}</span>`}</a>`;
const side=document.createElement('aside');
side.className='rqAdminSide';
side.innerHTML=`<div class="rqAdminBrand">REQOO<span>.ADMIN</span><small>BUSINESS CONTROL CENTRE</small></div>${groups.map(([g,links])=>`<div class="rqAdminGroup"><div class="rqAdminGroupTitle">${g}</div><nav class="rqAdminNav">${links.map(x=>item(x)).join('')}</nav></div>`).join('')}<div class="rqAdminSideFoot">REQOO.CO<br>Quality · Design · Innovation</div>`;
document.body.appendChild(side);

const mobilePrimary=[
 ['overview','⌂','Overview','/admin/'],
 ['orders','▤','Orders','/admin/orders.html'],
 ['production','◫','Production','/admin/production.html'],
 ['documents','▧','Documents','/admin/documents.html']
];
const moreKeys=['products','customers','finance','pksk','settings'];
const mobile=document.createElement('nav');
mobile.className='rqAdminMobile';
mobile.setAttribute('aria-label','Admin navigation');
mobile.innerHTML=mobilePrimary.map(x=>item(x,true)).join('')+`<button type="button" class="rqAdminMoreTrigger ${moreKeys.includes(A)?'active':''}" aria-expanded="false" aria-controls="rqAdminMore"><span>•••</span>More</button>`;
document.body.appendChild(mobile);

const more=document.createElement('div');
more.className='rqAdminMoreBackdrop';
more.id='rqAdminMore';
more.setAttribute('aria-hidden','true');
const moreItems=groups.flatMap(g=>g[1]).filter(x=>moreKeys.includes(x[0]));
more.innerHTML=`<section class="rqAdminMoreSheet" role="dialog" aria-modal="true" aria-label="More admin sections"><div class="rqAdminMoreHead"><div><small>MORE</small><b>Admin workspace</b></div><button type="button" class="rqAdminMoreClose" aria-label="Close">×</button></div><nav class="rqAdminMoreList">${moreItems.map(x=>item(x)).join('')}</nav></section>`;
document.body.appendChild(more);
const trigger=mobile.querySelector('.rqAdminMoreTrigger'),close=()=>{more.classList.remove('open');more.setAttribute('aria-hidden','true');trigger?.setAttribute('aria-expanded','false')},open=()=>{more.classList.add('open');more.setAttribute('aria-hidden','false');trigger?.setAttribute('aria-expanded','true');more.querySelector('.rqAdminMoreClose')?.focus()};
trigger?.addEventListener('click',()=>more.classList.contains('open')?close():open());
more.querySelector('.rqAdminMoreClose')?.addEventListener('click',close);
more.addEventListener('click',e=>{if(e.target===more)close()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&more.classList.contains('open'))close()});

if(isShop){const root=document.querySelector('main.wrap.app');if(root&&!document.getElementById('rqAdminContext')){const c=document.createElement('div');c.id='rqAdminContext';c.className='rqAdminContext';c.innerHTML='<div><h2>Shop Admin Legacy</h2><p>Editor lama dikekalkan untuk recovery. Gunakan Products dalam Control Centre untuk pengurusan katalog harian.</p></div><a class="rqAdminContextBadge" href="/admin/products.html">OPEN PRODUCTS →</a>';root.prepend(c)}}
if(isOverview){const hero=document.querySelector('.hero');if(hero&&!document.getElementById('rqAdminContext')){const c=document.createElement('div');c.id='rqAdminContext';c.className='rqAdminContext';c.innerHTML='<div><h2>Business Command Center</h2><p>Orders → Production → Documents. Fokus pada kerja yang perlu dibuat sekarang.</p></div><span class="rqAdminContextBadge">CONTROL CENTRE</span>';hero.parentNode.insertBefore(c,hero)}}
})();
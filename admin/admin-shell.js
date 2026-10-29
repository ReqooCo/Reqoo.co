(()=>{
'use strict';
if(!document.querySelector('link[href*="/admin/admin-flow.css"]')){const l=document.createElement('link');l.rel='stylesheet';l.href='/admin/admin-flow.css?v=2';document.head.appendChild(l)}
if(!document.querySelector('link[href*="/admin/admin-theme.css"]')){const l=document.createElement('link');l.rel='stylesheet';l.href='/admin/admin-theme.css?v=2';document.head.appendChild(l)}
if(!document.querySelector('script[src*="/admin/admin-business.js"]')){const s=document.createElement('script');s.src='/admin/admin-business.js?v=6';document.body.appendChild(s)}
const language=document.createElement('script');language.src='/admin/admin-language.js?v=1';document.body.appendChild(language);
const helper=document.createElement('script');helper.src='/admin/admin-simple.js?v=1';document.body.appendChild(helper);
const simpleStyle=document.createElement('link');simpleStyle.rel='stylesheet';simpleStyle.href='/admin/admin-simple.css?v=5';document.head.appendChild(simpleStyle);
const path=location.pathname,hash=location.hash;
const isShop=/\/shop\/admin\.html$/i.test(path),isOverview=/\/admin\/?$/i.test(path),isOrders=/\/admin\/orders\.html$/i.test(path),isProduction=/\/admin\/production\.html$/i.test(path),isProducts=/\/admin\/products\.html$/i.test(path),isDocuments=/\/admin\/documents\.html$/i.test(path),isCustomers=/\/admin\/customers\.html$/i.test(path),isFinance=/\/admin\/finance\.html$/i.test(path);
document.body.classList.add('rq-admin-shell');
const active=()=>isOverview?'overview':isOrders?'orders':isProduction?'production':isDocuments?'documents':isProducts?'products':isCustomers?'customers':isFinance?'finance':isShop?(hash==='#products'?'products':'orders'):/settings\.html$/i.test(path)?'settings':/sim\/pksk\/admin|admin\/sim(?:-v2)?\.html/i.test(path)?'pksk':'overview';
const A=isDocuments?(new URLSearchParams(location.search).get('view')==='quotations'?'quotations':'documents'):/manage\.html$/.test(path)?'manage':active();
const groups=[['',[
 ['overview','⌂','Ringkasan','/admin/'],
 ['quotations','▧','Quotation','/admin/documents.html?view=quotations'],
 ['documents','▤','Pesanan','/admin/documents.html?view=orders'],
 ['finance','◉','Kewangan','/admin/finance.html'],
 ['manage','⚙','Urus','/admin/manage.html']
]]];
const item=([k,i,t,u],mobile=false)=>`<a href="${u}" class="${A===k?'active':''}" data-rq-admin="${k}">${mobile?`<span>${i}</span>${t}`:`<span class="rqAdminIcon">${i}</span><span>${t}</span>`}</a>`;
const side=document.createElement('aside');
side.className='rqAdminSide';
side.innerHTML=`<div class="rqAdminBrand">REQOO<span>.ADMIN</span><small>JUALAN & BAYARAN</small></div>${groups.map(([g,links])=>`<div class="rqAdminGroup"><div class="rqAdminGroupTitle">${g}</div><nav class="rqAdminNav">${links.map(x=>item(x)).join('')}</nav></div>`).join('')}<div class="rqAdminSideFoot">REQOO.CO<br>Quality · Design · Innovation<button type="button" class="rqAdminLogout" data-rq-logout>Log keluar</button></div>`;
document.body.appendChild(side);

if(!document.querySelector('script[src*="/admin/admin-navigation.js"]')){const navigation=document.createElement('script');navigation.src='/admin/admin-navigation.js?v=1';document.body.append(navigation)}

if(isShop){const root=document.querySelector('main.wrap.app');if(root&&!document.getElementById('rqAdminContext')){const c=document.createElement('div');c.id='rqAdminContext';c.className='rqAdminContext';c.innerHTML='<div><h2>Shop Admin Legacy</h2><p>Editor lama dikekalkan untuk recovery. Gunakan Products dalam Control Centre untuk pengurusan katalog harian.</p></div><a class="rqAdminContextBadge" href="/admin/products.html">OPEN PRODUCTS →</a>';root.prepend(c)}}
})();

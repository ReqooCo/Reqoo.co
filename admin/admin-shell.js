(()=>{
'use strict';
if(!document.querySelector('link[href*="/admin/admin-flow.css"]')){const l=document.createElement('link');l.rel='stylesheet';l.href='/admin/admin-flow.css?v=2';document.head.appendChild(l)}
if(!document.querySelector('link[href*="/admin/admin-theme.css"]')){const l=document.createElement('link');l.rel='stylesheet';l.href='/admin/admin-theme.css?v=2';document.head.appendChild(l)}
if(!document.querySelector('script[src*="/admin/admin-business.js"]')){const s=document.createElement('script');s.src='/admin/admin-business.js?v=1';document.body.appendChild(s)}
const helper=document.createElement('script');helper.src='/admin/admin-simple.js?v=1';document.body.appendChild(helper);
const simpleStyle=document.createElement('link');simpleStyle.rel='stylesheet';simpleStyle.href='/admin/admin-simple.css?v=2';document.head.appendChild(simpleStyle);
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

const mobilePrimary=groups[0][1].slice(0,4);
const moreKeys=['manage','products','customers','settings'];
const mobile=document.createElement('nav');
mobile.className='rqAdminMobile';
mobile.setAttribute('aria-label','Admin navigation');
mobile.innerHTML=mobilePrimary.map(x=>item(x,true)).join('')+`<button type="button" class="rqAdminMoreTrigger ${moreKeys.includes(A)?'active':''}" aria-expanded="false" aria-controls="rqAdminMore"><span>•••</span>Urus</button>`;
document.body.appendChild(mobile);

const more=document.createElement('div');
more.className='rqAdminMoreBackdrop';
more.id='rqAdminMore';
more.setAttribute('aria-hidden','true');
const moreItems=[['manage','⚙','Urus','/admin/manage.html'],['customers','♙','Pelanggan','/admin/customers.html'],['products','◇','Produk','/admin/products.html'],['settings','⚙','Tetapan','/admin/settings.html']];
more.innerHTML=`<section class="rqAdminMoreSheet" role="dialog" aria-modal="true" aria-label="More admin sections"><div class="rqAdminMoreHead"><div><small>URUS</small><b>Urus</b></div><button type="button" class="rqAdminMoreClose" aria-label="Close">×</button></div><nav class="rqAdminMoreList">${moreItems.map(x=>item(x)).join('')}</nav><button type="button" class="rqAdminLogout rqAdminLogoutMobile" data-rq-logout>Log keluar</button></section>`;
document.body.appendChild(more);
const trigger=mobile.querySelector('.rqAdminMoreTrigger'),close=()=>{more.classList.remove('open');more.setAttribute('aria-hidden','true');trigger?.setAttribute('aria-expanded','false')},open=()=>{more.classList.add('open');more.setAttribute('aria-hidden','false');trigger?.setAttribute('aria-expanded','true');more.querySelector('.rqAdminMoreClose')?.focus()};
trigger?.addEventListener('click',()=>more.classList.contains('open')?close():open());
more.querySelector('.rqAdminMoreClose')?.addEventListener('click',close);
more.addEventListener('click',e=>{if(e.target===more)close()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&more.classList.contains('open'))close()});
async function logout(){for(const key of Object.keys(localStorage))if(key.startsWith('rq_quoteDraft_v1'))localStorage.removeItem(key);try{await fetch('/api/admin-session',{method:'DELETE',cache:'no-store'})}catch{}localStorage.removeItem('reqoo_admin_token');localStorage.removeItem('REQOO_ADMIN_TOKEN');localStorage.removeItem('reqoo_shop_admin_token');document.cookie='reqoo_admin_token=; Domain=.reqoo.co; Path=/; Max-Age=0; Secure; SameSite=Lax';document.cookie='reqoo_admin_token=; Path=/; Max-Age=0; Secure; SameSite=Lax';sessionStorage.removeItem('reqoo_admin_return');location.replace('/admin/')}document.querySelectorAll('[data-rq-logout]').forEach(b=>b.addEventListener('click',logout));

if(isShop){const root=document.querySelector('main.wrap.app');if(root&&!document.getElementById('rqAdminContext')){const c=document.createElement('div');c.id='rqAdminContext';c.className='rqAdminContext';c.innerHTML='<div><h2>Shop Admin Legacy</h2><p>Editor lama dikekalkan untuk recovery. Gunakan Products dalam Control Centre untuk pengurusan katalog harian.</p></div><a class="rqAdminContextBadge" href="/admin/products.html">OPEN PRODUCTS →</a>';root.prepend(c)}}
})();

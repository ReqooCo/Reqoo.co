(()=>{
  const p=location.pathname.replace(/\/+$/,'')||'/';
  const isShop=p==='/shop/admin.html'||p==='/shop/admin'||p==='/shop/admin/promotion-admin.html'||p==='/shop/promotion-admin.html';
  const isPksk=p==='/sim/pksk/admin'||p.startsWith('/sim/pksk/admin/');
  const isSecurity=p==='/admin/settings.html';
  const isMain=p==='/'||p==='/admin'||p==='/admin/index.html';
  const active=isShop?'shop':isPksk?'pksk':isSecurity?'security':isMain?'overview':'';
  const nav=document.createElement('div');nav.className='rq-admin-shell';
  nav.innerHTML=`<div class="rq-admin-shell-inner"><a class="rq-admin-brand" href="/admin/">REQOO<span>.ADMIN</span></a><div class="rq-admin-links"><a data-a="overview" href="/admin/">Overview</a><a data-a="shop" href="/shop/admin.html">SHOP</a><a data-a="pksk" href="/sim/pksk/admin/">PKSK</a><a data-a="security" href="/admin/settings.html">SECURITY</a></div><div class="rq-admin-live"><i></i> ADMIN</div></div>`;
  nav.querySelectorAll('[data-a]').forEach(a=>{if(a.dataset.a===active)a.classList.add('active')});
  document.body.prepend(nav);
})();

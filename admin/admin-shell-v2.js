(()=>{
'use strict';
const path=location.pathname,isShop=/\/shop\/admin\.html$/i.test(path);
const groups=[['OPERASI',[['overview','⌂','Overview','/admin/'],['orders','▤','Orders','/shop/admin.html#orders'],['production','◫','Production','/shop/admin.html#production'],['products','◇','Products','/shop/admin.html#products']]],['BISNES',[['customers','♙','Customers','/admin/customers.html'],['documents','▧','Documents','/admin/documents.html'],['finance','◉','Finance','/admin/finance.html'],['pksk','◎','PKSK','/sim/pksk/admin/'],['referral','↗','Referral','/sim/pksk/admin/#referrals']]],['SISTEM',[['settings','⚙','Settings','/admin/settings.html']]]];
const all=groups.flatMap(g=>g[1]);
function active(){if(isShop)return ['products','production'].includes(location.hash.slice(1))?location.hash.slice(1):'orders';if(/sim\/pksk\/admin|admin\/sim(?:-v2)?\.html/i.test(path))return location.hash==='#referrals'?'referral':'pksk';return all.find(x=>x[3]===path)?.[0]||'overview'}
function link([key,icon,label,url]){return `<a href="${url}" data-rq-admin="${key}"><span class="rqAdminIcon" aria-hidden="true">${icon}</span><span>${label}</span></a>`}
document.body.classList.add('rq-admin-shell');
const side=document.createElement('aside');side.className='rqAdminSide';side.setAttribute('aria-label','Navigasi Admin');
side.innerHTML='<div class="rqAdminBrand">REQOO<span>.ADMIN</span><small>BUSINESS CONTROL CENTRE</small></div>'+groups.map(([title,items])=>`<div class="rqAdminGroup"><div class="rqAdminGroupTitle">${title}</div><nav class="rqAdminNav" aria-label="${title}">${items.map(link).join('')}</nav></div>`).join('')+'<div class="rqAdminSideFoot">REQOO.CO<br>Quality · Design · Innovation</div>';
document.body.appendChild(side);
const mobile=document.createElement('nav');mobile.className='rqAdminMobile';mobile.setAttribute('aria-label','Navigasi mudah alih');
mobile.innerHTML=all.filter(x=>['overview','orders','production','products','finance'].includes(x[0])).map(link).join('')+'<button type="button" id="rqMoreToggle" aria-expanded="false" aria-controls="rqMoreMenu"><span aria-hidden="true">☰</span>Lagi</button>';
document.body.appendChild(mobile);
const more=document.createElement('nav');more.id='rqMoreMenu';more.className='rqAdminMore';more.hidden=true;more.setAttribute('aria-label','Workspace lain');more.innerHTML=all.filter(x=>['customers','documents','pksk','referral','settings'].includes(x[0])).map(link).join('');document.body.appendChild(more);
const toggle=document.getElementById('rqMoreToggle');function closeMore(){more.hidden=true;toggle.setAttribute('aria-expanded','false')}
toggle.onclick=()=>{more.hidden=!more.hidden;toggle.setAttribute('aria-expanded',String(!more.hidden))};
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeMore();if(mobile.contains(document.activeElement)||more.contains(document.activeElement))toggle.focus()}});
document.addEventListener('click',e=>{if(!mobile.contains(e.target)&&!more.contains(e.target))closeMore()});
function sync(){const key=active();document.querySelectorAll('[data-rq-admin]').forEach(a=>{const selected=a.dataset.rqAdmin===key;a.classList.toggle('active',selected);if(selected)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});if(!isShop)return;
 document.body.dataset.adminWorkspace=key;
 const target=key==='products'?'products':'orders';document.querySelectorAll('.tab').forEach(b=>{b.classList.toggle('active',b.dataset.tab===target);b.setAttribute('aria-selected',String(b.dataset.tab===target))});document.querySelectorAll('.tabPane').forEach(p=>p.style.display=p.id===target?'block':'none');
 const names={orders:['Orders','Semak bukti bayaran dan urus pesanan pelanggan.'],production:['Production','Susun tarikh siap, keutamaan dan operator.'],products:['Products & Inventory','Urus katalog, variasi dan stok Shop.']};const actions=document.querySelector('#app header .topActions'),head=document.querySelector('.pageHead');if(actions&&head)head.appendChild(actions);const title=document.querySelector('.pageHead h1'),desc=document.querySelector('.pageHead p');if(title)title.textContent=names[key][0];if(desc)desc.textContent=names[key][1];
 const add=document.querySelector('.addBar');if(add)add.hidden=key!=='products';closeMore();
}
window.addEventListener('hashchange',sync);
document.addEventListener('click',e=>{const b=e.target.closest('.tab[data-tab]');if(!b||!isShop)return;history.replaceState(null,'','#'+b.dataset.tab);sync()});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sync,{once:true});else sync();
})();

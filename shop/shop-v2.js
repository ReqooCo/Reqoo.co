(()=>{'use strict';
const API='https://api.reqoo.co';
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=v=>'RM'+(Number(v||0)/100).toFixed(2);
let products=[];
let cart=JSON.parse(localStorage.getItem('reqoo_cart_v2')||'[]');
function save(){localStorage.setItem('reqoo_cart_v2',JSON.stringify(cart));const n=$('#cartCount');if(n)n.textContent=cart.reduce((a,x)=>a+x.qty,0)}
function productImage(p){return Array.isArray(p.images)&&p.images[0]?p.images[0]:'/assets/reqoo-hero-products.webp'}
function render(){const grid=$('#productsGrid');if(!grid)return;grid.innerHTML=products.length?products.map(p=>`<article class="product"><img src="${esc(productImage(p))}" alt="${esc(p.name)}"><div class="product-body"><span class="eyebrow">${esc(p.category||'REQOO')}</span><h3>${esc(p.name)}</h3><p>${esc(p.description||'Custom made dengan kemasan premium.')}</p><div class="price-row"><span class="price">${money(p.base_price_minor)}</span><button class="add" data-add="${esc(p.id)}">Tambah +</button></div></div></article>`).join(''):'<div class="empty">Belum ada produk dalam katalog.</div>'}
function openCart(){const d=$('#drawer');if(!d)return;d.classList.add('open');const box=$('#cart');box.innerHTML=cart.length?cart.map((x,i)=>`<div class="row"><div><b>${esc(x.name)}</b><div>${money(x.price)} × ${x.qty}</div></div><button class="add" data-remove="${i}">Buang</button></div>`).join(''):'<div class="empty">Cart kosong.</div>';const total=cart.reduce((n,x)=>n+x.price*x.qty,0);if($('#total'))$('#total').textContent=money(total)}
async function load(){const grid=$('#productsGrid');try{const r=await fetch(API+'/api/products',{headers:{accept:'application/json'}});if(!r.ok)throw new Error('catalog '+r.status);const j=await r.json();products=Array.isArray(j.products)?j.products:[]}catch(e){products=[]}render()}
$('#productsGrid')?.addEventListener('click',e=>{const b=e.target.closest('[data-add]');if(!b)return;const p=products.find(x=>String(x.id)===b.dataset.add);if(!p)return;const price=Number(p.base_price_minor||0),old=cart.find(x=>String(x.id)===String(p.id));old?old.qty++:cart.push({id:p.id,name:p.name,price,qty:1});save();openCart()});
$('#cartBtn')?.addEventListener('click',openCart);
$('#close')?.addEventListener('click',()=>$('#drawer')?.classList.remove('open'));
$('#cart')?.addEventListener('click',e=>{const b=e.target.closest('[data-remove]');if(!b)return;cart.splice(Number(b.dataset.remove),1);save();openCart()});
$('#orderBtn')?.addEventListener('click',()=>{if(!cart.length)return alert('Cart masih kosong.');const name=$('#name')?.value.trim()||'',phone=$('#phone')?.value.trim()||'';if(!name||!phone)return alert('Sila isi nama dan telefon.');alert('Pesanan diterima. Checkout penuh akan disambungkan pada backend Shop V2.')});
save();load();
})();

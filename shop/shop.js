(()=>{
  'use strict';
  const API='https://api.reqoo.co';
  const CART='reqoo_cart_fresh_v1';
  const $=s=>document.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const rm=m=>'RM'+(Number(m||0)/100).toFixed(2);
  const arr=v=>{try{const x=typeof v==='string'?JSON.parse(v):v;return Array.isArray(x)?x:[]}catch{return[]}};
  let products=[];
  let cart=[];
  try{const raw=localStorage.getItem(CART);const parsed=raw?JSON.parse(raw):[];cart=Array.isArray(parsed)?parsed:[]}catch{cart=[]}

  function save(){localStorage.setItem(CART,JSON.stringify(cart));renderCount()}

  async function load(){
    try{
      const r=await fetch(API+'/api/products',{headers:{accept:'application/json'}});
      if(!r.ok)throw Error('HTTP '+r.status);
      const j=await r.json();
      products=Array.isArray(j.products)?j.products:[];
      render();
    }catch(e){
      const grid=$('#productsGrid');
      if(grid)grid.innerHTML='<div class="empty-shop">Shop belum dapat memuatkan katalog. Cuba refresh.</div>';
      console.error('REQOO catalog load:',e);
    }
  }

  // Variation option price is the selling price for that selected variation.
  // Base price is only used when the product has no variations.
  function selectedTotal(p,card){
    const variations=arr(p.variations);
    const addons=arr(p.addons);
    let total=Number(p.base_price_minor||0);
    if(variations.length){
      total=0;
      variations.forEach((v,i)=>{
        const s=card?.querySelector(`[data-v="${i}"]`);
        const options=arr(v.options);
        const o=options[Number(s?.value||0)];
        if(o)total+=Math.max(0,Number(o.price_minor||0));
      });
    }
    addons.forEach((a,i)=>{
      const c=card?.querySelector(`[data-a="${i}"]`);
      if(c?.checked)total+=Math.max(0,Number(a.price_minor||0));
    });
    return total;
  }

  function productCard(p){
    const vs=arr(p.variations),as=arr(p.addons),cs=arr(p.custom_fields);
    const base=Number(p.base_price_minor||0);
    return `<article class="product-card" data-card="${esc(p.id)}">
      <div class="product-media">${arr(p.images)[0]?`<img src="${esc(arr(p.images)[0])}" alt="${esc(p.name)}">`:'<span class="product-placeholder">REQOO</span>'}</div>
      <div class="product-info">
        <h3>${esc(p.name)}</h3>
        <p>${esc(p.description||'')}</p>
        ${vs.map((v,i)=>`<div class="field"><label>${esc(v.name)}${v.required?' *':''}</label><select class="shop-select" data-v="${i}">${arr(v.options).map((o,j)=>`<option value="${j}">${esc(o.name)} · ${rm(o.price_minor)}</option>`).join('')}</select></div>`).join('')}
        ${as.length?`<div class="field"><label>Add-on</label>${as.map((a,i)=>`<label style="display:block;margin:6px 0"><input type="checkbox" data-a="${i}"> ${esc(a.name)} +${rm(a.price_minor)}</label>`).join('')}</div>`:''}
        ${cs.map((c,i)=>`<div class="field"><label>${esc(c.name)}${c.required?' *':''}</label><input class="shop-input" data-c="${i}" type="${c.type==='date'?'date':c.type==='number'?'number':'text'}" placeholder="${esc(c.name)}"></div>`).join('')}
        <div class="product-bottom"><span class="product-price" data-total>${vs.length?rm(Number(arr(vs[0].options)[0]?.price_minor||0)):rm(base)}</span><button class="add-btn" data-add="${esc(p.id)}">Tambah</button></div>
      </div>
    </article>`;
  }

  function render(){
    const g=$('#productsGrid');
    if(!g)return;
    g.innerHTML=products.length?products.map(productCard).join(''):'<div class="empty-shop">Belum ada produk. Admin boleh tambah produk dari Control Center.</div>';
    g.querySelectorAll('[data-card]').forEach(card=>{
      const p=products.find(x=>String(x.id)===card.dataset.card);
      if(!p)return;
      const update=()=>{const total=selectedTotal(p,card);const out=card.querySelector('[data-total]');if(out)out.textContent=rm(total)};
      card.addEventListener('change',update);
      update();
    });
  }

  function renderCount(){const x=$('#cartCount');if(x)x.textContent=cart.reduce((n,x)=>n+Math.max(0,Number(x.qty||0)),0)}

  function renderCheckout(){
    const list=$('#cartItems');
    if(!list)return;
    list.innerHTML=cart.length?cart.map((x,i)=>`<div class="cart-row"><div><b>${esc(x.name)}</b><div style="color:#777;margin-top:4px">${rm(x.total_minor)} × ${x.qty}</div><small>${esc(x.config||'')}</small></div><div class="cart-actions"><button class="mini-btn" data-minus="${i}">−</button><button class="mini-btn" data-plus="${i}">+</button><button class="mini-btn" data-remove="${i}">Buang</button></div></div>`).join(''):'<div style="padding:30px 0;color:#777">Cart kosong.</div>';
    const total=$('#cartTotal');
    if(total)total.textContent=rm(cart.reduce((n,x)=>n+Number(x.total_minor||0)*Math.max(0,Number(x.qty||0)),0));
  }

  function cardConfig(card,p){
    const variations=arr(p.variations),addons=arr(p.addons),customs=arr(p.custom_fields);
    let total=Number(p.base_price_minor||0),parts=[];
    if(variations.length){
      total=0;
      variations.forEach((v,i)=>{
        const s=card.querySelector(`[data-v="${i}"]`);
        const o=arr(v.options)[Number(s?.value||0)];
        if(v.required&&!o)throw Error(`Pilih ${v.name}.`);
        if(o){total+=Math.max(0,Number(o.price_minor||0));parts.push(`${v.name}: ${o.name}`)}
      });
    }
    addons.forEach((a,i)=>{if(card.querySelector(`[data-a="${i}"]`)?.checked){total+=Math.max(0,Number(a.price_minor||0));parts.push(a.name)}});
    customs.forEach((c,i)=>{const v=card.querySelector(`[data-c="${i}"]`)?.value?.trim()||'';if(c.required&&!v)throw Error(`Isi ${c.name}.`);if(v)parts.push(`${c.name}: ${v}`)});
    return{total_minor:total,config:parts.join(' · ')};
  }

  const grid=$('#productsGrid');
  if(grid)grid.addEventListener('click',e=>{
    const b=e.target.closest('[data-add]');
    if(!b)return;
    const p=products.find(x=>String(x.id)===String(b.dataset.add));
    const card=b.closest('[data-card]');
    if(!p||!card)return;
    try{
      const c=cardConfig(card,p);
      const key=p.id+'|'+c.config;
      const item=cart.find(x=>x.key===key);
      if(item)item.qty++;
      else cart.push({key,id:p.id,name:p.name,total_minor:c.total_minor,config:c.config,qty:1});
      save();
      renderCheckout();
      const checkout=$('#checkout');
      if(checkout)checkout.hidden=false;
    }catch(err){alert(err.message)}
  });

  const cartBtn=$('#cartBtn');if(cartBtn)cartBtn.onclick=()=>{const checkout=$('#checkout');if(checkout)checkout.hidden=false;renderCheckout()};
  const closeCheckout=$('#closeCheckout');if(closeCheckout)closeCheckout.onclick=()=>{const checkout=$('#checkout');if(checkout)checkout.hidden=true};

  const cartItems=$('#cartItems');
  if(cartItems)cartItems.addEventListener('click',e=>{
    const minus=e.target.closest('[data-minus]'),plus=e.target.closest('[data-plus]'),remove=e.target.closest('[data-remove]');
    if(minus){const i=+minus.dataset.minus,x=cart[i];if(x){x.qty--;if(x.qty<=0)cart.splice(i,1)}}
    if(plus){const x=cart[+plus.dataset.plus];if(x)x.qty++}
    if(remove)cart.splice(+remove.dataset.remove,1);
    save();renderCheckout();
  });

  document.querySelectorAll('[data-payment]').forEach(b=>b.onclick=()=>{
    document.querySelectorAll('[data-payment]').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    const payment=$('#payment');if(payment)payment.value=b.dataset.payment;
    const qr=$('#qrBox');if(qr)qr.hidden=b.dataset.payment!=='qr';
  });

  const payBtn=$('#payBtn');
  if(payBtn)payBtn.onclick=async()=>{
    if(!cart.length)return show('Cart masih kosong.');
    const customer={name:$('#custName')?.value.trim()||'',email:$('#custEmail')?.value.trim()||'',phone:$('#custPhone')?.value.trim()||'',items:cart,total_minor:cart.reduce((n,x)=>n+x.total_minor*x.qty,0)};
    if(!customer.name||!customer.email||!customer.phone)return show('Lengkapkan nama, email dan telefon.');
    if($('#payment')?.value==='qr')return showQR();
    try{
      const r=await fetch(API+'/api/create-bill',{method:'POST',headers:{'content-type':'application/json','accept':'application/json'},body:JSON.stringify(customer)});
      const j=await r.json();
      if(!r.ok||!j.url)throw Error(j.error||'Billplz gagal');
      location.href=j.url;
    }catch(e){show('Billplz: '+e.message)}
  };

  async function showQR(){
    try{
      const r=await fetch(API+'/api/payment-settings',{headers:{accept:'application/json'}}),j=await r.json();
      if(r.ok&&j.qr_url){
        const box=$('#qrBox');
        if(box){box.innerHTML=`<img src="${esc(j.qr_url)}" alt="QR AB ART TRADING"><div style="margin-top:8px"><b>AB ART TRADING</b><br>Scan untuk bayaran.</div>`;box.hidden=false;return}
      }
    }catch(e){console.error('REQOO QR:',e)}
    show('QR AB ART TRADING belum ditetapkan dalam Admin → Settings.');
  }

  function show(t){const x=$('#payMsg');if(x){x.textContent=t;x.hidden=false}}
  renderCount();renderCheckout();load();
})();
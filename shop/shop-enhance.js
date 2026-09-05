(()=>{
  'use strict';
  const API='/api/shop';
  let products=[];
  const money=n=>'RM'+Number(n||0).toFixed(2);
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const imageUrl=u=>{u=String(u||'').trim();if(!u)return '';if(/^https?:\/\//i.test(u)||u.startsWith('/'))return u;return new URL(u.replace(/^\.\//,''),location.href).href};
  async function load(){try{const r=await fetch(API+'?action=listProducts&_='+Date.now(),{cache:'no-store'}),j=await r.json();if(j.ok&&Array.isArray(j.products))products=j.products}catch(e){console.warn('REQOO Shop enhance:',e)}}
  async function media(action,id){try{const r=await fetch('/api/shop-media?action='+action+'&productId='+encodeURIComponent(id)+'&_='+Date.now(),{cache:'no-store'}),j=await r.json();return j.ok?j:(action==='variantImages'?{variants:j.variants||[]}:{images:j.images||[]})}catch(e){return action==='variantImages'?{variants:[]}:{images:[]}}}
  function findProduct(modal){
    const title=[...modal.querySelectorAll('h1,h2,h3,h4')].map(x=>(x.textContent||'').trim()).find(Boolean)||'';
    return products.find(p=>String(p.name||'').trim().toLowerCase()===title.toLowerCase())||products.find(p=>title.toLowerCase().includes(String(p.name||'').toLowerCase()))||null;
  }
  function addUI(modal,p,vars,imgs){
    if(modal.querySelector('.reqoo-v2')) return;
    const box=modal.querySelector('.box')||modal;
    const oldChoice=box.querySelector('.choice');
    const oldSummary=box.querySelector('.summary');
    if(oldChoice) oldChoice.style.display='none';
    const ui=document.createElement('div');ui.className='reqoo-v2';
    ui.innerHTML='<label>Pilihan / variasi</label><select class="reqoo-v2-select"></select><div class="reqoo-v2-price">Harga seunit: <b>—</b></div><div class="reqoo-v2-gallery"></div>';
    const anchor=oldChoice||oldSummary||box.querySelector('label');
    if(anchor?.parentNode)anchor.parentNode.insertBefore(ui,anchor.nextSibling);else box.appendChild(ui);
    const sel=ui.querySelector('select'),price=ui.querySelector('b'),gallery=ui.querySelector('.reqoo-v2-gallery');
    const fixed=vars.filter(v=>Number(v.price||0)>0);
    const use=fixed.length?vars:(Number(p.basePrice||0)>0?[{name:'Standard',price:Number(p.basePrice)}]:vars);
    sel.innerHTML=use.map((v,i)=>'<option value="'+i+'">'+esc(v.name||'Standard')+' — '+(Number(v.price||0)>0?money(v.price):'Quotation')+'</option>').join('');
    function refresh(){const v=use[Number(sel.value)||0]||use[0]||{name:'Quotation',price:0};price.textContent=Number(v.price||0)>0?money(v.price):'Quotation';modal.dataset.reqooVariant=v.name||'Quotation';const main=box.querySelector('.two>div:first-child img');if(main&&v.image)main.src=imageUrl(v.image);if(gallery.children.length)gallery.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.src===(v.image||'')));}
    sel.onchange=refresh;
    if(imgs.length>1){gallery.innerHTML=imgs.map((u,i)=>'<button type="button" data-src="'+esc(imageUrl(u))+'" style="padding:0;border:1px solid #444;background:#080808;border-radius:8px;overflow:hidden;margin:6px 6px 0 0;width:64px;height:64px"><img src="'+esc(imageUrl(u))+'" style="width:64px;height:64px;object-fit:cover"></button>').join('');gallery.querySelectorAll('button').forEach(b=>b.onclick=()=>{const m=box.querySelector('.two>div:first-child img');if(m)m.src=b.dataset.src;gallery.querySelectorAll('button').forEach(x=>x.classList.remove('active'));b.classList.add('active')})}
    refresh();
  }
  async function enhance(modal){if(!modal?.classList.contains('open')||modal.dataset.reqooEnhancing)return;modal.dataset.reqooEnhancing='1';await load();const p=findProduct(modal);if(!p){delete modal.dataset.reqooEnhancing;return}const vr=await media('variantImages',p.id),im=await media('listImages',p.id);const vars=(vr.variants||[]).map(v=>({name:v.name,price:Number(v.price||0),image:v.image||''}));const imgs=(im.images||[]).map(x=>x.url||x.image||x).filter(Boolean);addUI(modal,p,vars,imgs);delete modal.dataset.reqooEnhancing}
  function watch(){
    const mo=new MutationObserver(()=>document.querySelectorAll('.modal.open').forEach(enhance));
    mo.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
    document.querySelectorAll('.modal.open').forEach(enhance);
  }
  function start(){load();watch();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();

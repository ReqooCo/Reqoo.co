(()=>{
  'use strict';
  const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
  let cfg={},products=[],docs=[],editId=null,images=[],variations=[],addons=[],customs=[];
  const money=m=>'RM'+(Number(m||0)/100).toFixed(2);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const api=()=>((cfg.apiUrl||'https://api.reqoo.co').replace(/\/$/,''));
  function saveCfg(){localStorage.setItem('reqoo_admin_cfg',JSON.stringify(cfg))}

  async function req(path,opt={}){
    const h={...(opt.headers||{})};
    if(cfg.adminKey)h['X-Admin-Key']=cfg.adminKey.trim();
    if(!(opt.body instanceof FormData))h['content-type']='application/json';
    const r=await fetch(api()+path,{...opt,headers:h});
    let j={};try{j=await r.json()}catch{}
    if(!r.ok)throw Error(j.error||`HTTP ${r.status}`);
    return j;
  }

  async function adminLogin(key){
    key=(key||'').trim();
    const error=$('#gateError');
    if(!key){if(error){error.textContent='Masukkan Admin Key.';error.classList.remove('gate-hidden')}return false}
    try{
      const r=await fetch('https://api.reqoo.co/api/admin/products',{headers:{'X-Admin-Key':key}});
      let j={};try{j=await r.json()}catch{}
      if(!r.ok)throw Error(j.error||`HTTP ${r.status}`);
      cfg={...cfg,apiUrl:cfg.apiUrl||'https://api.reqoo.co',adminKey:key};
      sessionStorage.setItem('reqoo_admin_key',key);
      saveCfg();
      $('#adminGate')?.classList.add('gate-hidden');
      $('#adminApp')?.classList.remove('gate-hidden');
      return true;
    }catch(e){
      if(error){error.textContent=e.message==='Unauthorized'?'Admin Key salah.':e.message;error.classList.remove('gate-hidden')}
      return false;
    }
  }

  async function start(){
    try{cfg=JSON.parse(localStorage.getItem('reqoo_admin_cfg')||'{}');if(!cfg||typeof cfg!=='object')cfg={}}catch{cfg={}}
    const saved=sessionStorage.getItem('reqoo_admin_key');
    if(saved){cfg.adminKey=saved;if(await adminLogin(saved)){bind();return}}
    $('#adminApp')?.classList.add('gate-hidden');
    $('#adminGate')?.classList.remove('gate-hidden');
    const input=$('#gateAdminKey'),button=$('#gateLogin');
    button?.addEventListener('click',async()=>{button.disabled=true;await adminLogin(input?.value);button.disabled=false});
    input?.addEventListener('keydown',e=>{if(e.key==='Enter')button?.click()});
    input?.focus();
  }

  function msg(t){let x=$('#builderStatus');if(!x){x=document.createElement('div');x.id='builderStatus';x.className='notice';$('#productForm')?.prepend(x)}if(x)x.textContent=t}
  function arr(v){try{const x=typeof v==='string'?JSON.parse(v):v;return Array.isArray(x)?x:[]}catch{return[]}}
  function reset(){editId=null;images=[];variations=[];addons=[];customs=[];['pName','pCategory','pMaterial','pSku','pDesc','pPrice'].forEach(id=>{if($('#'+id))$('#'+id).value=''});if($('#pImages'))$('#pImages').value='';renderBuilder()}
  function renderBuilder(){
    const p=$('#imagePreview');if(p)p.innerHTML=images.length?images.map((u,i)=>`<div class="image-item"><img src="${esc(u)}"><button type="button" data-rimg="${i}">×</button>${i?'':'<small>Cover</small>'}</div>`).join(''):'<div class="muted">Belum ada gambar.</div>';
    const v=$('#variationList');if(v)v.innerHTML=variations.length?variations.map((x,i)=>`<div class="builder-row"><input class="input" data-vn="${i}" value="${esc(x.name)}" placeholder="Saiz"><label class="check"><input type="checkbox" data-vr="${i}" ${x.required?'checked':''}> Wajib</label><button type="button" class="button small danger" data-rv="${i}">Padam</button><div class="option-list">${arr(x.options).map((o,j)=>`<div class="option-row"><input class="input" data-on="${i}:${j}" value="${esc(o.name)}" placeholder="A5"><input class="input" type="number" min="0" step="0.01" data-op="${i}:${j}" value="${(Number(o.price_minor||0)/100).toFixed(2)}" placeholder="30"><button type="button" class="button small danger" data-ro="${i}:${j}">×</button></div>`).join('')}<button type="button" class="button small" data-ao="${i}">+ Pilihan</button></div></div>`).join(''):'<div class="muted">Tiada variation.</div>';
    const a=$('#addonList');if(a)a.innerHTML=addons.length?addons.map((x,i)=>`<div class="builder-row option-row"><input class="input" data-an="${i}" value="${esc(x.name)}" placeholder="Jam"><input class="input" type="number" min="0" step="0.01" data-ap="${i}" value="${(Number(x.price_minor||0)/100).toFixed(2)}" placeholder="15"><label class="check"><input type="checkbox" data-ar="${i}" ${x.required?'checked':''}> Wajib</label><button type="button" class="button small danger" data-ra="${i}">×</button></div>`).join(''):'<div class="muted">Tiada add-on.</div>';
    const c=$('#customList');if(c)c.innerHTML=customs.length?customs.map((x,i)=>`<div class="builder-row option-row"><input class="input" data-cn="${i}" value="${esc(x.name)}" placeholder="Nama"><select class="input" data-ct="${i}"><option value="text" ${x.type==='text'?'selected':''}>Text</option><option value="number" ${x.type==='number'?'selected':''}>Nombor</option><option value="date" ${x.type==='date'?'selected':''}>Tarikh</option></select><label class="check"><input type="checkbox" data-cr="${i}" ${x.required?'checked':''}> Wajib</label><button type="button" class="button small danger" data-rc="${i}">×</button></div>`).join(''):'<div class="muted">Tiada ruang custom.</div>';
  }
  function sync(){$$('[data-vn]').forEach(x=>{if(variations[x.dataset.vn])variations[x.dataset.vn].name=x.value.trim()});$$('[data-vr]').forEach(x=>{if(variations[x.dataset.vr])variations[x.dataset.vr].required=x.checked});$$('[data-on]').forEach(x=>{const[i,j]=x.dataset.on.split(':');if(variations[i]?.options[j])variations[i].options[j].name=x.value.trim()});$$('[data-op]').forEach(x=>{const[i,j]=x.dataset.op.split(':');if(variations[i]?.options[j])variations[i].options[j].price_minor=Math.max(0,Math.round(Number(x.value||0)*100))});$$('[data-an]').forEach(x=>{if(addons[x.dataset.an])addons[x.dataset.an].name=x.value.trim()});$$('[data-ap]').forEach(x=>{if(addons[x.dataset.ap])addons[x.dataset.ap].price_minor=Math.max(0,Math.round(Number(x.value||0)*100))});$$('[data-ar]').forEach(x=>{if(addons[x.dataset.ar])addons[x.dataset.ar].required=x.checked});$$('[data-cn]').forEach(x=>{if(customs[x.dataset.cn])customs[x.dataset.cn].name=x.value.trim()});$$('[data-ct]').forEach(x=>{if(customs[x.dataset.ct])customs[x.dataset.ct].type=x.value});$$('[data-cr]').forEach(x=>{if(customs[x.dataset.cr])customs[x.dataset.cr].required=x.checked})}
  function renderProducts(){const l=$('#productList');if(!l)return;l.innerHTML=products.length?`<table class="table"><thead><tr><th>Produk</th><th>Harga</th><th></th></tr></thead><tbody>${products.map(p=>`<tr><td>${arr(p.images)[0]?`<img src="${esc(arr(p.images)[0])}" style="width:46px;height:46px;object-fit:cover;border-radius:8px;vertical-align:middle;margin-right:8px">`:''}<b>${esc(p.name)}</b><div class="muted">${esc(p.sku||'')} · ${esc(p.material||'')}</div></td><td>${arr(p.variations).length?money(arr(p.variations)[0]?.options?.[0]?.price_minor||0)+' · '+arr(p.variations).length+' variation':money(p.base_price_minor)}</td><td><button type="button" class="button small" data-edit="${esc(p.id)}">Edit</button> <button type="button" class="button small danger" data-del="${esc(p.id)}">Padam</button></td></tr>`).join('')}</tbody></table>`:'<div class="empty">Belum ada produk.</div>';if($('#statProducts'))$('#statProducts').textContent=products.length}
  function renderDocs(){['quotation','invoice','receipt'].forEach(t=>{const l=$('#'+t+'List');if(!l)return;const rows=docs.filter(d=>d.type===t);l.innerHTML=rows.length?rows.map(d=>`<div class="doc-row"><div><b>${esc(d.number)}</b><div class="muted">${esc(d.customer)} · ${money(d.total_minor)}</div></div><span>${esc(d.status)}</span><button type="button" class="button small" data-print="${esc(d.id)}">Cetak</button></div>`).join(''):'<div class="empty">Belum ada dokumen.</div>'})}
  function tab(t){$$('.panel').forEach(x=>x.classList.add('hidden'));$('#'+t)?.classList.remove('hidden');$$('.side-btn').forEach(x=>x.classList.toggle('active',x.dataset.tab===t))}
  async function upload(files){for(const f of [...files].slice(0,8-images.length)){if(!f.type.startsWith('image/')){msg('Fail bukan gambar: '+f.name);continue}if(f.size>10*1024*1024){msg('Maksimum 10MB: '+f.name);continue}try{const fd=new FormData();fd.append('file',f);const j=await req('/api/admin/media',{method:'POST',body:fd});if(!j?.url)throw Error('API upload tidak pulangkan URL.');images.push(j.url);renderBuilder()}catch(e){msg('Upload gagal: '+e.message)}}const status=$('#uploadStatus');if(status)status.textContent=images.length+' gambar dimuat naik.'}
  async function saveProduct(){sync();const p={id:editId||crypto.randomUUID(),name:($('#pName')?.value||'').trim(),category:($('#pCategory')?.value||'').trim(),material:($('#pMaterial')?.value||'').trim(),sku:($('#pSku')?.value||'').trim(),description:($('#pDesc')?.value||'').trim(),base_price_minor:Math.max(0,Math.round(Number($('#pPrice')?.value||0)*100)),images,variations,addons,custom_fields:customs,status:'active'};if(!p.name)return msg('Isi nama produk.');if(!variations.length&&p.base_price_minor<=0)return msg('Masukkan harga produk.');if(variations.some(v=>!v.name||!Array.isArray(v.options)||!v.options.length||v.options.some(o=>!o.name||Number(o.price_minor)<0)))return msg('Semak variation dan harga.');if(customs.some(c=>!c.name))return msg('Semak nama custom field.');if(addons.some(a=>!a.name||Number(a.price_minor)<0))return msg('Semak add-on dan harga.');try{await req('/api/admin/products',{method:'POST',body:JSON.stringify(p)});msg('Produk berjaya disimpan.');await loadProducts();setTimeout(()=>{$('#productForm')?.classList.add('hidden');reset()},300)}catch(e){msg('Simpan gagal: '+e.message)}}
  async function loadProducts(){try{const j=await req('/api/admin/products');products=Array.isArray(j.products)?j.products:[];renderProducts()}catch(e){msg('API produk gagal: '+e.message)}}
  async function loadDocs(){try{const j=await req('/api/admin/documents');docs=Array.isArray(j.documents)?j.documents:[];renderDocs()}catch(e){console.error('REQOO documents:',e)}}
  async function newDoc(type){const customer=prompt('Nama pelanggan?');if(!customer)return;const total=Number(prompt('Jumlah (RM)?','0')||0);if(!Number.isFinite(total)||total<0)return alert('Jumlah tidak sah.');const d={type,number:type.toUpperCase().slice(0,3)+'-'+Date.now().toString().slice(-6),customer,email:'',items:[],total_minor:Math.round(total*100),status:'draft'};try{await req('/api/admin/documents',{method:'POST',body:JSON.stringify(d)});await loadDocs()}catch(e){alert('Gagal: '+e.message)}}
  function printDoc(id){const d=docs.find(x=>x.id===id);if(!d)return;const w=window.open('','_blank');if(!w)return alert('Popup disekat.');w.document.write(`<html><body style="font-family:Arial;padding:40px"><h1>AB ART TRADING</h1><h2>${esc(d.type.toUpperCase())}</h2><p>No: <b>${esc(d.number)}</b></p><p>Pelanggan: ${esc(d.customer)}</p><h2>${money(d.total_minor)}</h2><button onclick="print()">Print</button></body></html>`);w.document.close()}
  function bind(){
    if($('#apiUrl'))$('#apiUrl').value=cfg.apiUrl||'https://api.reqoo.co';
    if($('#adminKey'))$('#adminKey').value=cfg.adminKey||'';
    if($('#qrUrl'))$('#qrUrl').value=cfg.qrUrl||'';
    renderBuilder();
    document.addEventListener('click',async e=>{const b=e.target.closest('button,a');if(!b)return;if(b.classList.contains('side-btn')){e.preventDefault();tab(b.dataset.tab)}else if(b.id==='newProduct'){reset();$('#productForm')?.classList.remove('hidden');tab('products')}else if(b.id==='cancelProduct'){reset();$('#productForm')?.classList.add('hidden')}else if(b.id==='addVariation'){sync();variations.push({name:'Saiz',required:true,options:[{name:'A5',price_minor:0}]});renderBuilder()}else if(b.id==='addAddon'){sync();addons.push({name:'Add-on',price_minor:0,required:false});renderBuilder()}else if(b.id==='addCustom'){sync();customs.push({name:'Nama',type:'text',required:true});renderBuilder()}else if(b.id==='saveProduct'){await saveProduct()}else if(b.dataset.rimg!==undefined){images.splice(+b.dataset.rimg,1);renderBuilder()}else if(b.dataset.rv!==undefined){sync();variations.splice(+b.dataset.rv,1);renderBuilder()}else if(b.dataset.ao!==undefined){sync();if(variations[+b.dataset.ao])variations[+b.dataset.ao].options.push({name:'Pilihan',price_minor:0});renderBuilder()}else if(b.dataset.ro!==undefined){sync();const[i,j]=b.dataset.ro.split(':');if(variations[i]?.options[j])variations[i].options.splice(+j,1);renderBuilder()}else if(b.dataset.ra!==undefined){sync();addons.splice(+b.dataset.ra,1);renderBuilder()}else if(b.dataset.rc!==undefined){sync();customs.splice(+b.dataset.rc,1);renderBuilder()}else if(b.dataset.edit!==undefined){const p=products.find(x=>String(x.id)===String(b.dataset.edit));if(!p)return;editId=p.id;images=arr(p.images);variations=arr(p.variations);addons=arr(p.addons);customs=arr(p.custom_fields);[['pName',p.name],['pCategory',p.category],['pMaterial',p.material],['pSku',p.sku],['pDesc',p.description],['pPrice',(Number(p.base_price_minor||0)/100).toFixed(2)]].forEach(([id,v])=>{if($('#'+id))$('#'+id).value=v||''});renderBuilder();$('#productForm')?.classList.remove('hidden');tab('products')}else if(b.dataset.del!==undefined){if(!confirm('Padam produk ini?'))return;try{await req('/api/admin/products/'+encodeURIComponent(b.dataset.del),{method:'DELETE'});await loadProducts()}catch(e){alert(e.message)}}else if(b.dataset.doc){await newDoc(b.dataset.doc)}else if(b.dataset.print){printDoc(b.dataset.print)}else if(b.id==='saveSettings'){cfg={apiUrl:($('#apiUrl')?.value||'').trim()||'https://api.reqoo.co',adminKey:($('#adminKey')?.value||'').trim(),qrUrl:($('#qrUrl')?.value||'').trim()};saveCfg();try{await req('/api/admin/settings',{method:'POST',body:JSON.stringify({qr_url:cfg.qrUrl})});alert('Tetapan disimpan.')}catch(e){alert('Gagal simpan: '+e.message)}}},false);
    $('#pImages')?.addEventListener('change',e=>upload(e.target.files));
    loadProducts();loadDocs();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
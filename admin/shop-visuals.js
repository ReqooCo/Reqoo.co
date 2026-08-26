(()=>{
'use strict';
const API='https://api.reqoo.co';
const ID='__SHOP_VISUALS__';
const N=11;
const $=s=>document.querySelector(s);
const arr=v=>{try{const x=typeof v==='string'?JSON.parse(v):v;return Array.isArray(x)?x:[]}catch{return[]}};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

let key=sessionStorage.getItem('reqoo_admin_key')||localStorage.getItem('reqoo_admin_key')||'';
let images=Array(N).fill('');

const sections=[
 ['heroDesktop','Hero Desktop','Desktop Hero'],
 ['heroMobile','Hero Mobile','Mobile Hero'],
 ['catPlaque','Kategori · Plaque Kayu','Gambar kategori'],
 ['catClock','Kategori · Wood Clock','Gambar kategori'],
 ['catBrooch','Kategori · Acrylic Brooch','Gambar kategori'],
 ['catLaser','Kategori · Fiber Laser','Gambar kategori'],
 ['cat3d','Kategori · 3D Print','Gambar kategori'],
 ['featuredPersonal','Featured · Personal Collection','Gambar featured'],
 ['featuredSpecial','Featured · New & Special','Gambar featured'],
 ['promoBanner','Promo Banner','Banner lebar'],
 ['aboutBrand','About / Brand','Gambar brand']
];

async function req(path,opt={}){
 const headers={...(opt.headers||{})};
 if(key) headers['X-Admin-Key']=key;
 const r=await fetch(API+path,{...opt,headers});
 let j={};
 try{j=await r.json()}catch{}
 if(!r.ok) throw Error(j.error||('HTTP '+r.status));
 return j;
}

function card(id,title,sub){
 return `<article class="card" style="margin-top:16px">
  <div class="topbar"><div><span class="eyebrow">${esc(sub)}</span><h2>${esc(title)}</h2></div></div>
  <div id="prev-${id}" style="margin:12px 0;background:#eee;height:220px;border-radius:12px;overflow:hidden;display:grid;place-items:center"><span class="muted">Belum ada gambar</span></div>
  <input id="file-${id}" type="file" accept="image/jpeg,image/png,image/webp,image/gif">
  <div class="muted" id="url-${id}" style="margin-top:8px;word-break:break-all"></div>
 </article>`;
}

function show(id,url){
 const p=$('#prev-'+id);
 if(p) p.innerHTML=url?`<img src="${esc(url)}" style="width:100%;height:100%;object-fit:cover">`:'<span class="muted">Belum ada gambar</span>';
 const u=$('#url-'+id);
 if(u) u.textContent=url||'';
}

async function load(){
 const j=await req('/api/admin/products');
 const p=(j.products||[]).find(x=>String(x.id)===ID);
 images=Array(N).fill('');
 if(p) arr(p.images).slice(0,N).forEach((u,i)=>images[i]=u||'');
 sections.forEach(([id],i)=>show(id,images[i]));
 $('#status').textContent=p?'Visual disimpan di server.':'Belum ada visual disimpan. Upload gambar untuk mula.';
}

async function save(){
 const payload={
  id:ID,name:'__SHOP_VISUALS__',category:'',material:'system',sku:'SHOP-VISUALS',
  description:'Server-side Shop Visual settings',base_price_minor:1,images,
  variations:[],addons:[],custom_fields:[],status:'active'
 };
 await req('/api/admin/products',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
 $('#status').textContent='Visual berjaya disimpan di server.';
}

async function upload(id,index){
 const f=$('#file-'+id)?.files?.[0];
 if(!f) return;
 if(f.size>10*1024*1024){alert('Gambar maksimum 10MB.');return;}
 const fd=new FormData();
 fd.append('file',f);
 $('#url-'+id).textContent='Uploading...';
 try{
  const j=await req('/api/admin/media',{method:'POST',body:fd});
  if(!j.url) throw Error('URL gambar tiada');
  images[index]=j.url;
  await save();
  show(id,j.url);
 }catch(e){
  $('#url-'+id).textContent='Upload gagal: '+e.message;
 }
}

function render(){
 const root=$('#visuals');
 if(!root) return;
 root.innerHTML=sections.map(x=>card(...x)).join('');
 sections.forEach(([id],i)=>{
  const input=$('#file-'+id);
  if(input) input.addEventListener('change',()=>upload(id,i));
 });
}

render();
if(!key){
 $('#status').textContent='Masuk Admin dahulu. Buka page ini dari Admin supaya Admin Key tersedia.';
}else{
 load().catch(e=>$('#status').textContent='Gagal memuat visual: '+e.message);
}
})();

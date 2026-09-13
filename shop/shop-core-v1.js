(()=>{
'use strict';
const API='/api/shop',CART_KEY='reqoo_shop_cart_v4',QR='/shop/assets/maybank-qr.jpeg',WA='60103982803';
const money=n=>'RM'+Number(n||0).toFixed(2);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const img=value=>{try{const u=new URL(String(value||''),location.href);return value&&['http:','https:','file:'].includes(u.protocol)?u.href:''}catch{return ''}};
const el=id=>document.getElementById(id);
const quantity=value=>Number.isFinite(Number(value))?Math.max(1,Math.min(999,Math.floor(Number(value)))):1;
const stock=v=>v?.stock==null||v.stock===''?null:Number(v.stock);
const available=v=>stock(v)===null||stock(v)>0;
let products=[],cart=[],selectedCategory='Semua',checkoutDraft={},receiptDraft=null,activeDialog=null,returnFocus=null,busy=false,checkoutVersion=0,receiptTotal=null;
const placeholder='/shop/assets/product-1.jpg';
async function api(url,init={}){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
 try{const r=await fetch(url,{...init,signal:controller.signal});let j;try{j=await r.json()}catch{throw Error('Respons tidak lengkap. Sila cuba lagi.')}if(!r.ok||j.ok===false)throw Error(j.error||'Permintaan gagal. Sila cuba lagi.');return j}
 catch(e){if(e.name==='AbortError')throw Error('Sambungan mengambil masa terlalu lama. Sila cuba lagi.');throw e}finally{clearTimeout(timer)}
}
const post=data=>api(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
function normalize(p){return {...p,id:String(p.id),category:String(p.category||p.productType||'Produk'),desc:String(p.desc||p.description||''),image:img(p.image),variants:(Array.isArray(p.variants)?p.variants:[]).map(v=>Array.isArray(v)?{id:'',name:String(v[0]||''),price:Number(v[1]||0),image:img(v[2])}:{...v,id:String(v.id||''),name:String(v.name||''),price:v.price!=null?Number(v.price):Number(v.priceMinor||0)/100,image:img(v.image||v.imageUrl)}).filter(v=>v.name.trim()&&v.active!==false)}}
async function load(){el('grid').setAttribute('aria-busy','true');el('grid').innerHTML='<div class="emptyState" role="status">Memuatkan koleksi…</div>';try{const j=await api(API+'?action=listProducts',{cache:'no-store'});products=(j.products||[]).map(normalize).filter(p=>p.active!==false);render()}catch(e){el('grid').innerHTML=`<div class="shopError" role="alert"><b>Koleksi belum dapat dimuatkan.</b><span>${esc(e.message)}</span><button type="button" id="retryProducts">Cuba lagi</button></div>`;el('retryProducts').onclick=load}finally{el('grid').setAttribute('aria-busy','false')}}
function priceText(p){const v=p.variants.filter(x=>x.price>0);return v.length?`Dari ${money(Math.min(...v.map(x=>x.price)))}`:'Minta sebut harga'}
function render(){
 const q=(el('q')?.value||'').trim().toLowerCase(),cats=['Semua',...new Set(products.map(p=>p.category))];
 el('cats').innerHTML=cats.map(x=>`<button type="button" class="cat ${x===selectedCategory?'active':''}" aria-pressed="${x===selectedCategory}" data-cat="${esc(x)}">${esc(x)}</button>`).join('');
 el('cats').querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>{selectedCategory=b.dataset.cat;render()});
 const list=products.filter(p=>(selectedCategory==='Semua'||p.category===selectedCategory)&&(!q||`${p.name} ${p.desc} ${p.category} ${p.variants.map(v=>v.name).join(' ')}`.toLowerCase().includes(q)));
 if(el('productCount'))el('productCount').textContent=`${list.length} produk`;
 el('grid').innerHTML=list.map(p=>`<article class="productCard"><button type="button" class="productImage" data-product="${esc(p.id)}" aria-label="Lihat ${esc(p.name)}"><img src="${esc(p.image||placeholder)}" alt="${esc(p.name)}" loading="lazy"></button><div class="productBody"><span class="productTag">${esc(p.category)}</span><h3>${esc(p.name)}</h3><p>${esc(p.desc)}</p><div class="productBottom"><b>${priceText(p)}</b><button type="button" class="shopBtn" data-product="${esc(p.id)}">Lihat pilihan</button></div></div></article>`).join('')||'<div class="emptyState"><b>Tiada produk yang sepadan.</b><p>Cuba carian lain atau lihat semua koleksi.</p><button type="button" id="clearSearch" class="shopBtn">Lihat semua</button></div>';
 el('grid').querySelectorAll('[data-product]').forEach(b=>b.onclick=()=>openProduct(b.dataset.product));
 el('clearSearch')?.addEventListener('click',()=>{el('q').value='';selectedCategory='Semua';render()});badge();
}
function showDialog(root,label){
 if(activeDialog&&activeDialog!==root)activeDialog.classList.remove('open');
 if(!activeDialog)returnFocus=document.activeElement;
 activeDialog=root;root.classList.add('open');root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label',label);root.tabIndex=-1;
 document.body.classList.add('dialog-open');document.querySelectorAll('header,main,footer,.hero,.skipLink').forEach(x=>x.inert=true);root.scrollTop=0;
 requestAnimationFrame(()=>{if(activeDialog===root)(root.querySelector('.modalClose')||root).focus()});
}
function closeDialog(){if(busy)return;if(activeDialog)activeDialog.classList.remove('open');activeDialog=null;document.body.classList.remove('dialog-open');document.querySelectorAll('header,main,footer,.hero,.skipLink').forEach(x=>x.inert=false);if(returnFocus?.isConnected)returnFocus.focus()}
function message(root,text){const box=root.querySelector('[data-status]');if(box){box.textContent=text;box.hidden=false}}
function readFile(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result||''));r.onerror=()=>reject(Error('Fail tidak dapat dibaca. Sila pilih semula.'));r.readAsDataURL(file)})}
function fileError(file,receipt=false){if(!file)return '';const types=receipt?['image/png','image/jpeg','image/webp','application/pdf']:['image/png','image/jpeg','image/webp'];if(!types.includes(file.type))return 'Format fail tidak disokong.';if(file.size>(receipt?5:2)*1024*1024)return `Fail terlalu besar — maksimum ${receipt?5:2}MB.`;return ''}
function usedStock(productId,variantId,variant,exclude=-1){return cart.reduce((n,x,i)=>n+(i!==exclude&&x.productId===productId&&(variantId?x.variantId===variantId:x.variant===variant)?x.q:0),0)}
function openProduct(id){
 const p=products.find(x=>x.id===String(id)),modal=el('modal');if(!p)return;
 const vars=p.variants;let selected=Math.max(0,vars.findIndex(available));
 modal.innerHTML=`<div class="shopModal"><button class="modalClose" type="button" aria-label="Tutup produk">×</button><div class="productDetail"><div><div class="mainProductImage"><img id="detailImage" src="${esc(p.image||placeholder)}" alt="${esc(p.name)}"></div><div class="thumbs" id="thumbs"></div></div><div><span class="productTag">${esc(p.category)}</span><h2>${esc(p.name)}</h2><p class="detailDesc">${esc(p.desc)}</p>${vars.length?`<label for="variantSelect">Pilihan produk</label><select id="variantSelect">${vars.map((v,i)=>`<option value="${i}" ${i===selected?'selected':''} ${available(v)?'':'disabled'}>${esc(v.name)} · ${v.price>0?money(v.price):'Sebutharga'}${available(v)?'':' · Stok habis'}</option>`).join('')}</select>`:''}<p id="stockHint" class="fileHint" role="status"></p><div class="twoFields"><div><label for="detailQty">Kuantiti</label><input id="detailQty" type="number" inputmode="numeric" min="1" max="999" step="1" value="1"></div><div><label>Harga seunit</label><div class="priceBox" id="detailPrice"></div></div></div><label for="detailName">Nama / teks pada produk <span>(pilihan)</span></label><input id="detailName" placeholder="Contoh: Anugerah Kecemerlangan" maxlength="500"><label for="detailArtwork">Logo / artwork <span>(pilihan)</span></label><input id="detailArtwork" type="file" accept="image/png,image/jpeg,image/webp" aria-describedby="artworkHint"><div class="fileHint" id="artworkHint">PNG, JPG atau WEBP · maksimum 2MB</div><label for="detailNote">Nota tempahan <span>(pilihan)</span></label><textarea id="detailNote" rows="3" maxlength="2000" placeholder="Warna, tarikh majlis atau permintaan khas"></textarea><div class="lineTotal"><span>Jumlah produk</span><b id="detailTotal"></b></div><p class="checkoutStatus error" role="alert" data-status hidden></p><button type="button" class="shopBtn wide" id="addToCart">Tambah ke cart</button><a id="quoteLink" class="shopBtn wide secondary" target="_blank" rel="noopener">Minta sebut harga di WhatsApp</a></div></div></div>`;
 const qty=el('detailQty'),add=el('addToCart');
 const price=()=>{
  const v=vars[selected],remaining=stock(v)===null?999:Math.max(0,stock(v)-usedStock(p.id,v?.id,v?.name));
  qty.max=String(Math.max(1,Math.min(999,remaining)));qty.value=String(Math.min(quantity(qty.value),Number(qty.max)));
  el('detailPrice').textContent=v?.price>0?money(v.price):'Sebutharga';el('detailTotal').textContent=v?.price>0?money(v.price*Number(qty.value)):'Sebutharga';
  add.disabled=!v||v.price<=0||remaining<=0;add.textContent=remaining<=0?'Stok tidak mencukupi':'Tambah ke cart';add.hidden=!v||v.price<=0;
  el('quoteLink').hidden=!!v&&v.price>0;el('quoteLink').href=`https://wa.me/${WA}?text=${encodeURIComponent('Salam REQOO, saya ingin sebut harga untuk '+p.name+(v?' ('+v.name+')':'')+'.')}`;
  el('stockHint').textContent=!v||v.price<=0?'Hubungi kami untuk harga dan pilihan tempahan.':stock(v)===null?'Harga akhir disemak sebelum bayaran.':`${Math.max(0,remaining)} unit tersedia untuk ditambah.`;
 };
 const selectImage=src=>{el('detailImage').src=src||p.image||placeholder;modal.querySelectorAll('.thumb').forEach(b=>b.classList.toggle('active',b.dataset.src===el('detailImage').src))};
 el('variantSelect')?.addEventListener('change',e=>{selected=Number(e.target.value);price();selectImage(vars[selected]?.image)});qty.onchange=price;
 qty.oninput=()=>{if(qty.value!=='')price()};
 const images=[...new Set([p.image,...vars.map(v=>v.image)].filter(Boolean))];
 el('thumbs').innerHTML=images.map((u,i)=>`<button class="thumb" type="button" data-src="${esc(u)}" aria-label="Gambar ${i+1}"><img src="${esc(u)}" alt=""></button>`).join('');
 modal.querySelectorAll('.thumb').forEach(b=>b.onclick=()=>selectImage(b.dataset.src));
 el('detailArtwork').onchange=e=>{const f=e.target.files?.[0],err=fileError(f);el('artworkHint').textContent=err||f?.name||'PNG, JPG atau WEBP · maksimum 2MB';if(err)e.target.value=''};
 add.onclick=async()=>{
  if(add.disabled||busy)return;price();if(add.disabled)return;const v=vars[selected],f=el('detailArtwork').files?.[0],err=fileError(f);if(err){message(modal,err);return}
  const item={productId:p.id,productName:p.name,variantId:v.id,variant:v.name,unitPrice:v.price,q:Number(qty.value),name:el('detailName').value.trim(),note:el('detailNote').value.trim(),image:v.image||p.image};
  busy=true;add.disabled=true;add.textContent='Menambah…';
  try{item.artwork=f?await readFile(f):'';cart.push(item);persist();badge();busy=false;openCart()}catch(e){message(modal,e.message)}finally{busy=false;price()}
 };
 modal.querySelector('.modalClose').onclick=closeDialog;price();selectImage(vars[selected]?.image);showDialog(modal,p.name);
}
function persist(){try{localStorage.setItem(CART_KEY,JSON.stringify(cart))}catch{notify('Cart tersedia untuk sesi ini. Storan peranti penuh; elakkan tutup halaman sebelum selesai.')}}
function restore(){try{const x=JSON.parse(localStorage.getItem(CART_KEY)||'[]');cart=(Array.isArray(x)?x:[]).filter(v=>v&&typeof v.productId==='string'&&Number.isFinite(Number(v.unitPrice))&&Number(v.unitPrice)>0).map(v=>({...v,q:quantity(v.q),unitPrice:Number(v.unitPrice)}))}catch{cart=[]}}
function notify(text){const n=el('shopNotice');if(n){n.hidden=false;n.textContent=text}}
function badge(){const n=cart.reduce((s,x)=>s+x.q,0);document.querySelectorAll('.cartCount').forEach(x=>x.textContent=n);el('cartButton')?.setAttribute('aria-label',`Buka cart, ${n} unit`)}
function openCart(){
 const d=el('drawer'),total=cart.reduce((s,x)=>s+x.unitPrice*x.q,0);
 d.innerHTML=`<div class="drawerHead"><div><span class="productTag">TEMPAHAN ANDA</span><h2>Cart</h2></div><button type="button" class="modalClose" id="cartClose" aria-label="Tutup cart">×</button></div>`+(cart.length?cart.map((x,i)=>`<div class="cartItem"><img src="${esc(x.image||placeholder)}" alt="${esc(x.productName)}"><div><b>${esc(x.productName)}</b><small>${esc(x.variant)} · ${money(x.unitPrice)} / unit</small>${x.name?`<small>Teks: ${esc(x.name)}</small>`:''}${x.artwork?'<small class="hasFile">Artwork dilampirkan</small>':''}<div class="cartQuantity"><button type="button" data-qty="${i}" data-delta="-1" aria-label="Kurangkan ${esc(x.productName)}" ${x.q<=1?'disabled':''}>−</button><span>${x.q}</span><button type="button" data-qty="${i}" data-delta="1" aria-label="Tambah ${esc(x.productName)}" ${x.q>=999?'disabled':''}>+</button><button type="button" class="removeCart" data-remove="${i}">Buang</button></div></div><strong>${money(x.unitPrice*x.q)}</strong></div>`).join('')+`<p class="checkoutStatus error" data-status role="alert" hidden></p><div class="cartFooter"><div class="cartTotal"><span>Jumlah produk</span><b>${money(total)}</b></div><p class="fileHint">Harga dan stok disahkan semula sebelum bayaran.</p><button type="button" class="shopBtn wide" id="checkoutBtn">Teruskan ke checkout →</button><button type="button" class="textButton" id="continueShopping">Tambah produk lain</button></div>`:'<div class="emptyCart"><h3>Cart anda masih kosong.</h3><p>Pilih hadiah untuk majlis atau pasukan anda.</p><button type="button" class="shopBtn" id="continueShopping">Lihat koleksi</button></div>');
 el('cartClose').onclick=closeDialog;el('continueShopping').onclick=closeDialog;
 d.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{cart.splice(Number(b.dataset.remove),1);persist();badge();openCart()});
 d.querySelectorAll('[data-qty]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.qty),x=cart[i],q=quantity(x.q+Number(b.dataset.delta)),p=products.find(p=>p.id===x.productId),v=p?.variants.find(v=>x.variantId?v.id===x.variantId:v.name===x.variant);if(v&&stock(v)!==null&&q+usedStock(x.productId,x.variantId,x.variant,i)>stock(v)){message(d,'Kuantiti melebihi stok tersedia.');return}x.q=q;persist();badge();openCart()});
 el('checkoutBtn')?.addEventListener('click',openCheckout);showDialog(d,'Cart anda');
}
function orderItems(){return cart.map(x=>({productId:x.productId,variant:x.variant,variantId:x.variantId,qty:x.q,nameText:x.name,note:x.note,artwork:x.artwork||''}))}
async function openCheckout(){
 if(!cart.length)return;const version=++checkoutVersion,modal=el('checkout');let quote=null,shipping=[],revision=0,submitting=false;
 modal.innerHTML=`<div class="shopModal checkoutModal"><button class="modalClose" id="checkoutClose" type="button" aria-label="Tutup checkout">×</button><span class="productTag">CHECKOUT</span><h2>Lengkapkan tempahan</h2><p class="detailDesc">1. Maklumat anda &nbsp; 2. Semak jumlah &nbsp; 3. Bayar & lampirkan bukti</p><div id="checkoutSummary" class="checkoutSummary" role="status">Menyemak harga dan stok…</div><div class="gridFields"><div><label for="coName">Nama penuh *</label><input id="coName" autocomplete="name" required maxlength="150" value="${esc(checkoutDraft.name)}"></div><div><label for="coPhone">No. WhatsApp *</label><input id="coPhone" type="tel" autocomplete="tel" required placeholder="01xxxxxxxx" value="${esc(checkoutDraft.phone)}"></div></div><label for="coEmail">Email <span>(pilihan)</span></label><input id="coEmail" type="email" autocomplete="email" value="${esc(checkoutDraft.email)}"><label for="coShipping">Kaedah penerimaan</label><select id="coShipping" disabled><option>Memuatkan pilihan…</option></select><label for="coAddress">Alamat / maklumat penerimaan</label><textarea id="coAddress" autocomplete="street-address" rows="2" placeholder="Isi alamat lengkap untuk penghantaran">${esc(checkoutDraft.address)}</textarea><p class="fileHint" id="shippingHint"></p><p class="checkoutStatus error" role="alert" data-status id="checkoutStatus" hidden></p><button type="button" class="shopBtn wide" id="reviewPayment" disabled>Semak maklumat & teruskan bayaran</button><div class="paymentBox" id="paymentBox" hidden></div><button type="button" class="textButton" id="backToCart">← Kembali ke cart</button></div>`;
 showDialog(modal,'Checkout');el('checkoutClose').onclick=closeDialog;el('backToCart').onclick=()=>{if(!busy)openCart()};
 function draft(){checkoutDraft={name:el('coName').value,phone:el('coPhone').value,email:el('coEmail').value,address:el('coAddress').value,shippingId:el('coShipping').value}}
 for(const id of ['coName','coPhone','coEmail','coAddress'])el(id).oninput=draft;
 const summary=()=>{el('checkoutSummary').innerHTML=quote.items.map((x,i)=>`<div><span>${esc(cart[i].productName)} · ${esc(x.variant)} × ${x.qty}</span><b>${money(x.lineTotalMinor/100)}</b></div>`).join('')+`<div><span>Penghantaran / penerimaan</span><b>${money(quote.shippingMinor/100)}</b></div><div class="checkoutGrand"><span>Jumlah bayaran</span><b>${money(quote.totalMinor/100)}</b></div>`};
 async function refreshQuote(){const seq=++revision;quote=null;el('reviewPayment').disabled=true;el('paymentBox').hidden=true;el('reviewPayment').hidden=false;el('checkoutSummary').textContent='Menyemak harga dan stok…';try{const result=await post({action:'quoteOrder',items:orderItems().map(({artwork,...x})=>x),shippingId:el('coShipping').value});if(seq!==revision||activeDialog!==modal||version!==checkoutVersion)return;quote=result;if(receiptTotal!==null&&receiptTotal!==quote.totalMinor){receiptDraft=null;receiptTotal=null}summary();el('reviewPayment').disabled=false;message(modal,'')}catch(e){if(seq!==revision||activeDialog!==modal||version!==checkoutVersion)return;el('checkoutSummary').textContent='Jumlah belum dapat disahkan.';message(modal,e.message+' Kembali ke cart untuk semak pilihan.')}}
 el('coShipping').onchange=()=>{draft();refreshQuote()};
 function validDetails(){draft();if(!checkoutDraft.name.trim()){message(modal,'Sila isi nama penuh.');el('coName').focus();return false}const phone=checkoutDraft.phone.replace(/\D/g,'');if(phone.length<9||phone.length>15){message(modal,'Sila isi nombor WhatsApp yang sah.');el('coPhone').focus();return false}if(shipping.some(x=>x.id===checkoutDraft.shippingId&&Number(x.price)>0)&&!checkoutDraft.address.trim()){message(modal,'Sila isi alamat untuk penghantaran.');el('coAddress').focus();return false}if(!el('coEmail').checkValidity()){message(modal,'Sila semak alamat email.');el('coEmail').focus();return false}return true}
 el('reviewPayment').onclick=()=>{
  if(!quote||!validDetails())return;message(modal,'');el('reviewPayment').hidden=true;const box=el('paymentBox');box.hidden=false;
  box.innerHTML=`<span class="productTag">BAYARAN QR</span><h3>${money(quote.totalMinor/100)}</h3><p>Scan QR atau simpan gambar untuk dibuka dalam aplikasi bank anda.</p><img class="qr" src="${QR}" alt="QR bayaran Ab Art Trading"><b>Ab Art Trading</b><a class="textButton" href="${QR}" target="_blank" rel="noopener">Buka gambar QR</a><p>Pastikan nama penerima dan jumlah betul sebelum bayar. Order disahkan selepas semakan bukti pembayaran.</p><label for="receiptFile">Bukti pembayaran *</label><input id="receiptFile" type="file" accept="image/png,image/jpeg,image/webp,application/pdf"><div id="receiptHint" class="fileHint">${esc(receiptDraft?.name||'PNG, JPG, WEBP atau PDF · maksimum 5MB')}</div><button type="button" class="shopBtn wide" id="submitOrder">Hantar order & bukti pembayaran</button>`;
  el('receiptFile').onchange=e=>{const f=e.target.files?.[0],err=fileError(f,true);receiptDraft=err?null:f;receiptTotal=receiptDraft?quote.totalMinor:null;el('receiptHint').textContent=err||f?.name||'Pilih bukti pembayaran';if(err)e.target.value=''};
  el('submitOrder').onclick=async()=>{
   if(submitting||!quote||!validDetails())return;const file=receiptDraft,err=fileError(file,true);if(!file||err){message(modal,err||'Sila lampirkan bukti pembayaran.');return}
   submitting=busy=true;const btn=el('submitOrder');btn.disabled=true;btn.textContent='Menghantar order…';modal.querySelectorAll('input,textarea,select').forEach(x=>x.disabled=true);message(modal,'');
   try{const receipt=await readFile(file),j=await post({action:'createOrder',...checkoutDraft,name:checkoutDraft.name.trim(),phone:checkoutDraft.phone.trim(),items:orderItems(),payment:'manual_qr',expectedTotalMinor:quote.totalMinor,receipt:{name:file.name,type:file.type,data:receipt}});cart=[];checkoutDraft={};receiptDraft=null;receiptTotal=null;persist();badge();modal.innerHTML=`<div class="shopModal successModal"><div class="successIcon">✓</div><span class="productTag">ORDER DITERIMA</span><h2>Terima kasih.</h2><p>Kami akan semak bukti pembayaran anda. Simpan nombor tempahan ini untuk rujukan.</p><div class="orderRef">${esc(j.orderRef||j.orderId)}</div><b>${money(j.amount)}</b><button type="button" class="shopBtn wide" id="doneCheckout">Kembali ke koleksi</button></div>`;el('doneCheckout').onclick=closeDialog;el('doneCheckout').focus()}
   catch(e){btn.disabled=false;btn.textContent='Cuba hantar semula';modal.querySelectorAll('input,textarea,select').forEach(x=>x.disabled=false);message(modal,e.message+' Jika sambungan terputus selepas penghantaran, semak dengan REQOO dahulu sebelum cuba semula.')}
   finally{submitting=busy=false}
  };
  box.scrollIntoView({behavior:'smooth',block:'start'});
 };
 try{const j=await api(API+'?action=getShipping',{cache:'no-store'});if(activeDialog!==modal||version!==checkoutVersion)return;shipping=j.shipping||[];el('coShipping').innerHTML=shipping.length?shipping.map(x=>`<option value="${esc(x.id)}">${esc(x.name)} · ${money(x.price)}</option>`).join(''):'<option value="">Atur penerimaan dengan REQOO</option>';if(shipping.some(x=>x.id===checkoutDraft.shippingId))el('coShipping').value=checkoutDraft.shippingId;el('coShipping').disabled=false;el('shippingHint').textContent=shipping.length?'Pilih kaedah yang sesuai untuk tempahan anda.':'Caj penghantaran belum ditetapkan. Hubungi REQOO sebelum bayar jika perlukan penghantaran.';draft();await refreshQuote()}catch(e){if(activeDialog===modal){el('checkoutSummary').textContent='Pilihan penerimaan belum dapat dimuatkan.';message(modal,e.message+' Kembali ke cart dan cuba lagi.')}}
}
function boot(){
 restore();window.openCart=openCart;window.closeModal=closeDialog;
 el('drawerBackdrop').onclick=closeDialog;el('q').addEventListener('input',render);el('cartButton').onclick=openCart;
 for(const id of ['modal','checkout'])el(id).addEventListener('click',e=>{if(e.target===el(id))closeDialog()});
 document.addEventListener('keydown',e=>{if(!activeDialog)return;if(e.key==='Escape'){e.preventDefault();closeDialog()}if(e.key==='Tab'){const focusable=[...activeDialog.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled])')].filter(x=>!x.hidden&&x.getClientRects().length);if(!focusable.length){e.preventDefault();activeDialog.focus();return}const first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&(document.activeElement===first||document.activeElement===activeDialog)){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}});
 document.addEventListener('error',e=>{if(e.target.tagName==='IMG'&&!e.target.dataset.fallback){e.target.dataset.fallback='1';e.target.src=placeholder}},true);
 badge();load();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

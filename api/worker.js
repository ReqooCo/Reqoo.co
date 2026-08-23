const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"Content-Type, X-Admin-Key","Access-Control-Allow-Methods":"GET,POST,PUT,DELETE,OPTIONS"};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,"content-type":"application/json;charset=UTF-8"}});
const clean=v=>String(v??'').trim();
const db=env=>env.DB||env.REQOO_DB||null;
const bucket=env=>env.MEDIA||env.R2||env.BUCKET||null;
function admin(req,env){const expected=clean(env.ADMIN_KEY);return expected!==''&&clean(req.headers.get('X-Admin-Key'))===expected}
function requireAdmin(req,env){if(!clean(env.ADMIN_KEY))return json({error:'ADMIN_KEY belum dipasang pada Worker.'},503);if(!admin(req,env))return json({error:'Unauthorized'},401);return null}
async function init(env){
  const database=db(env);
  if(!database)throw new Error('D1 binding DB tidak dijumpai pada deployment Worker.');
  const SCHEMA='fresh-2026-08-24-v3';
  await database.batch([
    database.prepare(`CREATE TABLE IF NOT EXISTS reqoo_catalog_products_v3(id TEXT PRIMARY KEY,name TEXT NOT NULL,category TEXT DEFAULT '',material TEXT DEFAULT '',sku TEXT DEFAULT '',description TEXT DEFAULT '',base_price_minor INTEGER DEFAULT 0,images TEXT DEFAULT '[]',variations TEXT DEFAULT '[]',addons TEXT DEFAULT '[]',custom_fields TEXT DEFAULT '[]',status TEXT DEFAULT 'active',created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`),
    database.prepare(`CREATE TABLE IF NOT EXISTS reqoo_business_documents_v3(id TEXT PRIMARY KEY,type TEXT NOT NULL,number TEXT NOT NULL,customer TEXT DEFAULT '',email TEXT DEFAULT '',items TEXT DEFAULT '[]',total_minor INTEGER DEFAULT 0,status TEXT DEFAULT 'draft',created_at TEXT NOT NULL)`),
    database.prepare(`CREATE TABLE IF NOT EXISTS reqoo_app_settings_v3(key TEXT PRIMARY KEY,value TEXT DEFAULT '')`),
    database.prepare(`CREATE TABLE IF NOT EXISTS reqoo_system_meta_v3(key TEXT PRIMARY KEY,value TEXT NOT NULL)`),
    database.prepare("INSERT OR REPLACE INTO reqoo_system_meta_v3(key,value) VALUES('schema',?)").bind(SCHEMA)
  ]);
}
async function hmac(key,text){const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(key),{name:'HMAC',hash:'SHA-256'},false,['sign']);const b=await crypto.subtle.sign('HMAC',k,new TextEncoder().encode(text));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}
async function billSignature(data,key){const pairs=Object.entries(data).filter(([k])=>k!=='x_signature').map(([k,v])=>k+String(v??'')).sort((a,b)=>a.toLowerCase().localeCompare(b.toLowerCase()));return hmac(key,pairs.join('|'))}
export default {async fetch(request,env){
  if(request.method==='OPTIONS')return new Response(null,{headers:cors});
  const u=new URL(request.url);
  try{
    if(u.hostname==='admin.reqoo.co')return Response.redirect('https://reqoo.co/admin/',302);

    const database=db(env);
    if(u.pathname==='/api/health')return json({ok:!!database,service:'reqoo-api',schema:'fresh-2026-08-24-v3',db:!!database,media:!!bucket(env),adminConfigured:!!clean(env.ADMIN_KEY)});
    if(!database)return json({error:'D1 binding DB tidak dijumpai pada deployment Worker.'},503);
    await init(env);

    if(u.pathname.startsWith('/media/products/')){
      const b=bucket(env);if(!b)return json({error:'MEDIA R2 binding belum dipasang.'},503);
      const key=decodeURIComponent(u.pathname.slice('/media/products/'.length));
      const obj=await b.get('products/'+key);
      if(!obj)return new Response('Not found',{status:404,headers:cors});
      const h=new Headers(cors);obj.writeHttpMetadata(h);return new Response(obj.body,{headers:h});
    }

    if(u.pathname==='/api/admin/media'&&request.method==='POST'){
      const auth=requireAdmin(request,env);if(auth)return auth;
      const b=bucket(env);if(!b)return json({error:'MEDIA R2 binding belum dipasang.'},503);
      const fd=await request.formData();const file=fd.get('file');
      if(!(file instanceof File))return json({error:'Fail gambar tiada.'},400);
      if(!/^image\/(jpeg|png|webp|gif)$/.test(file.type))return json({error:'Format gambar mesti JPG, PNG, WebP atau GIF.'},400);
      if(file.size>10*1024*1024)return json({error:'Gambar maksimum 10MB.'},400);
      const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg';
      const key=crypto.randomUUID()+'.'+ext;
      await b.put('products/'+key,file,{httpMetadata:{contentType:file.type,cacheControl:'public,max-age=31536000'}});
      return json({ok:true,url:'https://api.reqoo.co/media/products/'+encodeURIComponent(key)});
    }

    if(u.pathname==='/api/products'&&request.method==='GET'){
      const {results}=await database.prepare("SELECT * FROM reqoo_catalog_products_v3 WHERE status='active' ORDER BY created_at DESC").all();return json({products:results});
    }
    if(u.pathname==='/api/payment-settings'&&request.method==='GET'){
      const {results}=await database.prepare("SELECT key,value FROM reqoo_app_settings_v3 WHERE key='qr_url'").all();return json(Object.fromEntries(results.map(x=>[x.key,x.value])));
    }

    if(u.pathname==='/api/admin/products'&&request.method==='GET'){
      const auth=requireAdmin(request,env);if(auth)return auth;
      const {results}=await database.prepare('SELECT * FROM reqoo_catalog_products_v3 ORDER BY created_at DESC').all();return json({products:results});
    }
    if(u.pathname==='/api/admin/products'&&request.method==='POST'){
      const auth=requireAdmin(request,env);if(auth)return auth;
      const p=await request.json();
      if(!p||typeof p!=='object')return json({error:'Payload produk tidak sah.'},400);
      const name=clean(p.name);if(!name)return json({error:'Nama produk diperlukan.'},400);
      const now=new Date().toISOString();const id=clean(p.id)||crypto.randomUUID();
      const base=Math.max(0,Math.round(Number(p.base_price_minor??0)));
      const images=Array.isArray(p.images)?p.images:[];
      const variations=Array.isArray(p.variations)?p.variations:[];
      const addons=Array.isArray(p.addons)?p.addons:[];
      const customFields=Array.isArray(p.custom_fields)?p.custom_fields:[];
      await database.prepare(`INSERT INTO reqoo_catalog_products_v3(id,name,category,material,sku,description,base_price_minor,images,variations,addons,custom_fields,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,category=excluded.category,material=excluded.material,sku=excluded.sku,description=excluded.description,base_price_minor=excluded.base_price_minor,images=excluded.images,variations=excluded.variations,addons=excluded.addons,custom_fields=excluded.custom_fields,status=excluded.status,updated_at=excluded.updated_at`).bind(id,name,clean(p.category),clean(p.material),clean(p.sku),clean(p.description),base,JSON.stringify(images),JSON.stringify(variations),JSON.stringify(addons),JSON.stringify(customFields),p.status==='inactive'?'inactive':'active',now,now).run();
      return json({ok:true,id});
    }
    if(u.pathname.startsWith('/api/admin/products/')&&request.method==='DELETE'){
      const auth=requireAdmin(request,env);if(auth)return auth;
      const id=decodeURIComponent(u.pathname.split('/').pop());
      await database.prepare('DELETE FROM reqoo_catalog_products_v3 WHERE id=?').bind(id).run();return json({ok:true});
    }
    if(u.pathname==='/api/admin/documents'&&request.method==='GET'){
      const auth=requireAdmin(request,env);if(auth)return auth;
      const {results}=await database.prepare('SELECT * FROM reqoo_business_documents_v3 ORDER BY created_at DESC LIMIT 100').all();return json({documents:results});
    }
    if(u.pathname==='/api/admin/documents'&&request.method==='POST'){
      const auth=requireAdmin(request,env);if(auth)return auth;
      const d=await request.json();if(!d||typeof d!=='object')return json({error:'Payload dokumen tidak sah.'},400);
      const id=crypto.randomUUID();await database.prepare('INSERT INTO reqoo_business_documents_v3(id,type,number,customer,email,items,total_minor,status,created_at) VALUES(?,?,?,?,?,?,?,?,?)').bind(id,clean(d.type),clean(d.number),clean(d.customer),clean(d.email),JSON.stringify(Array.isArray(d.items)?d.items:[]),Math.max(0,Math.round(Number(d.total_minor??0))),clean(d.status||'draft'),new Date().toISOString()).run();return json({ok:true,id});
    }
    if(u.pathname==='/api/admin/settings'&&request.method==='POST'){
      const auth=requireAdmin(request,env);if(auth)return auth;
      const d=await request.json();if(d.qr_url!==undefined)await database.prepare('INSERT OR REPLACE INTO reqoo_app_settings_v3(key,value) VALUES(?,?)').bind('qr_url',clean(d.qr_url)).run();return json({ok:true});
    }

    if(u.pathname==='/api/create-bill'&&request.method==='POST'){
      const b=await request.json();const key=clean(env.BILLPLZ_API_KEY||env.BILLPLZ_SECRET_KEY);const collection=clean(env.BILLPLZ_COLLECTION||env.BILLPLZ_COLLECTION_ID||env.BILLPLZ_COLLECT);const amount=Math.round(Number(b.total_minor||0));
      if(!key||!collection)return json({error:'Billplz secrets belum lengkap.'},503);
      if(amount<=0||!clean(b.email)||!clean(b.name)||!clean(b.phone))return json({error:'Maklumat bayaran tidak lengkap.'},400);
      const form=new URLSearchParams({collection_id:collection,email:clean(b.email),name:clean(b.name),mobile:clean(b.phone),amount:String(amount),description:'Reqoo Shop Order',callback_url:'https://api.reqoo.co/api/billplz/callback',redirect_url:'https://shop.reqoo.co/?payment=returned'});
      const r=await fetch('https://www.billplz.com/api/v3/bills',{method:'POST',headers:{Authorization:'Basic '+btoa(key+':'),'Content-Type':'application/x-www-form-urlencoded'},body:form});
      const j=await r.json();if(!r.ok)return json({error:j.error||j.message||'Billplz error'},r.status);return json({url:j.url,id:j.id});
    }
    if(u.pathname==='/api/billplz/callback'&&request.method==='POST'){
      const form=await request.formData();const data={};for(const [k,v] of form.entries())data[k]=String(v);
      const sk=clean(env.BILLPLZ_X_SIGNATURE||env.BILLPLZ_X_SIGNATURE_KEY);
      if(sk&&data.x_signature&&(await billSignature(data,sk))!==data.x_signature)return new Response('invalid signature',{status:403});
      return new Response('OK');
    }
    return json({error:'Not found'},404);
  }catch(e){return json({error:e.message||'Server error'},500)}
}};
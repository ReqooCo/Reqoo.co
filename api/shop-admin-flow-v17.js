import { onRequest as legacy } from './shop-admin-flow-v16.js';

const C={'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'Content-Type,X-Admin-Token','cache-control':'no-store'};
const S=v=>String(v??'').trim();
const NOW=()=>new Date().toISOString();
const ID=p=>`${p}_${crypto.randomUUID()}`;
const J=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{'content-type':'application/json;charset=UTF-8',...C}});
const DATA_IMAGE=/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/i;

async function data(request){
  if(request.method==='GET')return Object.fromEntries(new URL(request.url).searchParams);
  try{return await request.clone().json()}catch{return {}}
}
function auth(request,env,d){
  const supplied=S(request.headers.get('X-Admin-Token')||d.token),expected=S(env.REQOO_ADMIN_TOKEN||env.SHOP_ADMIN_TOKEN||env.ADMIN_KEY);
  return !!supplied&&supplied===expected;
}
function clampMoney(v,max=1000000000){
  const n=Math.round(Number(v||0));
  return Number.isFinite(n)?Math.max(0,Math.min(max,n)):0;
}
function clampDays(v,fallback=7){
  const n=Number(v);
  return Number.isFinite(n)?Math.max(0,Math.min(365,Math.round(n))):fallback;
}
function plusDays(iso,days){
  const d=new Date(iso);d.setUTCDate(d.getUTCDate()+Number(days||0));return d.toISOString();
}
async function ensureDocuments(env){
  await env.DB.batch([
    env.DB.prepare("CREATE TABLE IF NOT EXISTS reqoo_document_sequences(seq_key TEXT PRIMARY KEY,next_number INTEGER NOT NULL DEFAULT 1,updated_at TEXT NOT NULL)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS reqoo_documents(id TEXT PRIMARY KEY,type TEXT NOT NULL CHECK(type IN ('quotation','invoice','receipt','delivery_order')),number TEXT NOT NULL UNIQUE,order_id TEXT NOT NULL,status TEXT NOT NULL,currency TEXT NOT NULL DEFAULT 'MYR',subtotal_minor INTEGER NOT NULL DEFAULT 0,discount_minor INTEGER NOT NULL DEFAULT 0,shipping_minor INTEGER NOT NULL DEFAULT 0,tax_minor INTEGER NOT NULL DEFAULT 0,total_minor INTEGER NOT NULL DEFAULT 0,issued_at TEXT NOT NULL,due_at TEXT,customer_name TEXT,customer_phone TEXT,customer_email TEXT,company_json TEXT NOT NULL DEFAULT '{}',payment_status TEXT,share_token TEXT NOT NULL UNIQUE,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,UNIQUE(order_id,type))"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS reqoo_document_items(id TEXT PRIMARY KEY,document_id TEXT NOT NULL REFERENCES reqoo_documents(id) ON DELETE CASCADE,description TEXT NOT NULL,variation TEXT,quantity REAL NOT NULL DEFAULT 1,unit_price_minor INTEGER NOT NULL DEFAULT 0,line_total_minor INTEGER NOT NULL DEFAULT 0,sort_order INTEGER NOT NULL DEFAULT 0)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_reqoo_documents_order ON reqoo_documents(order_id)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_reqoo_documents_type_time ON reqoo_documents(type,created_at)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_reqoo_document_items_doc ON reqoo_document_items(document_id)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS shop_settings(key TEXT PRIMARY KEY,value TEXT,updated_at TEXT NOT NULL)")
  ]);
}
async function documentSettings(env){
  const keys=['document_company_name','document_registration_no','document_address','document_phone','document_email','document_bank','document_quote_valid_days'];
  const rows=(await env.DB.prepare(`SELECT key,value FROM shop_settings WHERE key IN (${keys.map(()=>'?').join(',')})`).bind(...keys).all()).results||[];
  const m=Object.fromEntries(rows.map(r=>[r.key,r.value||'']));
  return {
    companyName:m.document_company_name||'REQOO.CO',
    registrationNo:m.document_registration_no||'',
    address:m.document_address||'',
    phone:m.document_phone||'',
    email:m.document_email||'',
    bank:m.document_bank||'',
    quoteValidDays:clampDays(m.document_quote_valid_days,7)
  };
}
async function nextQuoteNumber(env){
  const year=new Date().getUTCFullYear(),key=`quotation:${year}`,t=NOW();
  await env.DB.prepare('INSERT OR IGNORE INTO reqoo_document_sequences(seq_key,next_number,updated_at) VALUES(?,1,?)').bind(key,t).run();
  const row=await env.DB.prepare('UPDATE reqoo_document_sequences SET next_number=next_number+1,updated_at=? WHERE seq_key=? RETURNING next_number-1 AS issued').bind(t,key).first();
  return `QT-${year}-${String(Number(row?.issued||1)).padStart(5,'0')}`;
}
async function hydrateDocument(row,env){
  if(!row)return null;
  const items=(await env.DB.prepare('SELECT * FROM reqoo_document_items WHERE document_id=? ORDER BY sort_order,id').bind(row.id).all()).results||[];
  let company={};try{company=JSON.parse(row.company_json||'{}')}catch{}
  return {...row,company,items};
}
function normalizeQuoteItems(raw){
  if(!Array.isArray(raw))return [];
  return raw.slice(0,50).map((item,ix)=>{
    const description=S(item?.description).slice(0,240),variation=S(item?.variation).slice(0,160),quantity=Number(item?.quantity||0),unit=clampMoney(item?.unitPriceMinor,100000000);
    if(!description||!Number.isFinite(quantity)||quantity<=0||quantity>100000)return null;
    const qty=Math.round(quantity*1000)/1000;
    return {description,variation,quantity:qty,unitPriceMinor:unit,lineTotalMinor:Math.round(qty*unit),sortOrder:ix};
  }).filter(Boolean);
}
async function createCustomQuotation(d,env){
  await ensureDocuments(env);
  const customerName=S(d.customerName).slice(0,160),customerPhone=S(d.customerPhone).slice(0,60),customerEmail=S(d.customerEmail).slice(0,160),items=normalizeQuoteItems(d.items);
  if(!customerName)return J({ok:false,error:'Nama pelanggan / syarikat diperlukan.'},400);
  if(!items.length)return J({ok:false,error:'Masukkan sekurang-kurangnya satu item quotation.'},400);

  const base=await documentSettings(env),now=NOW(),id=ID('doc'),number=await nextQuoteNumber(env),shareToken=`${crypto.randomUUID()}${crypto.randomUUID().replaceAll('-','')}`;
  const subtotal=items.reduce((sum,item)=>sum+item.lineTotalMinor,0),discount=Math.min(subtotal,clampMoney(d.discountMinor,subtotal)),shipping=clampMoney(d.shippingMinor,100000000),tax=clampMoney(d.taxMinor,100000000),total=Math.max(0,subtotal-discount+shipping+tax);
  const validDays=clampDays(d.validDays,base.quoteValidDays),dueAt=S(d.dueAt)||plusDays(now,validDays),depositPercent=Math.max(0,Math.min(100,Number(d.depositPercent||0)));
  const company={...base,quoteMeta:{source:'custom',customerAddress:S(d.customerAddress).slice(0,1000),attention:S(d.attention).slice(0,160),notes:S(d.notes).slice(0,2000),terms:S(d.terms).slice(0,3000),depositPercent:Number.isFinite(depositPercent)?Math.round(depositPercent*100)/100:0}};
  const orderId=`custom:${id}`;
  const header=env.DB.prepare('INSERT INTO reqoo_documents(id,type,number,order_id,status,currency,subtotal_minor,discount_minor,shipping_minor,tax_minor,total_minor,issued_at,due_at,customer_name,customer_phone,customer_email,company_json,payment_status,share_token,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .bind(id,'quotation',number,orderId,'issued','MYR',subtotal,discount,shipping,tax,total,now,dueAt,customerName,customerPhone,customerEmail,JSON.stringify(company),'',shareToken,now,now);
  const rows=items.map(item=>env.DB.prepare('INSERT INTO reqoo_document_items(id,document_id,description,variation,quantity,unit_price_minor,line_total_minor,sort_order) VALUES(?,?,?,?,?,?,?,?)')
    .bind(ID('di'),id,item.description,item.variation,item.quantity,item.unitPriceMinor,item.lineTotalMinor,item.sortOrder));
  await env.DB.batch([header,...rows]);
  const row=await env.DB.prepare('SELECT * FROM reqoo_documents WHERE id=? LIMIT 1').bind(id).first();
  return J({ok:true,created:true,document:await hydrateDocument(row,env)});
}

async function repairProductImages(env){
  const rows=(await env.DB.prepare("SELECT id,product_id,url FROM product_images WHERE url LIKE 'data:image/%;base64,%' ORDER BY created_at LIMIT 100").all()).results||[];
  if(!rows.length)return J({ok:true,converted:0,remaining:false});
  const updates=[];let converted=0,skipped=0;
  for(const row of rows){
    try{
      const match=S(row.url).match(DATA_IMAGE);if(!match){skipped++;continue}
      const raw=atob(match[2].replace(/\s/g,''));if(!raw.length||raw.length>10*1024*1024){skipped++;continue}
      const type=match[1].toLowerCase(),ext=type==='image/jpeg'?'jpg':type.split('/')[1],product=String(row.product_id||'product').replace(/[^A-Za-z0-9_-]/g,'_').slice(0,80)||'product';
      const key=`products/${product}/${crypto.randomUUID()}.${ext}`;
      await env.MEDIA.put(key,Uint8Array.from(raw,c=>c.charCodeAt(0)),{httpMetadata:{contentType:type,cacheControl:'public, max-age=31536000, immutable'},customMetadata:{productId:S(row.product_id),source:'legacy-data-url-repair'}});
      updates.push(env.DB.prepare('UPDATE product_images SET url=? WHERE id=? AND url=?').bind(`/api/product-image?key=${encodeURIComponent(key)}`,row.id,row.url));converted++;
    }catch(error){console.error('REQOO image repair row:',row.id,error);skipped++}
  }
  if(updates.length)await env.DB.batch(updates);
  const remaining=!!(await env.DB.prepare("SELECT id FROM product_images WHERE url LIKE 'data:image/%;base64,%' LIMIT 1").first());
  return J({ok:true,converted,skipped,remaining});
}

export async function onRequest({request,env}){
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:C});
  const d=await data(request),action=S(d.action);

  if(action==='repairProductImages'){
    if(!auth(request,env,d))return J({ok:false,error:'Unauthorized'},401);
    if(!env.DB||!env.MEDIA)return J({ok:false,error:'Database atau storage gambar belum tersedia'},503);
    try{return await repairProductImages(env)}catch(error){console.error('REQOO image repair:',error);return J({ok:false,error:'Gambar lama belum dapat dipulihkan'},500)}
  }

  if(action==='createCustomQuotation'){
    if(!auth(request,env,d))return J({ok:false,error:'Unauthorized'},401);
    if(!env.DB)return J({ok:false,error:'D1 binding DB tidak dijumpai'},503);
    try{return await createCustomQuotation(d,env)}catch(error){console.error('REQOO custom quotation:',error);return J({ok:false,error:error?.message||'Quotation gagal dijana'},500)}
  }

  if(action==='createDocument'&&S(d.type).toLowerCase()==='quotation'){
    if(!auth(request,env,d))return J({ok:false,error:'Unauthorized'},401);
    return J({ok:false,error:'Quotation dibuat secara custom sebelum order. Gunakan Create Custom Quotation.'},409);
  }

  return legacy({request,env});
}

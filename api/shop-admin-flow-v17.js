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
function orderNumber(){
  const d=new Date(),date=`${d.getUTCFullYear()}${String(d.getUTCMonth()+1).padStart(2,'0')}${String(d.getUTCDate()).padStart(2,'0')}`;
  return `RQ${date}-${crypto.randomUUID().replaceAll('-','').slice(0,5).toUpperCase()}`;
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
async function ensureOrderNumber(env){
  const cols=(await env.DB.prepare('PRAGMA table_info(orders)').all()).results||[];
  if(!cols.length)throw new Error('Jadual order tidak dijumpai');
  if(!cols.some(x=>x.name==='order_no'))await env.DB.prepare('ALTER TABLE orders ADD COLUMN order_no TEXT').run();
  await env.DB.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_order_no ON orders(order_no)').run();
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
    bank:m.document_bank||'Bank: MAYBANK\nAccount Name: AB ART TRADING\nAccount No: 5660 1063 5319',
    quoteValidDays:clampDays(m.document_quote_valid_days,7)
  };
}
async function nextQuoteNumber(env){
  const year=new Date().getUTCFullYear(),key=`quotation:${year}`,t=NOW();
  await env.DB.prepare('INSERT OR IGNORE INTO reqoo_document_sequences(seq_key,next_number,updated_at) VALUES(?,1,?)').bind(key,t).run();
  const row=await env.DB.prepare('UPDATE reqoo_document_sequences SET next_number=next_number+1,updated_at=? WHERE seq_key=? RETURNING next_number-1 AS issued').bind(t,key).first();
  return `QT-${year}-${String(Number(row?.issued||1)).padStart(5,'0')}`;
}
async function nextOrderNumber(env){
  for(let i=0;i<8;i++){
    const number=orderNumber(),exists=await env.DB.prepare('SELECT id FROM orders WHERE order_no=? LIMIT 1').bind(number).first();
    if(!exists)return number;
  }
  throw new Error('Nombor order unik gagal dijana');
}
async function hydrateDocument(row,env){
  if(!row)return null;
  const items=(await env.DB.prepare('SELECT * FROM reqoo_document_items WHERE document_id=? ORDER BY sort_order,id').bind(row.id).all()).results||[];
  let company={};try{company=JSON.parse(row.company_json||'{}')}catch{}
  return {...row,company,items};
}
function quoteMeta(doc){return doc?.company&&typeof doc.company.quoteMeta==='object'?doc.company.quoteMeta:{}}
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
async function customQuotation(d,env){
  const key=S(d.documentId||d.id||d.number);
  if(!key)return null;
  const row=await env.DB.prepare("SELECT * FROM reqoo_documents WHERE (id=? OR number=?) AND type='quotation' LIMIT 1").bind(key,key).first();
  if(!row)return null;
  const doc=await hydrateDocument(row,env),meta=quoteMeta(doc);
  return meta.source==='custom'?doc:null;
}
async function updateCustomQuotation(d,env){
  await ensureDocuments(env);
  const doc=await customQuotation(d,env);
  if(!doc)return J({ok:false,error:'Custom quotation tidak dijumpai.'},404);
  const oldMeta=quoteMeta(doc);
  if(oldMeta.convertedOrderId)return J({ok:false,error:'Quotation yang telah menjadi order tidak boleh diedit. Edit order/invoice selepas conversion.'},409);
  const customerName=S(d.customerName).slice(0,160),customerPhone=S(d.customerPhone).slice(0,60),customerEmail=S(d.customerEmail).slice(0,160),items=normalizeQuoteItems(d.items);
  if(!customerName)return J({ok:false,error:'Nama pelanggan / syarikat diperlukan.'},400);
  if(!items.length)return J({ok:false,error:'Masukkan sekurang-kurangnya satu item quotation.'},400);
  const now=NOW(),subtotal=items.reduce((sum,item)=>sum+item.lineTotalMinor,0),discount=Math.min(subtotal,clampMoney(d.discountMinor,subtotal)),shipping=clampMoney(d.shippingMinor,100000000),tax=clampMoney(d.taxMinor,100000000),total=Math.max(0,subtotal-discount+shipping+tax);
  const validDays=clampDays(d.validDays,7),dueAt=S(d.dueAt)||plusDays(now,validDays),depositPercent=Math.max(0,Math.min(100,Number(d.depositPercent||0)));
  const company={...(doc.company||{}),quoteMeta:{...oldMeta,source:'custom',customerAddress:S(d.customerAddress).slice(0,1000),attention:S(d.attention).slice(0,160),notes:S(d.notes).slice(0,2000),terms:S(d.terms).slice(0,3000),depositPercent:Number.isFinite(depositPercent)?Math.round(depositPercent*100)/100:0}};
  const stmts=[
    env.DB.prepare('UPDATE reqoo_documents SET subtotal_minor=?,discount_minor=?,shipping_minor=?,tax_minor=?,total_minor=?,due_at=?,customer_name=?,customer_phone=?,customer_email=?,company_json=?,updated_at=? WHERE id=?').bind(subtotal,discount,shipping,tax,total,dueAt,customerName,customerPhone,customerEmail,JSON.stringify(company),now,doc.id),
    env.DB.prepare('DELETE FROM reqoo_document_items WHERE document_id=?').bind(doc.id),
    ...items.map(item=>env.DB.prepare('INSERT INTO reqoo_document_items(id,document_id,description,variation,quantity,unit_price_minor,line_total_minor,sort_order) VALUES(?,?,?,?,?,?,?,?)').bind(ID('di'),doc.id,item.description,item.variation,item.quantity,item.unitPriceMinor,item.lineTotalMinor,item.sortOrder))
  ];
  await env.DB.batch(stmts);
  return J({ok:true,updated:true,document:await hydrateDocument(await env.DB.prepare('SELECT * FROM reqoo_documents WHERE id=? LIMIT 1').bind(doc.id).first(),env)});
}
async function createInvoiceWithQuoteTerms(d,request,env){
  const response=await legacy({request,env});
  if(!response.ok)return response;
  let out={};try{out=await response.clone().json()}catch{return response}
  if(out.ok===false||!out.document)return response;
  const invoice=out.document,orderId=S(invoice.order_id||d.orderId||d.orderNo||d.orderRef);
  if(!orderId)return response;
  const qrow=await env.DB.prepare("SELECT * FROM reqoo_documents WHERE order_id=? AND type='quotation' ORDER BY created_at,id LIMIT 1").bind(orderId).first();
  if(!qrow)return response;
  const quote=await hydrateDocument(qrow,env),meta=quoteMeta(quote),pct=Math.max(0,Math.min(100,Number(meta.depositPercent||0)));
  if(!(pct>0&&pct<100))return response;
  const irow=await env.DB.prepare("SELECT * FROM reqoo_documents WHERE id=? AND type='invoice' LIMIT 1").bind(invoice.id).first();
  if(!irow)return response;
  let company={};try{company=JSON.parse(irow.company_json||'{}')}catch{}
  company={...company,quoteMeta:{...meta,sourceQuotationId:quote.id,sourceQuotationNumber:quote.number,depositPercent:pct}};
  await env.DB.prepare('UPDATE reqoo_documents SET company_json=?,updated_at=? WHERE id=?').bind(JSON.stringify(company),NOW(),irow.id).run();
  out.document=await hydrateDocument(await env.DB.prepare('SELECT * FROM reqoo_documents WHERE id=?').bind(irow.id).first(),env);
  return J(out);
}
async function updateCustomQuotationStatus(d,env){
  await ensureDocuments(env);
  const status=S(d.status).toLowerCase(),allowed=new Set(['issued','sent','accepted','rejected','expired']);
  if(!allowed.has(status))return J({ok:false,error:'Status quotation tidak sah.'},400);
  const doc=await customQuotation(d,env);
  if(!doc)return J({ok:false,error:'Custom quotation tidak dijumpai.'},404);
  if(quoteMeta(doc).convertedOrderId&&status!=='accepted')return J({ok:false,error:'Quotation yang telah menjadi order kekal ACCEPTED.'},409);
  await env.DB.prepare('UPDATE reqoo_documents SET status=?,updated_at=? WHERE id=?').bind(status,NOW(),doc.id).run();
  return J({ok:true,document:await hydrateDocument(await env.DB.prepare('SELECT * FROM reqoo_documents WHERE id=?').bind(doc.id).first(),env)});
}
async function convertCustomQuotationToOrder(d,env){
  await ensureDocuments(env);await ensureOrderNumber(env);
  const doc=await customQuotation(d,env);
  if(!doc)return J({ok:false,error:'Custom quotation tidak dijumpai.'},404);
  const meta=quoteMeta(doc);
  if(meta.convertedOrderId){
    const order=await env.DB.prepare('SELECT * FROM orders WHERE id=? LIMIT 1').bind(meta.convertedOrderId).first();
    return J({ok:true,created:false,order,document:doc});
  }
  if(!doc.items.length)return J({ok:false,error:'Quotation tiada item untuk dijadikan order.'},409);

  const now=NOW(),phone=S(doc.customer_phone).slice(0,60),email=S(doc.customer_email).slice(0,160),name=S(doc.customer_name).slice(0,160)||'Customer';
  let customer=null;
  if(phone)customer=await env.DB.prepare('SELECT * FROM customers WHERE phone=? LIMIT 1').bind(phone).first();
  if(!customer&&email)customer=await env.DB.prepare('SELECT * FROM customers WHERE email=? LIMIT 1').bind(email).first();
  const customerId=customer?.id||ID('cus'),orderId=ID('ord'),orderNo=await nextOrderNumber(env),stmts=[];
  if(customer){
    stmts.push(env.DB.prepare("UPDATE customers SET name=?,phone=COALESCE(NULLIF(?,''),phone),email=COALESCE(NULLIF(?,''),email),updated_at=? WHERE id=?").bind(name,phone,email,now,customerId));
  }else{
    stmts.push(env.DB.prepare('INSERT INTO customers(id,name,phone,email,created_at,updated_at) VALUES(?,?,?,?,?,?)').bind(customerId,name,phone||null,email||null,now,now));
  }
  stmts.push(env.DB.prepare("INSERT INTO orders(id,customer_id,source,currency,subtotal_minor,discount_minor,shipping_minor,tax_minor,total_minor,payment_status,fulfillment_status,referral_code,created_at,updated_at,order_no) VALUES(?,?,?,?,?,?,?,?,?,'pending','pending',NULL,?,?,?)")
    .bind(orderId,customerId,'admin_quotation',S(doc.currency)||'MYR',Number(doc.subtotal_minor||0),Number(doc.discount_minor||0),Number(doc.shipping_minor||0),Number(doc.tax_minor||0),Number(doc.total_minor||0),now,now,orderNo));
  for(const item of doc.items){
    const variation=item.variation?{name:S(item.variation).slice(0,160)}:{};
    stmts.push(env.DB.prepare("INSERT INTO order_items(id,order_id,product_id,variation_id,product_name_snapshot,sku_snapshot,variation_snapshot_json,customization_snapshot_json,addons_snapshot_json,unit_price_minor,quantity,line_total_minor,created_at) VALUES(?,?,NULL,NULL,?,NULL,?,?, '[]',?,?,?,?)")
      .bind(ID('itm'),orderId,S(item.description).slice(0,240)||'Custom item',JSON.stringify(variation),JSON.stringify({quotationNumber:doc.number}),Number(item.unit_price_minor||0),Number(item.quantity||1),Number(item.line_total_minor||0),now));
  }
  stmts.push(env.DB.prepare('INSERT INTO activity_events(id,customer_id,order_id,event_type,trace_id,metadata_json,created_at) VALUES(?,?,?,?,?,?,?)')
    .bind(ID('evt'),customerId,orderId,'order.created',null,JSON.stringify({source:'admin_quotation',quotationNumber:doc.number}),now));
  const company={...(doc.company||{}),quoteMeta:{...meta,convertedOrderId:orderId,convertedOrderNo:orderNo,convertedAt:now}};
  stmts.push(env.DB.prepare("UPDATE reqoo_documents SET order_id=?,status='accepted',company_json=?,updated_at=? WHERE id=?").bind(orderId,JSON.stringify(company),now,doc.id));
  await env.DB.batch(stmts);
  const order=await env.DB.prepare('SELECT * FROM orders WHERE id=? LIMIT 1').bind(orderId).first();
  const fresh=await hydrateDocument(await env.DB.prepare('SELECT * FROM reqoo_documents WHERE id=? LIMIT 1').bind(doc.id).first(),env);
  return J({ok:true,created:true,order,document:fresh});
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

  if(['createCustomQuotation','updateCustomQuotation','updateCustomQuotationStatus','convertCustomQuotationToOrder'].includes(action)){
    if(!auth(request,env,d))return J({ok:false,error:'Unauthorized'},401);
    if(!env.DB)return J({ok:false,error:'D1 binding DB tidak dijumpai'},503);
    try{
      if(action==='createCustomQuotation')return await createCustomQuotation(d,env);
      if(action==='updateCustomQuotation')return await updateCustomQuotation(d,env);
      if(action==='updateCustomQuotationStatus')return await updateCustomQuotationStatus(d,env);
      return await convertCustomQuotationToOrder(d,env);
    }catch(error){console.error('REQOO custom quotation:',error);return J({ok:false,error:error?.message||'Quotation gagal diproses'},500)}
  }

  if(action==='createDocument'&&S(d.type).toLowerCase()==='invoice'){
    if(!auth(request,env,d))return J({ok:false,error:'Unauthorized'},401);
    if(!env.DB)return J({ok:false,error:'D1 binding DB tidak dijumpai'},503);
    try{await ensureDocuments(env);return await createInvoiceWithQuoteTerms(d,request,env)}
    catch(error){console.error('REQOO deposit invoice:',error);return J({ok:false,error:error?.message||'Invoice gagal diproses'},500)}
  }

  if(action==='createDocument'&&S(d.type).toLowerCase()==='quotation'){
    if(!auth(request,env,d))return J({ok:false,error:'Unauthorized'},401);
    return J({ok:false,error:'Quotation dibuat secara custom sebelum order. Gunakan Create Custom Quotation.'},409);
  }

  return legacy({request,env});
}

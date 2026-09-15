import { onRequest as legacy } from './shop-admin-flow-v17.js';

const C={
  'access-control-allow-origin':'*',
  'access-control-allow-methods':'GET,POST,OPTIONS',
  'access-control-allow-headers':'Content-Type,X-Admin-Token',
  'cache-control':'no-store'
};
const S=(v,max=5000)=>String(v??'').trim().slice(0,max);
const NOW=()=>new Date().toISOString();
const ID=p=>`${p}_${crypto.randomUUID()}`;
const J=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{'content-type':'application/json;charset=UTF-8',...C}});

async function data(request){
  if(request.method==='GET')return Object.fromEntries(new URL(request.url).searchParams);
  try{return await request.clone().json()}catch{return {}}
}
function auth(request,env,d){
  const supplied=S(request.headers.get('X-Admin-Token')||d.token,500);
  const expected=S(env.REQOO_ADMIN_TOKEN||env.SHOP_ADMIN_TOKEN||env.ADMIN_KEY,500);
  return !!supplied&&supplied===expected;
}
function plusDays(iso,days){const d=new Date(iso);d.setUTCDate(d.getUTCDate()+Number(days||0));return d.toISOString()}
function minor(v,name='Amaun'){
  const n=Number(v??0);
  if(!Number.isFinite(n)||n<0||!Number.isInteger(n))throw new Error(`${name} tidak sah`);
  return n;
}
function qty(v){
  const n=Number(v??1);
  if(!Number.isInteger(n)||n<1||n>100000)throw new Error('Kuantiti tidak sah');
  return n;
}
function quoteMeta(company){return company&&typeof company._documentMeta==='object'?company._documentMeta:{}}
function orderRef(){
  const d=new Date();
  const date=`${d.getUTCFullYear()}${String(d.getUTCMonth()+1).padStart(2,'0')}${String(d.getUTCDate()).padStart(2,'0')}`;
  return `RQ${date}-${crypto.randomUUID().replaceAll('-','').slice(0,5).toUpperCase()}`;
}

async function ensure(env){
  await env.DB.batch([
    env.DB.prepare("CREATE TABLE IF NOT EXISTS reqoo_document_sequences(seq_key TEXT PRIMARY KEY,next_number INTEGER NOT NULL DEFAULT 1,updated_at TEXT NOT NULL)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS reqoo_documents(id TEXT PRIMARY KEY,type TEXT NOT NULL CHECK(type IN ('quotation','invoice','receipt','delivery_order')),number TEXT NOT NULL UNIQUE,order_id TEXT NOT NULL,status TEXT NOT NULL,currency TEXT NOT NULL DEFAULT 'MYR',subtotal_minor INTEGER NOT NULL DEFAULT 0,discount_minor INTEGER NOT NULL DEFAULT 0,shipping_minor INTEGER NOT NULL DEFAULT 0,tax_minor INTEGER NOT NULL DEFAULT 0,total_minor INTEGER NOT NULL DEFAULT 0,issued_at TEXT NOT NULL,due_at TEXT,customer_name TEXT,customer_phone TEXT,customer_email TEXT,company_json TEXT NOT NULL DEFAULT '{}',payment_status TEXT,share_token TEXT NOT NULL UNIQUE,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,UNIQUE(order_id,type))"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS reqoo_document_items(id TEXT PRIMARY KEY,document_id TEXT NOT NULL REFERENCES reqoo_documents(id) ON DELETE CASCADE,description TEXT NOT NULL,variation TEXT,quantity REAL NOT NULL DEFAULT 1,unit_price_minor INTEGER NOT NULL DEFAULT 0,line_total_minor INTEGER NOT NULL DEFAULT 0,sort_order INTEGER NOT NULL DEFAULT 0)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS shop_settings(key TEXT PRIMARY KEY,value TEXT,updated_at TEXT NOT NULL)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_reqoo_documents_order ON reqoo_documents(order_id)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_reqoo_documents_type_time ON reqoo_documents(type,created_at)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_reqoo_document_items_doc ON reqoo_document_items(document_id)")
  ]);
  const cols=(await env.DB.prepare('PRAGMA table_info(orders)').all()).results||[];
  if(cols.length&&!cols.some(x=>x.name==='order_no'))await env.DB.prepare('ALTER TABLE orders ADD COLUMN order_no TEXT').run();
  if(cols.length)await env.DB.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_order_no ON orders(order_no)').run();
}

async function settings(env){
  const keys=['document_company_name','document_registration_no','document_address','document_phone','document_email','document_bank','document_quote_valid_days','document_invoice_due_days'];
  const rows=(await env.DB.prepare(`SELECT key,value FROM shop_settings WHERE key IN (${keys.map(()=>'?').join(',')})`).bind(...keys).all()).results||[];
  const m=Object.fromEntries(rows.map(r=>[r.key,r.value||'']));
  return {
    companyName:m.document_company_name||'REQOO.CO',
    registrationNo:m.document_registration_no||'',
    address:m.document_address||'',
    phone:m.document_phone||'',
    email:m.document_email||'',
    bank:m.document_bank||'',
    quoteValidDays:Math.max(0,Math.min(365,Number(m.document_quote_valid_days||7))),
    invoiceDueDays:Math.max(0,Math.min(365,Number(m.document_invoice_due_days||14)))
  };
}
async function nextNumber(type,env){
  const year=new Date().getUTCFullYear(),key=`${type}:${year}`,t=NOW();
  await env.DB.prepare('INSERT OR IGNORE INTO reqoo_document_sequences(seq_key,next_number,updated_at) VALUES(?,1,?)').bind(key,t).run();
  const row=await env.DB.prepare('UPDATE reqoo_document_sequences SET next_number=next_number+1,updated_at=? WHERE seq_key=? RETURNING next_number-1 AS issued').bind(t,key).first();
  return `QT-${year}-${String(Number(row?.issued||1)).padStart(5,'0')}`;
}
async function hydrate(row,env){
  if(!row)return null;
  const items=(await env.DB.prepare('SELECT * FROM reqoo_document_items WHERE document_id=? ORDER BY sort_order,id').bind(row.id).all()).results||[];
  let company={};try{company=JSON.parse(row.company_json||'{}')}catch{}
  return {...row,company,items};
}

function normalizeItems(raw){
  if(!Array.isArray(raw)||!raw.length)throw new Error('Masukkan sekurang-kurangnya satu item quotation');
  return raw.map((item,index)=>{
    const description=S(item?.description,300);
    if(!description)throw new Error(`Description item ${index+1} diperlukan`);
    const quantity=qty(item?.quantity);
    const unit=minor(item?.unit_price_minor??item?.unitPriceMinor,`Harga item ${index+1}`);
    return {
      description,
      variation:S(item?.variation,180),
      quantity,
      unit_price_minor:unit,
      line_total_minor:unit*quantity,
      sort_order:index
    };
  });
}

async function createCustomQuotation(d,env){
  const customerName=S(d.customerName||d.customer_name,200);
  if(!customerName)return J({ok:false,error:'Nama customer diperlukan'},400);
  const items=normalizeItems(d.items);
  const subtotal=items.reduce((sum,x)=>sum+x.line_total_minor,0);
  const discount=minor(d.discountMinor??d.discount_minor,'Discount');
  const shipping=minor(d.shippingMinor??d.shipping_minor,'Delivery / shipping');
  const tax=minor(d.taxMinor??d.tax_minor,'Tax');
  const total=Math.max(0,subtotal-discount+shipping+tax);
  const baseCompany=await settings(env),now=NOW(),id=ID('doc'),number=await nextNumber('quotation',env);
  const status=S(d.status,30)==='draft'?'draft':'issued';
  let dueAt=S(d.dueAt||d.due_at,80);
  if(dueAt&&Number.isNaN(new Date(dueAt).getTime()))return J({ok:false,error:'Tarikh valid until tidak sah'},400);
  if(!dueAt)dueAt=plusDays(now,baseCompany.quoteValidDays);
  const meta={
    customQuote:true,
    customerAddress:S(d.customerAddress||d.customer_address,1000),
    notes:S(d.notes,2000),
    terms:S(d.terms,3000),
    createdBy:'admin'
  };
  const company={...baseCompany,_documentMeta:meta};
  const orderKey=`quote:${id}`;
  const shareToken=`${crypto.randomUUID()}${crypto.randomUUID().replaceAll('-','')}`;
  const header=env.DB.prepare('INSERT INTO reqoo_documents(id,type,number,order_id,status,currency,subtotal_minor,discount_minor,shipping_minor,tax_minor,total_minor,issued_at,due_at,customer_name,customer_phone,customer_email,company_json,payment_status,share_token,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .bind(id,'quotation',number,orderKey,status,'MYR',subtotal,discount,shipping,tax,total,now,dueAt,customerName,S(d.customerPhone||d.customer_phone,80),S(d.customerEmail||d.customer_email,200),JSON.stringify(company),'',shareToken,now,now);
  const itemStatements=items.map(item=>env.DB.prepare('INSERT INTO reqoo_document_items(id,document_id,description,variation,quantity,unit_price_minor,line_total_minor,sort_order) VALUES(?,?,?,?,?,?,?,?)')
    .bind(ID('di'),id,item.description,item.variation,item.quantity,item.unit_price_minor,item.line_total_minor,item.sort_order));
  await env.DB.batch([header,...itemStatements]);
  return J({ok:true,created:true,document:await hydrate(await env.DB.prepare('SELECT * FROM reqoo_documents WHERE id=?').bind(id).first(),env)});
}

async function updateDocumentStatus(d,env){
  const key=S(d.documentId||d.id||d.number,200),status=S(d.status,30).toLowerCase();
  const allowed=new Set(['draft','issued','sent','accepted','rejected','expired']);
  if(!key||!allowed.has(status))return J({ok:false,error:'Status quotation tidak sah'},400);
  const row=await env.DB.prepare('SELECT * FROM reqoo_documents WHERE (id=? OR number=?) AND type=\'quotation\' LIMIT 1').bind(key,key).first();
  if(!row)return J({ok:false,error:'Quotation tidak dijumpai'},404);
  let company={};try{company=JSON.parse(row.company_json||'{}')}catch{}
  if(!quoteMeta(company).customQuote)return J({ok:false,error:'Status hanya boleh diubah untuk Custom Quotation'},409);
  await env.DB.prepare('UPDATE reqoo_documents SET status=?,updated_at=? WHERE id=?').bind(status,NOW(),row.id).run();
  return J({ok:true,document:await hydrate(await env.DB.prepare('SELECT * FROM reqoo_documents WHERE id=?').bind(row.id).first(),env)});
}

async function uniqueOrderNo(env){
  for(let i=0;i<5;i++){
    const ref=orderRef();
    const exists=await env.DB.prepare('SELECT id FROM orders WHERE order_no=? LIMIT 1').bind(ref).first();
    if(!exists)return ref;
  }
  throw new Error('Tidak dapat menjana nombor order unik');
}

async function convertQuotationToOrder(d,env){
  const key=S(d.documentId||d.id||d.number,200);
  if(!key)return J({ok:false,error:'Quotation diperlukan'},400);
  const row=await env.DB.prepare('SELECT * FROM reqoo_documents WHERE (id=? OR number=?) AND type=\'quotation\' LIMIT 1').bind(key,key).first();
  if(!row)return J({ok:false,error:'Quotation tidak dijumpai'},404);
  const doc=await hydrate(row,env),company=doc.company||{},meta=quoteMeta(company);
  if(!meta.customQuote)return J({ok:false,error:'Hanya Custom Quotation boleh ditukar kepada order'},409);
  if(meta.convertedOrderId){
    const existing=await env.DB.prepare('SELECT * FROM orders WHERE id=? LIMIT 1').bind(meta.convertedOrderId).first();
    if(existing)return J({ok:true,created:false,order:existing,document:doc});
  }
  if(!doc.items.length)return J({ok:false,error:'Quotation tiada item'},409);
  const phone=S(doc.customer_phone,80),email=S(doc.customer_email,200),now=NOW();
  let customer=null;
  if(phone)customer=await env.DB.prepare('SELECT * FROM customers WHERE phone=? LIMIT 1').bind(phone).first();
  if(!customer&&email)customer=await env.DB.prepare('SELECT * FROM customers WHERE email=? LIMIT 1').bind(email).first();
  const customerId=customer?.id||ID('cus'),orderId=ID('ord'),orderNo=await uniqueOrderNo(env);
  const statements=[];
  if(customer){
    statements.push(env.DB.prepare('UPDATE customers SET name=?,phone=COALESCE(NULLIF(?,\'\'),phone),email=COALESCE(NULLIF(?,\'\'),email),updated_at=? WHERE id=?').bind(S(doc.customer_name,200)||'Customer',phone,email,now,customerId));
  }else{
    statements.push(env.DB.prepare('INSERT INTO customers(id,name,phone,email,status,created_at,updated_at) VALUES(?,?,?,?,\'active\',?,?)').bind(customerId,S(doc.customer_name,200)||'Customer',phone||null,email||null,now,now));
  }
  statements.push(env.DB.prepare('INSERT INTO orders(id,customer_id,source,currency,subtotal_minor,discount_minor,shipping_minor,tax_minor,total_minor,payment_status,fulfillment_status,referral_code,created_at,updated_at,order_no) VALUES(?,?,?,?,?,?,?,?,?,\'pending\',\'pending\',NULL,?,?,?)')
    .bind(orderId,customerId,'admin_quotation',S(doc.currency,10)||'MYR',Number(doc.subtotal_minor||0),Number(doc.discount_minor||0),Number(doc.shipping_minor||0),Number(doc.tax_minor||0),Number(doc.total_minor||0),now,now,orderNo));
  for(const item of doc.items){
    const quantity=qty(item.quantity);
    statements.push(env.DB.prepare('INSERT INTO order_items(id,order_id,product_id,variation_id,product_name_snapshot,sku_snapshot,variation_snapshot_json,customization_snapshot_json,addons_snapshot_json,unit_price_minor,quantity,line_total_minor,created_at) VALUES(?,?,NULL,NULL,?,NULL,?,?,\'[]\',?,?,?,?)')
      .bind(ID('itm'),orderId,S(item.description,300)||'Custom item',JSON.stringify(item.variation?{name:S(item.variation,180)}:{}),JSON.stringify({quotationNumber:doc.number}),Number(item.unit_price_minor||0),quantity,Number(item.line_total_minor||0),now));
  }
  statements.push(env.DB.prepare('INSERT INTO activity_events(id,customer_id,order_id,event_type,trace_id,metadata_json,created_at) VALUES(?,?,?,?,?,?,?)')
    .bind(ID('evt'),customerId,orderId,'order.created',null,JSON.stringify({source:'admin_quotation',quotationNumber:doc.number}),now));
  const nextCompany={...company,_documentMeta:{...meta,convertedOrderId:orderId,convertedOrderNo:orderNo,convertedAt:now}};
  statements.push(env.DB.prepare('UPDATE reqoo_documents SET order_id=?,status=\'accepted\',company_json=?,updated_at=? WHERE id=?').bind(orderId,JSON.stringify(nextCompany),now,doc.id));
  await env.DB.batch(statements);
  const order=await env.DB.prepare('SELECT * FROM orders WHERE id=? LIMIT 1').bind(orderId).first();
  const fresh=await hydrate(await env.DB.prepare('SELECT * FROM reqoo_documents WHERE id=?').bind(doc.id).first(),env);
  return J({ok:true,created:true,order,document:fresh});
}

export async function onRequest({request,env}){
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:C});
  if(!env.DB)return J({ok:false,error:'D1 binding DB tidak dijumpai'},503);
  const d=await data(request),action=S(d.action,80);
  if(action==='createDocument'&&S(d.type,30).toLowerCase()==='quotation'){
    if(!auth(request,env,d))return J({ok:false,error:'Unauthorized'},401);
    return J({ok:false,error:'Quotation kini dibuat melalui Custom Quotation, bukan daripada order.'},409);
  }
  if(!['createCustomQuotation','updateDocumentStatus','convertQuotationToOrder'].includes(action))return legacy({request,env});
  if(!auth(request,env,d))return J({ok:false,error:'Unauthorized'},401);
  try{
    await ensure(env);
    if(action==='createCustomQuotation')return await createCustomQuotation(d,env);
    if(action==='updateDocumentStatus')return await updateDocumentStatus(d,env);
    if(action==='convertQuotationToOrder')return await convertQuotationToOrder(d,env);
  }catch(error){
    console.error('REQOO custom quotation v18:',error);
    return J({ok:false,error:error?.message||String(error)},500);
  }
}

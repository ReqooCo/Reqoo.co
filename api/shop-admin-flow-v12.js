import { onRequest as legacy } from './shop-admin-flow-v11.js';

const C={'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'Content-Type,X-Admin-Token','cache-control':'no-store'};
const S=v=>String(v??'').trim();
const NOW=()=>new Date().toISOString();
const ID=p=>`${p}_${crypto.randomUUID()}`;
const J=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{'content-type':'application/json;charset=UTF-8',...C}});
const TYPES=new Set(['quotation','invoice','receipt','delivery_order']);
const PREFIX={quotation:'QT',invoice:'INV',receipt:'RC',delivery_order:'DO'};

async function data(request){if(request.method==='GET')return Object.fromEntries(new URL(request.url).searchParams);try{return await request.clone().json()}catch{return {}}}
function auth(request,env,d){const supplied=S(request.headers.get('X-Admin-Token')||d.token),expected=S(env.REQOO_ADMIN_TOKEN||env.SHOP_ADMIN_TOKEN||env.ADMIN_KEY);return !!supplied&&supplied===expected}

async function ensure(env){
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

async function settings(env){
  const keys=['document_company_name','document_registration_no','document_address','document_phone','document_email','document_bank','document_quote_valid_days','document_invoice_due_days'];
  const rows=(await env.DB.prepare(`SELECT key,value FROM shop_settings WHERE key IN (${keys.map(()=>'?').join(',')})`).bind(...keys).all()).results||[];
  const m=Object.fromEntries(rows.map(r=>[r.key,r.value||'']));
  return {
    companyName:m.document_company_name||'REQOO.CO',registrationNo:m.document_registration_no||'',address:m.document_address||'',phone:m.document_phone||'',email:m.document_email||'',bank:m.document_bank||'Bank: MAYBANK\nAccount Name: AB ART TRADING\nAccount No: 5660 1063 5319',
    quoteValidDays:Math.max(0,Math.min(365,Number(m.document_quote_valid_days||7))),invoiceDueDays:Math.max(0,Math.min(365,Number(m.document_invoice_due_days||14)))
  };
}
async function saveSettings(d,env){
  const t=NOW(),pairs=[['document_company_name',d.companyName],['document_registration_no',d.registrationNo],['document_address',d.address],['document_phone',d.phone],['document_email',d.email],['document_bank',d.bank],['document_quote_valid_days',d.quoteValidDays],['document_invoice_due_days',d.invoiceDueDays]];
  for(const [k,v] of pairs)if(v!==undefined)await env.DB.prepare('INSERT OR REPLACE INTO shop_settings(key,value,updated_at) VALUES(?,?,?)').bind(k,S(v),t).run();
  return J({ok:true,settings:await settings(env)});
}
function plusDays(iso,days){const d=new Date(iso);d.setUTCDate(d.getUTCDate()+Number(days||0));return d.toISOString()}
async function nextNumber(type,env){
  const year=new Date().getUTCFullYear(),key=`${type}:${year}`,t=NOW();
  await env.DB.prepare('INSERT OR IGNORE INTO reqoo_document_sequences(seq_key,next_number,updated_at) VALUES(?,1,?)').bind(key,t).run();
  const row=await env.DB.prepare('UPDATE reqoo_document_sequences SET next_number=next_number+1,updated_at=? WHERE seq_key=? RETURNING next_number-1 AS issued').bind(t,key).first();
  return `${PREFIX[type]}-${year}-${String(Number(row?.issued||1)).padStart(5,'0')}`;
}
async function orderSnapshot(d,env){
  const key=S(d.orderId||d.orderRef||d.orderNo||d.id);if(!key)throw new Error('Order diperlukan');
  const o=await env.DB.prepare('SELECT o.*,c.name customer_name,c.phone customer_phone,c.email customer_email FROM orders o LEFT JOIN customers c ON c.id=o.customer_id WHERE o.id=? OR o.order_no=? LIMIT 1').bind(key,key).first();
  if(!o)throw new Error('Order tidak dijumpai');
  const items=(await env.DB.prepare('SELECT * FROM order_items WHERE order_id=? ORDER BY created_at,id').bind(o.id).all()).results||[];
  return {o,items};
}
async function hydrate(row,env){
  if(!row)return null;
  const items=(await env.DB.prepare('SELECT * FROM reqoo_document_items WHERE document_id=? ORDER BY sort_order,id').bind(row.id).all()).results||[];
  let company={};try{company=JSON.parse(row.company_json||'{}')}catch{}
  return {...row,company,items};
}
function documentItems(id,o,items,env,repair=false){
  const rows=items.length?items:[{product_name_snapshot:`Order ${S(o.order_no||o.id)}`,quantity:1,unit_price_minor:o.total_minor,line_total_minor:o.total_minor}];
  return rows.map((item,ix)=>{
    let v={};try{v=JSON.parse(item.variation_snapshot_json||'{}')}catch{}
    // Stable repair ids make simultaneous retries idempotent.
    const sql=repair?'INSERT OR IGNORE INTO reqoo_document_items':'INSERT INTO reqoo_document_items';
    return env.DB.prepare(sql+'(id,document_id,description,variation,quantity,unit_price_minor,line_total_minor,sort_order) VALUES(?,?,?,?,?,?,?,?)').bind(repair?`${id}_repair_${ix}`:ID('di'),id,S(item.product_name_snapshot||'Item'),S(v.name),Number(item.quantity||1),Number(item.unit_price_minor||0),Number(item.line_total_minor||0),ix);
  });
}
async function createDocument(d,env){
  const type=S(d.type).toLowerCase();if(!TYPES.has(type))return J({ok:false,error:'Jenis dokumen tidak sah'},400);
  const {o,items}=await orderSnapshot(d,env);
  if(type==='receipt'&&S(o.payment_status).toLowerCase()!=='paid')return J({ok:false,error:'Receipt hanya boleh dikeluarkan selepas bayaran disahkan.'},409);
  const existing=await env.DB.prepare('SELECT * FROM reqoo_documents WHERE order_id=? AND type=? LIMIT 1').bind(o.id,type).first();
  if(existing){
    const doc=await hydrate(existing,env);
    if(doc.items.length)return J({ok:true,created:false,document:doc});
    // Repair a header left behind by the previous non-atomic writer.
    await env.DB.batch(documentItems(existing.id,o,items,env,true));
    return J({ok:true,created:false,repaired:true,document:await hydrate(existing,env)});
  }
  const company=await settings(env),now=NOW(),number=await nextNumber(type,env),id=ID('doc'),shareToken=`${crypto.randomUUID()}${crypto.randomUUID().replaceAll('-','')}`;
  const dueAt=S(d.dueAt)||((type==='quotation')?plusDays(now,company.quoteValidDays):(type==='invoice')?plusDays(now,company.invoiceDueDays):null);
  const status=type==='receipt'?'paid':(type==='invoice'&&S(o.payment_status).toLowerCase()==='paid')?'paid':'issued';
  const vals={subtotal:Number(o.subtotal_minor||0),discount:Number(o.discount_minor||0),shipping:Number(o.shipping_minor||0),tax:Number(o.tax_minor||0),total:Number(o.total_minor||0)};
  const header=env.DB.prepare('INSERT INTO reqoo_documents(id,type,number,order_id,status,currency,subtotal_minor,discount_minor,shipping_minor,tax_minor,total_minor,issued_at,due_at,customer_name,customer_phone,customer_email,company_json,payment_status,share_token,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(id,type,number,o.id,status,S(o.currency||'MYR'),vals.subtotal,vals.discount,vals.shipping,vals.tax,vals.total,now,dueAt,S(o.customer_name),S(o.customer_phone),S(o.customer_email),JSON.stringify(company),S(o.payment_status),shareToken,now,now);
  await env.DB.batch([header,...documentItems(id,o,items,env)]);
  const row=await env.DB.prepare('SELECT * FROM reqoo_documents WHERE id=?').bind(id).first();
  return J({ok:true,created:true,document:await hydrate(row,env)});
}
async function documentLinks(d,env){
  const {o}=await orderSnapshot(d,env);
  if(o.payment_status!=='paid')return J({ok:false,error:'Sahkan bayaran sebelum menjana invoice dan resit.'},409);
  const invoiceResponse=await createDocument({...d,type:'invoice'},env);
  if(!invoiceResponse.ok)return invoiceResponse;
  const receiptResponse=await createDocument({...d,type:'receipt'},env);
  if(!receiptResponse.ok)return receiptResponse;
  const invoice=await invoiceResponse.json(),receipt=await receiptResponse.json();
  return J({ok:true,invoiceUrl:`https://reqoo.co/d/${invoice.document.share_token}`,receiptUrl:`https://reqoo.co/d/${receipt.document.share_token}`});
}
async function listDocuments(d,env){
  const limit=Math.min(500,Math.max(1,Number(d.limit||100))),type=S(d.type),orderId=S(d.orderId||d.orderRef);
  let sql='SELECT * FROM reqoo_documents',args=[];const where=[];
  if(type){where.push('type=?');args.push(type)}if(orderId){where.push('order_id=?');args.push(orderId)}if(where.length)sql+=' WHERE '+where.join(' AND ');sql+=' ORDER BY created_at DESC LIMIT ?';args.push(limit);
  const rows=(await env.DB.prepare(sql).bind(...args).all()).results||[];return J({ok:true,documents:rows});
}
async function getDocument(d,env){const key=S(d.documentId||d.id||d.number);const row=await env.DB.prepare('SELECT * FROM reqoo_documents WHERE id=? OR number=? LIMIT 1').bind(key,key).first();if(!row)return J({ok:false,error:'Dokumen tidak dijumpai'},404);return J({ok:true,document:await hydrate(row,env)});}
async function publicDocument(d,env){const token=S(d.shareToken||d.token);if(!token||token.length<40)return J({ok:false,error:'Link dokumen tidak sah'},404);const row=await env.DB.prepare('SELECT * FROM reqoo_documents WHERE share_token=? LIMIT 1').bind(token).first();if(!row)return J({ok:false,error:'Dokumen tidak dijumpai'},404);const doc=await hydrate(row,env);delete doc.share_token;return J({ok:true,document:doc});}

export async function onRequest({request,env}){
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:C});
  if(!env.DB)return J({ok:false,error:'D1 binding DB tidak dijumpai'},503);
  try{
    const d=await data(request),action=S(d.action);
    if(action==='publicDocument'){await ensure(env);return await publicDocument(d,env);}
    if(['createDocument','listDocuments','getDocument','documentSettings','saveDocumentSettings','documentLinks'].includes(action)){
      if(!auth(request,env,d))return J({ok:false,error:'Unauthorized'},401);
      await ensure(env);
      if(action==='documentLinks')return await documentLinks(d,env);
      if(action==='createDocument')return await createDocument(d,env);
      if(action==='listDocuments')return await listDocuments(d,env);
      if(action==='getDocument')return await getDocument(d,env);
      if(action==='documentSettings')return J({ok:true,settings:await settings(env)});
      if(action==='saveDocumentSettings')return await saveSettings(d,env);
    }
    return legacy({request,env});
  }catch(e){console.error('REQOO documents v12:',e);return J({ok:false,error:e?.message||String(e)},500)}
}

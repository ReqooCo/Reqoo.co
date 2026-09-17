import { onRequest as legacy } from './shop-admin-flow-v17.js';

const C={'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'Content-Type,X-Admin-Token','cache-control':'no-store'};
const S=v=>String(v??'').trim();
const NOW=()=>new Date().toISOString();
const ID=p=>`${p}_${crypto.randomUUID()}`;
const J=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{'content-type':'application/json;charset=UTF-8',...C}});

async function data(request){
  if(request.method==='GET')return Object.fromEntries(new URL(request.url).searchParams);
  try{return await request.clone().json()}catch{return {}}
}
function auth(request,env,d){
  const supplied=S(request.headers.get('X-Admin-Token')||d.token),expected=S(env.REQOO_ADMIN_TOKEN||env.SHOP_ADMIN_TOKEN||env.ADMIN_KEY);
  return !!supplied&&supplied===expected;
}
function money(v,max=1000000000){const n=Math.round(Number(v||0));return Number.isFinite(n)?Math.max(0,Math.min(max,n)):0}
async function ensure(env){
  await env.DB.batch([
    env.DB.prepare("CREATE TABLE IF NOT EXISTS reqoo_payments(id TEXT PRIMARY KEY,order_id TEXT NOT NULL,invoice_document_id TEXT,receipt_number TEXT NOT NULL UNIQUE,amount_minor INTEGER NOT NULL,payment_type TEXT NOT NULL CHECK(payment_type IN ('deposit','partial','final','full')),method TEXT NOT NULL,reference TEXT,note TEXT,paid_at TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'confirmed',share_token TEXT NOT NULL UNIQUE,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)"),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_reqoo_payments_order ON reqoo_payments(order_id,paid_at)'),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_reqoo_payments_invoice ON reqoo_payments(invoice_document_id,paid_at)'),
    env.DB.prepare('CREATE TABLE IF NOT EXISTS reqoo_document_sequences(seq_key TEXT PRIMARY KEY,next_number INTEGER NOT NULL DEFAULT 1,updated_at TEXT NOT NULL)')
  ]);
}
function receiptSeq(number,year){
  const m=String(number||'').match(new RegExp(`^RC-${year}-(\\d+)$`));
  return m?Number(m[1]||0):0;
}
async function maxExistingReceiptSeq(env,year){
  const like=`RC-${year}-%`;
  let max=0;
  try{
    const docs=(await env.DB.prepare("SELECT number FROM reqoo_documents WHERE type='receipt' AND number LIKE ?").bind(like).all()).results||[];
    for(const r of docs)max=Math.max(max,receiptSeq(r.number,year));
  }catch{}
  const pays=(await env.DB.prepare('SELECT receipt_number FROM reqoo_payments WHERE receipt_number LIKE ?').bind(like).all()).results||[];
  for(const r of pays)max=Math.max(max,receiptSeq(r.receipt_number,year));
  return max;
}
async function receiptNumberExists(env,number){
  const payment=await env.DB.prepare('SELECT id FROM reqoo_payments WHERE receipt_number=? LIMIT 1').bind(number).first();
  if(payment)return true;
  try{return !!(await env.DB.prepare("SELECT id FROM reqoo_documents WHERE type='receipt' AND number=? LIMIT 1").bind(number).first())}catch{return false}
}
async function nextReceiptNumber(env){
  const year=new Date().getUTCFullYear(),key=`payment_receipt:${year}`,t=NOW();
  await env.DB.prepare('INSERT OR IGNORE INTO reqoo_document_sequences(seq_key,next_number,updated_at) VALUES(?,1,?)').bind(key,t).run();
  const floor=(await maxExistingReceiptSeq(env,year))+1;
  await env.DB.prepare('UPDATE reqoo_document_sequences SET next_number=CASE WHEN next_number<? THEN ? ELSE next_number END,updated_at=? WHERE seq_key=?').bind(floor,floor,t,key).run();
  for(let i=0;i<50;i++){
    const row=await env.DB.prepare('UPDATE reqoo_document_sequences SET next_number=next_number+1,updated_at=? WHERE seq_key=? RETURNING next_number-1 AS issued').bind(NOW(),key).first();
    const number=`RC-${year}-${String(Number(row?.issued||1)).padStart(5,'0')}`;
    if(!(await receiptNumberExists(env,number)))return number;
  }
  throw new Error('Nombor receipt unik gagal dijana.');
}
async function orderByKey(key,env){
  return env.DB.prepare('SELECT o.*,c.name customer_name,c.phone customer_phone,c.email customer_email FROM orders o LEFT JOIN customers c ON c.id=o.customer_id WHERE o.id=? OR o.order_no=? LIMIT 1').bind(key,key).first();
}
async function paymentsFor(orderId,env){
  return (await env.DB.prepare("SELECT * FROM reqoo_payments WHERE order_id=? AND status='confirmed' ORDER BY paid_at,created_at,id").bind(orderId).all()).results||[];
}
async function invoiceForOrder(orderId,env){
  try{return await env.DB.prepare("SELECT id,number,total_minor FROM reqoo_documents WHERE order_id=? AND type='invoice' ORDER BY created_at,id LIMIT 1").bind(orderId).first()}catch{return null}
}
async function summaryForOrder(o,env){
  const payments=await paymentsFor(o.id,env),invoice=await invoiceForOrder(o.id,env),rawPaid=payments.reduce((s,p)=>s+Number(p.amount_minor||0),0),total=Number(invoice?.total_minor??o.total_minor??0),paid=Math.min(total,rawPaid),balance=Math.max(0,total-rawPaid),overpaid=Math.max(0,rawPaid-total);
  const paymentStatus=overpaid>0?'paid':balance<=0&&total>0?'paid':paid>0?'partial':S(o.payment_status||'pending').toLowerCase()==='paid'?'paid':'pending';
  return {orderId:o.id,orderNo:o.order_no||o.id,invoiceId:invoice?.id||null,invoiceNumber:invoice?.number||null,totalMinor:total,paidMinor:paid,rawPaidMinor:rawPaid,balanceMinor:balance,overpaidMinor:overpaid,paymentStatus,payments};
}
async function ensureInvoice(request,o,env){
  let invoice=await env.DB.prepare("SELECT * FROM reqoo_documents WHERE order_id=? AND type='invoice' LIMIT 1").bind(o.id).first();
  if(invoice)return invoice;
  const headers=new Headers(request.headers);headers.set('content-type','application/json');
  const r=await legacy({request:new Request(request.url,{method:'POST',headers,body:JSON.stringify({action:'createDocument',type:'invoice',orderId:o.id})}),env});
  let out={};try{out=await r.clone().json()}catch{}
  if(!r.ok||out.ok===false)throw new Error(out.error||'Invoice gagal dijana.');
  invoice=await env.DB.prepare("SELECT * FROM reqoo_documents WHERE order_id=? AND type='invoice' LIMIT 1").bind(o.id).first();
  if(!invoice)throw new Error('Invoice tidak dijumpai selepas dijana.');
  return invoice;
}
function normalizeType(input,paidBefore,amount,total,balanceBefore){
  const requested=S(input).toLowerCase();
  if(['deposit','partial','final','full'].includes(requested))return requested;
  if(paidBefore===0&&amount>=total)return'full';
  if(amount>=balanceBefore)return'final';
  if(paidBefore===0)return'deposit';
  return'partial';
}
async function recordPayment(d,request,env){
  await ensure(env);
  const key=S(d.orderId||d.orderNo||d.orderRef);if(!key)return J({ok:false,error:'Order diperlukan.'},400);
  const o=await orderByKey(key,env);if(!o)return J({ok:false,error:'Order tidak dijumpai.'},404);
  const invoice=await ensureInvoice(request,o,env),before=await summaryForOrder(o,env),amount=money(d.amountMinor);
  if(amount<=0)return J({ok:false,error:'Amaun bayaran mesti lebih daripada RM0.00.'},400);
  if(before.balanceMinor<=0)return J({ok:false,error:'Invoice telah selesai dibayar.'},409);
  if(amount>before.balanceMinor)return J({ok:false,error:`Amaun melebihi baki semasa.`},409);
  const now=NOW(),paidAt=S(d.paidAt)||now,type=normalizeType(d.paymentType,before.paidMinor,amount,before.totalMinor,before.balanceMinor),method=S(d.method||'bank_transfer').slice(0,80)||'bank_transfer',reference=S(d.reference).slice(0,160),note=S(d.note).slice(0,1000),receiptNumber=await nextReceiptNumber(env),id=ID('pay'),shareToken=`${crypto.randomUUID()}${crypto.randomUUID().replaceAll('-','')}`;
  const paidAfter=before.paidMinor+amount,balanceAfter=Math.max(0,before.totalMinor-paidAfter),status=balanceAfter===0?'paid':'partial';
  const stmts=[
    env.DB.prepare('INSERT INTO reqoo_payments(id,order_id,invoice_document_id,receipt_number,amount_minor,payment_type,method,reference,note,paid_at,status,share_token,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(id,o.id,invoice.id,receiptNumber,amount,type,method,reference||null,note||null,paidAt,'confirmed',shareToken,now,now),
    env.DB.prepare('UPDATE orders SET payment_status=?,updated_at=? WHERE id=?').bind(status,now,o.id),
    env.DB.prepare("UPDATE reqoo_documents SET payment_status=?,status=CASE WHEN type='invoice' THEN ? ELSE status END,updated_at=? WHERE order_id=?").bind(status,status,now,o.id)
  ];
  await env.DB.batch(stmts);
  const fresh=await orderByKey(o.id,env),summary=await summaryForOrder(fresh,env);
  return J({ok:true,payment:{id,order_id:o.id,invoice_document_id:invoice.id,receipt_number:receiptNumber,amount_minor:amount,payment_type:type,method,reference,note,paid_at:paidAt,status:'confirmed',share_token:shareToken},invoice:{id:invoice.id,number:invoice.number,totalMinor:summary.totalMinor,paidMinor:summary.paidMinor,balanceMinor:summary.balanceMinor,paymentStatus:summary.paymentStatus},summary});
}
async function listPayments(d,env){
  await ensure(env);const orderId=S(d.orderId),invoiceId=S(d.invoiceId),limit=Math.min(500,Math.max(1,Number(d.limit||200)));let sql="SELECT p.*,o.order_no,o.total_minor,c.name customer_name,c.phone customer_phone,c.email customer_email,rd.number invoice_number FROM reqoo_payments p JOIN orders o ON o.id=p.order_id LEFT JOIN customers c ON c.id=o.customer_id LEFT JOIN reqoo_documents rd ON rd.id=p.invoice_document_id WHERE p.status='confirmed'",args=[];
  if(orderId){sql+=' AND p.order_id=?';args.push(orderId)}if(invoiceId){sql+=' AND p.invoice_document_id=?';args.push(invoiceId)}sql+=' ORDER BY p.paid_at DESC,p.created_at DESC LIMIT ?';args.push(limit);
  const payments=(await env.DB.prepare(sql).bind(...args).all()).results||[];return J({ok:true,payments});
}
async function paymentSummary(d,env){
  await ensure(env);const key=S(d.orderId||d.orderNo||d.orderRef);if(key){const o=await orderByKey(key,env);if(!o)return J({ok:false,error:'Order tidak dijumpai.'},404);return J({ok:true,summary:await summaryForOrder(o,env)});}
  const rows=(await env.DB.prepare("SELECT o.id,o.order_no,o.total_minor order_total_minor,o.payment_status,COALESCE((SELECT d.total_minor FROM reqoo_documents d WHERE d.order_id=o.id AND d.type='invoice' ORDER BY d.created_at,d.id LIMIT 1),o.total_minor) billing_total_minor,COALESCE(SUM(CASE WHEN p.status='confirmed' THEN p.amount_minor ELSE 0 END),0) paid_minor FROM orders o LEFT JOIN reqoo_payments p ON p.order_id=o.id GROUP BY o.id,o.order_no,o.total_minor,o.payment_status ORDER BY o.created_at DESC LIMIT 500").all()).results||[];
  return J({ok:true,summaries:rows.map(r=>{const total=Number(r.billing_total_minor||0),rawPaid=Number(r.paid_minor||0),paid=Math.min(total,rawPaid),balance=Math.max(0,total-rawPaid),overpaid=Math.max(0,rawPaid-total);return{orderId:r.id,orderNo:r.order_no||r.id,totalMinor:total,paidMinor:paid,rawPaidMinor:rawPaid,balanceMinor:balance,overpaidMinor:overpaid,paymentStatus:overpaid>0?'paid':balance===0&&total>0?'paid':paid>0?'partial':S(r.payment_status||'pending').toLowerCase()}})});
}
async function getPaymentReceipt(d,env){
  await ensure(env);const key=S(d.paymentId||d.receiptNumber||d.shareToken);if(!key)return J({ok:false,error:'Receipt diperlukan.'},400);
  const p=await env.DB.prepare("SELECT p.*,o.order_no,o.total_minor,o.currency,c.name customer_name,c.phone customer_phone,c.email customer_email,rd.number invoice_number FROM reqoo_payments p JOIN orders o ON o.id=p.order_id LEFT JOIN customers c ON c.id=o.customer_id LEFT JOIN reqoo_documents rd ON rd.id=p.invoice_document_id WHERE p.id=? OR p.receipt_number=? OR p.share_token=? LIMIT 1").bind(key,key,key).first();
  if(!p)return J({ok:false,error:'Receipt tidak dijumpai.'},404);
  const companyRows=(await env.DB.prepare("SELECT key,value FROM shop_settings WHERE key IN ('document_company_name','document_registration_no','document_address','document_phone','document_email')").all()).results||[],m=Object.fromEntries(companyRows.map(r=>[r.key,r.value||'']));
  const o=await orderByKey(p.order_id,env),summary=await summaryForOrder(o,env);return J({ok:true,receipt:{...p,company:{companyName:m.document_company_name||'REQOO.CO',registrationNo:m.document_registration_no||'',address:m.document_address||'',phone:m.document_phone||'',email:m.document_email||''},summary}});
}
async function canonicalDocuments(d,request,env){
  await ensure(env);
  const r=await legacy({request,env});if(!r.ok)return r;
  let out={};try{out=await r.clone().json()}catch{return r}
  if(!out.ok||!Array.isArray(out.documents))return r;
  const used=(await env.DB.prepare("SELECT receipt_number FROM reqoo_payments WHERE status='confirmed'").all()).results||[];
  const canonical=new Set(used.map(x=>S(x.receipt_number)).filter(Boolean));
  const documents=out.documents.filter(doc=>!(doc?.type==='receipt'&&canonical.has(S(doc.number))));
  return J({...out,documents,hiddenLegacyReceiptCollisions:out.documents.length-documents.length},r.status);
}
async function documentIntegrityAudit(env){
  await ensure(env);
  const collisions=(await env.DB.prepare("SELECT d.id document_id,d.number,p.id payment_id,p.order_id FROM reqoo_documents d JOIN reqoo_payments p ON p.receipt_number=d.number WHERE d.type='receipt' AND p.status='confirmed' ORDER BY d.created_at DESC").all()).results||[];
  const mismatches=(await env.DB.prepare("SELECT d.id document_id,d.number,d.order_id,d.total_minor invoice_total_minor,o.total_minor order_total_minor FROM reqoo_documents d JOIN orders o ON o.id=d.order_id WHERE d.type='invoice' AND d.total_minor<>o.total_minor ORDER BY d.created_at DESC LIMIT 200").all()).results||[];
  const overpaid=(await env.DB.prepare("SELECT d.id document_id,d.number,d.order_id,d.total_minor invoice_total_minor,COALESCE(SUM(CASE WHEN p.status='confirmed' THEN p.amount_minor ELSE 0 END),0) paid_minor FROM reqoo_documents d LEFT JOIN reqoo_payments p ON p.order_id=d.order_id WHERE d.type='invoice' GROUP BY d.id,d.number,d.order_id,d.total_minor HAVING paid_minor>d.total_minor ORDER BY paid_minor-d.total_minor DESC LIMIT 200").all()).results||[];
  return J({ok:true,audit:{receiptNumberCollisions:collisions.length,invoiceOrderTotalMismatches:mismatches.length,overpaidInvoices:overpaid.length,collisions,mismatches,overpaid}});
}

export async function onRequest({request,env}){
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:C});
  if(!env.DB)return J({ok:false,error:'D1 binding DB tidak dijumpai'},503);
  try{
    const d=await data(request),action=S(d.action);
    if(['recordPayment','listPayments','paymentSummary','getPaymentReceipt','listDocuments','documentIntegrityAudit'].includes(action)){
      if(!auth(request,env,d))return J({ok:false,error:'Unauthorized'},401);
      if(action==='recordPayment')return await recordPayment(d,request,env);
      if(action==='listPayments')return await listPayments(d,env);
      if(action==='paymentSummary')return await paymentSummary(d,env);
      if(action==='getPaymentReceipt')return await getPaymentReceipt(d,env);
      if(action==='listDocuments')return await canonicalDocuments(d,request,env);
      if(action==='documentIntegrityAudit')return await documentIntegrityAudit(env);
    }
    return legacy({request,env});
  }catch(e){console.error('REQOO payment ledger v18:',e);return J({ok:false,error:e?.message||String(e)},500)}
}

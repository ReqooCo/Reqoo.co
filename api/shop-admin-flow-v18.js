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
const ENSURE_CACHE=new WeakMap();
async function ensure(env){
  const db=env?.DB;if(!db)throw new Error('D1 binding DB tidak dijumpai');
  let pending=ENSURE_CACHE.get(db);if(pending)return pending;
  pending=db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS reqoo_payments(id TEXT PRIMARY KEY,order_id TEXT NOT NULL,invoice_document_id TEXT,receipt_number TEXT NOT NULL UNIQUE,amount_minor INTEGER NOT NULL,payment_type TEXT NOT NULL CHECK(payment_type IN ('deposit','partial','final','full')),method TEXT NOT NULL,reference TEXT,note TEXT,paid_at TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'confirmed',share_token TEXT NOT NULL UNIQUE,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)"),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_reqoo_payments_order ON reqoo_payments(order_id,paid_at)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_reqoo_payments_invoice ON reqoo_payments(invoice_document_id,paid_at)'),
    db.prepare('CREATE TABLE IF NOT EXISTS reqoo_document_sequences(seq_key TEXT PRIMARY KEY,next_number INTEGER NOT NULL DEFAULT 1,updated_at TEXT NOT NULL)')
  ]).catch(error=>{ENSURE_CACHE.delete(db);throw error});
  ENSURE_CACHE.set(db,pending);
  return pending;
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

async function syncLegacyPaidPayments(env,orderId=''){
  // Fast path: repair missing invoice links in one set-based statement, then only
  // inspect legacy payments that have not already been imported.
  try{
    await env.DB.prepare("UPDATE reqoo_payments SET invoice_document_id=(SELECT d.id FROM reqoo_documents d WHERE d.order_id=reqoo_payments.order_id AND d.type='invoice' ORDER BY d.created_at,d.id LIMIT 1),updated_at=? WHERE (invoice_document_id IS NULL OR TRIM(invoice_document_id)='') AND EXISTS(SELECT 1 FROM reqoo_documents d2 WHERE d2.order_id=reqoo_payments.order_id AND d2.type='invoice')").bind(NOW()).run();
  }catch{}
  let sql="SELECT p.id,p.order_id,p.provider,p.provider_reference,p.method,p.amount_minor,p.paid_at,p.created_at,p.updated_at,o.total_minor FROM payments p JOIN orders o ON o.id=p.order_id WHERE p.status='paid' AND o.payment_status='paid' AND NOT EXISTS(SELECT 1 FROM reqoo_payments rp WHERE rp.id=('legacy_'||p.id) OR (rp.order_id=p.order_id AND rp.reference=COALESCE(NULLIF(TRIM(p.provider_reference),''),p.id)))",args=[];
  if(orderId){sql+=' AND p.order_id=?';args.push(orderId)}
  sql+=' ORDER BY COALESCE(p.paid_at,p.updated_at,p.created_at),p.id LIMIT 500';
  const rows=(await env.DB.prepare(sql).bind(...args).all()).results||[];
  let imported=0;
  for(const row of rows){
    const legacyId=`legacy_${S(row.id)}`,reference=S(row.provider_reference)||S(row.id);
    const [invoice,totals]=await Promise.all([
      invoiceForOrder(row.order_id,env),
      env.DB.prepare("SELECT COALESCE(SUM(CASE WHEN status='confirmed' THEN amount_minor ELSE 0 END),0) paid_minor FROM reqoo_payments WHERE order_id=?").bind(row.order_id).first()
    ]);
    const orderTotal=Number(invoice?.total_minor??row.total_minor??0),already=Math.max(0,Number(totals?.paid_minor||0));
    if(orderTotal>0&&already>=orderTotal)continue;
    let amount=money(row.amount_minor);
    if(orderTotal>0)amount=Math.min(amount,Math.max(0,orderTotal-already));
    if(amount<=0)continue;
    const receiptNumber=await nextReceiptNumber(env),paidAt=S(row.paid_at||row.updated_at||row.created_at)||NOW(),remaining=Math.max(0,orderTotal-already),type=already===0&&orderTotal>0&&amount>=orderTotal?'full':amount>=remaining?'final':already===0?'deposit':'partial',method=S(row.method||row.provider||'provider').slice(0,80)||'provider',note=`Imported from ${S(row.provider)||'legacy'} payment`,shareToken=`${crypto.randomUUID()}${crypto.randomUUID().replaceAll('-','')}`,now=NOW();
    const result=await env.DB.prepare('INSERT OR IGNORE INTO reqoo_payments(id,order_id,invoice_document_id,receipt_number,amount_minor,payment_type,method,reference,note,paid_at,status,share_token,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(legacyId,row.order_id,invoice?.id||null,receiptNumber,amount,type,method,reference,note,paidAt,'confirmed',shareToken,now,now).run();
    if(Number(result?.meta?.changes||result?.changes||0)>0)imported++;
  }
  return imported;
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
  await syncLegacyPaidPayments(env,o.id);
  const payments=await paymentsFor(o.id,env),invoice=await invoiceForOrder(o.id,env),rawPaid=payments.reduce((s,p)=>s+Number(p.amount_minor||0),0),total=Number(invoice?.total_minor??o.total_minor??0),paid=Math.min(total,rawPaid),balance=Math.max(0,total-rawPaid),overpaid=Math.max(0,rawPaid-total);
  const paymentStatus=overpaid>0?'paid':balance<=0&&total>0?'paid':paid>0?'partial':S(o.payment_status||'pending').toLowerCase()==='paid'?'paid':'pending';
  return {orderId:o.id,orderNo:o.order_no||o.id,invoiceId:invoice?.id||null,invoiceNumber:invoice?.number||null,totalMinor:total,paidMinor:paid,rawPaidMinor:rawPaid,balanceMinor:balance,overpaidMinor:overpaid,paymentStatus,payments};
}
async function ensureInvoice(request,o,env){
  let invoice=null;
  try{invoice=await env.DB.prepare("SELECT * FROM reqoo_documents WHERE order_id=? AND type='invoice' LIMIT 1").bind(o.id).first()}catch{}
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
async function correctPayment(d,env){
  await ensure(env);
  const key=S(d.orderId||d.orderNo||d.orderRef);if(!key)return J({ok:false,error:'Order diperlukan.'},400);
  const o=await orderByKey(key,env);if(!o)return J({ok:false,error:'Order tidak dijumpai.'},404);
  const before=await summaryForOrder(o,env),actual=money(d.actualPaidMinor);
  if(before.totalMinor<=0)return J({ok:false,error:'Jumlah invoice tidak sah.'},409);
  if(actual<=0||actual>=before.totalMinor)return J({ok:false,error:'Amaun pembetulan mesti lebih RM0.00 dan kurang daripada jumlah invoice.'},400);
  if(before.paymentStatus!=='paid')return J({ok:false,error:'Status semasa bukan PAID. Muat semula dokumen dahulu.'},409);
  const confirmed=(before.payments||[]).filter(p=>S(p.status).toLowerCase()==='confirmed');
  if(confirmed.length!==1)return J({ok:false,error:'Pembetulan automatik hanya dibenarkan apabila ada satu rekod bayaran. Semak Payment Timeline dahulu.'},409);
  const p=confirmed[0],now=NOW(),type=S(d.paymentType).toLowerCase()==='partial'?'partial':'deposit';
  const reason=S(d.reason||'Pembetulan: bayaran sebenar ialah deposit/partial').slice(0,500);
  const oldNote=S(p.note),note=(oldNote?oldNote+' | ':'')+reason;
  const stmts=[
    env.DB.prepare("UPDATE reqoo_payments SET amount_minor=?,payment_type=?,note=?,updated_at=? WHERE id=? AND status='confirmed'").bind(actual,type,note,now,p.id),
    env.DB.prepare("UPDATE orders SET payment_status='partial',updated_at=? WHERE id=?").bind(now,o.id),
    env.DB.prepare("UPDATE reqoo_documents SET payment_status='partial',status=CASE WHEN type='invoice' THEN 'partial' ELSE status END,updated_at=? WHERE order_id=?").bind(now,o.id)
  ];
  if(S(p.id).startsWith('legacy_')){
    const legacyId=S(p.id).slice(7);
    stmts.push(env.DB.prepare("UPDATE payments SET amount_minor=?,updated_at=? WHERE id=? AND order_id=?").bind(actual,now,legacyId,o.id));
  }
  await env.DB.batch(stmts);
  try{await env.DB.prepare("UPDATE documents SET status=CASE WHEN type='invoice' THEN 'partial' WHEN type='receipt' THEN 'void' ELSE status END,updated_at=? WHERE order_id=?").bind(now,o.id).run()}catch{}
  try{await env.DB.prepare('INSERT INTO activity_events(id,order_id,event_type,trace_id,metadata_json,created_at) VALUES(?,?,?,?,?,?)').bind(ID('evt'),o.id,'payment.corrected',o.id,JSON.stringify({paymentId:p.id,fromMinor:Number(p.amount_minor||0),toMinor:actual,reason}),now).run()}catch{}
  const fresh=await orderByKey(o.id,env),summary=await summaryForOrder(fresh,env);
  return J({ok:true,payment:{...p,amount_minor:actual,payment_type:type,note},summary});
}
async function listPayments(d,env){
  await ensure(env);const orderId=S(d.orderId),invoiceId=S(d.invoiceId),limit=Math.min(2000,Math.max(1,Number(d.limit||200)));await syncLegacyPaidPayments(env,orderId);let sql="SELECT p.*,o.order_no,o.total_minor,c.name customer_name,c.phone customer_phone,c.email customer_email,rd.number invoice_number FROM reqoo_payments p JOIN orders o ON o.id=p.order_id LEFT JOIN customers c ON c.id=o.customer_id LEFT JOIN reqoo_documents rd ON rd.id=p.invoice_document_id WHERE p.status='confirmed'",args=[];
  if(orderId){sql+=' AND p.order_id=?';args.push(orderId)}if(invoiceId){sql+=' AND p.invoice_document_id=?';args.push(invoiceId)}sql+=' ORDER BY p.paid_at DESC,p.created_at DESC LIMIT ?';args.push(limit);
  const payments=(await env.DB.prepare(sql).bind(...args).all()).results||[];return J({ok:true,payments});
}
async function paymentSummary(d,env){
  await ensure(env);const key=S(d.orderId||d.orderNo||d.orderRef);if(key){const o=await orderByKey(key,env);if(!o)return J({ok:false,error:'Order tidak dijumpai.'},404);return J({ok:true,summary:await summaryForOrder(o,env)});}
  await syncLegacyPaidPayments(env);
  const rows=(await env.DB.prepare("SELECT o.id,o.order_no,o.total_minor order_total_minor,o.payment_status,COALESCE((SELECT d.total_minor FROM reqoo_documents d WHERE d.order_id=o.id AND d.type='invoice' ORDER BY d.created_at,d.id LIMIT 1),o.total_minor) billing_total_minor,COALESCE(SUM(CASE WHEN p.status='confirmed' THEN p.amount_minor ELSE 0 END),0) paid_minor FROM orders o LEFT JOIN reqoo_payments p ON p.order_id=o.id GROUP BY o.id,o.order_no,o.total_minor,o.payment_status ORDER BY o.created_at DESC LIMIT 2000").all()).results||[];
  return J({ok:true,summaries:rows.map(r=>{const total=Number(r.billing_total_minor||0),rawPaid=Number(r.paid_minor||0),paid=Math.min(total,rawPaid),balance=Math.max(0,total-rawPaid),overpaid=Math.max(0,rawPaid-total);return{orderId:r.id,orderNo:r.order_no||r.id,totalMinor:total,paidMinor:paid,rawPaidMinor:rawPaid,balanceMinor:balance,overpaidMinor:overpaid,paymentStatus:overpaid>0?'paid':balance===0&&total>0?'paid':paid>0?'partial':S(r.payment_status||'pending').toLowerCase()}})});
}
async function getPaymentReceipt(d,env){
  await ensure(env);const key=S(d.paymentId||d.receiptNumber||d.shareToken);if(!key)return J({ok:false,error:'Receipt diperlukan.'},400);
  const p=await env.DB.prepare("SELECT p.*,o.order_no,o.total_minor,o.currency,c.name customer_name,c.phone customer_phone,c.email customer_email,rd.number invoice_number FROM reqoo_payments p JOIN orders o ON o.id=p.order_id LEFT JOIN customers c ON c.id=o.customer_id LEFT JOIN reqoo_documents rd ON rd.id=p.invoice_document_id WHERE p.id=? OR p.receipt_number=? OR p.share_token=? LIMIT 1").bind(key,key,key).first();
  if(!p)return J({ok:false,error:'Receipt tidak dijumpai.'},404);
  const companyRows=(await env.DB.prepare("SELECT key,value FROM shop_settings WHERE key IN ('document_company_name','document_registration_no','document_address','document_phone','document_email')").all()).results||[],m=Object.fromEntries(companyRows.map(r=>[r.key,r.value||'']));
  const o=await orderByKey(p.order_id,env),summary=await summaryForOrder(o,env);return J({ok:true,receipt:{...p,company:{companyName:m.document_company_name||'REQOO.CO',registrationNo:m.document_registration_no||'',address:m.document_address||'',phone:m.document_phone||'',email:m.document_email||''},summary}});
}



function financeDays(range){const r=S(range||'30').toLowerCase();return r==='all'?0:r==='365'?365:r==='90'?90:30}
function financeRangeSql(range,expr){const days=financeDays(range);return days?("datetime("+expr+")>=datetime('now','-"+days+" days')"):'1=1'}
function financeOrderCte(range){
  const orderRange=financeRangeSql(range,'o.created_at');
  return "WITH order_finance AS ("+
    " SELECT o.id,o.created_at,o.payment_status,o.fulfillment_status,o.total_minor,"+
    " COALESCE((SELECT d.total_minor FROM reqoo_documents d WHERE d.order_id=o.id AND d.type='invoice' ORDER BY d.created_at,d.id LIMIT 1),o.total_minor) billing_total_minor,"+
    " COALESCE((SELECT SUM(p.amount_minor) FROM reqoo_payments p WHERE p.order_id=o.id AND p.status='confirmed'),0) ledger_paid_minor"+
    " FROM orders o WHERE "+orderRange+" AND NOT "+ORDER_CLOSED_SQL+"),"+
    " normalized AS (SELECT *,CASE WHEN ledger_paid_minor>0 THEN ledger_paid_minor WHEN payment_status='paid' THEN billing_total_minor ELSE 0 END raw_paid_minor FROM order_finance),"+
    " final AS (SELECT *,MIN(billing_total_minor,raw_paid_minor) paid_minor,MAX(0,billing_total_minor-raw_paid_minor) balance_minor FROM normalized)";
}
async function financeTransactionData(d,env){
  const range=S(d.range||'30').toLowerCase(),limit=Math.min(100,Math.max(10,Number(d.limit||20))),offset=Math.max(0,Math.min(1000000,Number(d.offset||0))),payRange=financeRangeSql(range,"COALESCE(p.paid_at,p.created_at)");
  const rows=(await env.DB.prepare("SELECT p.*,o.order_no,c.name customer_name FROM reqoo_payments p JOIN orders o ON o.id=p.order_id LEFT JOIN customers c ON c.id=o.customer_id WHERE p.status='confirmed' AND "+payRange+" ORDER BY COALESCE(p.paid_at,p.created_at) DESC,p.id DESC LIMIT ? OFFSET ?").bind(limit+1,offset).all()).results||[];
  return{transactions:rows.slice(0,limit),offset,limit,hasMore:rows.length>limit};
}
async function financeTransactions(d,env){
  await ensure(env);await syncLegacyPaidPayments(env);
  return J({ok:true,...await financeTransactionData(d,env)});
}
async function financeDashboard(d,env){
  await ensure(env);await syncLegacyPaidPayments(env);
  const range=S(d.range||'30').toLowerCase(),cte=financeOrderCte(range),payRange=financeRangeSql(range,"COALESCE(p.paid_at,p.created_at)");
  const [collection,state,trendResult,productsResult,tx]=await Promise.all([
    env.DB.prepare("SELECT COALESCE(SUM(p.amount_minor),0) collected_minor,COUNT(DISTINCT p.order_id) paid_orders FROM reqoo_payments p WHERE p.status='confirmed' AND "+payRange).first(),
    env.DB.prepare(cte+" SELECT COUNT(*) valid_orders,COALESCE(SUM(balance_minor),0) outstanding_minor,COALESCE(SUM(CASE WHEN balance_minor>0 THEN 1 ELSE 0 END),0) outstanding_orders,COALESCE(SUM(CASE WHEN paid_minor>0 THEN 1 ELSE 0 END),0) orders_with_payment,COALESCE(SUM(CASE WHEN balance_minor=0 AND billing_total_minor>0 THEN 1 ELSE 0 END),0) paid_full,COALESCE(SUM(CASE WHEN paid_minor>0 AND balance_minor>0 THEN 1 ELSE 0 END),0) partial,COALESCE(SUM(CASE WHEN paid_minor=0 THEN 1 ELSE 0 END),0) unpaid FROM final").first(),
    env.DB.prepare("SELECT * FROM (SELECT strftime('%Y-%m',COALESCE(p.paid_at,p.created_at)) month,COALESCE(SUM(p.amount_minor),0) collected_minor FROM reqoo_payments p WHERE p.status='confirmed' AND "+payRange+" GROUP BY month ORDER BY month DESC LIMIT 12) ORDER BY month ASC").all(),
    env.DB.prepare(cte+" SELECT COALESCE(NULLIF(oi.product_id,''),oi.product_name_snapshot) product_key,MAX(oi.product_name_snapshot) product_name,COALESCE(SUM(oi.quantity),0) units_sold,COUNT(DISTINCT oi.order_id) orders,CAST(ROUND(COALESCE(SUM(oi.line_total_minor*CASE WHEN f.billing_total_minor>0 THEN MIN(1.0,f.raw_paid_minor*1.0/f.billing_total_minor) ELSE 0 END),0)) AS INTEGER) collected_minor FROM order_items oi JOIN final f ON f.id=oi.order_id WHERE f.paid_minor>0 GROUP BY product_key ORDER BY collected_minor DESC LIMIT 6").all(),
    financeTransactionData({range,limit:12,offset:0},env)
  ]);
  const trend=trendResult?.results||[],products=productsResult?.results||[],collected=Number(collection?.collected_minor||0),paidOrders=Number(collection?.paid_orders||0),validOrders=Number(state?.valid_orders||0),withPayment=Number(state?.orders_with_payment||0);
  return J({ok:true,range,summary:{collectedMinor:collected,paidOrders,outstandingMinor:Number(state?.outstanding_minor||0),outstandingOrders:Number(state?.outstanding_orders||0),averageCollectedMinor:paidOrders?Math.round(collected/paidOrders):0,ordersWithPaymentRate:validOrders?Math.round(withPayment/validOrders*100):0,validOrders},breakdown:{paid:Number(state?.paid_full||0),partial:Number(state?.partial||0),pending:Number(state?.unpaid||0)},trend,products,transactions:tx.transactions,transactionsHasMore:tx.hasMore});
}
const ORDER_CLOSED_SQL="(o.fulfillment_status='cancelled' OR o.payment_status IN ('failed','cancelled','refunded'))";
const ORDER_READY_SQL="(o.payment_status IN ('paid','partial'))";
function orderFilterSql(filter){
  if(filter==='closed')return ORDER_CLOSED_SQL;
  if(filter==='pending')return "NOT "+ORDER_CLOSED_SQL+" AND NOT "+ORDER_READY_SQL;
  if(filter==='paid')return "NOT "+ORDER_CLOSED_SQL+" AND "+ORDER_READY_SQL+" AND o.fulfillment_status='pending'";
  if(filter==='processing')return "NOT "+ORDER_CLOSED_SQL+" AND "+ORDER_READY_SQL+" AND o.fulfillment_status='processing'";
  if(filter==='fulfilled')return "NOT "+ORDER_CLOSED_SQL+" AND "+ORDER_READY_SQL+" AND o.fulfillment_status='fulfilled'";
  if(filter==='active')return "NOT "+ORDER_CLOSED_SQL;
  return '1=1';
}
async function ordersDashboard(d,env){
  await ensure(env);
  const q=S(d.q).toLowerCase(),filter=S(d.filter||'active').toLowerCase(),limit=Math.min(150,Math.max(20,Number(d.limit||80))),offset=Math.max(0,Math.min(1000000,Number(d.offset||0)));
  const where=[orderFilterSql(filter)],args=[];
  if(q){
    where.push("(LOWER(COALESCE(o.order_no,o.id,'')) LIKE ? OR LOWER(COALESCE(c.name,'')) LIKE ? OR REPLACE(REPLACE(REPLACE(COALESCE(c.phone,''),' ',''),'-',''),'+','') LIKE ? OR LOWER(COALESCE(c.email,'')) LIKE ?)");
    const phone=q.replace(/[^0-9]/g,'');args.push('%'+q+'%','%'+q+'%',phone?'%'+phone+'%':'__NO_PHONE_MATCH__','%'+q+'%');
  }
  const whereSql=' WHERE '+where.join(' AND ');
  const [rowsResult,totalRow,stats]=await Promise.all([
    env.DB.prepare("SELECT o.*,c.name customer_name,c.phone,c.email,(SELECT GROUP_CONCAT(d.type) FROM reqoo_documents d WHERE d.order_id=o.id) document_types FROM orders o LEFT JOIN customers c ON c.id=o.customer_id"+whereSql+" ORDER BY o.created_at DESC,o.id DESC LIMIT ? OFFSET ?").bind(...args,limit,offset).all(),
    env.DB.prepare("SELECT COUNT(*) n FROM orders o LEFT JOIN customers c ON c.id=o.customer_id"+whereSql).bind(...args).first(),
    env.DB.prepare("SELECT COUNT(*) total,"+
      " SUM(CASE WHEN NOT "+ORDER_CLOSED_SQL+" AND NOT "+ORDER_READY_SQL+" THEN 1 ELSE 0 END) pending,"+
      " SUM(CASE WHEN NOT "+ORDER_CLOSED_SQL+" AND "+ORDER_READY_SQL+" AND o.fulfillment_status='pending' THEN 1 ELSE 0 END) paid,"+
      " SUM(CASE WHEN NOT "+ORDER_CLOSED_SQL+" AND "+ORDER_READY_SQL+" AND o.fulfillment_status='processing' THEN 1 ELSE 0 END) processing,"+
      " SUM(CASE WHEN NOT "+ORDER_CLOSED_SQL+" AND "+ORDER_READY_SQL+" THEN 1 ELSE 0 END) payment_ready"+
      " FROM orders o").first()
  ]);
  const rows=rowsResult?.results||[],total=Number(totalRow?.n||0);
  return J({ok:true,orders:rows.map(o=>({...o,orderNo:S(o.order_no)||('RQ-'+String(o.id).replace(/[^A-Za-z0-9]/g,'').slice(-12).toUpperCase()),order_ref:S(o.order_no)||o.id,name:o.customer_name||'',total:Number(o.total_minor||0)/100,status:o.fulfillment_status,payment:o.payment_status,timestamp:o.created_at})),total,offset,limit,hasMore:offset+rows.length<total,stats:{total:Number(stats?.total||0),pending:Number(stats?.pending||0),paid:Number(stats?.paid||0),processing:Number(stats?.processing||0),paymentReady:Number(stats?.payment_ready||0)}});
}
const CUSTOMER_ROLLUP_CTE="WITH order_rollup AS ("+
" SELECT o.customer_id,COUNT(*) order_count,MAX(o.created_at) last_order_at,"+
" COALESCE(SUM(CASE WHEN EXISTS(SELECT 1 FROM reqoo_payments p0 WHERE p0.order_id=o.id AND p0.status='confirmed') THEN COALESCE((SELECT SUM(p1.amount_minor) FROM reqoo_payments p1 WHERE p1.order_id=o.id AND p1.status='confirmed'),0) WHEN o.payment_status='paid' THEN o.total_minor ELSE 0 END),0) collected_minor,"+
" COALESCE(SUM(CASE WHEN o.fulfillment_status='cancelled' OR o.payment_status IN ('failed','cancelled','refunded') THEN 0 ELSE MAX(0,COALESCE((SELECT d.total_minor FROM reqoo_documents d WHERE d.order_id=o.id AND d.type='invoice' ORDER BY d.created_at,d.id LIMIT 1),o.total_minor)-CASE WHEN EXISTS(SELECT 1 FROM reqoo_payments p2 WHERE p2.order_id=o.id AND p2.status='confirmed') THEN COALESCE((SELECT SUM(p3.amount_minor) FROM reqoo_payments p3 WHERE p3.order_id=o.id AND p3.status='confirmed'),0) WHEN o.payment_status='paid' THEN COALESCE((SELECT d2.total_minor FROM reqoo_documents d2 WHERE d2.order_id=o.id AND d2.type='invoice' ORDER BY d2.created_at,d2.id LIMIT 1),o.total_minor) ELSE 0 END) END),0) outstanding_minor"+
" FROM orders o WHERE o.customer_id IS NOT NULL GROUP BY o.customer_id),"+
" doc_rollup AS (SELECT o.customer_id,COUNT(d.id) document_count,SUM(CASE WHEN d.type='quotation' THEN 1 ELSE 0 END) quotation_count,SUM(CASE WHEN d.type='receipt' THEN 1 ELSE 0 END) receipt_count,MAX(COALESCE(d.updated_at,d.created_at,d.issued_at)) last_doc_at FROM reqoo_documents d JOIN orders o ON o.id=d.order_id WHERE o.customer_id IS NOT NULL GROUP BY o.customer_id),"+
" pay_rollup AS (SELECT o.customer_id,MAX(COALESCE(p.paid_at,p.updated_at,p.created_at)) last_payment_at FROM reqoo_payments p JOIN orders o ON o.id=p.order_id WHERE p.status='confirmed' AND o.customer_id IS NOT NULL GROUP BY o.customer_id)";
function customerSortExpr(sort){
  if(sort==='spend')return 'collected_minor DESC,last_activity DESC';
  if(sort==='orders')return 'order_count DESC,last_activity DESC';
  if(sort==='outstanding')return 'outstanding_minor DESC,last_activity DESC';
  if(sort==='name')return "LOWER(COALESCE(c.name,'')) ASC,c.id ASC";
  return 'last_activity DESC,c.id DESC';
}
async function customerDashboard(d,env){
  await ensure(env);
  const q=S(d.q).toLowerCase(),sort=S(d.sort||'recent').toLowerCase(),limit=Math.min(300,Math.max(20,Number(d.limit||120)));
  const where=q?" WHERE LOWER(COALESCE(c.name,'')) LIKE ? OR REPLACE(REPLACE(REPLACE(COALESCE(c.phone,''),' ',''),'-',''),'+','') LIKE ? OR LOWER(COALESCE(c.email,'')) LIKE ?":'';
  const digits=q.replace(/[^0-9]/g,'');const args=q?['%'+q+'%',digits?'%'+digits+'%':'__NO_PHONE_MATCH__','%'+q+'%']:[];
  const sql=CUSTOMER_ROLLUP_CTE+
    " SELECT c.id,c.name,c.phone,c.email,c.created_at,c.updated_at,COALESCE(o.order_count,0) order_count,COALESCE(o.collected_minor,0) collected_minor,COALESCE(o.outstanding_minor,0) outstanding_minor,COALESCE(doc.document_count,0) document_count,COALESCE(doc.quotation_count,0) quotation_count,COALESCE(doc.receipt_count,0) receipt_count,MAX(COALESCE(c.updated_at,''),COALESCE(c.created_at,''),COALESCE(o.last_order_at,''),COALESCE(doc.last_doc_at,''),COALESCE(pay.last_payment_at,'')) last_activity"+
    " FROM customers c LEFT JOIN order_rollup o ON o.customer_id=c.id LEFT JOIN doc_rollup doc ON doc.customer_id=c.id LEFT JOIN pay_rollup pay ON pay.customer_id=c.id"+
    where+" ORDER BY "+customerSortExpr(sort)+" LIMIT ?";
  const [rowsResult,stats]=await Promise.all([
    env.DB.prepare(sql).bind(...args,limit).all(),
    env.DB.prepare(CUSTOMER_ROLLUP_CTE+" SELECT COUNT(c.id) customers,COALESCE(SUM(CASE WHEN COALESCE(o.order_count,0)>1 THEN 1 ELSE 0 END),0) repeat_customers,COALESCE(SUM(COALESCE(o.collected_minor,0)),0) collected_minor,COALESCE(SUM(COALESCE(o.outstanding_minor,0)),0) outstanding_minor FROM customers c LEFT JOIN order_rollup o ON o.customer_id=c.id").first()
  ]);
  const rows=rowsResult?.results||[];
  return J({ok:true,customers:rows,stats:{customers:Number(stats?.customers||0),repeatCustomers:Number(stats?.repeat_customers||0),collectedMinor:Number(stats?.collected_minor||0),outstandingMinor:Number(stats?.outstanding_minor||0)},query:q,limit});
}
async function customerDetail(d,env){
  await ensure(env);
  const key=S(d.customerId||d.id);if(!key)return J({ok:false,error:'Customer diperlukan'},400);
  const customer=await env.DB.prepare('SELECT * FROM customers WHERE id=? LIMIT 1').bind(key).first();
  if(!customer)return J({ok:false,error:'Customer tidak dijumpai'},404);
  const rollup=await env.DB.prepare("WITH customer_orders AS ("+
    " SELECT o.id,o.payment_status,o.fulfillment_status,o.total_minor,"+
    " COALESCE((SELECT d.total_minor FROM reqoo_documents d WHERE d.order_id=o.id AND d.type='invoice' ORDER BY d.created_at,d.id LIMIT 1),o.total_minor) billing_total_minor,"+
    " COALESCE((SELECT SUM(p.amount_minor) FROM reqoo_payments p WHERE p.order_id=o.id AND p.status='confirmed'),0) ledger_paid_minor"+
    " FROM orders o WHERE o.customer_id=?),"+
    " normalized AS (SELECT *,CASE WHEN ledger_paid_minor>0 THEN ledger_paid_minor WHEN payment_status='paid' THEN billing_total_minor ELSE 0 END raw_paid_minor FROM customer_orders)"+
    " SELECT COUNT(*) order_count,"+
    " COALESCE(SUM(raw_paid_minor),0) collected_minor,"+
    " COALESCE(SUM(CASE WHEN fulfillment_status='cancelled' OR payment_status IN ('failed','cancelled','refunded') THEN 0 ELSE MAX(0,billing_total_minor-raw_paid_minor) END),0) outstanding_minor"+
    " FROM normalized").bind(customer.id).first();
  const docStats=await env.DB.prepare("SELECT COUNT(DISTINCT d.id) document_count,COALESCE(SUM(CASE WHEN d.type='quotation' THEN 1 ELSE 0 END),0) quotation_count,COALESCE(SUM(CASE WHEN d.type='receipt' THEN 1 ELSE 0 END),0) receipt_document_count FROM reqoo_documents d WHERE d.order_id IN (SELECT id FROM orders WHERE customer_id=?) OR (TRIM(COALESCE(d.customer_phone,''))<>'' AND REPLACE(REPLACE(REPLACE(d.customer_phone,' ',''),'-',''),'+','')=REPLACE(REPLACE(REPLACE(COALESCE(?,''),' ',''),'-',''),'+','')) OR (TRIM(COALESCE(d.customer_email,''))<>'' AND LOWER(d.customer_email)=LOWER(COALESCE(?,'')))").bind(customer.id,customer.phone,customer.email).first();
  const payStats=await env.DB.prepare("SELECT COUNT(*) receipt_count FROM reqoo_payments p JOIN orders o ON o.id=p.order_id WHERE o.customer_id=? AND p.status='confirmed'").bind(customer.id).first();
  const recentOrders=(await env.DB.prepare("SELECT o.id,o.order_no,o.total_minor,o.payment_status,o.fulfillment_status,o.created_at FROM orders o WHERE o.customer_id=? ORDER BY o.created_at DESC,o.id DESC LIMIT 12").bind(customer.id).all()).results||[];
  const recentDocs=(await env.DB.prepare("SELECT d.id,d.type,d.number,d.order_id,d.total_minor,d.status,d.payment_status,d.issued_at,d.created_at FROM reqoo_documents d WHERE d.order_id IN (SELECT id FROM orders WHERE customer_id=?) OR (TRIM(COALESCE(d.customer_phone,''))<>'' AND REPLACE(REPLACE(REPLACE(d.customer_phone,' ',''),'-',''),'+','')=REPLACE(REPLACE(REPLACE(COALESCE(?,''),' ',''),'-',''),'+','')) OR (TRIM(COALESCE(d.customer_email,''))<>'' AND LOWER(d.customer_email)=LOWER(COALESCE(?,''))) ORDER BY COALESCE(d.issued_at,d.created_at) DESC,d.id DESC LIMIT 12").bind(customer.id,customer.phone,customer.email).all()).results||[];
  const recentPayments=(await env.DB.prepare("SELECT p.id,p.order_id,p.receipt_number,p.amount_minor,p.payment_type,p.method,p.paid_at,p.created_at,o.order_no FROM reqoo_payments p JOIN orders o ON o.id=p.order_id WHERE o.customer_id=? AND p.status='confirmed' ORDER BY COALESCE(p.paid_at,p.created_at) DESC,p.id DESC LIMIT 12").bind(customer.id).all()).results||[];
  const activity=[];
  for(const o of recentOrders)activity.push({kind:'order',date:o.created_at,title:o.order_no||o.id,amountMinor:Number(o.total_minor||0),status:S(o.payment_status).toUpperCase(),orderId:o.id});
  for(const doc of recentDocs)activity.push({kind:doc.type||'document',date:doc.issued_at||doc.created_at,title:doc.number||doc.id,amountMinor:Number(doc.total_minor||0),status:S(doc.payment_status||doc.status||'issued').toUpperCase(),documentId:doc.id,orderId:doc.order_id});
  for(const p of recentPayments)activity.push({kind:'payment',date:p.paid_at||p.created_at,title:p.receipt_number||p.id,amountMinor:Number(p.amount_minor||0),status:'CONFIRMED',method:p.method||'',paymentId:p.id,orderId:p.order_id});
  activity.sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
  return J({ok:true,customer,summary:{collectedMinor:Number(rollup?.collected_minor||0),outstandingMinor:Number(rollup?.outstanding_minor||0),orderCount:Number(rollup?.order_count||0),documentCount:Number(docStats?.document_count||0),quotationCount:Number(docStats?.quotation_count||0),receiptCount:Number(payStats?.receipt_count||0)||Number(docStats?.receipt_document_count||0)},activity:activity.slice(0,30)});
}
async function customerRecords(d,env){
  await ensure(env);
  const key=S(d.customerId||d.id),type=S(d.type||'orders').toLowerCase(),q=S(d.q).toLowerCase(),limit=Math.min(100,Math.max(20,Number(d.limit||40))),offset=Math.max(0,Math.min(1000000,Number(d.offset||0)));
  if(!key)return J({ok:false,error:'Customer diperlukan'},400);
  const customer=await env.DB.prepare('SELECT * FROM customers WHERE id=? LIMIT 1').bind(key).first();
  if(!customer)return J({ok:false,error:'Customer tidak dijumpai'},404);
  if(type==='orders'){
    const where=["o.customer_id=?"],args=[customer.id];
    if(q){where.push("(LOWER(COALESCE(o.order_no,o.id,'')) LIKE ? OR LOWER(COALESCE(o.payment_status,'')) LIKE ? OR LOWER(COALESCE(o.fulfillment_status,'')) LIKE ?)");args.push('%'+q+'%','%'+q+'%','%'+q+'%')}
    const whereSql=' WHERE '+where.join(' AND ');
    const rows=(await env.DB.prepare("SELECT o.*,COALESCE((SELECT d.total_minor FROM reqoo_documents d WHERE d.order_id=o.id AND d.type='invoice' ORDER BY d.created_at,d.id LIMIT 1),o.total_minor) billing_total_minor,COALESCE((SELECT SUM(p.amount_minor) FROM reqoo_payments p WHERE p.order_id=o.id AND p.status='confirmed'),0) ledger_paid_minor FROM orders o"+whereSql+" ORDER BY o.created_at DESC,o.id DESC LIMIT ? OFFSET ?").bind(...args,limit+1,offset).all()).results||[];
    const mapped=rows.slice(0,limit).map(o=>{const total=Number(o.billing_total_minor||o.total_minor||0),ledgerPaid=Number(o.ledger_paid_minor||0),closed=S(o.fulfillment_status).toLowerCase()==='cancelled'||['failed','cancelled','refunded'].includes(S(o.payment_status).toLowerCase()),rawPaid=ledgerPaid>0?ledgerPaid:S(o.payment_status).toLowerCase()==='paid'?total:0,paid=Math.min(total,rawPaid),balance=closed?0:Math.max(0,total-rawPaid),overpaid=Math.max(0,rawPaid-total);return{...o,totalMinor:total,paidMinor:paid,balanceMinor:balance,overpaidMinor:overpaid,paymentStatus:overpaid>0?'paid':balance===0&&total>0?'paid':paid>0?'partial':S(o.payment_status||'pending').toLowerCase()}});
    return J({ok:true,type,records:mapped,offset,limit,hasMore:rows.length>limit,query:q});
  }
  if(type==='documents'){
    const where=["(d.order_id IN (SELECT id FROM orders WHERE customer_id=?) OR (TRIM(COALESCE(d.customer_phone,''))<>'' AND REPLACE(REPLACE(REPLACE(d.customer_phone,' ',''),'-',''),'+','')=REPLACE(REPLACE(REPLACE(COALESCE(?,''),' ',''),'-',''),'+','')) OR (TRIM(COALESCE(d.customer_email,''))<>'' AND LOWER(d.customer_email)=LOWER(COALESCE(?,''))))"],args=[customer.id,customer.phone,customer.email];
    if(q){where.push("(LOWER(COALESCE(d.number,'')) LIKE ? OR LOWER(COALESCE(d.type,'')) LIKE ? OR LOWER(COALESCE(d.order_id,'')) LIKE ?)");args.push('%'+q+'%','%'+q+'%','%'+q+'%')}
    const rows=(await env.DB.prepare("SELECT d.* FROM reqoo_documents d WHERE "+where.join(' AND ')+" ORDER BY COALESCE(d.issued_at,d.created_at) DESC,d.id DESC LIMIT ? OFFSET ?").bind(...args,limit+1,offset).all()).results||[];
    return J({ok:true,type,records:rows.slice(0,limit),offset,limit,hasMore:rows.length>limit,query:q});
  }
  if(type==='payments'){
    const where=["o.customer_id=?","p.status='confirmed'"],args=[customer.id];
    if(q){const digits=q.replace(/[^0-9]/g,'');where.push("(LOWER(COALESCE(p.receipt_number,'')) LIKE ? OR LOWER(COALESCE(o.order_no,o.id,'')) LIKE ? OR LOWER(COALESCE(p.method,'')) LIKE ? OR LOWER(COALESCE(p.payment_type,'')) LIKE ? OR LOWER(COALESCE(rd.number,'')) LIKE ?)");args.push('%'+q+'%','%'+q+'%','%'+q+'%','%'+q+'%','%'+q+'%')}
    const rows=(await env.DB.prepare("SELECT p.*,o.order_no,rd.number invoice_number FROM reqoo_payments p JOIN orders o ON o.id=p.order_id LEFT JOIN reqoo_documents rd ON rd.id=p.invoice_document_id WHERE "+where.join(' AND ')+" ORDER BY COALESCE(p.paid_at,p.created_at) DESC,p.id DESC LIMIT ? OFFSET ?").bind(...args,limit+1,offset).all()).results||[];
    return J({ok:true,type,records:rows.slice(0,limit),offset,limit,hasMore:rows.length>limit,query:q});
  }
  return J({ok:false,error:'Jenis rekod customer tidak sah'},400);
}

const DOCUMENT_FINANCE_CTE="WITH invoice_base AS ("+
" SELECT d.id,d.number,d.order_id,d.status,d.currency,d.total_minor,d.issued_at,d.due_at,d.customer_name,d.customer_phone,d.customer_email,d.created_at,d.updated_at,"+
" o.order_no,o.payment_status order_payment_status,o.fulfillment_status,c.id customer_id,"+
" COALESCE((SELECT SUM(p.amount_minor) FROM reqoo_payments p WHERE p.order_id=d.order_id AND p.status='confirmed'),0) ledger_paid_minor"+
" FROM reqoo_documents d JOIN orders o ON o.id=d.order_id LEFT JOIN customers c ON c.id=o.customer_id"+
" WHERE d.type='invoice' AND o.fulfillment_status!='cancelled' AND o.payment_status NOT IN ('failed','cancelled','refunded')),"+
" invoice_norm AS (SELECT *,CASE WHEN ledger_paid_minor>0 THEN ledger_paid_minor WHEN order_payment_status='paid' OR status='paid' THEN total_minor ELSE 0 END raw_paid_minor FROM invoice_base),"+
" invoice_final AS (SELECT *,MIN(total_minor,raw_paid_minor) paid_minor,MAX(0,total_minor-raw_paid_minor) balance_minor,"+
" CASE WHEN due_at IS NULL OR TRIM(due_at)='' THEN NULL ELSE CAST(julianday(substr(due_at,1,10))-julianday(date('now','+8 hours')) AS INTEGER) END days_to_due"+
" FROM invoice_norm)";
function documentFinanceFilterSql(filter){
  if(filter==='outstanding')return' balance_minor>0';
  if(filter==='partial')return' balance_minor>0 AND paid_minor>0';
  if(filter==='due_soon')return' balance_minor>0 AND days_to_due BETWEEN 0 AND 7';
  if(filter==='overdue')return' balance_minor>0 AND days_to_due<0';
  if(filter==='paid')return' balance_minor=0 AND total_minor>0';
  return' 1=1';
}
function documentFinanceSummary(r){
  const total=Number(r.total_minor||0),rawPaid=Number(r.raw_paid_minor||r.paid_minor||0),paid=Math.min(total,Number(r.paid_minor||0)),balance=Math.max(0,Number(r.balance_minor??total-paid)),overpaid=Math.max(0,rawPaid-total);
  const paymentStatus=overpaid>0?'paid':balance===0&&total>0?'paid':paid>0?'partial':'pending';
  return{orderId:r.order_id,orderNo:r.order_no||r.order_id,invoiceId:r.id||null,invoiceNumber:r.number||null,totalMinor:total,paidMinor:paid,rawPaidMinor:rawPaid,balanceMinor:balance,overpaidMinor:overpaid,paymentStatus,daysToDue:r.days_to_due==null?null:Number(r.days_to_due)};
}
function mapFinanceInvoice(r){const s=documentFinanceSummary(r);return{id:r.id,type:'invoice',number:r.number,order_id:r.order_id,status:r.status||'issued',currency:r.currency||'MYR',total_minor:Number(r.total_minor||0),issued_at:r.issued_at,due_at:r.due_at,customer_name:r.customer_name||'',customer_phone:r.customer_phone||'',customer_email:r.customer_email||'',created_at:r.created_at,updated_at:r.updated_at,order_no:r.order_no||r.order_id,payment_status:s.paymentStatus,finance:s}}
async function documentsFinanceDashboard(d,env){
  await ensure(env);await syncLegacyPaidPayments(env);
  const filter=S(d.filter||'all').toLowerCase(),q=S(d.q).toLowerCase(),limit=Math.min(150,Math.max(20,Number(d.limit||80))),offset=Math.max(0,Math.min(1000000,Number(d.offset||0)));
  const includeInvoices=d.includeInvoices===true||S(d.includeInvoices)==='1'||S(d.includeInvoices).toLowerCase()==='true';
  const includePayments=d.includePayments===true||S(d.includePayments)==='1'||S(d.includePayments).toLowerCase()==='true';
  const paymentLimit=Math.min(150,Math.max(20,Number(d.paymentLimit||80))),paymentOffset=Math.max(0,Math.min(1000000,Number(d.paymentOffset||0)));
  const stats=await env.DB.prepare(DOCUMENT_FINANCE_CTE+" SELECT COUNT(*) all_count,COALESCE(SUM(CASE WHEN balance_minor>0 THEN 1 ELSE 0 END),0) outstanding_count,COALESCE(SUM(CASE WHEN balance_minor>0 THEN balance_minor ELSE 0 END),0) outstanding_minor,COALESCE(SUM(CASE WHEN balance_minor>0 AND paid_minor>0 THEN 1 ELSE 0 END),0) partial_count,COALESCE(SUM(CASE WHEN balance_minor>0 AND days_to_due BETWEEN 0 AND 7 THEN 1 ELSE 0 END),0) due_soon_count,COALESCE(SUM(CASE WHEN balance_minor>0 AND days_to_due BETWEEN 0 AND 7 THEN balance_minor ELSE 0 END),0) due_soon_minor,COALESCE(SUM(CASE WHEN balance_minor>0 AND days_to_due<0 THEN 1 ELSE 0 END),0) overdue_count,COALESCE(SUM(CASE WHEN balance_minor>0 AND days_to_due<0 THEN balance_minor ELSE 0 END),0) overdue_minor,COALESCE(SUM(CASE WHEN balance_minor=0 AND total_minor>0 THEN 1 ELSE 0 END),0) paid_count FROM invoice_final").first();
  let invoices=[],invoiceTotal=0,invoicesHasMore=false;
  if(includeInvoices){
    const where=[documentFinanceFilterSql(filter)],args=[];
    if(q){const digits=q.replace(/[^0-9]/g,'');where.push("(LOWER(COALESCE(number,'')) LIKE ? OR LOWER(COALESCE(order_no,order_id,'')) LIKE ? OR LOWER(COALESCE(customer_name,'')) LIKE ? OR REPLACE(REPLACE(REPLACE(COALESCE(customer_phone,''),' ',''),'-',''),'+','') LIKE ? OR LOWER(COALESCE(customer_email,'')) LIKE ?)");args.push('%'+q+'%','%'+q+'%','%'+q+'%',digits?'%'+digits+'%':'__NO_PHONE_MATCH__','%'+q+'%')}
    const whereSql=' WHERE '+where.join(' AND ');
    const sort=filter==='overdue'||filter==='due_soon'?' ORDER BY days_to_due ASC,due_at ASC,id ASC':' ORDER BY COALESCE(issued_at,created_at) DESC,id DESC';
    const rows=(await env.DB.prepare(DOCUMENT_FINANCE_CTE+" SELECT * FROM invoice_final"+whereSql+sort+" LIMIT ? OFFSET ?").bind(...args,limit,offset).all()).results||[];
    const totalRow=await env.DB.prepare(DOCUMENT_FINANCE_CTE+" SELECT COUNT(*) n FROM invoice_final"+whereSql).bind(...args).first();
    invoiceTotal=Number(totalRow?.n||0);invoices=rows.map(mapFinanceInvoice);invoicesHasMore=offset+invoices.length<invoiceTotal;
  }
  const ids=Array.isArray(d.orderIds)?[...new Set(d.orderIds.map(S).filter(Boolean))].slice(0,250):[];
  let summaries=[];
  if(ids.length){
    const ph=ids.map(()=>'?').join(',');
    const rows=(await env.DB.prepare(DOCUMENT_FINANCE_CTE+" SELECT * FROM invoice_final WHERE order_id IN ("+ph+") ORDER BY created_at,id").bind(...ids).all()).results||[];
    const seen=new Set();for(const row of rows){if(seen.has(S(row.order_id)))continue;seen.add(S(row.order_id));summaries.push(documentFinanceSummary(row))}
  }
  let payments=[],paymentsHasMore=false;
  if(includePayments){
    const payWhere=["p.status='confirmed'"],args=[];
    if(q){const digits=q.replace(/[^0-9]/g,'');payWhere.push("(LOWER(COALESCE(p.receipt_number,'')) LIKE ? OR LOWER(COALESCE(o.order_no,o.id,'')) LIKE ? OR LOWER(COALESCE(c.name,'')) LIKE ? OR REPLACE(REPLACE(REPLACE(COALESCE(c.phone,''),' ',''),'-',''),'+','') LIKE ? OR LOWER(COALESCE(rd.number,'')) LIKE ?)");args.push('%'+q+'%','%'+q+'%','%'+q+'%',digits?'%'+digits+'%':'__NO_PHONE_MATCH__','%'+q+'%')}
    const rows=(await env.DB.prepare("SELECT p.*,o.order_no,o.total_minor,c.name customer_name,c.phone customer_phone,c.email customer_email,rd.number invoice_number FROM reqoo_payments p JOIN orders o ON o.id=p.order_id LEFT JOIN customers c ON c.id=o.customer_id LEFT JOIN reqoo_documents rd ON rd.id=p.invoice_document_id WHERE "+payWhere.join(' AND ')+" ORDER BY COALESCE(p.paid_at,p.created_at) DESC,p.id DESC LIMIT ? OFFSET ?").bind(...args,paymentLimit+1,paymentOffset).all()).results||[];
    paymentsHasMore=rows.length>paymentLimit;payments=rows.slice(0,paymentLimit);
  }
  return J({ok:true,filter,query:q,stats:{all:Number(stats?.all_count||0),outstandingCount:Number(stats?.outstanding_count||0),outstandingMinor:Number(stats?.outstanding_minor||0),partialCount:Number(stats?.partial_count||0),dueSoonCount:Number(stats?.due_soon_count||0),dueSoonMinor:Number(stats?.due_soon_minor||0),overdueCount:Number(stats?.overdue_count||0),overdueMinor:Number(stats?.overdue_minor||0),paidCount:Number(stats?.paid_count||0)},invoices,invoiceTotal,invoiceOffset:offset,invoiceLimit:limit,invoicesHasMore,summaries,payments,paymentOffset,paymentLimit,paymentsHasMore});
}
async function documentFlow(d,env){
  await ensure(env);
  const key=S(d.key||d.documentId||d.documentNumber||d.paymentId||d.receiptNumber);if(!key)return J({ok:false,error:'Dokumen atau receipt diperlukan'},400);
  const selectedDocument=await env.DB.prepare("SELECT * FROM reqoo_documents WHERE id=? OR number=? LIMIT 1").bind(key,key).first();
  const selectedPayment=selectedDocument?null:await env.DB.prepare("SELECT p.*,o.order_no,c.name customer_name,c.phone customer_phone,c.email customer_email,rd.number invoice_number FROM reqoo_payments p JOIN orders o ON o.id=p.order_id LEFT JOIN customers c ON c.id=o.customer_id LEFT JOIN reqoo_documents rd ON rd.id=p.invoice_document_id WHERE p.id=? OR p.receipt_number=? LIMIT 1").bind(key,key).first();
  const orderId=S(selectedDocument?.order_id||selectedPayment?.order_id);if(!orderId)return J({ok:false,error:'Dokumen tidak dijumpai'},404);
  const documents=(await env.DB.prepare("SELECT * FROM reqoo_documents WHERE order_id=? ORDER BY created_at,id").bind(orderId).all()).results||[];
  if(orderId.startsWith('custom:'))return J({ok:true,selectedDocument,selectedPayment,documents,payments:[],summary:null,order:null});
  const order=await orderByKey(orderId,env);if(!order)return J({ok:false,error:'Order tidak dijumpai'},404);
  await syncLegacyPaidPayments(env,order.id);
  const payments=(await env.DB.prepare("SELECT p.*,o.order_no,c.name customer_name,c.phone customer_phone,c.email customer_email,rd.number invoice_number FROM reqoo_payments p JOIN orders o ON o.id=p.order_id LEFT JOIN customers c ON c.id=o.customer_id LEFT JOIN reqoo_documents rd ON rd.id=p.invoice_document_id WHERE p.order_id=? AND p.status='confirmed' ORDER BY p.paid_at,p.created_at,p.id").bind(order.id).all()).results||[];
  const summary=await summaryForOrder(order,env);
  return J({ok:true,selectedDocument,selectedPayment,documents,payments,summary,order});
}
async function canonicalDocuments(d,request,env){
  await ensure(env);
  await syncLegacyPaidPayments(env,S(d.orderId||d.orderRef||d.orderNo));
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
  await syncLegacyPaidPayments(env);
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
    if(['recordPayment','correctPayment','listPayments','paymentSummary','getPaymentReceipt','listDocuments','documentIntegrityAudit','customerDashboard','customerDetail','customerRecords','ordersDashboard','financeDashboard','financeTransactions','documentsFinanceDashboard','documentFlow'].includes(action)){
      if(!auth(request,env,d))return J({ok:false,error:'Unauthorized'},401);
      if(action==='recordPayment')return await recordPayment(d,request,env);
      if(action==='correctPayment')return await correctPayment(d,env);
      if(action==='listPayments')return await listPayments(d,env);
      if(action==='paymentSummary')return await paymentSummary(d,env);
      if(action==='getPaymentReceipt')return await getPaymentReceipt(d,env);
      if(action==='listDocuments')return await canonicalDocuments(d,request,env);
      if(action==='documentIntegrityAudit')return await documentIntegrityAudit(env);
      if(action==='customerDashboard')return await customerDashboard(d,env);
      if(action==='customerDetail')return await customerDetail(d,env);
      if(action==='customerRecords')return await customerRecords(d,env);
      if(action==='ordersDashboard')return await ordersDashboard(d,env);
      if(action==='financeDashboard')return await financeDashboard(d,env);
      if(action==='financeTransactions')return await financeTransactions(d,env);
      if(action==='documentsFinanceDashboard')return await documentsFinanceDashboard(d,env);
      if(action==='documentFlow')return await documentFlow(d,env);
    }
    if(action==='dashboardSummary'){
      if(!auth(request,env,d))return J({ok:false,error:'Unauthorized'},401);
      await ensure(env);
      await syncLegacyPaidPayments(env);
      return legacy({request,env});
    }
    if(action==='verifyPayment'||(action==='status'&&S(d.status).toLowerCase()==='paid')){
      if(!auth(request,env,d))return J({ok:false,error:'Unauthorized'},401);
      const response=await legacy({request,env});
      if(!response.ok)return response;
      let out={};try{out=await response.clone().json()}catch{return response}
      if(out.ok===false)return response;
      await ensure(env);
      await syncLegacyPaidPayments(env,S(d.orderId||d.orderRef||d.orderNo));
      return response;
    }
    return legacy({request,env});
  }catch(e){console.error('REQOO payment ledger v18:',e);return J({ok:false,error:e?.message||String(e)},500)}
}

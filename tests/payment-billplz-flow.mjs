import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {onRequest as shop} from '../api/shop-flow-v5.js';
import {onRequest as admin} from '../api/shop-admin-flow-v18.js';
import {createHmac} from 'node:crypto';

const sqlite=new DatabaseSync(':memory:');
sqlite.exec(fs.readFileSync(new URL('../migrations/0001_reqoo_core.sql',import.meta.url),'utf8'));
sqlite.exec('ALTER TABLE orders ADD COLUMN order_no TEXT');
sqlite.exec(fs.readFileSync(new URL('../migrations/0009_shop_production_meta.sql',import.meta.url),'utf8'));

const DB={
  prepare(sql){
    return {
      sql,args:[],
      bind(...args){this.args=args;return this},
      async first(){return sqlite.prepare(sql).get(...this.args)||null},
      async all(){return {results:sqlite.prepare(sql).all(...this.args)}},
      async run(){return sqlite.prepare(sql).run(...this.args)}
    };
  },
  async batch(stmts){
    sqlite.exec('BEGIN');
    try{
      const out=[];
      for(const stmt of stmts)out.push(await stmt.run());
      sqlite.exec('COMMIT');
      return out;
    }catch(error){
      sqlite.exec('ROLLBACK');
      throw error;
    }
  }
};

const env={
  DB,
  REQOO_ADMIN_TOKEN:'e2e-admin',
  BILLPLZ_API_KEY:'test-only', BILLPLZ_COLLECTION_ID:'E2ECAT', BILLPLZ_X_SIGNATURE_KEY:'e2e-secret', BILLPLZ_ENV:'production'
};

const now=new Date().toISOString();
sqlite.prepare("INSERT INTO products(id,sku,name,slug,product_type,fulfillment_type,base_price_minor,currency,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)")
  .run('prod_e2e','E2E-TEST','E2E Test Product','e2e-test','physical','physical_shipping',100,'MYR','active',now,now);
sqlite.prepare("INSERT INTO product_variations(id,product_id,sku,name,price_minor,stock_qty,stock_tracking,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)")
  .run('var_e2e','prod_e2e','E2E-TEST-1','Test',100,3,1,'active',now,now);

const originalFetch=globalThis.fetch;
let providerRequest=null;
globalThis.fetch=async(url,init={})=>{
  const href=String(url);
  if(href==='https://www.billplz.com/api/v3/bills'){
    providerRequest={url:href,params:new URLSearchParams(init.body)};
    return new Response(JSON.stringify({id:'E2EBILL001',url:'https://www.billplz.com/bills/E2EBILL001',collection_id:'E2ECAT',amount:100}),{status:200,headers:{'content-type':'application/json'}});
  }
  throw new Error('Unexpected external fetch in E2E test: '+href);
};

async function shopCall(action,data={}){
  const request=new Request('https://api.reqoo.co/api/shop',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action,...data})});
  const response=await shop({request,env});
  const type=response.headers.get('content-type')||'';
  if(type.includes('json'))return {httpStatus:response.status,...await response.json()};
  return {httpStatus:response.status,text:await response.text()};
}
async function adminCall(action,data={}){
  const request=new Request('https://api.reqoo.co/api/shop-admin',{method:'POST',headers:{'content-type':'application/json','X-Admin-Token':'e2e-admin'},body:JSON.stringify({action,...data})});
  const response=await admin({request,env});
  const type=response.headers.get('content-type')||'';
  if(type.includes('json'))return {httpStatus:response.status,...await response.json()};
  return {httpStatus:response.status,text:await response.text()};
}

try{
  const created=await shopCall('createOrder',{
    name:'E2E Buyer',
    phone:'0123456789',
    email:'e2e@example.test',
    payment:'billplz',
    expectedTotalMinor:100,
    items:[{productId:'prod_e2e',variantId:'var_e2e',qty:1}]
  });
  assert.equal(created.httpStatus,200);
  assert.equal(created.ok,true);
  assert.equal(created.payment.provider,'BILLPLZ');
  assert.equal(created.payment.billCode,'E2EBILL001');
  assert.equal(created.amount,1);
  assert.equal(providerRequest?.params.get('amount'),'100');
  assert.equal(providerRequest?.params.get('reference_2'),created.orderRef);

  let order=sqlite.prepare('SELECT * FROM orders WHERE id=?').get(created.orderId);
  let legacy=sqlite.prepare('SELECT * FROM payments WHERE order_id=?').get(created.orderId);
  assert.equal(order.payment_status,'pending');
  assert.equal(order.fulfillment_status,'pending');
  assert.equal(legacy.status,'pending');
  assert.equal(legacy.provider_reference,'E2EBILL001');
  assert.equal(sqlite.prepare("SELECT stock_qty FROM product_variations WHERE id='var_e2e'").get().stock_qty,2);

  const payload={id:'E2EBILL001',collection_id:'E2ECAT',amount:'100',paid_amount:'100',paid:'true',state:'paid',mobile:'',paid_at:'2026-10-21 08:00:00 +0800'};
  async function send(fields,valid=true){
    const source=Object.entries(fields).map(([k,v])=>k+v).sort((a,b)=>a.toLowerCase()<b.toLowerCase()?-1:1).join('|');
    const x_signature=valid?createHmac('sha256','e2e-secret').update(source).digest('hex'):'0'.repeat(64);
    return shop({env,request:new Request('https://api.reqoo.co/api/shop?action=billplzCallback',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({...fields,x_signature})})});
  }
  assert.equal((await send(payload,false)).status,401);
  assert.equal((await send({...payload,id:'unknown'})).status,404);
  assert.equal((await send({...payload,amount:'1'})).status,400);
  assert.equal((await send({...payload,collection_id:'wrong'})).status,400);
  assert.equal((await send({...payload,paid_amount:'1'})).status,400);
  assert.equal(sqlite.prepare('SELECT status FROM payments WHERE order_id=?').get(created.orderId).status,'pending');
  assert.equal((await send({...payload,paid:'false',state:'due',paid_amount:'0',transaction_status:'failed'})).status,200);
  assert.equal(sqlite.prepare('SELECT status FROM payments WHERE order_id=?').get(created.orderId).status,'pending');
  for(let i=0;i<3;i++)assert.equal((await send(payload)).status,200);
  assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM activity_events WHERE order_id=? AND event_type='payment.paid'").get(created.orderId).n,1);
  assert.equal((await send({...payload,paid:'false',state:'due',paid_amount:'0'})).status,200);
  order=sqlite.prepare('SELECT * FROM orders WHERE id=?').get(created.orderId);
  legacy=sqlite.prepare('SELECT * FROM payments WHERE order_id=?').get(created.orderId);
  assert.equal(order.payment_status,'paid');
  assert.equal(order.fulfillment_status,'pending');
  assert.equal(legacy.status,'paid');
  assert.ok(legacy.paid_at);

  const summary=await adminCall('paymentSummary',{orderId:created.orderId});
  assert.equal(summary.ok,true);
  assert.equal(summary.summary.totalMinor,100);
  assert.equal(summary.summary.paidMinor,100);
  assert.equal(summary.summary.balanceMinor,0);
  assert.equal(summary.summary.paymentStatus,'paid');
  assert.equal(summary.summary.payments.length,1);
  assert.match(summary.summary.payments[0].receipt_number,/^RC-\d{4}-\d{5}$/);
  assert.equal(summary.summary.payments[0].reference,'E2EBILL001');
  assert.match(summary.summary.payments[0].note,/Billplz/i);

  const duplicate=await adminCall('recordPayment',{orderId:created.orderId,amountMinor:100,method:'bank_transfer'});
  assert.equal(duplicate.httpStatus,409);
  assert.match(duplicate.error,/selesai dibayar/i);
  assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM reqoo_payments WHERE order_id=? AND status='confirmed'").get(created.orderId).n,1);

  const production=await adminCall('productionDashboard');
  assert.equal(production.ok,true);
  assert.equal(production.counts.paid,1);
  assert.ok(production.orders.some(o=>o.id===created.orderId&&o.payment_status==='paid'&&o.fulfillment_status==='pending'));

  const docs=await adminCall('listDocuments',{orderId:created.orderId});
  assert.equal(docs.ok,true);
  const invoice=docs.documents.find(d=>d.type==='invoice');
  assert.ok(invoice,'recordPayment duplicate guard should still ensure the canonical invoice exists');
  assert.equal(invoice.total_minor,100);
  assert.equal(invoice.payment_status,'paid');

  const summaryAfterInvoice=await adminCall('paymentSummary',{orderId:created.orderId});
  assert.equal(summaryAfterInvoice.summary.invoiceId,invoice.id);
  assert.equal(summaryAfterInvoice.summary.payments[0].invoice_document_id,invoice.id);

  const receipt=await adminCall('getPaymentReceipt',{receiptNumber:summaryAfterInvoice.summary.payments[0].receipt_number});
  assert.equal(receipt.ok,true);
  assert.equal(receipt.receipt.order_id,created.orderId);
  assert.equal(receipt.receipt.invoice_number,invoice.number);
  assert.equal(receipt.receipt.summary.balanceMinor,0);

  const publicInvoice=await adminCall('publicDocument',{shareToken:invoice.share_token});
  assert.equal(publicInvoice.ok,true);
  assert.equal(publicInvoice.document.type,'invoice');
  assert.equal(publicInvoice.document.total_minor,100);

  const orders=await adminCall('listOrders',{limit:50});
  assert.equal(orders.ok,true,JSON.stringify(orders));
  assert.ok(orders.orders.some(o=>o.id===created.orderId&&o.payment_status==='paid'));

  const dashboard=await adminCall('dashboardSummary');
  assert.equal(dashboard.ok,true);
  assert.equal(dashboard.commandCenter.today_collected_minor,100);
  assert.equal(dashboard.commandCenter.today_collected_count,1);

  const integrity=await adminCall('documentIntegrityAudit');
  assert.equal(integrity.ok,true);
  assert.equal(integrity.audit.overpaidInvoices,0);
  assert.equal(integrity.audit.receiptNumberCollisions,0);

  globalThis.fetch=async()=>Response.json({error:'declined'},{status:422});
  const stockBefore=sqlite.prepare("SELECT stock_qty FROM product_variations WHERE id='var_e2e'").get().stock_qty;
  const savedError=console.error;console.error=()=>{};
  let rejected;try{rejected=await shopCall('createOrder',{name:'Failed Buyer',phone:'0123456789',email:'e2e@example.test',payment:'billplz',items:[{productId:'prod_e2e',variantId:'var_e2e',qty:1}]})}finally{console.error=savedError}
  assert.equal(rejected.ok,false);
  assert.equal(sqlite.prepare("SELECT stock_qty FROM product_variations WHERE id='var_e2e'").get().stock_qty,stockBefore);
  assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM orders WHERE payment_status='failed' AND fulfillment_status='cancelled'").get().n,1);
  console.log('PASS: Billplz signed order -> callback -> canonical payment ledger -> Production -> invoice -> receipt -> Overview/Finance data stays consistent and duplicate payment is blocked.');
}finally{
  globalThis.fetch=originalFetch;
  sqlite.close();
}

import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {onRequest} from '../api/shop-admin-flow-v18.js';

const sqlite=new DatabaseSync(':memory:');
sqlite.exec(fs.readFileSync(new URL('../migrations/0001_reqoo_core.sql',import.meta.url),'utf8'));
sqlite.exec('ALTER TABLE orders ADD COLUMN order_no TEXT');
sqlite.exec(fs.readFileSync(new URL('../migrations/0002_reqoo_documents_v2.sql',import.meta.url),'utf8'));

const DB={
  prepare(sql){return{sql,args:[],bind(...args){this.args=args;return this},async first(){return sqlite.prepare(sql).get(...this.args)||null},async all(){return{results:sqlite.prepare(sql).all(...this.args)}},async run(){return sqlite.prepare(sql).run(...this.args)}}},
  async batch(stmts){sqlite.exec('BEGIN');try{const out=[];for(const s of stmts)out.push(await s.run());sqlite.exec('COMMIT');return out}catch(e){sqlite.exec('ROLLBACK');throw e}}
};
const env={DB,REQOO_ADMIN_TOKEN:'test-only'};
async function call(action,data={}){
  const r=await onRequest({env,request:new Request('https://example.test/api/shop-admin',{method:'POST',headers:{'content-type':'application/json','X-Admin-Token':'test-only'},body:JSON.stringify({action,...data})})});
  return{status:r.status,...await r.json()};
}

sqlite.prepare("INSERT INTO customers(id,name,phone,email,status,created_at,updated_at) VALUES('big','Big Corporate','0123456789','big@example.com','active',datetime('now'),datetime('now'))").run();
const orderStmt=sqlite.prepare("INSERT INTO orders(id,order_no,customer_id,source,currency,subtotal_minor,discount_minor,shipping_minor,tax_minor,total_minor,payment_status,fulfillment_status,created_at,updated_at) VALUES(?,?, 'big','shop','MYR',1000,0,0,0,1000,?,'pending',datetime('now',?),datetime('now',?))");
const docStmt=sqlite.prepare("INSERT INTO reqoo_documents(id,type,number,order_id,status,currency,subtotal_minor,discount_minor,shipping_minor,tax_minor,total_minor,issued_at,due_at,customer_name,customer_phone,customer_email,company_json,payment_status,share_token,created_at,updated_at) VALUES(?,'invoice',?,?,?,'MYR',1000,0,0,0,1000,datetime('now',?),NULL,'Big Corporate','0123456789','big@example.com','{}',?,?,datetime('now',?),datetime('now',?))");
const payStmt=sqlite.prepare("INSERT INTO reqoo_payments(id,order_id,invoice_document_id,receipt_number,amount_minor,payment_type,method,reference,note,paid_at,status,share_token,created_at,updated_at) VALUES(?,?,?,?,500,'deposit','bank_transfer',NULL,NULL,datetime('now',?),'confirmed',?,datetime('now'),datetime('now'))");

for(let i=0;i<1205;i++){
  const id='o'+i,paid=i<500,partial=i>=500&&i<900,status=paid?'paid':partial?'partial':'pending',age='-'+i+' minutes',inv='inv'+i;
  orderStmt.run(id,'RQ-BIG-'+String(i).padStart(5,'0'),status,age,age);
  docStmt.run(inv,'INV-BIG-'+String(i).padStart(5,'0'),id,paid?'paid':'issued',age,status,'share-'+inv,age,age);
  if(partial)payStmt.run('pay'+i,id,inv,'RC-BIG-'+String(i).padStart(5,'0'),age,'share-pay-'+i);
}
const quoteStmt=sqlite.prepare("INSERT INTO reqoo_documents(id,type,number,order_id,status,currency,subtotal_minor,discount_minor,shipping_minor,tax_minor,total_minor,issued_at,due_at,customer_name,customer_phone,customer_email,company_json,payment_status,share_token,created_at,updated_at) VALUES(?,'quotation',?,?,'issued','MYR',1000,0,0,0,1000,datetime('now',?),NULL,'Big Corporate','0123456789','big@example.com','{}','pending',?,datetime('now',?),datetime('now',?))");
for(let i=0;i<50;i++){const age='-'+i+' minutes';quoteStmt.run('q'+i,'QT-BIG-'+String(i).padStart(3,'0'),'o'+i,age,'share-q'+i,age,age)}

const detail=await call('customerDetail',{customerId:'big'});
assert.equal(detail.ok,true);
assert.equal(detail.summary.orderCount,1205,'customer summary must count every order beyond the former 500 cap');
assert.equal(detail.summary.documentCount,1255);
assert.equal(detail.summary.quotationCount,50);
assert.equal(detail.summary.receiptCount,400);
assert.equal(detail.summary.collectedMinor,700000,'500 legacy-paid orders plus 400 half-paid orders must count fully');
assert.equal(detail.summary.outstandingMinor,505000);
assert.ok(detail.activity.length<=30);
assert.ok(detail.activity.length>0);
assert.equal(detail.orders,undefined,'profile open must not ship a 500-row order payload');
assert.equal(detail.documents,undefined,'profile open must not ship a 500-row document payload');
assert.equal(detail.payments,undefined,'profile open must not ship a 500-row payment payload');

const orders1=await call('customerRecords',{customerId:'big',type:'orders',limit:40,offset:0});
const orders2=await call('customerRecords',{customerId:'big',type:'orders',limit:40,offset:40});
assert.equal(orders1.records.length,40);assert.equal(orders1.hasMore,true);assert.equal(orders2.records.length,40);
assert.equal(new Set([...orders1.records,...orders2.records].map(x=>x.id)).size,80,'order pages must not overlap');
const oldOrder=await call('customerRecords',{customerId:'big',type:'orders',q:'RQ-BIG-01204',limit:40});
assert.equal(oldOrder.records.length,1);assert.equal(oldOrder.records[0].id,'o1204');
const paidOrder=await call('customerRecords',{customerId:'big',type:'orders',q:'RQ-BIG-00000',limit:40});
assert.equal(paidOrder.records[0].paymentStatus,'paid');assert.equal(paidOrder.records[0].balanceMinor,0,'legacy paid fallback must remain settled without canonical ledger');
const partialOrder=await call('customerRecords',{customerId:'big',type:'orders',q:'RQ-BIG-00500',limit:40});
assert.equal(partialOrder.records[0].paymentStatus,'partial');assert.equal(partialOrder.records[0].balanceMinor,500);

const docs1=await call('customerRecords',{customerId:'big',type:'documents',limit:40,offset:0});
const docs2=await call('customerRecords',{customerId:'big',type:'documents',limit:40,offset:40});
assert.equal(docs1.records.length,40);assert.equal(docs1.hasMore,true);assert.equal(new Set([...docs1.records,...docs2.records].map(x=>x.id)).size,80);
const oldDoc=await call('customerRecords',{customerId:'big',type:'documents',q:'INV-BIG-01204',limit:40});
assert.equal(oldDoc.records.length,1);assert.equal(oldDoc.records[0].id,'inv1204');

const pay1=await call('customerRecords',{customerId:'big',type:'payments',limit:40,offset:0});
const pay2=await call('customerRecords',{customerId:'big',type:'payments',limit:40,offset:40});
assert.equal(pay1.records.length,40);assert.equal(pay1.hasMore,true);assert.equal(new Set([...pay1.records,...pay2.records].map(x=>x.id)).size,80);
const oldPay=await call('customerRecords',{customerId:'big',type:'payments',q:'RC-BIG-00899',limit:40});
assert.equal(oldPay.records.length,1);assert.equal(oldPay.records[0].id,'pay899');

const noOrder=await call('customerRecords',{customerId:'big',type:'orders',q:'ZZZNOPE',limit:40});
assert.equal(noOrder.records.length,0);

const ui=fs.readFileSync(new URL('../admin/customers.js',import.meta.url),'utf8');
assert.match(ui,/customerDetail/);assert.match(ui,/customerRecords/);assert.match(ui,/limit:40/);assert.match(ui,/data-crm-more/);assert.match(ui,/customerDetailSearch/);assert.match(ui,/setTimeout\(\(\)=>loadRecords\(activeTab,true\),260\)/);
assert.doesNotMatch(ui,/x\.orders/);assert.doesNotMatch(ui,/x\.documents/);assert.doesNotMatch(ui,/x\.payments/);
const apiSrc=fs.readFileSync(new URL('../api/shop-admin-flow-v18.js',import.meta.url),'utf8');
assert.match(apiSrc,/customerRecords/);assert.doesNotMatch(apiSrc,/WHERE o\.customer_id=\? ORDER BY o\.created_at DESC LIMIT 500/);
console.log('PASS: CRM customer detail keeps full-database KPIs while Orders/Documents/Payments are searched and paged beyond 1,000 records.');
sqlite.close();

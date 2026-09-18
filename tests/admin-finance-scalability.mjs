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
await call('financeDashboard',{range:'30'});

sqlite.prepare("INSERT INTO customers(id,name,phone,email,status,created_at,updated_at) VALUES('c1','Finance Buyer','0123456789','finance@example.com','active',datetime('now'),datetime('now'))").run();
const orderStmt=sqlite.prepare("INSERT INTO orders(id,order_no,customer_id,source,currency,subtotal_minor,discount_minor,shipping_minor,tax_minor,total_minor,payment_status,fulfillment_status,created_at,updated_at) VALUES(?,?,?,'shop','MYR',1000,0,0,0,1000,?,?,datetime('now',?),datetime('now',?))");
const itemStmt=sqlite.prepare("INSERT INTO order_items(id,order_id,product_id,product_name_snapshot,quantity,unit_price_minor,line_total_minor,created_at) VALUES(?,?,NULL,?,1,1000,1000,datetime('now'))");
const payStmt=sqlite.prepare("INSERT INTO reqoo_payments(id,order_id,invoice_document_id,receipt_number,share_token,payment_type,method,reference,note,amount_minor,status,paid_at,created_at,updated_at) VALUES(?,?,NULL,?,?,?,'bank_transfer',NULL,NULL,?,'confirmed',datetime('now',?),datetime('now',?),datetime('now',?))");
for(let i=0;i<2105;i++){
  const id='o'+i,failed=i>=2000,full=i<1000,partial=i>=1000&&i<1500,payment=failed?'failed':full?'paid':partial?'partial':'pending';
  orderStmt.run(id,'RQ-F-'+String(i).padStart(5,'0'),'c1',payment,'pending','-'+(i%20)+' hours','-'+(i%20)+' hours');
  itemStmt.run('item_'+id,id,'Scalable Product');
  if(full||partial)payStmt.run('p'+i,id,'RC-F-'+String(i).padStart(5,'0'),'share-p'+i,full?'full':'deposit',full?1000:500,'-'+(i%20)+' hours','-'+(i%20)+' hours','-'+(i%20)+' hours');
}
orderStmt.run('old1','RQ-OLD','c1','paid','pending','-120 days','-120 days');
itemStmt.run('item_old1','old1','Old Product');
payStmt.run('p_old','old1','RC-OLD','share-old','full',2000,'-120 days','-120 days','-120 days');
sqlite.prepare("UPDATE orders SET subtotal_minor=2000,total_minor=2000 WHERE id='old1'").run();
sqlite.prepare("UPDATE order_items SET unit_price_minor=2000,line_total_minor=2000 WHERE order_id='old1'").run();

const dash=await call('financeDashboard',{range:'30'});
assert.equal(dash.ok,true);
assert.equal(dash.summary.validOrders,2000);
assert.equal(dash.summary.collectedMinor,1250000);
assert.equal(dash.summary.paidOrders,1500);
assert.equal(dash.summary.outstandingMinor,750000);
assert.equal(dash.summary.outstandingOrders,1000);
assert.equal(dash.summary.ordersWithPaymentRate,75);
assert.equal(dash.summary.averageCollectedMinor,833);
assert.deepEqual(dash.breakdown,{paid:1000,partial:500,pending:500});
assert.equal(dash.products.length,1);
assert.equal(dash.products[0].product_name,'Scalable Product');
assert.equal(Number(dash.products[0].orders),1500);
assert.equal(Number(dash.products[0].units_sold),1500);
assert.equal(Number(dash.products[0].collected_minor),1250000);
assert.equal(dash.transactions.length,12);
assert.equal(dash.transactionsHasMore,true);
assert.ok(dash.trend.length>=1&&dash.trend.length<=12);

const next=await call('financeTransactions',{range:'30',limit:25,offset:12});
assert.equal(next.ok,true);
assert.equal(next.transactions.length,25);
assert.equal(next.hasMore,true);
assert.equal(new Set([...dash.transactions,...next.transactions].map(x=>x.id)).size,37,'transaction pages must not overlap');

const all=await call('financeDashboard',{range:'all'});
assert.equal(all.summary.validOrders,2001);
assert.equal(all.summary.collectedMinor,1252000);
assert.equal(all.summary.outstandingMinor,750000);
assert.equal(all.products.length,2);
assert.equal(all.products.reduce((s,x)=>s+Number(x.collected_minor||0),0),1252000);

const ui=fs.readFileSync(new URL('../admin/finance.js',import.meta.url),'utf8');
assert.match(ui,/financeDashboard/);
assert.match(ui,/financeTransactions/);
assert.match(ui,/loadMoreFinance/);
assert.doesNotMatch(ui,/listOrders/);
assert.doesNotMatch(ui,/listPayments/);
assert.doesNotMatch(ui,/paymentSummary/);
assert.doesNotMatch(ui,/productsDashboard/);
assert.doesNotMatch(ui,/limit:2000/);
console.log('PASS: Finance uses one aggregate dashboard over >2,000 orders and lazy paged transactions without clipping KPI or product allocation.');
sqlite.close();

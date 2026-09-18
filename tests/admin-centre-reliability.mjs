import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {onRequest} from '../api/shop-admin-flow-v16.js';
const sqlite=new DatabaseSync(':memory:');
sqlite.exec(fs.readFileSync(new URL('../migrations/0001_reqoo_core.sql',import.meta.url),'utf8'));
sqlite.exec('ALTER TABLE orders ADD COLUMN order_no TEXT');
sqlite.exec(fs.readFileSync(new URL('../migrations/0009_shop_production_meta.sql',import.meta.url),'utf8'));
let failPattern=null;
const DB={prepare(sql){return {sql,args:[],bind(...args){this.args=args;return this},async first(){return sqlite.prepare(sql).get(...this.args)||null},async all(){return {results:sqlite.prepare(sql).all(...this.args)}},async run(){if(failPattern?.test(sql))throw Error('Injected write failure');return sqlite.prepare(sql).run(...this.args)}}},async batch(stmts){sqlite.exec('BEGIN');try{const results=[];for(const stmt of stmts)results.push(await stmt.run());sqlite.exec('COMMIT');return results}catch(e){sqlite.exec('ROLLBACK');throw e}}};
const env={DB,REQOO_ADMIN_TOKEN:'test-only'};
async function call(action,data={}){const response=await onRequest({env,request:new Request('https://example.test/api/shop-admin',{method:'POST',headers:{'Content-Type':'application/json','X-Admin-Token':'test-only'},body:JSON.stringify({action,...data})})});return {status:response.status,...await response.json()}}
function seed(id,payment='pending',fulfillment='pending'){
 sqlite.prepare("INSERT INTO orders(id,order_no,payment_status,fulfillment_status,total_minor,subtotal_minor,created_at,updated_at) VALUES(?,?,?,?,1000,1000,datetime('now'),datetime('now'))").run(id,id,payment,fulfillment);
 sqlite.prepare("INSERT INTO payments(id,order_id,provider,amount_minor,status,created_at,updated_at) VALUES(?,?,'manual',1000,'pending',datetime('now'),datetime('now'))").run('pay_'+id,id);
 sqlite.prepare("INSERT INTO order_items(id,order_id,product_name_snapshot,quantity,unit_price_minor,line_total_minor,created_at) VALUES(?,?,'Test item',1,1000,1000,datetime('now'))").run('item_'+id,id);
}
const originalError=console.error;console.error=()=>{};
try{
 seed('atomic');failPattern=/^UPDATE payments/;
 assert.equal((await call('verifyPayment',{orderId:'atomic'})).status,500);
 assert.equal(sqlite.prepare("SELECT payment_status FROM orders WHERE id='atomic'").get().payment_status,'pending');
 assert.equal(sqlite.prepare("SELECT status FROM payments WHERE order_id='atomic'").get().status,'pending');
 failPattern=null;assert.equal((await call('verifyPayment',{orderId:'atomic'})).ok,true);
 assert.equal(sqlite.prepare("SELECT status FROM payments WHERE order_id='atomic'").get().status,'paid');
 assert.equal(sqlite.prepare("SELECT fulfillment_status FROM orders WHERE id='atomic'").get().fulfillment_status,'pending');
 assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM documents WHERE order_id='atomic'").get().n,2);
 sqlite.prepare("INSERT INTO orders(id,order_no,payment_status,fulfillment_status,total_minor,subtotal_minor,created_at,updated_at) VALUES('manual','manual','pending','pending',1500,1500,datetime('now'),datetime('now'))").run();
 sqlite.prepare("INSERT INTO order_items(id,order_id,product_name_snapshot,quantity,unit_price_minor,line_total_minor,created_at) VALUES('item_manual','manual','Manual item',1,1500,1500,datetime('now'))").run();
 const manual=await call('verifyPayment',{orderId:'manual'});assert.equal(manual.ok,true);assert.equal(manual.paymentCreated,true);
 const manualPay=sqlite.prepare("SELECT * FROM payments WHERE order_id='manual'").get();assert.equal(manualPay.status,'paid');assert.equal(manualPay.provider,'manual');assert.equal(manualPay.method,'admin_verify');assert.equal(manualPay.amount_minor,1500);
 assert.equal(sqlite.prepare("SELECT fulfillment_status FROM orders WHERE id='manual'").get().fulfillment_status,'pending');
 seed('repair','paid','fulfilled');assert.equal((await call('verifyPayment',{orderId:'repair'})).already,true);
 assert.equal(sqlite.prepare("SELECT status FROM payments WHERE order_id='repair'").get().status,'paid');
 assert.equal(sqlite.prepare("SELECT fulfillment_status FROM orders WHERE id='repair'").get().fulfillment_status,'fulfilled');
 seed('cancelled','failed','cancelled');assert.equal((await call('verifyPayment',{orderId:'cancelled'})).status,409);
 failPattern=/^INSERT INTO reqoo_document_items/;
 assert.equal((await call('createDocument',{orderId:'atomic',type:'invoice'})).status,500);
 assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM reqoo_documents WHERE order_id='atomic'").get().n,0);
 failPattern=null;const doc=await call('createDocument',{orderId:'atomic',type:'invoice'});assert.equal(doc.ok,true);assert.equal(doc.document.items.length,1);
 assert.equal((await call('createDocument',{orderId:'atomic',type:'invoice'})).document.id,doc.document.id);
 sqlite.prepare('DELETE FROM reqoo_document_items WHERE document_id=?').run(doc.document.id);
 const repaired=await call('createDocument',{orderId:'atomic',type:'invoice'});assert.equal(repaired.repaired,true);assert.equal(repaired.document.items.length,1);
 const links=await call('documentLinks',{orderId:'atomic'});assert.equal(links.ok,true);assert.ok(links.invoiceUrl.startsWith('https://reqoo.co/d/'));
 const publicDoc=await call('publicDocument',{shareToken:links.receiptUrl.split('/').pop()});assert.equal(publicDoc.document.type,'receipt');assert.equal(publicDoc.document.items.length,1);
 // More than 12 overdue rows plus today's rows must all contribute to the KPIs.
 for(let i=0;i<20;i++){seed('due_'+i,'paid','processing');sqlite.prepare("INSERT INTO shop_production_meta(order_id,due_date,updated_at) VALUES(?,date('now',?),datetime('now'))").run('due_'+i,i<15?'-1 day':'+0 day')}
 const dashboard=await call('dashboardSummary');assert.equal(dashboard.ok,true);assert.equal(dashboard.due.length,12);assert.equal(dashboard.kpis.overdue,15);assert.equal(dashboard.kpis.due_today,5);
 console.log('PASS: payment confirmation is atomic, creates a manual payment row when needed, leaves paid work READY, repairs legacy state, and preserves production KPIs.');
}finally{console.error=originalError;sqlite.close()}

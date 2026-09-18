import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {onRequest} from '../api/shop-admin-flow-v18.js';

const sqlite=new DatabaseSync(':memory:');
sqlite.exec(fs.readFileSync(new URL('../migrations/0001_reqoo_core.sql',import.meta.url),'utf8'));
sqlite.exec('ALTER TABLE orders ADD COLUMN order_no TEXT');
sqlite.exec(fs.readFileSync(new URL('../migrations/0002_reqoo_documents_v2.sql',import.meta.url),'utf8'));
const DB={prepare(sql){return{sql,args:[],bind(...args){this.args=args;return this},async first(){return sqlite.prepare(sql).get(...this.args)||null},async all(){return{results:sqlite.prepare(sql).all(...this.args)}},async run(){return sqlite.prepare(sql).run(...this.args)}}},async batch(stmts){sqlite.exec('BEGIN');try{const out=[];for(const s of stmts)out.push(await s.run());sqlite.exec('COMMIT');return out}catch(e){sqlite.exec('ROLLBACK');throw e}}};
const env={DB,REQOO_ADMIN_TOKEN:'test-only'};
async function call(action,data={}){const r=await onRequest({env,request:new Request('https://example.test/api/shop-admin',{method:'POST',headers:{'content-type':'application/json','X-Admin-Token':'test-only'},body:JSON.stringify({action,...data})})});return{status:r.status,...await r.json()}}

for(let i=0;i<520;i++)sqlite.prepare("INSERT INTO customers(id,name,phone,email,created_at,updated_at) VALUES(?,?,?,?,datetime('now',?),datetime('now',?))").run('c'+i,'Customer '+i,'010000'+String(i).padStart(4,'0'),'c'+i+'@example.com','-'+i+' minutes','-'+i+' minutes');
sqlite.prepare("INSERT INTO orders(id,order_no,customer_id,payment_status,fulfillment_status,total_minor,subtotal_minor,currency,created_at,updated_at) VALUES('o1','RQ-1','c0','paid','pending',1000,1000,'MYR',datetime('now'),datetime('now'))").run();
sqlite.prepare("INSERT INTO orders(id,order_no,customer_id,payment_status,fulfillment_status,total_minor,subtotal_minor,currency,created_at,updated_at) VALUES('o2','RQ-2','c0','partial','pending',2000,2000,'MYR',datetime('now'),datetime('now'))").run();

const warm=await call('customerDashboard',{limit:20});assert.equal(warm.ok,true);
sqlite.prepare("INSERT INTO reqoo_payments(id,order_id,invoice_document_id,receipt_number,share_token,payment_type,method,reference,note,amount_minor,status,paid_at,created_at,updated_at) VALUES('p2','o2',NULL,'RC-2026-00001','share-p2','deposit','bank_transfer','ref','','500','confirmed',datetime('now'),datetime('now'),datetime('now'))").run();
sqlite.prepare("INSERT INTO reqoo_documents(id,type,number,order_id,status,currency,subtotal_minor,discount_minor,shipping_minor,tax_minor,total_minor,issued_at,due_at,customer_name,customer_phone,customer_email,company_json,payment_status,share_token,created_at,updated_at) VALUES('inv2','invoice','INV-2026-00001','o2','issued','MYR',2000,0,0,0,2000,datetime('now'),datetime('now','+14 day'),'Customer 0','0100000000','c0@example.com','{}','partial','share-inv2',datetime('now'),datetime('now'))").run();

const dash=await call('customerDashboard',{limit:120,sort:'spend'});
assert.equal(dash.ok,true);
assert.equal(dash.customers.length,120,'dashboard should return a bounded list');
assert.equal(dash.stats.customers,520,'global customer KPI must not be limited by the visible batch');
assert.equal(dash.stats.repeatCustomers,1);
assert.equal(dash.stats.collectedMinor,1500);
assert.equal(dash.stats.outstandingMinor,1500);
assert.equal(dash.customers[0].id,'c0');
assert.equal(Number(dash.customers[0].order_count),2);
assert.equal(Number(dash.customers[0].collected_minor),1500);
assert.equal(Number(dash.customers[0].outstanding_minor),1500);

const search=await call('customerDashboard',{q:'Customer 519',limit:120});
assert.equal(search.customers.length,1);
assert.equal(search.customers[0].id,'c519');
const noTextMatch=await call('customerDashboard',{q:'ZZZNOPE',limit:120});assert.equal(noTextMatch.customers.length,0,'text-only CRM search must not match every phone via an empty wildcard');

const detail=await call('customerDetail',{customerId:'c0'});
assert.equal(detail.ok,true);
assert.equal(detail.summary.orderCount,2);
assert.equal(detail.summary.documentCount,1);
assert.equal(detail.summary.receiptCount,1);
assert.equal(detail.summary.collectedMinor,1500);
assert.equal(detail.summary.outstandingMinor,1500);
assert.ok(detail.activity.length>0);
assert.equal(detail.orders,undefined);
const orderRecords=await call('customerRecords',{customerId:'c0',type:'orders',limit:40});
assert.equal(orderRecords.records.length,2);
assert.equal(orderRecords.records.find(x=>x.id==='o2').balanceMinor,1500);
const paymentRecords=await call('customerRecords',{customerId:'c0',type:'payments',limit:40});
assert.equal(paymentRecords.records.length,1);
const documentRecords=await call('customerRecords',{customerId:'c0',type:'documents',limit:40});
assert.equal(documentRecords.records.length,1);

const ui=fs.readFileSync(new URL('../admin/customers.js',import.meta.url),'utf8');
assert.match(ui,/customerDashboard/);
assert.match(ui,/customerDetail/);
assert.match(ui,/customerRecords/);
assert.doesNotMatch(ui,/listCustomers/);
assert.doesNotMatch(ui,/listOrders/);
assert.doesNotMatch(ui,/listDocuments/);
assert.doesNotMatch(ui,/listPayments/);
assert.doesNotMatch(ui,/paymentSummary/);
assert.match(ui,/setTimeout\(load,260\)/);
assert.match(ui,/limit:40/);
assert.match(ui,/data-crm-more/);
console.log('PASS: CRM list and profile KPIs stay complete while customer detail records are loaded in bounded pages.');
sqlite.close();

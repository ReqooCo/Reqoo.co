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

sqlite.prepare("INSERT INTO customers(id,name,phone,email,status,created_at,updated_at) VALUES('alpha','Alpha Unique','0123456789','alpha@example.com','active',datetime('now'),datetime('now'))").run();
sqlite.prepare("INSERT INTO customers(id,name,phone,email,status,created_at,updated_at) VALUES('common','Common Buyer','0199999999','common@example.com','active',datetime('now'),datetime('now'))").run();

const insert=sqlite.prepare("INSERT INTO orders(id,order_no,customer_id,source,currency,subtotal_minor,discount_minor,shipping_minor,tax_minor,total_minor,payment_status,fulfillment_status,created_at,updated_at) VALUES(?,?,?,'shop','MYR',1000,0,0,0,1000,?,?,datetime('now',?),datetime('now',?))");
for(let i=0;i<1205;i++){
  const mod=i%5;
  const payment=mod===0?'pending':mod===1?'paid':mod===2?'partial':mod===3?'paid':'failed';
  const fulfillment=mod===2?'processing':mod===3?'fulfilled':'pending';
  const customer=i===1204?'alpha':'common';
  insert.run('o'+i,'RQ-'+String(i).padStart(5,'0'),customer,payment,fulfillment,'-'+i+' minutes','-'+i+' minutes');
}
sqlite.prepare("INSERT INTO reqoo_documents(id,type,number,order_id,status,currency,subtotal_minor,discount_minor,shipping_minor,tax_minor,total_minor,issued_at,due_at,customer_name,customer_phone,customer_email,company_json,payment_status,share_token,created_at,updated_at) VALUES('old-inv','invoice','INV-OLD','o1204','paid','MYR',1000,0,0,0,1000,datetime('now'),NULL,'Alpha Unique','0123456789','alpha@example.com','{}','paid','share-old-inv',datetime('now'),datetime('now'))").run();

const first=await call('ordersDashboard',{filter:'active',limit:80,offset:0});
assert.equal(first.ok,true);
assert.equal(first.orders.length,80);
assert.equal(first.total,964);
assert.equal(first.hasMore,true);
assert.equal(first.stats.total,1205);
assert.equal(first.stats.pending,241);
assert.equal(first.stats.paid,241);
assert.equal(first.stats.processing,241);
assert.equal(first.stats.paymentReady,723);

const second=await call('ordersDashboard',{filter:'active',limit:80,offset:80});
assert.equal(second.orders.length,80);
assert.equal(second.offset,80);
assert.equal(new Set([...first.orders,...second.orders].map(x=>x.id)).size,160,'paged results must not overlap');

const closed=await call('ordersDashboard',{filter:'closed',limit:80,offset:0});
assert.equal(closed.total,241);
assert.ok(closed.orders.every(x=>String(x.payment_status).toLowerCase()==='failed'||String(x.fulfillment_status).toLowerCase()==='cancelled'));

const processing=await call('ordersDashboard',{filter:'processing',limit:80,offset:0});
assert.equal(processing.total,241);
assert.ok(processing.orders.every(x=>String(x.fulfillment_status).toLowerCase()==='processing'&&['paid','partial'].includes(String(x.payment_status).toLowerCase())));

const search=await call('ordersDashboard',{filter:'all',q:'Alpha Unique',limit:80,offset:0});
assert.equal(search.total,1,'text-only search must not turn empty phone digits into a wildcard match');
assert.equal(search.orders[0].id,'o1204');
assert.match(String(search.orders[0].document_types||''),/invoice/,'old paged orders must expose saved document types');

const noMatch=await call('ordersDashboard',{filter:'all',q:'ZZZNOPE',limit:80,offset:0});
assert.equal(noMatch.total,0);

const exact=await call('getOrder',{orderId:'o1204'});
assert.equal(exact.ok,true);
assert.equal(exact.order.order_no,'RQ-01204');

const ordersUi=fs.readFileSync(new URL('../admin/orders.js',import.meta.url),'utf8');
assert.match(ordersUi,/ordersDashboard/);
assert.match(ordersUi,/limit:80/);
assert.match(ordersUi,/offset:pageOffset/);
assert.match(ordersUi,/loadMoreOrders/);
assert.doesNotMatch(ordersUi,/listOrders/);
assert.doesNotMatch(ordersUi,/limit:1000/);

const docsUi=fs.readFileSync(new URL('../admin/documents.js',import.meta.url),'utf8');
assert.match(docsUi,/ordersDashboard/);
assert.match(docsUi,/limit:80/);
assert.match(docsUi,/loadMoreDocOrders/);
assert.match(docsUi,/document_types/);
assert.doesNotMatch(docsUi,/listOrders/);
assert.doesNotMatch(docsUi,/limit:1000/);

console.log('PASS: Orders and Documents use bounded server-side paging/search across >1,000 orders while exact deep links and saved document badges remain correct.');
sqlite.close();

import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {onRequest} from '../api/shop-admin-flow-v16.js';

const sqlite=new DatabaseSync(':memory:');
sqlite.exec(fs.readFileSync(new URL('../migrations/0001_reqoo_core.sql',import.meta.url),'utf8'));
sqlite.exec('ALTER TABLE orders ADD COLUMN order_no TEXT');
sqlite.exec(fs.readFileSync(new URL('../migrations/0009_shop_production_meta.sql',import.meta.url),'utf8'));

const DB={
  prepare(sql){return{sql,args:[],bind(...args){this.args=args;return this},async first(){return sqlite.prepare(sql).get(...this.args)||null},async all(){return{results:sqlite.prepare(sql).all(...this.args)}},async run(){return sqlite.prepare(sql).run(...this.args)}}},
  async batch(stmts){sqlite.exec('BEGIN');try{const out=[];for(const s of stmts)out.push(await s.run());sqlite.exec('COMMIT');return out}catch(e){sqlite.exec('ROLLBACK');throw e}}
};
const env={DB,REQOO_ADMIN_TOKEN:'test-only'};
async function call(data={}){
  const r=await onRequest({env,request:new Request('https://example.test/api/shop-admin',{method:'POST',headers:{'content-type':'application/json','X-Admin-Token':'test-only'},body:JSON.stringify({action:'productionDashboard',...data})})});
  return{status:r.status,...await r.json()};
}

sqlite.prepare("INSERT INTO customers(id,name,phone,email,status,created_at,updated_at) VALUES('common','Common Production','0199999999','common@example.com','active',datetime('now'),datetime('now'))").run();
sqlite.prepare("INSERT INTO customers(id,name,phone,email,status,created_at,updated_at) VALUES('needle','Needle Production','0123456789','needle@example.com','active',datetime('now'),datetime('now'))").run();
const orderStmt=sqlite.prepare("INSERT INTO orders(id,order_no,customer_id,source,currency,subtotal_minor,discount_minor,shipping_minor,tax_minor,total_minor,payment_status,fulfillment_status,created_at,updated_at) VALUES(?,?,?,'shop','MYR',1000,0,0,0,1000,?,?,datetime('now',?),datetime('now',?))");
for(let i=0;i<1305;i++){
  const mod=i%5,payment=mod===0?'pending':mod===1?'paid':mod===2?'partial':mod===3?'paid':'failed',fulfillment=mod===2?'processing':mod===3?'fulfilled':'pending';
  orderStmt.run('o'+i,'RQ-P-'+String(i).padStart(5,'0'),i===2?'needle':'common',payment,fulfillment,'-'+i+' minutes','-'+i+' minutes');
}
const meta=sqlite.prepare("INSERT INTO shop_production_meta(order_id,due_date,priority,assigned_to,internal_note,updated_at) VALUES(?,date('now','+8 hours',?),?,?,?,datetime('now'))");
meta.run('o1','+0 day','urgent','Alpha PIC','today urgent');
meta.run('o6','+0 day','normal','Beta PIC','today normal');
meta.run('o2','-1 day','high','Needle PIC','overdue processing');
meta.run('o3','-2 day','normal','Done PIC','overdue fulfilled');
meta.run('o11','+2 day','high','Future PIC','future ready');

const active=await call({filter:'active',limit:80,offset:0});
assert.equal(active.ok,true);
assert.equal(active.orders.length,80);
assert.equal(active.total,783);
assert.equal(active.hasMore,true);
assert.deepEqual(active.counts,{pending:261,paid:261,processing:261,fulfilled:261});
assert.equal(active.orders[0].id,'o2','overdue active work must sort before due-today work');
assert.equal(active.orders[1].id,'o1','same-day urgent work must sort before normal priority');
assert.equal(active.orders[2].id,'o6');

const second=await call({filter:'active',limit:80,offset:80});
assert.equal(second.orders.length,80);
assert.equal(second.offset,80);
assert.equal(new Set([...active.orders,...second.orders].map(x=>x.id)).size,160,'production pages must not overlap');

const processing=await call({filter:'processing',limit:80,offset:0});
assert.equal(processing.total,261);
assert.ok(processing.orders.every(x=>x.fulfillment_status==='processing'&&['paid','partial'].includes(x.payment_status)));

const fulfilled=await call({filter:'fulfilled',limit:80,offset:0});
assert.equal(fulfilled.total,261);
assert.ok(fulfilled.orders.every(x=>x.fulfillment_status==='fulfilled'&&['paid','partial'].includes(x.payment_status)));

const today=await call({filter:'today',limit:80,offset:0});
assert.equal(today.total,2);
assert.deepEqual(today.orders.map(x=>x.id),['o1','o6']);

const overdue=await call({filter:'overdue',limit:80,offset:0});
assert.equal(overdue.total,2,'due filter preserves the prior queue behavior including fulfilled work with an overdue plan');
assert.deepEqual(new Set(overdue.orders.map(x=>x.id)),new Set(['o2','o3']));

const pic=await call({filter:'processing',q:'Needle PIC',limit:80,offset:0});
assert.equal(pic.total,1);
assert.equal(pic.orders[0].id,'o2');

const customer=await call({filter:'processing',q:'Needle Production',limit:80,offset:0});
assert.equal(customer.total,1);
assert.equal(customer.orders[0].id,'o2');

const noMatch=await call({filter:'active',q:'ZZZNOPE',limit:80,offset:0});
assert.equal(noMatch.total,0,'text-only search must not match every phone through an empty wildcard');

const ui=fs.readFileSync(new URL('../admin/production.js',import.meta.url),'utf8');
assert.match(ui,/productionDashboard/);
assert.match(ui,/limit:80/);
assert.match(ui,/offset:pageOffset/);
assert.match(ui,/loadMoreProduction/);
assert.match(ui,/setTimeout\(\(\)=>load\(true\),260\)/);
assert.doesNotMatch(ui,/function visible\(/);
assert.doesNotMatch(ui,/LIMIT 1000/);
console.log('PASS: Production uses bounded server-side paging/filter/search across >1,000 orders while KPI, due-state and priority ordering stay complete.');
sqlite.close();

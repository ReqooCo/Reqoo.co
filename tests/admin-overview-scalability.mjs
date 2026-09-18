import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {onRequest} from '../api/shop-admin-flow-v18.js';

const sqlite=new DatabaseSync(':memory:');
sqlite.exec(fs.readFileSync(new URL('../migrations/0001_reqoo_core.sql',import.meta.url),'utf8'));
sqlite.exec('ALTER TABLE orders ADD COLUMN order_no TEXT');
sqlite.exec(fs.readFileSync(new URL('../migrations/0002_reqoo_documents_v2.sql',import.meta.url),'utf8'));
sqlite.exec(fs.readFileSync(new URL('../migrations/0009_shop_production_meta.sql',import.meta.url),'utf8'));

const DB={
  prepare(sql){return{sql,args:[],bind(...args){this.args=args;return this},async first(){return sqlite.prepare(sql).get(...this.args)||null},async all(){return{results:sqlite.prepare(sql).all(...this.args)}},async run(){return sqlite.prepare(sql).run(...this.args)}}},
  async batch(stmts){sqlite.exec('BEGIN');try{const out=[];for(const s of stmts)out.push(await s.run());sqlite.exec('COMMIT');return out}catch(e){sqlite.exec('ROLLBACK');throw e}}
};
const env={DB,REQOO_ADMIN_TOKEN:'test-only'};
async function call(action,data={}){
  const r=await onRequest({env,request:new Request('https://example.test/api/shop-admin',{method:'POST',headers:{'content-type':'application/json','X-Admin-Token':'test-only'},body:JSON.stringify({action,...data})})});
  return{status:r.status,...await r.json()};
}

sqlite.prepare("INSERT INTO customers(id,name,phone,email,status,created_at,updated_at) VALUES('c1','Overview Buyer','0123456789','overview@example.com','active',datetime('now'),datetime('now'))").run();
const orderStmt=sqlite.prepare("INSERT INTO orders(id,order_no,customer_id,source,currency,subtotal_minor,discount_minor,shipping_minor,tax_minor,total_minor,payment_status,fulfillment_status,created_at,updated_at) VALUES(?,?, 'c1','shop','MYR',1000,0,0,0,1000,'pending','pending',datetime('now'),datetime('now'))");
const docStmt=sqlite.prepare("INSERT INTO reqoo_documents(id,type,number,order_id,status,currency,subtotal_minor,discount_minor,shipping_minor,tax_minor,total_minor,issued_at,due_at,customer_name,customer_phone,customer_email,company_json,payment_status,share_token,created_at,updated_at) VALUES(?, 'invoice', ?, ?, 'issued','MYR',1000,0,0,0,1000,datetime('now'),date('now','+8 hours',?),'Overview Buyer','0123456789','overview@example.com','{}','pending',?,datetime('now'),datetime('now'))");

for(let i=0;i<125;i++){
  const id='ov'+i;orderStmt.run(id,'RQ-OV-'+String(i).padStart(4,'0'));
  docStmt.run('inv_'+id,'INV-OV-'+String(i).padStart(4,'0'),id,'-'+(1+(i%30))+' day','share_'+id);
}
for(let i=0;i<9;i++){
  const id='due'+i;orderStmt.run(id,'RQ-DUE-'+String(i).padStart(3,'0'));
  docStmt.run('inv_'+id,'INV-DUE-'+String(i).padStart(3,'0'),id,'+'+i+' day','share_'+id);
}

const dash=await call('dashboardSummary');
assert.equal(dash.ok,true);
assert.equal(dash.commandCenter.overdue_invoice_count,125,'Overview overdue KPI must count all invoices, not only the oldest 80');
assert.equal(dash.commandCenter.overdue_invoice_minor,125000);
assert.equal(dash.commandCenter.due_soon_count,8,'Due soon is today through the next 7 days inclusive');
assert.equal(dash.commandCenter.due_soon_minor,8000);
assert.ok(dash.commandCenter.invoice_due.length<=12,'Overview detail list must stay bounded');
assert.ok(dash.commandCenter.followups.length<=12,'Daily follow-up list must stay bounded');
assert.ok(dash.commandCenter.followups.some(x=>x.kind==='invoice_overdue'));
assert.ok(dash.commandCenter.followups.filter(x=>x.kind==='invoice_overdue').every(x=>x.action_url.startsWith('/admin/documents.html?order=')),'invoice follow-ups must deep-link to exact order');

const api=fs.readFileSync(new URL('../api/shop-admin-flow-v15.js',import.meta.url),'utf8');
assert.match(api,/INVOICE_DUE_CTE/);
assert.match(api,/overdue_count/);
assert.match(api,/due_soon_count/);
assert.match(api,/LIMIT 16/);
assert.doesNotMatch(api,/ORDER BY d\.due_at ASC LIMIT 80/);
assert.match(api,/documents\.html\?order=/);
assert.match(api,/orders\.html\?order=/);
assert.match(api,/customers\.html\?customer=/);
assert.match(api,/production\.html\?q=/);

const production=fs.readFileSync(new URL('../admin/production.js',import.meta.url),'utf8');
assert.match(production,/initialProductionQuery/);
assert.match(production,/URLSearchParams\(location\.search\)/);
console.log('PASS: Overview invoice KPI aggregates the full ledger beyond 80 rows while follow-ups stay bounded and deep-link to exact work.');
sqlite.close();

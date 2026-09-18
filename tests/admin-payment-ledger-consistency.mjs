import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {onRequest} from '../api/shop-admin-flow-v18.js';

const sqlite=new DatabaseSync(':memory:');
sqlite.exec(fs.readFileSync(new URL('../migrations/0001_reqoo_core.sql',import.meta.url),'utf8'));
sqlite.exec('ALTER TABLE orders ADD COLUMN order_no TEXT');
sqlite.exec(fs.readFileSync(new URL('../migrations/0009_shop_production_meta.sql',import.meta.url),'utf8'));

let failPattern=null;
const DB={
  prepare(sql){return {sql,args:[],bind(...args){this.args=args;return this},
    async first(){return sqlite.prepare(sql).get(...this.args)||null},
    async all(){return {results:sqlite.prepare(sql).all(...this.args)}},
    async run(){if(failPattern?.test(sql))throw Error('Injected write failure');return sqlite.prepare(sql).run(...this.args)}
  }},
  async batch(stmts){sqlite.exec('BEGIN');try{const out=[];for(const stmt of stmts)out.push(await stmt.run());sqlite.exec('COMMIT');return out}catch(e){sqlite.exec('ROLLBACK');throw e}}
};
const env={DB,REQOO_ADMIN_TOKEN:'test-only'};
async function call(action,data={}){
  const response=await onRequest({env,request:new Request('https://example.test/api/shop-admin',{method:'POST',headers:{'content-type':'application/json','X-Admin-Token':'test-only'},body:JSON.stringify({action,...data})})});
  return {httpStatus:response.status,...await response.json()};
}
function seed(id,total=12500){
  sqlite.prepare("INSERT INTO orders(id,order_no,payment_status,fulfillment_status,total_minor,subtotal_minor,currency,created_at,updated_at) VALUES(?,?, 'pending','pending',?,?, 'MYR',datetime('now'),datetime('now'))").run(id,id,total,total);
  sqlite.prepare("INSERT INTO payments(id,order_id,provider,amount_minor,currency,status,created_at,updated_at) VALUES(?,?,'manual',?,'MYR','pending',datetime('now'),datetime('now'))").run('pay_'+id,id,total);
  sqlite.prepare("INSERT INTO order_items(id,order_id,product_name_snapshot,quantity,unit_price_minor,line_total_minor,created_at) VALUES(?,?,'Test item',1,?,?,datetime('now'))").run('item_'+id,id,total,total);
}

const originalError=console.error;console.error=()=>{};
try{
  seed('sync_once');
  const verified=await call('verifyPayment',{orderId:'sync_once'});
  assert.equal(verified.ok,true);
  assert.equal(sqlite.prepare("SELECT payment_status FROM orders WHERE id='sync_once'").get().payment_status,'paid');
  assert.equal(sqlite.prepare("SELECT status FROM payments WHERE order_id='sync_once'").get().status,'paid');
  const canonical=sqlite.prepare("SELECT * FROM reqoo_payments WHERE order_id='sync_once'").get();
  assert.ok(canonical,'successful Verify Payment must synchronously populate the canonical ledger');
  assert.equal(canonical.status,'confirmed');
  assert.equal(canonical.amount_minor,12500);
  assert.match(canonical.receipt_number,/^RC-\d{4}-\d{5}$/);

  const retry=await call('verifyPayment',{orderId:'sync_once'});
  assert.equal(retry.ok,true);
  assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM reqoo_payments WHERE order_id='sync_once'").get().n,1,'Verify retry must stay idempotent in canonical ledger');

  seed('repair_after_sync_failure',7500);
  failPattern=/^INSERT OR IGNORE INTO reqoo_payments/;
  const failed=await call('verifyPayment',{orderId:'repair_after_sync_failure'});
  assert.equal(failed.httpStatus,500);
  assert.equal(sqlite.prepare("SELECT payment_status FROM orders WHERE id='repair_after_sync_failure'").get().payment_status,'paid','legacy payment commit remains durable');
  assert.equal(sqlite.prepare("SELECT status FROM payments WHERE order_id='repair_after_sync_failure'").get().status,'paid');
  assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM reqoo_payments WHERE order_id='repair_after_sync_failure'").get().n,0);
  failPattern=null;
  const repaired=await call('verifyPayment',{orderId:'repair_after_sync_failure'});
  assert.equal(repaired.ok,true);
  assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM reqoo_payments WHERE order_id='repair_after_sync_failure'").get().n,1,'retry must repair a missing canonical ledger row');

  const dashboard=await call('dashboardSummary');
  assert.equal(dashboard.ok,true);
  assert.equal(dashboard.commandCenter.today_collected_minor,20000,'Overview collection must include admin-verified payments without opening Finance first');
  assert.equal(dashboard.commandCenter.today_collected_count,2);

  console.log('PASS: Verify Payment synchronizes the canonical ledger immediately, retries repair partial sync failures, and Overview collection is current.');
}finally{console.error=originalError;sqlite.close()}

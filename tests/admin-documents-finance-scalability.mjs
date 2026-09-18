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

await call('documentsFinanceDashboard',{includePayments:false});

sqlite.prepare("INSERT INTO customers(id,name,phone,email,status,created_at,updated_at) VALUES('c1','Common Finance','0199999999','common@example.com','active',datetime('now'),datetime('now'))").run();
sqlite.prepare("INSERT INTO customers(id,name,phone,email,status,created_at,updated_at) VALUES('needle','Needle Finance','0123456789','needle@example.com','active',datetime('now'),datetime('now'))").run();

const orderStmt=sqlite.prepare("INSERT INTO orders(id,order_no,customer_id,source,currency,subtotal_minor,discount_minor,shipping_minor,tax_minor,total_minor,payment_status,fulfillment_status,created_at,updated_at) VALUES(?,?,?,'shop','MYR',1000,0,0,0,1000,?,'pending',datetime('now',?),datetime('now',?))");
const docStmt=sqlite.prepare("INSERT INTO reqoo_documents(id,type,number,order_id,status,currency,subtotal_minor,discount_minor,shipping_minor,tax_minor,total_minor,issued_at,due_at,customer_name,customer_phone,customer_email,company_json,payment_status,share_token,created_at,updated_at) VALUES(?,'invoice',?,?,?,'MYR',1000,0,0,0,1000,datetime('now',?),date('now','+8 hours',?),?,?,?,?,?, ?,datetime('now'),datetime('now'))");
const payStmt=sqlite.prepare("INSERT INTO reqoo_payments(id,order_id,invoice_document_id,receipt_number,amount_minor,payment_type,method,reference,note,paid_at,status,share_token,created_at,updated_at) VALUES(?,?,?,?,500,'deposit','bank_transfer',NULL,NULL,datetime('now',?),'confirmed',?,datetime('now'),datetime('now'))");

for(let i=0;i<2105;i++){
  const id='o'+i,inv='inv'+i,full=i<800,partial=i>=800&&i<1300,paymentStatus=full?'paid':partial?'partial':'pending';
  const isNeedle=i===1000,name=isNeedle?'Needle Finance':'Common Finance',phone=isNeedle?'0123456789':'0199999999',email=isNeedle?'needle@example.com':'common@example.com',customerId=isNeedle?'needle':'c1';
  let dueMod;
  if(partial)dueMod=i<1100?'-5 day':i<1200?'+3 day':'+20 day';
  else if(!full)dueMod=i<1700?'-5 day':i<1900?'+3 day':'+20 day';
  else dueMod='-10 day';
  const age='-'+(i%20)+' hours';
  orderStmt.run(id,'RQ-FIN-'+String(i).padStart(5,'0'),customerId,paymentStatus,age,age);
  docStmt.run(inv,'INV-FIN-'+String(i).padStart(5,'0'),id,full?'paid':'issued',age,dueMod,name,phone,email,'{}',paymentStatus,'share-'+inv);
  if(partial)payStmt.run('pay'+i,id,inv,'RC-FIN-'+String(i).padStart(5,'0'),age,'share-pay-'+i);
}
sqlite.prepare("INSERT INTO reqoo_documents(id,type,number,order_id,status,currency,subtotal_minor,discount_minor,shipping_minor,tax_minor,total_minor,issued_at,due_at,customer_name,customer_phone,customer_email,company_json,payment_status,share_token,created_at,updated_at) VALUES('do800','delivery_order','DO-FIN-00800','o800','issued','MYR',1000,0,0,0,1000,datetime('now'),NULL,'Common Finance','0199999999','common@example.com','{}','partial','share-do800',datetime('now'),datetime('now'))").run();

const dash=await call('documentsFinanceDashboard',{orderIds:['o0','o800'],includePayments:true,paymentLimit:80,paymentOffset:0});
assert.equal(dash.ok,true);
assert.deepEqual(dash.stats,{all:2105,outstandingCount:1305,outstandingMinor:1055000,partialCount:500,dueSoonCount:300,dueSoonMinor:250000,overdueCount:700,overdueMinor:550000,paidCount:800});
assert.equal(dash.payments.length,80);
assert.equal(dash.paymentsHasMore,true);
assert.equal(dash.summaries.length,2);
const paidSummary=dash.summaries.find(x=>x.orderId==='o0');
const partialSummary=dash.summaries.find(x=>x.orderId==='o800');
assert.equal(paidSummary.paymentStatus,'paid');assert.equal(paidSummary.paidMinor,1000);assert.equal(paidSummary.balanceMinor,0);
assert.equal(partialSummary.paymentStatus,'partial');assert.equal(partialSummary.paidMinor,500);assert.equal(partialSummary.balanceMinor,500);

const overdue=await call('documentsFinanceDashboard',{filter:'overdue',includeInvoices:true,limit:80,offset:0});
assert.equal(overdue.invoiceTotal,700);
assert.equal(overdue.invoices.length,80);
assert.equal(overdue.invoicesHasMore,true);
assert.ok(overdue.invoices.every(x=>x.finance.overdueMinor===undefined&&x.finance.balanceMinor>0&&x.finance.daysToDue<0));

const overdue2=await call('documentsFinanceDashboard',{filter:'overdue',includeInvoices:true,limit:80,offset:80});
assert.equal(overdue2.invoices.length,80);
assert.equal(new Set([...overdue.invoices,...overdue2.invoices].map(x=>x.id)).size,160,'finance invoice pages must not overlap');

const paid=await call('documentsFinanceDashboard',{filter:'paid',includeInvoices:true,limit:80,offset:0});
assert.equal(paid.invoiceTotal,800);
assert.ok(paid.invoices.every(x=>x.finance.paymentStatus==='paid'));

const needle=await call('documentsFinanceDashboard',{filter:'all',q:'Needle Finance',includeInvoices:true,includePayments:true,limit:80,paymentLimit:80});
assert.equal(needle.invoiceTotal,1,'server-side invoice search must find exact customer outside the recent 150 documents');
assert.equal(needle.invoices[0].order_id,'o1000');
assert.equal(needle.payments.length,1);
assert.equal(needle.payments[0].order_id,'o1000');

const noText=await call('documentsFinanceDashboard',{filter:'all',q:'ZZZNOPE',includeInvoices:true,includePayments:true,limit:80,paymentLimit:80});
assert.equal(noText.invoiceTotal,0,'text-only search must not match every phone through an empty wildcard');
assert.equal(noText.payments.length,0);

const nextPayments=await call('documentsFinanceDashboard',{includePayments:true,paymentLimit:80,paymentOffset:80});
assert.equal(nextPayments.payments.length,80);
assert.equal(new Set([...dash.payments,...nextPayments.payments].map(x=>x.id)).size,160,'payment pages must not overlap');

const flow=await call('documentFlow',{key:'INV-FIN-00800'});
assert.equal(flow.ok,true);
assert.equal(flow.documents.length,2);
assert.equal(flow.payments.length,1);
assert.equal(flow.summary.paymentStatus,'partial');
assert.equal(flow.summary.balanceMinor,500);
assert.equal(flow.selectedDocument.number,'INV-FIN-00800');

const paymentUi=fs.readFileSync(new URL('../admin/documents-payment-v1.js',import.meta.url),'utf8');
const overdueUi=fs.readFileSync(new URL('../admin/documents-overdue-v1.js',import.meta.url),'utf8');
const drawerUi=fs.readFileSync(new URL('../admin/documents-drawer-v1.js',import.meta.url),'utf8');
assert.match(paymentUi,/documentsFinanceDashboard/);assert.match(paymentUi,/loadMorePayments/);assert.doesNotMatch(paymentUi,/paymentSummary/);assert.doesNotMatch(paymentUi,/listPayments/);assert.doesNotMatch(paymentUi,/api\('listDocuments'/);
assert.match(overdueUi,/documentsFinanceDashboard/);assert.match(overdueUi,/loadMoreFinanceInvoices/);assert.match(overdueUi,/financeSeq/);assert.doesNotMatch(overdueUi,/paymentSummary/);assert.doesNotMatch(overdueUi,/listPayments/);assert.doesNotMatch(overdueUi,/listDocuments/);
assert.match(drawerUi,/documentFlow/);assert.doesNotMatch(drawerUi,/paymentSummary/);assert.doesNotMatch(drawerUi,/listPayments/);assert.doesNotMatch(drawerUi,/listDocuments/);

console.log('PASS: Documents Finance V2 aggregates >2,000 invoices globally, pages invoices/payments, searches server-side, and loads drawer flow in one exact request.');
sqlite.close();

import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {onRequest} from '../api/shop-admin-flow-v18.js';
const sql=new DatabaseSync(':memory:');
for(const name of ['0001_reqoo_core.sql','0002_reqoo_documents_v2.sql','0013_quotation_revisions.sql'])sql.exec(fs.readFileSync(new URL('../migrations/'+name,import.meta.url),'utf8'));
sql.exec('ALTER TABLE orders ADD COLUMN order_no TEXT');
let beforeBatch=null,queue=Promise.resolve();
const DB={prepare(query){return {query,args:[],bind(...args){this.args=args;return this},async first(){return sql.prepare(query).get(...this.args)||null},async all(){return {results:sql.prepare(query).all(...this.args)}},async run(){return sql.prepare(query).run(...this.args)}}},async batch(statements){
 if(beforeBatch)await beforeBatch(statements);
 const run=queue.then(()=>{sql.exec('BEGIN');try{const result=statements.map(s=>sql.prepare(s.query).run(...s.args));sql.exec('COMMIT');return result}catch(e){sql.exec('ROLLBACK');throw e}});queue=run.catch(()=>{});return run;
}};
const env={DB,REQOO_ADMIN_TOKEN:'fixture',ADMIN_ACTOR:{id:'owner',name:'Fixture Admin',role:'owner'}};
async function call(action,data={},auth=true,method='POST'){const u=new URL('https://fixture/api/shop-admin');if(method==='GET')for(const [k,v] of Object.entries({action,...data}))u.searchParams.set(k,v);const response=await onRequest({env,request:new Request(u,{method,headers:{'content-type':'application/json',...(auth?{'X-Admin-Token':'fixture'}:{})},...(method==='POST'?{body:JSON.stringify({action,...data})}:{})})});return {http:response.status,...await response.json()}}


import worker from '../api/worker.js';
async function business(action,data={},auth=true){const response=await worker.fetch(new Request('https://fixture/api/admin-business',{method:'POST',headers:{'content-type':'application/json',...(auth?{'X-Admin-Token':'fixture'}:{})},body:JSON.stringify({action,...data})}),{...env,ADMIN_ACTOR:undefined},{});return {http:response.status,...await response.json()}}
const internalCosts={enabled:true,items:[{materialsMinor:1000,labourMinor:500,packagingMinor:100,outsourcingMinor:200,otherMinor:50,overheadMinor:400}],orderOtherMinor:300};
const payload={customerName:'Bridge fixture',items:[{description:'Plaque',quantity:2,unitPriceMinor:10000}],internalCosts};
async function convert(doc){const approval=(await call('updateCustomQuotationStatus',{documentId:doc.id,status:'accepted'})).document;const result=await call('convertCustomQuotationToOrder',{documentId:doc.id,expectedRevision:Number(approval.company.quoteMeta.revision||0),expectedUpdatedAt:approval.updated_at});assert.equal(result.http,200);return result.order}
const quote=(await call('createCustomQuotation',payload)).document,order=await convert(quote);
// Initialise the actual-cost table through its existing additive migration.
sql.exec(fs.readFileSync(new URL('../migrations/0011_admin_business.sql',import.meta.url),'utf8'));
const first=await business('orderCosts',{orderId:order.id});assert.equal(first.http,200,JSON.stringify(first));
assert.equal(first.cost,null,'quotation estimates must never become actual costs on a read');
assert.deepEqual(first.quotationEstimate.costs,{materials_minor:2000,labour_minor:1000,shipping_minor:0,other_minor:1000});
assert.equal(first.quotationEstimate.totalMinor,4000);assert.equal(first.quotationEstimate.overheadAllowanceMinor,800);assert.equal(first.quotationEstimate.sourceQuotationNumber,quote.number);assert.equal(first.quotationEstimate.sourceRevision,0);
assert.equal(sql.prepare('SELECT COUNT(*) n FROM reqoo_order_costs').get().n,0);
assert.equal((await business('orderCosts',{orderId:order.id},false)).http,401);
const confirmed=await business('saveOrderCosts',{orderId:order.id,materialsMinor:2000,labourMinor:1000,shippingMinor:0,otherMinor:1000,revision:0});assert.equal(confirmed.http,200);assert.equal(confirmed.cost.revision,1);
const actual=await business('saveOrderCosts',{orderId:order.id,materialsMinor:2500,labourMinor:1000,shippingMinor:0,otherMinor:1000,revision:1});assert.equal(actual.http,200);assert.equal(actual.cost.materials_minor,2500);assert.equal(actual.quotationEstimate.costs.materials_minor,2000,'actual changes never rewrite quotation estimate');
assert.equal((await business('saveOrderCosts',{orderId:order.id,materialsMinor:100,revision:1})).http,409);
const next=(await call('createCustomQuotation',payload)).document;
const revised=(await call('updateCustomQuotation',{...payload,documentId:next.id,expectedRevision:0,expectedUpdatedAt:next.updated_at,internalCosts:{...internalCosts,items:[{...internalCosts.items[0],materialsMinor:2000}]}})).document;
const nextOrder=await convert(revised),nextCosts=await business('orderCosts',{orderId:nextOrder.id});assert.equal(nextCosts.quotationEstimate.sourceRevision,1);assert.equal(nextCosts.quotationEstimate.costs.materials_minor,4000);
const incomplete=(await call('createCustomQuotation',{...payload,internalCosts:{...internalCosts,items:[{...internalCosts.items[0],materialsMinor:null}]}})).document;
const incompleteOrder=await convert(incomplete),missing=await business('orderCosts',{orderId:incompleteOrder.id});assert.equal(missing.quotationEstimate.complete,false);assert.equal(missing.quotationEstimate.costs.materials_minor,null);assert.equal(missing.quotationEstimate.totalMinor,null);
const plain=(await call('createCustomQuotation',{...payload,internalCosts:null})).document;
assert.equal((await business('orderCosts',{orderId:(await convert(plain)).id})).quotationEstimate,null);
console.log('PASS: conversion revision estimates, quantity/category mapping, separate overhead allowance, incomplete/price-only quotes, explicit actual-cost saves and stale-save protection.');sql.close();

import assert from 'node:assert/strict';
import {onRequest} from '../api/shop-flow-v3.js';
const product={id:'p',variation_id:'v',sku:'p',name:'Plaque',product_type:'physical',status:'active',variation_status:'active',variation_name:'A4',price_minor:21000,stock_qty:3};
let writes=0,uploads=0;
const env={MEDIA:{put(){uploads++}},DB:{batch:async statements=>{if(statements.some(s=>/INSERT INTO orders/.test(s.sql)))writes++;return []},prepare:sql=>({sql,bind(...args){this.args=args;return this},async first(){if(sql.includes('JOIN product_variations'))return product;if(sql.includes('FROM promotions'))return null;if(sql.includes('FROM shipping_methods'))return this.args[0]==='delivery'?{id:'delivery',price_minor:800}:null;return null}})}};
const run=async data=>{const response=await onRequest({request:new Request('https://api.reqoo.co/api/shop',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)}),env});return {status:response.status,body:await response.json()}};
const item={productId:'p',variantId:'v',qty:2};
let r=await run({action:'quoteOrder',items:[item],shippingId:'delivery'});assert.equal(r.status,200);assert.equal(r.body.totalMinor,42800);assert.equal(r.body.items[0].lineTotalMinor,42000);
for(const qty of [0,-1,1.5,1000,'bad']){r=await run({action:'quoteOrder',items:[{...item,qty}]});assert.equal(r.status,400)}
r=await run({action:'quoteOrder',items:[item,item]});assert.equal(r.status,400);assert.match(r.body.error,/Stok/);
r=await run({action:'quoteOrder',items:[item],shippingId:'invalid'});assert.equal(r.status,400);
r=await run({action:'createOrder',name:'Test',phone:'0123456789',items:[item],receipt:{data:'present'},expectedTotalMinor:1});assert.equal(r.status,409);assert.equal(writes,0);assert.equal(uploads,0);
const old=env.DB.prepare;env.DB.prepare=sql=>sql.includes('JOIN product_variations')?{bind(){return this},first:async()=>{throw Error('Simulated DB error')}}:old(sql);
r=await run({action:'quoteOrder',items:[item]});assert.equal(r.status,500);assert.equal(r.body.ok,false);
console.log('PASS: server-priced quote, shipping, invalid quantities, combined stock, changed total and async error handling; no order/upload writes.');

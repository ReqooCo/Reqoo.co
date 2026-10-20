import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {onRequest,openapi} from '../api/commerce.js';
import web from '../_web_worker.js';
const db=new DatabaseSync(':memory:');db.exec(fs.readFileSync('migrations/0001_reqoo_core.sql','utf8'));
const DB={prepare(sql){return{args:[],bind(...args){this.args=args;return this},async all(){return{results:db.prepare(sql).all(...this.args)}},async first(){return db.prepare(sql).get(...this.args)},async run(){return db.prepare(sql).run(...this.args)}}},async batch(stmts){db.exec('BEGIN');try{const out=[];for(const s of stmts)out.push(await s.run());db.exec('COMMIT');return out}catch(e){db.exec('ROLLBACK');throw e}}};
const now=new Date().toISOString();
db.prepare("INSERT INTO products(id,sku,name,slug,description,product_type,fulfillment_type,base_price_minor,currency,status,internal_notes,created_at,updated_at) VALUES(?,?,?,?,?,'physical','physical_shipping',3000,'MYR',?,'PRIVATE-NOTE',?,?)").run('p','SKU','Tumbler','tumbler','<script>alert(1)</script>','active',now,now);
db.prepare("INSERT INTO products(id,sku,name,slug,product_type,fulfillment_type,base_price_minor,currency,status,created_at,updated_at) VALUES('hidden','SECRET','Hidden','hidden','physical','physical_shipping',100,'MYR','draft',?,?)").run(now,now);
for(const [id,name,price,stock] of [['v','Hitam',2800,3],['unknown','Putih',0,null],['sold','Merah',2800,0]])db.prepare("INSERT INTO product_variations(id,product_id,sku,name,price_minor,stock_qty,status,created_at,updated_at) VALUES(?,'p',?,?,?,?, 'active',?,?)").run(id,id,name,price,stock,now,now);
async function call(path,body){return onRequest({env:{DB},request:new Request('https://api.reqoo.co/api/commerce'+path,body===undefined?{}:{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)})})}
const external=globalThis.fetch;globalThis.fetch=()=>{throw Error('No external service or payment may be called')};
try{
 let r=await call('/quote',{items:[{productId:'p',variantId:'v',qty:2}],action:'createOrder',payment:'billplz',name:'MUST NOT STORE'});assert.equal(r.status,200);let q=await r.json();assert.equal(q.totalMinor,5600);assert.equal(q.createsOrder,false);assert.equal(q.reservation,false);assert.equal(q.shippingIncluded,false);assert.match(q.checkoutLinks[0].url,/qty=2/);
 db.prepare("INSERT INTO shipping_methods(id,name,price_minor,active,sort_order,created_at,updated_at) VALUES('delivery','Semenanjung',800,1,0,?,?)").run(now,now);
 db.prepare("INSERT INTO promotions(id,code,type,value,min_spend,active,usage_count,created_at,updated_at,product_id,variant,promo_price_minor) VALUES('promo','SALE','fixed',0,0,1,0,?,?,'p','Hitam',2500)").run(now,now);
 r=await call('/products?q=tumbler&maxPriceMinor=2600');let j=await r.json();assert.equal(j.products.length,1);assert.equal(j.products[0].variants[0].priceMinor,2500);assert.equal(j.products[0].variants.length,1);assert(!JSON.stringify(j).includes('PRIVATE-NOTE'));
 const detail=await (await call('/products/p')).json();assert.equal(detail.product.variants.find(v=>v.id==='unknown').stock.status,'untracked');assert.equal(detail.product.variants.find(v=>v.id==='unknown').priceMinor,3000);assert.equal(detail.product.variants.find(v=>v.id==='sold').stock.status,'out_of_stock');
 assert.equal((await call('/products/hidden')).status,404);assert.equal((await call('/products?limit=-1')).status,400);assert.equal((await call('/products?maxPriceMinor=NaN')).status,400);
 q=await (await call('/quote',{items:[{productId:'p',variantId:'v',qty:2}],shippingId:'delivery'})).json();assert.equal(q.totalMinor,5800);assert.equal(q.shippingIncluded,true);
 for(const qty of [0,-1,1.5,1000])assert.equal((await call('/quote',{items:[{productId:'p',variantId:'v',qty}]})).status,400);
 assert.equal((await call('/quote',{items:[{productId:'p',variantId:'v',qty:4}]})).status,400);
 assert.equal((await call('/quote',{items:[{productId:'p',variantId:'v',qty:2},{productId:'p',variantId:'v',qty:2}]})).status,400);
 assert.equal((await call('/quote',{items:[{productId:'p',variantId:'sold',qty:1}]})).status,400);
 assert.equal((await call('/quote',{items:[{productId:'p',variantId:'v',qty:1}],shippingId:'invented'})).status,400);
 assert.equal((await call('/products',{action:'createOrder'})).status,405);
 assert.equal((await call('/quote',{x:'x'.repeat(20000)})).status,413);
 const page=await (await call('/pages/p')).text();assert(page.includes('&lt;script&gt;'));assert(!page.includes('<script>alert(1)</script>'));const structured=JSON.parse(page.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);assert.equal(structured['@type'],'ProductGroup');assert.equal(structured.hasVariant.find(v=>v.sku==='unknown').offers.availability,undefined);
 assert.match(await (await call('/sitemap.xml')).text(),/https:\/\/shop.reqoo.co\/products\/p/);
 for(const table of ['orders','payments','customers'])assert.equal(db.prepare(`SELECT count(*) n FROM ${table}`).get().n,0);
 assert.equal(db.prepare("SELECT stock_qty FROM product_variations WHERE id='v'").get().stock_qty,3);assert.equal(db.prepare("SELECT usage_count FROM promotions WHERE id='promo'").get().usage_count,0);
 assert.equal(openapi.paths['/quote'].post.operationId,'quote_order');
 for(const [path,target] of [['/agents','/api/commerce/guide'],['/.well-known/reqoo-commerce.json','/api/commerce/discovery'],['/products/p','/api/commerce/pages/p'],['/commerce-sitemap.xml','/api/commerce/sitemap.xml']]){
  let received;globalThis.fetch=async req=>{received=req.url;return new Response('ok')};await web.fetch(new Request('https://shop.reqoo.co'+path),{});assert.equal(received,'https://api.reqoo.co'+target);
 }
 assert.match(await (await web.fetch(new Request('https://shop.reqoo.co/llms.txt'),{})).text(),/OpenAPI/);
 assert.match(await (await web.fetch(new Request('https://shop.reqoo.co/robots.txt'),{})).text(),/commerce-sitemap/);
 console.log('PASS: live-source catalogue, filtering, promotion/base prices, unknown stock, read-only quotes, shipping, private-field exclusion, XSS-safe schema pages, discovery and proxy routing.');
}finally{globalThis.fetch=external;db.close()}

import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {onRequest} from '../api/shop-admin-flow-v15.js';

const sqlite=new DatabaseSync(':memory:');
sqlite.exec(fs.readFileSync(new URL('../migrations/0001_reqoo_core.sql',import.meta.url),'utf8'));
sqlite.exec(fs.readFileSync(new URL('../migrations/0008_shop_category.sql',import.meta.url),'utf8'));
const DB={
  prepare(sql){return{sql,args:[],bind(...args){this.args=args;return this},async first(){return sqlite.prepare(sql).get(...this.args)||null},async all(){return{results:sqlite.prepare(sql).all(...this.args)}},async run(){return sqlite.prepare(sql).run(...this.args)}}},
  async batch(stmts){sqlite.exec('BEGIN');try{const out=[];for(const s of stmts)out.push(await s.run());sqlite.exec('COMMIT');return out}catch(e){sqlite.exec('ROLLBACK');throw e}}
};
const env={DB,REQOO_ADMIN_TOKEN:'test-only'};
async function call(action,data={}){
  const r=await onRequest({env,request:new Request('https://example.test/api/shop-admin',{method:'POST',headers:{'content-type':'application/json','X-Admin-Token':'test-only'},body:JSON.stringify({action,...data})})});
  return{status:r.status,...await r.json()};
}
const prod=sqlite.prepare("INSERT INTO products(id,sku,name,slug,product_type,fulfillment_type,description,short_description,base_price_minor,sale_price_minor,currency,status,created_at,updated_at,category) VALUES(?,?,?,?, 'physical','physical_shipping','','',1000,NULL,'MYR',?,datetime('now',?),datetime('now',?),'Gift')");
const vari=sqlite.prepare("INSERT INTO product_variations(id,product_id,sku,name,attributes_json,price_minor,sale_price_minor,stock_qty,stock_tracking,image_url,status,created_at,updated_at) VALUES(?,?,?,?, '{}',1000,NULL,?,?,'','active',datetime('now'),datetime('now'))");
for(let i=0;i<1205;i++){
  const mod=i%5,status=mod===1?'draft':mod===3?'hidden':'active',id='p'+i,stock=mod===0?10:mod===1?3:mod===2?0:mod===3?null:7;
  prod.run(id,'SKU-'+i,'Product '+i,'product-'+i,status,'-'+i+' minutes','-'+i+' minutes');
  vari.run('v'+i,id,i===1204?'SPECIAL-VARIANT':'VSKU-'+i,'Standard',stock,stock===null?0:1);
}
vari.run('v1204b','p1204','SPECIAL-B','Large',5,1);
sqlite.prepare("INSERT INTO product_images(id,product_id,url,alt_text,sort_order,is_cover,created_at) VALUES('img1204','p1204','https://example.test/p1204.jpg','',0,1,datetime('now'))").run();

sqlite.prepare("INSERT INTO customers(id,name,status,created_at,updated_at) VALUES('c1','Buyer','active',datetime('now'),datetime('now'))").run();
sqlite.prepare("INSERT INTO orders(id,customer_id,source,currency,subtotal_minor,discount_minor,shipping_minor,tax_minor,total_minor,payment_status,fulfillment_status,created_at,updated_at) VALUES('o1','c1','shop','MYR',3000,0,0,0,3000,'paid','pending',datetime('now'),datetime('now'))").run();
sqlite.prepare("INSERT INTO order_items(id,order_id,product_id,product_name_snapshot,quantity,unit_price_minor,line_total_minor,created_at) VALUES('oi1','o1','p1204','Product 1204',2,1500,3000,datetime('now'))").run();
sqlite.prepare("INSERT INTO order_items(id,order_id,product_id,product_name_snapshot,quantity,unit_price_minor,line_total_minor,created_at) VALUES('oi2','o1',NULL,'Legacy item',1,500,500,datetime('now'))").run();
sqlite.prepare("INSERT INTO orders(id,customer_id,source,currency,subtotal_minor,discount_minor,shipping_minor,tax_minor,total_minor,payment_status,fulfillment_status,created_at,updated_at) VALUES('o2','c1','shop','MYR',1000,0,0,0,1000,'partial','pending',datetime('now'),datetime('now'))").run();
sqlite.prepare("INSERT INTO order_items(id,order_id,product_id,product_name_snapshot,quantity,unit_price_minor,line_total_minor,created_at) VALUES('oi3','o2','p1204','Product 1204',1,1000,1000,datetime('now'))").run();

const all=await call('productsDashboard',{filter:'all',limit:80,offset:0});
assert.equal(all.ok,true);
assert.equal(all.products.length,80);
assert.equal(all.total,1205);
assert.equal(all.hasMore,true);
assert.deepEqual(all.stats,{total:1205,active:723,low:242,out:241,revenueMinor:3500});

const page2=await call('productsDashboard',{filter:'all',limit:80,offset:80});
assert.equal(page2.products.length,80);
assert.equal(new Set([...all.products,...page2.products].map(x=>x.id)).size,160,'product pages must not overlap');

const active=await call('productsDashboard',{filter:'active',limit:80,offset:0});
assert.equal(active.total,723);
assert.ok(active.products.every(x=>x.active));

const hidden=await call('productsDashboard',{filter:'hidden',limit:80,offset:0});
assert.equal(hidden.total,482);
assert.ok(hidden.products.every(x=>!x.active));

const low=await call('productsDashboard',{filter:'low',limit:80,offset:0});
assert.equal(low.total,241);
assert.ok(low.products.every(x=>x.lowStock&&!x.outOfStock));

const out=await call('productsDashboard',{filter:'out',limit:80,offset:0});
assert.equal(out.total,241);
assert.ok(out.products.every(x=>x.outOfStock));

const untracked=await call('productsDashboard',{filter:'untracked',limit:80,offset:0});
assert.equal(untracked.total,241);
assert.ok(untracked.products.every(x=>x.untracked));

const search=await call('productsDashboard',{q:'SPECIAL-VARIANT',filter:'all',limit:80,offset:0});
assert.equal(search.total,1);
assert.equal(search.products[0].id,'p1204');
assert.equal(search.products[0].variantCount,2);
assert.equal(search.products[0].unitsSold,2);
assert.equal(search.products[0].revenueMinor,3000,'partial order sales must not be included in Products PAID revenue semantics');
assert.equal(search.products[0].image,'https://example.test/p1204.jpg');

const noMatch=await call('productsDashboard',{q:'ZZZNOPE',filter:'all',limit:80,offset:0});
assert.equal(noMatch.total,0);

const detail=await call('productDetail',{productId:'p1204'});
assert.equal(detail.ok,true);
assert.equal(detail.product.id,'p1204');
assert.equal(detail.product.variants.length,2);
assert.equal(detail.product.variants.find(x=>x.sku==='SPECIAL-B').stock,5);
assert.equal(detail.product.image,'https://example.test/p1204.jpg');

const ui=fs.readFileSync(new URL('../admin/products.js',import.meta.url),'utf8');
assert.match(ui,/productsDashboard/);
assert.match(ui,/productDetail/);
assert.match(ui,/limit:80/);
assert.match(ui,/offset:pageOffset/);
assert.match(ui,/loadMoreProducts/);
assert.match(ui,/setTimeout\(\(\)=>load\(true\),260\)/);
assert.match(ui,/reqoo:product-editor-hydrate/);
assert.doesNotMatch(ui,/function filtered\(/);
assert.doesNotMatch(ui,/insights=new Map/);

const matrix=fs.readFileSync(new URL('../admin/product-option-matrix.js',import.meta.url),'utf8');
assert.match(matrix,/reqoo:product-editor-hydrate/);
console.log('PASS: Products uses bounded aggregate paging across >1,000 products while editor variants/images remain lazy and option-matrix hydration is explicit.');
sqlite.close();

import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {onRequest as admin} from '../api/shop-admin-flow-v17.js';
import {onRequest as shop} from '../api/shop-flow-v2.js';

const sqlite=new DatabaseSync(':memory:');
sqlite.exec(fs.readFileSync(new URL('../migrations/0001_reqoo_core.sql',import.meta.url),'utf8'));
sqlite.prepare("INSERT INTO products(id,name,product_type,fulfillment_type,status,created_at,updated_at) VALUES('prd_1','Plaque','physical','physical_shipping','active','2026-01-01','2026-01-01')").run();
sqlite.prepare("INSERT INTO product_variations(id,product_id,name,price_minor,status,created_at,updated_at) VALUES('var_1','prd_1','A5',5000,'active','2026-01-01','2026-01-01')").run();
const objects=new Map();
const MEDIA={async put(key,bytes,options){objects.set(key,{bytes:new Uint8Array(bytes),options})}};
const DB={prepare(sql){return{sql,args:[],bind(...args){this.args=args;return this},async first(){return sqlite.prepare(sql).get(...this.args)||null},async all(){return{results:sqlite.prepare(sql).all(...this.args)}},async run(){return sqlite.prepare(sql).run(...this.args)}}},async batch(statements){sqlite.exec('BEGIN');try{const out=[];for(const statement of statements)out.push(await statement.run());sqlite.exec('COMMIT');return out}catch(error){sqlite.exec('ROLLBACK');throw error}}};
const env={DB,MEDIA,REQOO_ADMIN_TOKEN:'fixture-only'};
async function call(action,data={}){const response=await admin({env,request:new Request('https://example.test/api/shop-admin',{method:'POST',headers:{'Content-Type':'application/json','X-Admin-Token':'fixture-only'},body:JSON.stringify({action,...data})})});return{response,json:await response.json()}}
const dataUrl='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z7R8AAAAASUVORK5CYII=';

const saved=await call('saveImages',{productId:'prd_1',images:[dataUrl]});
assert.equal(saved.response.status,200);assert.equal(saved.json.ok,true);assert.equal(objects.size,1);
let row=sqlite.prepare("SELECT url,is_cover FROM product_images WHERE product_id='prd_1'").get();
assert.match(row.url,/^\/api\/product-image\?key=products%2Fprd_1%2F/);assert.equal(row.is_cover,1);assert.ok(!row.url.startsWith('data:'));
assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM product_images WHERE product_id='prd_1'").get().n,1,'converted data URL must not remain as a duplicate gallery item');
const listing=await shop({env,request:new Request('https://example.test/api/shop?action=listProducts')});
assert.equal((await listing.json()).products[0].image,row.url,'Shop must receive the R2-backed cover URL');

sqlite.prepare("UPDATE product_images SET url=? WHERE product_id='prd_1'").run(dataUrl);
const repaired=await call('repairProductImages');assert.equal(repaired.json.converted,1);assert.equal(repaired.json.remaining,false);
row=sqlite.prepare("SELECT url FROM product_images WHERE product_id='prd_1'").get();assert.match(row.url,/^\/api\/product-image\?key=/);assert.equal(objects.size,2);
const second=await call('repairProductImages');assert.equal(second.json.converted,0,'repair must be idempotent');
sqlite.close();
console.log('PASS: Admin device images are persisted to media storage, Shop receives a safe URL, and legacy data URLs repair once.');

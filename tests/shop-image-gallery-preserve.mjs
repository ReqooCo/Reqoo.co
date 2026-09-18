import assert from 'node:assert/strict';
import {onRequest} from '../api/shop-admin-flow-v8.js';

const rows=[{id:'img_old',product_id:'prd_1',url:'/api/product-image?key=products/prd_1/old.webp',alt_text:'Old',sort_order:0,is_cover:1,created_at:'2026-01-01'}];
const env={REQOO_ADMIN_TOKEN:'secret',DB:{prepare(sql){return{_args:[],bind(...args){this._args=args;return this},async first(){if(sql.startsWith('SELECT id,name FROM products'))return{id:'prd_1',name:'Tumbler Custom'};throw new Error('Unexpected first SQL: '+sql)},async all(){if(sql.startsWith('SELECT url FROM product_images'))return{results:rows.map(x=>({url:x.url}))};throw new Error('Unexpected all SQL: '+sql)},async run(){if(sql.startsWith('DELETE FROM product_images')){rows.length=0;return{success:true}}if(sql.startsWith('INSERT INTO product_images')){const [id,product_id,url,alt_text,sort_order,is_cover,created_at]=this._args;rows.push({id,product_id,url,alt_text,sort_order,is_cover,created_at});return{success:true}}throw new Error('Unexpected run SQL: '+sql)}}}}};

const request=new Request('https://api.reqoo.co/api/shop-admin',{method:'POST',headers:{'content-type':'application/json','X-Admin-Token':'secret'},body:JSON.stringify({action:'saveImages',productId:'prd_1',images:['/api/product-image?key=products/prd_1/new.webp']})});
const response=await onRequest({request,env});
const json=await response.json();
assert.equal(response.status,200);
assert.equal(json.ok,true);
assert.equal(rows.length,2,'adding a new image must preserve the existing gallery');
assert.equal(rows[0].url,'/api/product-image?key=products/prd_1/new.webp');
assert.equal(rows[0].is_cover,1,'first newly uploaded image must become the cover');
assert.equal(rows[1].url,'/api/product-image?key=products/prd_1/old.webp');
assert.equal(rows[1].is_cover,0);
const replaceRequest=new Request('https://api.reqoo.co/api/shop-admin',{method:'POST',headers:{'content-type':'application/json','X-Admin-Token':'secret'},body:JSON.stringify({action:'saveImages',productId:'prd_1',images:['/api/product-image?key=products/prd_1/new.webp'],replace:true})});
const replaceResponse=await onRequest({request:replaceRequest,env});
const replaceJson=await replaceResponse.json();
assert.equal(replaceResponse.status,200);
assert.equal(replaceJson.ok,true);
assert.equal(rows.length,1,'explicit replace must remove images omitted by the canonical editor');
assert.equal(rows[0].url,'/api/product-image?key=products/prd_1/new.webp');
assert.equal(rows[0].is_cover,1);
console.log('PASS: Gallery append stays compatible while canonical replace persists image removals.');

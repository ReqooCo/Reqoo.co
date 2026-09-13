import assert from 'node:assert/strict';
import {onRequest} from '../api/shop-admin-flow-v5.js';

const state={product:{id:'prd_1',sku:'TUM-1',name:'Tumbler Custom',slug:'tumbler',product_type:'physical',fulfillment_type:'physical_shipping',description:'',short_description:'',base_price_minor:2900,sale_price_minor:null,currency:'MYR',status:'active',category:'Hadiah custom'},variants:[]};
const env={REQOO_ADMIN_TOKEN:'secret',DB:{prepare(sql){return{_args:[],bind(...args){this._args=args;return this},async first(){if(sql.startsWith('SELECT * FROM products WHERE id='))return state.product;throw new Error('Unexpected first SQL: '+sql)},async all(){if(sql.startsWith('SELECT id,name FROM product_variations WHERE product_id='))return{results:state.variants.map(v=>({id:v.id,name:v.name}))};throw new Error('Unexpected all SQL: '+sql)},async run(){if(sql.startsWith('UPDATE products SET '))return{success:true};if(sql.startsWith('INSERT INTO product_variations')){const [id,product_id,sku,name,attributes_json,price_minor,sale_price_minor,stock_qty,stock_tracking,image_url,status]=this._args;state.variants.push({id,product_id,sku,name,attributes_json,price_minor,sale_price_minor,stock_qty,stock_tracking,image_url,status});return{success:true}}if(sql.startsWith('UPDATE product_variations SET status='))return{success:true};throw new Error('Unexpected run SQL: '+sql)}}}}};

async function save(variants){const request=new Request('https://api.reqoo.co/api/shop-admin',{method:'POST',headers:{'content-type':'application/json','X-Admin-Token':'secret'},body:JSON.stringify({action:'saveProduct',id:'prd_1',name:'Tumbler Custom',basePrice:29,active:true,variants})});const response=await onRequest({request,env});const json=await response.json();assert.equal(response.status,200);assert.equal(json.ok,true)}

await save([{name:'Merah',price:0,stock:12},{name:'Hitam',price:'',stock:-4}]);
assert.equal(state.variants.length,2);
assert.equal(state.variants[0].price_minor,2900,'variant with empty/zero price must inherit base price so public Shop never shows RM0 while checkout charges RM29');
assert.equal(state.variants[1].price_minor,2900,'blank variant price must inherit base price');
assert.equal(state.variants[0].stock_qty,12);
assert.equal(state.variants[0].stock_tracking,1);
assert.equal(state.variants[1].stock_qty,0,'negative stock must be clamped to zero');
assert.equal(state.variants[1].stock_tracking,1);
console.log('PASS: variant publish keeps public price aligned with checkout and normalizes stock safely.');

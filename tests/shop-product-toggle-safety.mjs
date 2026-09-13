import assert from 'node:assert/strict';
import {onRequest} from '../api/shop-admin-flow-v5.js';

function fakeEnv(initial){
  let product={...initial};
  const calls=[];
  return {
    REQOO_ADMIN_TOKEN:'secret',
    get product(){return product},
    calls,
    DB:{
      prepare(sql){
        return {
          _args:[],
          bind(...args){this._args=args;return this},
          async first(){
            if(sql.startsWith('SELECT * FROM products WHERE id=')) return product;
            throw new Error('Unexpected first SQL: '+sql);
          },
          async run(){
            if(sql.startsWith('UPDATE products SET ')){
              const [sku,name,slug,product_type,fulfillment_type,description,short_description,base_price_minor,sale_price_minor,currency,status,category,updated_at,id]=this._args;
              calls.push({sql,args:this._args});
              product={...product,id,sku,name,slug,product_type,fulfillment_type,description,short_description,base_price_minor,sale_price_minor,currency,status,category,updated_at};
              return {success:true};
            }
            throw new Error('Unexpected run SQL: '+sql);
          }
        };
      }
    }
  };
}

async function toggle(env,active){
  const request=new Request('https://api.reqoo.co/api/shop-admin',{method:'POST',headers:{'content-type':'application/json','X-Admin-Token':'secret'},body:JSON.stringify({action:'saveProduct',id:'prd_1',active})});
  const response=await onRequest({request,env});
  const json=await response.json();
  assert.equal(response.status,200);
  assert.equal(json.ok,true);
}

const original={id:'prd_1',sku:'SKU-1',name:'Tumbler Custom',slug:'tumbler-custom',product_type:'physical',fulfillment_type:'physical_shipping',description:'Full desc',short_description:'Short desc',base_price_minor:2900,sale_price_minor:null,currency:'MYR',status:'active',category:'Hadiah custom'};
const env=fakeEnv(original);
await toggle(env,false);
assert.equal(env.product.status,'hidden','Hide must set hidden');
assert.equal(env.product.name,original.name,'Hide must preserve product name');
assert.equal(env.product.base_price_minor,2900,'Hide must preserve base price');
assert.equal(env.product.category,original.category,'Hide must preserve category');
await toggle(env,true);
assert.equal(env.product.status,'active','Activate must reactivate a hidden product');
assert.equal(env.product.base_price_minor,2900,'Activate must not reset base price');
assert.equal(env.calls.length,2);
console.log('PASS: partial Hide/Activate updates preserve product data and correctly switch status.');

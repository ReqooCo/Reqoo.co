import assert from 'node:assert/strict';
import {onRequest} from '../api/shop-admin-flow-v9.js';

let updated=null;
const env={REQOO_ADMIN_TOKEN:'secret',DB:{prepare(sql){return{args:[],bind(...args){this.args=args;return this},async first(){if(sql.startsWith('SELECT id,payment_status FROM orders'))return{id:'ord_1',payment_status:'paid'};return null},async run(){if(sql.startsWith('UPDATE orders SET fulfillment_status='))updated={status:this.args[0],id:this.args[2]};return{success:true}}}}}};
const req=new Request('https://api.reqoo.co/api/shop-admin',{method:'POST',headers:{'content-type':'application/json','X-Admin-Token':'secret'},body:JSON.stringify({action:'status',orderId:'ord_1',status:'fulfilled'})});
const res=await onRequest({request:req,env});
const json=await res.json();
assert.equal(res.status,200);
assert.equal(json.ok,true);
assert.equal(json.status,'fulfilled');
assert.deepEqual(updated,{status:'fulfilled',id:'ord_1'});

const unpaidEnv={REQOO_ADMIN_TOKEN:'secret',DB:{prepare(sql){return{bind(){return this},async first(){if(sql.startsWith('SELECT id,payment_status FROM orders'))return{id:'ord_2',payment_status:'pending'};return null},async run(){throw new Error('must not update unpaid order')}}}}};
const unpaidReq=new Request('https://api.reqoo.co/api/shop-admin',{method:'POST',headers:{'content-type':'application/json','X-Admin-Token':'secret'},body:JSON.stringify({action:'status',orderId:'ord_2',status:'processing'})});
const unpaidRes=await onRequest({request:unpaidReq,env:unpaidEnv});
const unpaidJson=await unpaidRes.json();
assert.equal(unpaidRes.status,409);
assert.match(unpaidJson.error,/Bayaran perlu disahkan/);
console.log('PASS: production fulfillment status actions route correctly through v9.');

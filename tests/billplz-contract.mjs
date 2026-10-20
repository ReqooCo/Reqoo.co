import assert from 'node:assert/strict';
import {createBill,verifyCallback} from '../functions/api/billplz.js';
import {onRequest as shop} from '../api/shop-flow-v5.js';
const env={BILLPLZ_ENV:' production ',BILLPLZ_SECRET_KEY:'test-only',BILLPLZ_COLLECTION_ID:'collection',BILLPLZ_X_SIGNATURE_KEY:'test-signature'};
const original=globalThis.fetch;let calls=0;
globalThis.fetch=async(url,init)=>{calls++;assert.equal(url,'https://www.billplz.com/api/v3/bills');const p=new URLSearchParams(init.body);assert.equal(p.get('amount'),'2500');assert.equal(p.get('mobile'),'+60123456789');return Response.json({id:'bill',collection_id:'collection',amount:2500,url:'https://www.billplz.com/bills/bill'})};
try{
 const args={amountMinor:2500,name:'Test',mobile:'60123456789',callbackUrl:'https://api.reqoo.co/api/shop?action=billplzCallback'};
 assert.equal((await createBill(args,env)).ok,true);
 for(const amountMinor of [NaN,Infinity,-1,0,Number.MAX_SAFE_INTEGER+1])assert.equal((await createBill({...args,amountMinor},env)).ok,false);
 assert.equal((await createBill({...args,callbackUrl:'not-url'},env)).ok,false);
 assert.equal((await createBill({...args,redirectUrl:'https://attacker.example'},env)).ok,false);
 assert.equal(calls,1);
 assert.equal((await createBill(args,{})).configurationRequired,true);
 assert.equal((await verifyCallback({id:'fake',x_signature:'0'.repeat(64)},env)).valid,false);
 await assert.rejects(()=>createBill(args,{...env,BILLPLZ_ENV:'prod'}),/BILLPLZ_ENV_INVALID/);
 globalThis.fetch=async()=>Response.json({error:{message:'private-provider-response'}},{status:401});
 assert.deepEqual(await createBill(args,env),{ok:false,error:'BILLPLZ_HTTP_401'});
 globalThis.fetch=async()=>Response.json({});assert.equal((await createBill(args,env)).ok,false);
 const db={prepare(){throw Error('redirect must not write without bill ID')}};
 const redirect=await shop({env:{DB:db},request:new Request('https://api.reqoo.co/api/shop?action=billplzRedirect&billplz[paid]=true')});
 assert.equal(redirect.status,302);assert.equal(new URL(redirect.headers.get('location')).searchParams.get('payment'),'pending');
}finally{globalThis.fetch=original}
console.log('PASS: Billplz production endpoint, aliases, minor units, URL validation, missing config, provider failures and untrusted redirect.');

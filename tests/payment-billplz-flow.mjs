import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {
  createBillplzBill, parseBillplzCallback, verifyBillplzCallback,
  verifyBillplzRedirect, matchesBillplzPayment
} from '../functions/api/billplz-core.js';

const env={BILLPLZ_ENV:'sandbox',BILLPLZ_API_KEY:'test-key',BILLPLZ_COLLECTION_ID:'collection-test',BILLPLZ_X_SIGNATURE_KEY:'signature-test'};
const sign=(object,brackets=false)=>{
 const pairs=Object.entries(object).sort(([a],[b])=>a.toLowerCase().localeCompare(b.toLowerCase()));
 const value=pairs.map(([k,v])=>(brackets?k.replace(/[\[\]]/g,''):k)+String(v)).join('|');
 return createHmac('sha256',env.BILLPLZ_X_SIGNATURE_KEY).update(value).digest('hex');
};
const callback={id:'bp-test-123',collection_id:'collection-test',paid:'true',state:'paid',amount:'3500',paid_amount:'3500'};
callback.x_signature=sign(callback);
const verified=await verifyBillplzCallback(callback,env);
assert.equal(verified.valid,true);
assert.equal(verified.paid,true);
assert.equal(matchesBillplzPayment(verified,{provider_reference:'bp-test-123',amount_minor:3500},env),true);
assert.equal(matchesBillplzPayment(verified,{provider_reference:'wrong',amount_minor:3500},env),false);
assert.equal(matchesBillplzPayment(verified,{provider_reference:'bp-test-123',amount_minor:5000},env),false);
assert.equal(matchesBillplzPayment(verified,{provider_reference:'bp-test-123',amount_minor:3500},{...env,BILLPLZ_COLLECTION_ID:'wrong'}),false);

assert.equal((await verifyBillplzCallback({...callback,paid:'false'},env)).valid,false);
const underpaid={...callback,paid_amount:'1'};underpaid.x_signature=sign(Object.fromEntries(Object.entries(underpaid).filter(([k])=>k!=='x_signature')));
assert.equal(matchesBillplzPayment(await verifyBillplzCallback(underpaid,env),{provider_reference:'bp-test-123',amount_minor:3500},env),false);

const form=new URLSearchParams(callback).toString();
assert.equal((await parseBillplzCallback(new Request('https://shop.reqoo.co/api/shop?action=billplzCallback',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:form}))).id,'bp-test-123');
assert.equal(await parseBillplzCallback(new Request('https://shop.reqoo.co/api/shop?action=billplzCallback',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:'id=A&id=B'})),null);
assert.equal(await parseBillplzCallback(new Request('https://shop.reqoo.co/api/shop?action=billplzCallback')),null);

const redirect={'billplz[id]':'bp-test-123','billplz[paid]':'true','billplz[paid_at]':'2026-10-15 13:00:00 +0800'};
redirect['billplz[x_signature]']=sign(redirect,true);
assert.deepEqual(await verifyBillplzRedirect(redirect,env),{valid:true,billId:'bp-test-123'});
assert.equal((await verifyBillplzRedirect({...redirect,'billplz[paid]':'false'},env)).valid,false);

let captured;
const prior=globalThis.fetch;
globalThis.fetch=async (url,options)=>{
 captured={url:String(url),params:new URLSearchParams(options.body)};
 return new Response(JSON.stringify({id:'bp-test-123',url:'https://www.billplz-sandbox.com/bills/bp-test-123'}),{status:200,headers:{'content-type':'application/json'}});
};
try {
 const bill=await createBillplzBill({amountMinor:3500,orderRef:'PKSK-TEST',name:'Buyer',phone:'60123456789',description:'Test',callbackUrl:'https://pksk.sim.reqoo.co/api/pksk-payment-v2?action=billplzCallback',returnUrl:'https://pksk.sim.reqoo.co/api/pksk-payment-v2?action=billplzRedirect'},env);
 assert.equal(bill.billId,'bp-test-123');
 assert.equal(captured.params.get('amount'),'3500');
 assert.equal(captured.params.get('collection_id'),'collection-test');
 assert.equal(captured.params.get('reference_1'),'PKSK-TEST');
 assert.equal(captured.url,'https://www.billplz-sandbox.com/api/v4/bills');
 await assert.rejects(createBillplzBill({amountMinor:3500,name:'Buyer',phone:'60123456789',callbackUrl:'https://attacker.example/cb',returnUrl:'https://pksk.sim.reqoo.co/return'},env));
}finally{globalThis.fetch=prior;}
console.log('PASS: signed Billplz callback/redirect, order binding, amount checks, bill creation and format validation.');

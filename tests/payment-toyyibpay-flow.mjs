import assert from 'node:assert/strict';
import fs from 'node:fs';
import {callbackAmountMatches,createToyyibBill,md5Hex,verifyToyyibCallback} from '../functions/api/toyyibpay-core.js';

assert.equal(md5Hex(''),'d41d8cd98f00b204e9800998ecf8427e');
assert.equal(md5Hex('abc'),'900150983cd24fb0d6963f7d28e17f72');
const callback={status:'1',order_id:'PKSK-TEST',refno:'FPX-1',billcode:'BILL1',amount:'35.00'};
callback.hash=md5Hex(`secret${callback.status}${callback.order_id}${callback.refno}ok`);
assert.deepEqual(verifyToyyibCallback(callback,{TOYYIBPAY_USER_SECRET_KEY:'secret'}).valid,true);
assert.equal(callbackAmountMatches('35.00',3500),true);
assert.equal(callbackAmountMatches('3500',3500),true);
assert.equal(callbackAmountMatches('34.00',3500),false);

let providerRequest;
const originalFetch=globalThis.fetch;
globalThis.fetch=async(url,init)=>{providerRequest={url:String(url),params:new URLSearchParams(init.body)};return new Response(JSON.stringify([{BillCode:'TP123'}]),{status:200,headers:{'content-type':'application/json'}})};
try{
 const bill=await createToyyibBill({amountMinor:3500,orderRef:'PKSK-TEST',name:'Test Buyer',phone:'0123456789',returnUrl:'https://pksk.sim.reqoo.co/return',callbackUrl:'https://pksk.sim.reqoo.co/callback'},{TOYYIBPAY_USER_SECRET_KEY:'secret',TOYYIBPAY_CATEGORY_CODE:'CAT1'});
 assert.equal(bill.billUrl,'https://toyyibpay.com/TP123');
 assert.equal(providerRequest.params.get('billAmount'),'3500');
 assert.equal(providerRequest.params.get('billPaymentChannel'),'0');
 assert.equal(providerRequest.params.get('enableDuitNowQR'),'0');
 assert.equal(providerRequest.params.get('billExternalReferenceNo'),'PKSK-TEST');
}finally{globalThis.fetch=originalFetch}

const shop=fs.readFileSync('shop/shop-core-v1.js','utf8'),pksk=fs.readFileSync('sim/pksk/payment-v2/index.html','utf8');
for(const [source,label] of [[shop,'Shop'],[pksk,'PKSK']]){assert.match(source,/Online Banking/);assert.match(source,/ToyyibPay/);assert.match(source,/QR AB Art|AB Art/);}
assert.match(shop,/payment:'toyyibpay'/);assert.match(shop,/payment:'manual_qr'/);
assert.match(pksk,/createQR/);assert.match(pksk,/call\('create'/);
for(const file of ['shop/assets/maybank-qr.jpeg','sim/pksk/payment/assets/maybank-qr.jpeg'])assert.equal(fs.readFileSync(file).subarray(0,3).toString('hex'),'ffd8ff');
for(const script of pksk.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))new Function(script[1]);
const tumbler=fs.readFileSync('tumbler/index.html','utf8');
const tumblerRuntime=fs.readFileSync('tumbler/tumbler-order-v4.js','utf8');
assert.match(tumblerRuntime,/action:'createOrder'/);assert.match(tumblerRuntime,/payment:'toyyibpay'/);assert.match(tumblerRuntime,/expectedTotalMinor/);assert.match(tumblerRuntime,/d\.billUrl\|\|d\.payment\?\.billUrl/);assert.doesNotThrow(()=>new Function(tumblerRuntime),'Tumbler payment runtime must parse');
for(const script of tumbler.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))new Function(script[1]);
console.log('PASS: ToyyibPay FPX, callback verification, AB Art QR and both payment choices are wired.');

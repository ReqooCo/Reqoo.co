import assert from 'node:assert/strict';
import fs from 'node:fs';
const source=fs.readFileSync('_web_worker.js','utf8');
const {default:worker}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
for(const [path,expected] of [['/','/shop/index.html'],['/shop/shop-core-v1.js?v=2','/shop/shop-core-v1.js?v=2'],['/shop/assets/maybank-qr.jpeg','/shop/maybank-qr.jpg'],['/assets/product.jpg','/shop/assets/product.jpg']]){
 let actual;
 await worker.fetch(new Request('https://shop.reqoo.co'+path),{ASSETS:{fetch:async req=>{actual=new URL(req.url).pathname+new URL(req.url).search;return new Response('asset',{headers:{'content-type':'text/plain'}})}}});
 assert.equal(actual,expected);
}
console.log('PASS: Shop home, prefixed runtime, canonical payment QR and relative assets route correctly.');

import assert from 'node:assert/strict';
import fs from 'node:fs';
const source=fs.readFileSync('_web_worker.js','utf8');
const {default:worker}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
for(const [path,expected] of [['/','/shop/index.html'],['/shop/shop-core-v1.js?v=2','/shop/shop-core-v1.js?v=2'],['/shop/assets/maybank-qr.jpeg','/shop/maybank-qr.jpg'],['/assets/product.jpg','/shop/assets/product.jpg']]){
 let actual;
 await worker.fetch(new Request('https://shop.reqoo.co'+path),{ASSETS:{fetch:async req=>{actual=new URL(req.url).pathname+new URL(req.url).search;return new Response('asset',{headers:{'content-type':'text/plain'}})}}});
 assert.equal(actual,expected);
}
const html='<!doctype html><html><head><title>REQOO.CO — Shop</title></head><body><div id="heroProduct"></div></body></html>';
const rendered=await worker.fetch(new Request('https://shop.reqoo.co/'),{ASSETS:{fetch:async()=>new Response(html,{headers:{'content-type':'text/html;charset=UTF-8'}})}});
const body=await rendered.text();
assert.match(body,/\/shop\/shop-mobile-premium-v1\.css\?v=1/,'public Shop must load premium mobile stylesheet');
assert.match(body,/\/shop\/shop-desktop-premium-v1\.css\?v=1/,'public Shop must load premium desktop stylesheet');
assert.equal((body.match(/shop-mobile-premium-v1\.css/g)||[]).length,1,'premium mobile stylesheet must be injected once');
assert.equal((body.match(/shop-desktop-premium-v1\.css/g)||[]).length,1,'premium desktop stylesheet must be injected once');
console.log('PASS: Shop home, prefixed runtime, canonical payment QR, premium mobile/desktop CSS and relative assets route correctly.');

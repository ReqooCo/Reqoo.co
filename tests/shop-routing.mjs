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
assert.match(body,/\/shop\/shop-premium-v2\.css\?v=2/,'public Shop must load the premium retail layer');
assert.equal((body.match(/shop-mobile-premium-v1\.css/g)||[]).length,1,'premium mobile stylesheet must be injected once');
assert.equal((body.match(/shop-desktop-premium-v1\.css/g)||[]).length,1,'premium desktop stylesheet must be injected once');
const landing='<!doctype html><html><head><title>REQOO.CO — Custom Made. Just For You.</title></head><body><main>Landing</main></body></html>';
const landingRendered=await worker.fetch(new Request('https://reqoo.co/'),{ASSETS:{fetch:async()=>new Response(landing,{headers:{'content-type':'text/html;charset=UTF-8'}})}});
const landingBody=await landingRendered.text();
assert.match(landingBody,/\/landing-premium-v2\.css\?v=2/,'homepage must load the editorial premium stylesheet');
assert.match(landingBody,/\/landing-runtime\.js\?v=2/,'homepage must keep landing runtime');
assert.equal((landingBody.match(/landing-premium-v2\.css/g)||[]).length,1,'homepage premium stylesheet must be injected once');
console.log('PASS: Shop routing/premium CSS and homepage conversion runtime inject correctly.');

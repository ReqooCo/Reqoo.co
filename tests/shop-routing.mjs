import assert from 'node:assert/strict';
import fs from 'node:fs';
const source=fs.readFileSync('_web_worker.js','utf8');
const {default:worker}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
for(const [path,expected] of [['/','/shop/index.html'],['/shop/shop-core-v1.js?v=2','/shop/shop-core-v1.js?v=2'],['/shop/assets/maybank-qr.jpeg','/shop/assets/maybank-qr.jpeg'],['/assets/product.jpg','/shop/assets/product.jpg']]){
 let actual;
 await worker.fetch(new Request('https://shop.reqoo.co'+path),{ASSETS:{fetch:async req=>{actual=new URL(req.url).pathname+new URL(req.url).search;return new Response('asset',{headers:{'content-type':'text/plain'}})}}});
 assert.equal(actual,expected);
}
for(const [host,path] of [['shop.reqoo.co','/shop/assets/maybank-qr.jpeg'],['shop.reqoo.co','/shop/maybank-qr.jpg'],['shop.reqoo.co','/maybank-qr.jpg'],['reqoo.co','/shop/assets/maybank-qr.jpeg'],['pksk.sim.reqoo.co','/pksk/payment/assets/maybank-qr.jpeg']]){
 let target;
 await worker.fetch(new Request('https://'+host+path),{ASSETS:{fetch:async req=>{target=new URL(req.url).pathname;return new Response('asset')}}});
 const bytes=fs.readFileSync('.'+target);
 assert.equal(bytes.subarray(0,3).toString('hex'),'ffd8ff',host+path+' must resolve to a real JPEG');
}
const html='<!doctype html><html><head><title>REQOO.CO — Shop</title></head><body><div id="heroProduct"></div></body></html>';
const rendered=await worker.fetch(new Request('https://shop.reqoo.co/'),{ASSETS:{fetch:async()=>new Response(html,{headers:{'content-type':'text/html;charset=UTF-8'}})}});
const body=await rendered.text();
assert.match(body,/\/shop\/shop-mobile-premium-v1\.css\?v=1/,'public Shop must load premium mobile stylesheet');
assert.match(body,/\/shop\/shop-desktop-premium-v1\.css\?v=1/,'public Shop must load premium desktop stylesheet');
assert.match(body,/\/shop\/shop-premium-v2\.css\?v=3/,'public Shop must load the premium retail layer');
assert.equal((body.match(/shop-mobile-premium-v1\.css/g)||[]).length,1,'premium mobile stylesheet must be injected once');
assert.equal((body.match(/shop-desktop-premium-v1\.css/g)||[]).length,1,'premium desktop stylesheet must be injected once');
const landing='<!doctype html><html><head><title>REQOO.CO — Custom Made. Just For You.</title></head><body><main>Landing</main></body></html>';
const landingRendered=await worker.fetch(new Request('https://reqoo.co/'),{ASSETS:{fetch:async()=>new Response(landing,{headers:{'content-type':'text/html;charset=UTF-8'}})}});
const landingBody=await landingRendered.text();
assert.match(landingBody,/\/assets\/botanical-atelier-v1\.css\?v=3/,'homepage must load the selected Botanical Atelier theme');
assert.equal((landingBody.match(/botanical-atelier-v1\.css/g)||[]).length,1,'homepage botanical stylesheet must be injected once');
assert.doesNotMatch(landingBody,/\/landing-runtime\.js/,'retired landing runtime must not be reintroduced');
const oldFetch=globalThis.fetch;
try{
  globalThis.fetch=async input=>{
    const u=new URL(typeof input==='string'?input:input.url);
    if(u.hostname==='api.reqoo.co'&&u.pathname==='/api/shop-admin'&&u.searchParams.get('action')==='publicDocument'){
      return new Response(JSON.stringify({ok:true,document:{type:'receipt',number:'RCT-PREVIEW-001',total_minor:12900,payment_status:'paid'}}),{status:200,headers:{'content-type':'application/json'}});
    }
    throw new Error('Unexpected preview fetch '+u);
  };
  const publicHtml='<!doctype html><html><head><title>REQOO.CO — Document</title></head><body>Document</body></html>';
  const preview=await worker.fetch(new Request('https://reqoo.co/d/abc123?v=preview1'),{ASSETS:{fetch:async()=>new Response(publicHtml,{headers:{'content-type':'text/html;charset=UTF-8'}})}});
  const previewBody=await preview.text();
  assert.equal(preview.headers.get('x-reqoo-document-preview'),'v1');
  assert.match(previewBody,/Official Receipt RCT-PREVIEW-001 \| REQOO\.CO/);
  assert.match(previewBody,/property="og:title"/);
  assert.match(previewBody,/property="og:description"/);
  assert.match(previewBody,/property="og:image" content="https:\/\/reqoo\.co\/og-image\.jpg"/);
  assert.match(previewBody,/RM129\.00/);
  assert.match(previewBody,/reqoo\.co\/d\/abc123\?v=preview1/);
}finally{globalThis.fetch=oldFetch}
console.log('PASS: Shop routing/premium CSS and Botanical Atelier homepage inject correctly.');

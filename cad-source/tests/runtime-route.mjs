import assert from 'node:assert/strict';import worker from '../../_web_worker.js';
for(const suffix of ['/cad','/cad/index.html']){
 const r=await worker.fetch(new Request('https://reqoo.co'+suffix+'?source=test'),{ASSETS:{fetch:()=>{throw Error('Canonical redirects must not fetch index.html');}}},{});
 assert.equal(r.status,308);assert.equal(r.headers.get('location'),'https://reqoo.co/cad/?source=test');
}
for(const suffix of ['/cad/','/cad/version.json']){
 let requested;const response=await worker.fetch(new Request('https://reqoo.co'+suffix),{ASSETS:{fetch:async r=>{requested=new URL(r.url).pathname;if(requested.endsWith('/index.html'))return Response.redirect('https://reqoo.co/cad/',308);return new Response(requested,{headers:{'content-type':requested.endsWith('json')?'application/json':'text/html'}});}}},{});
 assert.equal(response.status,200);assert.equal(requested,suffix);assert.ok(response.headers.get('cache-control').includes('no-store'));assert.ok(response.headers.has('x-reqoo-cad-route'));
}console.log('PASS canonical CAD routes avoid native Assets index.html redirects and preserve query strings');

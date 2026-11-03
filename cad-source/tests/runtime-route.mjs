import assert from 'node:assert/strict';import worker from '../../_web_worker.js';
for(const suffix of ['/cad','/cad/','/cad/index.html','/cad/version.json']){
 let path;const response=await worker.fetch(new Request('https://reqoo.co'+suffix),{ASSETS:{fetch:async r=>{path=new URL(r.url).pathname;return new Response(path,{headers:{'content-type':path.endsWith('json')?'application/json':'text/html'}});}}},{});
 assert.equal(response.status,200);assert.equal(path,suffix.endsWith('json')?'/cad/version.json':'/cad/index.html');assert.ok(response.headers.get('cache-control').includes('no-store'));assert.ok(response.headers.has('x-reqoo-cad-route'));
}console.log('PASS current CAD HTML and source-version routes bypass stale entrypoint caching');

import vm from 'node:vm';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const apps=[['ot/service-worker.js','ot-air-selangor-v'],['ot-share/service-worker.js','ot-air-selangor-share-v'],['laser-price/service-worker.js','laser-price-v'],['lra/sw.js','reqoo-lra-v'],['shop/sw.js','reqoo-admin-v']];
for(const [file,prefix] of apps){
 const handlers={},deleted=[],cache=new Map();let pending=[];
 const path='/'+file.split('/')[0]+'/';
 const source=fs.readFileSync(file,'utf8');
 const context={URL,self:{location:{origin:'https://reqoo.co'},registration:{scope:'https://reqoo.co'+path},clients:{claim:async()=>{}},skipWaiting:async()=>{},addEventListener:(name,fn)=>handlers[name]=fn},caches:{keys:async()=>[prefix+'0',...apps.filter(a=>a[1]!==prefix).map(a=>a[1]+'99'),'unrelated-cache'],delete:async key=>deleted.push(key),open:async()=>({match:async req=>cache.get(typeof req==='string'?req:req.url),put:async()=>{},addAll:async()=>{}})},fetch:async()=>{throw Error('offline')}};
 vm.runInNewContext(source,context);
 handlers.activate({waitUntil:p=>pending.push(p)});await Promise.all(pending);
 assert.deepEqual(deleted,[prefix+'0'],`${file} deleted another app's cache`);
 for(const url of ['https://reqoo.co/api/shop','https://reqoo.co/apps/','https://other.test'+path]){
  let intercepted=false;handlers.fetch({request:{url,method:'GET'},respondWith:()=>intercepted=true});assert.equal(intercepted,false,`${file} intercepted ${url}`);
 }
 const fallback={offline:true};cache.set('https://reqoo.co'+path+(path==='/shop/'?'admin.html':'index.html'),fallback);
 let response;handlers.fetch({request:{url:'https://reqoo.co'+path+'?offline=1',method:'GET',mode:'navigate'},respondWith:p=>response=p,waitUntil:()=>{}});assert.equal(await response,fallback);
 handlers.fetch({request:{url:'https://reqoo.co'+path+'missing.js',method:'GET',mode:'cors'},respondWith:p=>response=p,waitUntil:()=>{}});await assert.rejects(response,/offline/);
 console.log('PASS',file,'cache ownership, API isolation, navigation fallback');
}

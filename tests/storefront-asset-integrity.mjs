import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root=path.resolve(new URL('..',import.meta.url).pathname);
const pages=['plaque/index.html','tumbler/index.html'];
for(const page of pages){
  const html=fs.readFileSync(path.join(root,page),'utf8');
  for(const m of html.matchAll(/(?:src|href)=["'](\/[^"'?#]+\.(?:js|css))(?:\?[^"']*)?["']/g)){
    const local=m[1].replace(/^\//,'');
    assert.ok(fs.existsSync(path.join(root,local)),page+' references missing '+local);
  }
}
const plaque=fs.readFileSync(path.join(root,'plaque/index.html'),'utf8');
assert.match(plaque,/\/plaque\/plaque\.css\?v=1/);
assert.match(plaque,/\/plaque\/plaque-store\.js\?v=1/);
assert.doesNotMatch(plaque,/plaque-(?:store-)?v\d+/);

const tumbler=fs.readFileSync(path.join(root,'tumbler/index.html'),'utf8');
assert.match(tumbler,/\/tumbler\/tumbler\.css\?v=1/);
assert.match(tumbler,/\/tumbler\/tumbler-order\.js\?v=1/);
assert.doesNotMatch(tumbler,/tumbler-(?:order-)?v\d+/);

const worker=fs.readFileSync(path.join(root,'_web_worker.js'),'utf8');
assert.match(worker,/\/landing-premium\.css\?v=1/);
assert.doesNotMatch(worker,/\/landing-premium-v\d+\.css\?v=/);

const retired=[
  'landing-premium-v1.css','landing-premium-v2.css',
  'plaque/plaque-v3.css','plaque/plaque-v4.css','plaque/plaque-v5.css',
  'plaque/plaque-store-v3.js','plaque/plaque-store-v4.js','plaque/plaque-store-v5.js','plaque/plaque-store-v6.js','plaque/plaque-store-v7.js',
  'tumbler/tumbler-v2.css','tumbler/tumbler-v3.css','tumbler/tumbler-v4.css','tumbler/tumbler-order-v4.js'
];
for(const file of retired)assert.ok(!fs.existsSync(path.join(root,file)),file+' must stay retired');

console.log('PASS: Plaque, Tumbler and campaign landing use canonical storefront assets only.');

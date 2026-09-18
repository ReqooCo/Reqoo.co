import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root=path.resolve(new URL('..',import.meta.url).pathname);
const activePages=[
  'admin/index.html','admin/orders.html','admin/production.html','admin/products.html',
  'admin/documents.html','admin/customers.html','admin/finance.html','admin/settings.html'
];
const canonical=['admin/admin-base.css','admin/admin-flow.css','admin/admin-shell.js'];
const retired=[
  'admin/reqoo-admin-universal.css','admin/admin-shell-v2.css','admin/admin-theme-v3.css',
  'admin/admin-flow-v1.css','admin/admin-shell-v2.js','admin/reqoo-admin-premium-v2.css',
  'admin/reqoo-admin-premium.css','admin/reqoo-admin-shell.js'
];

for(const file of canonical)assert.ok(fs.existsSync(path.join(root,file)),file+' must exist');
for(const file of retired)assert.ok(!fs.existsSync(path.join(root,file)),file+' must stay retired');

for(const page of activePages){
  const html=fs.readFileSync(path.join(root,page),'utf8');
  for(const m of html.matchAll(/(?:src|href)=["'](\/admin\/[^"'?#]+\.(?:js|css))(?:\?[^"']*)?["']/g)){
    const local=m[1].replace(/^\//,'');
    assert.ok(fs.existsSync(path.join(root,local)),page+' references missing '+local);
  }
  assert.doesNotMatch(html,/admin-(?:base|flow|shell)\.(?:css|js)/,page+' must not hardcode shared Admin assets');
}

const worker=fs.readFileSync(path.join(root,'_web_worker.js'),'utf8');
const middleware=fs.readFileSync(path.join(root,'functions/_middleware.js'),'utf8');
for(const source of [worker,middleware]){
  assert.match(source,/admin-base\.css\?v=1/);
  assert.match(source,/admin-flow\.css\?v=1/);
  assert.match(source,/admin-shell\.js\?v=1/);
  for(const old of ['reqoo-admin-universal.css','admin-shell-v2.css','admin-theme-v3.css','admin-flow-v1.css','admin-shell-v2.js','reqoo-admin-premium-v2.css','reqoo-admin-shell.js']){
    assert.ok(!source.includes(old),'routing layer still references retired '+old);
  }
}

console.log('PASS: Admin pages resolve existing page assets and share one canonical base/flow/shell stack.');

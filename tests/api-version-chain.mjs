import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root=path.resolve(new URL('..',import.meta.url).pathname);
const apiDir=path.join(root,'api');
const files=fs.readdirSync(apiDir).filter(x=>x.endsWith('.js'));
for(const file of files){
  const full=path.join(apiDir,file),src=fs.readFileSync(full,'utf8');
  for(const m of src.matchAll(/from\s+['"]([^'"]+)['"]/g)){
    const spec=m[1];
    if(!spec.startsWith('.'))continue;
    const target=path.resolve(path.dirname(full),spec);
    assert.ok(fs.existsSync(target),file+' imports missing '+spec);
  }
}
const worker=fs.readFileSync(path.join(apiDir,'worker.js'),'utf8');
assert.match(worker,/shop-flow-v5\.js/,'API worker must use current public Shop flow');
assert.match(worker,/shop-admin-flow-v18\.js/,'API worker must use current Admin Shop flow');

const graph=new Map();
for(const file of files.filter(x=>/^shop-admin-flow-v\d+\.js$/.test(x))){
  const src=fs.readFileSync(path.join(apiDir,file),'utf8');
  const deps=[...src.matchAll(/from\s+['"]\.\/(shop-admin-flow-v\d+\.js)['"]/g)].map(m=>m[1]);
  graph.set(file,deps);
}
const visiting=new Set(),done=new Set();
function visit(node){
  if(done.has(node))return;
  assert.ok(!visiting.has(node),'cycle detected in Shop Admin flow chain at '+node);
  visiting.add(node);
  for(const dep of graph.get(node)||[]){assert.ok(graph.has(dep),'missing flow dependency '+dep);visit(dep)}
  visiting.delete(node);done.add(node);
}
visit('shop-admin-flow-v18.js');
console.log('PASS: active API entrypoints exist and the versioned compatibility chain has no missing imports or cycles.');

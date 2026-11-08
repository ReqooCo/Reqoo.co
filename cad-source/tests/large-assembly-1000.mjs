import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {performance} from 'node:perf_hooks';
import init from 'replicad-opencascadejs';
import * as R from 'replicad';
import {validateProject,buildModel} from '../src/engine.js';
import {parseProject,serializeProject} from '../src/project-io.js';
import {MAX_PROJECT_FEATURES,MAX_NATIVE_BODIES} from '../src/cad-limits.js';

assert.equal(MAX_PROJECT_FEATURES,1000);
assert.equal(MAX_NATIVE_BODIES,80);
const partCount=43;
const features=[
  ...Array.from({length:partCount},(_,i)=>({
    id:'assembly_body_'+i,type:'box',inputs:[],
    params:{width:10,depth:8,height:5,x:(i%11)*18,y:Math.floor(i/11)*18}
  })),
  ...Array.from({length:MAX_PROJECT_FEATURES-partCount},(_,i)=>({
    id:'construction_axis_'+i,type:'axis',inputs:[],
    params:{x:i%50,y:Math.floor(i/50),z:0,axis:'Z'}
  }))
];
const doc={format:'reqoo-cad',version:1,title:'1000 feature CAD QA',features};
assert.equal(doc.features.length,1000);
assert.doesNotThrow(()=>validateProject(doc));
const overLimit={...doc,features:[...features,{id:'over_1000',type:'axis',params:{axis:'X'},inputs:[]}]};
assert.throws(()=>validateProject(overLimit),/supported/);
const restored=parseProject(serializeProject(doc));
assert.equal(restored.features.length,1000);
assert.equal(restored.features.at(-1).id,'construction_axis_956');

const require=createRequire(import.meta.url);
R.setOC(await init({locateFile:()=>require.resolve('replicad-opencascadejs/wasm')}));
const start=performance.now();
const built=await buildModel(restored);
try{
  const bodies=built.items.filter(item=>item.kind==='body');
  assert.equal(bodies.length,partCount,'1000 feature model must retain 43 independent bodies');
  assert.equal(built.featureCount,1000);
  assert.ok(bodies.every(item=>item.volume>0),'all native solids must have positive volume');
  const milliseconds=Math.round(performance.now()-start);
  const rssMB=Math.round(process.memoryUsage().rss/1024/1024);
  console.log(JSON.stringify({check:'R3DS_LARGE_ASSEMBLY',status:'PASS',features:1000,bodies:bodies.length,elapsedMs:milliseconds,rssMB,metrics:built.metrics}));
}finally{
  built.release();
}

import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {performance} from 'node:perf_hooks';
import init from 'replicad-opencascadejs';
import * as R from 'replicad';
import {buildModel} from '../src/engine.js';
import {MAX_PROJECT_FEATURES,MAX_NATIVE_BODIES} from '../src/cad-limits.js';

// A CAD stress fixture: 43 independent drilled plates and 344 native boolean cuts.
// Remaining construction axes exercise full 1000-step history, persistence and meshing.
const solids=43,holesPerPlate=8,features=[];
for(let i=0;i<solids;i++){
  const x=(i%11)*80,y=Math.floor(i/11)*55;
  const bodyId='plate_'+i;
  features.push({id:bodyId,type:'box',params:{width:60,depth:32,height:5,x,y,z:0},inputs:[]});
  let previous=bodyId;
  for(let h=0;h<holesPerPlate;h++){
    const cutter='hole_cutter_'+i+'_'+h,cut='drilled_'+i+'_'+h;
    features.push({id:cutter,type:'cylinder',params:{
      radius:2.2,height:7,x:x+[-21,-7,7,21][h%4],y:y+(h<4?-8:8),z:-1
    },inputs:[]});
    features.push({id:cut,type:'subtract',params:{},inputs:[previous,cutter]});
    previous=cut;
  }
}
assert.equal(features.length,solids*(1+holesPerPlate*2));
while(features.length<MAX_PROJECT_FEATURES){
  const i=features.length;
  features.push({id:'construction_'+i,type:'axis',params:{x:i%30,y:Math.floor(i/30),axis:'Z'},inputs:[]});
}
assert.equal(features.length,1000);
assert.equal(MAX_NATIVE_BODIES,80);
const require=createRequire(import.meta.url);
R.setOC(await init({locateFile:()=>require.resolve('replicad-opencascadejs/wasm')}));
const start=performance.now();
const model=await buildModel({format:'reqoo-cad',version:1,title:'Complex REQOO assembly stress',features});
try{
  const bodies=model.items.filter(item=>item.kind==='body');
  assert.equal(model.featureCount,MAX_PROJECT_FEATURES);
  assert.equal(bodies.length,solids,'boolean cutters and intermediate states must not leak visible bodies');
  assert.ok(bodies.every(item=>item.volume>0));
  const elapsedMs=Math.round(performance.now()-start);
  const rssMB=Math.round(process.memoryUsage().rss/1024/1024);
  console.log(JSON.stringify({check:'R3DS_COMPLEX_ASSEMBLY',status:'PASS',features:features.length,bodies:bodies.length,booleanCuts:solids*holesPerPlate,elapsedMs,rssMB,metrics:model.metrics}));
}finally{model.release();}

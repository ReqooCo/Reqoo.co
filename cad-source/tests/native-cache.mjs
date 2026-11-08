import assert from 'node:assert/strict';import {createRequire} from 'node:module';import init from 'replicad-opencascadejs';import * as R from 'replicad';import {buildModel} from '../src/engine.js';
const require=createRequire(import.meta.url);R.setOC(await init({locateFile:()=>require.resolve('replicad-opencascadejs/wasm')}));const f=(id,type,params,inputs=[])=>({id,type,params,inputs}),doc=features=>({format:'reqoo-cad',version:1,features});
const a=f('box','box',{width:20,depth:10,height:5});let base=await buildModel(doc([a]));const geometryKey=base.items[0].mesh.cacheKey;
const b=f('second','cylinder',{radius:3,height:8,x:40});let next=await buildModel(doc([a,b]),{base});assert.equal(next.metrics.reusedFeatures,1);assert.equal(next.metrics.builtFeatures,1);assert.equal(next.items[0].mesh.cacheKey,geometryKey);next.adoptBase();base.release();assert.ok(Math.abs(R.measureVolume(next.shapes.get('box'))-1000)<.01);base=next;
const moved=f('moved','move',{x:5},['second']);next=await buildModel(doc([a,b,moved]),{base});next.adoptBase();base.release();assert.equal(next.metrics.reusedFeatures,2);assert.ok((await next.export('step')).size>1000);base=next;
const preview=await buildModel(doc([a,b,moved,f('preview','move',{x:2},['box'])]),{base,preview:true});preview.release();assert.ok(Math.abs(R.measureVolume(base.shapes.get('box'))-1000)<.01);
await assert.rejects(()=>buildModel(doc([a,b,moved,f('bad','scale',{factor:0},['box'])]),{base}));assert.ok(Math.abs(R.measureVolume(base.shapes.get('box'))-1000)<.01);
next=await buildModel(doc([{...a,params:{...a.params,width:30}},b,moved]),{base});assert.equal(next.metrics.reusedFeatures,0);assert.notEqual(next.items.find(i=>i.id==='box').mesh.cacheKey,geometryKey);base.release();assert.ok(Math.abs(R.measureVolume(next.shapes.get('box'))-1500)<.01);next.release();
// Real-world laser-gantry assembly can exceed 50 bodies. Confirm bounded 80-body support,
 // reusable mesh cache and deterministic rejection of the 81st solid.
 const largeParts=Array.from({length:81},(_,i)=>f('large'+i,'box',{width:10,depth:8,height:5,x:(i-40)*22}));
 const started=Date.now();
 let sixty=await buildModel(doc(largeParts.slice(0,60)));
 assert.equal(sixty.items.filter(item=>item.kind==='body').length,60);
 let eighty=await buildModel(doc(largeParts.slice(0,80)),{base:sixty});
 assert.equal(eighty.items.filter(item=>item.kind==='body').length,80);
 assert.equal(eighty.metrics.reusedFeatures,60);
 eighty.adoptBase();sixty.release();
 await assert.rejects(()=>buildModel(doc(largeParts),{base:eighty}),/Limit is 80 native bodies/);
 assert.equal(eighty.items.filter(item=>item.kind==='body').length,80,'failed overflow must preserve base geometry');
 eighty.release();
 console.log('NATIVE BODY BUDGET PASS: 60/80 bodies, incremental native reuse and 81st-body rejection; total_ms='+ (Date.now()-started));
console.log('NATIVE CACHE PASS: append reuses history; ownership survives parent release, preview and failed build; upstream edits rebuild fully');

import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import init from 'replicad-opencascadejs';
import * as R from 'replicad';
import {buildModel} from '../src/engine.js';
import {dragRecipe} from '../src/sketch-drag.js';
const req=createRequire(import.meta.url);R.setOC(await init({locateFile:()=>req.resolve('replicad-opencascadejs/wasm')}));
const f=(id,type,params,inputs=[])=>({id,type,params,inputs}),doc=features=>({format:'reqoo-cad',version:1,features}),near=(a,b)=>assert.ok(Math.abs(a-b)<.001,`${a} != ${b}`);
assert.deepEqual(dragRecipe('rectangle',[2,3],[12,8],'center'),{x:2,y:3,width:20,height:10});
assert.deepEqual(dragRecipe('rectangle',[2,3],[12,8],'corner'),{x:7,y:5.5,width:10,height:5});
const base=[f('box','box',{width:30,depth:20,height:10}),f('circle','sketch',{shape:'circle',radius:4,offset:10,hostBody:'box'}),f('regions','imprint',{},['box','circle'])];
let model=await buildModel(doc(base)),body=model.items.find(i=>i.kind==='body'),top=body.faceInfo.filter(i=>i.normal[2]>.99);assert.equal(top.length,2);near(body.volume,6000);assert.deepEqual(body.imprintProfiles,['circle']);const inner=top.find(i=>i.area<100),outer=top.find(i=>i.area>100);assert.notEqual(inner.reference.loops,outer.reference.loops);model.release();
for(const [region,area] of [[inner,Math.PI*16],[outer,600-Math.PI*16]]){
 const extrude=f('pull','extrude',{face:region.index,faceRef:region.reference,distance:3,operation:'Add'},['regions']);
 model=await buildModel(doc([...base,extrude]));near(model.items.find(i=>i.id==='pull').volume,6000+area*3);model.release();
 const edited=structuredClone(base);edited[1].params.radius=5;model=await buildModel(doc([...edited,extrude]));near(model.items.find(i=>i.id==='pull').volume,6000+(region===inner?Math.PI*25:600-Math.PI*25)*3);model.release();
}
model=await buildModel(doc([...base.slice(0,2),f('small','sketch',{shape:'circle',radius:2,offset:10,hostBody:'box'}),f('regions','imprint',{},['box','circle','small'])]));body=model.items.find(i=>i.kind==='body');assert.equal(body.faceInfo.filter(i=>i.normal[2]>.99).length,3);near(body.volume,6000);const step=await model.shapes.get('regions').blobSTEP();const imported=await R.importSTEP(step);try{const props=R.measureShapeVolumeProperties(imported);near(props.volume,6000);props.delete();assert.equal(imported.faces.length,8);}finally{imported.delete();model.release();}
const outside=structuredClone(base);outside[1].params.x=100;model=await buildModel(doc(outside));body=model.items.find(i=>i.kind==='body');assert.equal(body.faceInfo.length,6);assert.deepEqual(body.imprintProfiles,[]);near(body.volume,6000);model.release();
console.log('PLANAR REGIONS PASS: Center/Corner recipes, native disk/remainder and nested partitions, exact independent pulls, upstream radius rebuild, outside profiles and STEP roundtrip');

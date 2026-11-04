import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import init from 'replicad-opencascadejs';
import {setOC} from 'replicad';
import {buildModel} from '../src/engine.js';
import {snapTranslation,roundToStep,alignmentDelta} from '../src/snapping.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-5,`${a} != ${b}`);
near(roundToStep(2.47,.1),2.5);near(roundToStep(-2.47,.1),-2.5);
const bounds=[[-5,-5,0],[5,5,10]],target={name:'Target',bounds:[[20,0,0],[30,10,10]]};
const snap=v=>snapTranslation({bounds,delta:[0,0,0],axis:0,value:v,targets:[target],threshold:.5,step:1});
near(snap(14.7).value,15);assert.match(snap(14.7).label,/Target/);near(snap(40.2).value,40);
near(snapTranslation({bounds,delta:[0,0,0],axis:0,value:14.7,targets:[target],threshold:1,enabled:false}).value,14.7);
assert.deepEqual(alignmentDelta(bounds,target.bounds,{axis:'X'}),[25,0,0]);
assert.deepEqual(alignmentDelta(bounds,target.bounds,{axis:'XYZ',sourceAnchor:'max',targetAnchor:'min'}),[15,-5,-10]);
assert.throws(()=>alignmentDelta(bounds,target.bounds,{axis:'bad'}));
const require=createRequire(import.meta.url);setOC(await init({locateFile:()=>require.resolve('replicad-opencascadejs/wasm')}));
const original={format:'reqoo-cad',version:1,features:[
 {id:'a',type:'box',params:{width:10,depth:20,height:30,x:10,y:20,z:0},inputs:[]},
 {id:'b',type:'box',params:{width:40,depth:50,height:60,x:100,y:200,z:80},inputs:[]}
]};
let model=await buildModel(original);const a=model.items.find(i=>i.id==='a'),b=model.items.find(i=>i.id==='b'),top=a.faceInfo.find(f=>f.normal[2]>.99),left=b.faceInfo.find(f=>f.normal[0]<-.99);model.release();
for(const [type,params]of [['scale',{factor:2,center:[10,20,15]}],['align',{axis:'XYZ'}],['align',{method:'faces',sourceFace:top.index,sourceFaceRef:top.reference,targetFace:left.index,targetFaceRef:left.reference,gap:2}]]){
 const doc=structuredClone(original);doc.features.push({id:'result',type,params,inputs:type==='scale'?['a']:['a','b']});model=await buildModel(doc);const result=model.items.find(i=>i.id==='result');assert.ok(model.items.some(i=>i.id==='b'),'Target part is preserved');near(result.volume,type==='scale'?48000:6000);
 if(type==='scale'){near((result.bounds[0][0]+result.bounds[1][0])/2,10);near((result.bounds[0][2]+result.bounds[1][2])/2,15);}
 else if(params.method==='faces'){near(result.bounds[1][0],78);assert.ok(result.faceInfo.some(f=>f.normal[0]>.99&&Math.abs(f.center[0]-78)<1e-4));}
 else for(let i=0;i<3;i++)near((result.bounds[0][i]+result.bounds[1][i])/2,(b.bounds[0][i]+b.bounds[1][i])/2);
 model.release();
}
const invalid=structuredClone(original);invalid.features.push({id:'bad',type:'align',params:{axis:'XYZ'},inputs:['a','a']});await assert.rejects(()=>buildModel(invalid),/two different/);
console.log('PASS grid/origin/part snapping, bypass, exact pivot scale, two-part XYZ alignment, rotated face alignment and target preservation');

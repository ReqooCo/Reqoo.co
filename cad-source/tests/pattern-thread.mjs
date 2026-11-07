import assert from 'node:assert/strict';import {createRequire} from 'node:module';import init from 'replicad-opencascadejs';import * as R from 'replicad';import {buildModel} from '../src/engine.js';import {cutThread,cylinderInfo} from '../src/thread-solid.js';import {autoThread,BASIC_DEPTH,threadDimensions} from '../src/thread-specs.js';
const req=createRequire(import.meta.url);R.setOC(await init({locateFile:()=>req.resolve('replicad-opencascadejs/wasm')}));
const doc=features=>({format:'reqoo-cad',version:1,features}),f=(id,type,params,inputs=[])=>({id,type,params,inputs}),near=(a,b,t=.001)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
let base=[f('stock','cylinder',{radius:3,height:6})],model=await buildModel(doc(base)),stock=model.items[0],side=stock.faceInfo.find(f=>f.cylinder),spec=autoThread(side.cylinder,{threadLength:3});assert.equal(spec.size,'M6');assert.equal(spec.pitch,1);assert.equal(side.cylinder.internal,false);model.release();
// Cosmetic threads retain exact stock geometry while preserving editable specifications.
model=await buildModel(doc([...base,f('cosmetic','thread',{...spec,mode:'Cosmetic',face:side.index,faceRef:side.reference},['stock'])]));
near(model.items[0].volume,stock.volume);assert.equal(model.items[0].faceInfo.some(x=>x.type==='BSPLINE_SURFACE'),false);
const cosmeticSTEP=await (await model.export('step',['cosmetic'])).text();assert.match(cosmeticSTEP,/ISO-10303-21/);model.release();
await assert.rejects(()=>buildModel(doc([...base,f('invalid','thread',{...spec,mode:'Cosmetic',diameter:8,face:side.index,faceRef:side.reference},['stock'])])),/listed metric/);
const thread=f('thread','thread',{...spec,face:side.index,faceRef:side.reference},['stock']);
let rightVolume;
for(const hand of ['Right','Left']){
 model=await buildModel(doc([...base,{...thread,params:{...thread.params,hand}}]));const result=model.items[0];assert.ok(result.volume<stock.volume-10);assert.ok(result.faceInfo.some(f=>f.type==='BSPLINE_SURFACE'),'Real helical flanks are present');near(result.bounds[1][2],6);near(result.bounds[0][2],0);
 if(hand==='Right'){rightVolume=result.volume;const blob=await model.export('step',['thread']),text=await blob.text();assert.match(text,/ISO-10303-21/);assert.match(text,/B_SPLINE_SURFACE/);const imported=await R.importSTEP(blob),props=R.measureShapeVolumeProperties(imported);near(Math.abs(props.volume),result.volume,.02);props.delete();imported.delete();}else near(result.volume,rightVolume,.02);model.release();
}
// A rotated/translated cylindrical face must keep its native axis, not camera/world Z.
base=[...base,f('rotated','rotate',{axis:'Y',angle:90},['stock']),f('positioned','move',{x:12,y:7,z:8},['rotated'])];model=await buildModel(doc(base));const rotated=model.items[0],face=rotated.faceInfo.find(f=>f.cylinder);model.release();model=await buildModel(doc([...base,f('thread','thread',{...autoThread(face.cylinder,{threadLength:3}),face:face.index,faceRef:face.reference},['positioned'])]));near(model.items[0].volume,rightVolume,.02);assert.ok(model.items[0].bounds[0][0]>11.99);model.release();
// An inner bore uses the complementary internal basic profile.
const bore=6-2*BASIC_DEPTH; base=[f('blank','cylinder',{radius:6,height:5}),f('cutter','cylinder',{radius:bore/2,height:5}),f('stock','subtract',{},['blank','cutter'])];model=await buildModel(doc(base));stock=model.items[0];const inner=stock.faceInfo.find(f=>f.cylinder?.internal);assert.ok(inner);const internal=autoThread(inner.cylinder,{threadLength:3});assert.equal(internal.size,'M6');assert.equal(internal.kind,'Internal');model.release();model=await buildModel(doc([...base,f('thread','thread',{...internal,face:inner.index,faceRef:inner.reference},['stock'])]));assert.ok(model.items[0].volume<stock.volume-10);assert.ok(model.items[0].faceInfo.some(f=>f.type==='BSPLINE_SURFACE'));model.release();
assert.throws(()=>threadDimensions({...spec,diameter:8},side.cylinder),/listed metric/);assert.throws(()=>threadDimensions({...spec,length:7},side.cylinder),/exceed/);assert.throws(()=>threadDimensions({...spec,kind:'Internal'},side.cylinder),/must match/);assert.throws(()=>threadDimensions({...spec,size:'M8',diameter:8,pitch:1.25},side.cylinder),/Resize/);
await assert.rejects(()=>buildModel(doc([f('box','box',{width:5,depth:5,height:5}),f('bad','thread',{...spec,face:0},['box'])])),/cylindrical/);
for(const spacing of [[12,0,0],[0,-12,0],[0,0,12],[12,-12,0]]){model=await buildModel(doc([f('box','box',{width:2,depth:2,height:2}),f('copies','pattern',{count:4,x:spacing[0],y:spacing[1],z:spacing[2]},['box'])]));const result=model.items[0];near(result.volume,32);for(let axis=0;axis<3;axis++)near(result.bounds[1][axis]-result.bounds[0][axis],2+3*Math.abs(spacing[axis]),.002);model.release();}
console.log('PATTERN THREAD PASS: XYZ/reverse patterns, metric detection, external/internal true helices, handedness, native-axis transforms, STEP round-trip, stock/length/type validation');

// Owner screenshot: a non-standard 6.325 mm peg attached to a four-post base.
let plate=R.makeBox([-20,-20,-3],[20,20,0]);
for(const x of [-15,15])for(const y of [-15,15]){const peg=R.makeCylinder(3.1625,10,[x,y,0]),next=plate.fuse(peg);plate.delete();peg.delete();plate=next;}
const pegs=plate.faces,peg=pegs.find(f=>f.geomType==='CYLINDRE'),c=cylinderInfo(peg),p=autoThread(c,{threadLength:10}),threaded=cutThread(plate,peg,p);
assert.equal(p.size,'Custom');near(p.diameter,6.325);assert.ok(R.isShape3D(threaded));const before=R.measureShapeVolumeProperties(plate),after=R.measureShapeVolumeProperties(threaded);assert.ok(after.volume>before.volume-200&&after.volume<before.volume-1,'Thread removes only local peg material');
const roundTrip=await R.importSTEP(await threaded.blobSTEP()),props=R.measureShapeVolumeProperties(roundTrip);near(props.volume,after.volume,.02);props.delete();roundTrip.delete();before.delete();after.delete();pegs.forEach(f=>f.delete());threaded.delete();plate.delete();
console.log('CUSTOM PEG THREAD PASS: 6.325 mm four-post base, full-length pitch 1 thread, bounded material removal and STEP roundtrip');

await import('./owner-assembly.mjs');

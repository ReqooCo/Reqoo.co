import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import init from 'replicad-opencascadejs';
import * as R from 'replicad';
import {buildModel} from '../src/engine.js';
import {joinedOffsetDrawing} from '../src/offset-chain.js';
const req=createRequire(import.meta.url);R.setOC(await init({locateFile:()=>req.resolve('replicad-opencascadejs/wasm')}));
const f=(id,params)=>({id,type:'sketch',params:{plane:'YZ',...params},inputs:[]});
const features=[f('line',{shape:'polyline',points:[[0,0],[20,0],[20,20],[0,20]],closed:false}),f('arc',{shape:'arc',points:[[0,20],[0,0]],sagitta:10,closed:false})];
const doc=(fs)=>({format:'reqoo-cad',version:1,features:fs});
let m=await buildModel(doc([...features,{id:'offset',type:'sketchOffset',params:{distance:1,mode:'Chain',keepInputs:true},inputs:['arc','line']} ]));
const item=m.items.find(i=>i.id==='offset');assert.ok(item.profileClosed);assert.ok(item.edges.some(e=>e.type==='CIRCLE'));assert.ok(item.edges.some(e=>e.type==='LINE'));assert.ok(item.area>0);const area=item.area;m.release();
m=await buildModel(JSON.parse(JSON.stringify(doc([...features,{id:'offset',type:'sketchOffset',params:{distance:1,mode:'Chain'},inputs:['line','arc']},{id:'extrude',type:'extrude',params:{distance:5},inputs:['offset']}]))));assert.ok(Math.abs(m.items.find(i=>i.id==='extrude').volume-area*5)<.05);m.release();
assert.throws(()=>joinedOffsetDrawing([R.draw([0,0]).lineTo([10,0]).done(),R.draw([20,0]).lineTo([30,0]).done()]),/connected/);
assert.throws(()=>joinedOffsetDrawing([R.draw([0,0]).lineTo([10,0]).done(),R.draw([10,0]).lineTo([20,0]).done(),R.draw([10,0]).lineTo([10,10]).done()]),/branches/);
console.log('PASS analytic mixed line/arc chain offset, reversed input order, YZ plane, project roundtrip, native extrusion and disconnected/branch rejection');

m=await buildModel(doc([...features,{id:'first',type:'sketchOffset',params:{distance:1,mode:'Chain',keepInputs:true},inputs:['arc','line']},{id:'again',type:'sketchOffset',params:{distance:1,mode:'Chain',keepInputs:true},inputs:['first']} ]));assert.ok(m.items.find(i=>i.id==='again').profileClosed);assert.ok(m.items.find(i=>i.id==='again').area>area);m.release();console.log('PASS repeated native chain offset');
const open=[f('a',{shape:'polyline',points:[[0,0],[20,0]],closed:false}),f('b',{shape:'polyline',points:[[20,10],[20,0]],closed:false})];
m=await buildModel(doc([...open,{id:'off',type:'sketchOffset',params:{distance:2,mode:'Chain'},inputs:['b','a']}]));const wire=m.items.find(i=>i.id==='off');assert.equal(wire.profileClosed,false);assert.ok(wire.edgeCount>=2);assert.ok(Math.abs(wire.bounds[1][1]-18)<.03);m.release();console.log('PASS reversed open multi-feature chain');
const solid=[{id:'box',type:'box',params:{width:20,depth:20,height:8},inputs:[]},{id:'hole',type:'hole',params:{diameter:4,face:5,extent:'Through all'},inputs:['box']}];
// A projected face with a hole must never silently lose its inner contour.
let base=await buildModel(doc([{id:'box',type:'box',params:{width:20,depth:20,height:8},inputs:[]}]));const top=base.items[0].faceInfo.find(f=>f.normal[2]>.99);base.release();solid[1].params.face=top.index;
base=await buildModel(doc(solid));const piercedTop=base.items[0].faceInfo.find(f=>f.normal[2]>.99);base.release();
const projected=[...solid,{id:'projection',type:'faceSketch',params:{face:piercedTop.index,distance:0},inputs:['hole']}];
await assert.rejects(()=>buildModel(doc([...projected,{id:'bad',type:'sketchOffset',params:{distance:1,mode:'Chain'},inputs:['projection']}])),/holes/);
console.log('PASS projected hole contour cannot be silently discarded');
m=await buildModel(doc([features[1],{id:'arcOffset',type:'sketchOffset',params:{distance:1,mode:'Single',keepInputs:true},inputs:['arc']} ]));const arcOnly=m.items.find(i=>i.id==='arcOffset');assert.equal(arcOnly.profileClosed,false);assert.ok(arcOnly.edges.every(e=>e.type==='CIRCLE'));m.release();console.log('PASS standalone open arc offset');

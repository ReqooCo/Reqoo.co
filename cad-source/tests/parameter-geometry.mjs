import assert from 'node:assert/strict';import {parameterGeometry as g,parameterDragValue as drag} from '../src/parameter-geometry.js';
assert.deepEqual(g('box','width',{width:40,height:20,x:10,y:5,z:2}).origin,[30,5,12]);assert.equal(g('box','width',{}).coefficient,2);assert.deepEqual(g('box','height',{height:20,z:2}).origin,[0,0,22]);assert.deepEqual(g('box','depth',{}).direction,[0,1,0]);
const item={bounds:[[-10,-10,0],[10,10,10]],faceInfo:[{index:0,type:'PLANE',center:[0,0,10],normal:[0,0,1]}]},context={items:[item],refs:[{kind:'face',index:0}]};assert.deepEqual(g('hole','depth',{depth:5},context).direction,[0,0,-1]);assert.deepEqual(g('hole','diameter',{diameter:8,x:2,y:3},context).origin,[6,3,10]);assert.equal(g('hole','diameter',{},context).coefficient,2);
assert.deepEqual(g('split','offset',{plane:'YZ',offset:20}).origin,[20,0,0]);assert.deepEqual(g('split','offset',{plane:'XZ',offset:12}).direction,[0,-1,0]);assert.equal(g('revolve','angle',{axis:'Y'}).kind,'angle');assert.deepEqual(g('revolve','angle',{axis:'Y'}).direction,[0,1,0]);
const sketch={bounds:[[10,-10,0],[30,10,0]],sketchPlane:{origin:[0,0,0],x:[1,0,0],normal:[0,0,1]}};assert.deepEqual(g('sketchOffset','distance',{distance:2},{items:[sketch]}).origin,[32,0,0]);
assert.deepEqual(g('thread','length',{threadStock:{axis:[1,0,0],origin:[0,0,0],min:0,max:10,radius:3},end:'Start',offset:1,length:4}).origin,[5,0,0]);
assert.equal(drag(10,20,.5,g('box','width',{})),30);assert.equal(drag(0,61,1,g('revolve','angle',{}),{step:5}),30);assert.equal(drag(3,-200,1,g('circularPattern','count',{}),{min:2,max:25}),2);
console.log('PARAMETER GEOMETRY PASS: world/plane/face frames, physical dimensions, hole normals, thread axis, angle and count drags');

await import("./tool-workflow.mjs");

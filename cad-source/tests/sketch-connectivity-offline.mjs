import assert from 'node:assert/strict';
import {connectedSketchIds} from '../src/sketch-connectivity.js';
const plane={origin:[0,0,0],x:[1,0,0],normal:[0,0,1]};
const edge=(a,b)=>({lines:[...a,...b]});
const sketch=(id,a,b,other={})=>({id,kind:'sketch',sketchPlane:plane,edges:[edge(a,b)],...other});
const run=(name,fn)=>{fn();console.log('PASS',name);};
run('connected, branched and isolated',()=>{
 const items=[sketch('a',[0,0,0],[1,0,0]),sketch('b',[1,0,0],[2,0,0]),sketch('branch',[1,0,0],[1,1,0]),sketch('far',[10,0,0],[11,0,0])];
 assert.deepEqual(new Set(connectedSketchIds(items,'a')),new Set(['a','b','branch']));
});
run('rejects malformed coordinate arrays',()=>{
 const a=sketch('a',[0,0,0],[1,0,0]);
 const broken={...sketch('broken',[1,0,0],[2,0,0]),edges:[{lines:[1,0,0,2,0,0,999]}]};
 assert.deepEqual(connectedSketchIds([a,broken],'a'),['a']);
});
run('rejects nonfinite coordinates',()=>{
 const a=sketch('a',[0,0,0],[1,0,0]);
 const broken={...sketch('broken',[1,0,0],[2,0,0]),edges:[{lines:[NaN,0,0,2,0,0]}]};
 assert.deepEqual(connectedSketchIds([a,broken],'a'),['a']);
});
run('respects plane and region host',()=>{
 const a=sketch('a',[0,0,0],[1,0,0]);
 const other=sketch('other',[1,0,0],[2,0,0],{sketchPlane:{...plane,origin:[0,0,1]}});
 const region=sketch('region',[1,0,0],[2,0,0],{regionHost:'host'});
 assert.deepEqual(connectedSketchIds([a,other,region],'a'),['a']);
 assert.deepEqual(connectedSketchIds([a,other,region],'region'),[]);
});
run('negative-grid tolerance and reversed direction',()=>{
 const a=sketch('a',[-2,0,0],[-1,0,0]),b=sketch('b',[0,0,0],[-1+0.000004,0,0]);
 assert.deepEqual(new Set(connectedSketchIds([a,b],'a')),new Set(['a','b']));
});
run('3000 connected segments',()=>{
 const items=Array.from({length:3000},(_,i)=>sketch('s'+i,[i,0,0],[i+1,0,0]));
 assert.equal(connectedSketchIds(items,'s0').length,3000);
});

run('coplanar sketches with shifted origins and reversed normals connect',()=>{
 const a=sketch('a',[0,0,0],[1,0,0]);
 const shifted=sketch('shifted',[1,0,0],[2,0,0],{sketchPlane:{origin:[10,10,0],x:[0,1,0],normal:[0,0,-1]}});
 assert.deepEqual(new Set(connectedSketchIds([a,shifted],'a')),new Set(['a','shifted']));
});
run('parallel sketches on different planes stay isolated',()=>{
 const a=sketch('a',[0,0,0],[1,0,0]);
 const raised=sketch('raised',[1,0,0],[2,0,0],{sketchPlane:{origin:[0,0,1],x:[1,0,0],normal:[0,0,1]}});
 assert.deepEqual(connectedSketchIds([a,raised],'a'),['a']);
});

run('scaled coplanar normals connect without joining nearby parallel planes',()=>{
 const a=sketch('a',[0,0,0],[1,0,0]);
 const scaled=sketch('scaled',[1,0,0],[2,0,0],{sketchPlane:{origin:[3,2,0],x:[1,0,0],normal:[0,0,10]}});
 const separated=sketch('separated',[1,0,0],[2,0,0],{sketchPlane:{origin:[0,0,0.01],x:[1,0,0],normal:[0,0,10]}});
 assert.deepEqual(new Set(connectedSketchIds([a,scaled,separated],'a')),new Set(['a','scaled']));
});
run('invalid plane normals cannot form a chain',()=>{
 const a=sketch('a',[0,0,0],[1,0,0]);
 const broken=sketch('broken',[1,0,0],[2,0,0],{sketchPlane:{origin:[0,0,0],normal:[0,0,0]}});
 assert.deepEqual(connectedSketchIds([a,broken],'a'),['a']);
});

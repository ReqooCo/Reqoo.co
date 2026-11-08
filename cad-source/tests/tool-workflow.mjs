import assert from 'node:assert/strict';import{promoteBodySelection,TOOL_WORKFLOWS,toolSelectionError,extendCanvasSelection}from'../src/tool-workflow.js';import{TYPES}from'../src/engine.js';
for(const type of TYPES)assert.ok(TOOL_WORKFLOWS[type],'Missing tool workflow: '+type);
const b={id:'b',kind:'body',faceInfo:[{index:0,type:'PLANE'},{index:1,type:'CYLINDER',cylinder:{full:true}}]},c={...b,id:'c'},s={id:'s',kind:'sketch',featureId:'s',profileClosed:true,sketchPlane:{normal:[0,0,1]}},q={...s,id:'q'},open={...s,id:'open',profileClosed:false},construction={...s,id:'construction',construction:true},items=[b,c,s,q,open,construction],ref=(id,kind='sketch',index)=>({id,kind,...(index===undefined?{}:{index})}),doc={features:[{id:'s',params:{shape:'circle'}}]};
assert.equal(extendCanvasSelection([ref('b','body')],ref('s')),false);assert.equal(extendCanvasSelection([ref('s')],ref('b','face',0)),false);assert.equal(extendCanvasSelection([ref('s')],ref('q')),true);assert.equal(extendCanvasSelection([ref('b','face',0)],ref('b','face',1)),true);assert.equal(extendCanvasSelection([ref('b','face',0)],ref('c','face',0),{filter:'face'}),true);
assert.equal(extendCanvasSelection([ref('b','face',0)],ref('b','face',1)),true,'Different faces on one body must support additive selection');
assert.equal(extendCanvasSelection([ref('b','face',0)],ref('c','face',1)),false,'Cross-body face selection remains opt-in');assert.equal(extendCanvasSelection([ref('s')],ref('b','face',0),{explicit:true}),true);
for(const [type,refs]of [['extrude',[ref('s')]],['extrude',[ref('s'),ref('q')]],['extrude',[ref('b','face',0)]],['revolve',[ref('s')]],['loft',[ref('s'),ref('q')]],['sweep',[ref('s'),ref('open')]],['union',[ref('b','body'),ref('c','body')]],['fillet',[ref('b','edge',0),ref('b','edge',1)]],['shell',[ref('b','face',0)]],['hole',[ref('s')]],['thread',[ref('b','face',1)]]])assert.equal(toolSelectionError(type,refs,items,doc),'',type);
for(const [type,refs]of [['extrude',[ref('b','face',0),ref('s')]],['extrude',[ref('open')]],['extrude',[ref('construction')]],['sweep',[ref('open'),ref('s')]],['loft',[ref('s')]],['union',[ref('s'),ref('b','body')]],['fillet',[ref('b','edge',0),ref('c','edge',0)]],['shell',[ref('b','face',0),ref('b','face',1)]],['thread',[ref('b','face',0)]]])assert.ok(toolSelectionError(type,refs,items,doc),type);
for(const type of TYPES.filter(t=>TOOL_WORKFLOWS[t]!=='create'))assert.ok(toolSelectionError(type,[],items,doc),'Empty selection accepted for '+type);
for(const type of ['mirror','duplicate','circularPattern'])assert.ok(toolSelectionError(type,[ref('b','body'),ref('c','body')],items,doc),'Single-source '+type+' cannot silently ignore a second body');
for(const type of ['extrude','move','fillet','hole'])assert.ok(toolSelectionError(type,[ref('missing','body')],items,doc),'Stale reference: '+type);
console.log('TOOL WORKFLOW PASS: every native tool has an entry contract; mixed/stale domains, open/construction extrusion, profile/path ordering, body count, edge ownership and face requirements');

assert.deepEqual(promoteBodySelection([ref('b','body'),ref('c','face',1)],'c'),[ref('b','body'),ref('c','body')]);
assert.deepEqual(promoteBodySelection([ref('b','body')],'b'),[ref('b','body')]);
assert.deepEqual(promoteBodySelection([ref('b','body'),ref('c','face',0)],'c'),[ref('b','body'),ref('c','body')],'Promoting another face must retain earlier Boolean body');
assert.deepEqual(promoteBodySelection([ref('b','body'),ref('c','body')],'c'),[ref('b','body'),ref('c','body')],'Repeated double-tap must not deselect a Boolean operand');


import {resolveReference,descriptorDistance} from '../src/topology.js';
// Sprint 1 dependency contracts: no silent reassignment of a face after upstream edits.
const plane=(center,normal=[0,0,1])=>({kind:'face',type:'PLANE',center,normal,measure:100,loops:1});
const original=plane([.5,.5,0]),reordered=[plane([.9,.5,0]),plane([.5,.5,0])];
assert.equal(resolveReference(original,reordered,0),1,'Face reference must survive index reordering');
assert.throws(()=>resolveReference(original,[plane([.5,.5,0]),plane([.5,.5,0])],0),/ambiguous/,'Identical candidate faces must not be chosen arbitrarily');
assert.throws(()=>resolveReference(original,[plane([.5,.5,0],[0,0,-1])],0),/ambiguous/,'Opposite-facing geometry must not be matched');
assert.throws(()=>resolveReference(original,[],0),/ambiguous/,'Missing geometry must not silently bind');
assert.equal(descriptorDistance(original,{...original,kind:'edge'}),Infinity,'Cross-domain reference must be rejected');
for(const malformed of [{...original,center:null},{...original,center:[0,0,NaN]},{...original,normal:[0,1]}]){
 assert.equal(descriptorDistance(original,malformed),Infinity,'Malformed imported topology must not match');
 assert.throws(()=>resolveReference(original,[malformed],0),/ambiguous/,'Malformed candidate must fail safely');
}
assert.throws(()=>resolveReference({...original,center:null},[original],0),/ambiguous/,'Malformed saved reference must fail safely');
assert.equal(toolSelectionError('union',[ref('b','body'),ref('b','body')],items,doc)!=='',true,'Boolean requires two unique bodies');
assert.equal(toolSelectionError('union',[ref('b','body'),ref('c','body')],items,doc),'','Boolean accepts two distinct bodies');
for(const type of ['union','subtract','intersect','move','rotate','scale','pattern','align','mirror','duplicate','circularPattern']){
 const refs=type==='mirror'||type==='duplicate'||type==='circularPattern'?[ref('b','face',0)]:[ref('b','face',0),ref('c','body')];
 assert.ok(toolSelectionError(type,refs,items,doc),type+' must reject face refs for whole-body operation');
}
assert.equal(toolSelectionError('move',[ref('b','body')],items,doc),'','Move still accepts body refs');
assert.ok(toolSelectionError('delete',[ref('missing','body')],items,doc),'Delete must reject a stale reference');
assert.equal(toolSelectionError('delete',[ref('b','body')],items,doc),'','Delete accepts an existing body');
console.log('DEPENDENCY CONTRACT PASS: topology reorder/ambiguity/missing/opposite normals and unique-body Boolean selection');

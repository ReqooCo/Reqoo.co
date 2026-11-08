import assert from 'node:assert/strict';
import {toolSelectionError} from '../src/tool-workflow.js';

const face=(index,type='PLANE')=>({index,type});
const items=[
 {id:'moving',kind:'body',faceInfo:[face(0),{...face(1,'CYLINDER'),cylinder:{axis:[0,0,1]}}],edges:[{index:0},{index:2}]},
 {id:'fixed',kind:'body',faceInfo:[face(2)]},
 {id:'curve',kind:'sketch',profileClosed:true}
];
const check=(name,refs,expected)=>assert.equal(toolSelectionError('align',refs,items),expected,name);
check('preselected planar face starts face alignment',[{id:'moving',kind:'face',index:0}],'');
check('preselected cylindrical face starts concentric alignment',[{id:'moving',kind:'face',index:1}],'');
assert.notEqual(toolSelectionError('align',[{id:'moving',kind:'face',index:3}],[{id:'moving',kind:'body',faceInfo:[{index:3,type:'BSPLINE'}]},{id:'fixed',kind:'body',faceInfo:[face(2)]}]),'','unsupported freeform face must not enter alignment');
check('one solid body starts parts alignment',[{id:'moving',kind:'body'}],'');
check('two solid bodies start parts alignment',[{id:'moving',kind:'body'},{id:'fixed',kind:'body'}],'');
check('two selected faces from distinct bodies',[{id:'moving',kind:'face',index:0},{id:'fixed',kind:'face',index:2}],'');
for(const refs of [
 [],
 [{id:'curve',kind:'sketch'}],
 [{id:'moving',kind:'face',index:99}],
 [{id:'moving',kind:'edge',index:0}],
 [{id:'moving',kind:'body'},{id:'fixed',kind:'body'},{id:'curve',kind:'sketch'}]
])assert.notEqual(toolSelectionError('align',refs,items),'','invalid alignment selection rejected');
assert.equal(toolSelectionError('extrude',[{id:'moving',kind:'face',index:0}],items),'','planar extrude remains allowed');
assert.notEqual(toolSelectionError('extrude',[{id:'moving',kind:'face',index:1}],items),'','cylindrical extrude remains rejected');
for(const tool of ['fillet','chamfer']){
 assert.equal(toolSelectionError(tool,[{id:'moving',kind:'edge',index:0}],items),'',tool+' accepts valid edge');
 assert.equal(toolSelectionError(tool,[{id:'moving',kind:'edge',index:0},{id:'moving',kind:'edge',index:2}],items),'',tool+' accepts multiple valid edges');
 assert.notEqual(toolSelectionError(tool,[{id:'moving',kind:'edge',index:99}],items),'',tool+' rejects nonexistent edge');
 assert.notEqual(toolSelectionError(tool,[{id:'moving',kind:'face',index:0}],items),'',tool+' rejects face pretending to be edge');
}
const sketches=[
 {id:'s1',kind:'sketch',profileClosed:true,sketchPlane:{normal:[0,0,1]}},
 {id:'s2',kind:'sketch',profileClosed:true,sketchPlane:{normal:[0,0,10]}}
];
const refs=[{id:'s1',kind:'sketch'},{id:'s2',kind:'sketch'}];
assert.equal(toolSelectionError('extrude',refs,sketches),'','scaled parallel sketch normals are accepted');
assert.notEqual(toolSelectionError('extrude',refs,[sketches[0],{...sketches[1],sketchPlane:{normal:[0,1,0]}}]),'','nonparallel sketches rejected');
assert.notEqual(toolSelectionError('extrude',refs,[sketches[0],{...sketches[1],sketchPlane:null}]),'','missing second sketch plane rejected without crash');
assert.notEqual(toolSelectionError('extrude',refs,[{...sketches[0],sketchPlane:{normal:[0,0,0]}},sketches[1]]),'','degenerate sketch normal rejected');
assert.notEqual(toolSelectionError('extrude',refs,[sketches[0],{...sketches[1],sketchPlane:{normal:[0,0,NaN]}}]),'','nonfinite sketch normal rejected');
console.log('TOOL WORKFLOW OFFLINE PASS 26');

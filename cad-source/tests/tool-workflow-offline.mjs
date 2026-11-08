import assert from 'node:assert/strict';
import {toolSelectionError} from '../src/tool-workflow.js';

const face=(index,type='PLANE')=>({index,type});
const items=[
 {id:'moving',kind:'body',faceInfo:[face(0),face(1,'CYLINDER')]},
 {id:'fixed',kind:'body',faceInfo:[face(2)]},
 {id:'curve',kind:'sketch',profileClosed:true}
];
const check=(name,refs,expected)=>assert.equal(toolSelectionError('align',refs,items),expected,name);
check('preselected planar face starts face alignment',[{id:'moving',kind:'face',index:0}],'');
check('preselected cylindrical face starts concentric alignment',[{id:'moving',kind:'face',index:1}],'');
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
console.log('TOOL WORKFLOW OFFLINE PASS 12');

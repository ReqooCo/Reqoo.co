import assert from 'node:assert/strict';
import {resolveReference,descriptorDistance} from '../src/topology.js';

const face=(type='CYLINDER',center=[.5,.5,.5],measure=1,normal=[1,0,0],loops='CIRCLE|CIRCLE')=>({
 kind:'face',type,center,measure,normal,loops
});
const ref=face();
const grown=face('CYLINDER',[.515,.5,.5],4);
assert.ok(descriptorDistance(ref,grown)>.18,'Fixture must exceed the ordinary matching tolerance');
assert.equal(resolveReference(ref,[grown],0),0,'Unique matching analytic face survives a large dimension change');
assert.equal(resolveReference(ref,[face('PLANE'),grown],1),1,'Unique analytic face can be found after index reordering');
assert.throws(()=>resolveReference(ref,[grown,face('CYLINDER',[.51,.5,.5],3)],0),/ambiguous/,'Two competing faces must never be guessed');
assert.throws(()=>resolveReference(ref,[face('CYLINDER',[.8,.5,.5],4)],0),/ambiguous/,'A distant face must not be silently substituted');
assert.throws(()=>resolveReference(ref,[grown,face('CYLINDER',[.9,.5,.5],4)],0),/ambiguous/,'A second similarly oriented analytic face blocks silent recovery even when farther away');
assert.throws(()=>resolveReference(ref,[face('CYLINDER',[.515,.5,.5],4,[1,0,0],'CIRCLE')],0),/ambiguous/,'Changed wire topology is not a safe match');
assert.throws(()=>resolveReference(ref,[face('CYLINDER',[.515,.5,.5],4,[-1,0,0])],0),/ambiguous/,'Reversed normal is not a safe match');
assert.throws(()=>resolveReference(face('PLANE'),[face('PLANE',[.515,.5,.5],4)],0),/ambiguous/,'Never use analytic fallback for planar faces');
assert.equal(resolveReference(ref,[face('PLANE'),face('CYLINDER',[.5,.5,.5],1.05)],0),1,'Normal unique geometric reference matching remains unchanged');
assert.equal(resolveReference(null,[face('PLANE')],0),0,'Legacy index references remain supported');
assert.throws(()=>resolveReference(null,[face('PLANE')],5),/no longer exists/);
console.log('TOPOLOGY REFERENCE PASS: unique analytic recovery, ambiguous/reversed/missing reference rejection and legacy index');

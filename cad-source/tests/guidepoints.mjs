import assert from 'node:assert/strict';
import {sketchGuidepoints,nearestGuidepoint} from '../src/guidepoints.js';
const plane={origin:[0,0,0],x:[1,0,0],normal:[0,0,1]};
const line=(a,b)=>({type:'LINE',lines:[...a,...b],center:[999,999,999]});
const item=(id,edges)=>({id,name:id,edges});
const centre=item('circle',[{type:'CIRCLE',center:[10,0,0]}]);
const midpoint=item('midpoint',[line([5,0,0],[15,0,0])]);
const endpoint=item('endpoint',[line([10,0,0],[10,5,0])]);
for(const items of [[centre,midpoint,endpoint],[endpoint,centre,midpoint],[midpoint,endpoint,centre]]){
 const points=sketchGuidepoints(items,plane);
 assert.equal(nearestGuidepoint([10,0],points,.1)?.kind,'endpoint');
 assert.equal(points.filter(p=>p.point[0]===10&&p.point[1]===0).length,1);
}
const crossings=[item('horizontal',[line([5,0,0],[15,0,0])]),item('vertical',[line([12,-5,0],[12,5,0])])];
assert.equal(nearestGuidepoint([12,0],sketchGuidepoints(crossings,plane),.1)?.kind,'intersection');
assert.equal(nearestGuidepoint([10,0],sketchGuidepoints([midpoint],plane),.1)?.kind,'midpoint');
assert.equal(nearestGuidepoint([10,0],sketchGuidepoints([centre],plane),.1)?.kind,'centre');
assert.equal(nearestGuidepoint([0,0],sketchGuidepoints([item('origin',[line([0,0,0],[5,0,0])])],plane),.1)?.kind,'origin');
assert.equal(nearestGuidepoint([10,0],sketchGuidepoints([centre],plane,{hidden:['circle']}),.1),null);
assert.equal(nearestGuidepoint([10,0],sketchGuidepoints([item('above',[line([5,0,3],[15,0,3])])],plane),.1),null);
console.log('PASS sketch centre/midpoint/intersection, stable coincident priority, hidden and off-plane geometry');

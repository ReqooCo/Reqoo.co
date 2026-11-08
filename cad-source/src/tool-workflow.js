// A double-tap promotes a face without losing bodies selected before its first tap.
export function promoteBodySelection(before,id){
 // Preserve earlier whole-body selections and their order for Boolean tools.
 // Repeated double-taps remain idempotent; promoting another face adds its
 // owning body without discarding existing Boolean operands.
 const bodies=before.filter(r=>r.kind==='body');
 return bodies.some(r=>r.id===id)?bodies:[...bodies,{id,kind:'body'}];
}
// Common entry contracts; native geometry validation still owns commit validity.
export function extendCanvasSelection(current,next,{explicit=false,filter='auto'}={}){
 if(explicit)return true;if(!current.length||!next)return false;
 if(!current.every(r=>r.kind===next.kind))return false;
 // Multi-face selection must work for fillet/chamfer and face-based tools.
 // Keep cross-body face selection opt-in via the explicit face filter.
 if(next.kind==='face')return filter==='face'||current.every(r=>r.id===next.id);
 if(next.kind==='edge')return current.every(r=>r.id===next.id);
 return ['sketch','body'].includes(next.kind);
}
export const TOOL_WORKFLOWS={
 sketch:'create',rectangle:'create',circle:'create',ellipse:'create',polygon:'create',polyline:'create',arc:'create',spline:'create',text:'create',box:'create',cylinder:'create',sphere:'create',torus:'create',plane:'create',axis:'create',import:'create',
 extrude:'extrude',revolve:'closedProfile',loft:'loft',sweep:'sweep',
 move:'bodies',rotate:'bodies',scale:'bodies',mirror:'body',pattern:'bodies',circularPattern:'body',duplicate:'body',align:'align',
 union:'boolean',subtract:'boolean',intersect:'boolean',split:'body',fillet:'edges',chamfer:'edges',
 shell:'face',offsetFace:'face',draft:'face',faceSketch:'planarFace',hole:'hole',thread:'cylinderFace',
 sketchOffset:'curves',sketchFillet:'curves',sketchChamfer:'curves',sketchMirror:'curves',sketchPattern:'curves',sketchTransform:'curves',sketchProject:'projection',sketchProfile:'profiles',sketchTrim:'curves',delete:'selected',imprint:'projection'
};
export function toolSelectionError(type,refs,items,doc={features:[]}){
 const rule=TOOL_WORKFLOWS[type];if(!rule||rule==='create')return'';
 const chosen=refs.map(r=>items.find(i=>i.id===r.id)),unique=[...new Set(refs.map(r=>r.id))],all=kind=>refs.length&&chosen.every((i,n)=>i?.kind===kind&&(kind!=='sketch'||refs[n].kind==='sketch'));
 const closed=()=>all('sketch')&&chosen.every(i=>i.profileClosed&&!i.construction),face=refs.length===1&&refs[0].kind==='face'&&chosen[0]?.kind==='body'?chosen[0].faceInfo?.find(f=>f.index===refs[0].index):null;
 if(rule==='selected')return refs.length?'':'Select an object first';
 if(rule==='extrude'){if(face?.type==='PLANE')return'';if(!closed())return'Select closed sketch profiles together, or one planar solid face';const n=chosen[0].sketchPlane?.normal;if(n&&chosen.some(i=>i.sketchPlane?.normal.reduce((v,k,j)=>v+k*n[j],0)<.99999))return'Choose parallel sketch profiles with matching directions';return'';}
 if(rule==='closedProfile')return closed()&&refs.length===1?'':'Select one closed sketch profile';
 if(rule==='loft')return closed()&&refs.length>=2?'':'Select at least two closed sketch profiles';
 if(rule==='sweep')return all('sketch')&&refs.length===2&&chosen[0].profileClosed&&!chosen[0].construction?'':'Select a closed profile first, then a sketch path';
 if(rule==='boolean')return all('body')&&refs.every(r=>r.kind==='body')&&unique.length>=2?'':'Select at least two solid bodies';
 if(['bodies','align','body'].includes(rule))return all('body')&&refs.every(r=>r.kind==='body')&&(rule!=='body'||unique.length===1)&&(rule!=='align'||unique.length<=2)?'':'Select '+(rule==='body'?'one solid body':rule==='align'?'one moving body and one target':'solid bodies');
 if(rule==='edges')return all('body')&&unique.length===1&&(refs.every(r=>r.kind==='edge')||refs.length===1&&refs[0].kind==='body')?'':'Select edges from one body, or one whole body';
 if(rule==='face')return face?'':'Select one solid face';
 if(rule==='planarFace')return face?.type==='PLANE'?'':'Select one planar solid face';
 if(rule==='cylinderFace')return face?.cylinder?.full?'':'Select one complete cylindrical side face';
 if(rule==='hole'){const recipe=doc.features.find(f=>f.id===chosen[0]?.featureId)?.params;return face?.type==='PLANE'||refs.length===1&&all('sketch')&&recipe?.shape==='circle'?'':'Select one planar face or circle sketch';}
 if(rule==='curves'||rule==='profiles')return all('sketch')&&(rule!=='profiles'||closed()&&refs.length>=2)?'':'Select '+(rule==='profiles'?'at least two closed profiles':'sketch curves');
 if(rule==='projection')return refs.length&&chosen.every(i=>i&&['body','sketch'].includes(i.kind))?'':'Select source geometry';
 return'';
}

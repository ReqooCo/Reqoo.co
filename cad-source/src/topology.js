// Validated geometric references survive index reordering on supported analytic shapes.
export function descriptorDistance(a,b){
 if(!a||!b||a.kind!==b.kind||a.type!==b.type)return Infinity;
 if(a.loops!==undefined&&b.loops!==undefined&&a.loops!==b.loops)return Infinity;
 let score=Math.hypot(...a.center.map((v,i)=>v-b.center[i]));
 if(a.normal&&b.normal){const dot=a.normal.reduce((s,v,i)=>s+v*b.normal[i],0);if(dot<.95)return Infinity;score+=(1-dot)*2;}
 if(['CIRCLE','ELLIPSE'].includes(a.type)){if(a.span&&b.span)score+=Math.hypot(...a.span.map((v,i)=>v-b.span[i]))*.5;else if(Number.isFinite(a.measure)&&Number.isFinite(b.measure))score+=Math.abs(a.measure-b.measure)*.03;}
 else if(Number.isFinite(a.measure)&&Number.isFinite(b.measure))score+=Math.abs(a.measure-b.measure)*(a.kind==='face'?.1:1);
 return score;
}
// A unique cylindrical/conical/toroidal face can survive large changes in
// normalized surface area while retaining its geometric role. This conservative
// fallback NEVER chooses between multiple similar faces: ambiguous references
// remain explicit errors rather than silently binding to the wrong topology.
function uniqueAnalyticFace(reference,candidates){
 if(reference?.kind!=='face'||!['CYLINDER','CONE','TORUS'].includes(reference.type))return -1;
 if(!Array.isArray(reference.center)||reference.center.length!==3||
    !Array.isArray(reference.normal)||reference.normal.length!==3)return -1;
 const matches=[];
 for(let index=0;index<candidates.length;index++){
  const c=candidates[index];
  if(!c||c.kind!=='face'||c.type!==reference.type||c.loops!==reference.loops||
     !Array.isArray(c.center)||c.center.length!==3||
     !Array.isArray(c.normal)||c.normal.length!==3)continue;
  const distance=Math.hypot(...reference.center.map((v,i)=>v-c.center[i]));
  const dot=reference.normal.reduce((sum,v,i)=>sum+v*c.normal[i],0);
  if(Number.isFinite(distance)&&distance<.075&&dot>=.99)matches.push(index);
 }
 return matches.length===1?matches[0]:-1;
}
export function resolveReference(reference,candidates,legacyIndex){
 if(!reference){if(!Number.isInteger(legacyIndex)||!candidates[legacyIndex])throw Error('Selected geometry no longer exists');return legacyIndex;}
 const ranked=candidates.map((c,index)=>({index,score:descriptorDistance(reference,c)})).sort((a,b)=>a.score-b.score);
 if(ranked.length&&ranked[0].score<=.18&&(!ranked[1]||ranked[1].score-ranked[0].score>=.02))return ranked[0].index;
 const analytic=uniqueAnalyticFace(reference,candidates);
 if(analytic>=0)return analytic;
 throw Error('Geometry reference became ambiguous after an upstream edit. Reselect the face or edge.');
}
export function normalizedCenter(bounds,center){return center.map((v,i)=>(v-bounds[0][i])/Math.max(1e-7,bounds[1][i]-bounds[0][i]));}

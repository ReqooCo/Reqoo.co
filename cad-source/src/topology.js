// Validated geometric references survive index reordering on supported analytic shapes.
export function descriptorDistance(a,b){
 if(!a||!b||a.kind!==b.kind||a.type!==b.type)return Infinity;
 let score=Math.hypot(...a.center.map((v,i)=>v-b.center[i]));
 if(a.normal&&b.normal){const dot=a.normal.reduce((s,v,i)=>s+v*b.normal[i],0);if(dot<.95)return Infinity;score+=(1-dot)*2;}
 if(['CIRCLE','ELLIPSE'].includes(a.type)){if(a.span&&b.span)score+=Math.hypot(...a.span.map((v,i)=>v-b.span[i]))*.5;else if(Number.isFinite(a.measure)&&Number.isFinite(b.measure))score+=Math.abs(a.measure-b.measure)*.03;}
 else if(Number.isFinite(a.measure)&&Number.isFinite(b.measure))score+=Math.abs(a.measure-b.measure);
 return score;
}
export function resolveReference(reference,candidates,legacyIndex){
 if(!reference){if(!Number.isInteger(legacyIndex)||!candidates[legacyIndex])throw Error('Selected geometry no longer exists');return legacyIndex;}
 const ranked=candidates.map((c,index)=>({index,score:descriptorDistance(reference,c)})).sort((a,b)=>a.score-b.score);
 if(!ranked.length||ranked[0].score>.18||ranked[1]&&ranked[1].score-ranked[0].score<.02)throw Error('Geometry reference became ambiguous after an upstream edit. Reselect the face or edge.');
 return ranked[0].index;
}
export function normalizedCenter(bounds,center){return center.map((v,i)=>(v-bounds[0][i])/Math.max(1e-7,bounds[1][i]-bounds[0][i]));}

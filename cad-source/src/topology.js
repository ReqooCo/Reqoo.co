// Validated geometric references survive index reordering on supported analytic shapes.
export function descriptorDistance(a,b){
 if(!a||!b||a.kind!==b.kind||a.type!==b.type)return Infinity;
 if(a.loops!==undefined&&b.loops!==undefined&&a.loops!==b.loops)return Infinity;
 // Imported/legacy references can be incomplete. Reject them safely rather
 // than throwing during history regeneration or choosing an unrelated face.
 if(!Array.isArray(a.center)||!Array.isArray(b.center)||a.center.length!==3||b.center.length!==3||![...a.center,...b.center].every(Number.isFinite))return Infinity;
 if((a.normal&&!Array.isArray(a.normal))||(b.normal&&!Array.isArray(b.normal)))return Infinity;
 if((a.normal&&(!a.normal.every(Number.isFinite)||a.normal.length!==3))||(b.normal&&(!b.normal.every(Number.isFinite)||b.normal.length!==3)))return Infinity;
 if((a.span&&(!Array.isArray(a.span)||a.span.length!==3||!a.span.every(Number.isFinite)))||(b.span&&(!Array.isArray(b.span)||b.span.length!==3||!b.span.every(Number.isFinite))))return Infinity;
 if(a.normal&&b.normal&&(a.normal.length!==3||b.normal.length!==3||![...a.normal,...b.normal].every(Number.isFinite)))return Infinity;
 let score=Math.hypot(...a.center.map((v,i)=>v-b.center[i]));
 if(a.normal&&b.normal){const dot=a.normal.reduce((s,v,i)=>s+v*b.normal[i],0);if(!Number.isFinite(dot)||dot<.95)return Infinity;score+=(1-dot)*2;}
 if(['CIRCLE','ELLIPSE'].includes(a.type)){if(a.span&&b.span)score+=Math.hypot(...a.span.map((v,i)=>v-b.span[i]))*.5;else if(Number.isFinite(a.measure)&&Number.isFinite(b.measure))score+=Math.abs(a.measure-b.measure)*.03;}
 else if(Number.isFinite(a.measure)&&Number.isFinite(b.measure))score+=Math.abs(a.measure-b.measure)*(a.kind==='face'?.1:1);
 return Number.isFinite(score)?score:Infinity;
}
export function resolveReference(reference,candidates,legacyIndex){
 if(!reference){if(!Number.isInteger(legacyIndex)||!candidates[legacyIndex])throw Error('Selected geometry no longer exists');return legacyIndex;}
 if(!Array.isArray(candidates))throw Error('Invalid geometry candidates');
 const ranked=candidates.map((c,index)=>({index,score:descriptorDistance(reference,c)})).filter(c=>Number.isFinite(c.score)).sort((a,b)=>a.score-b.score);
 if(!ranked.length||ranked[0].score>.18||ranked[1]&&ranked[1].score-ranked[0].score<.02)throw Error('Geometry reference became ambiguous after an upstream edit. Reselect the face or edge.');
 return ranked[0].index;
}
export function normalizedCenter(bounds,center){return center.map((v,i)=>(v-bounds[0][i])/Math.max(1e-7,bounds[1][i]-bounds[0][i]));}

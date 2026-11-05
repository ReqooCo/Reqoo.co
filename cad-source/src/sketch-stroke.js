// Draft edits stay outside the native model until a stroke is committed.
export function appendStrokePoint(points,point,tolerance){
 if(!Array.isArray(point)||point.length!==2||!point.every(Number.isFinite)||!Number.isFinite(tolerance)||tolerance<0)throw Error('Invalid sketch point');
 const near=q=>Math.hypot(q[0]-point[0],q[1]-point[1])<=Math.max(1e-8,tolerance);
 if(points.length&&near(points[0]))return{points,close:points.length>=3,changed:false};
 if(points.length&&near(points.at(-1)))return{points,close:false,changed:false};
 if(points.length>=100)throw Error('A sketch path supports up to 100 points. Start a new path.');
 return{points:[...points,[...point]],close:false,changed:true};
}

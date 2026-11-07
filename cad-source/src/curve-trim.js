import * as R from 'replicad';
const EPS=1e-6,near=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1])<EPS;
export function drawingCurves(drawing){
 const visit=node=>node.type==='Blueprint'?R.deserializeDrawing(JSON.stringify(node)).blueprint.curves:node.type==='Blueprints'?node.blueprints.flatMap(visit):node.type==='CompoundBlueprint'?node.blueprints.flatMap(visit):[];
 return visit(JSON.parse(drawing.serialize()));
}
function paramsAt(curve,point){
 const oc=R.getOC(),p=new oc.gp_Pnt2d(...point),projector=new oc.Geom2dAPI_ProjectPointOnCurve(p,curve.wrapped),out=[];
 try{for(let i=1;i<=projector.NbPoints();i++)if(projector.Distance(i)<EPS*5){const t=projector.Parameter(i);if(t>=curve.firstParameter-EPS&&t<=curve.lastParameter+EPS&&!out.some(v=>Math.abs(v-t)<EPS))out.push(t);}}finally{projector.delete();p.delete();}
 return out;
}
// Adjacent conic arcs can produce an OC tangency segment with zero length.
// Segment() cannot construct that curve. Resolve equal analytic supports in
// their finite parameter domains before invoking the general intersector.
function sameConic(a,b){
 const kind=a.geomType;if(!['CIRCLE','ELLIPSE'].includes(kind)||kind!==b.geomType)return false;
 const owned=[],keep=v=>(owned.push(v),v);
 try{
  const aa=keep(a.adaptor()),bb=keep(b.adaptor()),ca=keep(kind==='CIRCLE'?aa.Circle():aa.Ellipse()),cb=keep(kind==='CIRCLE'?bb.Circle():bb.Ellipse()),pa=keep(ca.Location()),pb=keep(cb.Location());
  if(Math.hypot(pa.X()-pb.X(),pa.Y()-pb.Y())>EPS)return false;
  if(kind==='CIRCLE')return Math.abs(ca.Radius()-cb.Radius())<EPS;
  if(Math.abs(ca.MajorRadius()-cb.MajorRadius())>EPS||Math.abs(ca.MinorRadius()-cb.MinorRadius())>EPS)return false;
  if(Math.abs(ca.MajorRadius()-ca.MinorRadius())<EPS)return true;
  const xa=keep(ca.XAxis()),xb=keep(cb.XAxis()),da=keep(xa.Direction()),db=keep(xb.Direction());
  return Math.abs(da.X()*db.Y()-da.Y()*db.X())<1e-10;
 }finally{for(const v of owned.reverse())v.delete();}
}
function conicContacts(a,b,point,tolerance){
 const first=a.firstParameter,last=a.lastParameter,parameters=[first,last,...paramsAt(a,b.firstPoint),...paramsAt(a,b.lastPoint)].sort((x,y)=>x-y).filter((t,i,ts)=>!i||Math.abs(t-ts[i-1])>1e-10),points=[];
 for(const t of parameters){const p=a.value(t);if(paramsAt(b,p).length)points.push(p);}
 for(let i=1;i<parameters.length;i++){
  const lo=parameters[i-1],hi=parameters[i];if(!paramsAt(b,a.value((lo+hi)/2)).length)continue;
  const c=new R.Curve2D(new (R.getOC()).Geom2d_TrimmedCurve(a.wrapped,lo,hi,true,true));
  try{if((!near(c.firstPoint,c.lastPoint)||!near(c.firstPoint,c.value((lo+hi)/2)))&&c.distanceFrom(point)<=tolerance)throw Error('Coincident sketch boundaries overlap; isolate the intended curve');points.push(c.firstPoint,c.lastPoint);}finally{c.delete();}
 }
 return points;
}
export function trimDrawing(source,boundaries,point,tolerance=.1){
 if(!Array.isArray(point)||point.length!==2||!point.every(Number.isFinite)||!(tolerance>0))throw Error('Invalid Trim point');
 const curves=drawingCurves(source),others=boundaries.flatMap(drawingCurves),owned=new Set([...curves,...others]),cuts=curves.map(()=>[]),stops=[];
 const intersection=(a,b,self=false)=>{if(!self&&a.boundingBox.isOut(b.boundingBox))return[];if(!self&&sameConic(a,b))return conicContacts(a,b,point,tolerance);const inter=new (R.getOC()).Geom2dAPI_InterCurveCurve();try{if(self)inter.Init(a.wrapped,1e-8);else inter.Init(a.wrapped,b.wrapped,1e-8);const points=[];if(!self)for(let k=1;k<=inter.NbSegments();k++){const segment=inter.Segment(k),c=new R.Curve2D(segment.Curve1);try{if(!near(c.firstPoint,c.lastPoint)){if(c.distanceFrom(point)<=tolerance)throw Error('Coincident sketch boundaries overlap; isolate the intended curve');points.push(c.firstPoint,c.lastPoint);}else points.push(c.firstPoint);}finally{c.delete();segment.Curve2.delete();}}for(let i=1;i<=inter.NbPoints();i++){const p=inter.Point(i);points.push([p.X(),p.Y()]);p.delete();}return points;}finally{inter.delete();}};
 let phase='curve intersections';
 try{
  // Native vertices bound a segment. Only the artificial seam in a complete
  // analytic circle/ellipse may be crossed while finding the clicked interval.
  for(const c of curves)for(const p of [c.firstPoint,c.lastPoint]){
   const periodicSeam=near(c.firstPoint,c.lastPoint);
   const analyticSeam=['CIRCLE','ELLIPSE'].includes(c.geomType)&&curves.some(d=>d!==c&&d.geomType===c.geomType&&near(c.firstPoint,d.lastPoint)&&near(c.lastPoint,d.firstPoint));
   if(!periodicSeam&&!analyticSeam)stops.push(p);
  }
  for(let i=0;i<curves.length;i++){
   const a=curves[i];
   for(const b of others)for(const p of intersection(a,b)){cuts[i].push(...paramsAt(a,p));stops.push(p);}
   if(['BSPLINE_CURVE','BEZIER_CURVE','OFFSET_CURVE'].includes(a.geomType))for(const p of intersection(a,a,true)){const ts=paramsAt(a,p);if(ts.length>1){cuts[i].push(...ts);stops.push(p);}}
   for(let j=i+1;j<curves.length;j++){const b=curves[j];if(['CIRCLE','ELLIPSE'].includes(a.geomType)&&a.geomType===b.geomType&&near(a.firstPoint,b.lastPoint)&&near(a.lastPoint,b.firstPoint))continue;for(const p of intersection(a,b)){
    const b=curves[j],joint=[a.firstPoint,a.lastPoint].some(q=>near(p,q))&&[b.firstPoint,b.lastPoint].some(q=>near(p,q));
    if(!joint){cuts[i].push(...paramsAt(a,p));cuts[j].push(...paramsAt(b,p));stops.push(p);}
   }}
  }
  phase='curve split';
  const fragments=curves.flatMap((c,i)=>{const start=c.firstParameter,end=c.lastParameter,parameters=[start,...cuts[i].filter(t=>t>start+1e-8&&t<end-1e-8).sort((a,b)=>a-b),end].filter((t,j,a)=>!j||Math.abs(t-a[j-1])>1e-8);return parameters.slice(1).map((t,j)=>new R.Curve2D(new (R.getOC()).Geom2d_TrimmedCurve(c.wrapped,parameters[j],t,true,true)));}).filter(c=>{owned.add(c);return Math.abs(c.lastParameter-c.firstParameter)>1e-9;});
  phase='point projection';
  const distances=fragments.map(c=>c.distanceFrom(point)),best=Math.min(...distances),seed=distances.indexOf(best);if(seed<0||best>tolerance)throw Error('Tap directly on the curve to trim');
  if(stops.some(p=>Math.hypot(p[0]-point[0],p[1]-point[1])<Math.max(EPS,tolerance*.1))&&distances.some((d,i)=>i!==seed&&Math.abs(d-best)<Math.max(EPS,tolerance*.01)))throw Error('Multiple curve segments meet here; tap away from the intersection');
  const removed=new Set([seed]),queue=[seed],stop=p=>stops.some(q=>near(p,q));
  while(queue.length){const i=queue.pop();for(const p of [fragments[i].firstPoint,fragments[i].lastPoint])if(!stop(p))for(let j=0;j<fragments.length;j++)if(!removed.has(j)&&[fragments[j].firstPoint,fragments[j].lastPoint].some(q=>near(p,q))){removed.add(j);queue.push(j);}}
  phase='remaining curve assembly';
  const remaining=fragments.filter((_,i)=>!removed.has(i)),groups=[];
  while(remaining.length){const group=[remaining.shift()];let changed=true;while(changed){changed=false;for(let i=remaining.length-1;i>=0;i--){const c=remaining[i];if(near(group.at(-1).lastPoint,c.firstPoint)){group.push(c);remaining.splice(i,1);changed=true;}else if(near(c.lastPoint,group[0].firstPoint)){group.unshift(c);remaining.splice(i,1);changed=true;}}}groups.push(group);}
  return groups.map(group=>{const bp=new R.Blueprint(group.map(c=>c.clone()));try{return{shape:'profile',closed:bp.isClosed(),serializedDrawing:new R.Drawing(bp).serialize(),x:0,y:0,operations:[],constraints:[]};}finally{bp.delete();}});
 }catch(e){if(e instanceof Error)throw e;throw Error('Native Trim failed during '+phase);}finally{for(const c of owned)c.delete();}
}
// Convert native planar edges into local 2D curves without polygonizing them.
// Uses the same OpenCascade adaptor contract as Replicad's planar projection.
export function nativePlanarDrawing(shape,frame){
 const oc=R.getOC(),tr=new R.Transformation().coordSystemChange('reference',{origin:frame.origin,xDir:frame.x,zDir:frame.normal}),flat=R.cast(tr.transform(shape.wrapped)),edges=flat.edges,faces=flat.faces,curves=[];let referenceSketch,referenceFace;
 try{
  const face=faces[0]||((referenceSketch=R.drawRectangle(1,1).sketchOnPlane('XY')),(referenceFace=referenceSketch.face()));
  if(face.geomType!=='PLANE')throw Error('Trim needs planar sketch curves');
  for(const edge of edges){const ad=new oc.BRepAdaptor_Curve2d(edge.wrapped,face.wrapped);try{const c=new R.Curve2D(new oc.Geom2d_TrimmedCurve(ad.Curve(),ad.FirstParameter(),ad.LastParameter(),true,true));if(edge.orientation==='backward')c.reverse();curves.push(c);}finally{ad.delete();}}
  const uv=face.uvCoordinates([0,0,0]),x=face.uvCoordinates([1,0,0]),y=face.uvCoordinates([0,1,0]),dx=[x[0]-uv[0],x[1]-uv[1]],dy=[y[0]-uv[0],y[1]-uv[1]],angle=Math.atan2(dx[1],dx[0])*180/Math.PI;
  let drawing=new R.Drawing(new R.Blueprint(curves)).clone().translate([-uv[0],-uv[1]]).rotate(-angle);if(dx[0]*dy[1]-dx[1]*dy[0]<0)drawing=drawing.mirror([1,0],[0,0],'plane');return drawing;
 }finally{curves.forEach(c=>c.delete());edges.forEach(e=>e.delete());faces.forEach(f=>f.delete());referenceFace?.delete();referenceSketch?.delete();flat.delete();tr.delete();}
}
export function exportCurveDrawing(drawing,format){
 const curves=drawingCurves(drawing);
 try{if(format==='svg'){const box=drawing.boundingBox,w=Math.max(.01,box.width),h=Math.max(.01,box.height),paths=curves.flatMap(c=>new R.Drawing(new R.Blueprint([c])).toSVGPaths());return '<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'mm" height="'+h+'mm" viewBox="'+[box.bounds[0][0],-box.bounds[1][1],w,h].join(' ')+'"><g fill="none" stroke="black" stroke-width=".1">'+paths.map(d=>'<path d="'+d+'"/>').join('')+'</g></svg>';}
  if(format!=='dxf')throw Error('Choose SVG or DXF');const entities=[];
  for(const c of curves){if(c.geomType==='LINE'){entities.push('0','LINE','8','Sketch','10',c.firstPoint[0],'20',c.firstPoint[1],'11',c.lastPoint[0],'21',c.lastPoint[1]);continue;}if(c.geomType!=='CIRCLE')throw Error('DXF curve export currently supports lines and circular arcs; use SVG for spline/ellipse curves');const ad=c.adaptor(),circle=ad.Circle(),centre=circle.Location(),x=centre.X(),y=centre.Y(),radius=circle.Radius();try{if(near(c.firstPoint,c.lastPoint))entities.push('0','CIRCLE','8','Sketch','10',x,'20',y,'40',radius);else{let a=c.firstPoint,b=c.lastPoint;const tangent=c.tangentAt(0);if((a[0]-x)*tangent[1]-(a[1]-y)*tangent[0]<0)[a,b]=[b,a];const angle=p=>(Math.atan2(p[1]-y,p[0]-x)*180/Math.PI+360)%360;entities.push('0','ARC','8','Sketch','10',x,'20',y,'40',radius,'50',angle(a),'51',angle(b));}}finally{centre.delete();circle.delete();ad.delete();}}
  return ['0','SECTION','2','HEADER','9','$INSUNITS','70','4','0','ENDSEC','0','SECTION','2','ENTITIES',...entities,'0','ENDSEC','0','EOF',''].join('\n');
 }finally{curves.forEach(c=>c.delete());}
}

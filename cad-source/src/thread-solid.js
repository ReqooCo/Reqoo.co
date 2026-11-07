import * as R from 'replicad';
import {threadDimensions} from './thread-specs.js';
export function cylinderInfo(f){
 if(f.geomType!=='CYLINDRE')return null;
 const resources=[],keep=v=>(resources.push(v),v);
 try{const surface=keep(f.surface),cylinder=keep(surface.wrapped.Cylinder()),axis=keep(cylinder.Axis()),point=keep(axis.Location()),direction=keep(axis.Direction()),center=keep(f.pointOnSurface(.37,.5)),normal=keep(f.normalAt(center)),origin=[point.X(),point.Y(),point.Z()],dir=[direction.X(),direction.Y(),direction.Z()],d=center.toTuple().map((v,i)=>v-origin[i]),along=d.reduce((s,v,i)=>s+v*dir[i],0),radial=d.map((v,i)=>v-along*dir[i]);
  const uv=f.UVBounds;return{origin,axis:dir,radius:cylinder.Radius(),min:uv.vMin,max:uv.vMax,internal:radial.reduce((s,v,i)=>s+v*normal.toTuple()[i],0)<0,full:uv.uMax-uv.uMin>2*Math.PI-1e-4};
 }finally{for(const v of resources.reverse())v.delete();}
}
// Sweep a radial/axial 60° trapezoid around a helix, then cut the actual B-rep.
// The axial clipping keeps partial threads away from neighbouring shoulders/floors.
export function cutThread(body,face,p){
 const c=cylinderInfo(face);if(!c||!c.full)throw Error('Select a complete cylindrical side face for Thread');
 // Work in a canonical cylinder direction: opposite native surface axes otherwise
 // put coincident cylindrical seams through a numerically unstable half-turn.
 const spec=threadDimensions(p,c),reverse=c.axis.find(v=>Math.abs(v)>1e-8)<0,axis=reverse?c.axis.map(v=>-v):c.axis,d={...spec,start:reverse?-spec.start-spec.length:spec.start},temps=[],keep=s=>(temps.push(s),s),eps=Math.max(.03,d.pitch*.03),root=d.minor/2,major=d.diameter/2;
 const volume=shape=>{const m=R.measureShapeVolumeProperties(shape);try{return Math.abs(m.volume);}finally{m.delete();}};
 const valid=(shape,before,span=d.length)=>{const check=new (R.getOC().BRepCheck_Analyzer)(shape.wrapped,true);try{const v=volume(shape);return R.isShape3D(shape)&&check.IsValid()&&v>1e-8&&v<before-Math.max(1e-7,Math.min(before*.001,root*d.depth*span*.02));}finally{check.delete();}};
 function cutSpan(stock,start,length,first=true,last=true){
  const started=performance.now();let phase='profile';
  try{
  const z=start-d.pitch,r=d.internal?root-eps:root,outer=d.internal?major:major+eps,innerWidth=d.internal?.75*d.pitch+2*eps/Math.sqrt(3):d.pitch/4,outerWidth=d.internal?d.pitch/8:.875*d.pitch+2*eps/Math.sqrt(3);
  const plane=keep(new R.Plane([0,0,z],[1,0,0],[0,-1,0]));
  const sk=keep(R.draw([r,-innerWidth/2]).lineTo([outer,-outerWidth/2]).lineTo([outer,outerWidth/2]).lineTo([r,innerWidth/2]).close().sketchOnPlane(plane));
  phase='helix';const helix=keep(R.makeHelix(d.pitch,length+2*d.pitch,r,[0,0,z],[0,0,1],d.left));
  phase='sweep';let cutter=keep(R.genericSweep(sk.wire,helix,{frenet:true,forceProfileSpineOthogonality:false}));cutter=keep(cutter.rotate(17,[0,0,0],'Z'));
  // A 0.0001 mm end-face clearance avoids degenerate helical cap edges;
  // only internal span joins overlap. Interior requested limits remain exact.
  const low=reverse?-c.max:c.min,high=reverse?-c.min:c.max,lead=!first||Math.abs(start-low)<1e-7?-1e-4:0,trail=!last||Math.abs(start+length-high)<1e-7?-1e-4:0;
  phase='clip';const clip=keep(R.makeCylinder(outer+eps,length+lead+trail,[0,0,start-lead]));cutter=keep(cutter.intersect(clip,{simplify:false}));
  const [x,y,zAxis]=axis,angle=Math.acos(Math.max(-1,Math.min(1,zAxis)))*180/Math.PI;
  if(angle>1e-7)cutter=keep(cutter.rotate(angle,[0,0,0],Math.hypot(x,y)<1e-8?[1,0,0]:[-y,x,0]));cutter=keep(cutter.translate(c.origin));
  const prepMs=Math.round(performance.now()-started);phase='boolean';const builder=keep(new (R.getOC().BRepAlgoAPI_Cut)(stock.wrapped,cutter.wrapped));builder.SetFuzzyValue(1e-6);builder.SetNonDestructive(true);builder.Build();const booleanMs=Math.round(performance.now()-started)-prepMs;spanCount++;prepMsTotal+=prepMs;booleanMsTotal+=booleanMs;console.info('[REDS Thread] timings',JSON.stringify({start,length,prepMs,booleanMs}));return keep(R.cast(builder.Shape()));
  }finally{console.info('[REDS Thread] span',JSON.stringify({start,length,phase,elapsedMs:Math.round(performance.now()-started)}));}
 }
 try{
  const totalStarted=performance.now();let spanCount=0,booleanMsTotal=0,prepMsTotal=0;const before=volume(body);let result;
  if(d.length<=8*d.pitch){
   try{result=cutSpan(body,d.start,d.length);if(valid(result,before))return result.clone();}
   catch(error){console.warn('[REDS Thread] Full-span B-rep cut failed; retrying shorter spans:',error instanceof Error?error.message:String(error));}
  }
  // Avoid an expensive full-length helical sweep/Boolean for long threads.
  // Native segment cuts are still validated individually below.
  // Long pipe-shell booleans can return empty or unchanged solids at cylindrical
  // seams. Short, phase-aligned spans retain the same helix and overlap internally.
  // Try four-pitch spans to reduce expensive native Boolean calls; retain the same
  // phase-aligned helix and validate every resulting B-rep before proceeding.
  result=body;const step=4*d.pitch;
  for(let offset=0;offset<d.length-1e-8;offset+=step){const length=Math.min(step,d.length-offset),prior=volume(result),next=cutSpan(result,d.start+offset,length,offset===0,offset+length>=d.length-1e-8);if(!valid(next,prior,length))throw Error('Thread could not create valid helical flanks on this cylinder');result=next;}
  return result.clone();
 }finally{console.info('[REDS Thread] total',JSON.stringify({length:d.length,pitch:d.pitch,spans:spanCount,prepMs:prepMsTotal,booleanMs:booleanMsTotal,totalMs:Math.round(performance.now()-totalStarted)}));for(const s of temps.reverse())try{s.delete();}catch{}}
}

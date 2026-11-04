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
 const d=threadDimensions(p,c),temps=[],keep=s=>(temps.push(s),s),eps=Math.max(.03,d.pitch*.03),root=d.minor/2,major=d.diameter/2,z=d.start-d.pitch;
 try{
  const r=d.internal?root-eps:root,outer=d.internal?major:major+eps,innerWidth=d.internal?.75*d.pitch+2*eps/Math.sqrt(3):d.pitch/4,outerWidth=d.internal?d.pitch/8:.875*d.pitch+2*eps/Math.sqrt(3);
  const plane=keep(new R.Plane([0,0,z],[1,0,0],[0,-1,0]));
  const sk=keep(R.draw([r,-innerWidth/2]).lineTo([outer,-outerWidth/2]).lineTo([outer,outerWidth/2]).lineTo([r,innerWidth/2]).close().sketchOnPlane(plane));
  const helix=keep(R.makeHelix(d.pitch,d.length+2*d.pitch,r,[0,0,z],[0,0,1],d.left));
  let cutter=keep(R.genericSweep(sk.wire,helix,{frenet:true,forceProfileSpineOthogonality:false}));
  cutter=keep(cutter.rotate(17,[0,0,0],'Z'));
  const clip=keep(R.makeCylinder(outer+eps,d.length,[0,0,d.start]));cutter=keep(cutter.intersect(clip));
  const [x,y,zAxis]=c.axis,angle=Math.acos(Math.max(-1,Math.min(1,zAxis)))*180/Math.PI;
  if(angle>1e-7)cutter=keep(cutter.rotate(angle,[0,0,0],Math.hypot(x,y)<1e-8?[1,0,0]:[-y,x,0]));
  cutter=keep(cutter.translate(c.origin));
  return body.cut(cutter);
 }finally{for(const s of temps.reverse())try{s.delete();}catch{}}
}

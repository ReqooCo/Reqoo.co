import {drawingCurves} from './curve-trim.js';
import * as R from 'replicad';
const finite=(n,label,min=-2000,max=2000)=>{n=Number(n);if(!Number.isFinite(n)||n<min||n>max)throw Error(label+' must be between '+min+' and '+max);return n;};
export function drawingInFrame(drawing,from,to){
 const dot=(a,b)=>a.reduce((v,n,i)=>v+n*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],delta=from.origin.map((v,i)=>v-to.origin[i]),y=cross(to.normal,to.x);
 if(Math.abs(dot(from.normal,to.normal))<.999999||Math.abs(dot(delta,to.normal))>1e-5)throw Error('Choose sketch geometry on the active plane');
 if(dot(from.normal,to.normal)<0)drawing=drawing.mirror([1,0],[0,0],'plane');
 return drawing.rotate(Math.atan2(dot(from.x,y),dot(from.x,to.x))*180/Math.PI).translate([dot(delta,to.x),dot(delta,y)]);
}
export function derivedSketchDrawings(type,p,drawing){
 if(type==='sketchMirror'){
  const angle=finite(p.angle??(p.axis==='Y'?90:0),'Mirror angle',-3600,3600)*Math.PI/180,offset=finite(p.offset??0,'Mirror offset'),axis=[Math.cos(angle),Math.sin(angle)],origin=[-axis[1]*offset,axis[0]*offset];
  return[drawing.mirror(axis,origin,'plane')];
 }
 if(type==='sketchTransform')return[drawing.rotate(finite(p.angle??0,'Rotation',-3600,3600),[finite(p.cx??0,'Pivot X'),finite(p.cy??0,'Pivot Y')]).translate([finite(p.x??0,'Move X'),finite(p.y??0,'Move Y')])];
 if(type==='sketchFillet'||type==='sketchChamfer'){
  const radius=finite(p.radius,'Corner size',.001,500),corner=p.corner;
  if(corner!==undefined&&(!Array.isArray(corner)||corner.length!==2||!corner.every(Number.isFinite)))throw Error('Select a valid sketch corner');
  const filter=corner?finder=>finder.atPoint(corner):undefined;
  const changed=type==='sketchFillet'?drawing.fillet(radius,filter):drawing.chamfer(radius,filter);if(corner&&changed.serialize()===drawing.serialize())throw Error('Select a corner where two sketch edges meet');return[changed];
 }
 if(type!=='sketchPattern')throw Error('Unsupported sketch tool');
 if(p.kind==='Circular'){
  const count=finite(p.count??4,'Count',2,25),angle=finite(p.angle??360,'Pattern angle',.1,360),centre=[finite(p.cx??0,'Centre X'),finite(p.cy??0,'Centre Y')];if(!Number.isInteger(count))throw Error('Count must be an integer');
  if(p.definition==='Spacing'&&angle*(count-1)>=360-1e-8)throw Error('Circular spacing must keep copies within one turn');
  return Array.from({length:count},(_,i)=>drawing.rotate(p.definition==='Spacing'?i*angle:i*angle/(Math.abs(angle-360)<1e-8?count:count-1),centre));
 }
 const nx=finite(p.countX??3,'X count',1,25),ny=finite(p.countY??1,'Y count',1,25),dx=finite(p.spacingX??20,'X spacing')/(p.definition==='Total'?Math.max(1,nx-1):1),dy=finite(p.spacingY??20,'Y spacing')/(p.definition==='Total'?Math.max(1,ny-1):1);
 if(!Number.isInteger(nx)||!Number.isInteger(ny)||nx*ny<2||nx*ny>25)throw Error('Use 2–25 total pattern copies');
 if(nx>1&&Math.abs(dx)<1e-7||ny>1&&Math.abs(dy)<1e-7)throw Error('Pattern spacing must be non-zero');
 return Array.from({length:nx*ny},(_,i)=>drawing.translate([i%nx*dx,Math.floor(i/nx)*dy]));
}
function connectedDrawing(drawing){
 const remaining=drawingCurves(drawing),near=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1])<1e-6,bps=[];
 while(remaining.length){
  const degree=p=>remaining.reduce((n,c)=>n+Number(near(c.firstPoint,p))+Number(near(c.lastPoint,p)),0),end=remaining.flatMap(c=>[c.firstPoint,c.lastPoint]).find(p=>degree(p)===1),start=end?remaining.findIndex(c=>near(c.firstPoint,end)||near(c.lastPoint,end)):0;
  const c=remaining.splice(start,1)[0];if(end&&!near(c.firstPoint,end))c.reverse();const group=[c];
  for(;;){const end=group.at(-1).lastPoint,candidates=remaining.map((c,i)=>({c,i})).filter(({c})=>near(c.firstPoint,end)||near(c.lastPoint,end));if(candidates.length!==1)break;const {c,i}=candidates[0];remaining.splice(i,1);if(!near(c.firstPoint,end))c.reverse();group.push(c);}
  bps.push(new R.Blueprint(group));
 }
 return new R.Drawing(bps.every(b=>b.isClosed())?R.organiseBlueprints(bps):new R.Blueprints(bps));
}
export function projectedSketchDrawing(shape,frame){
 const transform=new R.Transformation().coordSystemChange('reference',{origin:frame.origin,xDir:frame.x,zDir:frame.normal}),flat=R.cast(transform.transform(shape.wrapped));
 try{return connectedDrawing(R.drawProjection(flat,'XY').visible);}finally{flat.delete();transform.delete();}
}
export function drawingIsClosed(drawing){
 const node=JSON.parse(drawing.serialize()),closed=n=>n.type==='Blueprint'?(()=>{const bp=R.deserializeDrawing(JSON.stringify(n)).blueprint;try{return bp.isClosed();}finally{bp.delete();}})():n.blueprints?.length>0&&n.blueprints.every(closed);
 return!!closed(node);
}

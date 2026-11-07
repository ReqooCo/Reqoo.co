// Native dimensions and world frames shared by the canvas controls and tests.
const add=(a,b)=>a.map((v,i)=>v+b[i]),mul=(a,k)=>a.map(v=>v*k),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm=a=>{const n=Math.hypot(...a);return n>1e-9?a.map(v=>v/n||0):[0,0,1];},num=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
export const axisVector=axis=>axis==='X'?[1,0,0]:axis==='Y'?[0,1,0]:[0,0,1];
export function parameterGeometry(type,key,p={},context={}){
 const item=context.items?.[0],ref=context.refs?.find(r=>r.kind==='face'),face=item?.faceInfo?.find(f=>f.index===ref?.index),centre=item?.bounds?item.bounds[0].map((v,i)=>(v+item.bounds[1][i])/2):[0,0,0];
 const plane=p.plane||'XY',pn=plane==='XZ'?[0,-1,0]:plane==='YZ'?[1,0,0]:[0,0,1],px=plane==='YZ'?[0,1,0]:[1,0,0];
 const frame=p.basis||item?.sketchPlane||(face?{origin:face.center,x:Math.abs(face.normal[0])<.9?[1,0,0]:[0,1,0],normal:face.normal}:{origin:mul(pn,num(p.offset)),x:px,normal:pn});
 const n=norm(frame.normal),dot=frame.x.reduce((s,v,i)=>s+v*n[i],0),x=norm(frame.x.map((v,i)=>v-dot*n[i])),y=norm(cross(n,x)),world=q=>add(frame.origin,add(mul(x,q[0]),mul(y,q[1])));
 let origin=[...centre],direction=[1,0,0],coefficient=1,kind='linear',unit='mm';
 const k=key.replace(/^p-/,''),point=/^point:(\d+):([xy])$/.exec(k),segment=/^segment:(\d+):length$/.exec(k);
 if(type==='sketch'||type.startsWith('sketch')||type==='faceSketch'){origin=world([num(p.x),num(p.y)]);direction=x;if(k==='y'||k==='height')direction=y;if(k==='offset')direction=n;
  if(point&&p.points?.[Number(point[1])]){origin=world(p.points[Number(point[1])].map((v,i)=>v+num(i?p.y:p.x)));direction=point[2]==='x'?x:y;}
  else if(segment&&p.points?.length){const a=p.points[Number(segment[1])],b=p.points[(Number(segment[1])+1)%p.points.length];origin=world(b);direction=norm(add(mul(x,b[0]-a[0]),mul(y,b[1]-a[1])));}
  else if(['width','height'].includes(k)){const d=k==='width'?num(p.width,40):num(p.height,30);origin=add(origin,mul(direction,d/2));coefficient=2;}
  else if(k==='radius')origin=add(origin,mul(x,num(p.radius,15)));
  else if(k==='sagitta'&&p.points?.length>1){const a=p.points[0],b=p.points[1],len=Math.hypot(b[0]-a[0],b[1]-a[1])||1,normal=[-(b[1]-a[1])/len,(b[0]-a[0])/len];direction=add(mul(x,normal[0]),mul(y,normal[1]));origin=world([(a[0]+b[0])/2+num(p.x)+normal[0]*num(p.sagitta),(a[1]+b[1])/2+num(p.y)+normal[1]*num(p.sagitta)]);}
 }
 if(['sketchOffset','sketchFillet','sketchMirror'].includes(type)){origin=[...centre];direction=x;if(type==='sketchOffset'){const half=item?.bounds?x.reduce((s,v,i)=>s+Math.abs(v)*(item.bounds[1][i]-item.bounds[0][i])/2,0):10;origin=add(origin,mul(x,half+num(p.distance)));}}
 if(['box','cylinder','sphere','torus'].includes(type)){
  const z=num(p.z),height=type==='sphere'?2*num(p.radius,15):num(p.height,20);origin=[num(p.x),num(p.y),z+height/2];
  if(k==='width'){origin[0]+=num(p.width,40)/2;coefficient=2;}if(k==='depth'){direction=[0,1,0];origin[1]+=num(p.depth,30)/2;coefficient=2;}if(k==='height'){direction=[0,0,1];origin[2]=z+height;}
  if(k==='radius'){origin[0]+=num(p.radius,15);if(type==='torus')origin[2]=num(p.tube,5);}
  if(k==='tube'){origin=[num(p.radius,25)+num(p.tube,5),0,num(p.tube,5)];}
 }
 if(['move','duplicate','pattern'].includes(type)){origin=add(centre,[num(p.x),num(p.y),num(p.z)]);}
 if(['x','y','z','px','py','pz','ax','ay','az'].includes(k)&&!['hole','sketch'].includes(type)){direction=axisVector(k.at(-1).toUpperCase());if(k[0]==='p')origin=p.center||[num(p.px),num(p.py),num(p.pz)];}
 if(['plane','split','axis'].includes(type)){direction=type==='axis'?axisVector(p.axis||'Z'):pn;origin=type==='axis'?[num(p.x),num(p.y),num(p.z)]:mul(pn,num(p.offset));}
 if(['extrude','offsetFace','faceSketch','shell','hole','draft'].includes(type)){direction=face?.normal||n;origin=face?.center||centre;
  if(k==='distance'||k==='offset')origin=add(origin,mul(direction,num(p[k])));
  if(k==='thickness')direction=mul(direction,-1);
  if(type==='hole'){origin=add(origin,add(mul(x,num(p.x)),mul(y,num(p.y))));if(k==='x')direction=x;else if(k==='y')direction=y;else if(k==='diameter'){direction=x;origin=add(origin,mul(x,num(p.diameter,10)/2));coefficient=2;}else if(k==='depth')direction=mul(face?.normal||n,p.reverse?1:-1);}
 }
 if(type==='sweep'){const pts=p.points||context.profile?.points;if(pts?.length){origin=world(pts[0]);const tangent=norm(add(mul(x,pts[1][0]-pts[0][0]),mul(y,pts[1][1]-pts[0][1])));direction=norm(cross(n,tangent));}else direction=x;origin=add(origin,mul(direction,num(p.radius,3)));}
 if(type==='fillet'||type==='chamfer'){const edge=item?.edges?.find(e=>e.index===context.refs?.find(r=>r.kind==='edge')?.index);origin=edge?.center||centre;direction=face?.normal||[1,0,0];}
 if(type==='thread'){const c=p.threadStock||face?.cylinder;if(c){const a=norm(c.axis),start=p.end==='Start'?c.min:c.max;origin=add(c.origin,mul(a,start));direction=mul(a,p.end==='Start'?1:-1);if(['diameter','pitch'].includes(k)){const seed=Math.abs(a[0])<.9?[1,0,0]:[0,1,0];const radial=norm(cross(a,seed));if(k==='diameter'){direction=radial;origin=add(origin,mul(radial,num(p.diameter,c.radius*2)/2));coefficient=2;}else origin=add(origin,mul(direction,num(p.pitch,1)));}else origin=add(origin,mul(direction,num(p.offset)+(k==='length'?num(p.length):0)));}}
 if(type==='align'){direction=context.axis||axisVector(p.axis||'Z');origin=context.origin||centre;}
 if(type==='dimension'){origin=context.origin||centre;direction=context.axis||x;}
 if(/angle|rotation|twist/i.test(k)){kind='angle';unit='°';direction=type==='draft'?norm(cross(face?.normal||[1,0,0],pn)):type==='align'?(context.axis||[0,0,1]):p.axisVector||axisVector(p.axis||'Z');origin=type==='rotate'?p.center||[num(p.px),num(p.py),num(p.pz)]:type==='revolve'||type==='circularPattern'?[0,0,0]:origin;}
 if(['ax','ay','az'].includes(k)){kind='factor';unit='';}
 if(k==='count'||k==='sides'){kind='count';unit='×';}
 if(k==='factor'){kind='factor';unit='×';}
 return{origin:origin.map(v=>num(v)||0),direction:norm(direction),coefficient,kind,unit,plane:{origin:frame.origin,x,normal:n},showPlane:['plane','split','mirror','sketchMirror','draft'].includes(type)};
}
export function parameterDragValue(start,pixels,unitsPerPixel,geometry,{step=0,min=-Infinity,max=Infinity}={}){
 const raw=start+(geometry.kind==='angle'?pixels*.5:geometry.kind==='count'?pixels/18:geometry.kind==='factor'?pixels/100:pixels*unitsPerPixel*geometry.coefficient);
 const snapped=geometry.kind==='count'?Math.round(raw):step?Math.round(raw/step)*step:raw;return Math.max(min,Math.min(max,snapped));
}

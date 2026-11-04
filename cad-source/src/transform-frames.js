export const WORLD_AXES=[[1,0,0],[0,1,0],[0,0,1]];
export const dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0);
export const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export const add=(a,b)=>a.map((v,i)=>v+b[i]);
export const sub=(a,b)=>a.map((v,i)=>v-b[i]);
export const mul=(a,n)=>a.map(v=>v*n);
export function unit(v){const length=Math.hypot(...v);if(!Array.isArray(v)||v.length!==3||!Number.isFinite(length)||length<1e-10)throw Error('Choose geometry with a valid direction');return v.map(n=>n/length);}
export function rotateVector(v,angle,axis){const n=unit(typeof axis==='string'?WORLD_AXES['XYZ'.indexOf(axis)]:axis),r=angle*Math.PI/180,c=Math.cos(r),s=Math.sin(r);return add(add(mul(v,c),mul(cross(n,v),s)),mul(n,dot(n,v)*(1-c)));}
export const rotateFrame=(axes,angle,axis)=>axes.map(v=>unit(rotateVector(v,angle,axis)));
export function rotationBetween(from,to){const a=unit(from),b=unit(to),d=Math.max(-1,Math.min(1,dot(a,b)));if(d>1-1e-10)return{angle:0,axis:[1,0,0]};let axis=cross(a,b);if(Math.hypot(...axis)<1e-8)axis=cross(a,Math.abs(a[0])<.9?[1,0,0]:[0,1,0]);return{angle:Math.acos(d)*180/Math.PI,axis:unit(axis)};}
export const fromComponents=(values,axes)=>[0,1,2].map(i=>values.reduce((sum,v,k)=>sum+v*axes[k][i],0));
export const toComponents=(v,axes)=>axes.map(a=>dot(v,a));
export function faceFrame(item,ref){
 const face=ref?.kind==='face'&&item?.faceInfo.find(f=>f.index===ref.index);if(!face)return item?.localFrame||WORLD_AXES;
 const bodyAxes=item.localFrame||WORLD_AXES;let normal=face.normal;
 if(face.cylinder){const c=face.cylinder,point=ref.point||add(c.origin,mul(c.axis,(c.min+c.max)/2));let radial=sub(point,c.origin);radial=sub(radial,mul(c.axis,dot(radial,c.axis)));if(Math.hypot(...radial)<1e-7){const seed=bodyAxes.find(a=>Math.abs(dot(a,c.axis))<.9)||[1,0,0];radial=sub(seed,mul(c.axis,dot(seed,c.axis)));}normal=mul(unit(radial),c.internal?-1:1);}
 const z=unit(normal),seed=bodyAxes.find(a=>Math.abs(dot(a,z))<.95)||WORLD_AXES.find(a=>Math.abs(dot(a,z))<.9),x=unit(sub(seed,mul(z,dot(seed,z))));return[x,unit(cross(z,x)),z];
}
export function concentricPlacement(source,target,p={}){
 if(!source||!target)throw Error('Choose a cylindrical face on each part');
 const anchor=(c,key)=>add(c.origin,mul(c.axis,key==='min'?c.min:key==='max'?c.max:(c.min+c.max)/2));
 const sourceAnchor=p.sourceAnchor||'centre',targetAnchor=p.targetAnchor||'centre';if(!['min','max','centre'].includes(sourceAnchor)||!['min','max','centre','keep'].includes(targetAnchor))throw Error('Choose valid cylinder anchors');
 const offset=Number(p.offset??0),twist=Number(p.twist??0);if(!Number.isFinite(offset)||Math.abs(offset)>2000||!Number.isFinite(twist)||Math.abs(twist)>3600)throw Error('Enter a finite offset (±2000 mm) and rotation (±3600°)');
 const direction=unit(target.axis),desired=mul(direction,p.flip?-1:1),rotation=rotationBetween(source.axis,desired),pivot=anchor(source,sourceAnchor),targetPoint=anchor(target,targetAnchor),delta=sub(targetPoint,pivot);
 if(targetAnchor==='keep'){const along=dot(delta,direction);for(let i=0;i<3;i++)delta[i]-=direction[i]*along;}
 return{...rotation,pivot,delta:add(delta,mul(direction,offset)),direction,twist};
}

import {dot,add,mul,sub,unit} from './transform-frames.js';
// Shared millimetre-space snapping. Typed values are never rounded implicitly.
export function roundToStep(value,step=1){const size=Number.isFinite(step)&&step>0?step:1;return Number((Math.round(value/size)*size).toFixed(9));}
export function snapTranslation({bounds,delta,axis,value,targets=[],step=1,threshold=1,enabled=true,grid=true,geometry=true}){
 if(!enabled)return{value,label:''};
 const centre=bounds[0].map((v,i)=>(v+bounds[1][i])/2),anchors=[bounds[0][axis],centre[axis],bounds[1][axis]],names=['min','centre','max'];let best=null,bestDistance=Math.max(0,threshold);
 const candidates=geometry?[{position:0,name:'Origin',point:[0,0,0],kind:'origin'}]:[];
 if(geometry)for(const item of targets){const b=item.bounds,c=b[0].map((v,i)=>(v+b[1][i])/2);for(const [i,p]of [b[0][axis],c[axis],b[1][axis]].entries())candidates.push({position:p,name:(item.name||'Part')+' '+names[i]+' '+'XYZ'[axis],point:c.map((v,k)=>k===axis?p:v),kind:'part',targetId:item.id});}
 for(let i=0;i<anchors.length;i++)for(const target of candidates){const snapped=target.position-anchors[i],distance=Math.abs(value-snapped);if(distance<bestDistance-1e-9){bestDistance=distance;best={value:snapped,label:target.name+' · moving '+names[i]+' '+'XYZ'[axis],kind:target.kind,targetId:target.targetId,point:target.point,from:centre.map((v,k)=>k===axis?anchors[i]+snapped:v+delta[k])};}}
 return best||{value:grid?roundToStep(value,step):value,label:grid?'Grid '+step+' mm':'',kind:grid?'grid':null};
}
// Local arrows use the same geometric projections along their fixed body/face axis.
export function snapAlongDirection({bounds,delta,axis,direction,value,targets=[],step=1,threshold=1,enabled=true,grid=true,geometry=true}){
 const n=unit(direction),major=n.findIndex(v=>Math.abs(v)>1-1e-8);if(major>=0){const sign=n[major],r=snapTranslation({bounds,delta,axis:major,value:value*sign,targets,step,threshold,enabled,grid,geometry});return{...r,value:r.value*sign};}
 if(!enabled)return{value,label:''};
 const centre=bounds[0].map((v,i)=>(v+bounds[1][i])/2);
 const positions=[dot(centre,n)],candidates=geometry?[{point:[0,0,0],label:'Origin',kind:'origin'}]:[];
 if(geometry)for(const item of targets){const c=item.bounds[0].map((v,i)=>(v+item.bounds[1][i])/2);candidates.push({point:c,label:(item.name||'Part')+' centre',kind:'part'});for(const f of item.faceInfo||[])if(f.type==='PLANE'||f.cylinder)candidates.push({point:f.center,label:(item.name||'Part')+' face centre',kind:'part'});}
 // Remove the contribution of the currently edited local component.
 const other=sub(delta,mul(n,dot(delta,n)));let best=null,distance=threshold;
 for(const anchor of positions)for(const target of candidates){const snapped=dot(target.point,n)-anchor-dot(other,n),d=Math.abs(snapped-value);if(d<distance-1e-9){distance=d;best={value:snapped,label:target.label+' · local axis',kind:target.kind,point:target.point,from:add(add(centre,other),mul(n,anchor-dot(centre,n)+snapped))};}}
 return best||{value:grid?roundToStep(value,step):value,label:grid?'Grid '+step+' mm · local axis':'',kind:grid?'grid':null};
}
export function alignmentDelta(source,target,{axis='XYZ',sourceAnchor='centre',targetAnchor='centre'}={}){
 if(!['X','Y','Z','XYZ'].includes(axis))throw Error('Choose X, Y, Z or XYZ alignment');
 const anchor=(bounds,mode,i)=>{if(mode==='min')return bounds[0][i];if(mode==='max')return bounds[1][i];if(mode!=='centre')throw Error('Choose minimum, centre or maximum');return(bounds[0][i]+bounds[1][i])/2;};
 return [0,1,2].map(i=>axis==='XYZ'||axis==='XYZ'[i]?anchor(target,targetAnchor,i)-anchor(source,sourceAnchor,i):0);
}

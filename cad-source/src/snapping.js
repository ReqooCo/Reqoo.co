// Shared millimetre-space snapping. Typed values are never rounded implicitly.
export function roundToStep(value,step=1){
 const size=Number.isFinite(step)&&step>0?step:1;
 return Number((Math.round(value/size)*size).toFixed(9));
}
export function snapTranslation({bounds,delta,axis,value,targets=[],step=1,threshold=1,enabled=true}){
 if(!enabled)return{value,label:''};
 const anchors=[bounds[0][axis],(bounds[0][axis]+bounds[1][axis])/2,bounds[1][axis]],names=['edge','centre','edge'];
 let best=null,bestDistance=Math.max(0,threshold);
 const candidates=[{position:0,name:'Origin'}];
 for(const item of targets){const b=item.bounds;for(const [i,p]of [b[0][axis],(b[0][axis]+b[1][axis])/2,b[1][axis]].entries())candidates.push({position:p,name:(item.name||'Part')+' '+names[i]});}
 for(let i=0;i<anchors.length;i++)for(const target of candidates){const snapped=target.position-anchors[i],distance=Math.abs(value-snapped);if(distance<bestDistance-1e-9){bestDistance=distance;best={value:snapped,label:target.name+' · '+names[i]};}}
 return best||{value:roundToStep(value,step),label:'Grid '+step+' mm'};
}
export function alignmentDelta(source,target,{axis='XYZ',sourceAnchor='centre',targetAnchor='centre'}={}){
 if(!['X','Y','Z','XYZ'].includes(axis))throw Error('Choose X, Y, Z or XYZ alignment');
 const anchor=(bounds,mode,i)=>{if(mode==='min')return bounds[0][i];if(mode==='max')return bounds[1][i];if(mode!=='centre')throw Error('Choose minimum, centre or maximum');return(bounds[0][i]+bounds[1][i])/2;};
 return [0,1,2].map(i=>axis==='XYZ'||axis==='XYZ'[i]?anchor(target,targetAnchor,i)-anchor(source,sourceAnchor,i):0);
}

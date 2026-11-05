import {solveSketch} from './constraints.js';
// Authored placements stay parametric; the CAD kernel receives resolved recipes.
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),sub=(a,b)=>a.map((v,i)=>v-b[i]),add=(a,b)=>a.map((v,i)=>v+b[i]),mul=(a,k)=>a.map(v=>v*k);
const unit=v=>{const l=Math.hypot(...v);if(l<1e-9)throw Error('Invalid dimension plane');return mul(v,1/l);};
export function dimensionFrame(p,basis){const b=basis(p),x=unit(b.x),n=unit(b.normal);if(Math.abs(dot(x,n))>1e-6)throw Error('Dimension plane axes must be perpendicular');return{origin:b.origin,x,normal:n,y:[n[1]*x[2]-n[2]*x[1],n[2]*x[0]-n[0]*x[2],n[0]*x[1]-n[1]*x[0]]};}
export function sketchAnchors(p){
 if(p.operations?.length)throw Error('Choose an original sketch without derived operations');
 const x=p.x||0,y=p.y||0,points=[{key:'center',label:'Center',point:[x,y]}];
 if(['rectangle','ellipse'].includes(p.shape)){const w=p.width/2,h=p.height/2;for(const [key,label,a,b]of [['left','Left midpoint',-w,0],['right','Right midpoint',w,0],['bottom','Bottom midpoint',0,-h],['top','Top midpoint',0,h]])points.push({key,label,point:[x+a,y+b]});if(p.shape==='rectangle')for(const [key,label,a,b]of [['bottomLeft','Bottom left',-w,-h],['bottomRight','Bottom right',w,-h],['topLeft','Top left',-w,h],['topRight','Top right',w,h]])points.push({key,label,point:[x+a,y+b]});}
 else if(['circle','annulus'].includes(p.shape))for(const [key,label,a,b]of [['left','Left edge',-p.radius,0],['right','Right edge',p.radius,0],['bottom','Bottom edge',0,-p.radius],['top','Top edge',0,p.radius]])points.push({key,label,point:[x+a,y+b]});
 else if(p.shape==='polyline'){points.length=0;for(const [i,q]of p.points.entries())points.push({key:'point:'+i,label:'Point '+(i+1),point:[x+q[0],y+q[1]]});}
 else if(p.shape==='polygon')for(let i=0;i<p.sides;i++)points.push({key:'point:'+i,label:'Vertex '+(i+1),point:[x+p.radius*Math.cos(-i*2*Math.PI/p.sides),y+p.radius*Math.sin(-i*2*Math.PI/p.sides)]});
 else throw Error('Smart Dimension supports rectangles, circles, ellipses, polygons and polylines');
 return points;
}
export function anchorPoint(p,key){const a=sketchAnchors(p).find(a=>a.key===key);if(!a)throw Error('Dimension anchor no longer exists');return a.point;}
export function worldAnchor(p,key,basis){const f=dimensionFrame(p,basis),q=anchorPoint(p,key);return add(f.origin,add(mul(f.x,q[0]),mul(f.y,q[1])));}
export function dimensionGeometry(fixed,moving,a,b,mode,basis){
 if(!['horizontal','vertical','distance'].includes(mode))throw Error('Unsupported dimension direction');
 const frame=dimensionFrame(moving,basis),source=dimensionFrame(fixed,basis);if(Math.abs(Math.abs(dot(frame.normal,source.normal))-1)>1e-6||Math.abs(dot(sub(source.origin,frame.origin),frame.normal))>1e-5)throw Error('Choose two sketches on the same plane');
 const start=worldAnchor(fixed,a,basis),end=worldAnchor(moving,b,basis),d=sub(end,start),dx=dot(d,frame.x),dy=dot(d,frame.y);return{start,end,dx,dy,value:mode==='horizontal'?dx:mode==='vertical'?dy:Math.hypot(dx,dy),frame};
}
export function resolveDimensionDocument(doc,basis){
 const sketches=new Map(doc.features.filter(f=>f.type==='sketch'&&!f.suppressed).map(f=>[f.id,f])),resolved=new Map(),visiting=new Set();
 function resolve(id){if(resolved.has(id))return resolved.get(id);const f=sketches.get(id);if(!f)throw Error('Dimension reference is missing or suppressed');if(visiting.has(id))throw Error('Circular sketch dimension dependency');visiting.add(id);let p={...f.params};if(p.shape==='polyline'&&p.constraints?.length)p.points=solveSketch(p.points,p.constraints).points;const dimensions=p.dimensions??[];if(!Array.isArray(dimensions)||dimensions.length>2)throw Error('Use at most one horizontal and one vertical dimension per sketch');const modes=new Set();
 for(const d of dimensions){if(!d||!['horizontal','vertical','distance'].includes(d.mode)||modes.has(d.mode)||d.mode==='distance'&&dimensions.length!==1||dimensions.some(q=>q.mode==='distance')&&dimensions.length!==1||!Number.isFinite(d.value)||Math.abs(d.value)>4000||d.mode==='distance'&&d.value<0)throw Error('Conflicting or invalid sketch dimensions');modes.add(d.mode);
 const fixed=d.source===null?{shape:'circle',radius:1,plane:p.plane,offset:p.offset,basis:p.basis}:resolve(d.source);const g=dimensionGeometry(fixed,p,d.source===null?'center':d.from,d.to,d.mode,basis);let dx=0,dy=0;if(d.mode==='horizontal')dx=d.value-g.dx;else if(d.mode==='vertical')dy=d.value-g.dy;else{const len=Math.hypot(g.dx,g.dy);if(len<1e-8&&d.value>0)throw Error('Move the sketches apart to define a distance direction');const k=len?d.value/len-1:0;dx=g.dx*k;dy=g.dy*k;}p={...p,x:(p.x||0)+dx,y:(p.y||0)+dy};
 }
 // Different anchors can make horizontal/vertical rules interact; verify the solved result.
 for(const d of dimensions){const fixed=d.source===null?{shape:'circle',radius:1,plane:p.plane,offset:p.offset,basis:p.basis}:resolve(d.source),g=dimensionGeometry(fixed,p,d.source===null?'center':d.from,d.to,d.mode,basis);if(Math.abs(g.value-d.value)>1e-5)throw Error('Sketch dimensions could not be satisfied');}
 visiting.delete(id);resolved.set(id,p);return p;}
 for(const id of sketches.keys())resolve(id);
 return{...doc,features:doc.features.map(f=>resolved.has(f.id)?{...f,params:resolved.get(f.id)}:f)};
}
export function withDrivingDimension(doc,target,rule){const next=structuredClone(doc),f=next.features.find(f=>f.id===target&&f.type==='sketch'&&!f.suppressed);if(!f)throw Error('Choose an editable sketch');if(rule.source===target)throw Error('Choose two different sketches');const prior=f.params.dimensions||[];if(rule.mode==='distance'&&prior.some(d=>d.mode!=='distance')||rule.mode!=='distance'&&prior.some(d=>d.mode==='distance'))throw Error('Remove the existing distance constraint before changing direction');f.params.dimensions=[...prior.filter(d=>d.mode!==rule.mode),rule];return next;}

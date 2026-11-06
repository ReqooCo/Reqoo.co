// Exact 2D line/analytic-circle sketch editing helpers.
// Pure functions: source feature data is never mutated, and UI commits the
// resulting feature graph atomically through CAD rebuild.
const EPS=1e-7;
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const add=(a,b)=>[a[0]+b[0],a[1]+b[1]],sub=(a,b)=>[a[0]-b[0],a[1]-b[1]],mul=(a,s)=>[a[0]*s,a[1]*s],cross=(a,b)=>a[0]*b[1]-a[1]*b[0];
function uniquePoints(points){const out=[];for(const p of points){if(!out.length||dist(out.at(-1),p)>EPS)out.push([...p]);}return out;}
function clean(points){return uniquePoints(points).filter(p=>p.every(Number.isFinite));}
export function geometryPoints(p){
 if(p.operations?.length)throw Error('Edit the original sketch before trimming or offsetting derived operations');
 if(p.shape==='polyline'){
  if(!Array.isArray(p.points)||p.points.length<2)throw Error('Sketch line has no editable points');
  const offset=[Number(p.x||0),Number(p.y||0)];
  return clean(p.points.map(q=>add(q,offset)));
 }
 if(p.shape==='rectangle'){
  const x=Number(p.x||0),y=Number(p.y||0),w=Number(p.width),h=Number(p.height);
  if(!(w>0&&h>0))throw Error('Rectangle must have positive dimensions');
  return [[x-w/2,y-h/2],[x+w/2,y-h/2],[x+w/2,y+h/2],[x-w/2,y+h/2]];
 }
 throw Error('Select a straight sketch line, polyline or rectangle');
}
export function closedGeometry(p){return p.shape==='rectangle'||p.shape==='polyline'&&p.closed!==false;}
export function sketchSegments(p){
 if(p.shape==='circle'){
  const x=Number(p.x||0),y=Number(p.y||0),r=Number(p.radius);
  if(!(r>0))return[];
  return [{circle:[x,y,r]}];
 }
 if(p.shape==='ellipse'){
  const x=Number(p.x||0),y=Number(p.y||0),rx=Number(p.width)/2,ry=Number(p.height)/2;
  if(!(rx>0&&ry>0))return[];
  return [{ellipse:[x,y,rx,ry]}];
 }
 let pts;try{pts=geometryPoints(p);}catch{return[];}
 const closed=closedGeometry(p);return pts.map((a,i)=>({a,b:pts[(i+1)%pts.length]})).filter((s,i)=>closed||i<pts.length-1).filter(s=>dist(s.a,s.b)>EPS);
}
const lerp=(a,b,t)=>add(a,mul(sub(b,a),t));
function paramOnSegment(a,b,p){const v=sub(b,a),den=v[0]*v[0]+v[1]*v[1];return den<EPS?0:Math.max(0,Math.min(1,((p[0]-a[0])*v[0]+(p[1]-a[1])*v[1])/den));}
function intersections(a,b,other){
 const v=sub(b,a),ans=[];
 if(other.a&&other.b){
  const q=other.a,w=sub(other.b,q),den=cross(v,w);
  if(Math.abs(den)<EPS)return ans;
  const t=cross(sub(q,a),w)/den,u=cross(sub(q,a),v)/den;
  if(t>EPS&&t<1-EPS&&u>=-EPS&&u<=1+EPS)ans.push(t);
 } else if(other.circle||other.ellipse){
  const g=other.circle||other.ellipse,[cx,cy,ra,rb=ra]=g;
  const x=(a[0]-cx)/ra,y=(a[1]-cy)/rb,dx=v[0]/ra,dy=v[1]/rb;
  const A=dx*dx+dy*dy,B=2*(x*dx+y*dy),C=x*x+y*y-1,D=B*B-4*A*C;
  if(A<EPS||D<0)return ans;
  for(const t of [(-B-Math.sqrt(Math.max(0,D)))/(2*A),(-B+Math.sqrt(Math.max(0,D)))/(2*A)])
   if(t>EPS&&t<1-EPS&&!ans.some(k=>Math.abs(k-t)<EPS))ans.push(t);
 }
 return ans;
}
const recipe=points=>({shape:'polyline',points:clean(points),closed:false,x:0,y:0,constraints:[],operations:[]});
export function trimSketchSegment(source,point,boundaries,hitTolerance=1){
 const pts=geometryPoints(source),closed=closedGeometry(source);
 const n=closed?pts.length:pts.length-1;
 let index=-1,tap=0,best=Infinity;
 for(let i=0;i<n;i++){
  const t=paramOnSegment(pts[i],pts[(i+1)%pts.length],point);
  const d=dist(point,lerp(pts[i],pts[(i+1)%pts.length],t));
  if(d<best){best=d;index=i;tap=t;}
 }
 if(index<0||best>hitTolerance)throw Error('Tap directly on a straight sketch segment to trim');
 const a=pts[index],b=pts[(index+1)%pts.length],cuts=[0,1];
 for(const other of boundaries.flatMap(sketchSegments))cuts.push(...intersections(a,b,other));
 cuts.sort((a,b)=>a-b);
 const unique=[];for(const t of cuts)if(!unique.length||t-unique.at(-1)>EPS)unique.push(t);
 let interval=unique.findIndex((t,i)=>i<unique.length-1&&tap>=t-EPS&&tap<=unique[i+1]+EPS);
 if(interval<0)interval=Math.max(0,unique.length-2);
 const left=unique[interval],right=unique[interval+1];
 if(right-left<EPS)throw Error('Sketch segment is too short to trim');
 let paths;
 if(closed){
  const path=[lerp(a,b,right)];
  for(let step=1;step<=pts.length;step++)path.push(pts[(index+step)%pts.length]);
  path.push(lerp(a,b,left));
  paths=[path];
 } else {
  paths=[ [...pts.slice(0,index+1),lerp(a,b,left)], [lerp(a,b,right),...pts.slice(index+1)] ];
 }
 return {segmentIndex:index,cut:[left,right],parts:paths.map(clean).filter(path=>path.length>=2&&path.some((p,i)=>i>0&&dist(p,path[i-1])>EPS)).map(recipe)};
}
export function offsetSketchPolyline(source,distance,{mode='Chain',edgeIndex=0}={}){
 const pts=geometryPoints(source),closed=closedGeometry(source);
 if(!Number.isFinite(distance)||Math.abs(distance)<EPS||Math.abs(distance)>500)throw Error('Offset needs a non-zero distance within 500 mm');
 if(!['Single','Chain'].includes(mode))throw Error('Choose Single or Chain offset');
 const count=closed?pts.length:pts.length-1;
 const shifted=[];
 const lines=[];
 for(let i=0;i<count;i++){const a=pts[i],b=pts[(i+1)%pts.length],v=sub(b,a),len=Math.hypot(...v);if(len<EPS)throw Error('Sketch contains a zero-length segment');const n=[-v[1]/len,v[0]/len];lines.push({a:add(a,mul(n,distance)),b:add(b,mul(n,distance))});}
 if(mode==='Single'){
  if(!Number.isInteger(edgeIndex)||edgeIndex<0||edgeIndex>=lines.length)throw Error('Select a valid sketch line');
  return recipe([lines[edgeIndex].a,lines[edgeIndex].b]);
 }
 if(closed)throw Error('Closed Chain offset is handled by the native CAD sketch kernel');
 const intersect=(l,r)=>{const a=l.a,v=sub(l.b,l.a),b=r.a,w=sub(r.b,r.a),den=cross(v,w);
  if(Math.abs(den)<EPS)return l.b;return add(a,mul(v,cross(sub(b,a),w)/den));};
 shifted.push(lines[0].a);
 for(let i=1;i<lines.length;i++){
  const meet=intersect(lines[i-1],lines[i]);
  if(dist(meet,pts[i])>Math.abs(distance)*12)throw Error('Offset corner would produce a long spike; use a smaller offset');
  shifted.push(meet);
 }
 shifted.push(lines.at(-1).b);
 return recipe(shifted);
}

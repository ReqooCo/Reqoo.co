// Build a temporary extrusion display from the selected face triangulation.
// Hole boundaries are retained. Only positive planar pulls use this display;
// final geometry/booleans are always rebuilt and validated by OpenCascade.
export function facePrismData(item,index){
 const face=item.faceInfo.find(f=>f.index===index),groups=item.mesh.faceGroups.filter(g=>g.faceIndex===index);
 if(face?.type!=='PLANE'||!groups.length)return null;
 const vertices=item.mesh.vertices,triangles=item.mesh.triangles,points=[],ids=new Map(),cap=[],edges=new Map();
 function vertex(i){const p=Array.from(vertices.slice(i*3,i*3+3)),key=p.map(v=>Math.round(v*1e6)).join(',');if(!ids.has(key)){ids.set(key,points.length);points.push(p);}return ids.get(key);}
 for(const group of groups)for(let k=group.start;k<group.start+group.count;k+=3){
  const t=[vertex(triangles[k]),vertex(triangles[k+1]),vertex(triangles[k+2])];cap.push(t);
  for(let j=0;j<3;j++){const a=t[j],b=t[(j+1)%3],key=[Math.min(a,b),Math.max(a,b)].join(':');const edge=edges.get(key);if(edge)edge.count++;else edges.set(key,{a,b,count:1});}
 }
 const base=[],weights=[],lines=[],lineWeights=[];
 const add=(id,w)=>{base.push(...points[id]);weights.push(w);};
 for(const t of cap)for(const id of t)add(id,1);
 let boundaryCount=0;
 for(const edge of edges.values())if(edge.count===1){boundaryCount++;const {a,b}=edge;for(const [id,w]of [[a,0],[b,0],[b,1],[a,0],[b,1],[a,1]])add(id,w);
 for(const id of [a,b]){lines.push(...points[id]);lineWeights.push(1);}
 }
 return{base:new Float32Array(base),weights:new Float32Array(weights),lines:new Float32Array(lines),lineWeights:new Float32Array(lineWeights),normal:face.normal,boundaryCount};
}
export function updatePrismPositions(output,base,weights,normal,distance){
 for(let i=0;i<weights.length;i++)for(let j=0;j<3;j++)output[i*3+j]=base[i*3+j]+weights[i]*normal[j]*distance;
}

// Display resources belong to the native mesh snapshot, not a selection repaint.
// Preview meshes are separate snapshots and are released when no longer visible.
export function createDisplayCache(){
 const faces=new Map(),edges=new Map(),materials=new Map(),lines=new Map();
 const identity=data=>data?.cacheKey||data;
 const shared=r=>{r.userData||={};r.userData.cadShared=true;return r;},dispose=r=>r?.dispose?.();
 function face(mesh,key,create){mesh=identity(mesh);let entry=faces.get(mesh);if(!entry||entry.key!==key){if(entry)dispose(entry.value);entry={key,value:shared(create())};faces.set(mesh,entry);}return entry.value;}
 function edge(data,create){data=identity(data);if(!edges.has(data))edges.set(data,shared(create()));return edges.get(data);}
 function material(mesh,key,create){mesh=identity(mesh);let variants=materials.get(mesh);if(!variants){variants=new Map();materials.set(mesh,variants);}if(variants.has(key)){const value=variants.get(key);variants.delete(key);variants.set(key,value);return value;}const value=create().map(shared);variants.set(key,value);if(variants.size>4){const oldest=variants.keys().next().value;variants.get(oldest).forEach(dispose);variants.delete(oldest);}return value;}
 function line(key,create){if(!lines.has(key))lines.set(key,shared(create()));return lines.get(key);}
 function prune(items){const meshKeys=new Set(items.map(i=>identity(i.mesh))),edgeKeys=new Set(items.flatMap(i=>(i.edges||[]).map(identity)));for(const [key,entry]of faces)if(!meshKeys.has(key)){dispose(entry.value);faces.delete(key);}for(const [key,value]of edges)if(!edgeKeys.has(key)){dispose(value);edges.delete(key);}for(const [key,variants]of materials)if(!meshKeys.has(key)){for(const value of variants.values())value.forEach(dispose);materials.delete(key);}}
 function clear(){prune([]);for(const value of lines.values())dispose(value);lines.clear();}
 return{face,edge,material,line,prune,clear,get stats(){return{faces:faces.size,edges:edges.size,materials:[...materials.values()].reduce((n,v)=>n+v.size,0),lineMaterials:lines.size};}};
}

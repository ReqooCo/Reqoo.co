const history=[];
export function meshStats(meshes){let triangles=0,bytes=0;const seen=new Set();for(const m of meshes){const g=m.geometry,p=g?.attributes?.position;if(!p)throw Error('Mesh tiada koordinat.');triangles+=(g.index?.count||p.count)/3;for(const a of [...Object.values(g.attributes),g.index].filter(Boolean))if(!seen.has(a.array.buffer)){seen.add(a.array.buffer);bytes+=a.array.byteLength}}return{triangles:Math.round(triangles),bytes}}
export function enforceBudget(meshes){const stats=meshStats(meshes);if(stats.triangles>2000000||stats.bytes>192*1024*1024)throw Error('Model melebihi had proses (2 juta segi tiga / 192 MB). Pecahkan pilihan atau guna Draft.');return stats}
export function recordMetric(entry){history.push({at:new Date().toISOString(),...entry});if(history.length>100)history.shift();return entry}
export const metrics=()=>history.map(r=>({...r}));

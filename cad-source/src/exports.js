import {zipSync,strToU8} from 'three/addons/libs/fflate.module.js';
const xml=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export function threeMF(items){
 if(!items.length||items.some(i=>i.kind!=='body'))throw Error('3MF export needs solid bodies');
 const resources=items.map((item,index)=>{const m=item.mesh;if(m.vertices.length>9e6||m.triangles.length>9e6)throw Error('Mesh exceeds 3MF export limit');const vertices=[];for(let i=0;i<m.vertices.length;i+=3)vertices.push('<vertex x="'+m.vertices[i]+'" y="'+m.vertices[i+1]+'" z="'+m.vertices[i+2]+'"/>');const triangles=[];for(let i=0;i<m.triangles.length;i+=3)triangles.push('<triangle v1="'+m.triangles[i]+'" v2="'+m.triangles[i+1]+'" v3="'+m.triangles[i+2]+'"/>');return'<object id="'+(index+1)+'" type="model" name="'+xml(item.name)+'"><mesh><vertices>'+vertices.join('')+'</vertices><triangles>'+triangles.join('')+'</triangles></mesh></object>';}).join('');
 const model='<?xml version="1.0" encoding="UTF-8"?><model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02"><resources>'+resources+'</resources><build>'+items.map((_,i)=>'<item objectid="'+(i+1)+'"/>').join('')+'</build></model>';
 return new Blob([zipSync({'[Content_Types].xml':strToU8('<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>'),'_rels/.rels':strToU8('<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>'),'3D/3dmodel.model':strToU8(model)},{level:6})],{type:'model/3mf'});
}
export function sketchExport(p,format){
 if(p.operations?.length)throw Error('Derived sketch SVG/DXF export is not implemented. Export the native solid as STEP instead.');
 let points=null,circle=null;const x=p.x||0,y=p.y||0;
 if(p.shape==='circle')circle={x,y,r:p.radius};
 else if(p.shape==='rectangle')points=[[-p.width/2,-p.height/2],[p.width/2,-p.height/2],[p.width/2,p.height/2],[-p.width/2,p.height/2]].map(q=>[q[0]+x,q[1]+y]);
 else if(p.shape==='polygon')points=Array.from({length:p.sides},(_,i)=>[x+p.radius*Math.cos(i*2*Math.PI/p.sides),y+p.radius*Math.sin(i*2*Math.PI/p.sides)]);
 else if(p.shape==='polyline')points=p.points.map(q=>[q[0]+x,q[1]+y]);
 else throw Error('SVG/DXF currently supports circle, rectangle, polygon and polyline sketches.');
 const closed=p.shape!=='polyline'||p.closed!==false;
 if(format==='dxf'){
  const entities=circle?['0','CIRCLE','8','Sketch','10',circle.x,'20',circle.y,'30',0,'40',circle.r]:['0','LWPOLYLINE','8','Sketch','90',points.length,'70',closed?1:0,...points.flatMap(q=>['10',q[0],'20',q[1]])];
  return ['0','SECTION','2','HEADER','9','$INSUNITS','70','4','0','ENDSEC','0','SECTION','2','ENTITIES',...entities,'0','ENDSEC','0','EOF',''].join('\n');
 }
 const bounds=circle?[circle.x-circle.r,circle.y-circle.r,circle.x+circle.r,circle.y+circle.r]:[Math.min(...points.map(q=>q[0])),Math.min(...points.map(q=>q[1])),Math.max(...points.map(q=>q[0])),Math.max(...points.map(q=>q[1]))],w=Math.max(.01,bounds[2]-bounds[0]),h=Math.max(.01,bounds[3]-bounds[1]);
 const shape=circle?'<circle cx="'+circle.x+'" cy="'+circle.y+'" r="'+circle.r+'"/>':'<'+(closed?'polygon':'polyline')+' points="'+points.map(q=>q.join(',')).join(' ')+'"/>';
 return '<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'mm" height="'+h+'mm" viewBox="'+[bounds[0],-bounds[3],w,h].join(' ')+'"><g transform="scale(1,-1)" fill="none" stroke="black" stroke-width=".1">'+shape+'</g></svg>';
}

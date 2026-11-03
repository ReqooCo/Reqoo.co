import * as THREE from 'three';
import {FontLoader} from 'three/addons/loaders/FontLoader.js';
import fontData from 'three/examples/fonts/helvetiker_bold.typeface.json';
import {solidEngine,geometryFromSolid} from './solid-union.js';
import {qrMatrix,qrSolidGeometry} from './booth-products.js';
import {seededRandom} from './manufacturing-core.js';
import {MESH_QUALITY} from './mesh-quality.js';

export const EXTENDED_MODES=Object.freeze(['voronoi','key-waves','fidget','floating','sculptural','topographic-sign','qr-stand','qr-organic','qr-lightbox']);
export async function extendedGeometry(p){
 const api=await solidEngine(),owned=[],parts=[],own=s=>(owned.push(s),s),rng=seededRandom(p.seed);
 const section=poly=>own(new api.CrossSection([poly],'NonZero'));
 const rect=(w,h,x=0,y=0)=>section([[x-w/2,y-h/2],[x+w/2,y-h/2],[x+w/2,y+h/2],[x-w/2,y+h/2]]);
 const circle=(r,x=0,y=0)=>own(own(api.CrossSection.circle(r,MESH_QUALITY.outlineCurveSegments)).translate([x,y]));
 const box=(w,h,d,x=0,y=0,z=0)=>own(own(rect(w,h,x,y).extrude(d)).translate([0,0,z]));
 const union=values=>own(api.Manifold.union(values));
 const add=(solid,name,color,metadata={})=>{if(solid.status()!=='NoError'||solid.isEmpty()||solid.volume()<=0)throw Error('Geometri kosong / tidak sah: '+name);parts.push({geometry:geometryFromSolid(solid),name,color,...metadata})};
 const extrude=(s,d,z=0)=>own(own(s.extrude(d)).translate([0,0,z]));
 function stand(boardWidth,boardDepth,height=8){const foot=box(boardWidth+10,18,height),slot=box(boardWidth+p.clearance,boardDepth+p.clearance,height,0,0,1);add(own(own(foot.subtract(slot)).translate([p.width+16,0,0])),'Tapak berslot','#7956ae')}
 try{
  if(['voronoi','key-waves'].includes(p.mode)){
   const outline=rect(p.width,p.height),ring=circle(5,-p.width/2+1),hole=circle(2,-p.width/2+1),base=own(own(outline.add(ring)).subtract(hole));add(extrude(base,p.depth),'Tapak keychain','#46345f');
   if(p.mode==='voronoi'){
    const sites=Array.from({length:p.layers*3},()=>[(rng()-.5)*(p.width-8),(rng()-.5)*(p.height-8)]);
    // Clip convex Voronoi cells by pairwise perpendicular bisectors, then inset.
    for(let i=0;i<sites.length;i++){
     let poly=[[-p.width/2+3,-p.height/2+3],[p.width/2-3,-p.height/2+3],[p.width/2-3,p.height/2-3],[-p.width/2+3,p.height/2-3]];
     for(let j=0;j<sites.length&&poly.length;j++){if(i===j)continue;const a=sites[i],b=sites[j],nx=b[0]-a[0],ny=b[1]-a[1],d=(b[0]**2+b[1]**2-a[0]**2-a[1]**2)/2,clipped=[];for(let k=0;k<poly.length;k++){const v=poly[k],w=poly[(k+1)%poly.length],dv=nx*v[0]+ny*v[1]-d,dw=nx*w[0]+ny*w[1]-d;if(dv<=0)clipped.push(v);if((dv<=0)!==(dw<=0)){const t=dv/(dv-dw);clipped.push([v[0]+t*(w[0]-v[0]),v[1]+t*(w[1]-v[1])])}}poly=clipped;}
     if(poly.length>=3){const cell=own(section(poly).offset(-.65,'Round',MESH_QUALITY.outlineCurveSegments));if(!cell.isEmpty())add(extrude(cell,.9,p.depth),'Sel Voronoi '+(i+1),i%2?'#c7b2e5':'#a78bfa')}
    }
   }else for(let i=0;i<p.layers;i++){const y=-p.height/2+4+i*(p.height-8)/(p.layers-1),phase=rng()*Math.PI*2,amplitude=Math.min(2,(p.height-8)/p.layers*.25),points=Array.from({length:49},(_,j)=>[-p.width/2+3+j*(p.width-6)/48,y+Math.sin(j/48*Math.PI*4+phase)*amplitude]);points.push(...points.map(([x,y])=>[x,y+1.2]).reverse());add(extrude(section(points),1,p.depth),'Gelombang keychain '+i,'#c7b2e5')}
  }else if(p.mode==='fidget'){
   const w=p.width,h=p.height,c=p.clearance,channel=h*.5,rail=3,lip=2.5,railHeight=7,travel=w*.22;
   if(channel<10||channel-2*lip-2*c<5)throw Error('Besarkan tinggi fidget.');
   const solids=[box(w,h,p.depth),box(w,rail,railHeight,0,-channel/2-rail/2,p.depth),box(w,rail,railHeight,0,channel/2+rail/2,p.depth),box(w,lip,2,0,-channel/2+lip/2,p.depth+railHeight-2),box(w,lip,2,0,channel/2-lip/2,p.depth+railHeight-2),box(3,channel,railHeight,-w/2+1.5,0,p.depth)];add(union(solids),'Fidget — rel terbuka','#7956ae');
   const flangeHeight=railHeight-2-2*c,flange=box(travel,channel-2*c,flangeHeight),stem=box(travel*.65,channel-2*lip-2*c,7),knob=box(travel*.85,channel-2*lip-2*c,2,0,0,7);add(own(union([flange,stem,knob]).translate([0,h+12,0])),'Fidget — slider boleh tanggal','#e5d5f7');
   add(own(union([box(3,channel-2*c,flangeHeight),box(3,channel-2*lip-2*c,railHeight)]).translate([w+12,0,0])),'Fidget — hentian hujung boleh tanggal','#c7b2e5');
  }else if(['floating','sculptural','topographic-sign'].includes(p.mode)){
   const text=typeof p.text==='string'?p.text.trim():'';if(!text||text.length>32)throw Error('Teks signage mesti 1–32 aksara.');
   const font=new FontLoader().parse(p.fontData||fontData),shapes=font.generateShapes(text,20),loops=[];
   for(const s of shapes)for(const path of [s,...s.holes])loops.push(path.getPoints(MESH_QUALITY.fontCurveSegments).map(v=>[v.x,v.y]));
   if(!loops.length)throw Error('Teks tiada bentuk.');
   const outline=own(new api.CrossSection(loops,'EvenOdd')),bounds=outline.bounds(),sx=(p.width-10)/(bounds.max[0]-bounds.min[0]),sy=(p.height-12)/(bounds.max[1]-bounds.min[1]),scale=Math.min(sx,sy);
   let letters=own(own(outline.translate([-(bounds.min[0]+bounds.max[0])/2,-bounds.min[1]])).scale([scale,scale]));
   if(p.mode==='topographic-sign')letters=own(letters.scale([1.4/(p.layers+2),1.4/(p.layers+2)]));
   if(p.mode==='floating'){
    const sill=box(p.width,8,p.depth,0,-3,0),risers=Array.from({length:Math.max(2,p.layers)},(_,i)=>box(2,Math.min(p.height-10,12),p.depth,-p.width*.4+i*p.width*.8/(Math.max(2,p.layers)-1),3,0));
    add(union([sill,...risers,extrude(letters,p.depth,0)]),'Huruf terapung — palang & penyokong','#a78bfa');stand(p.width,p.depth);
   }else{
    let backing=rect(p.width,p.height);
    if(p.mode==='sculptural'){const points=Array.from({length:96},(_,i)=>{const a=i*Math.PI/48,r=1+.07*Math.sin(3*a)+.04*Math.cos(7*a);return[Math.cos(a)*p.width/2*r,Math.sin(a)*p.height/2*r]});backing=section(points);}
    const tab=rect(p.width*.5,5,0,-p.height/2-1);add(extrude(own(backing.add(tab)),p.depth),'Papan signage','#46345f');
    if(p.mode==='topographic-sign')for(let i=0;i<p.layers;i++){const factor=1-(i+1)/(p.layers+2),contour=own(rect((p.width-6)*factor,(p.height-6)*factor).offset(2,'Round',32));add(extrude(contour,.65,p.depth+i*.65),'Kontur signage '+i,i%2?'#c7b2e5':'#7956ae');}
    add(own(extrude(letters,1.4,p.depth+(p.mode==='topographic-sign'?p.layers*.65:0)).translate([0,-(p.height-12)/2*(p.mode==='topographic-sign'?1.4/(p.layers+2):1),0])),'Teks signage','#f3e9ff',{part:'letters'});stand(p.width,p.depth);
   }
  }else if(p.mode.startsWith('qr-')){
   if(typeof p.payload!=='string'||!p.payload.trim()||p.payload.length>4096)throw Error('Import QR asal atau masukkan kandungan QR asal dahulu.');
   const matrix=qrMatrix(p.payload),size=Math.min(p.width-12,p.height-12),unit=size/(matrix.length+8);if(unit<.8)throw Error('QR terlalu padat: besarkan lebar / tinggi.');
   let outline=rect(p.width,p.height);if(p.mode==='qr-organic'){const organic=section(Array.from({length:96},(_,i)=>{const a=i*Math.PI/48,r=1+.035*Math.sin(7*a),c=Math.cos(a),s=Math.sin(a);return[Math.sign(c)*Math.abs(c)**.2*(p.width/2+10)*r,Math.sign(s)*Math.abs(s)**.2*(p.height/2+10)*r]}));outline=own(outline.add(organic));}
   if(p.mode==='qr-lightbox'){
    const housingDepth=18,outer=rect(p.width+6,p.height+6),inside=rect(p.width+2,p.height+2),floor=extrude(outer,1.2),walls=extrude(own(outer.subtract(inside)),housingDepth-1.2,1.2),ledge=extrude(own(inside.subtract(rect(p.width-2,p.height-2))),1.2,housingDepth-2.4),wire=box(8,5,5,0,-p.height/2-2,2);
    add(own(union([floor,walls,ledge]).subtract(wire)),'QR lightbox — badan / laluan kabel','#7956ae',{assembly:[0,0,0]});
    const lid=extrude(rect(p.width+1-p.clearance,p.height+1-p.clearance),1.2);add(own(lid.translate([p.width+22,0,0])),'QR lightbox — diffuser','#ffffff',{assembly:[-p.width-22,0,housingDepth-1.2],part:'logo'});
    const qr=await qrSolidGeometry(matrix,size,0);qr.translate(p.width+22,0,1.2);parts.push({geometry:qr,name:'QR asal',color:'#000000',assembly:[-p.width-22,0,housingDepth-1.2],qr:{payload:p.payload,modules:matrix.length,unit,quietZone:4}});
   }else{
    // A rectangular white face protects quiet zone even with an organic outer frame.
    add(extrude(outline,p.depth),'Bingkai QR','#7956ae');add(extrude(rect(p.width-4,p.height-4),.6,p.depth),'Muka QR rata','#ffffff');
    const qr=await qrSolidGeometry(matrix,size,0);qr.translate(0,0,p.depth+.6);parts.push({geometry:qr,name:'QR asal',color:'#000000',qr:{payload:p.payload,modules:matrix.length,unit,quietZone:4}});stand(p.width,p.depth+.6,10);
   }
  }else throw Error('Mod lanjutan tidak dikenali.');
  return{parts,parameters:p,kind:p.mode.startsWith('qr-')?'qrpay':['floating','sculptural','topographic-sign'].includes(p.mode)?'signage':'keychain'};
 }catch(e){parts.forEach(p=>p.geometry.dispose());throw e}finally{owned.reverse().forEach(s=>s.delete())}
}

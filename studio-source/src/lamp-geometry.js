import {lampEnvelope} from './lamp-envelope.js';
import {studioParameters,STUDIO_DEFAULTS} from './lamp-core.js';
import {MESH_QUALITY} from './mesh-quality.js';
import * as THREE from 'three';
// Revolve a closed radial cross-section about Z. All radii remain positive.
export function revolve(profile,segments=192,outerRadius=null){
 const p=[],idx=[],n=profile.length;for(let i=0;i<segments;i++){const a=i*Math.PI*2/segments;for(let j=0;j<n;j++){const[r,z]=profile[j],rr=outerRadius&&(j===1||j===2)?outerRadius(a):r;p.push(rr*Math.cos(a),rr*Math.sin(a),z)}}
 for(let i=0;i<segments;i++)for(let j=0;j<n;j++){const a=i*n+j,b=((i+1)%segments)*n+j,c=((i+1)%segments)*n+(j+1)%n,d=i*n+(j+1)%n;idx.push(a,b,c,a,c,d)}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(idx);g.computeVertexNormals();g.computeBoundingBox();return g;
}
export const LAMP_DEFAULTS={...STUDIO_DEFAULTS,studioVersion:2,source:'bambu',shape:'lantern',baseShape:'round',diameter:90,topDiameter:65,height:110,wall:1.2,ribs:16,ripple:3,twist:0,baseHeight:14,moduleDiameter:59,moduleHeight:8,clearance:.35,cable:4,stripWidth:8,stripHeight:3,postDiameter:24,socketDiameter:42,bulbDiameter:60,bulbHeight:110,bulbGap:20};
function legacyLampGeometry(input){
 const p={...LAMP_DEFAULTS,...input};for(const[k,min,max]of [['diameter',50,240],['topDiameter',20,240],['height',35,280],['wall',.6,4],['ribs',4,48],['ripple',0,12],['twist',-90,90],['baseHeight',8,45],['moduleDiameter',10,100],['moduleHeight',2,35],['clearance',.1,1],['cable',2,10],['stripWidth',2,20],['stripHeight',.5,8],['postDiameter',15,70],['socketDiameter',20,65],['bulbDiameter',20,100],['bulbHeight',30,180],['bulbGap',10,50]])if(!Number.isFinite(p[k])||p[k]<min||p[k]>max)throw Error('Ukuran lampu tidak sah: '+k);
 if(!['strip','bambu','e27'].includes(p.source)||!['drum','cone','lantern','hourglass','dome','fluted','fold'].includes(p.shape))throw Error('Pilihan lampu tidak sah.');
 if(!['round','oval','rounded','hexagon','octagon','wavy'].includes(p.baseShape))throw Error('Bentuk tapak tidak sah.');
 if(!Number.isInteger(p.ribs))throw Error('Bilangan alur mesti nombor bulat.');
 const r=p.diameter/2,rt=p.topDiameter/2,n=MESH_QUALITY.lampRadial,rows=MESH_QUALITY.lampRows,vertices=[],indices=[];
 const radius=t=>{t=Math.max(0,(t*p.height-5)/(p.height-5));return p.shape==='drum'||p.shape==='fluted'||p.shape==='fold'?r:p.shape==='cone'?r+(rt-r)*t:p.shape==='lantern'?r+(rt-r)*t+Math.sin(Math.PI*t)*r*.3:p.shape==='hourglass'?r+(rt-r)*t-Math.sin(Math.PI*t)*r*.28:r+(rt-r)*t+Math.sin(Math.PI*t)*r*.18};
 const minRadius=Math.min(...Array.from({length:65},(_,i)=>radius(i/64)))-p.ripple-p.wall;
 if(minRadius<8)throw Error('Bukaan lampshade terlalu kecil.');
 if(p.source==='bambu'&&(p.moduleDiameter/2+p.clearance+3>r-p.wall||p.baseHeight<p.moduleHeight+3))throw Error('Besarkan diameter atau tinggi tapak untuk modul LED.');
 if(p.source==='strip'&&(p.postDiameter/2+p.stripHeight+5>minRadius||p.stripWidth>p.height-25))throw Error('Besarkan lampshade atau kecilkan tiang / strip.');
 if(p.source==='e27'&&(minRadius<p.bulbDiameter/2+p.bulbGap||p.height<p.bulbHeight+p.bulbGap+3||p.socketDiameter/2+3>r-p.wall))throw Error('Ruang mentol tidak cukup. Besarkan diameter atas/bawah dan tinggi lampshade.');
 for(let side=0;side<2;side++)for(let j=0;j<=rows;j++){const t=j/rows;for(let i=0;i<n;i++){const a=i*2*Math.PI/n,fade=Math.max(0,Math.min(1,(t*p.height-5)/10)),wave=p.shape==='fluted'||p.ripple>0?(p.shape==='fold'?(2/Math.PI)*Math.asin(Math.sin(p.ribs*(a-t*p.twist*Math.PI/180))):Math.sin(p.ribs*(a-t*p.twist*Math.PI/180)))*p.ripple*fade:0,rr=radius(t)+wave-side*p.wall;vertices.push(rr*Math.cos(a),rr*Math.sin(a),t*p.height)}}
 const layer=(rows+1)*n;for(let side=0;side<2;side++)for(let j=0;j<rows;j++)for(let i=0;i<n;i++){const a=side*layer+j*n+i,b=side*layer+j*n+(i+1)%n,c=b+n,d=a+n;if(side)indices.push(a,c,b,a,d,c);else indices.push(a,b,c,a,c,d)}
 for(let i=0;i<n;i++){const a=i,b=(i+1)%n;indices.push(a,layer+b,b,a,layer+a,layer+b);const c=rows*n+i,d=rows*n+(i+1)%n;indices.push(c,d,layer+d,c,layer+d,layer+c)}
 const shade=new THREE.BufferGeometry();shade.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));shade.setIndex(indices);shade.computeVertexNormals();shade.computeBoundingBox();
 const H=p.baseHeight,groove=H-3,ri=r-p.wall,outer=r+6,hole=p.source==='e27'?p.socketDiameter/2+p.clearance:p.cable/2;
 const profile=[[hole,0],[outer,0],[outer,H],[r+p.clearance,H],[r+p.clearance,groove],[ri-p.clearance,groove],[ri-p.clearance,H]];
 if(p.source==='bambu')profile.push([p.moduleDiameter/2+p.clearance,H],[p.moduleDiameter/2+p.clearance,H-p.moduleHeight],[hole,H-p.moduleHeight]);
 else if(p.source==='strip'){const post=p.postDiameter/2,top=H+p.height-25;profile.push([post,H],[post,top],[hole,top])}
 else profile.push([hole,H]);
 const baseRadius=a=>{const c=Math.cos(a),s=Math.sin(a);if(p.baseShape==='oval')return outer/Math.sqrt((c/1.35)**2+s*s);if(p.baseShape==='rounded')return outer/Math.pow(c**4+s**4,.25);if(p.baseShape==='hexagon'||p.baseShape==='octagon'){const sides=p.baseShape==='hexagon'?6:8,step=Math.PI*2/sides,local=(a+step/2)%step-step/2;return outer/Math.cos(local)}if(p.baseShape==='wavy')return outer*(1+.08*(1+Math.cos(6*a)));return outer};
 const base=revolve(profile,MESH_QUALITY.lampRadial,baseRadius),baseSize=base.boundingBox.getSize(new THREE.Vector3());return{shade,base,parameters:p,baseDiameter:Math.max(baseSize.x,baseSize.y),assemblyZ:groove,stripLength:p.source==='strip'?Math.PI*(p.postDiameter+p.stripHeight)*Math.floor((p.height-25)/(p.stripWidth+2)):0};
}
// A closed flat-backed relief with a rounded front, rather than a flat extrusion.
export function organicGeometry({kind='flower',width=25,height=25,depth=4,petals=6}={}){
 if(!['flower','daisy','leaf','heart','star','butterfly'].includes(kind)||![width,height,depth,petals].every(Number.isFinite)||width<3||width>180||height<3||height>180||depth<.5||depth>30||petals<3||petals>16)throw Error('Ukuran hiasan tidak sah.');
 const n=128,rings=14,p=[],idx=[],outline=[];for(let i=0;i<n;i++){const a=i*Math.PI*2/n;let x,y;if(kind==='heart'){x=Math.pow(Math.sin(a),3);y=(13*Math.cos(a)-5*Math.cos(2*a)-2*Math.cos(3*a)-Math.cos(4*a))/17}else{const rad=kind==='flower'||kind==='daisy'?.76+.24*Math.cos(Math.round(petals)*a):kind==='star'?.72+.28*Math.cos(5*a):kind==='butterfly'?.68+.32*Math.cos(4*a):1;x=Math.sin(a)*rad;y=Math.cos(a)*rad;if(kind==='leaf')x*=.65+.35*Math.sin(a)**2}outline.push([x*width/2,y*height/2])}
 // Outline samples above run clockwise. Reverse for outward-facing surfaces.
 outline.reverse();for(let j=0;j<rings;j++){const s=1-j/rings,z=.4+(depth-.4)*Math.sqrt(1-s*s);for(const[x,y]of outline)p.push(x*s,y*s,z)}const top=p.length/3;p.push(0,0,depth);const bottom=p.length/3;p.push(0,0,0);const bstart=p.length/3;for(const[x,y]of outline)p.push(x,y,0);
 for(let j=0;j<rings-1;j++)for(let i=0;i<n;i++){const a=j*n+i,b=j*n+(i+1)%n;idx.push(a,b,b+n,a,b+n,a+n)}for(let i=0;i<n;i++){const a=(rings-1)*n+i,b=(rings-1)*n+(i+1)%n;idx.push(a,b,top);const c=bstart+i,d=bstart+(i+1)%n;idx.push(c,bottom,d,c,d,(i+1)%n,c,(i+1)%n,i)}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(idx);g.computeVertexNormals();g.computeBoundingBox();return g;
}

export function lampGeometry(input){
 const supplied={...LAMP_DEFAULTS,...input};if(input.middleDiameter===undefined)delete supplied.middleDiameter;const p=studioParameters(supplied),support=legacyLampGeometry({...p,shape:'drum',ripple:0,twist:0,ribs:4,topDiameter:p.diameter});
 try{const shade=lampEnvelope(p),minimum=shade.userData.minimumInteriorRadius;
 if(p.source==='strip'&&p.postDiameter/2+p.stripHeight+5>minimum){shade.dispose();throw Error('Besarkan bukaan atau kecilkan tiang LED.');}
 if(p.source==='e27'&&(minimum<p.bulbDiameter/2+p.bulbGap||p.height<p.bulbHeight+p.bulbGap+3)){shade.dispose();throw Error('Ruang mentol tidak cukup untuk bentuk ini.');}
 support.shade.dispose();support.shade=shade;support.parameters=p;
 if(p.bottomMode==='closed')support.assemblyZ=p.baseHeight;
 return support;
 }catch(e){support.base.dispose();support.shade.dispose();throw e;}
}

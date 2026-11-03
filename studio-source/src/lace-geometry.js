import {solidEngine,geometryFromSolid} from './solid-union.js';
import {bookmarkBodyShape} from './bookmark-shapes.js';
export const LACE_PATTERNS=[['botanical','Ranting & daun'],['floral','Bunga daisy'],['geometric','Kekisi berlian'],['hearts','Hati berjalin'],['waves','Gelombang organik']];
export async function makeLaceBookmark(p){
 const {width:w,height:h,depth:d,frame,stroke,density,pattern,body='rounded',hole=4}=p;
 if(![w,h,d,frame,stroke,density,hole].every(Number.isFinite)||w<20||w>80||h<60||h>220||d<.6||d>2.4||frame<1||frame>4||stroke<.8||stroke>2.4||density<3||density>9||hole<2||hole>6||!LACE_PATTERNS.some(x=>x[0]===pattern))throw Error('Bookmark bercorak: lebar 20–80, panjang 60–220, tebal 0.6–2.4 mm.');
 const api=await solidEngine(),owned=[],own=x=>(owned.push(x),x),polys=[];
 const polygon=points=>own(new api.CrossSection([points],'NonZero'));
 const ellipse=(x,y,rx,ry,a=0)=>Array.from({length:48},(_,i)=>{const t=i*Math.PI/24,u=Math.cos(t)*rx,v=Math.sin(t)*ry;return[x+u*Math.cos(a)-v*Math.sin(a),y+u*Math.sin(a)+v*Math.cos(a)]});
 const seg=(a,b,t=stroke)=>{const len=Math.hypot(b[0]-a[0],b[1]-a[1]);if(len<1e-6)return;const x=-(b[1]-a[1])/len*t/2,y=(b[0]-a[0])/len*t/2;polys.push([[a[0]+x,a[1]+y],[a[0]-x,a[1]-y],[b[0]-x,b[1]-y],[b[0]+x,b[1]+y]])};
 const path=(pts,t=stroke)=>pts.slice(1).forEach((b,i)=>seg(pts[i],b,t));
 try{
 const outer=polygon(bookmarkBodyShape(body,w,h).getPoints(96).map(p=>[p.x,p.y])),inner=own(outer.offset(-frame,'Round',2,96)),rim=own(outer.subtract(inner)),safe=own(outer.offset(-frame,'Round',2,96));
 let hy=h/2-6;for(;hy>0;hy-=2){const c=polygon(ellipse(0,hy,hole/2,hole/2));if(own(safe.intersect(c)).area()>=Math.PI*(hole/2)**2*.995)break}
 const top=hy-hole/2-frame-2,bottom=-h/2+frame,span=top-bottom,count=Math.round(density),step=span/count;
 polys.push([[-w/2,hy-hole/2-frame],[w/2,hy-hole/2-frame],[w/2,hy+hole/2+frame],[-w/2,hy+hole/2+frame]]);
 const spine=y=>Math.sin((y-bottom)/span*Math.PI*2)*w*.1;
 if(['botanical','floral','hearts'].includes(pattern))path(Array.from({length:100},(_,i)=>{const y=bottom+(hy-bottom)*i/99;return[spine(y),y]}));
 if(pattern==='botanical')for(let i=0;i<count;i++){const y=bottom+step*(i+.5);for(const side of [-1,1]){const x=side*w*.22,yy=y+side*step*.12;seg([spine(y),y],[x,yy]);polys.push(ellipse(x,yy,w*.18,Math.min(step*.23,w*.11),side*.65))}}
 if(pattern==='floral')for(let i=0;i<count;i++){const y=bottom+step*(i+.5),x=(i%2?1:-1)*w*.1,r=Math.min(w*.3,step*.42);seg([spine(y),y],[x,y]);polys.push(ellipse(x,y,r*.3,r*.3));for(let k=0;k<6;k++){const a=k*Math.PI/3;polys.push(ellipse(x+Math.cos(a)*r*.63,y+Math.sin(a)*r*.63,r*.45,r*.24,a))}}
 if(pattern==='geometric')for(let i=-1;i<=count+1;i++){const y=bottom+i*step;path([[-w/2,y],[w/2,y+step*2]]);path([[-w/2,y+step*2],[w/2,y]])}
 if(pattern==='hearts')for(let i=0;i<count;i++){const y=bottom+step*(i+.5),r=Math.min(w*.025,step*.025),pts=Array.from({length:97},(_,j)=>{const a=j/96*Math.PI*2;return[16*Math.sin(a)**3*r,y+(13*Math.cos(a)-5*Math.cos(2*a)-2*Math.cos(3*a)-Math.cos(4*a))*r]});path(pts);seg([spine(y),y],[0,y])}
 if(pattern==='waves')for(let k=0;k<5;k++)path(Array.from({length:121},(_,i)=>{const y=bottom+(hy-bottom)*i/120;return[(k-2)*w*.17+Math.sin(i/120*Math.PI*count+k*.9)*w*.12,y]}));
 const art=own(new api.CrossSection(polys,'NonZero')),section=own(own(rim.add(art)).intersect(outer)),bore=polygon(ellipse(0,hy,hole/2,hole/2)),cut=own(section.subtract(bore)),solid=own(cut.extrude(d)),parts=solid.decompose();const components=parts.length;parts.forEach(p=>p.delete());if(components!==1)throw Error('Corak terpisah. Pilih badan bucu bulat atau besarkan ketebalan corak.');return{geometry:geometryFromSolid(solid),volume:solid.volume(),components,holeCenter:[0,hy],holes:cut.toPolygons().length-1};
 }finally{owned.reverse().forEach(x=>x.delete())}
}

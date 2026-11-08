import {arcPreviewPoints} from './sketch-edit-geometry.js';
const lastLayouts=new WeakMap();
// Screen-space annotation layout derived from the same sketch plane/parameters as CAD.
export function layoutDimensions({THREE,basis,camera,stage,overlay,svg,params:p}){
 const rect=stage.getBoundingClientRect(),b=basis(p),origin=new THREE.Vector3(...b.origin),xAxis=new THREE.Vector3(...b.x).normalize(),normal=new THREE.Vector3(...b.normal).normalize(),yAxis=normal.clone().cross(xAxis).normalize();
 const project=(x,y)=>{const v=origin.clone().addScaledVector(xAxis,x+(p.x||0)).addScaledVector(yAxis,y+(p.y||0)).project(camera);return{x:(v.x+1)*rect.width/2,y:(1-v.y)*rect.height/2,z:v.z};};
 const centre=project(0,0);if(centre.z < -1||centre.z>1){overlay.hidden=true;return;}overlay.hidden=false;
 const plans=[],shape=p.shape;
 if(shape==='arc'&&p.points?.length>=2){const [a,c]=p.points,mid=[(a[0]+c[0])/2,(a[1]+c[1])/2],points=arcPreviewPoints(a,c,p.sagitta??10);plans.push(['sagitta',mid,points[40],24,0]);}
 else if(shape==='circle')plans.push(['diameter',[-p.radius,0],[p.radius,0],0,25]);
 else if(shape==='annulus')plans.push(['outerDiameter',[-p.radius,0],[p.radius,0],-38,0],['innerDiameter',[-p.innerRadius,0],[p.innerRadius,0],38,0]);
 else if(shape==='rectangle'||shape==='ellipse'){const w=p.width||40,h=p.height||30;plans.push(['width',[-w/2,-h/2],[w/2,-h/2],30,0],['height',[w/2,-h/2],[w/2,h/2],30,0]);}
 else if(shape==='polygon')plans.push(['radius',[0,0],[p.radius,0],0,-24]);
 else if(shape==='polyline')for(let i=0;i<p.points.length-(p.closed?0:1);i++){const a=p.points[i],c=p.points[(i+1)%p.points.length];plans.push(['segmentLength:'+i,a,c,28,0],['segmentAngle:'+i,a,c,58,0]);}
 const obstacles=[];
 for(const id of ['context','selectionBar','viewCube','rail','quickSketchTools','sketchBar','utilityRail','workspaceModes','undoDock','worldReference [data-origin]']){
  const element=stage.querySelector('#'+id);if(!element||element.hidden)continue;const box=element.getBoundingClientRect();if(!box.width||!box.height)continue;
  obstacles.push({left:box.left-rect.left,right:box.right-rect.left,top:box.top-rect.top,bottom:box.bottom-rect.top});
 }
 const paths=[];
 for(const [key,aa,bb,offset,labelOffset]of plans){
  const a=project(...aa),b=project(...bb),dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy),label=overlay.querySelector('[data-dimension-label="'+key+'"]');if(!label)continue;
  label.hidden=len<8;if(label.hidden)continue;
  let nx=-dy/len,ny=dx/len;if(((a.x+b.x)/2-centre.x)*nx+((a.y+b.y)/2-centre.y)*ny<0){nx=-nx;ny=-ny;}
  let ax=a.x+nx*offset,ay=a.y+ny*offset,bx=b.x+nx*offset,by=b.y+ny*offset;
  const along=shape==='annulus'?(key==='outerDiameter'?1:-1)*Math.min(80,len*.2):0;
  const desiredX=(ax+bx)/2+nx*labelOffset+dx/len*along,desiredY=(ay+by)/2+ny*labelOffset;
  const hw=Math.max(40,label.offsetWidth/2),hh=Math.max(18,label.offsetHeight/2);
  const clampX=x=>Math.max(hw+8,Math.min(rect.width-hw-8,x)),clampY=y=>Math.max(60+hh,Math.min(rect.height-hh-12,y));
  const xs=[clampX(desiredX),...obstacles.flatMap(o=>[clampX(o.left-hw-8),clampX(o.right+hw+8)])],ys=[clampY(desiredY),...obstacles.flatMap(o=>[clampY(o.top-hh-8),clampY(o.bottom+hh+8)])];
  let lx=xs[0],ly=ys[0],best=Infinity;
  // Resolve all obstacles together. Moving away from the bottom dock must
  // not put the same label back over the contextual toolbar above it.
  for(const x of xs)for(const y of ys){
   const score=(x-desiredX)**2+(y-desiredY)**2;if(score>=best)continue;
   if(obstacles.some(o=>x+hw>o.left-6&&x-hw<o.right+6&&y+hh>o.top-6&&y-hh<o.bottom+6))continue;
   best=score;lx=x;ly=y;
  }
  obstacles.push({left:lx-hw,right:lx+hw,top:ly-hh,bottom:ly+hh});
  const correction=(lx-desiredX)*nx+(ly-desiredY)*ny;ax+=nx*correction;ay+=ny*correction;bx+=nx*correction;by+=ny*correction;
  if(!key.startsWith('segmentAngle:'))paths.push('<path class="dimensionExtension" d="M'+a.x+' '+a.y+'L'+(ax+nx*6)+' '+(ay+ny*6)+'M'+b.x+' '+b.y+'L'+(bx+nx*6)+' '+(by+ny*6)+'"/><path class="dimensionMeasure" data-measure="'+key+'" marker-start="url(#dimensionArrow)" marker-end="url(#dimensionArrow)" d="M'+ax+' '+ay+'L'+bx+' '+by+'"/>');
  label.style.left=lx+'px';label.style.top=ly+'px';
 }
 const markup='<defs><marker id="dimensionArrow" viewBox="0 0 6 6" refX="3" refY="3" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M6 3 0 0 0 6Z" fill="currentColor"/></marker></defs>'+paths.join('');
 svg.setAttribute('viewBox','0 0 '+rect.width+' '+rect.height);if(lastLayouts.get(svg)!==markup){svg.innerHTML=markup;lastLayouts.set(svg,markup);}
 const focus=document.activeElement?.closest?.('[data-dimension-label]')||overlay.querySelector('[data-dimension-label]:not([hidden])'),confirm=overlay.querySelector('button');
 if(confirm&&focus){confirm.style.left=Math.min(rect.width-30,parseFloat(focus.style.left)+58)+'px';confirm.style.top=focus.style.top;}
}

// Shared parametric envelope and XYZ path geometry. Motion/serialization lives in lamp-motion.js.
export const STUDIO_SHAPES=['drum','cone','vase','hourglass','twist','square','lantern'];
export const STUDIO_DEFAULTS={middleDiameter:120,tiers:4,bulge:33,ribDepth:2,bottomMode:'open',bottomThickness:1.2,pathPattern:'shift',pathAmplitude:3,pathWaves:16,pathPitch:.8};
export function studioParameters(input={}){const p={diameter:90,topDiameter:65,height:110,wall:1.2,ribs:32,ripple:0,twist:0,...STUDIO_DEFAULTS,...input};if(input.middleDiameter===undefined)p.middleDiameter=input.shape==='hourglass'?Math.min(p.diameter,p.topDiameter)*.6:Math.max(p.diameter,p.topDiameter)*1.15;
for(const[k,lo,hi]of [['diameter',50,240],['middleDiameter',30,240],['topDiameter',20,240],['height',35,280],['wall',.6,4],['ribs',4,96],['ripple',0,12],['twist',-180,180],['tiers',2,6],['bulge',5,40],['ribDepth',0,3],['bottomThickness',.8,6],['pathAmplitude',0,3],['pathWaves',4,28],['pathPitch',.2,5]])if(!Number.isFinite(p[k])||p[k]<lo||p[k]>hi)throw Error('Ukuran lampu tidak sah: '+k);
for(const k of ['ribs','tiers','pathWaves'])if(!Number.isInteger(p[k]))throw Error('Bilangan mesti bulat: '+k);
if(!STUDIO_SHAPES.includes(p.shape)||!['open','closed'].includes(p.bottomMode)||!['spiral','wave','shift'].includes(p.pathPattern))throw Error('Pilihan Lamp Studio tidak sah.');return p;}
export function studioRadius(p,v,theta){const collar=5,blend=Math.max(0,Math.min(1,(v*p.height-collar)/7)),u=Math.max(0,(v*p.height-collar)/(p.height-collar));let r;
if(p.shape==='drum')r=p.diameter/2;else if(p.shape==='cone')r=(p.diameter+(p.topDiameter-p.diameter)*u)/2;else {const a=u<.5?p.diameter:p.middleDiameter,b=u<.5?p.middleDiameter:p.topDiameter,t=u<.5?u*2:(u-.5)*2;r=(a+(b-a)*(1-Math.cos(Math.PI*t))/2)/2;}
if(p.shape==='twist')r*=.87+.13*Math.cos(6*(theta-u*p.twist*Math.PI/180));
if(p.shape==='square'||p.shape==='lantern'){const a=theta-(p.shape==='square'?u*p.twist*Math.PI/180:0);r*=(Math.abs(Math.cos(a))**4+Math.abs(Math.sin(a))**4)**(-.25)/2**.25;}
if(p.shape==='lantern')r*=1-p.bulge/100+p.bulge/100*Math.sin(Math.PI*p.tiers*u)**2;
r+=(p.shape==='lantern'?p.ribDepth:p.ripple)*Math.cos(p.ribs*(theta-(p.shape==='lantern'?0:u*p.twist*Math.PI/180)));
return p.diameter/2*(1-blend)+r*blend;
}
export function studioToolpath(input,options={}){const p=studioParameters(input),points=[],floor=p.bottomMode==='closed'?p.bottomThickness:0;
const n=Math.min(300000,Math.ceil((p.height-floor)/p.pathPitch*Math.max(128,p.ribs*12,p.pathWaves*32))),turns=(p.height-floor)/p.pathPitch;
if(p.bottomMode==='closed'){const layers=Math.ceil(floor/(options.layerHeight||.4)),coils=p.diameter/2/(options.lineWidth?options.lineWidth*.9:.8);for(let j=0;j<layers;j++){for(let k=0;k<=Math.ceil(coils*96);k++){const u=k/Math.ceil(coils*96),a=u*coils*Math.PI*2,r=studioRadius(p,0,a)*u;points.push({x:r*Math.cos(a),y:r*Math.sin(a),z:(j+1)*floor/layers,extrude:k>0,stage:'Tapak'});}}}
for(let k=0;k<=n;k++){const v=k/n,a=v*turns*Math.PI*2,r=studioRadius(p,v,a),span=p.height-floor,A=p.pathPattern==='spiral'?0:p.pathAmplitude,fade=Math.min(1,v*span/(2*A+.8),(1-v)*span/(2*A+.8)),z=floor+v*span+A*fade*Math.sin((p.pathWaves+(p.pathPattern==='shift'?.5:0))*a);points.push({x:r*Math.cos(a),y:r*Math.sin(a),z,extrude:k>0,stage:'Dinding'});}return points;}

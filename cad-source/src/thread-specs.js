// ISO metric basic 60° flat profile, dimensions in millimetres.
// NBK technical table: https://www.nbk1560.com/images/en-US/product/technical_data/meternezi_NBK/meternezi_NBK_1.pdf
export const METRIC_THREADS=[
 [3,.5,[.35]],[4,.7,[.5]],[5,.8,[.5]],[6,1,[.75,.5]],[8,1.25,[1,.75]],[10,1.5,[1.25,1]],[12,1.75,[1.5,1.25]],[14,2,[1.5]],[16,2,[1.5]],[18,2.5,[2,1.5]],[20,2.5,[2,1.5]],[22,2.5,[2,1.5]],[24,3,[2,1.5]],[27,3,[2,1.5]],[30,3.5,[2,1.5]],[36,4,[3,2]]
].map(([diameter,pitch,fine])=>({name:'M'+diameter,diameter,pitch,fine}));
export const BASIC_DEPTH=.5412658773652742;
export function autoThread(cylinder,settings={}){
 const internal=cylinder.internal,actual=2*cylinder.radius;
 let candidates=METRIC_THREADS.flatMap(s=>[s.pitch,...s.fine].map(pitch=>({...s,pitch,stock:internal?s.diameter-2*BASIC_DEPTH*pitch:s.diameter})));
 candidates.sort((a,b)=>Math.abs(a.stock-actual)-Math.abs(b.stock-actual));const match=candidates[0],standard=Math.abs(match.stock-actual)<.02;
 const pitch=standard?match.pitch:METRIC_THREADS.reduce((a,b)=>Math.abs(b.diameter-actual)<Math.abs(a.diameter-actual)?b:a).pitch;
 return{size:standard?match.name:'Custom',diameter:standard?match.diameter:actual+(internal?2*BASIC_DEPTH*pitch:0),pitch,kind:internal?'Internal':'External',length:Math.min(cylinder.max-cylinder.min,Number(settings.threadLength)||10),offset:0,end:'End',hand:settings.threadHand==='Left'?'Left':'Right'};
}
export function threadDimensions(p,c){
 const finite=(value,label,min,max)=>{const n=Number(value);if(!Number.isFinite(n)||n<min||n>max)throw Error(`${label} must be between ${min} and ${max} mm`);return n;};
 const diameter=finite(p.diameter,'Nominal diameter',.5,200),pitch=finite(p.pitch,'Pitch',.1,10),length=finite(p.length,'Thread length',.1,200),offset=finite(p.offset??0,'Start offset',0,2000);
 if(!['Internal','External'].includes(p.kind)||!['Right','Left'].includes(p.hand)||!['Start','End'].includes(p.end))throw Error('Choose thread type, end and handedness');
 if((p.kind==='Internal')!==c.internal)throw Error('Thread type must match the selected outer cylinder or inner bore');
 const depth=BASIC_DEPTH*pitch,minor=diameter-2*depth;
 if(minor<=.1||pitch>diameter/2)throw Error('Pitch is too large for this diameter');
 const standard=METRIC_THREADS.find(s=>s.name===p.size);if(p.size!=='Custom'&&(!standard||Math.abs(standard.diameter-diameter)>1e-6||![standard.pitch,...standard.fine].some(v=>Math.abs(v-pitch)<1e-6)))throw Error('Choose a listed metric size/pitch or Custom');
 const stock=p.kind==='Internal'?minor:diameter;
 if(Math.abs(2*c.radius-stock)>.02)throw Error(`Selected face is Ø${(2*c.radius).toFixed(3)} mm; ${p.kind==='Internal'?'bore':'stock'} for this thread must be Ø${stock.toFixed(3)} mm. Resize the cylinder or choose Custom.`);
 if(offset+length>c.max-c.min+.001)throw Error('Thread length and offset exceed the selected cylindrical face');
 if(length/pitch>40)throw Error('Use a shorter thread: maximum 40 turns per feature');
 const start=p.end==='Start'?c.min+offset:c.max-offset-length;
 return{diameter,pitch,length,offset,depth,minor,start,internal:c.internal,left:p.hand==='Left'};
}

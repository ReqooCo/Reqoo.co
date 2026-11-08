import {setToolValue,setToolChoice,setToolToggle,toolField,applyTool,cancelTool} from './canvas-tool-flow.mjs';
import {openToolMenu} from './sketch-flow.mjs';
import {beginSketch,createSketch} from './sketch-flow.mjs';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {sketchGuidepoints,nearestGuidepoint} from '../src/guidepoints.js';
import {connectedSketchIds} from '../src/sketch-connectivity.js';
// Offset Chain: connected segments, branching, isolated and different planes.
{
 const plane={origin:[0,0,0],x:[1,0,0],normal:[0,0,1]},other={origin:[0,0,1],x:[1,0,0],normal:[0,0,1]};
 const edge=(a,b)=>({lines:[...a,...b]});
 const sketch=(id,a,b,sketchPlane=plane)=>({id,kind:'sketch',sketchPlane,edges:[edge(a,b)]});
 const chain=[sketch('a',[0,0,0],[1,0,0]),sketch('b',[1,0,0],[2,0,0]),sketch('c',[2,0,0],[3,0,0]),sketch('branch',[1,0,0],[1,1,0]),sketch('isolated',[8,0,0],[9,0,0]),sketch('other-plane',[3,0,0],[4,0,0],other)];
 assert.deepEqual(new Set(connectedSketchIds(chain,'a')),new Set(['a','b','c','branch']));
 assert.deepEqual(connectedSketchIds(chain,'isolated'),['isolated']);
 assert.deepEqual(connectedSketchIds(chain,'missing'),[]);
 assert.deepEqual(connectedSketchIds([...chain,{id:'solid',kind:'body',sketchPlane:plane,edges:[edge([0,0,0],[1,0,0])]}],'solid'),[],'Offset Chain must reject solid-body seeds');
 assert.deepEqual(connectedSketchIds([...chain,{...sketch('region',[0,0,0],[1,0,0]),regionHost:'host'}],'region'),[],'Offset Chain must reject derived region seeds');
 const long=Array.from({length:250},(_,i)=>sketch('segment-'+i,[i,0,0],[i+1,0,0]));
 assert.equal(connectedSketchIds(long,'segment-0').length,250,'Offset Chain traverses a long linked sketch without dropping members');
 const stress=Array.from({length:3000},(_,i)=>sketch('stress-'+i,[i,0,0],[i+1,0,0]));
 assert.equal(connectedSketchIds(stress,'stress-0').length,3000,'Offset Chain spatial index handles 3000 connected edges');
 const negative=[sketch('negative-a',[-2,0,0],[-1,0,0]),sketch('negative-b',[-1+0.000004,0,0],[0,0,0])];
 assert.deepEqual(new Set(connectedSketchIds(negative,'negative-a')),new Set(['negative-a','negative-b']),'Offset Chain joins near endpoints across negative grid cell boundaries');
 const malformed=[sketch('valid',[0,0,0],[1,0,0]),{...sketch('invalid',[1,0,0],[2,0,0]),edges:[{lines:[NaN,0,0,2,0,0]}]}];
 assert.deepEqual(connectedSketchIds(malformed,'valid'),['valid'],'Offset Chain ignores non-finite endpoint coordinates');
 const near=[sketch('near-a',[0,0,0],[1,0,0]),sketch('near-b',[1+0.000004,0,0],[2,0,0]),sketch('far',[2+0.00002,0,0],[3,0,0])];
 assert.deepEqual(new Set(connectedSketchIds(near,'near-a')),new Set(['near-a','near-b']),'Offset Chain joins endpoints within tolerance but not beyond it');
 const reversed=[sketch('reverse-a',[0,0,0],[1,0,0]),sketch('reverse-b',[2,0,0],[1,0,0])];
 assert.deepEqual(new Set(connectedSketchIds(reversed,'reverse-a')),new Set(['reverse-a','reverse-b']),'Offset Chain supports reversed segment direction');
}

// Geometry snap regressions run before browser startup.
{
 const plane={origin:[0,0,0],x:[1,0,0],normal:[0,0,1]};
 const edge=(a,b)=>({type:'LINE',lines:[...a,...b],center:[0,0,0]});
 const item={id:'test',name:'Lines',edges:[edge([-10,0,0],[10,0,0]),edge([5,-10,0],[5,10,0]),edge([2,2,3],[8,8,3])],faceInfo:[]};
 const pts=sketchGuidepoints([item],plane);
 const midpointOnly=sketchGuidepoints([{...item,edges:[edge([20,0,0],[40,0,0])]}],plane);
 assert.ok(pts.some(p=>p.kind==='intersection'&&Math.abs(p.point[0]-5)<1e-8&&Math.abs(p.point[1])<1e-8),'Coplanar crossing must snap');
 assert.ok(midpointOnly.some(p=>p.kind==='midpoint'&&Math.abs(p.point[0]-30)<1e-8&&Math.abs(p.point[1])<1e-8),'Midpoint must use edge endpoints');
 assert.ok(!pts.some(p=>p.kind==='intersection'&&Math.abs(p.point[0]-5)<1e-8&&Math.abs(p.point[1]-5)<1e-8),'Out-of-plane lines must not intersect the sketch');
 assert.equal(nearestGuidepoint([0,0],pts,1)?.kind,'origin','Origin wins coincident snap priority');
 const originless=pts.filter(p=>p.kind!=='origin');
 assert.equal(nearestGuidepoint([5,0],originless,1)?.kind,'intersection','Crossing is selected as intersection');
 assert.equal(nearestGuidepoint([100,100],pts,1),null,'Distant point must not snap');
}

import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
const baseURL=process.env.CAD_TEST_URL||'http://127.0.0.1:4175/';
const root=path.resolve(process.env.CAD_BUILD_DIR||'dist'),out=path.resolve('test-results');await fs.mkdir(out,{recursive:true});
const server=http.createServer(async(req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=path.resolve(root,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));if(!file.startsWith(root+path.sep))throw Error('path');const bytes=await fs.readFile(file),ext=path.extname(file);res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.css':'text/css','.wasm':'application/wasm','.txt':'text/plain'})[ext]||'application/octet-stream'});res.end(bytes);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(4175,'127.0.0.1',r));const browser=await chromium.launch({headless:true});let page;const checks=[];
function approx(a,b,tolerance=1e-4){assert.ok(Math.abs(a-b)<tolerance,JSON.stringify({actual:a,expected:b}));}
try{
 const context=await browser.newContext({viewport:{width:1440,height:900},acceptDownloads:true});page=await context.newPage();const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error('APP ERROR',e.message);});page.setDefaultTimeout(45000);
 await page.goto(baseURL+'?test=1');await page.waitForFunction(()=>window.__cad?.ready(),{},{timeout:90000});for(const id of ['itemsToggle','nav-search','nav-sketch','nav-add','nav-construct','nav-transform','nav-tools'])assert.equal(await page.locator('#'+id).count(),1);assert.equal(await page.locator('#toolPanel').isVisible(),false);assert.equal(await page.locator('#sidebar').isVisible(),false);assert.equal(await page.getByText(/generator/i).count(),0);
 assert.equal(await page.locator('#nav-sketch').isVisible(),false);assert.equal(await page.locator('#nav-tools').isVisible(),true);await page.screenshot({path:path.join(out,'01-cad-empty.png')});checks.push('Independent CAD workspace; no generator or legacy editor');
 await createSketch(page,{width:30,height:20});
 await page.evaluate(()=>window.__cad.activateSketchTrim());
 await page.locator('#sketchTrimHUD').getByRole('button',{name:'Done trimming'}).waitFor({state:'visible'});
 await page.locator('#sketchTrimHUD').getByRole('button',{name:'Done trimming'}).click();
 assert.equal(await page.locator('#sketchTrimHUD').isVisible(),false,'Trim Done exits Trim mode');
 checks.push('Sketch Trim enters and exits through its visible Done control');
 await page.locator('#modeSolid').click();await page.locator('#context').getByRole('button',{name:'Extrude',exact:true}).click();await page.locator('#faceDistanceValue').fill('10');await page.locator('#faceDistanceApply').click();await page.waitForFunction(()=>window.__cad.items.some(i=>i.kind==='body'));
 let bodies=await page.evaluate(()=>window.__cad.items.filter(i=>i.kind==='body'));approx(bodies[0].volume,6000);assert.equal(bodies[0].faceInfo.length,6);assert.ok(bodies[0].mesh.faceGroups.every(g=>g.faceIndex>=0));assert.ok(bodies[0].edges.every(e=>e.length>0));checks.push('UI rectangle sketch → actual B-rep extrude, 6000 mm³ and six selectable faces');
 await page.evaluate(()=>window.__cad.view('top'));await page.locator('#fit').click();const click=await page.evaluate(()=>{const p=window.__cad.camera.position.clone().set(0,0,10).project(window.__cad.camera),r=document.querySelector('#canvas').getBoundingClientRect();return{x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2};});await page.mouse.click(click.x,click.y);assert.equal(await page.evaluate(()=>window.__cad.selection[0]?.kind),'face');checks.push('Canvas hit test selects true face, not a triangle-only body');
 assert.equal(await page.locator('#context').getByRole('button',{name:'Sketch on face'}).count(),1);assert.equal(await page.locator('#context').getByRole('button',{name:'Pull / Offset Face'}).count(),1);await page.locator('#context').getByRole('button',{name:'Sketch on face'}).click();assert.equal(await page.locator('#modeSketch').getAttribute('aria-pressed'),'true');assert.ok(await page.evaluate(()=>window.__cad.gizmo.sketchPlane));assert.equal(await page.locator('#toolPanel').isVisible(),false);await page.keyboard.press('Escape');await page.locator('#modeSolid').click();checks.push('Selected planar face opens face-based sketch without losing the selected face');
 await page.locator('#historyToggle').click();await page.locator('.historyRow').first().click();await setToolValue(page,'width','40');await page.getByRole('button',{name:'Update feature',exact:true}).click();await page.waitForFunction(()=>Math.abs(window.__cad.items.find(i=>i.kind==='body')?.volume-8000)<.001);await page.locator('#undo').click();await page.waitForFunction(()=>Math.abs(window.__cad.items.find(i=>i.kind==='body')?.volume-6000)<.001);await page.locator('#redo').click();await page.waitForFunction(()=>Math.abs(window.__cad.items.find(i=>i.kind==='body')?.volume-8000)<.001);checks.push('Editable sketch history rebuilds downstream solid; undo/redo reconstructs the actual kernel model');await page.locator('#historyToggle').click();await page.evaluate(()=>window.__cad.view('iso'));await page.screenshot({path:path.join(out,'02-sketch-extrude-history.png')});
 const stepDownload=page.waitForEvent('download');await page.locator('#exportTop').click();await page.getByRole('button',{name:'Export STEP',exact:true}).click();const stepFile=await(await stepDownload).path(),step=await fs.readFile(stepFile,'utf8');assert.ok(step.includes('ISO-10303-21'));assert.ok(/ADVANCED_FACE|MANIFOLD_SOLID_BREP/.test(step));await fs.writeFile(path.join(out,'verified-solid.step'),step);
 const stlDownload=page.waitForEvent('download');await page.locator('#exportTop').click();await page.getByRole('button',{name:'Export STL',exact:true}).click();const stl=await fs.readFile(await(await stlDownload).path());assert.ok(stl.length>84);checks.push('UI STEP and STL export from native solid');await page.mouse.click(700,100);
 await page.reload();await page.waitForFunction(()=>window.__cad?.ready()&&window.__cad.items.length>0,{},{timeout:90000});approx(await page.evaluate(()=>window.__cad.items.find(i=>i.kind==='body').volume),8000);checks.push('Local project recovery reconstructs the feature graph');
 const base=()=>({format:'reqoo-cad',version:1,title:'QA',features:[],ui:{hidden:[],colors:{}}});
 const reset=async()=>page.evaluate(d=>window.__cad.rebuild(d,{history:false}),base());
 const apply=async(type,params,inputs=[])=>page.evaluate(({type,params,inputs})=>window.__cad.apply(type,params,inputs),{type,params,inputs});
 const data=async()=>page.evaluate(()=>window.__cad.items);
 const box=async(params={})=>apply('box',{width:30,depth:20,height:10,...params});
 await reset();let a=await box(),b=await box({x:15});assert.equal((await data()).length,2);let id=await apply('union',{},[a,b]);approx((await data())[0].volume,9000);checks.push('Adding a body preserves the previous body; native union');
 // Three overlapping operands must merge into one selectable solid.
 await reset();a=await box();b=await box({x:15});const c=await box({x:30});
 await apply('union',{},[a,b,c]);
 const merged=(await data()).filter(i=>i.kind==='body');
 assert.equal(merged.length,1,'Three-body Union must produce one selectable body');
 approx(merged[0].volume,12000,.01);
 checks.push('Three-body Union combines all selected operands into one valid solid');
 // Verify the human-facing Boolean flow: preselected bodies, clear count, one Done action.
 await reset();a=await box();b=await box({x:15});
 await page.evaluate(ids=>{window.__cad.select(ids.map(id=>({id,kind:'body'})));window.__cad.startTool('union');},[a,b]);
 assert.equal(await page.locator('#booleanBar output').textContent(),'2 bodies selected');
 assert.equal(await page.locator('#booleanBar button[aria-label="Apply Union"]').isEnabled(),true);
 await page.locator('#booleanBar button[aria-label="Apply Union"]').click();
 await page.waitForFunction(()=>window.__cad.items.filter(i=>i.kind==='body').length===1);
 approx((await data())[0].volume,9000,.01);
 checks.push('Boolean Union UI uses preselected bodies and commits through Done');
 // Real canvas taps must extend and toggle body selection inside the Boolean session.
 await reset();a=await box();b=await box({x:15});
 await page.evaluate(()=>window.__cad.view('top'));await page.locator('#fit').click();
 const tapWorld=async(x,y=0)=>{const point=await page.evaluate(({x,y})=>{const p=window.__cad.camera.position.clone().set(x,y,10).project(window.__cad.camera),r=document.querySelector('#canvas').getBoundingClientRect();return{x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2};},{x,y});await page.mouse.click(point.x,point.y);};
 await page.evaluate(()=>{window.__cad.select([]);window.__cad.startTool('union');});
 assert.equal(await page.locator('#booleanBar output').textContent(),'0 bodies selected');
 await tapWorld(-10);assert.equal(await page.locator('#booleanBar output').textContent(),'1 bodies selected');
 await tapWorld(25);assert.equal(await page.locator('#booleanBar output').textContent(),'2 bodies selected');
 await page.waitForTimeout(450);await tapWorld(25);console.log('BOOLEAN_TOGGLE_DEBUG',JSON.stringify(await page.evaluate(()=>({selection:window.__cad.selection,bar:document.querySelector('#booleanBar output')?.textContent,mode:document.querySelector('#pickMode')?.value}))));assert.equal(await page.locator('#booleanBar output').textContent(),'1 bodies selected');
 await tapWorld(25);assert.equal(await page.locator('#booleanBar output').textContent(),'2 bodies selected');
 await page.locator('#booleanBar button[aria-label="Apply Union"]').click();
 await page.waitForFunction(()=>window.__cad.items.filter(i=>i.kind==='body').length===1);
 approx((await data())[0].volume,9000,.01);
 checks.push('Canvas tap multi-select toggles Boolean operands and commits Union');
 for(const [operation,expected]of [['subtract',3000],['intersect',3000]]){await reset();a=await box();b=await box({x:15});await apply(operation,{},[a,b]);approx((await data())[0].volume,expected);checks.push('Native '+operation+' volume verified');}
 for(const type of ['fillet','chamfer']){await reset();a=await box();await apply(type,{radius:1,allEdges:true},[a]);const item=(await data())[0];assert.ok(item.volume>0&&item.volume<6000);assert.ok(item.faceInfo.length>6);checks.push(type+' changes B-rep topology and volume');await page.screenshot({path:path.join(out,'03-'+type+'.png')});}
 await reset();a=await box();let item=(await data())[0],top=item.faceInfo.find(f=>f.normal[2]>.99).index;await apply('shell',{face:top,thickness:2},[a]);approx((await data())[0].volume,2672,.001);checks.push('Shell removes selected face and creates actual 2 mm walls');
 await reset();a=await box();item=(await data())[0];top=item.faceInfo.find(f=>f.normal[2]>.99).index;await apply('offsetFace',{face:top,distance:5},[a]);approx((await data())[0].volume,9000,.001);checks.push('Selected planar face extension is a real fused solid');
 // Regression: repeatedly extrude the newly generated top face, not a stale face index.
 await reset();a=await box();
 for(const [distance,expected] of [[5,9000],[3,10800]]){
  item=(await data())[0];top=item.faceInfo.find(f=>f.type==='PLANE'&&f.normal[2]>.99).index;
  a=await apply('extrude',{face:top,distance,operation:'Add'},[a]);
  approx((await data())[0].volume,expected,.01);
 }
 checks.push('Repeated face Extrude Add rebuilds a valid solid from the latest top face');
 // UI regression: the next planar face must launch Extrude from the context toolbar.
 await reset();a=await box();await page.evaluate(()=>window.__cad.view('top'));await page.locator('#fit').click();
 const faceClick=await page.evaluate(()=>{const p=window.__cad.camera.position.clone().set(0,0,10).project(window.__cad.camera),r=document.querySelector('#canvas').getBoundingClientRect();return{x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2};});
 await page.mouse.click(faceClick.x,faceClick.y);
 assert.equal(await page.evaluate(()=>window.__cad.selection.at(-1)?.kind),'face');
 await page.locator('#context').getByRole('button',{name:'Extrude',exact:true}).click();
 assert.equal(await page.locator('[aria-label="Extrude operation"]').inputValue(),'Add','Existing face must default to Add, not New body');
 assert.equal(await page.locator('[aria-label="Extrude target body"]').inputValue(),a,'Existing face must target its owning body');
 await page.locator('#faceDistanceValue').fill('5');await page.locator('#faceDistanceApply').click();
 await page.waitForFunction(()=>!document.body.classList.contains('busy'),{},{timeout:15000});
 const firstUiExtrude=await page.evaluate(()=>({volume:window.__cad.items.find(i=>i.kind==='body')?.volume,selection:window.__cad.selection,features:window.__cad.doc.features.slice(-2).map(f=>({type:f.type,params:f.params,inputs:f.inputs})),status:document.querySelector('#status')?.textContent}));
 console.log('FIRST_FACE_EXTRUDE_DIAGNOSTIC',JSON.stringify(firstUiExtrude));
 approx(firstUiExtrude.volume,9000,.01);
 checks.push('Planar-face UI Extrude on existing solid produces 9000 mm³');
 // Human workflow: after commit, the next face remains discoverable and Extrude is reachable again.
 await page.mouse.click(faceClick.x,faceClick.y);
 assert.equal(await page.evaluate(()=>window.__cad.selection.at(-1)?.kind),'face','Second face tap must select a face, not the whole body');
 assert.equal(await page.locator('#context').getByRole('button',{name:'Extrude',exact:true}).count(),1,'Extrude must remain discoverable after the first commit');
 await page.locator('#context').getByRole('button',{name:'Extrude',exact:true}).click();
 await page.locator('#faceDistanceValue').fill('3');await page.locator('#faceDistanceApply').click();
 await page.waitForFunction(()=>Math.abs(window.__cad.items.find(i=>i.kind==='body')?.volume-10800)<.01);
 checks.push('Human flow: select face → Extrude → select new face → Extrude without sketch reset');
 // Downstream compatibility: fillet must accept the body produced by consecutive face pulls.
 const pulled=await data();assert.equal(pulled.filter(i=>i.kind==='body').length,1,'Two face pulls must leave one editable solid');
 const pulledId=pulled.find(i=>i.kind==='body').id;
 await apply('fillet',{radius:1,allEdges:true},[pulledId]);
 const rounded=(await data()).find(i=>i.kind==='body');
 assert.ok(rounded?.volume>0&&rounded.volume<10800,'Fillet after repeated face Extrude must generate a valid rounded solid');
 checks.push('Repeated face Extrude → Fillet preserves one valid downstream solid');
 // Editing an upstream feature must regenerate both face pulls and the final Fillet.
 await page.locator('#historyToggle').click();
 await page.locator('.historyRow').first().click();
 await setToolValue(page,'width','40');
 await page.getByRole('button',{name:'Update feature',exact:true}).click();
 // Wait for the actual edited feature and rebuilt body; the busy flag alone can race.
 await page.waitForFunction(()=>{
  const source=window.__cad.doc.features.find(f=>f.type==='box');
  const solid=window.__cad.items.find(i=>i.kind==='body');
  return source?.params.width===40&&solid?.volume>0&&!document.body.classList.contains('busy');
 },{},{timeout:30000});
 const resized=(await data()).filter(i=>i.kind==='body');
 assert.equal(resized.length,1,'Dimension edit after Fillet must keep one solid');
 assert.ok(resized[0].volume>rounded.volume,'Wider upstream box must rebuild downstream Extrude and Fillet');
 checks.push('Upstream dimension edit regenerates two face Extrudes and downstream Fillet');
 await page.locator('#historyToggle').click();
 await reset();a=await apply('sketch',{shape:'rectangle',width:10,height:20,x:25,y:0,plane:'XZ'},[]);await apply('revolve',{axis:'Z',angle:360},[a]);approx((await data())[0].volume,10000*Math.PI,.01);checks.push('Revolve preserves analytic cylindrical volume');
 await reset();a=await apply('sketch',{shape:'circle',radius:10,plane:'XY',offset:0});b=await apply('sketch',{shape:'circle',radius:5,plane:'XY',offset:20});await apply('loft',{},[a,b]);approx((await data())[0].volume,Math.PI*20*175/3,.05);checks.push('Loft builds a real closed tapered solid between profiles');
 await reset();a=await apply('sketch',{shape:'polyline',points:[[0,0],[0,30]],closed:false,plane:'XY'});await apply('sweep',{radius:2},[a]);approx((await data())[0].volume,Math.PI*120,.01);checks.push('Round-profile sweep follows an open sketch path');
 await reset();a=await apply('torus',{radius:25,tube:5});approx((await data())[0].volume,1250*Math.PI**2,.1);checks.push('Analytic torus');
 await reset();a=await box();await apply('split',{plane:'XY',offset:5},[a]);const parts=await data();assert.equal(parts.length,2);for(const p of parts)approx(p.volume,3000);checks.push('Split Body creates two independently selectable solids');
 await reset();a=await box();a=await apply('move',{x:30,y:0,z:0},[a]);a=await apply('rotate',{axis:'Z',angle:90},[a]);a=await apply('mirror',{plane:'YZ'},[a]);a=await apply('scale',{factor:2},[a]);approx((await data())[0].volume,48000,.001);checks.push('Move/Rotate/Mirror/Scale preserve analytic solids');
 await apply('pattern',{count:3,x:100,y:0,z:0},[a]);approx((await data())[0].volume,144000,.01);checks.push('Linear pattern retains solid components');
 await reset();a=await box({x:50});await apply('circularPattern',{count:4,angle:360,axis:'Z'},[a]);approx((await data())[0].volume,24000,.01);checks.push('Circular pattern');
 await reset();a=await apply('import',{step},[]);approx((await data())[0].volume,8000,.01);checks.push('Exported STEP imports back as a native solid with matching volume');
 let prior=await page.evaluate(()=>JSON.stringify(window.__cad.doc));const rejected=await page.evaluate(async()=>{try{await window.__cad.apply('box',{width:-1,depth:20,height:10},[]);return false;}catch{return true;}});assert.equal(rejected,true);assert.equal(await page.evaluate(()=>JSON.stringify(window.__cad.doc)),prior);checks.push('Invalid operations leave completed model and history unchanged');
 await reset();a=await box();item=(await data())[0];const low=item.faceInfo.find(f=>f.normal[2]<-.99).index;top=item.faceInfo.find(f=>f.normal[2]>.99).index;const distance=await page.evaluate(({a,low,top})=>window.__cad.worker('measure',{refs:[{id:a,kind:'face',index:low},{id:a,kind:'face',index:top}]}),{a,low,top});approx(distance,10,.0001);checks.push('Exact minimum distance between two faces');
 await page.screenshot({path:path.join(out,'04-solid-cad-workspace.png')});

 // Constrained polyline uses the same solved coordinates for UI, kernel and saved history.
 await reset();const editable=await apply('sketch',{shape:'polyline',plane:'XY',closed:true,points:[[0,0],[29,1],[31,19],[-1,21]],constraints:[]});await page.evaluate(id=>window.__cad.startTool('sketch',{},id),editable);
 await setToolToggle(page,'lock:0',true);
 for(const [i,dir]of [[0,'horizontal'],[1,'vertical'],[2,'horizontal'],[3,'vertical']])await setToolChoice(page,'segment:'+i+':direction',dir);
 await setToolValue(page,'segment:0:length','30');await setToolValue(page,'segment:1:length','20');assert.equal(await page.locator('[data-gizmo-choice="segment:1:direction"]').isVisible(),true,'Segment length selection exposes constraints for the same segment');await page.getByRole('button',{name:'Solve constraints',exact:true}).click();
 assert.equal(await page.locator('[data-solve-status]').textContent(),'Fully constrained');await page.screenshot({path:path.join(out,'07-sketch-constraints.png')});
 await page.getByRole('button',{name:'Update feature',exact:true}).click();await page.waitForFunction(()=>window.__cad.items.some(i=>i.kind==='sketch'));
 assert.equal(await page.locator('#nav-tools').isVisible(),false);assert.equal(await page.locator('#exitSketch').isVisible(),true);assert.equal(await page.locator('#context').getByRole('button',{name:'Extrude',exact:true}).isVisible(),true);const sketchId=await page.evaluate(()=>window.__cad.doc.features[0].id);
 await page.locator('#modeSolid').click();await page.getByRole('button',{name:'Extrude',exact:true}).click();await page.locator('#faceDistanceValue').fill('10');await page.locator('#faceDistanceApply').click();await page.waitForFunction(()=>window.__cad.items.some(i=>i.kind==='body'));approx((await data()).find(i=>i.kind==='body').volume,6000,.001);
 await page.evaluate(id=>window.__cad.startTool('sketch',{},id),sketchId);await setToolValue(page,'segment:0:length','40');await page.getByRole('button',{name:'Update feature',exact:true}).click();await page.waitForFunction(()=>Math.abs(window.__cad.items.find(i=>i.kind==='body').volume-8000)<.01);
 prior=await page.evaluate(()=>JSON.stringify(window.__cad.doc));
 const conflict=await page.evaluate(async id=>{const d=JSON.parse(JSON.stringify(window.__cad.doc));d.features[0].params.constraints.push({type:'length',a:0,b:1,value:99});try{await window.__cad.rebuild(d);return false;}catch{return true;}},sketchId);assert.equal(conflict,true);assert.equal(await page.evaluate(()=>JSON.stringify(window.__cad.doc)),prior);
 checks.push('Constrained UI polyline solves to 30×20, extrudes 6000 mm³, dimension edit rebuilds 8000 mm³, conflict preserves project');


 // Native holes and coplanar sketch selection.
 for(const [extent,depth,expected]of [['Through all',10,6000-90*Math.PI],['Blind',4,6000-36*Math.PI]]){
  await reset();a=await box();item=(await data())[0];top=item.faceInfo.find(f=>f.normal[2]>.99).index;await apply('hole',{face:top,diameter:6,extent,depth},[a]);approx((await data())[0].volume,expected,.002);
 }checks.push('Through-all and blind holes have exact analytic removed volumes');
 await reset();a=await box();item=(await data())[0];const sideFace=item.faceInfo.find(f=>f.normal[0]>.99).index;await apply('hole',{face:sideFace,diameter:6,extent:'Through all'},[a]);approx((await data())[0].volume,6000-270*Math.PI,.002);checks.push('Hole uses the selected side-face normal, not a fixed Z direction');
 await reset();a=await box();b=await box({x:60});item=(await data()).find(i=>i.id===a);top=item.faceInfo.find(f=>f.normal[2]>.99).index;await apply('hole',{face:top,diameter:6},[a]);assert.equal((await data()).length,2);approx((await data()).find(i=>i.id===b).volume,6000);checks.push('Hole affects only the selected target body');
 await reset();a=await box();b=await apply('sketch',{shape:'circle',radius:3,plane:'XY',offset:10,x:0,y:0,hostBody:a});
 await page.locator('#itemsToggle').click();assert.equal(await page.locator('.objectGroup summary').count(),2);assert.ok((await page.locator('.objectGroup summary').allTextContents()).some(t=>t.includes('Sketches')));assert.ok((await page.locator('.objectGroup summary').allTextContents()).some(t=>t.includes('Solid bodies')));await page.locator('#itemsToggle').click();checks.push('Sketch and Solid modes expose separate tools; Items groups sketches and solid bodies');
 await page.evaluate(()=>window.__cad.view('top'));await page.locator('#fit').click();
 const screenPoint=async(x=0,y=0,z=10)=>page.evaluate(({x,y,z})=>{const p=window.__cad.camera.position.clone().set(x,y,z).project(window.__cad.camera),r=document.querySelector('#canvas').getBoundingClientRect();return{x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2};},{x,y,z});
 await page.locator('#modeSketch').click();await page.evaluate(()=>window.__cad.select([]));let cp=await screenPoint();await page.mouse.click(cp.x,cp.y);assert.equal(await page.evaluate(()=>window.__cad.selection[0]?.kind),'sketch');assert.equal(await page.evaluate(()=>window.__cad.selection[0]?.id),b);
 await page.getByRole('button',{name:'Select other',exact:true}).click();assert.ok(await page.locator('.selectionChoices').getByRole('button',{name:/face/i}).count()>0);await page.locator('.selectionChoices').getByRole('button',{name:/Sketch/}).click();
 await page.locator('#modeSolid').click();await page.waitForFunction(()=>!window.__cad.gizmo.busy);const regionBody=await page.evaluate(id=>window.__cad.items.find(i=>i.kind==='body'&&i.imprintProfiles?.includes(id)),b);assert.ok(regionBody);assert.equal(regionBody.faceInfo.length,7);await page.locator('#context').getByRole('button',{name:'Hole',exact:true}).click();assert.equal(await page.locator('#holeTarget').inputValue(),regionBody.id);assert.equal(await page.locator('#p-depth').isVisible(),false);
 await page.getByRole('button',{name:'Apply',exact:true}).click();await page.waitForFunction(()=>window.__cad.doc.features.at(-1)?.type==='hole');approx((await data())[0].volume,6000-90*Math.PI,.002);await page.evaluate(()=>window.__cad.view('iso'));await page.locator('#fit').click();await page.screenshot({path:path.join(out,'09-circle-through-hole.png')});checks.push('Tap circle on coplanar face selects sketch; Select other disambiguates; UI Hole cuts the native body');
 await reset();a=await box();cp=await screenPoint(5,2,10);await page.evaluate(()=>window.__cad.view('top'));await page.locator('#fit').click();cp=await screenPoint(5,2,10);await page.locator('#modeSolid').click();await page.mouse.click(cp.x,cp.y);assert.equal(await page.evaluate(()=>window.__cad.selection[0]?.kind),'face');await page.locator('#modeSolid').click();await page.locator('#context').getByRole('button',{name:'Hole',exact:true}).click();await setToolValue(page,'diameter','4');await setToolChoice(page,'extent','Blind');await setToolValue(page,'depth','4');await page.screenshot({path:path.join(out,'10-face-hole-controls.png')});await page.getByRole('button',{name:'Apply',exact:true}).click();await page.waitForFunction(()=>window.__cad.doc.features.at(-1)?.type==='hole');approx((await data())[0].volume,6000-16*Math.PI,.002);
 await page.locator('#undo').click();await page.waitForFunction(()=>window.__cad.doc.features.at(-1)?.type==='box');approx((await data())[0].volume,6000);await page.locator('#redo').click();await page.waitForFunction(()=>window.__cad.doc.features.at(-1)?.type==='hole');approx((await data())[0].volume,6000-16*Math.PI,.002);const holeFeature=await page.evaluate(()=>window.__cad.doc.features.at(-1).id);await page.evaluate(id=>window.__cad.startTool('hole',{},id),holeFeature);assert.equal(await page.locator('#holeTarget').inputValue(),a);await setToolValue(page,'depth','2');await page.getByRole('button',{name:'Update feature',exact:true}).click();await page.waitForFunction(()=>Math.abs(window.__cad.items[0].volume-(6000-8*Math.PI))<.002);checks.push('Tap face then Hole creates an off-centre blind hole; undo/redo and editing consumed target history rebuild accurately');
 await page.locator('#modeSolid').click();await openToolMenu(page,'tools');await page.waitForTimeout(50);assert.equal(await page.locator('#menu [data-tool]').count(),await page.locator('#menu [data-tool] svg').count());await page.screenshot({path:path.join(out,'11-icon-tools.png')});await page.locator('#modeSolid').click();await openToolMenu(page,'tools');

 assert.deepEqual(errors,[]);await context.close();
 // Touch-sized workspace starts clean and the real kernel runs in mobile emulation.
 const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});page=await mobile.newPage();await page.goto(baseURL+'?test=1');await page.waitForFunction(()=>window.__cad?.ready(),{},{timeout:90000});await page.screenshot({path:path.join(out,'05-phone-empty.png')});
 await page.locator('#modeSolid').click();await openToolMenu(page,'add');await page.locator('[data-tool=box]').click();await page.locator('#operationGizmo').getByRole('button',{name:'Apply',exact:true}).click();await page.waitForFunction(()=>window.__cad.items.some(i=>i.kind==='body'));approx(await page.evaluate(()=>window.__cad.items.find(i=>i.kind==='body').volume),24000);await page.screenshot({path:path.join(out,'06-phone-solid.png')});
 for(const [width,height]of [[375,667],[390,844],[844,390],[1440,900]]){await page.setViewportSize({width,height});const bounds=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,canvas:document.querySelector('#canvas').getBoundingClientRect().toJSON()}));assert.equal(bounds.overflow,false);assert.ok(bounds.canvas.width>=350&&bounds.canvas.height>250);await page.screenshot({path:path.join(out,'size-'+width+'.png')});}checks.push('375/390 phone, landscape and desktop layouts with native CAD rendering');
 await page.setViewportSize({width:390,height:844});const phoneSketch=await apply('sketch',{shape:'polyline',plane:'XY',closed:true,points:[[0,0],[15,0],[15,10],[0,10]],constraints:[]});await page.evaluate(id=>window.__cad.startTool('sketch',{},id),phoneSketch);assert.equal(await page.getByRole('button',{name:'Solve constraints',exact:true}).isVisible(),true);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await page.screenshot({path:path.join(out,'08-phone-constraints.png')});checks.push('Phone on-model constraint controls remain usable without a settings panel or page overflow');

 await cancelTool(page);await reset();a=await box();b=await apply('sketch',{shape:'circle',radius:3,plane:'XY',offset:10,x:0,y:0,hostBody:a});await page.evaluate(()=>window.__cad.view('top'));await page.locator('#fit').click();
 await page.locator('#modeSketch').click();await page.evaluate(()=>window.__cad.select([]));const tap=await page.evaluate(()=>{const p=window.__cad.camera.position.clone().set(0,0,10).project(window.__cad.camera),r=document.querySelector('#canvas').getBoundingClientRect();return{x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2};});await page.touchscreen.tap(tap.x,tap.y);assert.equal(await page.evaluate(()=>window.__cad.selection[0]?.kind),'sketch');await page.locator('#modeSolid').click();await page.locator('#context').getByRole('button',{name:'Hole',exact:true}).click();await page.getByRole('button',{name:'Apply',exact:true}).click();await page.waitForFunction(()=>window.__cad.doc.features.at(-1)?.type==='hole');approx((await data())[0].volume,6000-90*Math.PI,.002);await page.evaluate(()=>window.__cad.view('iso'));await page.locator('#fit').click();await page.screenshot({path:path.join(out,'12-phone-hole.png')});
 await page.setViewportSize({width:1180,height:820});await page.locator('#modeSolid').click();await openToolMenu(page,'tools');assert.equal(await page.locator('#menu [data-tool]').count(),await page.locator('#menu [data-tool] svg').count());assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await page.screenshot({path:path.join(out,'13-tablet-icon-tools.png')});checks.push('Touch tap selects circle above face; phone Hole works; tablet icon tool grid fits');

 await mobile.close();await fs.writeFile(path.join(out,'results.json'),JSON.stringify({checks,errors},null,2));console.log('VERIFIED',checks.length,'CAD checks');checks.forEach(c=>console.log('PASS',c));
}catch(error){console.error('FAILED after:',checks);if(page){await fs.writeFile(path.join(out,'failure.html'),await page.content()).catch(()=>{});await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});console.error(await page.locator('body').innerText().catch(()=>''));}throw error;}finally{await browser.close();await new Promise(r=>server.close(r));}

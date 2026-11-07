import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {beginSketch,projectSketchPoint} from './sketch-flow.mjs';
import {setToolValue,setToolChoice} from './canvas-tool-flow.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
const root=path.resolve(process.env.CAD_BUILD_DIR||'dist'),out=path.resolve('test-results');await fs.mkdir(out,{recursive:true});
const server=http.createServer(async(req,res)=>{try{let p=new URL(req.url,'http://localhost').pathname;if(p.startsWith('/cad/'))p=p.slice(4);const f=path.resolve(root,'.'+(p.endsWith('/')?p+'index.html':p));if(!f.startsWith(root+path.sep))throw Error();res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.css':'text/css','.wasm':'application/wasm','.json':'application/json'})[path.extname(f)]||'application/octet-stream'});res.end(await fs.readFile(f));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=process.env.CAD_TEST_URL||('http://127.0.0.1:'+server.address().port+'/');
const browser=await chromium.launch({headless:true}),context=await browser.newContext({viewport:{width:1180,height:820},hasTouch:true}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(30000);
const ready=()=>page.waitForFunction(()=>window.__cad?.ready());
const fresh=()=>page.evaluate(()=>window.__cad.rebuild({format:'reqoo-cad',version:1,title:'Sketch Parity QA',features:[],ui:{hidden:[],colors:{}}}));
const op=(type,params,inputs=[])=>page.evaluate(({type,params,inputs})=>window.__cad.apply(type,params,inputs),{type,params,inputs});
const near=(a,b,t=.02)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
try{
 await page.goto(url+'?test=1');await ready();await fresh();
 await beginSketch(page,{shape:'arc'});let a=await projectSketchPoint(page,[0,0]),b=await projectSketchPoint(page,[20,0]);await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:5});
 const arcPreview=await page.evaluate(()=>window.__cad.sketchPreview[0]?.positions);assert.ok(arcPreview?.length>30,'Arc preview is curved, not a chord');assert.ok(Math.max(...arcPreview.filter((_,i)=>i%3===1))>9);await page.mouse.up();await page.waitForFunction(()=>window.__cad.gizmo.sketchCreated&&!window.__cad.gizmo.busy);await page.locator('[data-dimension=sagitta]').fill('5');await page.getByRole('button',{name:'Apply sketch dimensions',exact:true}).click();await page.waitForFunction(()=>window.__cad.doc.features.at(-1).params.sagitta===5&&!window.__cad.gizmo.busy);await page.locator('#finishSketch').click();
 await fresh();await beginSketch(page,{shape:'spline'});for(const p of [[-20,0],[0,15],[20,0]]){a=await projectSketchPoint(page,p);await page.mouse.click(a.x,a.y);}
 await page.waitForFunction(()=>window.__cad.sketchPreview.some(p=>p.type==='LineSegments'&&p.positions.length>12));
 assert.equal(await page.evaluate(()=>window.__cad.doc.features.length),0,'Spline preview never commits history');await page.screenshot({path:path.join(out,'native-spline-preview.png')});await page.locator('#finishSketch').click();await page.waitForFunction(()=>!window.__cad.gizmo.sketchMode&&!window.__cad.gizmo.busy);assert.ok(await page.evaluate(()=>window.__cad.items[0].edges.some(e=>e.type==='BSPLINE_CURVE')));
 await fresh();await beginSketch(page,{shape:'polyline'});
 await op('sketch',{shape:'spline',points:[[-20,0],[0,10],[20,0]],closed:false,plane:'XY'});
 await op('sketch',{shape:'polyline',points:[[-5,-20],[-5,20]],closed:false,plane:'XY'});await op('sketch',{shape:'polyline',points:[[5,-20],[5,20]],closed:false,plane:'XY'});
 await page.getByRole('button',{name:'Trim sketch segment',exact:true}).click();a=await projectSketchPoint(page,[0,10]);await page.touchscreen.tap(a.x,a.y);await page.waitForFunction(()=>window.__cad.doc.features.at(-1)?.type==='sketchTrim'&&!window.__cad.gizmo.busy);
 let pieces=await page.evaluate(()=>window.__cad.items.filter(i=>i.featureId===window.__cad.doc.features.at(-1).id));assert.equal(pieces.length,2);assert.ok(pieces.every(i=>i.edges.every(e=>e.type==='BSPLINE_CURVE')),'Trim keeps native spline curves');
 await page.locator('#undo').click();await page.waitForFunction(()=>window.__cad.doc.features.length===3&&!window.__cad.gizmo.busy);await page.locator('#redo').click();await page.waitForFunction(()=>window.__cad.doc.features.length===4&&!window.__cad.gizmo.busy);await page.locator('#finishSketch').click();await page.reload();await ready();assert.equal(await page.evaluate(()=>window.__cad.doc.features.at(-1).type),'sketchTrim');
 await beginSketch(page,{shape:'polyline'});const trimPiece=await page.evaluate(()=>window.__cad.items.find(i=>i.featureId===window.__cad.doc.features.at(-1).id).id);await page.evaluate(id=>window.__cad.select([{id,kind:'sketch'}]),trimPiece);await page.getByRole('button',{name:'Offset in sketch',exact:true}).click();assert.equal(await page.locator('#sketchEditHUD [data-apply]').isEnabled(),true,'Open native Trim result is eligible for Offset');await page.locator('#sketchEditHUD [data-apply]').click();await page.waitForFunction(()=>window.__cad.doc.features.at(-1).type==='sketchOffset'&&!window.__cad.gizmo.busy);await page.locator('#finishSketch').click();
 await fresh();await beginSketch(page,{shape:'polyline'});await op('sketch',{shape:'rectangle',width:30,height:20,plane:'XY'});await op('sketch',{shape:'spline',points:[[-20,0],[0,5],[20,0]],closed:false,plane:'XY'});
 await page.getByRole('button',{name:'Trim sketch segment',exact:true}).click();a=await projectSketchPoint(page,[15,-5]);await page.touchscreen.tap(a.x,a.y);await page.waitForFunction(()=>window.__cad.doc.features.at(-1).type==='sketchTrim'&&!window.__cad.gizmo.busy);
 pieces=await page.evaluate(()=>window.__cad.items.filter(i=>i.featureId===window.__cad.doc.features.at(-1).id));assert.equal(pieces.length,1);const length=pieces[0].edges.reduce((n,e)=>n+e.length,0);assert.ok(length>80&&length<100,'Rectangle trims at the spline intersection, retaining the other edges');
 assert.equal(await page.locator('#stage').evaluate(el=>getComputedStyle(el).userSelect),'none');assert.deepEqual(errors,[]);await page.screenshot({path:path.join(out,'trim-against-spline-boundary.png')});
 console.log('CURVE SYSTEM UI PASS: native Arc/Spline previews, touch spline Trim, spline boundary Trim, native curve types, Undo/Redo/reopen and callout prevention');
}catch(e){console.error('CURVE SYSTEM UI FAILED',e,errors,await page.evaluate(()=>JSON.stringify({gizmo:window.__cad.gizmo,selection:window.__cad.selection,items:window.__cad.items.map(i=>({id:i.id,kind:i.kind,construction:i.construction,plane:i.sketchPlane}))})),await page.locator('body').innerText());await page.screenshot({path:path.join(out,'curve-system-failure.png')}).catch(()=>{});throw e;}finally{await browser.close();await new Promise(r=>server.close(r));}

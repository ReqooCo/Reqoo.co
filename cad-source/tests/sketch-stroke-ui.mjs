import {beginSketch,dragSketch,createSketch,projectSketchPoint} from './sketch-flow.mjs';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
const root=path.resolve(process.env.CAD_BUILD_DIR||'dist'),out=path.resolve('test-results');await fs.mkdir(out,{recursive:true});
const server=http.createServer(async(req,res)=>{try{let p=new URL(req.url,'http://localhost').pathname;if(p.startsWith('/cad/'))p=p.slice(4);const f=path.resolve(root,'.'+(p.endsWith('/')?p+'index.html':p));if(!f.startsWith(root+path.sep))throw Error();res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.css':'text/css','.wasm':'application/wasm','.json':'application/json'})[path.extname(f)]||'application/octet-stream'});res.end(await fs.readFile(f));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=process.env.CAD_TEST_URL||('http://127.0.0.1:'+server.address().port+'/');
const browser=await chromium.launch({headless:true}),context=await browser.newContext({viewport:{width:1180,height:820},hasTouch:true,acceptDownloads:true}),page=await context.newPage(),errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(30000);
const near=(a,b,t=.001)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`),ready=()=>page.waitForFunction(()=>window.__cad?.ready()),op=(type,params,inputs=[])=>page.evaluate(({type,params,inputs})=>window.__cad.apply(type,params,inputs),{type,params,inputs});
const fresh=()=>page.evaluate(async()=>{window.__cad.alignGizmo.cancel();window.__cad.moveGizmo.cancel();await window.__cad.rebuild({format:'reqoo-cad',version:1,title:'Transform QA',features:[],ui:{hidden:[],colors:{}}});});
const item=id=>page.evaluate(id=>window.__cad.items.find(i=>i.id===id),id),select=id=>page.evaluate(id=>window.__cad.select([{id,kind:'body'}]),id),project=(p)=>page.evaluate(p=>{const v=window.__cad.camera.position.clone().set(...p).project(window.__cad.camera),r=document.querySelector('#canvas').getBoundingClientRect();return{x:r.left+(v.x+1)*r.width/2,y:r.top+(1-v.y)*r.height/2};},p);
try{
 await page.goto(url+'?test=1');await ready();await fresh();const host=await op('box',{width:10,depth:10,height:5,x:60});
 await beginSketch(page,{shape:'polyline'});const pts=[[-10,-10],[10,-10],[10,10]];
 const tap=async point=>{const p=await projectSketchPoint(page,point);assert.equal(await page.evaluate(({x,y})=>document.elementFromPoint(x,y)?.tagName,p),'CANVAS');await page.touchscreen.tap(p.x,p.y);};
 for(const p of pts)await tap(p);assert.equal(await page.evaluate(()=>window.__cad.gizmo.sketchPointCount),3);
 await page.locator('#undo').click();assert.equal(await page.evaluate(()=>window.__cad.gizmo.sketchPointCount),2);assert.equal(await page.evaluate(()=>window.__cad.doc.features.length),1);
 await page.locator('#undo').click();await page.locator('#undo').click();assert.equal(await page.evaluate(()=>window.__cad.gizmo.sketchPointCount),0);assert.equal(await page.evaluate(()=>window.__cad.doc.features[0].id),host);
 for(let i=0;i<3;i++)await page.locator('#redo').click();assert.equal(await page.evaluate(()=>window.__cad.gizmo.sketchPointCount),3);assert.equal(await page.evaluate(()=>window.__cad.doc.features.length),1);
 await tap(pts[0]);await page.waitForFunction(()=>!window.__cad.gizmo.busy&&window.__cad.doc.features.length===2);const profile=await page.evaluate(()=>window.__cad.doc.features.at(-1));assert.equal(profile.params.closed,true);assert.deepEqual(profile.params.points,pts);assert.equal(await page.evaluate(()=>window.__cad.gizmo.sketchPointCount),0);assert.equal(await page.evaluate(()=>window.__cad.gizmo.sketchMode),true);
 await page.getByRole('button',{name:'Exit sketch',exact:true}).click();await page.waitForFunction(()=>!window.__cad.gizmo.sketchMode);await page.getByRole('button',{name:'Extrude',exact:true}).click();await page.locator('#faceDistanceValue').fill('5');await page.locator('#faceDistanceApply').click();await page.waitForFunction(()=>!window.__cad.gizmo.busy&&window.__cad.doc.features.at(-1).type==='extrude');near(await page.evaluate(()=>window.__cad.items.find(i=>i.id!==window.__cad.doc.features[0].id&&i.kind==='body').volume),1000,.01);
 await page.reload();await ready();assert.equal(await page.evaluate(()=>window.__cad.doc.features[1].params.closed),true);near(await page.evaluate(()=>window.__cad.items.filter(i=>i.kind==='body').reduce((s,i)=>s+i.volume,0)),1500,.01);
 assert.deepEqual(errors,[]);await page.screenshot({path:path.join(out,'closed-stroke-extrusion.png')});console.log('SKETCH STROKE UI PASS: touch path, per-point Undo/Redo protects native history, tap-first closes without duplicate vertex, one Exit, native Extrude and reload');
}catch(e){console.error('SKETCH STROKE UI FAILED',e,errors,await page.locator('body').innerText());await page.screenshot({path:path.join(out,'sketch-stroke-failure.png')}).catch(()=>{});throw e;}finally{await browser.close();await new Promise(r=>server.close(r));}

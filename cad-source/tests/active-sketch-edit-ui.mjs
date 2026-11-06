import {setToolValue,setToolChoice,setToolToggle,toolField,applyTool,cancelTool} from './canvas-tool-flow.mjs';
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
 await page.goto(url+'?test=1');await ready();await fresh();
 await beginSketch(page,{shape:'circle'});await dragSketch(page,[0,0],[10,0],{touch:true});
 for(const name of ['Offset in sketch','Profile in sketch','Trim sketch segment'])assert.equal(await page.getByRole('button',{name,exact:true}).isVisible(),true);
 await page.getByRole('button',{name:'Offset in sketch',exact:true}).click();await setToolValue(page,'Sketch offset distance','2');await page.locator('#operationGizmo [data-apply]').click();await page.waitForFunction(()=>!window.__cad.gizmo.busy&&window.__cad.doc.features.at(-1).type==='sketchOffset');assert.equal(await page.evaluate(()=>window.__cad.gizmo.sketchMode),true);near(await page.evaluate(()=>window.__cad.items.find(i=>i.id.endsWith(':band')).area),44*Math.PI,.03);
 await page.keyboard.press('Escape');await page.waitForFunction(()=>!window.__cad.gizmo.busy&&!window.__cad.gizmo.sketchMode);assert.equal(await page.evaluate(()=>window.__cad.doc.features.length),0);
 await beginSketch(page,{shape:'rectangle'});await dragSketch(page,[-15,-10],[15,10]);
 await page.locator('#finishSketch').click();await page.waitForFunction(()=>!window.__cad.gizmo.sketchMode);
 await page.getByRole('button',{name:'Extrude',exact:true}).click();await page.locator('#faceDistanceValue').fill('4');await page.locator('#faceDistanceApply').click();await page.waitForFunction(()=>!window.__cad.gizmo.busy&&window.__cad.items.some(i=>i.kind==='body'));near(await page.evaluate(()=>window.__cad.items.find(i=>i.kind==='body').volume),600*4,.05);
 assert.deepEqual(errors,[]);console.log('ACTIVE SKETCH EDIT PASS: single direct Trim action, visible Offset/Profile; touch offset; whole-session cancel; Finish and native extrusion');await page.screenshot({path:path.join(out,'active-sketch-edit.png')});
}catch(e){console.error(e,errors,await page.locator('body').innerText());await page.screenshot({path:path.join(out,'active-sketch-edit-failure.png')});throw e;}finally{await browser.close();await new Promise(r=>server.close(r));}

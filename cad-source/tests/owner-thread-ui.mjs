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
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'||m.type()==='warning'||m.text().includes('[REDS Thread]'))console.log('OWNER THREAD BROWSER',m.type(),m.text());});page.setDefaultTimeout(30000);
const ready=()=>page.waitForFunction(()=>window.__cad?.ready());
const fresh=()=>page.evaluate(()=>window.__cad.rebuild({format:'reqoo-cad',version:1,title:'Sketch Parity QA',features:[],ui:{hidden:[],colors:{}}}));
const op=(type,params,inputs=[])=>page.evaluate(({type,params,inputs})=>window.__cad.apply(type,params,inputs),{type,params,inputs});
const near=(a,b,t=.02)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);const project=point=>page.evaluate(point=>{const p=window.__cad.camera.position.clone().set(...point).project(window.__cad.camera),r=document.querySelector('#canvas').getBoundingClientRect();return{x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2};},point);
async function tap(point){const p=await project(point);await page.touchscreen.tap(p.x,p.y);}
async function extrude(distance,operation='New body'){await page.getByRole('button',{name:'Extrude',exact:true}).click();await page.getByLabel('Extrude operation',{exact:true}).selectOption(operation);await page.locator('#faceDistanceValue').fill(String(distance));await page.locator('#faceDistanceApply').click();await page.waitForFunction(()=>!window.__cad.gizmo.busy&&!window.__cad.gizmo.preview&&window.__cad.doc.features.at(-1).type==='extrude');return page.evaluate(()=>window.__cad.doc.features.at(-1).id);}
try{
 await page.goto(url+'?test=1');await ready();await page.locator('#openFile').setInputFiles(path.resolve('tests/fixtures/patterned-peg-assembly.json'));await page.waitForFunction(()=>!window.__cad.gizmo.busy&&window.__cad.doc.features.length===11);
 // Round-trip the actual owner assembly through the browser download and file picker.
 const original=await page.evaluate(()=>({ids:window.__cad.doc.features.map(f=>f.id),bodies:window.__cad.items.filter(i=>i.kind==='body').map(i=>({id:i.id,volume:i.volume})).sort((a,b)=>a.id.localeCompare(b.id))}));
 const savedDownload=page.waitForEvent('download');await page.evaluate(()=>window.__cad.saveProject());const saved=await savedDownload;assert.match(saved.suggestedFilename(),/\\.rqcad$/i);
 const savedPath=await saved.path();const savedJSON=JSON.parse(await fs.readFile(savedPath,'utf8'));assert.deepEqual(savedJSON.features.map(f=>f.id),original.ids,'Download must preserve feature IDs');
 await fresh();await page.waitForFunction(()=>window.__cad.doc.features.length===0);
 await page.locator('#openFile').setInputFiles(savedPath);await page.waitForFunction(()=>!window.__cad.gizmo.busy&&window.__cad.doc.features.length===11,{},{timeout:90000});
 const reopened=await page.evaluate(()=>({ids:window.__cad.doc.features.map(f=>f.id),bodies:window.__cad.items.filter(i=>i.kind==='body').map(i=>({id:i.id,volume:i.volume})).sort((a,b)=>a.id.localeCompare(b.id))}));
 assert.deepEqual(reopened.ids,original.ids,'Downloaded .rqcad must reopen with identical history IDs');
 assert.deepEqual(reopened.bodies.map(b=>b.id),original.bodies.map(b=>b.id),'Downloaded .rqcad must preserve body identity');
 reopened.bodies.forEach((b,i)=>near(b.volume,original.bodies[i].volume,.001));
 console.log('OWNER PROJECT ROUNDTRIP PASS: browser Save download → clear document → Open downloaded .rqcad → same 11 features, six bodies and volumes');
 const peg=await page.evaluate(()=>window.__cad.items.filter(i=>i.kind==='body'&&i.name.startsWith('Extrude ·')).sort((a,b)=>a.bounds[0][1]-b.bounds[0][1]||a.bounds[0][0]-b.bounds[0][0])[0]);await page.evaluate(()=>{window.__cad.select([]);window.__cad.view('front');window.__cad.fit();});await tap([(peg.bounds[0][0]+peg.bounds[1][0])/2,peg.bounds[0][1],28.5]);assert.equal(await page.evaluate(()=>window.__cad.selection[0]?.kind),'face');await page.getByRole('button',{name:'Thread',exact:true}).click();await setToolChoice(page,'mode','Modeled');await setToolValue(page,'length',11);await page.locator('#operationGizmo [data-apply]').click();await page.waitForFunction(()=>!window.__cad.gizmo.busy&&window.__cad.doc.features.at(-1).type==='thread',{},{timeout:90000});
 const threaded=await page.evaluate(()=>window.__cad.items.find(i=>i.id===window.__cad.doc.features.at(-1).id));assert.ok(threaded.volume<peg.volume-20&&threaded.volume>peg.volume*.5);assert.equal(await page.evaluate(()=>window.__cad.items.filter(i=>i.kind==='body').length),6);await page.screenshot({path:path.join(out,'owner-thread-fixed.png')});await page.locator('#undo').click();await page.waitForFunction(()=>!window.__cad.gizmo.busy&&window.__cad.doc.features.length===11);await page.locator('#redo').click();await page.waitForFunction(()=>!window.__cad.gizmo.busy&&window.__cad.doc.features.at(-1).type==='thread',{},{timeout:90000});await page.reload();await ready();assert.equal(await page.evaluate(()=>window.__cad.doc.features.at(-1).type),'thread');assert.deepEqual(errors,[]);console.log('OWNER THREAD UI PASS: actual uploaded project → real cylinder surface tap → Thread → valid helical material removal, six bodies preserved, Undo/Redo and reopen');
}catch(e){console.error('OWNER THREAD UI FAILED',e,errors,await page.locator('body').innerText());await page.screenshot({path:path.join(out,'owner-thread-failure.png')}).catch(()=>{});throw e;}finally{await browser.close();await new Promise(r=>server.close(r));}

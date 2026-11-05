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
 const a=await op('sketch',{shape:'rectangle',width:10,height:12,x:-15}),b=await op('sketch',{shape:'circle',radius:4,x:15});
 await page.getByRole('button',{name:'top face',exact:true}).click();await page.evaluate(()=>{window.__cad.select([]);window.__cad.fit();});
 for(const p of [[-15,0,0],[15,0,0]]){const c=await project(p);await page.mouse.click(c.x,c.y);}
 assert.equal(await page.evaluate(()=>window.__cad.selection.length),2);assert.equal(await page.locator('#multi').isVisible(),false);
 await page.getByRole('button',{name:'Extrude',exact:true}).click();await page.locator('#faceDistanceValue').fill('8');await page.locator('#faceDistanceApply').click();
 await page.waitForFunction(()=>!window.__cad.gizmo.busy&&window.__cad.items.filter(i=>i.kind==='body').length===2);
 const volumes=await page.evaluate(()=>window.__cad.items.filter(i=>i.kind==='body').map(i=>i.volume).sort((a,b)=>a-b));near(volumes[0],128*Math.PI,.02);near(volumes[1],960,.02);
 const committed=await page.evaluate(()=>JSON.stringify(window.__cad.doc.features));await page.locator('#undo').click();await page.waitForFunction(()=>!window.__cad.gizmo.busy&&window.__cad.items.filter(i=>i.kind==='sketch').length===2);await page.locator('#redo').click();await page.waitForFunction(()=>!window.__cad.gizmo.busy&&window.__cad.items.filter(i=>i.kind==='body').length===2);assert.equal(await page.evaluate(()=>JSON.stringify(window.__cad.doc.features)),committed);
 await page.reload();await ready();assert.equal(await page.evaluate(()=>window.__cad.items.filter(i=>i.kind==='body').length),2);
 await page.screenshot({path:path.join(out,'multi-profile-ui.png')});assert.deepEqual(errors,[]);console.log('MULTI PROFILE UI PASS: real additive canvas selection, two native solids, one undo/redo transaction, persisted reload, no runtime errors');
}finally{await browser.close();await new Promise(r=>server.close(r));}

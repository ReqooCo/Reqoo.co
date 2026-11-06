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
 await beginSketch(page);assert.equal(await page.getByRole('button',{name:'Exit sketch',exact:true}).count(),1);assert.equal(await page.getByRole('button',{name:'Finish sketch',exact:true}).count(),0);
 await page.getByRole('button',{name:'Exit sketch',exact:true}).click();await page.waitForFunction(()=>!window.__cad.gizmo.sketchMode);assert.equal(await page.locator('#modeSolid').getAttribute('aria-pressed'),'true');
 await beginSketch(page);const a=await projectSketchPoint(page,[-20,-10]),b=await projectSketchPoint(page,[0,10]);await page.mouse.click(a.x,a.y);await page.mouse.move(b.x,b.y);await page.mouse.click(b.x,b.y);await page.waitForFunction(()=>!window.__cad.gizmo.busy&&window.__cad.doc.features.length===1);near(await page.evaluate(()=>window.__cad.items[0].area),400,.01);
 const before=await page.evaluate(()=>({p:window.__cad.camera.position.toArray(),q:window.__cad.camera.quaternion.toArray(),t:window.__cad.controls.target.toArray(),z:window.__cad.camera.zoom}));
 await page.getByRole('button',{name:'Draw circle',exact:true}).click();assert.equal(await page.locator('#sketchDimensions').isVisible(),true);const after=await page.evaluate(()=>({p:window.__cad.camera.position.toArray(),q:window.__cad.camera.quaternion.toArray(),t:window.__cad.controls.target.toArray(),z:window.__cad.camera.zoom}));assert.deepEqual(after,before);
 await page.getByRole('button',{name:'Select sketch profiles',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#selectSketchProfiles').getAttribute('aria-pressed')==='true');
 const session=await page.context().newCDPSession(page);await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:600,y:500,id:1},{x:700,y:500,id:2}]});await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:570,y:520,id:1},{x:740,y:520,id:2}]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await session.detach();const q=await page.evaluate(()=>window.__cad.camera.quaternion.toArray());q.forEach((n,i)=>near(n,before.q[i],1e-7));assert.equal(await page.evaluate(()=>window.__cad.doc.features.length),1);
 await page.getByRole('button',{name:'Draw line',exact:true}).click();for(const p of [[5,-12],[12,-12],[12,-7]]){const pt=await projectSketchPoint(page,p);assert.equal(await page.evaluate(({x,y})=>document.elementFromPoint(x,y)?.tagName,pt),'CANVAS','Test point must be on the drawing canvas');await page.mouse.click(pt.x,pt.y);}
 assert.equal(await page.evaluate(()=>window.__cad.gizmo.sketchPointCount),3);
 const download=page.waitForEvent('download');await page.keyboard.press('Control+s');const file=await download,saved=JSON.parse(await fs.readFile(await file.path(),'utf8'));assert.equal(saved.features.length,2);assert.deepEqual(saved.features[1].params.points,[[5,-12],[12,-12],[12,-7]]);assert.equal(await page.evaluate(()=>window.__cad.gizmo.sketchMode),true);
 // Open the actual downloaded bytes without leaving the sketch first.
 await page.locator('#openFile').setInputFiles(await file.path());await page.waitForFunction(()=>!window.__cad.gizmo.busy&&!window.__cad.gizmo.sketchMode);assert.equal(await page.locator('#modeSolid').getAttribute('aria-pressed'),'true');assert.equal(await page.evaluate(()=>window.__cad.doc.features.length),2);
 const preserved=await page.evaluate(()=>JSON.stringify(window.__cad.doc));await page.locator('#openFile').setInputFiles({name:'bad.rqcad',mimeType:'application/json',buffer:Buffer.from('{broken')});await page.locator('#errorDialog').waitFor({state:'visible'});assert.match(await page.locator('#errorText').innerText(),/not valid project JSON/);assert.equal(await page.evaluate(()=>JSON.stringify(window.__cad.doc)),preserved);await page.locator('#closeError').click();
 // Legacy v1 files without ui must open and remain editable.
 await page.locator('#openFile').setInputFiles({name:'legacy.rqcad',mimeType:'application/json',buffer:Buffer.from('\uFEFF'+JSON.stringify({format:'reqoo-cad',version:1,features:[]}))});await page.waitForFunction(()=>!window.__cad.gizmo.busy&&window.__cad.doc.features.length===0);assert.equal(await page.locator('#projectName').inputValue(),'Untitled');
 // Browser storage quota must not destroy the last valid saved project or its backup.
 const protectedCopy=await page.evaluate(()=>{
  const before={project:localStorage.getItem('reqoo-cad-v1'),backup:localStorage.getItem('reqoo-cad-v1-backup')};
  window.__originalStorageSetItem=Storage.prototype.setItem;
  Storage.prototype.setItem=function(key,value){if(key==='reqoo-cad-v1')throw new DOMException('Storage full','QuotaExceededError');return window.__originalStorageSetItem.call(this,key,value);};
  return before;
 });
 try{
  await op('box',{width:2,depth:3,height:4});
  assert.match(await page.locator('#saveState').innerText(),/Local save failed/);
  assert.deepEqual(await page.evaluate(()=>({project:localStorage.getItem('reqoo-cad-v1'),backup:localStorage.getItem('reqoo-cad-v1-backup')})),protectedCopy);
 }finally{
  await page.evaluate(()=>{Storage.prototype.setItem=window.__originalStorageSetItem;delete window.__originalStorageSetItem;});
 }
 assert.deepEqual(errors,[]);console.log('SKETCH FILE UX PASS: one Exit, blank exit, tap/tap drawing, switch continuity, Select, touch pan/zoom without orbit, save pending path, real file reopen, failed-open preservation, BOM/legacy files and quota-safe protected backups');
}catch(e){console.error('SKETCH FILE UX FAILED',e,errors,await page.locator('body').innerText());await page.screenshot({path:path.join(out,'sketch-file-ux-failure.png')}).catch(()=>{});throw e;}finally{await browser.close();await new Promise(r=>server.close(r));}

import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
const out=path.resolve('test-results'),root=path.resolve('dist');await fs.mkdir(out,{recursive:true});
const server=http.createServer(async(req,res)=>{try{let pathname=new URL(req.url,'http://localhost').pathname;if(pathname.startsWith('/cad/'))pathname=pathname.slice(4);const f=path.resolve(root,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));if(!f.startsWith(root+path.sep))throw Error();const bytes=await fs.readFile(f);res.writeHead(200,{'Content-Type':({'.js':'text/javascript','.css':'text/css','.wasm':'application/wasm','.html':'text/html','.json':'application/json'})[path.extname(f)]||'application/octet-stream'});res.end(bytes);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url=process.env.CAD_TEST_URL||('http://127.0.0.1:'+server.address().port+'/'),browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1180,height:820},hasTouch:true,isMobile:true,acceptDownloads:true}),page=await context.newPage(),errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(60000);
const near=(actual,expected,tol=.01)=>assert.ok(Math.abs(actual-expected)<tol,JSON.stringify({actual,expected}));
const body=()=>page.evaluate(()=>window.__cad.items.find(i=>i.kind==='body'));
const projection=async(x,y,z)=>page.evaluate(({x,y,z})=>{const p=window.__cad.camera.position.clone().set(x,y,z).project(window.__cad.camera),r=document.querySelector('#canvas').getBoundingClientRect();return{x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2};},{x,y,z});
const ready=()=>page.waitForFunction(()=>window.__cad?.ready(),{},{timeout:90000});
const preview=()=>page.waitForFunction(()=>window.__cad.previewItems?.some(i=>i.kind==='body'),{},{timeout:90000});
try{
 await page.goto(url+'?test=1&diagnostics=1');await ready();
 const version=await(await page.request.get(new URL('version.json',url).href)).json();
 assert.equal(await page.evaluate(()=>document.documentElement.dataset.cadBuild),version.sourceHash);
 assert.equal(await page.locator('meta[name=reqoo-cad-source]').getAttribute('content'),version.sourceHash);checks.push('Served HTML, JavaScript and version manifest identify the same source');
 await page.locator('#startSketch').click();await page.locator('[data-tool=circle]').click();await page.getByRole('button',{name:'Create sketch',exact:true}).click();await page.waitForFunction(()=>window.__cad.items.some(i=>i.kind==='sketch'));
 assert.equal(await page.locator('#sketchDimensionLines [data-measure=diameter]').count(),1);
 await page.locator('[data-dimension=diameter]').fill('40');await page.getByRole('button',{name:'Apply sketch dimensions',exact:true}).click();await page.waitForFunction(()=>window.__cad.doc.features[0].params.radius===20);
 await page.locator('#context').getByRole('button',{name:'Extrude',exact:true}).click();await page.locator('#faceDistanceValue').fill('20');await page.locator('#faceDistanceValue').dispatchEvent('input');await preview();near(await page.evaluate(()=>window.__cad.previewItems.find(i=>i.kind==='body').volume),Math.PI*400*20);
 assert.equal(await page.evaluate(()=>window.__cad.doc.features.length),1);await page.locator('#faceDistanceApply').click();await page.waitForFunction(()=>window.__cad.doc.features.at(-1).type==='extrude');near((await body()).volume,Math.PI*400*20);checks.push('Dimensioned circle → real BREP cylinder preview → committed extrusion');

 // Select cylindrical side and drive its source sketch diameter without a form.
 await page.evaluate(()=>{const b=window.__cad.items.find(i=>i.kind==='body'),f=b.faceInfo.find(f=>['CYLINDRE','CYLINDER'].includes(f.type));window.__cad.select([{id:b.id,kind:'face',index:f.index}]);});
 await page.waitForFunction(()=>window.__cad.direct.state.operation==='diameter');
 assert.equal(await page.locator('#faceDistanceValue').inputValue(),'40');
 await page.locator('#faceDistanceValue').fill('50');await page.locator('#faceDistanceValue').dispatchEvent('input');await preview();
 await page.waitForFunction(()=>!window.__cad.direct.state.inFlight&&!window.__cad.direct.state.pending);
 near(await page.evaluate(()=>window.__cad.previewItems.find(i=>i.kind==='body').volume),Math.PI*625*20,.1);
 near((await body()).volume,Math.PI*400*20,.1);
 await page.locator('#faceDistanceApply').click();await page.waitForFunction(()=>window.__cad.doc.features[0].params.radius===25);
 near((await body()).volume,Math.PI*625*20,.1);
 await page.locator('#undo').click();await page.waitForFunction(()=>window.__cad.doc.features[0].params.radius===20);
 near((await body()).volume,Math.PI*400*20,.1);
 checks.push('Cylindrical side → editable diameter → real BREP preview → source history commit → undo');
 await page.evaluate(()=>window.__cad.view('top'));await page.locator('#fit').click();let p=await projection(8,0,20);await page.touchscreen.tap(p.x,p.y);await page.waitForFunction(()=>window.__cad.gizmo.visible&&window.__cad.selection.at(-1)?.kind==='face');
 assert.equal(await page.locator('#faceDragHandle svg path').count(),1);assert.equal(await page.locator('#faceDragHandle').getAttribute('data-control'),'direct');assert.equal(await page.locator('#cadDiagnostic').isVisible(),true);
 await page.evaluate(()=>window.__cad.view('iso'));
 const start=await page.locator('#faceDragHandle').boundingBox(),direction=await page.evaluate(()=>{const d=window.__cad.direct.direction();return{dx:d.dx,dy:d.dy};});
 await page.mouse.move(start.x+start.width/2,start.y+start.height/2);await page.mouse.down();let moving=true;const movement=(async()=>{try{for(let n=1;n<=30;n++){await page.mouse.move(start.x+start.width/2+direction.dx*35*n/30,start.y+start.height/2+direction.dy*35*n/30);await page.waitForTimeout(60);}}finally{moving=false;}})();
 await page.waitForFunction(()=>window.__cad.immediatePreview&&window.__cad.root.children.some(n=>n.scale.z!==1));assert.equal(moving,true,'Affine solid display must follow the drag without waiting for the kernel');await preview();assert.equal(moving,true,'Actual solid preview must appear before continuous drag ends');assert.equal(await page.evaluate(()=>window.__cad.doc.features.length),2);
 await movement;await page.mouse.up();await page.waitForFunction(()=>!window.__cad.direct.state.inFlight&&!window.__cad.direct.state.pending);await preview();
 const cache=await page.evaluate(()=>window.__cad.worker('previewStats'));assert.equal(cache.reusedFeatures,2);assert.equal(cache.builtFeatures,1);assert.equal(cache.meshedItems,1);
 const delta=await page.evaluate(()=>window.__cad.direct.state.value);assert.ok(delta>0);near(await page.evaluate(()=>window.__cad.previewItems.find(i=>i.kind==='body').volume),Math.PI*400*(20+delta),.1);near((await body()).volume,Math.PI*400*20);
 await page.screenshot({path:path.join(out,'acceptance-01-real-face-preview.png')});await page.locator('#faceDistanceApply').click();await page.waitForFunction(()=>window.__cad.doc.features.at(-1).type==='offsetFace');
 await page.evaluate(()=>window.__cad.view('top'));
 const height=20+delta;near((await body()).volume,Math.PI*400*height,.1);checks.push('Touch-selected cylinder face exposes arrow; dragging changes actual BREP preview and commits signed pull');
 await page.locator('#undo').click();await page.waitForFunction(()=>window.__cad.doc.features.at(-1).type==='extrude');near((await body()).volume,Math.PI*8000,.1);await page.locator('#redo').click();await page.waitForFunction(()=>window.__cad.doc.features.at(-1).type==='offsetFace');
 p=await projection(5,0,height);await page.touchscreen.tap(p.x,p.y);await page.locator('#context').getByRole('button',{name:'Hole',exact:true}).click();await page.locator('#p-diameter').fill('10');await page.locator('#p-extent').selectOption('Blind');await page.locator('#p-depth').fill('5');await page.getByRole('button',{name:'Apply',exact:true}).click();await page.waitForFunction(()=>window.__cad.doc.features.at(-1).type==='hole');
 // Centre is set from the tap; put it at the origin before editing diameter/depth.
 let hf=await page.evaluate(()=>window.__cad.doc.features.at(-1).id);await page.evaluate(id=>window.__cad.startTool('hole',{},id),hf);await page.locator('#p-x').fill('0');await page.locator('#p-y').fill('0');await page.locator('#p-diameter').fill('8');await page.locator('#p-depth').fill('3');await page.getByRole('button',{name:'Update feature',exact:true}).click();await page.waitForFunction(()=>window.__cad.doc.features.at(-1).params.diameter===8);
 near((await body()).volume,Math.PI*400*height-Math.PI*16*3,.1);checks.push('Native blind hole diameter, centre and depth are editable in history');
 await page.locator('#pickMode').selectOption('edge');p=await projection(20,0,height);await page.touchscreen.tap(p.x,p.y);assert.equal(await page.evaluate(()=>window.__cad.selection.at(-1).kind),'edge');
 await page.locator('#context').getByRole('button',{name:'Fillet',exact:true}).click();await page.locator('#faceDistanceValue').fill('.5');await page.locator('#faceDistanceValue').dispatchEvent('input');await preview();const before=(await body()).volume;assert.ok(await page.evaluate(()=>window.__cad.previewItems.find(i=>i.kind==='body').volume<window.__cad.items.find(i=>i.kind==='body').volume));await page.locator('#faceDistanceApply').click();await page.waitForFunction(()=>window.__cad.doc.features.at(-1).type==='fillet');assert.ok((await body()).volume<before);checks.push('Individual edge tap → interactive native fillet preview → actual solid');
 await page.locator('#pickMode').selectOption('edge');p=await projection(4,0,height);await page.touchscreen.tap(p.x,p.y);assert.equal(await page.evaluate(()=>window.__cad.selection.at(-1).kind),'edge');await page.locator('#context').getByRole('button',{name:'Chamfer',exact:true}).click();await page.locator('#faceDistanceValue').fill('.3');await page.locator('#faceDistanceValue').dispatchEvent('input');await preview();await page.locator('#faceDistanceApply').click();await page.waitForFunction(()=>window.__cad.doc.features.at(-1).type==='chamfer');const finalVolume=(await body()).volume;assert.ok(finalVolume>0);checks.push('Individual circular hole edge receives real chamfer through direct controls');

 // A real filleted/holed body must show positive planar pull immediately too.
 await page.evaluate(()=>{const b=window.__cad.items.find(i=>i.kind==='body'),f=b.faceInfo.filter(f=>f.type==='PLANE'&&f.normal[2]>.99).sort((a,b)=>b.center[2]-a.center[2])[0];window.__cad.select([{id:b.id,kind:'face',index:f.index}]);window.__cad.direct.begin(0,'offsetFace');});
 await page.evaluate(()=>window.__cad.view('iso'));
 const complexArrow=await page.locator('#faceDragHandle').boundingBox(),complexDirection=await page.evaluate(()=>{const d=window.__cad.direct.direction();return{dx:d.dx,dy:d.dy};});
 await page.mouse.move(complexArrow.x+complexArrow.width/2,complexArrow.y+complexArrow.height/2);await page.mouse.down();
 await page.mouse.move(complexArrow.x+complexArrow.width/2+complexDirection.dx*28,complexArrow.y+complexArrow.height/2+complexDirection.dy*28,{steps:4});
 assert.equal(await page.evaluate(()=>window.__cad.immediatePreview?.mode),'prism');
 assert.equal(await page.evaluate(()=>window.__cad.immediatePreview.value===window.__cad.direct.state.value),true);
 const floating=await page.locator('#faceDistance').boundingBox();assert.ok(floating.width<=196&&floating.height<=54,JSON.stringify(floating));
 await page.screenshot({path:path.join(out,'acceptance-complex-live-pull.png')});
 await page.mouse.up();await page.waitForFunction(()=>!window.__cad.direct.state.inFlight&&!window.__cad.direct.state.pending);assert.ok(await page.evaluate(()=>window.__cad.previewItems.some(i=>i.kind==='body')));
 await page.locator('#faceDistanceApply').click();await page.waitForFunction(()=>window.__cad.doc.features.at(-1).type==='offsetFace');assert.ok((await body()).volume>finalVolume);
 await page.locator('#undo').click();await page.waitForFunction(()=>window.__cad.doc.features.at(-1).type==='chamfer');near((await body()).volume,finalVolume,.01);
 checks.push('Filleted/holed body has immediate planar pull display, compact dimensions, native commit and undo');
 await page.screenshot({path:path.join(out,'acceptance-02-finished-project.png')});
 const dl=page.waitForEvent('download');await page.locator('#fileMenu').click();await page.getByRole('button',{name:'Save project',exact:true}).click();const saved=JSON.parse(await fs.readFile(await(await dl).path(),'utf8'));assert.equal(saved.format,'reqoo-cad');assert.equal(saved.features.at(-1).type,'chamfer');await page.reload();await ready();await page.waitForFunction(()=>window.__cad.items.some(i=>i.kind==='body'));near((await body()).volume,finalVolume,.01);
 for(const format of ['STEP','STL']){const dl=page.waitForEvent('download');await page.locator('#exportTop').click();await page.getByRole('button',{name:'Export '+format,exact:true}).click();const bytes=await fs.readFile(await(await dl).path());assert.ok(bytes.length>84);if(format==='STEP'){assert.ok(bytes.toString().includes('ISO-10303-21'));await fs.writeFile(path.join(out,'acceptance-project.step'),bytes);}else{const triangles=bytes.readUInt32LE(80);assert.equal(bytes.length,84+50*triangles);}}
 checks.push('Completed parametric project saves, reloads and exports valid STEP and binary STL');
 await page.mouse.click(500,100);
 for(const [width,h]of [[375,667],[1180,687],[1180,820],[1440,900]]){await page.setViewportSize({width,height:h});await page.evaluate(()=>window.__cad.view('iso'));await page.locator('#fit').click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
 await page.evaluate(()=>document.documentElement.style.setProperty('--app-height','100px'));
 assert.ok(await page.evaluate(()=>Math.abs(document.querySelector('#app').getBoundingClientRect().bottom-innerHeight)<2),'Workspace must fill viewport even after a stale visualViewport height');
 await page.screenshot({path:path.join(out,'acceptance-layout-'+width+'.png')});}checks.push('Completed model renders in mobile, iPad and desktop layouts');
 assert.deepEqual(errors,[]);
 await fs.writeFile(path.join(out,'acceptance-results.json'),JSON.stringify({url,version,checks,errors,volume:finalVolume},null,2));console.log('ACCEPTANCE PASS',checks.length,checks);
}catch(e){console.error('ACCEPTANCE FAILED',e,checks,await page.locator('body').innerText());await page.screenshot({path:path.join(out,'acceptance-failure.png')}).catch(()=>{});throw e;}finally{await browser.close();await new Promise(r=>server.close(r));}

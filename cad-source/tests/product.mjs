import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
const out=path.resolve('test-results'),root=path.resolve('dist');await fs.mkdir(out,{recursive:true});
const server=http.createServer(async(req,res)=>{try{let pathname=new URL(req.url,'http://localhost').pathname;if(pathname.startsWith('/cad/'))pathname=pathname.slice(4);const f=path.resolve(root,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));if(!f.startsWith(root+path.sep))throw Error();const bytes=await fs.readFile(f);res.writeHead(200,{'Content-Type':({'.js':'text/javascript','.css':'text/css','.wasm':'application/wasm','.html':'text/html','.json':'application/json'})[path.extname(f)]||'application/octet-stream'});res.end(bytes);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(4176,'127.0.0.1',r));
const url=process.env.CAD_TEST_URL||'http://127.0.0.1:4176/',browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1180,height:820},hasTouch:true,isMobile:true,acceptDownloads:true}),page=await context.newPage(),errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(60000);
const near=(actual,expected,tol=.01)=>assert.ok(Math.abs(actual-expected)<tol,JSON.stringify({actual,expected}));
const body=()=>page.evaluate(()=>window.__cad.items.find(i=>i.kind==='body'));
const projection=async(x,y,z)=>page.evaluate(({x,y,z})=>{const p=window.__cad.camera.position.clone().set(x,y,z).project(window.__cad.camera),r=document.querySelector('#canvas').getBoundingClientRect();return{x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2};},{x,y,z});
const ready=()=>page.waitForFunction(()=>window.__cad?.ready(),{},{timeout:90000});
const preview=()=>page.waitForFunction(()=>window.__cad.previewItems?.some(i=>i.kind==='body'),{},{timeout:90000});
try{
 await page.goto(url+'?test=1');await ready();await page.locator('#settingsToggle').click();await page.locator('#cadUnits').selectOption('in');await page.locator('#cadTheme').selectOption('dark');await page.locator('#cadPrecision').selectOption('4');assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');await page.locator('#settingsToggle').click();
 await page.locator('#nav-add').click();await page.locator('[data-tool=box]').click();await page.locator('#p-width').fill('2');await page.locator('#p-depth').fill('1');await page.locator('#p-height').fill('.5');await page.getByRole('button',{name:'Apply',exact:true}).click();await page.waitForFunction(()=>window.__cad.items.some(i=>i.kind==='body'));near((await body()).volume,50.8*25.4*12.7,.01);checks.push('Inch numerical input creates precise millimetre BREP; theme and precision preferences persist');
 await page.locator('#itemsToggle').click();const original=await page.evaluate(()=>window.__cad.items[0].name);await page.getByRole('button',{name:'Rename '+original,exact:true}).click();await page.getByLabel('Rename object',{exact:true}).fill('Bracket body');await page.getByLabel('Rename object',{exact:true}).press('Enter');await page.waitForFunction(()=>window.__cad.items[0].name==='Bracket body');await page.locator('#itemsToggle').click();
 await page.locator('#historyToggle').click();await page.getByRole('button',{name:'Suppress Bracket body',exact:true}).click();await page.waitForFunction(()=>window.__cad.items.length===0);await page.getByRole('button',{name:'Unsuppress Bracket body',exact:true}).click();await page.waitForFunction(()=>window.__cad.items.length===1);await page.getByRole('button',{name:'Remove feature Bracket body',exact:true}).click();await page.waitForFunction(()=>window.__cad.doc.features.length===0);await page.locator('#undo').click();await page.waitForFunction(()=>window.__cad.items.length===1);await page.locator('#historyToggle').click();checks.push('Object rename, safe leaf suppression/removal and Undo remain synchronized with native history');
 const dl=page.waitForEvent('download');await page.locator('#exportTop').click();await page.getByRole('button',{name:'Export 3MF',exact:true}).click();const bytes=await fs.readFile(await(await dl).path());const {unzipSync,strFromU8}=await import('three/addons/libs/fflate.module.js');const zip=unzipSync(bytes),model=strFromU8(zip['3D/3dmodel.model']);assert.ok(model.includes('unit="millimeter"'));assert.ok(model.includes('<triangle '));assert.ok(zip['_rels/.rels']);checks.push('3MF package contains native CAD tessellation, millimetre units and valid OPC relationships');
 await page.mouse.click(600,100);await page.evaluate(()=>window.__cad.apply('sketch',{shape:'circle',radius:3,plane:'XY',x:0,y:0},[]));
 for(const format of ['SVG','DXF']){const dl=page.waitForEvent('download');await page.locator('#exportTop').click();await page.getByRole('button',{name:'Export sketch '+format,exact:true}).click();const text=await fs.readFile(await(await dl).path(),'utf8');if(format==='SVG')assert.ok(text.includes('width="6mm"')&&text.includes('r="3"'));else assert.ok(text.includes('CIRCLE')&&text.includes('$INSUNITS')&&text.includes('\n40\n3\n'));}
 checks.push('SVG and DXF circle export preserve 6 mm diameter despite inch display preference');
 assert.ok(await page.evaluate(()=>JSON.parse(localStorage.getItem('reqoo-cad-v1-backup')).format==='reqoo-cad'));
 await page.reload();await ready();assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');near((await body()).volume,50.8*25.4*12.7,.01);await page.screenshot({path:path.join(out,'product-dark-inch-objects.png')});checks.push('Autosave backup and geometry survive reload with preferences');

 const fresh=async()=>page.evaluate(()=>window.__cad.rebuild({format:'reqoo-cad',version:1,title:'Feature QA',features:[],ui:{hidden:[],colors:{}}},{history:false}));
 const op=(type,params,inputs=[])=>page.evaluate(({type,params,inputs})=>window.__cad.apply(type,params,inputs),{type,params,inputs});
 await fresh();let source=await op('sketch',{shape:'circle',radius:10,plane:'XY'});let offset=await op('sketchOffset',{distance:2,keepInputs:false},[source]);await op('extrude',{distance:10},[offset]);near((await body()).volume,1440*Math.PI,.02);await page.evaluate(()=>{const d=JSON.parse(JSON.stringify(window.__cad.doc));d.features[0].params.radius=11;return window.__cad.rebuild(d);});near((await body()).volume,1690*Math.PI,.02);checks.push('Derived sketch offset remains parametric and updates dependent solid exactly');
 await fresh();source=await op('sketch',{shape:'rectangle',width:30,height:20,plane:'XY'});let rounded=await op('sketchFillet',{radius:2},[source]);await op('extrude',{distance:10},[rounded]);near((await body()).volume,6000-(4-Math.PI)*40,.03);checks.push('Sketch corner fillet builds real rounded profile with analytic extrusion volume');
 await fresh();source=await op('sketch',{shape:'polyline',points:[[0,0],[10,0],[0,10]],closed:true,plane:'XY'});let mirrored=await op('sketchMirror',{axis:'X'},[source]);await op('extrude',{distance:10},[mirrored]);near((await body()).volume,500,.02);checks.push('Derived mirror preserves closed-profile area and native extrusion');
 await fresh();source=await op('box',{width:30,depth:20,height:10});let native=await body(),side=native.faceInfo.find(f=>f.normal[0]>.99);await op('draft',{face:side.index,faceRef:side.reference,angle:5,plane:'XY',offset:0},[source]);near(Math.abs((await body()).volume-6000),1000*Math.tan(5*Math.PI/180),.1);checks.push('Selected face draft is a native taper with analytic wedge volume');
 await fresh();source=await op('sketch',{shape:'rectangle',width:30,height:20,plane:'XY',construction:true});const prior=await page.evaluate(()=>JSON.stringify(window.__cad.doc));let rejected=false;try{await op('extrude',{distance:10},[source]);}catch{rejected=true;}assert.equal(rejected,true);assert.equal(await page.evaluate(()=>JSON.stringify(window.__cad.doc)),prior);checks.push('Construction geometry cannot accidentally become an extrusion');


 await page.locator('#themeToggle').click();assert.equal(await page.locator('html').getAttribute('data-theme'),'light');
 await page.locator('#themeToggle').click();assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');checks.push('Header appearance button switches light/dark immediately');
 await page.locator('#settingsToggle').click();await page.locator('#cadUnits').selectOption('mm');await page.locator('#settingsToggle').click();
 await fresh();source=await op('sketch',{shape:'circle',radius:10,plane:'XY'});offset=await op('sketchOffset',{distance:2,keepInputs:false},[source]);
 await page.locator('#modeSolid').click();await page.locator('[data-view=top]').click();await page.locator('#fit').click();
 let point=await projection(0,0,0);await page.touchscreen.tap(point.x,point.y);
 assert.equal(await page.evaluate(()=>window.__cad.selection.at(-1).id),offset+':core');
 point=await projection(11,0,0);await page.touchscreen.tap(point.x,point.y);
 assert.equal(await page.evaluate(()=>window.__cad.selection.at(-1).id),offset+':band');
 assert.equal(await page.evaluate(()=>window.__cad.selection.length),1);
 await page.screenshot({path:path.join(out,'product-ring-region-dark.png')});
 await page.locator('#context').getByRole('button',{name:'Extrude',exact:true}).click();await page.locator('#faceDistanceValue').fill('5');await page.locator('#faceDistanceValue').dispatchEvent('input');await page.waitForFunction(()=>!window.__cad.direct.state.inFlight&&!window.__cad.direct.state.pending);await preview();
 near(await page.evaluate(()=>window.__cad.previewItems.find(i=>i.kind==='body').volume),220*Math.PI,.03);
 await page.locator('#faceDistanceApply').click();await page.waitForFunction(()=>window.__cad.items.some(i=>i.kind==='body'));near((await body()).volume,220*Math.PI,.03);
 assert.equal(await page.evaluate(()=>window.__cad.doc.features.at(-1).inputs[0]),offset+':band');
 await page.evaluate(()=>{const d=JSON.parse(JSON.stringify(window.__cad.doc));d.features[0].params.radius=11;return window.__cad.rebuild(d);});near((await body()).volume,240*Math.PI,.03);
 await page.reload();await ready();near((await body()).volume,240*Math.PI,.03);assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
 await page.locator('[data-view=iso]').click();await page.locator('#fit').click();await page.screenshot({path:path.join(out,'product-ring-solid-dark.png')});
 checks.push('Touch centre/band independently; band extrudes to a true annular BREP and rebuilds/reloads parametrically');

 assert.deepEqual(errors,[]);await fs.writeFile(path.join(out,'product-results.json'),JSON.stringify({checks,errors},null,2));console.log('PRODUCT PASS',checks);
}catch(e){console.error('PRODUCT FAILED',e,checks,await page.locator('body').innerText());await page.screenshot({path:path.join(out,'product-failure.png')}).catch(()=>{});throw e;}finally{await browser.close();await new Promise(r=>server.close(r));}

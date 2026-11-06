import {setToolValue,setToolChoice,setToolToggle,toolField,applyTool,cancelTool} from './canvas-tool-flow.mjs';
import {openToolMenu} from './sketch-flow.mjs';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
const out=path.resolve('test-results'),root=path.resolve(process.env.CAD_BUILD_DIR||'dist');await fs.mkdir(out,{recursive:true});
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
 await page.goto(url+'?test=1');await ready();await page.locator('#settingsToggle').click();await page.locator('#cadUnits').selectOption('in');await page.locator('#cadTheme').selectOption('dark');await page.locator('#cadPrecision').selectOption('4');await page.waitForFunction(()=>document.querySelector('#gridReadout').textContent==='0.0394\nin');assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');await page.locator('#settingsToggle').click();
 await openToolMenu(page,'add');await page.locator('[data-tool=box]').click();await setToolValue(page,'width','2');await setToolValue(page,'depth','1');await setToolValue(page,'height','.5');await page.getByRole('button',{name:'Apply',exact:true}).click();await page.waitForFunction(()=>window.__cad.items.some(i=>i.kind==='body'));near((await body()).volume,50.8*25.4*12.7,.01);checks.push('Inch numerical input creates precise millimetre BREP; theme and precision preferences persist');
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
 await page.locator('#modeSolid').click();await page.evaluate(()=>window.__cad.view('top'));await page.locator('#fit').click();
 await page.evaluate(()=>window.__cad.select([]));let point=await projection(0,0,0);await page.touchscreen.tap(point.x,point.y);
 assert.equal(await page.evaluate(()=>window.__cad.selection.at(-1).id),offset+':core');
 point=await projection(11,0,0);await page.touchscreen.tap(point.x,point.y);
 assert.equal(await page.evaluate(()=>window.__cad.selection.at(-1).id),offset+':band');
 assert.equal(await page.evaluate(()=>window.__cad.selection.length),2);const corePoint=await projection(0,0,0);await page.touchscreen.tap(corePoint.x,corePoint.y);assert.equal(await page.evaluate(()=>window.__cad.selection.length),1);assert.equal(await page.evaluate(()=>window.__cad.selection[0].id),offset+':band');
 await page.screenshot({path:path.join(out,'product-ring-region-dark.png')});
 await page.locator('#context').getByRole('button',{name:'Extrude',exact:true}).click();await page.locator('#faceDistanceValue').fill('5');await page.locator('#faceDistanceValue').dispatchEvent('input');await page.waitForFunction(()=>!window.__cad.direct.state.inFlight&&!window.__cad.direct.state.pending);await preview();
 near(await page.evaluate(()=>window.__cad.previewItems.find(i=>i.kind==='body').volume),220*Math.PI,.03);
 await page.locator('#faceDistanceApply').click();await page.waitForFunction(()=>window.__cad.items.some(i=>i.kind==='body'));near((await body()).volume,220*Math.PI,.03);
 assert.equal(await page.evaluate(()=>window.__cad.doc.features.at(-1).inputs[0]),offset+':band');
 await page.evaluate(()=>{const d=JSON.parse(JSON.stringify(window.__cad.doc));d.features[0].params.radius=11;return window.__cad.rebuild(d);});near((await body()).volume,240*Math.PI,.03);
 await page.reload();await ready();near((await body()).volume,240*Math.PI,.03);assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
 await page.evaluate(()=>window.__cad.view('iso'));await page.locator('#fit').click();await page.screenshot({path:path.join(out,'product-ring-solid-dark.png')});
 checks.push('Touch centre/band independently; band extrudes to a true annular BREP and rebuilds/reloads parametrically');


 // Geometry-attached annotation editing and orientation controls.
 await fresh();source=await op('sketch',{shape:'rectangle',width:30,height:20,plane:'XY'});
 await page.evaluate(()=>window.__cad.view('top'));await page.locator('#fit').click();
 await page.evaluate(()=>window.__cad.select([]));point=await projection(0,0,0);await page.touchscreen.tap(point.x,point.y);
 assert.equal(await page.locator('#sketchDimensionLines .dimensionMeasure').count(),2);
 const beforePath=await page.locator('[data-measure=width]').getAttribute('d');
 await page.evaluate(()=>window.__cad.view('iso'));await page.waitForFunction(old=>document.querySelector('[data-measure=width]')?.getAttribute('d')!==old,beforePath);
 assert.equal(await page.locator('#viewCube').getAttribute('data-orientation'),'iso');
 await page.evaluate(()=>window.__cad.view('front'));assert.equal(await page.locator('#viewCube').getAttribute('data-orientation'),'front');
 await page.evaluate(()=>window.__cad.view('right'));assert.equal(await page.locator('#viewCube').getAttribute('data-orientation'),'right');
 await page.evaluate(()=>window.__cad.view('top'));
 await page.locator('[data-dimension=width]').fill('40');await page.locator('[data-dimension=width]').press('Enter');await page.waitForFunction(()=>window.__cad.doc.features[0].params.width===40);
 const overlap=await page.evaluate(()=>{const a=document.querySelector('[data-dimension-label=width]').getBoundingClientRect(),b=document.querySelector('#context').getBoundingClientRect();return a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;});assert.equal(overlap,false,'Dimension label must not cover contextual tools');
 await page.screenshot({path:path.join(out,'product-attached-rectangle-dimensions.png')});
 checks.push('Named orientations update camera and dimension lines');
 await op('extrude',{distance:5,keepInputs:true},[source]);near((await body()).volume,4000,.03);
 await page.evaluate(id=>window.__cad.select([{id,kind:'sketch'}]),source);
 await page.locator('[data-dimension=width]').fill('50');await page.locator('[data-dimension=width]').press('Enter');await page.waitForFunction(()=>window.__cad.doc.features[0].params.width===50);near((await body()).volume,5000,.03);
 checks.push('Tap sketch → attached width dimension → Enter updates sketch and dependent native extrusion');
 await fresh();source=await op('sketch',{shape:'circle',radius:10,plane:'XY'});offset=await op('sketchOffset',{distance:2,keepInputs:false},[source]);
 await page.evaluate(()=>window.__cad.view('top'));await page.locator('#fit').click();
 assert.equal(await page.locator('[data-measure=innerDiameter]').count(),1);assert.equal(await page.locator('[data-measure=outerDiameter]').count(),1);
 await page.locator('[data-dimension=innerDiameter]').fill('18');await page.locator('[data-dimension=outerDiameter]').fill('26');await page.getByRole('button',{name:'Apply sketch dimensions',exact:true}).click();
 await page.waitForFunction(()=>window.__cad.doc.features[0].params.radius===9&&window.__cad.doc.features[1].params.distance===4);
 await page.screenshot({path:path.join(out,'product-attached-ring-dimensions.png')});
 await op('extrude',{distance:5},[offset+':band']);near((await body()).volume,440*Math.PI,.04);
 checks.push('Ring inner/outer diameter annotations edit the source and offset in one history transaction');


 // View cube targets change camera direction, including edge/corner orientations.
 await page.evaluate(()=>window.__cad.view('iso'));await page.locator('#fit').click();
 const cameraDirection=()=>page.evaluate(()=>window.__cad.camera.position.clone().sub(window.__cad.controls.target).normalize().toArray());
 await page.locator('[data-cube-view=top]').click();let dir=await cameraDirection();near(dir[2],1,.001);
 await page.locator('[data-cube-view="corner:1,-1,1"]').click();dir=await cameraDirection();near(dir[0],1/Math.sqrt(3),.002);near(dir[1],-1/Math.sqrt(3),.002);near(dir[2],1/Math.sqrt(3),.002);
 await page.locator('[data-cube-view="edge:1,0,1"]').click();dir=await cameraDirection();near(dir[0],Math.SQRT1_2,.002);near(dir[1],0,.002);near(dir[2],Math.SQRT1_2,.002);
 checks.push('Projected view cube face, corner and edge targets orient the actual modeling camera');
 assert.equal(await page.locator('#viewCube .cubeShortcuts').count(),0);
 const cube=await page.locator('.orientationGraphic').boundingBox(),beforeDrag=await cameraDirection();
 await page.mouse.move(cube.x+cube.width/2,cube.y+cube.height/2);
 await page.mouse.down();await page.mouse.move(cube.x+cube.width/2+24,cube.y+cube.height/2+16,{steps:8});
 const duringDrag=await cameraDirection();
 assert.ok(duringDrag.some((v,i)=>Math.abs(v-beforeDrag[i])>.02),'Cube drag rotates camera before release');
 await page.mouse.up();await page.waitForTimeout(100);
 const afterDrag=await cameraDirection();duringDrag.forEach((v,i)=>near(afterDrag[i],v,.002));
 assert.equal(await page.evaluate(()=>window.__cad.controls.enabled),true);
 checks.push('Cube drag rotates live without snapping on release; redundant text buttons removed');

 await page.evaluate(()=>window.__cad.view('iso'));await page.evaluate(()=>window.__cad.select([]));
 const unchanged=await page.evaluate(()=>JSON.stringify(window.__cad.doc)),unchangedVolume=(await body()).volume;
 const chooseDisplay=async(mode)=>{if(!await page.locator('[data-display-mode="'+mode+'"]').isVisible())await page.locator('#displayModeButton').click();await page.locator('[data-display-mode="'+mode+'"]').click();};
 for(const mode of ['shaded','wireframe','shadedEdges']){
  await chooseDisplay(mode);assert.equal(await page.locator('[data-display-mode="'+mode+'"]').getAttribute('aria-checked'),'true');
  const drawing=await page.evaluate(()=>{let surfaces=0,edges=0;window.__cad.root.traverse(n=>{if(n.isMesh&&n.userData.kind==='body'&&n.material.some(m=>m.colorWrite))surfaces++;if(n.isLineSegments&&n.userData.itemKind==='body'&&n.material.colorWrite)edges++;});return{surfaces,edges};});
  if(mode==='shaded'){assert.ok(drawing.surfaces>0);assert.equal(drawing.edges,0);}
  if(mode==='wireframe'){assert.equal(drawing.surfaces,0);assert.ok(drawing.edges>0);}
  if(mode==='shadedEdges'){assert.ok(drawing.surfaces>0&&drawing.edges>0);}
  assert.equal(await page.evaluate(()=>JSON.stringify(window.__cad.doc)),unchanged);near((await body()).volume,unchangedVolume,.01);
  await page.screenshot({path:path.join(out,'product-display-'+mode+'.png')});
 }
 checks.push('Solid / Solid + edges / CAD Wireframe alter drawing only and preserve exact model/history');
 await chooseDisplay('wireframe');await page.evaluate(()=>window.__cad.view('top'));await page.locator('#pickMode').selectOption('face');point=await projection(11,0,5);await page.touchscreen.tap(point.x,point.y);assert.equal(await page.evaluate(()=>window.__cad.selection.at(-1)?.kind),'face');
 await page.reload();await ready();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('reqoo-cad-preferences')).displayMode),'wireframe');near((await body()).volume,unchangedVolume,.01);
 await page.locator('#displayModeButton').click();assert.equal(await page.locator('[data-display-mode=wireframe]').getAttribute('aria-checked'),'true');await page.keyboard.press('Escape');
 checks.push('Wireframe retains real face picking and persists appearance across reload');


 // A two-arc sketch must extrude into one continuous cylindrical CAD face.
 await fresh();await chooseDisplay('shadedEdges');await page.locator('#pickMode').selectOption('auto');
 const circle=await op('sketch',{shape:'circle',radius:10,plane:'XY'});
 await op('extrude',{distance:20},[circle]);
 const cylinder=await body(),sides=cylinder.faceInfo.filter(f=>['CYLINDER','CYLINDRE'].includes(f.type));
 assert.equal(sides.length,1,'Circle extrusion has one continuous cylindrical face');
 assert.equal(cylinder.faceInfo.length,3);near(cylinder.volume,2000*Math.PI,.02);
 await page.evaluate(()=>window.__cad.view('front'));await page.locator('#fit').click();await page.evaluate(()=>window.__cad.select([]));
 let tapPoint=await projection(3,-Math.sqrt(91),10);
 await page.touchscreen.tap(tapPoint.x,tapPoint.y);
 assert.equal(await page.evaluate(()=>window.__cad.selection.at(-1)?.kind),'face');
 assert.equal(await page.evaluate(()=>window.__cad.selection.at(-1)?.index),sides[0].index);
 // Test a separate double-tap gesture without inspection round trips between taps.
 await page.waitForTimeout(400);await page.evaluate(()=>window.__cad.select([]));
 await page.touchscreen.tap(tapPoint.x,tapPoint.y);await page.touchscreen.tap(tapPoint.x,tapPoint.y);
 assert.deepEqual(await page.evaluate(()=>window.__cad.selection.map(s=>({id:s.id,kind:s.kind}))),[{id:cylinder.id,kind:'body'}]);
 assert.equal(await page.locator('#faceDistance').isVisible(),false);
 await page.waitForTimeout(400);await page.evaluate(()=>window.__cad.select([]));
 await page.mouse.dblclick(tapPoint.x,tapPoint.y);
 assert.equal(await page.evaluate(()=>window.__cad.selection.at(-1)?.kind),'body');
 await page.screenshot({path:path.join(out,'product-continuous-cylinder-body-selected.png')});
 checks.push('Two-arc circle extrudes into one native cylindrical face; touch double tap and mouse double click select full body');
 await fresh();const ringSketch=await op('sketch',{shape:'annulus',radius:12,innerRadius:8,plane:'XY'});
 await op('extrude',{distance:5},[ringSketch]);const ring=await body();
 assert.equal(ring.faceInfo.filter(f=>['CYLINDER','CYLINDRE'].includes(f.type)).length,2,'Ring has one inner and one outer cylindrical face');
 near(ring.volume,400*Math.PI,.02);
 checks.push('Annulus extrusion preserves exact volume with continuous inner and outer cylindrical faces');


 // Origin, world-space face handles, finishing history and compact XYZ move.
 assert.equal(await page.locator('#worldReference [data-origin]').innerText(),'0, 0, 0');
 assert.equal(await page.locator('#worldReference [data-axis]').count(),3);
 await fresh();const sourceCircle=await op('sketch',{shape:'circle',radius:10,plane:'XY'});await op('extrude',{distance:20},[sourceCircle]);
 let finished=await body(),rim=finished.edges.find(e=>e.type==='CIRCLE'&&Math.abs(e.center[2]-20)<.001);
 await op('chamfer',{radius:1,edges:[rim.index],edgeRefs:[rim.reference],allEdges:false},[finished.id]);
 finished=await body();rim=finished.edges.find(e=>e.type==='CIRCLE'&&Math.abs(e.center[2])<.001);
 await op('fillet',{radius:1,edges:[rim.index],edgeRefs:[rim.reference],allEdges:false},[finished.id]);
 finished=await body();let finishedSide=finished.faceInfo.find(f=>f.type==='CYLINDRE');
 await page.evaluate(({id,index})=>window.__cad.select([{id,kind:'face',index,point:[10,0,10]}]),{id:finished.id,index:finishedSide.index});
 await page.waitForFunction(()=>document.querySelector('#faceDragHandle').dataset.normal==='1,0,0');
 const anchoredNormal=await page.locator('#faceDragHandle').getAttribute('data-normal');
 await page.evaluate(()=>window.__cad.view('back'));await page.waitForTimeout(100);assert.equal(await page.locator('#faceDragHandle').getAttribute('data-normal'),anchoredNormal);
 await page.evaluate(()=>window.__cad.view('iso'));await page.waitForTimeout(100);assert.equal(await page.locator('#faceDragHandle').getAttribute('data-normal'),anchoredNormal);
 const palette=await page.evaluate(()=>{const result=[];window.__cad.root.traverse(n=>{if(n.isMesh&&n.userData.kind==='body')result.push({base:n.material[0].color.getHexString(),selected:n.material[1].color.getHexString(),basic:n.material[1].isMeshBasicMaterial,highlight:n.geometry.groups.some(g=>g.materialIndex===1)});});return result;});
 const selectedColor=await page.evaluate(()=>document.documentElement.dataset.theme==='dark'?'6ca9c8':'298dca');assert.ok(palette.some(p=>p.selected===selectedColor&&p.basic&&p.highlight&&p.base!==p.selected));
 await page.locator('#faceDistanceValue').fill('30');await page.locator('#faceDistanceApply').click();
 await page.waitForFunction(id=>window.__cad.doc.features.find(f=>f.id===id).params.radius===15,sourceCircle);
 finished=await body();assert.ok(finished.faceInfo.some(f=>f.type==='CONE'));assert.ok(finished.faceInfo.some(f=>f.type==='TORUS'));near(finished.faceInfo.find(f=>f.cylinder).cylinder.radius,15,.001);
 await page.locator('#undo').click();await page.waitForFunction(id=>window.__cad.doc.features.find(f=>f.id===id).params.radius===10,sourceCircle);
 await page.locator('#redo').click();await page.waitForFunction(id=>window.__cad.doc.features.find(f=>f.id===id).params.radius===15,sourceCircle);
 checks.push('Diameter edits after chamfer and fillet rebuild both finishing features; undo/redo preserve source history; face arrow normal stays fixed while orbiting; selection has contrasting color');
 finished=await body();const oldBounds=finished.bounds;
 await page.evaluate(id=>window.__cad.select([{id,kind:'body'}]),finished.id);await page.locator('#context').getByRole('button',{name:'Move',exact:true}).click();
 assert.equal(await page.locator('#toolPanel').isVisible(),false);assert.equal(await page.locator('[data-move-axis]').count(),3);
 const xHandle=await page.locator('[data-move-axis="0"]').boundingBox(),xDirection=await page.evaluate(()=>{const c=window.__cad.camera,r=document.querySelector('#canvas').getBoundingClientRect(),a=c.position.clone().set(0,0,0).project(c),b=c.position.clone().set(1,0,0).project(c),x=(b.x-a.x)*r.width/2,y=(a.y-b.y)*r.height/2,l=Math.hypot(x,y);return{x:x/l,y:y/l};});
 await page.mouse.move(xHandle.x+xHandle.width/2,xHandle.y+xHandle.height/2);await page.mouse.down();await page.mouse.move(xHandle.x+xHandle.width/2+xDirection.x*25,xHandle.y+xHandle.height/2+xDirection.y*25,{steps:5});
 assert.ok(await page.evaluate(id=>window.__cad.root.children.find(n=>n.userData.itemId===id).position.x>0,finished.id),'XYZ arrow drag previews before release');await page.mouse.up();
 await page.locator('[aria-label="Move distance"]').fill('5');
 assert.equal(await page.evaluate(id=>window.__cad.root.children.find(n=>n.userData.itemId===id).position.x,finished.id),5,'Move preview updates immediately');
 await page.locator('[data-move-axis="1"]').click();await page.locator('[aria-label="Move distance"]').fill('7');
 await page.locator('[data-move-axis="2"]').click();await page.locator('[aria-label="Move distance"]').fill('3');
 await page.screenshot({path:path.join(out,'product-compact-xyz-move.png')});
 await page.locator('[aria-label="Apply move"]').click();await page.waitForFunction(()=>window.__cad.doc.features.at(-1).type==='move'&&!window.__cad.gizmo.busy);
 let moved=await body();for(let i=0;i<3;i++)near(moved.bounds[0][i],oldBounds[0][i]+[5,7,3][i],.001);
 await page.locator('#undo').click();await page.waitForFunction(()=>window.__cad.doc.features.at(-1).type==='fillet');
 checks.push('Move uses compact XYZ arrows with live affine preview; commits exact X/Y/Z translations and supports undo');
 await page.evaluate(()=>window.__cad.view('iso'));await page.locator('#fit').click();
 finished=await body();finishedSide=finished.faceInfo.find(f=>f.type==='CYLINDRE');await page.evaluate(({id,index})=>window.__cad.select([{id,kind:'face',index,point:[15,0,10]}]),{id:finished.id,index:finishedSide.index});
 await page.waitForFunction(()=>!document.querySelector('#faceDistance').hidden);
 await page.screenshot({path:path.join(out,'product-origin-fixed-face-arrow-selection.png')});

 assert.deepEqual(errors,[]);await fs.writeFile(path.join(out,'product-results.json'),JSON.stringify({checks,errors},null,2));console.log('PRODUCT PASS',checks);
}catch(e){console.error('PRODUCT FAILED',e,checks,await page.locator('body').innerText());await page.screenshot({path:path.join(out,'product-failure.png')}).catch(()=>{});throw e;}finally{await browser.close();await new Promise(r=>server.close(r));}

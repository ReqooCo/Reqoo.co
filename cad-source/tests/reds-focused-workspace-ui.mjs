import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {chromium} from 'playwright';

// Regression gate for the common operation overlay, not just Thread.
const root=path.resolve(process.env.CAD_BUILD_DIR||'dist');
const out=path.resolve('test-results');
await fs.mkdir(out,{recursive:true});
const server=http.createServer(async(req,res)=>{
 try{
  let pathname=new URL(req.url,'http://localhost').pathname;
  if(pathname.startsWith('/cad/'))pathname=pathname.slice(4);
  const name=path.resolve(root,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));
  if(!name.startsWith(root+path.sep))throw Error('Invalid path');
  res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.css':'text/css','.wasm':'application/wasm','.json':'application/json'})[path.extname(name)]||'application/octet-stream'});
  res.end(await fs.readFile(name));
 }catch{res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url=process.env.CAD_TEST_URL||('http://127.0.0.1:'+server.address().port+'/');
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1180,height:820},hasTouch:true});
const page=await context.newPage();
const errors=[];
page.on('pageerror',error=>errors.push(error.message));
page.setDefaultTimeout(30000);
const ready=()=>page.waitForFunction(()=>window.__cad?.ready());
const rect=locator=>locator.boundingBox();
const assertInside=(bounds,width,height,label)=>{
 assert.ok(bounds, label+' missing bounds');
 assert.ok(bounds.x>=0&&bounds.y>=0,label+' origin outside viewport');
 assert.ok(bounds.x+bounds.width<=width+1&&bounds.y+bounds.height<=height+1,label+' clipped');
};
async function inspectDock(width,height,label){
 const dock=page.locator('#operationGizmo .operationActions');
 const parameters=page.locator('#operationGizmo [data-badges]');
 await dock.waitFor({state:'visible'});
 const d=await rect(dock),p=await rect(parameters);
 assertInside(d,width,height,label+' operation card');
 assertInside(p,width,height,label+' parameters');
 assert.ok(d.y+d.height<=p.y+1,label+' controls overlap parameters');
 assert.ok(await page.locator('#operationGizmo [data-gizmo-field]:visible').count()>=2,label+' missing parameter controls');
 const badge=await rect(page.locator('#operationGizmo [data-gizmo-field]:visible').first());
 assert.ok(badge.x>=p.x-1&&badge.x+badge.width<=p.x+p.width+1,label+' badge not docked');
 assert.equal(await page.locator('#operationGizmo [data-apply]').isVisible(),true);
 assert.equal(await page.locator('#operationGizmo [data-cancel]').isVisible(),true);
}
try{
 await page.goto(url+'?test=1');await ready();
 await page.evaluate(async()=>{
  await window.__cad.rebuild({format:'reqoo-cad',version:1,title:'REDS UX Test',features:[],ui:{hidden:[],colors:{}}});
 });
 const emptyOverlap=await page.evaluate(()=>{
  const stage=document.querySelector('#stage').getBoundingClientRect();
  const button=document.querySelector('#empty>button').getBoundingClientRect();
  const world=window.__cad.worldReference.group.position.clone().project(window.__cad.camera);
  const x=stage.left+(world.x+1)*stage.width/2,y=stage.top+(1-world.y)*stage.height/2;
  const nearestX=Math.max(button.left,Math.min(x,button.right)),nearestY=Math.max(button.top,Math.min(y,button.bottom));
  return Math.hypot(nearestX-x,nearestY-y);
 });
 assert.ok(emptyOverlap>=55,'New Sketch CTA must not crowd the world origin');
 assert.equal(await page.locator('#rail').isVisible(),true);
 assert.equal(await page.locator('.utilityLabel').first().evaluate(el=>getComputedStyle(el).display),'none');
 assert.ok((await rect(page.locator('#rail'))).width<=60,'rail must remain icon-sized');
 await page.evaluate(()=>window.__cad.startTool('box'));
 await inspectDock(1180,820,'Box desktop');
 await page.screenshot({path:path.join(out,'reds-focused-box-desktop.png')});
 await page.locator('#operationGizmo [data-cancel]').click();
 assert.equal(await page.locator('#operationGizmo').isVisible(),false);
 const id=await page.evaluate(()=>window.__cad.apply('cylinder',{radius:3,height:6},[]));
 await page.evaluate(id=>{
  const item=window.__cad.items.find(i=>i.id===id);
  const face=item.faceInfo.find(f=>f.cylinder?.full);
  if(!face)throw Error('No cylindrical side face');
  window.__cad.select([{id,kind:'face',index:face.index}]);
  window.__cad.startTool('thread');
 },id);
 await inspectDock(1180,820,'Thread desktop');
 assert.equal(await page.locator('#p-kind').inputValue(),'External');
 await page.screenshot({path:path.join(out,'reds-focused-thread-desktop.png')});
 await page.setViewportSize({width:1666,height:896});
 await inspectDock(1666,896,'Thread wide desktop');
 await page.screenshot({path:path.join(out,'reds-focused-thread-wide.png')});
 await page.setViewportSize({width:820,height:1180});
 await inspectDock(820,1180,'Thread tablet portrait');
 await page.screenshot({path:path.join(out,'reds-focused-thread-tablet.png')});
 await page.setViewportSize({width:390,height:844});
 await inspectDock(390,844,'Thread phone');
 await page.screenshot({path:path.join(out,'reds-focused-thread-phone.png')});
 await page.locator('#operationGizmo [data-cancel]').click();
 assert.deepEqual(errors,[],'no unhandled browser errors');
 console.log('REDS FOCUSED UX PASS: Box and Thread shared dock, accessible fields, desktop/tablet/phone, cancel, zero page errors.');
} finally {
 await browser.close();
 await new Promise(resolve=>server.close(resolve));
}

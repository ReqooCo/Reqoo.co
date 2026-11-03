import {useToolNavigation} from './tool-navigation.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {_electron as electron} from 'playwright';
import path from 'node:path';
import {mkdir} from 'node:fs/promises';
test('Premium UI: contextual inspector, mouse drag, history and shortcuts',async()=>{
 await mkdir('test-results',{recursive:true});const flags=['--no-sandbox','--disable-gpu','--user-data-dir='+path.resolve('test-results/editor-profile-'+process.pid)];
 const app=await electron.launch({...(process.env.REQOO_EXE?{executablePath:process.env.REQOO_EXE,args:flags}:{args:[...flags,'.']}),env:{...process.env,REQOO_TEST:'1',REQOO_TEST_DIR:path.resolve('test-results')},timeout:60000});
 try{
 const page=useToolNavigation(await app.firstWindow()),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.waitForFunction(()=>!!window.__reqoo&&document.querySelector('#generateProduct'));
 assert.equal(await page.locator('#inspector').isVisible(),false);await page.locator('#productText').fill('TESTS');await page.locator('#generateProduct').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Produk siap'));assert.equal(await page.locator('#inspector').isVisible(),false);
 await page.locator('aside').first().evaluate(el=>el.scrollTop=0);await page.screenshot({path:'test-results/ui-v04-overview.png'});
 const point=()=>page.evaluate(()=>{const api=window.__reqoo,m=api.group.children.find(m=>m.userData.letter==='S'),g=m.geometry,p=g.attributes.position,n=g.attributes.normal;let vertex=0;for(let i=0;i<p.count;i+=3){if(n.getZ(i)>.9){vertex=i;break}}const v=api.camera.position.clone().set((p.getX(vertex)+p.getX(vertex+1)+p.getX(vertex+2))/3,(p.getY(vertex)+p.getY(vertex+1)+p.getY(vertex+2))/3,(p.getZ(vertex)+p.getZ(vertex+1)+p.getZ(vertex+2))/3);m.updateMatrixWorld(true);v.applyMatrix4(m.matrixWorld).project(api.camera);const r=api.renderer.domElement.getBoundingClientRect();return{x:r.left+(v.x+1)*r.width/2,y:r.top+(1-v.y)*r.height/2}});
 const state=()=>page.evaluate(()=>window.__reqoo.group.children.find(m=>m.userData.letter==='S').position.toArray());
 const initial=await state(),canvasBefore=await page.locator('#viewport canvas').boundingBox(),p=await point();await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(p.x+36,p.y-12,{steps:8});await page.mouse.up();
 assert.equal(await page.locator('#inspector').isVisible(),true);const moved=await state();assert.notDeepEqual(moved,initial);assert.equal(moved[2],initial[2]);assert.ok((await page.locator('#viewport canvas').boundingBox()).width<canvasBefore.width);
 await page.keyboard.press('Control+z');assert.deepEqual(await state(),initial);await page.keyboard.press('Control+y');assert.deepEqual(await state(),moved);
 const count=await page.locator('#objects option').count();await page.keyboard.press('Control+d');assert.equal(await page.locator('#objects option').count(),count+1);await page.keyboard.press('Control+z');assert.equal(await page.locator('#objects option').count(),count);
 await page.keyboard.press('Control+c');await page.keyboard.press('Control+v');assert.equal(await page.locator('#objects option').count(),count+1);await page.keyboard.press('Control+x');assert.equal(await page.locator('#objects option').count(),count);await page.keyboard.press('Control+v');assert.equal(await page.locator('#objects option').count(),count+1);
 await page.keyboard.press('Delete');assert.equal(await page.locator('#objects option').count(),count);await page.keyboard.press('Control+z');assert.equal(await page.locator('#objects option').count(),count+1);
 await page.locator('#px').fill('12');await page.locator('#px').dispatchEvent('change');await page.locator('#closeInspector').click();await page.keyboard.press('Control+z');assert.notEqual(await page.locator('#px').inputValue(),'12');
 await page.locator('#productText').fill('TYPING');await page.locator('#productText').press('Control+a');await page.locator('#productText').press('Backspace');assert.equal(await page.locator('#productText').inputValue(),'');assert.equal(await page.locator('#objects option').count(),count+1);
 await page.locator('#productText').fill('TESTS');await page.locator('#generateProduct').click();await page.waitForFunction(()=>!document.querySelector('#generateProduct').disabled);const click=await point();await page.mouse.click(click.x,click.y);assert.equal(await page.locator('#inspector').isVisible(),true);await page.locator('aside').first().evaluate(el=>el.scrollTop=0);await page.screenshot({path:'test-results/ui-v04-inspector.png'});await page.keyboard.press('Escape');assert.equal(await page.locator('#inspector').isVisible(),false);
 assert.deepEqual(errors,[]);console.log('PASS: canvas click/drag on real letter; stable camera/canvas; contextual inspector; undo/redo; copy/cut/paste/duplicate/delete; numeric undo; typing protected.');
 }finally{await app.close()}
});

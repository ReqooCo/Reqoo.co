import {useToolNavigation} from './tool-navigation.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {_electron as electron} from 'playwright';
import {readFile,readdir,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {STLLoader} from 'three/addons/loaders/STLLoader.js';
import {unzipSync,strFromU8} from 'three/addons/libs/fflate.module.js';
test('Smooth STL circle geometry, material 3MF roundtrip and slicer handoff',async()=>{
 await mkdir('test-results',{recursive:true});const flags=['--no-sandbox','--disable-gpu','--user-data-dir='+path.resolve('test-results/quality-profile-'+process.pid)];
 const app=await electron.launch({...(process.env.REQOO_EXE?{executablePath:process.env.REQOO_EXE,args:flags}:{args:[...flags,'.']}),env:{...process.env,REQOO_TEST:'1',REQOO_TEST_DIR:path.resolve('test-results')},timeout:60000});
 try{
  const page=useToolNavigation(await app.firstWindow());await page.waitForFunction(()=>window.__reqoo?.inspect3mf&&document.querySelector('#fontStatus').textContent.includes('tersedia'));
  await page.locator('#productText').fill('OO');await page.locator('#generateProduct').click();await page.waitForFunction(()=>!document.querySelector('#generateProduct').disabled);assert.match(await page.locator('#status').textContent(),/Produk siap/);
  const resolution=await page.evaluate(()=>window.__reqoo.group.children.filter(m=>m.userData.letter).map(m=>m.geometry.parameters.options.curveSegments));assert.ok(resolution.every(n=>n>=48));
  await page.locator('#exportPart').selectOption('base');await page.locator('#export').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('STL dieksport'));
  const stl=await readFile('test-results/reqoo-base.stl'),geometry=new STLLoader().parse(stl.buffer.slice(stl.byteOffset,stl.byteOffset+stl.byteLength)),positions=geometry.getAttribute('position'),points=new Map();
  for(let i=0;i<positions.count;i++){const x=positions.getX(i)+37.5,y=positions.getY(i);if(Math.abs(Math.hypot(x,y)-2)<.0001)points.set(x.toFixed(5)+','+y.toFixed(5),[x,y])}
  const circle=[...points.values()].sort((a,b)=>Math.atan2(a[1],a[0])-Math.atan2(b[1],b[0]));assert.ok(circle.length>=192,'Actual STL ring needs 192+ perimeter vertices');let worst=0;for(let i=0;i<circle.length;i++){const a=circle[i],b=circle[(i+1)%circle.length];worst=Math.max(worst,2-Math.hypot((a[0]+b[0])/2,(a[1]+b[1])/2))}assert.ok(worst<.001,'Circle chord deviation below 0.001 mm');
  await page.locator('#exportPart').selectOption('all');await page.locator('#export3mf').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('3MF berwarna dieksport'));
  const bytes=await readFile('test-results/reqoo-color.3mf'),entries=unzipSync(bytes),xml=strFromU8(entries['3D/3dmodel.model']);assert.match(xml,/unit="millimeter"/);assert.match(xml,/displaycolor="#172234FF"/);assert.match(xml,/displaycolor="#FFFFFFFF"/);assert.equal((xml.match(/<component objectid=/g)||[]).length,3);
  const roundtrip=await page.evaluate(bytes=>window.__reqoo.inspect3mf(bytes),Array.from(bytes));assert.deepEqual(roundtrip.colors,['#172234','#FFFFFF']);assert.ok(Math.abs(roundtrip.size[0]-85)<.001);assert.ok(Math.abs(roundtrip.size[1]-30)<.001);assert.ok(roundtrip.meshes>=3);
  const before=new Set(await readdir('test-results'));await page.locator('#openBambu').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Model dihantar'));const created=(await readdir('test-results')).filter(f=>!before.has(f)&&f.startsWith('reqoo-bambu-'));assert.equal(created.length,1);assert.ok((await readFile(path.join('test-results',created[0]))).length>1000);
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setSize(1920,1032));await page.locator('#productKind').selectOption('nametag');await page.locator('#productText').fill('MARIANI');await page.locator('#generateProduct').click();await page.waitForFunction(()=>!document.querySelector('#generateProduct').disabled);await page.evaluate(()=>window.__reqoo.choose(null));await page.locator('aside').first().evaluate(el=>el.scrollTop=0);await page.screenshot({path:'test-results/ui-v05-light.png'});
  console.log(`PASS: ${circle.length} circle edges in actual STL; max chord error ${worst.toFixed(7)} mm; font curves ${resolution[0]}; standard 3MF reloaded with two exact colors, correct mm bounds, registered parts; handoff file created (printer launch suppressed in test mode).`);
 }finally{await app.close()}
});

import {useToolNavigation} from './tool-navigation.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import { _electron as electron } from 'playwright';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
test('Windows desktop: lettering, transforms, save/load, STL and imports',async()=>{
 const app=await electron.launch({...(process.env.REQOO_EXE?{executablePath:process.env.REQOO_EXE,args:['--no-sandbox','--disable-gpu','--user-data-dir='+path.resolve('test-results/package-profile-'+process.pid)]}:{args:['--no-sandbox','--disable-gpu','.']}),env:{...process.env,REQOO_TEST:'1',REQOO_TEST_DIR:path.resolve('test-results')},timeout:60000});
 try{
 const page=useToolNavigation(await app.firstWindow());const errors=[];page.on('pageerror',err=>errors.push(err.message));
 await page.waitForFunction(()=>!!window.__reqoo,{},{timeout:60000});
 await page.locator('details:has(#objects)').evaluate(el=>el.open=true);await page.locator('details:has(#box)').evaluate(el=>el.open=true);
 const network=[];page.on('request',r=>{if(/^https?:/.test(r.url()))network.push(r.url())});
 await page.locator('#text').fill('ABCDE');await page.locator('#addText').click();assert.equal(await page.locator('#objects option').count(),5);
 await page.locator('#objects').selectOption('1');
 for(const [id,value] of [['sy','32'],['sz','7'],['px','-15'],['py','8'],['pz','2'],['rotation','15']]){await page.locator('#'+id).fill(value);await page.locator('#'+id).dispatchEvent('change')}
 assert.equal(await page.locator('#sy').inputValue(),'32');
 let state=await page.evaluate(()=>window.__reqoo.group.children.map(m=>({name:m.userData.name,p:m.position.toArray(),s:m.scale.toArray(),r:m.rotation.toArray(),metadata:m.userData})));
 assert.equal(state[1].p[1],8);assert.equal(state[0].p[1],0);assert.ok(Math.abs(state[1].r[2]-Math.PI/12)<1e-6);
 await page.locator('#color').fill('#ff7733');await page.locator('#color').dispatchEvent('input');
 await mkdir('test-results',{recursive:true});
 const capture=async(id,filename)=>{
 await page.locator('#'+id).click();
 await page.waitForFunction(()=>/berjaya disimpan|STL dieksport/.test(document.querySelector('#status').textContent));
 const source=id==='save'?'test-results/reqoo-project.json':'test-results/reqoo-design.stl';
 await writeFile(filename,await readFile(source));
 };
 await capture('save','test-results/project.json');
 const saved=JSON.parse(await readFile('test-results/project.json','utf8'));assert.equal(saved.version,4);assert.equal(saved.objects.length,5);
 await page.locator('#box').click();assert.equal(await page.locator('#objects option').count(),6);
 await page.locator('#project').setInputFiles('test-results/project.json');await page.waitForFunction(()=>document.querySelector('#objects').options.length===5);
 assert.equal(await page.locator('#objects option').count(),5);
 const restored=await page.evaluate(()=>window.__reqoo.group.children.map(m=>({name:m.userData.name,p:m.position.toArray(),s:m.scale.toArray(),r:m.rotation.toArray(),metadata:m.userData})));
 assert.deepEqual(restored,state);
 await page.locator('#objects').selectOption('1');assert.equal(await page.locator('#color').inputValue(),'#ff7733');
 await page.locator('#stagger').click();assert.ok(await page.evaluate(()=>window.__reqoo.group.children.some(m=>m.position.y!==0)));
 await page.locator('#align').click();assert.ok(await page.evaluate(()=>window.__reqoo.group.children.every(m=>m.position.y===0&&m.rotation.z===0)));
 await capture('export','test-results/letters.stl');
 const stl=await readFile('test-results/letters.stl');assert.equal(stl.length,84+stl.readUInt32LE(80)*50);assert.ok(stl.readUInt32LE(80)>100);
 await page.locator('#file').setInputFiles('test-results/letters.stl');await page.waitForFunction(()=>document.querySelector('#objects').options.length===6);
 await writeFile('test-results/shape.svg','<svg xmlns="http://www.w3.org/2000/svg"><rect width="50" height="30"/></svg>');
 await page.locator('#file').setInputFiles('test-results/shape.svg');await page.waitForFunction(()=>document.querySelector('#objects').options.length===7);
 await page.locator('#file').setInputFiles({name:'pixel.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j2ioAAAAASUVORK5CYII=','base64')});await page.waitForFunction(()=>document.querySelector('#objects').options.length===8);
 await page.locator('#delete').click();assert.equal(await page.locator('#objects option').count(),7);
 await writeFile('test-results/invalid.json','{"objects":[{}]}');await page.locator('#project').setInputFiles('test-results/invalid.json');await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Gagal'));assert.equal(await page.locator('#objects option').count(),7);
 await page.locator('#project').setInputFiles('test-results/project.json');await page.waitForFunction(()=>document.querySelector('#objects').options.length===5);
 await page.locator('#objects').selectOption('1');
 await page.locator('aside').first().evaluate(el=>el.scrollTop=0);await page.screenshot({path:'test-results/preview.png'});
 assert.deepEqual(errors,[]);assert.deepEqual(network,[]);
 console.log('PASS: five separate letters; independent dimensions, position, rotation and color; JSON roundtrip; wave/align; binary STL; STL/SVG/PNG imports; deletion; invalid-file preservation; zero remote requests.');
 }finally{await app.close()}
});




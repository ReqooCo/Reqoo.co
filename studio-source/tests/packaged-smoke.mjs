import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
import path from 'node:path';
import {mkdir} from 'node:fs/promises';
await mkdir('test-results',{recursive:true});
const proc=spawn(path.resolve('../../../release/win-unpacked/Reqoo 3D Studio.exe'),['--no-sandbox','--disable-gpu','--remote-debugging-port=9224',`--user-data-dir=${path.resolve('test-results/package-profile')}`],{env:{...process.env,REQOO_TEST:'1',REQOO_TEST_DIR:path.resolve('test-results')},stdio:'pipe'});
proc.stdout.on('data',d=>console.log(String(d)));proc.stderr.on('data',d=>console.log(String(d)));proc.on('exit',c=>console.log('EXIT',c));
let browser;try{
for(let i=0;i<100;i++){try{browser=await chromium.connectOverCDP('http://127.0.0.1:9224');break}catch{await new Promise(r=>setTimeout(r,200))}}
if(!browser)throw Error('Packaged app did not open');
const page=browser.contexts()[0].pages()[0];await page.waitForFunction(()=>!!window.__reqoo);await page.locator('#addText').click();console.log('PACKAGED LETTERS',await page.locator('#objects option').count());await page.screenshot({path:'test-results/packaged-preview.png'});
await page.locator('#save').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('berjaya disimpan'));console.log('PACKAGED SAVE OK');
}finally{if(browser)await browser.close();proc.kill()}

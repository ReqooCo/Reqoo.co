import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {chromium} from 'playwright';

const root=path.resolve(process.env.CAD_BUILD_DIR||'dist');
const server=http.createServer(async(req,res)=>{
  try{
    const pathname=new URL(req.url,'http://127.0.0.1').pathname;
    const file=path.resolve(root,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));
    if(!file.startsWith(root+path.sep))throw Error('outside root');
    const ext=path.extname(file);
    const data=await fs.readFile(file);
    res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.css':'text/css','.wasm':'application/wasm','.json':'application/json'})[ext]||'application/octet-stream'});
    res.end(data);
  }catch{res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1280,height:800}});
const page=await context.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(90000);
const origin='http://127.0.0.1:'+server.address().port+'/';
const solids=43, holesPerPlate=8, features=[];
for(let i=0;i<solids;i++){
 const x=(i%11)*80,y=Math.floor(i/11)*55;
 const base='plate_'+i;
 features.push({id:base,type:'box',params:{width:60,depth:32,height:5,x,y,z:0},inputs:[]});
 let prior=base;
 for(let h=0;h<holesPerPlate;h++){
  const cutter='cut_cylinder_'+i+'_'+h,final='drilled_'+i+'_'+h;
  features.push({id:cutter,type:'cylinder',params:{radius:2.2,height:7,x:x+[-21,-7,7,21][h%4],y:y+(h<4?-8:8),z:-1},inputs:[]});
  features.push({id:final,type:'subtract',params:{},inputs:[prior,cutter]});
  prior=final;
 }
}
while(features.length<1000){const n=features.length;features.push({id:'construction_'+n,type:'axis',params:{axis:'Z',x:n%30,y:Math.floor(n/30)},inputs:[]});}
const doc={format:'reqoo-cad',version:1,title:'R3DS 1000 browser QA',features,ui:{hidden:[],colors:{}}};
const time=Date.now();
try{
 await page.goto(origin+'?test=1');
 await page.waitForFunction(()=>window.__cad?.ready(),null,{timeout:90000});
 await page.evaluate(d=>window.__cad.rebuild(d,{history:false}),doc);
 await page.waitForFunction(()=>window.__cad?.doc?.features?.length===1000&&window.__cad.items.filter(x=>x.kind==='body').length===43,null,{timeout:120000});
 const initial=await page.evaluate(()=>({features:window.__cad.doc.features.length,bodies:window.__cad.items.filter(i=>i.kind==='body').length,jsHeapMB:Math.round((performance.memory?.usedJSHeapSize||0)/1048576)}));
 assert.equal(initial.features,1000);assert.equal(initial.bodies,43);
 await page.waitForTimeout(1500);
 await page.reload();
 await page.waitForFunction(()=>window.__cad?.ready()&&window.__cad.doc.features.length===1000&&window.__cad.items.filter(x=>x.kind==='body').length===43,null,{timeout:120000});
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({check:'R3DS_BROWSER_1000',status:'PASS',features:1000,bodies:43,elapsedMs:Date.now()-time,jsHeapMB:initial.jsHeapMB}));
}finally{await context.close();await browser.close();await new Promise(resolve=>server.close(resolve));}

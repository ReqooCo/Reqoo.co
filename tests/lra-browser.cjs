/* Safe local fixtures only: no requests reach production or WhatsApp. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const playwright=require('playwright');
const engine=process.env.REQOO_BROWSER||'chromium';
const {default:AxeBuilder}=require('@axe-core/playwright');
const root=path.resolve(__dirname,'..'),out=process.env.REQOO_TEST_OUTPUT||path.resolve(root,'../lra-test-results');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await playwright[engine].launch({headless:true});
 const results=[],errors=[],posts=[];
 try{
 const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,timezoneId:'Asia/Kuala_Lumpur',serviceWorkers:'block'});
 const chemicals=['pacl1','pacl2','lime','chlorine','fluoride','polymer','carbon','calhypo'];
 const stock=chemicals.map((chemical_key,i)=>({chemical_key,stock_mt:[23.053,53.019,34.270,15.175,5,1.33,7.5,1.44][i],updated_at:'2026-10-16T00:00:00Z'}));
 await ctx.addInitScript(()=>{if(!localStorage.getItem('s2_access_key'))localStorage.setItem('s2_access_key','TEST-ONLY');});
 await ctx.route('**/*',async route=>{
  const req=route.request(),u=new URL(req.url());
  if(u.hostname!=='lra.test'){posts.push({external:u.origin});return route.abort()}
  if(u.pathname.startsWith('/api/')){
   if(req.method()==='POST'){posts.push({path:u.pathname,body:req.postData()});return route.fulfill({status:200,contentType:'text/html',body:'Test share captured'})}
   let body={ok:true};
   if(u.pathname==='/api/s2-chemical')body=u.searchParams.get('action')==='history'?{ok:true,items:[]}:{ok:true,items:stock,last_update:{updated_at:'2026-10-16T00:00:00Z',updated_by:'<img src=x onerror="window.xss=1">',updated_shift:'PAGI'}};
   if(u.pathname==='/api/s2-live')body={ok:true,state:{ops:{data:{rwp:'<img src=x onerror="window.xss=1">',rw:'4200',tw:'4200'},updated_shift:'<img src=x onerror="window.xss=1">',updated_at:'2026-10-16T00:00:00Z'}}};
   if(u.pathname==='/api/s2-morning')body={ok:true,report:null};
   return route.fulfill({json:body});
  }
  const file=path.join(root,u.pathname.endsWith('/')?u.pathname+'index.html':u.pathname);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:''});
  return route.fulfill({body:fs.readFileSync(file),contentType:file.endsWith('.html')?'text/html':file.endsWith('.js')?'text/javascript':'image/svg+xml'});
 });
 const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());await p.goto('http://lra.test/lra/');await p.waitForSelector('#direct_pacl1',{state:'attached'});
 const tabs=['ops','morning','intakeB','intakeC','twps','stock'];
 for(const width of [320,375,390,430,768]){
  await p.setViewportSize({width,height:844});
  for(const tab of tabs){await p.locator('[data-tab="'+tab+'"]').click();await p.locator('#panel-'+tab).evaluate(el=>el.querySelectorAll('details').forEach(d=>d.open=true));
   const overflow=await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(overflow,false,`page overflow ${width} ${tab}`);
   const clipped=await p.locator('#panel-'+tab+' input:not([type=hidden]),#panel-'+tab+' select').evaluateAll(els=>els.filter(e=>e.getClientRects().length&&e.getBoundingClientRect().right>innerWidth+1).map(e=>e.id));assert.deepEqual(clipped,[],`controls clipped ${width} ${tab}`);
   results.push(`PASS ${width}px ${tab} open panels/controls`);
  }
 }
 await p.setViewportSize({width:390,height:844});
 for(const [tab,id,value] of [['ops','rw','4321'],['intakeB','ibPondB','6.12'],['intakeC','icRw','2485'],['twps','twpsOut','2309'],['morning','m_twFlowHourly','2309']]){
  await p.locator('[data-tab="'+tab+'"]').click();await p.locator('#'+id).fill(value);
 }
 await p.locator('[data-tab="stock"]').click();await p.locator('#use_chlorine').fill('700');
 await p.locator('[data-tab="ops"]').click();await p.locator('[data-tab="stock"]').click();assert.equal(await p.locator('#use_chlorine').inputValue(),'700');
 await p.reload();assert.equal(await p.locator('#use_chlorine').inputValue(),'700');results.push('PASS stock pending input survives tab refresh and reload');
 for(const [id,value] of [['rw','4321'],['ibPondB','6.12'],['icRw','2485'],['twpsOut','2309'],['m_twFlowHourly','2309']])assert.equal(await p.locator('#'+id).inputValue(),value);results.push('PASS all other form drafts survive reload');
 await p.locator('[data-tab="morning"]').click();
 for(const [id,value] of Object.entries({pondC:'11.99',pondCFlowValue:'2485',sjamCHourly:'0',rwAbst:'93.954',production:'86.513',sivTarget:'84.300',monthlyAverage:'84.485'}))await p.locator('#m_'+id).fill(value);
 await p.locator('#m_pondCFlowUnit').selectOption('m3h');
 assert.match(await p.locator('#m_days').textContent(),/46.1/);assert.equal(await p.locator('#m_twFlowHourly').inputValue(),'2309');
 await p.locator('#m_rwAbst').fill('80');assert.match(await p.locator('#m_days').textContent(),/46.1/);assert.equal(await p.locator('#m_pondCFlowValue').inputValue(),'2485');results.push('PASS manual RW/TW remain independent of daily totals; table case 46.1');
 for(let i=1;i<=5;i++){const text=await p.locator('#m_preview_'+i).textContent();assert.ok(text.length>80);if([2,3,4].includes(i))assert.match(text,/46.1/)}results.push('PASS all five 0700 previews');
 for(const [level,storage,days] of [['12.00','3984.50','46.3'],['11.99','3978.37','46.1'],['11.98','3972.24','46.0'],['11.90','3923.20','45.2'],['11.85','3892.55','44.7'],['11.80','3861.90','44.2']]){
  await p.locator('#m_pondC').fill(level);assert.equal(await p.locator('#m_pondStorage').inputValue(),storage);assert.ok((await p.locator('#m_days').textContent()).includes(days));
 }await p.locator('#m_pondC').fill('11.99');results.push('PASS six visible official table rows at 59.64 MLD (12.00–11.80m)');
 // Exercise actual submit listeners while cancelling navigation after payload construction.
 await p.evaluate(()=>{window.testShares=[];for(const id of ['m_share','waForm'])document.getElementById(id).addEventListener('submit',e=>{e.preventDefault();window.testShares.push(Object.fromEntries(new FormData(e.target,e.submitter)))});});
 for(let i=1;i<=5;i++){await p.locator('#m_card_'+i).evaluate(e=>e.open=true);await p.locator('button[form=m_share][value="'+i+'"]').click()}
 const captures=await p.evaluate(()=>window.testShares);assert.equal(captures.length,5);for(let i=0;i<5;i++){assert.equal(captures[i].formatNumber,String(i+1));assert.equal(captures[i].reportText,await p.locator('#m_preview_'+(i+1)).textContent());assert.equal(JSON.parse(captures[i].values).twFlowHourly,'2309')}
 for(const tab of ['ops','intakeB','intakeC','twps']){await p.locator('[data-tab="'+tab+'"]').click();await p.locator('#wa').click();}
 assert.deepEqual((await p.evaluate(()=>window.testShares.slice(5))).map(x=>x.section),['ops','intakeB','intakeC','twps']);results.push('PASS five 0700 and four operational WhatsApp submit payloads match previews; no message sent');
 assert.equal(await p.evaluate(()=>window.xss),undefined);assert.equal(await p.locator('#liveGrid img,#stockSyncMeta img').count(),0);results.push('PASS stored HTML payloads rendered as inert text');
 await p.locator('[data-tab="stock"]').click();await p.locator('.stockEntryWrap').evaluate(el=>el.open=true);await p.locator('#use_chlorine').fill('-5');const old=posts.length;await p.locator('#stockCommit').click();assert.equal(posts.length,old);results.push('PASS negative stock input rejected before network');
 await p.evaluate(()=>localStorage.setItem('rqLraActiveTab','obsolete'));await p.reload();assert.equal(await p.locator('[aria-selected=true]').getAttribute('data-tab'),'ops');
 await p.locator('[data-tab=ops]').focus();await p.keyboard.press('End');assert.equal(await p.locator('[aria-selected=true]').getAttribute('data-tab'),'stock');results.push('PASS invalid tab recovery and keyboard navigation');
 for(const tab of tabs){await p.locator('[data-tab="'+tab+'"]').click();await p.locator('#panel-'+tab+' details').evaluateAll(els=>els.forEach(e=>e.open=true));await p.evaluate(()=>scrollTo(0,0));await p.screenshot({path:path.join(out,tab+'-390.png'),fullPage:true});const axe=await new AxeBuilder({page:p}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();fs.writeFileSync(path.join(out,tab+'-axe.json'),JSON.stringify(axe.violations,null,2));assert.deepEqual(axe.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[],tab+' accessibility');}
 results.push('PASS axe WCAG 2/2.1 AA: all six expanded panels');assert.deepEqual(errors,[]);results.push('PASS no uncaught browser errors');
 fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({browser:browser.version(),results,errors},null,2));console.log(results.join('\n'));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});

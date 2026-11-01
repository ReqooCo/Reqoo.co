/* Safe local fixtures: all API writes/WhatsApp navigation are intercepted. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const playwright=require('playwright'),{default:AxeBuilder}=require('@axe-core/playwright');
const root=path.resolve(__dirname,'..'),out=process.env.REQOO_TEST_OUTPUT||path.resolve(root,'../lra-test-results');fs.mkdirSync(out,{recursive:true});
const iso=JSON.parse(fs.readFileSync(path.join(root,'tests/fixtures/lra-morning-iso.json'),'utf8'));
(async()=>{
 const browser=await playwright[process.env.REQOO_BROWSER||'chromium'].launch({headless:true});
 const errors=[],results=[];
 try{
  const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,timezoneId:'Asia/Kuala_Lumpur',serviceWorkers:'block'});
  await ctx.addInitScript(()=>localStorage.setItem('s2_access_key','TEST-ONLY'));
  await ctx.route('**/*',async route=>{
   const req=route.request(),u=new URL(req.url());if(u.hostname!=='lra.test')return route.abort();
   if(u.pathname.startsWith('/api/')){
    assert.equal(req.method(),'GET','No API writes may escape fixture interception');
    let body={ok:true};
    if(u.pathname==='/api/s2-live')body.state={};
    if(u.pathname==='/api/s2-morning')body.report=null;
    if(u.pathname==='/api/s2-chemical')body=u.searchParams.get('action')==='history'?{ok:true,items:[]}:{ok:true,items:['pacl1','pacl2','lime','chlorine','fluoride','polymer','carbon','calhypo'].map(chemical_key=>({chemical_key,stock_mt:20,updated_at:'test'}))};
    return route.fulfill({json:body});
   }
   const file=path.join(root,u.pathname.endsWith('/')?u.pathname+'index.html':u.pathname);
   if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:''});
   return route.fulfill({body:fs.readFileSync(file),contentType:file.endsWith('.html')?'text/html':file.endsWith('.js')?'text/javascript':'image/svg+xml'});
  });
  const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());
  await p.goto('http://lra.test/lra/?tab=morning');await p.waitForSelector('#m_reportLink_6',{state:'attached'});
  assert.equal(await p.locator('#m_card_ops').count(),0);assert.equal(await p.locator('#m_reportLinks button').count(),6);
  results.push('PASS old 0700 Operasi workspace removed; exactly five daily reports plus Dosing');
  const tabs=['ops','morning','intakeB','intakeC','twps','stock'];
  for(const width of [320,375,390,430,768]){
   await p.setViewportSize({width,height:844});
   for(const tab of tabs){
    await p.locator('[data-tab="'+tab+'"]').click();
    if(tab==='morning')for(const step of ['readings','dosing','reports']){await p.locator('[data-m-step="'+step+'"]').click();assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${width}px morning ${step}`)}
    else assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${width}px ${tab}`);
   }
  }
  results.push('PASS 320/375/390/430/768px layouts across all tabs and all three collection steps');
  await p.setViewportSize({width:390,height:844});await p.locator('[data-tab=morning]').click();await p.locator('[data-m-step=readings]').click();
  await p.locator('#m_date').fill('2026-11-01');await p.locator('#m_date').dispatchEvent('change');await p.locator('#m_operator').fill('Basit');
  for(const [id,value] of Object.entries(iso.values)){
   if(['date','intakeCHourly','pondStorage','sivStatus','sivTarget','pondTwlCapacity','pondTwlLevel','criticalLevel','criticalPercent','criticalStorage','designCapacity','pondANote'].includes(id))continue;
   await p.locator('#m_'+id).fill(value);
  }
  await p.locator('#m_pondCFlowValue').fill('2349');await p.locator('#m_twFlowHourly').fill('2297');await p.locator('#m_sivTarget').fill('84.300');await p.locator('#m_pondAProblem').check();
  assert.equal(await p.locator('#m_days').textContent(),'48.7 hari');assert.equal(await p.locator('#m_rwMld').textContent(),'56.376 MLD');assert.equal(await p.locator('#m_twMld').textContent(),'55.128 MLD');assert.equal(await p.locator('#m_dpMld').textContent(),'84.744 MLD');
  for(let i=1;i<=5;i++)assert.equal(await p.locator('#m_preview_'+i).textContent(),iso.reports[i-1],`ISO report ${i} unchanged`);
  results.push('PASS all five ISO output templates byte-for-byte unchanged; supplied 01/11 data produces 48.7 days');
  await p.locator('#m_production').fill('90.000');assert.equal(await p.locator('#m_days').textContent(),'48.7 hari');await p.locator('#m_production').fill('88.683');
  await p.locator('#m_monthlyAverage').fill('');await p.locator('#m_firstDayAverage').click();assert.equal(await p.locator('#m_monthlyAverage').inputValue(),'88.683');
  await p.locator('#m_pondChange').fill('0.01');await p.locator('#m_changeMinus').click();assert.equal(await p.locator('#m_pondChange').inputValue(),'-0.01');
  await p.locator('#m_noAux').click();for(const id of ['wt1','sjamB','sjamCActual','sjamCHourly'])assert.equal(await p.locator('#m_'+id).inputValue(),'0');
  await p.locator('#m_rwAbst').focus();await p.keyboard.press('Enter');assert.equal(await p.evaluate(()=>document.activeElement.id),'m_production');
  results.push('PASS shared readings independent of daily totals, explicit first-day average/zero shortcuts, keyboard Next');
  await p.locator('[data-m-step=dosing]').click();
  assert.equal(await p.locator('#m_pac1b_values').isVisible(),false);await p.locator('#m_pac1b_status').selectOption('Run');assert.equal(await p.locator('#m_pac1b_values').isVisible(),true);
  for(const [id,value] of Object.entries({pac1b_rate:'130.7',pac1b_dose:'56',lime2inter_rate:'43',lime2inter_dose:'18.43',fl2_hz:'19',fl2_percent:'41',fl2_rate:'329.8',fl2_dose:'0.42',clPre2_rate:'4.6',clPre2_dose:'2.0',clPost2_rate:'25',clPost2_dose:'10.7'})){
   const pump=id.replace(/_(rate|dose|hz|percent)$/,'');await p.locator('#m_'+pump+'_status').selectOption('Run');await p.locator('#m_'+id).fill(value);
  }
  for(const [id,value] of Object.entries({scd:'-0.28',ph:'6.81',fluorideResidual:'0.54',chlorineResidual:'2.29'}))await p.locator('#m_meta_'+id).fill(value);
  for(const id of ['pac','lime','fluoride','chlorine','carbon','polymer'])await p.locator('#m_review_'+id).check();
  const dosing=await p.locator('#m_preview_6').textContent();assert.equal(dosing,iso.dosingReport,'Dosing ISO output matches supplied format');assert.match(dosing,/Dosing Pump 1B : 130.7L\/hr@56mg\/L\/320mg\/L/);assert.match(dosing,/Metering Pump no.2 : 19Hz\/41%\/329.8l\/hr@0.42mg\/L\/2.40mg\/L/);assert.match(dosing,/RW Inflow : 56.376Mld/);assert.match(dosing,/TW Outflow : 55.128Mld/);assert.match(dosing,/SCD : -0.28ICu/);
  assert.match(await p.locator('#m_reportLink_6 small').textContent(),/Lengkap/);
  await p.locator('#m_pac1b_dose').fill('57');assert.equal(await p.locator('#m_review_pac').isChecked(),false);await p.locator('#m_pac1b_dose').fill('56');await p.locator('#m_review_pac').check();
  results.push('PASS structured Dosing reproduces supplied running/standby rows, units/modes and shared flow; edits invalidate review');
  await p.evaluate(()=>{window.testShares=[];document.getElementById('m_share').addEventListener('submit',e=>{const allowed=!e.defaultPrevented;e.preventDefault();if(allowed)window.testShares.push(Object.fromEntries(new FormData(e.target,e.submitter)))});});
  await p.locator('[data-m-step=reports]').click();
  for(let i=1;i<=6;i++){await p.locator('#m_reportLink_'+i).click();await p.locator('button[form=m_share][value="'+i+'"]').click()}
  const captures=await p.evaluate(()=>window.testShares);assert.equal(captures.length,6);for(let i=0;i<6;i++){assert.equal(captures[i].formatNumber,String(i+1));assert.equal(captures[i].reportText,await p.locator('#m_preview_'+(i+1)).textContent())}
  await p.locator('#m_done_6').check();assert.match(await p.locator('#m_reportLink_6 small').textContent(),/Ditanda/);
  results.push('PASS six submit payloads match previews and explicit completion; no writes or messages sent');
  await p.reload();await p.locator('[data-m-step=dosing]').click();assert.equal(await p.locator('#m_pac1b_rate').inputValue(),'130.7');assert.equal(await p.locator('#m_review_pac').isChecked(),true);
  await p.locator('#m_date').fill('2026-11-02');await p.locator('#m_date').dispatchEvent('change');await p.locator('[data-m-step=dosing]').click();assert.equal(await p.locator('#m_pac1b_status').inputValue(),'Run');assert.equal(await p.locator('#m_pac1b_rate').inputValue(),'');assert.equal(await p.locator('#m_review_pac').isChecked(),false);assert.equal(await p.locator('#m_pondCFlowValue').inputValue(),'');assert.equal(await p.locator('#m_sivTarget').inputValue(),'84.300');
  await p.locator('#m_date').fill('2026-12-01');await p.locator('#m_date').dispatchEvent('change');assert.equal(await p.locator('#m_sivTarget').inputValue(),'');
  await p.locator('#m_date').fill('2026-11-01');await p.locator('#m_date').dispatchEvent('change');assert.equal(await p.locator('#m_pondCFlowValue').inputValue(),'2349');
  results.push('PASS same-date drafts/reviews restore; new dates retain configuration but clear readings/reviews; targets scoped to month');
  await p.locator('#m_production').fill('88,683');await p.locator('[data-m-step=reports]').click();await p.locator('#m_reportLink_1').click();await p.locator('#m_check_1').click();assert.equal(await p.evaluate(()=>document.activeElement.id),'m_production');await p.locator('#m_production').fill('88.683');
  results.push('PASS malformed numeric entry routes back to the correct field');
  for(const step of ['readings','dosing','reports']){
   await p.locator('[data-m-step="'+step+'"]').click();await p.evaluate(()=>scrollTo(0,0));await p.screenshot({path:path.join(out,'morning-'+step+'-390.png'),fullPage:true});
   const axe=await new AxeBuilder({page:p}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();fs.writeFileSync(path.join(out,'morning-'+step+'-axe.json'),JSON.stringify(axe.violations,null,2));assert.deepEqual(axe.violations.map(x=>({id:x.id,nodes:x.nodes.map(n=>n.target)})),[],step+' accessibility');
  }
  assert.deepEqual(errors,[]);results.push('PASS all three new steps axe WCAG AA and no uncaught errors');
  fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({results,errors},null,2));console.log(results.join('\n'));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});

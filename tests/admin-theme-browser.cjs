/* Fixture-only visual checks: no requests reach production. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=process.env.REQOO_TEST_OUTPUT||path.join(root,'..','test-results');
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true,...(process.env.REQOO_CHROME?{executablePath:process.env.REQOO_CHROME}:{})});
 try{
 const context=await browser.newContext();let empty=false;
 const order={id:'fixture-order',orderNo:'RQ-TEST-0001',name:'Pelanggan Ujian',phone:'0120000000',total_minor:85000,payment_status:'partial',fulfillment_status:'processing',created_at:'2026-10-15T08:00:00Z'};
 await context.route('**/*',async route=>{
  const u=new URL(route.request().url());if(u.hostname!=='reqoo.test')return route.abort();
  if(u.pathname.startsWith('/api/'))return route.fulfill({json:{ok:true,orders:empty?[]:[order],products:empty?[]:[{id:'fixture-product',name:'Tumbler Ujian',active:1,price:85,price_minor:8500,sku:'TEST-001',stock:12}],customers:empty?[]:[{id:'fixture-customer',name:'Pelanggan Ujian',phone:'0120000000',order_count:2,collected_minor:42500,outstanding_minor:42500}],transactions:[],items:[],total:empty?0:1,stats:{total:1,paid:1,processing:1,active:1,customers:1},counts:{processing:1},summary:{collectedMinor:42500,outstandingMinor:42500,paidOrders:1},kpis:{},commandCenter:{},trend:empty?[]:[{month:'2026-09',collected_minor:25000,revenue_minor:25000},{month:'2026-10',collected_minor:42500,revenue_minor:42500}],latest:[],breakdown:{partial:1},months:[],settings:{},content:{section:{},items:[]},licenses:[],devices:[],users:[]}});
  const file=path.join(root,u.pathname==='/admin/'?'admin/index.html':u.pathname);
  if(!fs.existsSync(file))return route.fulfill({status:404,body:''});
  if(file.endsWith('.html')){
   let html=fs.readFileSync(file,'utf8').replace('</head>','<link rel="stylesheet" href="/admin/admin-base.css?v=1"><link rel="stylesheet" href="/admin/admin-flow.css?v=2"><link rel="stylesheet" href="/admin/admin-theme.css?v=1"></head>')+(u.pathname==='/admin/'?'': '<script src="/admin/admin-shell.js?v=4"></script>')+'</body>';
   return route.fulfill({contentType:'text/html',body:html});
  }
  return route.fulfill({path:file,contentType:file.endsWith('.css')?'text/css':file.endsWith('.js')?'application/javascript':'text/plain'});
 });
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const name of ['index','orders','production','products','customers','finance','settings','shop-content','sim-v2']){
  await page.setViewportSize({width:1440,height:1000});
  await page.goto('https://reqoo.test/admin/'+(name==='index'?'':name+'.html'));
  if(name==='index')await page.waitForSelector('.rqAppBrand');else await page.waitForSelector('body.rq-admin-shell');await page.waitForLoadState('networkidle');
  if(['orders','production','customers'].includes(name))assert.match(await page.locator('main').innerText(),/Pelanggan Ujian/,'fixture rows rendered');
  if(name==='products')assert.match(await page.locator('main').innerText(),/Tumbler Ujian/);
  assert.equal(await page.locator('link[href*="admin-flow.css"]').count(),1,'flow injected once');
  assert.equal(await page.locator('link[href*="admin-theme.css"]').count(),1,'theme injected once');
  if(name!=='index')assert.match(await page.locator('.rqAdminSide').evaluate(e=>getComputedStyle(e).backgroundImage),/linear-gradient/);
  const control=page.locator('.btn:visible').first();
  if(await control.count())assert.ok(await control.evaluate(e=>parseFloat(getComputedStyle(e).fontSize)>=12),'readable action');
  await page.screenshot({path:path.join(out,'theme-'+name+'-desktop.png')});
  await page.setViewportSize({width:390,height:844});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),name+' mobile overflow');
  if(name==='index'){
   assert.ok(await page.locator('.rqAppNav a').first().isVisible(),'new Overview navigation visible');
   assert.equal(await page.locator('.rqAdminMoreTrigger').count(),0,'legacy mobile navigation absent');
  }else{
   await page.locator('.rqAdminMoreTrigger').click();
   await page.waitForSelector('.rqAdminMoreBackdrop.open');
   assert.ok(await page.locator('.rqAdminMoreList a').first().isVisible());
   await page.locator('.rqAdminMoreClose').click();
  }
  await page.screenshot({path:path.join(out,'theme-'+name+'-mobile.png')});
  console.log('PASS: '+name+' desktop/mobile theme, readable controls and mobile navigation');
 }
 empty=true;await page.goto('https://reqoo.test/admin/orders.html');await page.waitForLoadState('networkidle');
 assert.match(await page.locator('#ordersList').innerText(),/Tiada order/);
 console.log('PASS: empty order state remains readable');
 assert.deepEqual(errors,[],'page scripts remain healthy');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});

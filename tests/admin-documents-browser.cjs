/* Run with Playwright available on NODE_PATH; all requests are intercepted fixtures. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=process.env.REQOO_TEST_OUTPUT||path.join(root,'..','test-results');fs.mkdirSync(out,{recursive:true});
(async()=>{
const browser=await chromium.launch({headless:true,...(process.env.REQOO_CHROME?{executablePath:process.env.REQOO_CHROME}:{})});
try{
const context=await browser.newContext({viewport:{width:1440,height:1000}});
await context.addInitScript(()=>{window.print=()=>{};Element.prototype.scrollIntoView=function(){};});
const records=Array.from({length:85},(_,i)=>({id:'doc'+i,type:i%2?'quotation':'invoice',number:(i%2?'QT':'INV')+'-TEST-'+i,order_id:'ord'+i,customer_name:i===84?'Historical Customer':'Test Customer '+i,customer_phone:'0123456789',total_minor:30000,payment_status:'pending',status:'issued',created_at:'2026-10-01T12:00:00Z',issued_at:'2026-10-01T12:00:00Z',due_at:'2026-10-31',company:{companyName:'REQOO.CO',quoteMeta:{depositPercent:50}},items:Array.from({length:50},(_,j)=>({description:'Item '+j+' — Custom packaging with approved artwork',variation:'Standard',quantity:1,unit_price_minor:600,line_total_minor:600}))}));
let mode='normal',settingsCalls=0,orderCalls=0;const actions=[];
await context.route('**/*',async route=>{
const u=new URL(route.request().url());if(u.hostname!=='reqoo.test'){await route.abort();return}
if(u.pathname==='/api/shop-admin'){
const d=route.request().method()==='POST'?route.request().postDataJSON():Object.fromEntries(u.searchParams);actions.push(d.action);
let body={ok:true};
if(d.action==='listDocuments'){
 if(mode==='error'){await route.fulfill({status:503,json:{ok:false,error:'Fixture unavailable'}});return}
 if(mode==='loading')await new Promise(r=>setTimeout(r,500));
 const filtered=mode==='empty'?[]:records.filter(x=>(!d.type||x.type===d.type)&&(!d.q||JSON.stringify(x).toLowerCase().includes(d.q.toLowerCase())));
 const offset=Number(d.offset||0),limit=Number(d.limit||80);body={ok:true,documents:filtered.slice(offset,offset+limit),total:filtered.length,offset,hasMore:offset+limit<filtered.length,stats:{all:85,quotation:42,invoice:43,receipt:0,delivery_order:0}};
}else if(d.action==='documentsFinanceDashboard'){body={ok:true,documents:[],payments:[],summaries:records.filter(x=>x.type==='invoice').map(x=>({orderId:x.order_id,totalMinor:30000,paidMinor:0,balanceMinor:30000,paymentStatus:'pending'})),stats:{all:43,outstandingCount:43,outstandingMinor:1290000,paidCount:0},invoices:[],invoiceTotal:0};}
else if(d.action==='documentSettings'){settingsCalls++;body.settings={quoteValidDays:7};}
else if(d.action==='ordersDashboard'){orderCalls++;body={ok:true,orders:[],total:0,stats:{}};}
else if(d.action==='getDocument'){body.document=records.find(x=>x.id===d.documentId);}
else if(d.action==='documentFlow'){body={ok:true,selectedDocument:records[0],documents:[records[0]],payments:[],summary:{totalMinor:30000,paidMinor:0,balanceMinor:30000}};}
else throw Error('Unexpected fixture action '+d.action);
await route.fulfill({json:body});return;
}
const file=path.join(root,decodeURIComponent(u.pathname));
if(u.pathname==='/admin/documents.html'){
 const html=fs.readFileSync(file,'utf8').replace('</head>','<link rel="stylesheet" href="/admin/admin-base.css?v=1"><link rel="stylesheet" href="/admin/admin-flow.css?v=2"></head>').replace('</body>','<script src="/admin/admin-shell.js?v=3"></script></body>');
 await route.fulfill({contentType:'text/html',body:html});
}else if(fs.existsSync(file)&&fs.statSync(file).isFile())await route.fulfill({path:file,contentType:file.endsWith('.css')?'text/css':file.endsWith('.js')?'application/javascript':'text/html'});else await route.fulfill({status:404,body:''});
});
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('https://reqoo.test/admin/documents.html');
await page.waitForSelector('#docHistory .rqHistRow');await page.waitForSelector('.rqRecordPaymentBtn');
assert.equal(settingsCalls,0);assert.equal(orderCalls,0);
assert.equal(await page.locator('#docQuoteCount').innerText(),'42');
assert.equal(await page.locator('#docHistory .rqHistRow').count(),80);
await page.locator('#loadMoreDocuments').click();await page.waitForFunction(()=>document.querySelectorAll('#docHistory .rqHistRow').length===85);
await page.evaluate(()=>scrollTo(0,0));
console.log('Workspace typography:',await page.locator('.rqDocsApp').evaluate(el=>getComputedStyle(el).fontFamily));
await page.screenshot({path:path.join(out,'documents-desktop.png'),fullPage:false});
await page.locator('#docUnifiedSearch').fill('Historical');await page.waitForFunction(()=>document.querySelector('#docResultsState').textContent.startsWith('1 daripada 1'));
assert.match(await page.locator('#docHistory').innerText(),/Historical Customer/);
await page.locator('#docUnifiedSearch').fill('ord0');await page.waitForFunction(()=>document.querySelector('#docResultsState').textContent.startsWith('1 daripada 1'));assert.ok(await page.locator('#docHistory .rqHistRow').isVisible(),'order reference search remains visible even without reference in row text');
await page.locator('#docUnifiedSearch').fill('');await page.waitForFunction(()=>document.querySelectorAll('#docHistory .rqHistRow').length===80);
await page.locator('[data-doc-filter="quotation"]').click();await page.waitForFunction(()=>document.querySelector('#docResultsState').textContent.startsWith('42 daripada 42'));
await page.locator('[data-doc-filter="all"]').click();await page.waitForFunction(()=>document.querySelectorAll('#docHistory .rqHistRow').length===80);
await page.locator('[data-open-doc="doc0"]').click();await page.waitForSelector('#docModal.open');
// WhatsApp URL creation is checked without sending a message or opening the service.
await page.evaluate(()=>{window.savedOpen=window.open;window.open=(url)=>{window.sharedUrl=url;return null}});
await page.locator('#docWhatsapp').click();assert.match(await page.evaluate(()=>window.sharedUrl),/^https:\/\/wa\.me\/60123456789\?text=/);
assert.match(decodeURIComponent(await page.evaluate(()=>window.sharedUrl)),/\/d\//);
await page.evaluate(()=>window.open=window.savedOpen);
const popupPromise=page.waitForEvent('popup');await page.locator('#docPrint').click();const popup=await popupPromise;await popup.waitForLoadState();await popup.emulateMedia({media:'print'});
assert.equal(await popup.locator('tbody tr').count(),50);
await popup.pdf({path:path.join(out,'documents-a4-multipage.pdf'),format:'A4',preferCSSPageSize:true,printBackground:true});
const overflow=await popup.locator('.rqPaper').evaluate(el=>getComputedStyle(el).overflow);assert.equal(overflow,'visible');await popup.close();
await page.locator('#docClose').click();
await page.locator('.rqRecordPaymentBtn').first().click();await page.waitForSelector('#rqPaymentModal.open');assert.equal(await page.locator('#rqPayAmount').inputValue(),'150.00');await page.locator('#rqPayCancel').click();
await page.locator('#toggleQuoteBuilder').click();assert.equal(await page.locator('#qDeposit').inputValue(),'50');
await page.locator('#qCustomer').fill('Fixture Customer');await page.locator('[data-q="description"]').fill('Packaging');await page.locator('[data-q="quantity"]').fill('3');await page.locator('[data-q="unit"]').fill('100.01');await page.locator('#qDiscount').fill('10.03');await page.locator('#qShipping').fill('10');assert.equal(await page.locator('#qTotal').innerText(),'RM300.00');
await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(out,'documents-mobile-builder.png'),fullPage:true});
assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'builder must fit mobile');
await page.locator('#toggleQuoteBuilder').click();await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(out,'documents-mobile.png'),fullPage:false});
assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'list must fit mobile');
mode='empty';await page.locator('#refreshDocs').click();await page.waitForFunction(()=>document.querySelector('#docResultsState').textContent.startsWith('0 daripada 0'));assert.ok(await page.locator('#docUnifiedEmpty').isVisible());
mode='loading';await page.locator('#refreshDocs').click();assert.equal(await page.locator('#docHistory').getAttribute('aria-busy'),'true');await page.waitForFunction(()=>document.querySelector('#docHistory').getAttribute('aria-busy')==='false');
mode='error';await page.locator('#refreshDocs').click();await page.waitForFunction(()=>document.querySelector('#docResultsState').textContent.includes('Fixture unavailable'));
mode='normal';await page.locator('#refreshDocs').click();await page.waitForSelector('#docHistory .rqHistRow');
assert.deepEqual(errors,[]);console.log('PASS: browser desktop/mobile, historical search, paging, filters, lazy loading, quotation math, deposit default, WhatsApp URL, A4 PDF and loading/empty/error recovery.');
}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});

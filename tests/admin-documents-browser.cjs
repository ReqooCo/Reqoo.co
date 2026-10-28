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
let mode='normal',settingsCalls=0,orderCalls=0,financeDelay=0,chartFail=false,createdOrderQuote=null;const actions=[];
await context.route('**/*',async route=>{
const u=new URL(route.request().url());if(u.hostname!=='reqoo.test'){await route.abort();return}
if(u.pathname==='/api/shop-admin'){
const d=route.request().method()==='POST'?route.request().postDataJSON():Object.fromEntries(u.searchParams);actions.push(d.action);
let body={ok:true};
if(d.action==='documentWorkspaces'){
 const items=[{order_id:'ord0',reference:'RQ-TEST-0001',customer_name:'Test Customer 0',customer_phone:'0123456789',total_minor:30000,paid_minor:15000,balance_minor:15000,quotation_count:1,invoice_count:1,receipt_count:1,delivery_count:0,stage:'partial'},{order_id:'ord2',reference:'RQ-TEST-0002',customer_name:'Test Customer 0',customer_phone:'0123456789',total_minor:30000,paid_minor:0,balance_minor:30000,quotation_count:1,invoice_count:1,receipt_count:0,delivery_count:1,stage:'invoice'}];
 const list=items.filter(w=>!d.q||JSON.stringify(w).toLowerCase().includes(d.q.toLowerCase()));body={ok:true,workspaces:list,total:list.length,offset:0,hasMore:false};
}else if(d.action==='listDocuments'){
 if(mode==='error'){await route.fulfill({status:503,json:{ok:false,error:'Fixture unavailable'}});return}
 if(mode==='loading')await new Promise(r=>setTimeout(r,500));
 const filtered=mode==='empty'?[]:records.filter(x=>(!d.type||x.type===d.type)&&(!d.q||JSON.stringify(x).toLowerCase().includes(d.q.toLowerCase())));
 const offset=Number(d.offset||0),limit=Number(d.limit||80);body={ok:true,documents:filtered.slice(offset,offset+limit),total:filtered.length,offset,hasMore:offset+limit<filtered.length,stats:{all:85,quotation:42,invoice:43,receipt:0,delivery_order:0}};
}else if(d.action==='documentsMonthlySummary'){
 if(chartFail){await route.fulfill({status:503,json:{ok:false,error:'Carta ujian tidak tersedia.'}});return}
 const selected=Number(d.year),empty=selected!==new Date().getFullYear();
 body={ok:true,year:selected,timeZone:'Asia/Kuala_Lumpur',months:Array.from({length:12},(_,i)=>({month:i+1,quotationCount:empty?0:8+(i*7)%21,invoiceCount:empty?0:5+(i*3)%17,deliveryCount:empty?0:3+(i*2)%11,invoiceMinor:empty?0:180000+(i*73000)%550000,paidMinor:empty?0:140000+(i*41000)%450000,paymentCount:empty?0:7+i}))};
}else if(d.action==='documentsFinanceDashboard'){if(financeDelay)await new Promise(r=>setTimeout(r,financeDelay));body={ok:true,documents:[],payments:[],summaries:records.filter(x=>x.type==='invoice').map(x=>({orderId:x.order_id,totalMinor:30000,paidMinor:0,balanceMinor:30000,paymentStatus:'pending'})),stats:{all:43,outstandingCount:43,outstandingMinor:1290000,paidCount:0},invoices:[],invoiceTotal:0};}
else if(d.action==='documentSettings'){settingsCalls++;body.settings={quoteValidDays:7};}
else if(d.action==='ordersDashboard'){orderCalls++;body={ok:true,orders:[],total:0,stats:{}};}
else if(d.action==='quotationHistory'){
 const doc=records.find(x=>x.id===d.documentId)||createdOrderQuote,revision=Number(doc?.company?.quoteMeta?.revision||0);
 if(d.revision!==undefined)body.document={...doc,revision:Number(d.revision),readOnly:Number(d.revision)!==revision,customer_name:Number(d.revision)!==revision?'Previous Customer':doc.customer_name};
 else body={ok:true,currentRevision:revision,versions:[{revision,current:true,version_at:doc.created_at},...(revision?[{revision:0,version_at:doc.created_at,version_actor:'Fixture Admin'}]:[])]};
}
else if(d.action==='getDocument'){body.document=records.find(x=>x.id===d.documentId)||createdOrderQuote;}
else if(d.action==='createOrderQuotation'){createdOrderQuote={...records[1],id:'order-quote-new',order_id:'empty-order',number:'QT-NEW-ORDER',company:{companyName:'REQOO.CO',quoteMeta:{source:'order',depositPercent:50}}};body={ok:true,created:true,document:createdOrderQuote};}
else if(d.action==='getPaymentReceipt'){body.receipt={id:'fixture-pay',receipt_number:'RC-TIMELINE',order_id:'ord0',order_no:'RQ-ord0',invoice_number:records[0].number,customer_name:records[0].customer_name,paid_at:'2026-10-02T12:00:00Z',amount_minor:15000,payment_type:'deposit',method:'bank_transfer',company:{companyName:'REQOO.CO'},summary:{totalMinor:30000,paidMinor:15000,balanceMinor:15000}};}
else if(d.action==='documentFlow'){
 const selected=records.find(x=>x.number===d.key||x.order_id===d.key)||records[0];
 await new Promise(r=>setTimeout(r,selected.id==='doc0'?180:10));
 body={ok:true,selectedDocument:selected,order:{id:selected.order_id,order_no:'RQ-'+selected.order_id,created_at:'2026-09-30T12:00:00Z'},documents:[{...records[1],issued_at:'2026-09-29T12:00:00Z'},selected,{id:'legacy-receipt',type:'receipt',number:'RC-TIMELINE',issued_at:'2026-10-02T12:00:00Z'}],payments:[{id:'fixture-pay',receipt_number:'RC-TIMELINE',paid_at:'2026-10-02T12:00:00Z',amount_minor:15000,payment_type:'deposit',method:'bank_transfer'}],summary:{totalMinor:30000,paidMinor:15000,balanceMinor:15000}};
 if(d.key==='empty-order')body={ok:true,selectedDocument:createdOrderQuote,order:{id:'empty-order',order_no:'RQ-EMPTY',customer_name:'New Customer',total_minor:30000},documents:createdOrderQuote?[createdOrderQuote]:[],payments:[],summary:{totalMinor:30000,paidMinor:0,balanceMinor:30000}};
}
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
await page.waitForSelector('#docHistory .rqHistRow',{state:'attached'});await page.waitForSelector('.rqRecordPaymentBtn',{state:'attached'});
await page.waitForSelector('.rqWorkspaceRow');assert.equal(await page.locator('.rqWorkspaceRow').count(),2);assert.ok(!await page.locator('#rqDocumentArchive').isVisible(),'default is one row per order');
await page.locator('#rqWorkspaceSearch').fill('RQ-TEST-0001');await page.waitForFunction(()=>document.querySelectorAll('.rqWorkspaceRow').length===1);
await page.locator('#rqWorkspaceSearch').fill('');await page.waitForFunction(()=>document.querySelectorAll('.rqWorkspaceRow').length===2);
await page.evaluate(()=>scrollTo(0,document.querySelector('#rqOrderWorkspaces').offsetTop-20));await page.screenshot({path:path.join(out,'order-workspaces-desktop.png'),fullPage:false});
await page.setViewportSize({width:390,height:844});await page.evaluate(()=>scrollTo(0,document.querySelector('#rqOrderWorkspaces').offsetTop-20));await page.screenshot({path:path.join(out,'order-workspaces-mobile.png'),fullPage:false});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.setViewportSize({width:1440,height:1000});
await page.locator('[data-open-workspace="ord0"]').click();await page.waitForSelector('#workspace-tab-quotation');
await page.locator('#workspace-tab-quotation').click();assert.equal(await page.locator('#workspace-panel-quotation .rqDocChainItem:visible').count(),1);
await page.locator('#workspace-tab-receipt').click();await page.locator('#workspace-panel-receipt [data-drawer-open-payment]').click();await page.waitForSelector('#rqReceiptModal.open');await page.locator('#rqReceiptClose').click();assert.ok(await page.locator('#rqDocDrawer').isVisible(),'receipt close returns to same order workspace');
await page.locator('#workspace-tab-invoice').click();await page.locator('#workspace-panel-invoice [data-drawer-open-doc-id]').click();await page.waitForSelector('#docModal.open');await page.locator('#docClose').click();assert.ok(await page.locator('#rqDocDrawer').isVisible(),'preview close returns to same order workspace');
await page.screenshot({path:path.join(out,'order-workspace-tabs.png'),fullPage:false});await page.locator('#rqDocDrawerClose').click();
await page.evaluate(()=>document.dispatchEvent(new CustomEvent('rq:documents-open-flow',{detail:{key:'empty-order'}})));
await page.waitForSelector('#workspace-tab-quotation');await page.locator('#workspace-tab-quotation').click();await page.locator('[data-workspace-create="quotation"]').click();await page.waitForSelector('#docModal.open');assert.match(await page.locator('#docModalTitle').innerText(),/QT-NEW-ORDER/);await page.locator('#docClose').click();assert.ok(await page.locator('#rqDocDrawer').isVisible());await page.waitForSelector('#workspace-panel-quotation .rqDocChainItem');await page.locator('#rqDocDrawerClose').click();
await page.locator('#showDocumentArchive').click();assert.ok(await page.locator('#rqDocumentArchive').isVisible());
assert.equal(settingsCalls,0);assert.equal(orderCalls,0);
assert.equal(await page.locator('#docQuoteCount').innerText(),'42');
assert.equal(await page.locator('#docHistory .rqHistRow').count(),80);
await page.waitForSelector('.rqMonthlyCharts svg');assert.equal(await page.locator('.rqMonthlyCharts svg').count(),2);
await page.locator('.rqMonthlyData summary').click();assert.equal(await page.locator('.rqMonthlyData tbody tr').count(),12);await page.locator('.rqMonthlyData summary').click();
const currentYear=await page.locator('#rqMonthlyYear').inputValue();
await page.locator('#rqMonthlyYear').selectOption(String(Number(currentYear)-1));await page.waitForFunction(()=>document.querySelector('#rqMonthlyContent').textContent.includes('Belum ada aktiviti'));
chartFail=true;await page.locator('#rqMonthlyRefresh').click();await page.waitForFunction(()=>document.querySelector('#rqMonthlyState').textContent.includes('Carta ujian tidak tersedia'));
chartFail=false;await page.locator('#rqMonthlyYear').selectOption(currentYear);await page.waitForSelector('.rqMonthlyCharts svg');
await page.locator('#loadMoreDocuments').click();await page.waitForFunction(()=>document.querySelectorAll('#docHistory .rqHistRow').length===85);
await page.evaluate(()=>scrollTo(0,0));
console.log('Workspace typography:',await page.locator('.rqDocsApp').evaluate(el=>getComputedStyle(el).fontFamily));
await page.screenshot({path:path.join(out,'documents-desktop.png'),fullPage:false});
const monthlyCalls=actions.filter(a=>a==='documentsMonthlySummary').length;
await page.locator('#docUnifiedSearch').fill('Historical');await page.waitForFunction(()=>document.querySelector('#docResultsState').textContent.startsWith('1 of 1'));
assert.equal(actions.filter(a=>a==='documentsMonthlySummary').length,monthlyCalls,'list search must not refetch or filter annual charts');
assert.match(await page.locator('#docHistory').innerText(),/Historical Customer/);
await page.locator('#docUnifiedSearch').fill('ord0');await page.waitForFunction(()=>document.querySelector('#docResultsState').textContent.startsWith('1 of 1'));assert.ok(await page.locator('#docHistory .rqHistRow').isVisible(),'order reference search remains visible even without reference in row text');
await page.locator('#docUnifiedSearch').fill('');await page.waitForFunction(()=>document.querySelectorAll('#docHistory .rqHistRow').length===80);
await page.locator('[data-doc-filter="quotation"]').click();await page.waitForFunction(()=>document.querySelector('#docResultsState').textContent.startsWith('42 of 42'));
await page.locator('[data-doc-filter="all"]').click();await page.waitForFunction(()=>document.querySelectorAll('#docHistory .rqHistRow').length===80);
await page.locator('[data-document-id="doc0"] .rqHistNo').click();await page.locator('#workspace-tab-all').click();await page.waitForSelector('.rqActivityTimeline');
assert.equal(await page.locator('.rqActivityTimeline li').count(),4,'timeline includes quotation, order, invoice and canonical payment once');
assert.deepEqual(await page.locator('.rqActivityTimeline li b').allTextContents(),['Quotation issued','Order created','Invoice issued','Deposit confirmed']);
assert.equal(await page.locator('.rqActivityTimeline [data-drawer-open-payment="fixture-pay"]').count(),1);
await page.screenshot({path:path.join(out,'documents-timeline-desktop.png'),fullPage:false});
await page.setViewportSize({width:390,height:844});
await page.screenshot({path:path.join(out,'documents-timeline-mobile.png'),fullPage:false});
assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'activity drawer fits mobile');
await page.setViewportSize({width:1440,height:1000});
await page.locator('.rqActivityTimeline [data-drawer-open-payment="fixture-pay"]').click();
await page.waitForSelector('#rqReceiptModal.open');
assert.match(await page.locator('#rqReceiptPaper').innerText(),/RC-TIMELINE/);
assert.match(await page.locator('.rqReceiptAmount').innerText(),/RM150.00/);
await page.locator('#rqReceiptClose').click();
assert.ok(await page.locator('#rqDocDrawer').isVisible());await page.locator('#rqDocDrawerClose').click();
await page.locator('[data-document-id="doc0"] .rqHistNo').click();
await page.evaluate(()=>document.querySelector('[data-document-id="doc2"]').click());
await page.waitForFunction(()=>document.querySelector('#rqDocDrawerSub').textContent.includes('Test Customer 2'));
await page.waitForTimeout(220);assert.match(await page.locator('#rqDocDrawerSub').innerText(),/Test Customer 2/,'late response must not overwrite newly selected document');
await page.locator('#rqDocDrawerClose').click();
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
await page.locator('#returnToOrderWorkspaces').click();await page.locator('#toggleQuoteBuilder').click();assert.equal(await page.locator('#qDeposit').inputValue(),'50');
await page.locator('#qCustomer').fill('Fixture Customer');await page.locator('[data-q="description"]').fill('Packaging');await page.locator('[data-q="quantity"]').fill('3');await page.locator('[data-q="unit"]').fill('100.01');await page.locator('#qDiscount').fill('10.03');await page.locator('#qShipping').fill('10');assert.equal(await page.locator('#qTotal').innerText(),'RM300.00');
await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(out,'documents-mobile-builder.png'),fullPage:true});
assert.ok(!await page.locator('#rqMonthlyPanel').isVisible(),'monthly charts are desktop only');
assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'builder must fit mobile');
await page.locator('#toggleQuoteBuilder').click();await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(out,'documents-mobile.png'),fullPage:false});
await page.locator('#showDocumentArchive').click();
assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'list must fit mobile');
// Revision previews preserve context and never expose historical mutations.
records[1].company.quoteMeta={source:'custom',revision:1,depositPercent:50};
await page.evaluate(()=>document.dispatchEvent(new CustomEvent('rq:documents-open-id',{detail:{id:'doc1'}})));
await page.waitForSelector('#quotationRevisionHistory summary');
await page.locator('#quotationRevisionHistory summary').click();
await page.locator('[data-revision="0"]').click();
await page.waitForFunction(()=>document.querySelector('#docModalTitle').textContent.includes('Historical'));
assert.equal(await page.locator('#docEdit').isVisible(),false);
assert.equal(await page.locator('#docConvert').isVisible(),false);
assert.equal(await page.locator('#docWhatsapp').isVisible(),false);
assert.match(await page.locator('#docPreview').innerText(),/Previous Customer/);
assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'revision history fits iPhone');
await page.screenshot({path:path.join(out,'quotation-revision-mobile.png'),fullPage:false});
await page.locator('[data-revision="1"]').click();
await page.waitForFunction(()=>!document.querySelector('#docModalTitle').textContent.includes('Historical'));
assert.equal(await page.locator('#docEdit').isVisible(),true);
await page.locator('#docClose').click();
mode='empty';await page.locator('#refreshDocs').click();await page.waitForFunction(()=>document.querySelector('#docResultsState').textContent.startsWith('0 of 0'));assert.ok(await page.locator('#docUnifiedEmpty').isVisible());
mode='loading';await page.locator('#refreshDocs').click();assert.equal(await page.locator('#docHistory').getAttribute('aria-busy'),'true');await page.waitForFunction(()=>document.querySelector('#docHistory').getAttribute('aria-busy')==='false');
mode='error';await page.locator('#refreshDocs').click();await page.waitForFunction(()=>document.querySelector('#docResultsState').textContent.includes('Fixture unavailable'));
mode='normal';await page.locator('#refreshDocs').click();await page.waitForSelector('#docHistory .rqHistRow');
financeDelay=180;
await page.waitForTimeout(500);
const financeCalls=actions.filter(x=>x==='documentsFinanceDashboard').length;
await page.locator('[data-doc-filter="quotation"]').click();
for(let i=0;i<30&&actions.filter(x=>x==='documentsFinanceDashboard').length===financeCalls;i++)await page.waitForTimeout(20);
assert.ok(actions.filter(x=>x==='documentsFinanceDashboard').length>financeCalls,'quotation change starts scoped finance refresh');
const previousSnapshot=await page.evaluate(()=>window.__REQOO_DOCS_FINANCE__?.at||0);
await page.locator('[data-doc-filter="all"]').click();
await page.waitForFunction(at=>window.__REQOO_DOCS_FINANCE__?.at>at&&window.__REQOO_DOCS_FINANCE__.documents.length===80,previousSnapshot);
assert.deepEqual(await page.evaluate(()=>window.__REQOO_DOCS_FINANCE__.documents.map(x=>x.id)),await page.evaluate(()=>window.__REQOO_DOCUMENTS__.map(x=>x.id)),'late finance response must not publish a stale document snapshot');
const linked=await context.newPage();linked.on('pageerror',e=>errors.push(e.message));await linked.goto('https://reqoo.test/admin/documents.html?order=ord2');await linked.waitForFunction(()=>document.querySelector('#rqDocDrawerTitle').textContent==='RQ-ord2');assert.equal(await linked.locator('.rqWorkspaceRow').count(),1,'Orders deep link opens exact workspace');await linked.close();
assert.deepEqual(errors,[]);console.log('PASS: order workspaces, linked document tabs, order-first quotation, preview context, desktop/mobile, deep links, search, paging, payments, A4 and race protection.');
}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});

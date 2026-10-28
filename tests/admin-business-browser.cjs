/* Browser fixtures only; no production requests or transactions. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=process.env.REQOO_TEST_OUTPUT||path.join(root,'..','test-results');
(async()=>{fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({headless:true,...(process.env.REQOO_CHROME?{executablePath:process.env.REQOO_CHROME}:{})});try{
const context=await browser.newContext({viewport:{width:1440,height:1000}});let authenticated=true,archived=false,cost=null,role='owner',searchFail=false,staff=[],posts=[];
const order={id:'order1',order_no:'RQ-TEST-001',orderNo:'RQ-TEST-001',name:'Fixture Buyer',customer_name:'Fixture Buyer',customer_id:'customer1',total_minor:10000,payment_status:'partial',fulfillment_status:'pending',created_at:'2026-10-15T08:00:00Z'};
await context.route('**/*',async route=>{const u=new URL(route.request().url());if(u.hostname!=='reqoo.test')return route.abort();
if(u.pathname.startsWith('/api/')){const d=route.request().method()==='POST'?route.request().postDataJSON():Object.fromEntries(u.searchParams);let b={ok:true};if(route.request().method()==='POST')posts.push(d.action);
if(u.pathname==='/api/admin-session'){if(route.request().method()==='POST')authenticated=true;if(!authenticated)return route.fulfill({status:401,json:{ok:false}});b={ok:true,role}}
else if(u.pathname==='/api/admin-business'){
 if(d.action==='identity'&&!authenticated)return route.fulfill({status:401,json:{ok:false}});
 if(d.action==='identity')b.identity={id:'fixture',name:'Fixture Owner',role};
 else if(d.action==='globalSearch'){if(searchFail)return route.fulfill({status:503,json:{ok:false,error:'Fixture search unavailable'}});b.results=[{kind:'Order',title:order.order_no,subtitle:'Fixture Buyer',url:'/admin/orders.html?order=order1'}]}
 else if(d.action==='customerLookup')b.customers=[{id:'customer1',name:'Fixture Buyer',phone:'0120000000',email:'fixture@example.test'}];
 else if(d.action==='todayTasks')b={ok:true,tasks:[{kind:'payment',title:'Bayaran / baki belum selesai',reference:order.order_no,customer:'Fixture Buyer',due_at:'2026-10-15',url:'/admin/documents.html?order=order1'}],offset:0,hasMore:false};
 else if(d.action==='orderProgress')b={ok:true,stages:[{key:'quotation',label:'Quotation',done:true},{key:'approval',label:'Kelulusan',done:true},{key:'payment',label:'Bayaran / deposit',done:true},{key:'production',label:'Production',done:false},{key:'delivery',label:'Siap / penghantaran',done:false}],next:'production',message:'Semak item dan mula production.',url:'/admin/production.html?q=RQ-TEST-001'};
 else if(d.action==='archives')b.items=archived?[{order_id:'order1',reference:order.order_no,reason:'Rekod dummy ujian',actor_name:'Fixture Owner'}]:[];
 else if(d.action==='archiveWorkspace'){assert.equal(d.confirmReference,order.order_no);assert.equal(d.reason,'');archived=true}
 else if(d.action==='restoreWorkspace'){assert.equal(d.confirmReference,order.order_no);archived=false}
 else if(d.action==='marginReport')b={ok:true,items:[{...order,revision:cost?1:null,cost_minor:cost?4500:null,profit_minor:cost?5500:null}],offset:0,hasMore:false};
 else if(d.action==='orderCosts')b={ok:true,order,cost};
 else if(d.action==='saveOrderCosts'){assert.equal(d.materialsMinor,2000);assert.equal(d.labourMinor,1500);assert.equal(d.shippingMinor,1000);cost={materials_minor:2000,labour_minor:1500,shipping_minor:1000,other_minor:0,revision:1}}
 else if(d.action==='staffList')b.staff=staff;
 else if(d.action==='saveStaff'){assert.equal(d.role,'sales');staff=[{id:'staff1',username:d.username,name:d.name,role:d.role,active:1}]}
 else if(d.action==='activity')b.items=[{id:'audit1',actor_name:'Fixture Owner',action:'saveOrderCosts',target:'order1',detail_json:'{}',outcome:'success',created_at:'2026-10-16'}];
 else throw Error('Unexpected business fixture '+d.action);
}else if(u.pathname==='/api/shop-admin'){
 if(d.action==='documentWorkspaces')b={ok:true,workspaces:archived?[]:[{order_id:'order1',reference:order.order_no,customer_name:'Fixture Buyer',total_minor:10000,paid_minor:5000,balance_minor:5000,quotation_count:1,invoice_count:1,receipt_count:1,delivery_count:0,stage:'partial'}],total:archived?0:1,offset:0,hasMore:false};
 else if(d.action==='listDocuments')b={ok:true,documents:[],total:0,stats:{},offset:0,hasMore:false};
 else if(d.action==='documentSettings')b.settings={quoteValidDays:7};
 else if(d.action==='documentsMonthlySummary')b={ok:true,year:2026,months:Array.from({length:12},(_,i)=>({month:i+1,quotationCount:0,invoiceCount:0,deliveryCount:0,invoiceMinor:0,paidMinor:0,paymentCount:0}))};
 else if(d.action==='ordersDashboard')b={ok:true,orders:[order],stats:{total:1,paid:1},total:1};
 else if(d.action==='getOrder')b={ok:true,order,items:[]};
 else if(d.action==='paymentSummary')b.summary={totalMinor:10000,paidMinor:5000,balanceMinor:5000,payments:[]};
 else if(d.action==='documentsFinanceDashboard')b={ok:true,summaries:[],invoices:[],documents:[],payments:[],stats:{}};
 else if(d.action==='financeDashboard')b={ok:true,summary:{},trend:[],products:[],breakdown:{},transactions:[]};
 else if(d.action==='dashboardSummary')b={ok:true,kpis:{},commandCenter:{},trend:[],latest:[]};
 else if(d.action==='productionDashboard')b={ok:true,orders:[],counts:{},total:0};
 else throw Error('Unexpected shop fixture '+d.action);
}else b={ok:true,hero:{}};
return route.fulfill({json:b})}
const file=path.join(root,u.pathname==='/admin/'?'admin/index.html':u.pathname);if(!fs.existsSync(file))return route.fulfill({status:404,body:''});
if(file.endsWith('.html'))return route.fulfill({contentType:'text/html',body:fs.readFileSync(file,'utf8').replace('</head>','<link rel="stylesheet" href="/admin/admin-base.css?v=1"><link rel="stylesheet" href="/admin/admin-flow.css?v=2"><link rel="stylesheet" href="/admin/admin-theme.css?v=2"></head>').replace('</body>','<script src="/admin/admin-shell.js?v=6"></script></body>')});
return route.fulfill({path:file,contentType:file.endsWith('.css')?'text/css':file.endsWith('.js')?'application/javascript':'text/plain'});
});
const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());
await p.goto('https://reqoo.test/admin/documents.html');await p.waitForSelector('[data-archive-workspace]');
await p.locator('#rqGlobalQuery').fill('RQ-TEST');await p.locator('#rqGlobalResults').getByRole('link').waitFor();
await p.locator('#rqGlobalQuery').press('Escape');assert.equal(await p.locator('#rqGlobalResults').isVisible(),false);
searchFail=true;await p.locator('#rqGlobalQuery').fill('error');await p.getByText('Fixture search unavailable').waitFor();searchFail=false;await p.locator('#rqGlobalQuery').press('Escape');
await p.locator('[data-archive-workspace]').click();assert.equal(await p.locator('dialog input[name=confirmReference]').count(),0);await p.getByRole('button',{name:'Confirm',exact:true}).click();await p.waitForFunction(()=>document.querySelectorAll('[data-open-workspace]').length===0);
await p.getByText('Hidden records',{exact:true}).click();await p.locator('[data-restore]').click();await p.locator('dialog button[type=submit]').filter({hasText:'Confirm'}).click();await p.waitForSelector('[data-open-workspace]');
await p.locator('#toggleQuoteBuilder').click();await p.locator('#qCustomer').fill('Fixture');await p.locator('#qCustomerMatches button').first().click();assert.equal(await p.locator('#qPhone').inputValue(),'0120000000');
await p.locator('[data-q=description]').fill('Fixture Item');await p.locator('[data-q=quantity]').fill('2');await p.locator('[data-q=unit]').fill('50');await p.locator('#qSaveDraft').click();await p.waitForFunction(()=>document.querySelector('#qDraftState').textContent.includes('Draf disimpan'));await p.locator('#qCustomer').fill('Changed');await p.locator('#qRestoreDraft').click();await p.waitForFunction(()=>document.querySelector('#qCustomer').value==='Fixture Buyer');assert.equal(await p.locator('#qCustomer').inputValue(),'Fixture Buyer');assert.equal(await p.locator('[data-q=unit]').inputValue(),'50');assert.ok(!(await p.evaluate(()=>localStorage.getItem('rq_quoteDraft_v1:fixture'))).includes('token'));
await p.locator('#qSaveDraft').click();await p.setViewportSize({width:390,height:844});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await p.screenshot({path:path.join(out,'business-documents-mobile.png')});
await p.goto('https://reqoo.test/admin/orders.html?order=order1');await p.waitForSelector('.rqOrderProgress');await p.getByText('Semak item dan mula production.',{exact:true}).waitFor();
await p.goto('https://reqoo.test/admin/finance.html');await p.getByText('Edit costs',{exact:true}).click();await p.locator('dialog input[name=materialsMinor]').fill('20');await p.locator('dialog input[name=labourMinor]').fill('15');await p.locator('dialog input[name=shippingMinor]').fill('10');assert.match(await p.locator('[data-profit]').innerText(),/RM 55.00/);await p.getByRole('button',{name:'Save costs',exact:true}).click();await p.getByText('Anggaran untung: RM 55.00',{exact:true}).waitFor();
await p.setViewportSize({width:1440,height:1000});await p.screenshot({path:path.join(out,'business-finance-desktop.png')});
await p.goto('https://reqoo.test/admin/settings.html');await p.getByRole('button',{name:'+ New staff',exact:true}).click();await p.locator('dialog input[name=name]').fill('Fixture Sales');await p.locator('dialog input[name=username]').fill('fixture-sales');await p.locator('dialog input[name=password]').fill('fixture-only-password');await p.getByRole('button',{name:'Save access',exact:true}).click();await p.getByText('fixture-sales · sales · Active').waitFor();assert.ok(await p.getByText('Fixture Owner · saveOrderCosts',{exact:true}).isVisible());
await p.goto('https://reqoo.test/admin/');await p.waitForSelector('#rqTodayTasks .rqTaskRow');await p.locator('#rqTodayTasks select').selectOption('payment');await p.waitForSelector('#rqTodayTasks .rqTaskRow');
role='production';await p.goto('https://reqoo.test/admin/finance.html');await p.waitForURL('**/admin/production.html');assert.equal(await p.locator('.rqAdminNav [data-rq-admin=finance]').isVisible(),false);
role='owner';authenticated=false;await p.goto('https://reqoo.test/admin/');await p.locator('#loginToken').fill('fixture-login-password');await p.locator('.login-btn').click();await p.waitForSelector('#rqGlobalQuery');assert.equal(await p.locator('#rqGlobalQuery').count(),1,'tools mount after login without duplicates');
assert.deepEqual(errors,[]);for(const action of ['archiveWorkspace','restoreWorkspace','saveOrderCosts','saveStaff'])assert.ok(posts.includes(action));
console.log('PASS: global search/error, archive/restore, customer reuse, quotation device drafts, progress, cost/profit forms, staff creation, activity, daily tasks, mobile layout and role navigation.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});

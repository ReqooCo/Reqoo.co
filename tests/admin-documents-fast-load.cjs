const fs=require('node:fs');
const assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');

const html=fs.readFileSync('admin/documents.html','utf8').replace(/<script[^>]*>[\s\S]*?<\/script>/gi,'');
const js=fs.readFileSync('admin/documents.js','utf8');
const dom=new JSDOM(html,{url:'https://admin.reqoo.co/admin/documents.html',runScripts:'outside-only',pretendToBeVisual:true});
const {window}=dom;
window.localStorage.setItem('reqoo_admin_token','test-token');
window.open=()=>null;
window.Response=global.Response;
window.Request=global.Request;
window.URL=global.URL;

let orderCalls=0,settingsCalls=0,documentCalls=0;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
window.fetch=async input=>{
  const url=new URL(String(input));
  const action=url.searchParams.get('action');
  if(action==='listDocuments'){
    documentCalls++;await sleep(15);
    return new Response(JSON.stringify({ok:true,documents:[{
      id:'doc_fast',type:'invoice',number:'INV-FAST-001',order_id:'RQ-FAST',status:'issued',
      payment_status:'pending',customer_name:'Fast Customer',customer_phone:'0123456789',
      total_minor:10000,created_at:'2026-09-18T10:00:00Z',issued_at:'2026-09-18T10:00:00Z'
    }]}),{status:200,headers:{'content-type':'application/json'}});
  }
  if(action==='ordersDashboard'){
    orderCalls++;await sleep(500);
    return new Response(JSON.stringify({ok:true,orders:[{id:'RQ-FAST',order_no:'RQ-FAST',payment_status:'paid',fulfillment_status:'pending',total_minor:10000,customer_name:'Fast Customer'}],total:1,offset:0,limit:80,hasMore:false,stats:{total:1,pending:0,paid:1,processing:0,paymentReady:1}}),{status:200,headers:{'content-type':'application/json'}});
  }
  if(action==='documentSettings'){
    settingsCalls++;await sleep(500);
    return new Response(JSON.stringify({ok:true,settings:{quoteValidDays:7,invoiceDueDays:14}}),{status:200,headers:{'content-type':'application/json'}});
  }
  throw new Error('Unexpected action '+action);
};

window.eval(js);

(async()=>{
  await sleep(90);
  assert.equal(documentCalls,1,'Documents should make one fast first-paint request');
  assert.match(window.document.getElementById('docHistory').textContent,/INV-FAST-001/,'Document rows must render without waiting for Orders');
  assert.equal(orderCalls,0,'Orders must not load during initial Documents first paint');
  assert.equal(settingsCalls,0,'Settings must not compete with initial Documents first paint');

  window.document.getElementById('toggleOrderDrawer').click();
  await sleep(25);
  assert.equal(orderCalls,1,'Orders should start loading only when Create from Order is opened');
  assert.match(window.document.getElementById('docHistory').textContent,/INV-FAST-001/,'Document list must remain visible while Orders load');
  await sleep(540);
  assert.match(window.document.getElementById('docList').textContent,/RQ-FAST/,'Lazy Orders should render after their slower request finishes');

  dom.window.close();
  console.log('PASS: Documents render before slow Orders/settings and lazy Orders start only on demand.');
})().catch(err=>{dom.window.close();console.error(err);process.exit(1)});

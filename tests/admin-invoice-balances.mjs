import fs from 'node:fs';
import assert from 'node:assert/strict';
for(const file of ['documents.js','document-public-v1.js']){
 const source=fs.readFileSync(new URL('../admin/'+file,import.meta.url),'utf8');
 const start=source.indexOf('function paper(doc){'),end=source.indexOf('\n}',start)+2;
 const paper=new Function(`const esc=v=>String(v??''),money=n=>'RM'+(Number(n||0)/100).toFixed(2),quoteMeta=d=>d.company?.quoteMeta||{},cleanField=v=>v||'',normalizeBankDetails=v=>v||'',customerBlock=()=>'',paymentTerms=()=>'',dateFmt=v=>v||'',typeLabel=v=>v,SSM_NO='fixture',LEGAL_NAME='fixture',DEFAULT_BANK_DETAILS='fixture';${source.slice(start,end)};return paper;`)();
 const base={order_id:'ord_0b885ba5-1da4-4830-9e77-b0f202ef1206',order_no:'RQ20261028-2077E',type:'invoice',number:'INV-FIXTURE',total_minor:30000,subtotal_minor:30000,payment_status:'partial',company:{quoteMeta:{depositPercent:50}},items:[]};
 for(const [paid,balance,status] of [[5000,25000,'partial'],[20000,10000,'partial'],[30000,0,'paid']]){
  const html=paper({...base,financials:{paidMinor:paid,balanceMinor:balance,amountDueNowMinor:balance,paymentStatus:status}});
  assert.ok(html.includes('<span>Payments Received</span><b>RM'+(paid/100).toFixed(2)+'</b>'),file);
  assert.ok(html.includes('<span>Outstanding Balance</span><b>RM'+(balance/100).toFixed(2)+'</b>'),file);
  assert.ok(!html.includes('Deposit Received 50%'),file+' must not infer a payment from terms');
 }
 const numbered=paper(base);assert.ok(numbered.includes('RQ20261028-2077E'));assert.ok(!numbered.includes(base.order_id),'internal database IDs must not appear on customer documents');
 const legacy=paper({...base,order_no:null});assert.ok(!legacy.includes(base.order_id),'missing order number must not expose a raw ID');
 const unpaid=paper({...base,status:'paid',financials:{paidMinor:0,balanceMinor:30000,amountDueNowMinor:15000,paymentStatus:'pending'}});
 assert.ok(unpaid.includes('DEPOSIT DUE'));assert.ok(unpaid.includes('<span>AMOUNT DUE NOW</span><b>RM150.00</b>'));
 const quote=paper({...base,type:'quotation',status:'issued',company:{quoteMeta:{revision:2,depositPercent:50}}});
 assert.ok(!quote.includes('Payments Received'));assert.ok(quote.includes('Rev 2'));
}
console.log('PASS: Admin/public invoice render actual 1/6, 2/3 and full payments, deposit due, ledger status and quotation revision.');

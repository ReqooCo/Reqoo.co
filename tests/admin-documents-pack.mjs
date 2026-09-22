import fs from 'node:fs';import assert from 'node:assert/strict';
const html=fs.readFileSync(new URL('../admin/documents.html',import.meta.url),'utf8');
const js=fs.readFileSync(new URL('../admin/documents.js',import.meta.url),'utf8');
const shell=fs.readFileSync(new URL('../admin/admin-shell.js',import.meta.url),'utf8');
const worker=fs.readFileSync(new URL('../_web_worker.js',import.meta.url),'utf8');
assert.match(html,/quotation/i);assert.match(html,/invoice/i);assert.match(html,/receipt/i);assert.match(html,/documents\.js\?v=10/);
assert.match(js,/ordersDashboard/);assert.doesNotMatch(js,/listOrders/);assert.match(js,/initialDocOrder/);assert.match(js,/URLSearchParams\(location\.search\)/);assert.match(js,/limit:80/);assert.match(js,/loadMoreDocOrders/);assert.match(js,/setTimeout\(\(\)=>loadOrders\(true\),260\)/);assert.match(js,/listDocuments',\{orderId:initialDocOrder,limit:50\}/);assert.doesNotMatch(js,/X-Admin-Token/);assert.doesNotMatch(js,/localStorage\.getItem/);assert.match(js,/listDocuments/);assert.match(js,/Pautan rasmi REQOO\.CO/);assert.doesNotMatch(js,/\?v='\+rev/,'WhatsApp document URL should stay as short as possible');assert.match(js,/rqPaperPaymentTerms/);assert.match(js,/createDocument/);assert.match(js,/saveDocumentSettings/);assert.match(js,/w\.print\(\)/);
assert.match(shell,/Documents/);assert.match(shell,/\/admin\/documents\.html/);
assert.match(worker,/settings\|documents/);assert.match(worker,/admin-shell\.js\?v=3/);
console.log('PASS: current Admin Documents runtime is wired to canonical shared Admin assets.');

assert.match(js,/UNIT PRICE/,'Document table must label monetary column as UNIT PRICE');

import fs from 'node:fs';
import assert from 'node:assert/strict';

const api=fs.readFileSync(new URL('../api/shop-admin-flow-v12.js',import.meta.url),'utf8');
const v14=fs.readFileSync(new URL('../api/shop-admin-flow-v14.js',import.meta.url),'utf8');
const v15=fs.readFileSync(new URL('../api/shop-admin-flow-v15.js',import.meta.url),'utf8');
const v16=fs.readFileSync(new URL('../api/shop-admin-flow-v16.js',import.meta.url),'utf8');
const v17=fs.readFileSync(new URL('../api/shop-admin-flow-v17.js',import.meta.url),'utf8');
const worker=fs.readFileSync(new URL('../api/worker.js',import.meta.url),'utf8');
const web=fs.readFileSync(new URL('../_web_worker.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../admin/documents.html',import.meta.url),'utf8');
const ui=fs.readFileSync(new URL('../admin/documents-v2.js',import.meta.url),'utf8');
const publicHtml=fs.readFileSync(new URL('../admin/document-public.html',import.meta.url),'utf8');
const publicUi=fs.readFileSync(new URL('../admin/document-public-v1.js',import.meta.url),'utf8');

assert.match(worker,/shop-admin-flow-v17\.js/,'API worker must route Shop Admin through v17');
assert.match(v17,/shop-admin-flow-v16\.js/);
assert.match(v16,/shop-admin-flow-v15\.js/);
assert.match(v15,/shop-admin-flow-v14\.js/);
assert.match(v14,/shop-admin-flow-v13\.js/,'v14 must preserve v13 -> v12 Documents chain');

assert.match(api,/reqoo_document_sequences/);
assert.match(api,/reqoo_documents/);
assert.match(api,/delivery_order/);
assert.match(api,/Receipt hanya boleh dikeluarkan selepas bayaran disahkan/);
assert.match(api,/QT.*INV.*RC.*DO|PREFIX=/s);
assert.match(api,/publicDocument/);
assert.match(api,/share_token/);

assert.match(v17,/createCustomQuotation/);
assert.match(v17,/custom:\$\{id\}/);
assert.match(v17,/Quotation dibuat secara custom sebelum order/);
assert.match(v17,/quoteMeta/);
assert.match(v17,/updateCustomQuotationStatus/);
assert.match(v17,/convertCustomQuotationToOrder/);
assert.match(v17,/admin_quotation/);
assert.match(v17,/convertedOrderId/);
assert.match(v17,/status='accepted'/);

assert.match(html,/Create Custom Quotation/);
assert.match(html,/Order yang sudah wujud tidak perlukan quotation/);
assert.match(html,/id="docConvert"/);
assert.match(html,/SSM REGISTRATION NO/);
assert.match(html,/documents-v2\.js\?v=3/);
assert.match(html,/documents-v2\.css\?v=3/);
assert.doesNotMatch(ui,/data-create="quotation"/);
assert.match(ui,/createCustomQuotation/);
assert.match(ui,/convertCustomQuotationToOrder/);
assert.match(ui,/updateCustomQuotationStatus/);
assert.match(ui,/Convert to Order|convertActiveQuote/);
assert.match(ui,/listDocuments/);
assert.match(ui,/saveDocumentSettings/);
assert.match(ui,/wa\.me/);
assert.match(ui,/quoteMeta/);
assert.match(ui,/AB ART TRADING/);
assert.match(ui,/201903337879 \(003053605-X\)/);
assert.match(ui,/rqPaperCustomerAddress/);
assert.match(ui,/TEL \/ WHATSAPP/);

assert.match(publicHtml,/document-public-v1\.js\?v=3/);
assert.match(publicHtml,/document-public-v1\.css\?v=3/);
assert.match(publicUi,/publicDocument/);
assert.match(publicUi,/quoteMeta/);
assert.match(publicUi,/AB ART TRADING/);
assert.match(publicUi,/201903337879 \(003053605-X\)/);
assert.match(publicUi,/rqPaperCustomerAddress/);
assert.match(publicUi,/window\.print/);
assert.match(web,/document-public\.html/);
assert.match(web,/\/d\\\//);

console.log('PASS: Documents supports custom quotations, conversion, Reqoo legal branding and structured customer details.');

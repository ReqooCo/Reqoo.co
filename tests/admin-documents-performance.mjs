import fs from 'node:fs';
import assert from 'node:assert/strict';

const main=fs.readFileSync(new URL('../admin/documents.js',import.meta.url),'utf8');
const payment=fs.readFileSync(new URL('../admin/documents-payment-v1.js',import.meta.url),'utf8');
const overdue=fs.readFileSync(new URL('../admin/documents-overdue-v1.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../admin/documents.html',import.meta.url),'utf8');

assert.match(main,/api\('listDocuments',\{limit:150\}\)/,'initial Documents load must request documents directly');
assert.doesNotMatch(main,/Promise\.all\(\[api\('listOrders'/,'initial Documents load must not wait for Orders');
assert.match(main,/toggleOrderDrawer.*loadOrders/s,'Orders must load only when Create from Order is opened');
assert.match(main,/requestIdleCallback/,'settings should be deferred until the browser is idle');
assert.match(main,/rq:documents-ready/,'main document list must signal first-paint readiness');
assert.match(main,/__REQOO_DOCUMENTS__/,'loaded document headers should be shared with enhancement modules');

assert.match(payment,/rq:documents-ready/,'payment enhancement must wait for document first paint');
assert.match(payment,/__REQOO_DOCUMENTS__/,'payment enhancement must reuse the already-loaded document list');
assert.match(payment,/rq:documents-finance-ready/,'payment enhancement must publish one shared finance snapshot');

assert.match(overdue,/rq:documents-finance-ready/,'overdue UI must consume the shared finance snapshot');
assert.match(overdue,/__REQOO_DOCS_FINANCE__/,'overdue UI must reuse finance data before falling back to its own requests');
assert.doesNotMatch(overdue,/schedule\(50\)/,'overdue calculations must not compete with the first document request');

assert.match(html,/documents\.js\?v=4/);
assert.match(html,/documents-payment-v1\.js\?v=2/);
assert.match(html,/documents-overdue-v1\.js\?v=2/);

console.log('PASS: Documents first paint is isolated from slow Orders/settings and finance widgets reuse shared data.');

import fs from 'node:fs';import assert from 'node:assert/strict';
const worker=fs.readFileSync(new URL('../_web_worker.js',import.meta.url),'utf8');
const runtime=fs.readFileSync(new URL('../shop/admin-production-queue-v2.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../admin/shop-production-queue-v2.css',import.meta.url),'utf8');
assert.match(worker,/shop-production-queue-v2\.css\?v=1/);assert.match(worker,/admin-production-queue-v2\.js\?v=1/);
assert.match(runtime,/listOrders/);assert.match(runtime,/listProductionMeta/);assert.match(runtime,/saveProductionMeta/);assert.match(runtime,/dueDate/);assert.match(runtime,/priority/);assert.match(runtime,/assignedTo/);assert.match(runtime,/internalNote/);assert.match(runtime,/Due Hari Ini/);assert.match(runtime,/Overdue/);
assert.match(runtime,/verifyPayment/);assert.match(runtime,/status:'processing'/);assert.match(runtime,/status:'fulfilled'/);assert.match(runtime,/Buka Semula/);assert.match(runtime,/confirm\(a\.confirm\)/);
assert.match(css,/\.rqPlanner/);assert.match(css,/\.rqPriority-urgent/);assert.match(css,/\.rqDue-overdue/);
console.log('PASS: Production Management V2 adds planning controls without removing guarded status workflow.');
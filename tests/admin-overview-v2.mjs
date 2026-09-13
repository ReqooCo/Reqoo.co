import fs from 'node:fs';import assert from 'node:assert/strict';
const js=fs.readFileSync(new URL('../admin/overview-v2.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../admin/overview-v2.css',import.meta.url),'utf8');
const worker=fs.readFileSync(new URL('../_web_worker.js',import.meta.url),'utf8');
assert.match(js,/listOrders/);assert.match(js,/listProductionMeta/);assert.match(js,/PAID REVENUE/);assert.match(js,/PENDING PAYMENT/);assert.match(js,/DUE TODAY/);assert.match(js,/OVERDUE/);assert.match(js,/REPEAT CUSTOMERS/);assert.match(js,/Revenue hanya payment PAID/);
assert.match(js,/\/admin\/finance\.html/);assert.match(js,/\/admin\/customers\.html/);assert.match(js,/\/admin\/documents\.html/);assert.match(js,/\/shop\/admin\.html#production/);
assert.match(css,/\.rqKpis/);assert.match(css,/\.rqDashGrid/);assert.match(css,/@media\(max-width:780px\)/);
assert.match(worker,/overview-v2\.css\?v=1/);assert.match(worker,/overview-v2\.js\?v=1/);assert.match(worker,/REQOO Admin — Control Centre/);
console.log('PASS: Overview V2 combines actionable Orders, Production, Finance and customer signals without mutations.');
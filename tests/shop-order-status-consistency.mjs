import fs from 'node:fs';
import assert from 'node:assert/strict';

const js=fs.readFileSync('shop/admin-production-queue-v1.js','utf8');
const css=fs.readFileSync('admin/shop-production-queue-v1.css','utf8');

assert.match(js,/function tableStatus\(o\)/,'table status normalizer must exist');
const fn=js.slice(js.indexOf('function tableStatus'),js.indexOf('function age'));
assert.ok(fn.indexOf("f==='fulfilled'") < fn.indexOf("p==='paid'"),'fulfilled must override paid');
assert.ok(fn.indexOf("f==='processing'") < fn.indexOf("p==='paid'"),'processing must override paid');
assert.match(js,/syncMainTable\(orders\)/,'queue render must normalize the main order table');
assert.match(js,/badge\.textContent!==text/,'status updates should avoid mutation loops');
assert.match(css,/\.status\.fulfilled/,'fulfilled status must have a visible treatment');
assert.match(css,/data-reqoo-status="processing"/,'processing rows must be distinguishable');
console.log('PASS: Shop Admin order statuses prioritize fulfillment over paid state.');

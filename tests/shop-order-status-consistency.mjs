import fs from 'node:fs';
import assert from 'node:assert/strict';

const js=fs.readFileSync('admin/orders-v1.js','utf8');
const css=fs.readFileSync('admin/orders-v1.css','utf8');

assert.match(js,/function bucket\(o\)/,'current Orders status normalizer must exist');
const fn=js.slice(js.indexOf('function bucket'),js.indexOf('function label'));
assert.ok(fn.indexOf("f==='fulfilled'") < fn.indexOf("return'paid'"),'fulfilled must override generic paid state');
assert.ok(fn.indexOf("f==='processing'") < fn.indexOf("return'paid'"),'processing must override generic paid state');
assert.match(css,/\.rqStatus\.fulfilled/,'fulfilled status must have a visible treatment');
assert.match(css,/\.rqStatus\.processing/,'processing status must have a visible treatment');
console.log('PASS: current Orders page prioritizes fulfillment status over the generic paid state.');

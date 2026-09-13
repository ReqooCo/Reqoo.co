import fs from 'node:fs';
import assert from 'node:assert/strict';

const src=fs.readFileSync(new URL('../api/shop-admin-flow-v6.js',import.meta.url),'utf8');
assert.match(src,/stock\.restored\.payment_rejected/,'rejection must record an idempotency event');
assert.match(src,/stock_qty=stock_qty\+\?/,'rejection must restore tracked stock');
assert.match(src,/usage_count=MAX\(0,usage_count-1\)/,'rejection must release promo usage');
assert.match(src,/payment_status='failed',fulfillment_status='cancelled'/,'rejection must cancel fulfillment');
assert.match(src,/state==='paid'/,'paid orders must be protected from rejection');

const v7=fs.readFileSync(new URL('../api/shop-admin-flow-v7.js',import.meta.url),'utf8');
assert.match(v7,/shop-admin-flow-v6\.js/,'v7 must preserve the stock-safe v6 rejection flow');
const v8=fs.readFileSync(new URL('../api/shop-admin-flow-v8.js',import.meta.url),'utf8');
assert.match(v8,/shop-admin-flow-v7\.js/,'v8 must preserve the stock-safe v7 chain');
const v9=fs.readFileSync(new URL('../api/shop-admin-flow-v9.js',import.meta.url),'utf8');
assert.match(v9,/shop-admin-flow-v8\.js/,'v9 must preserve the stock-safe v8 chain');
const v10=fs.readFileSync(new URL('../api/shop-admin-flow-v10.js',import.meta.url),'utf8');
assert.match(v10,/shop-admin-flow-v9\.js/,'v10 must preserve the stock-safe v9 chain');
const worker=fs.readFileSync(new URL('../api/worker.js',import.meta.url),'utf8');
assert.match(worker,/shop-admin-flow-v10\.js/,'worker must route admin requests through the latest stock-safe admin flow');
console.log('shop rejected-payment stock restoration regression: ok');

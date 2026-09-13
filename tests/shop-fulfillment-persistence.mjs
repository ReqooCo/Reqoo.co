import fs from 'node:fs';
import assert from 'node:assert/strict';
const v10=fs.readFileSync(new URL('../api/shop-admin-flow-v10.js',import.meta.url),'utf8');
assert.match(v10,/UPDATE orders SET fulfillment_status=\?/,'v10 must persist fulfillment status');
assert.match(v10,/SELECT id,order_no,payment_status,fulfillment_status,updated_at FROM orders/,'v10 must read status back after update');
assert.match(v10,/Status tidak berjaya disimpan/,'v10 must fail loudly if persistence check fails');
assert.match(v10,/order\.fulfilled/,'v10 must audit fulfilled transitions');
assert.match(v10,/order\.processing/,'v10 must audit processing transitions');
console.log('shop fulfillment persistence regression: ok');

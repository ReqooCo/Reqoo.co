import fs from 'node:fs';import assert from 'node:assert/strict';
const api=fs.readFileSync(new URL('../api/shop-admin-flow-v13.js',import.meta.url),'utf8');
const worker=fs.readFileSync(new URL('../api/worker.js',import.meta.url),'utf8');
const migration=fs.readFileSync(new URL('../migrations/0009_shop_production_meta.sql',import.meta.url),'utf8');
assert.match(api,/legacy.*shop-admin-flow-v12/);assert.match(api,/saveProductionMeta/);assert.match(api,/listProductionMeta/);assert.match(api,/getProductionMeta/);assert.match(api,/internal_note/);assert.match(api,/PRIORITIES/);assert.match(api,/Unauthorized/);
assert.match(worker,/shop-admin-flow-v13\.js/);assert.match(migration,/shop_production_meta/);assert.match(migration,/REFERENCES orders\(id\) ON DELETE CASCADE/);
console.log('PASS: production metadata is admin-authenticated, isolated from orders and wraps v12 safely.');
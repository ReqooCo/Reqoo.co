import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [shop, core, commerce, tumbler, plaque, worker] = await Promise.all([
  read('shop/index.html'),
  read('shop/shop-core-v1.js'),
  read('shop/botanical-commerce-v1.css'),
  read('tumbler/index.html'),
  read('plaque/index.html'),
  read('_web_worker.js'),
]);

assert.match(shop, /botanical-commerce-v1\.css\?v=2/, 'Shop must load the fixed cart drawer stylesheet');
assert.match(shop, /shop-core-v1\.js\?v=6/, 'Shop must bypass the stale catalogue script cache');
assert.match(worker, /shop-core-v1\.js\?v=6/, 'Edge worker must serve the same Shop runtime version');
assert.doesNotMatch(commerce, /right:-470px/, 'Closed cart must not widen the page');
assert.match(commerce, /transform:translateX\(105%\)/, 'Closed cart should use a compositor transform');
assert.match(commerce, /overflow-x:hidden/, 'Storefront must prevent accidental horizontal scrolling');
assert.match(core, /if\(\/plaque\/i\.test\(name\)\)return'Plaque'/, 'Plaque products must share one category');
assert.match(core, /if\(\/tumbler\/i\.test\(name\)\)return'Tumbler'/, 'Tumbler products must have a clear category');
assert.match(core, /Produk custom REQOO yang boleh disesuaikan/, 'Draft descriptions must not leak into the public shop');
assert.match(tumbler, /href="\/shop\/">Shop<\/a>/, 'Tumbler landing must link back to the Shop');
assert.match(tumbler, /Terus ke Bayaran/, 'Tumbler CTA must explain the next step');
assert.match(tumbler, /aria-label="Kuantiti \$\{label\}"/, 'Tumbler quantities need accessible names');
assert.match(tumbler, /Sila isi nombor WhatsApp yang sah/, 'Tumbler checkout must validate WhatsApp numbers');
assert.match(tumbler, /Sila isi alamat lengkap untuk penghantaran/, 'Paid shipping must require an address');
for (const id of ['variantSelect', 'unitPrice', 'qty', 'customText', 'artwork', 'note']) {
  assert.match(plaque, new RegExp(`label for="${id}"`), `Plaque field ${id} must have a linked label`);
}

console.log('PASS: Shop, Tumbler and Plaque sales-flow safeguards are present.');

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [shop, core, commerce, tumbler, tumblerRuntime, plaque, worker] = await Promise.all([
  read('shop/index.html'),
  read('shop/shop-core-v1.js'),
  read('shop/botanical-commerce-v1.css'),
  read('tumbler/index.html'),
  read('tumbler/tumbler-order.js'),
  read('plaque/index.html'),
  read('_web_worker.js'),
]);

assert.match(shop, /botanical-commerce-v1\.css\?v=2/, 'Shop must load the fixed cart drawer stylesheet');
assert.match(shop, /shop-core-v1\.js\?v=7/, 'Shop must bypass the stale catalogue script cache');
assert.match(worker, /shop-core-v1\.js\?v=7/, 'Edge worker must serve the same Shop runtime version');
assert.doesNotMatch(commerce, /right:-470px/, 'Closed cart must not widen the page');
assert.match(commerce, /transform:translateX\(105%\)/, 'Closed cart should use a compositor transform');
assert.match(commerce, /overflow-x:hidden/, 'Storefront must prevent accidental horizontal scrolling');
assert.match(core, /if\(\/plaque\/i\.test\(name\)\)return'Plaque'/, 'Plaque products must share one category');
assert.match(core, /if\(\/tumbler\/i\.test\(name\)\)return'Tumbler'/, 'Tumbler products must have a clear category');
assert.match(core, /Produk custom REQOO yang boleh disesuaikan/, 'Draft descriptions must not leak into the public shop');
assert.match(tumbler, /href="\/shop\/">Shop<\/a>/, 'Tumbler landing must link back to the Shop');
assert.match(tumbler, /Terus ke Bayaran/, 'Tumbler CTA must explain the next step');
assert.match(tumbler, /300ml/, 'Tumbler landing must advertise the 300ml option');
assert.match(tumbler, /600ml/, 'Tumbler landing must advertise the 600ml option');
assert.match(tumblerRuntime, /aria-label="Kuantiti \$\{label\}"/, 'Tumbler quantities need accessible names');
assert.match(tumblerRuntime, /Sila isi nombor WhatsApp yang sah/, 'Tumbler checkout must validate WhatsApp numbers');
assert.match(tumblerRuntime, /Sila isi alamat lengkap untuk penghantaran/, 'Paid shipping must require an address');
assert.match(tumbler, /shared\/meta-pixel-v1\.js\?v=1/, 'Tumbler landing must load the shared Meta pixel');
assert.match(tumblerRuntime, /ViewContent/, 'Tumbler must track product viewing');
assert.match(tumblerRuntime, /AddToCart/, 'Tumbler must track order intent');
assert.match(tumblerRuntime, /InitiateCheckout/, 'Tumbler must track checkout intent');
assert.doesNotThrow(()=>new Function(tumblerRuntime),'Tumbler runtime must parse');
for (const id of ['mVariant', 'mUnit', 'mQty', 'mCustom', 'mArtwork', 'mNote']) {
  assert.match(plaque, new RegExp(`label for="${id}"`), `Plaque field ${id} must have a linked label`);
}

console.log('PASS: Shop, Tumbler and Plaque sales-flow safeguards are present.');

# REQOO.CO Shop

Canonical customer shop: `shop.reqoo.co`

## V1 flow

1. Admin tambah/edit produk di `admin.reqoo.co` → **Shop**.
2. Produk aktif terus muncul di Shop.
3. Pelanggan pilih variasi, teks/artwork dan kuantiti; kuantiti boleh diubah dalam cart.
4. Checkout menyemak harga/stok melalui `quoteOrder` dan pilihan penerimaan admin sebelum memaparkan QR tetap **Ab Art Trading**.
5. Pelanggan upload bukti pembayaran.
6. Order + bukti pembayaran masuk ke Admin untuk pengesahan.

## Sumber canonical

- Customer UI: `shop/index.html` + `shop/shop-core-v1.js`
- Shop Admin UI: `shop/admin.html`
- Public Shop API: `api/shop-flow-v3.js` → `api/shop-flow-v2.js`
- Admin Shop API: `api/shop-admin-flow-v4.js` → `api/shop-admin-flow-v5.js`
- Product media: `api/shop-media.js` + `functions/api/product-image.js`
- Database: D1 `reqoo-rebuild`
- Product/order artwork dan receipt: R2 `reqoo-product-media`

Harga checkout sentiasa disahkan semula di server. Frontend tidak menjadi sumber harga yang dipercayai.

PKSK/SIM menggunakan route dan fail berasingan dan tidak menjadi sebahagian daripada Shop flow.

Customer presentation: `shop/shop-premium.css`. Checkout contact details remain in memory within the current page session. Run Node tests in `tests/shop-*`; DOM test requires `jsdom@30.0.1`.

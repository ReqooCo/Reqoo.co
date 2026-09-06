# REQOO.CO Shop

Canonical customer shop: `shop.reqoo.co`

## V1 flow

1. Admin tambah/edit produk di `admin.reqoo.co` → **Shop**.
2. Produk aktif terus muncul di Shop.
3. Pelanggan pilih variasi, teks/artwork dan kuantiti.
4. Checkout menggunakan QR tetap **Ab Art Trading**.
5. Pelanggan upload bukti pembayaran.
6. Order + bukti pembayaran masuk ke Admin untuk pengesahan.

## Sumber canonical

- Customer UI: `shop/index.html` + `shop/shop-core-v1.js`
- Shop Admin UI: `shop/admin.html`
- Public Shop API: `api/shop-v1.js` (canonical boundary; audited stable implementation currently delegates internally to v3/v2)
- Admin Shop API: `api/shop-admin-v1.js` (canonical boundary; audited stable implementation currently delegates internally to v4/v5/v2)
- Product media: `api/shop-media.js` + `functions/api/product-image.js`
- Database: D1 `reqoo-rebuild`
- Product/order artwork dan receipt: R2 `reqoo-product-media`

### Consolidation rule

The V1 boundary is now the only production route target for Shop and Shop Admin. Legacy flow files remain temporarily because their stable actions are still referenced internally. They must not be deleted until the remaining fallback logic is inlined into the V1 implementation and static reference checks pass.

Harga checkout sentiasa disahkan semula di server. Frontend tidak menjadi sumber harga yang dipercayai.

PKSK/SIM menggunakan route dan fail berasingan dan tidak menjadi sebahagian daripada Shop flow.

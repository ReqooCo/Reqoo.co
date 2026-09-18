# REQOO.CO Shop

Canonical customer shop: `shop.reqoo.co`

## Current flow

1. Admin urus produk di `admin.reqoo.co`.
2. Produk aktif muncul di Shop.
3. Pelanggan pilih variasi, customization dan kuantiti.
4. Checkout mengesahkan harga/stok di server sebelum payment.
5. Payment/order masuk ke Admin untuk semakan dan fulfillment.

## Sumber canonical

- Customer UI: `shop/index.html` + `shop/shop-core-v1.js`
- Customer presentation: `shop/botanical-shop-v2.css` + `shop/shop-premium-v2.css`
- Shop Admin legacy/recovery UI: `shop/admin.html`
- Public Shop API entrypoint: `api/worker.js` → `api/shop-flow-v5.js`
- Admin Shop API entrypoint: `api/worker.js` → `api/shop-admin-flow-v18.js`
- Product media: `api/shop-media.js` + `functions/api/product-image.js`
- Database: D1 `reqoo-rebuild`
- Product/order artwork and receipt: R2 `reqoo-product-media`

The numbered API flow files are a compatibility chain, not duplicate live entrypoints. Do not delete one merely because a newer number exists; `tests/api-version-chain.mjs` verifies that every relative import exists and that the active Admin chain has no cycle.

The Admin visual shell uses only three shared canonical assets: `admin/admin-base.css`, `admin/admin-flow.css`, and `admin/admin-shell.js`. Cache revisions belong in the query string, not in new numbered copies.

Checkout prices are always revalidated on the server. PKSK/SIM uses separate routes and runtime files.

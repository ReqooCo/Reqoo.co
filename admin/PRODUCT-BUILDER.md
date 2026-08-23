# Reqoo Product Builder

Admin boleh bina produk dengan konfigurasi:

- Produk biasa / custom / service / digital
- Variation: dropdown atau radio
- Add-on: checkbox / dropdown dengan harga
- Custom field: text, textarea, number dan lain-lain
- Required field
- Sehingga 12 product images
- Status draft / active / hidden / out-of-stock / archived

## Pricing rule

Harga variation ialah **harga penuh seunit** untuk pilihan tersebut. Add-on ialah tambahan kepada harga variation/base yang dipilih.

Contoh:

- Base RM30
- Variation A4 = RM40 → harga item RM40
- Add-on Frame +RM10 → harga item RM50

Checkout tidak mempercayai harga daripada browser. API membaca semula product metadata daripada D1, mengesahkan variation/add-on/custom field dan mengira harga server-side sebelum order dicipta.

## Data flow

`Admin Product Builder → Catalog API → D1/R2 → Published Shop → Product Detail → Cart → Checkout → Server Pricing → Order`

Admin authentication menggunakan HttpOnly session. `ADMIN_KEY` tidak disimpan dalam browser.

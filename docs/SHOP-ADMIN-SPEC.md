# SHOP Admin — locked requirements

SHOP must no longer depend on Google Apps Script. The Cloudflare SHOP D1 database is the source of truth.

Admin SHOP capabilities:
- Add product
- Edit product
- Change product image URL/path
- Enable/disable product
- Add/edit/delete variants, size and price
- View customer/order/payment records
- Open a printable auto-generated receipt from an order
- Keep customer purchase history for future marketing
- Promotions and referral controls remain SHOP-only

Receipt is generated from the order stored in D1, so it does not depend on Google Drive or Google Sheets.

Legacy SHOP UI remains the visual baseline; upgrades are additive.

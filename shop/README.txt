REQOO PROMO + QR FINAL FIX

Replace in GitHub /shop/:
- index.html
- promotion.html
- assets/qr-maybank.png

Google Apps Script:
- Replace Code.gs completely.
- Deploy -> Manage deployments -> Edit -> New version -> Deploy.
- Keep the same Web App URL.

What this fixes:
1. One campaign slug can contain multiple promotion rows/products.
2. Public promotion page groups products by campaign slug.
3. Shop loads ALL active promo items for ?promo=campaign-slug.
4. Promo price applies only to the matching product + variant.
5. Changing variant removes the old promo unless the new variant has its own promo in the same campaign.
6. Cart can contain multiple promo items.
7. Server verifies promo by promoId first, then by campaign slug + productId + variant.
8. Server recalculates promo price instead of trusting browser price.
9. Checkout uses assets/qr-maybank.png with the new Ab Art Trading QR.

Do not change the ADMIN_TOKEN unless you intentionally want to change authentication.

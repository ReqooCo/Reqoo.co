# Baseline compare — 2026-08-14

Original SHOP baseline: `4dc299a03dc053dcef449497f30974099ce2cafe`.

The migration introduced 35 commits after that baseline. Comparison identified three modified legacy UI files that should be restored before further upgrades: `shop/index.html`, `index.html`, and `admin/index.html`.

Original SHOP inventory confirmed in the baseline tree includes:
- `shop/index.html` (43,695 bytes)
- `shop/account.html`
- `shop/admin.html`
- `shop/promotion-admin.html`
- `shop/promotion.html`
- `shop/product-1.jpg` through `shop/product-8.jpg`
- `shop/assets/3d-print.jpg`
- `shop/assets/brooch-01-04.jpg`
- `shop/assets/brooch-05-07.jpg`
- `shop/assets/medal.jpg`
- `shop/assets/plaque-basic.jpg`
- `shop/assets/plaque-classic.jpg`
- `shop/assets/plaque-prestige.jpg`
- `shop/assets/plaque-signature.jpg`
- `shop/assets/trophy.jpg`
- `shop/assets/products/700-3d-print-service.jpg`
- the original shop manifest/service worker and QR assets.

Rule: restore legacy pages/assets first, then layer upgrades additively. Do not replace the original SHOP or SIM experience.

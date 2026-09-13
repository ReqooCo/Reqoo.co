# Reqoo source audit and Shop upgrade — 13 September 2026

Baseline: main at 0e09adf. This is a focused source audit, not a full production or payment audit.

## Active paths verified in source

| Area | Entry |
|---|---|
| Web routing | `_web_worker.js` |
| Landing | `index.html` + injected `landing-runtime.js` |
| Customer Shop | `shop/index.html` + injected `shop/shop-core-v1.js` |
| Shop Admin | `shop/admin.html` |
| Shop API | `api/worker.js` → `api/shop-flow-v3.js` |
| Shop Admin API | `api/worker.js` → `api/shop-admin-flow-v4.js` |
| PKSK API | `api/worker.js` → `api/pksk.js` |
| Production deployment | `.github/workflows/deploy.yml`, push to main |

## Confirmed defects fixed

- Shop host prepended `/shop` to already-prefixed URLs, producing `/shop/shop/...` for injected JS and QR assets. Preserve already-prefixed paths.
- Product modal selected variation zero even when sold out. Select the first available variation.
- Quantity totals were calculated before stock clamping. Normalize quantity before calculating totals and adding to cart.
- Fractional/nonfinite quantities now normalize to positive finite integers.
- Variation image now falls back to product image instead of retaining the previous variation's image.
- Empty stock values consistently mean unspecified stock in the existing UI contract.
- Runtime query version bumped to refresh cached JS after release.

## Verification

Passed Node syntax checks, `node tests/shop-routing.mjs`, and `node tests/shop-quantity-unit.cjs`.
Browser regression scenario is provided in `tests/shop-variant-quantity.cjs` (requires Playwright and Chromium). It was not executed successfully here because Chromium was unavailable and its download timed out. Live checkout, payment, database and admin authentication were not tested or modified.

## Remaining audit work

Five pre-existing PRs (#6, #8, #12, #25, #34) were open and reported nonmergeable at inspection. Compare their changes with current main before considering integration; do not merge them wholesale. Multiple versioned files exist, but absence from these entry points alone does not prove safe deletion. PKSK bank Set 01–50, license, payment, database and existing PRs remain untouched.

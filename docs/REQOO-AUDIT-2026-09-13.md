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
The initial browser regression was not executed successfully because Chromium was unavailable and its download timed out; see continuation below for replacement test coverage. Live checkout, payment, database and admin authentication were not tested or modified.

## Remaining audit work

Five pre-existing PRs (#6, #8, #12, #25, #34) were open and reported nonmergeable at inspection. Compare their changes with current main before considering integration; do not merge them wholesale. Multiple versioned files exist, but absence from these entry points alone does not prove safe deletion. PKSK bank Set 01–50, license, payment, database and existing PRs remain untouched.


## Premium Shop continuation

The live Shop was inspected in Cloud Browser: hero and footer rendered, while the catalog remained empty. Customer Shop polish and reliability work now adds:

- Visible category filters and product counts, readable mobile type and 44px+ primary controls.
- Responsive cart, image choices, quote links, file validation, accessible dialog labels, focus return, Escape handling, background inert state and scroll locking.
- Cart quantity controls with aggregate stock accounting; checkout fields and receipt retained in memory for the current session (no new persistent storage of contact details).
- Server `quoteOrder` preflight shares price/promotion/shipping calculations with order creation. QR appears only after successful quote and contact validation. Server rejects a changed expected total before any receipt upload/order write.
- Integer quantity validation and aggregate duplicate-variation stock checking on the server, and caught async checkout errors returned as JSON.
- Shipping selection from existing Admin configuration. When no shipping method exists, customers are told to arrange receipt with Reqoo and check charges before payment.

Validation: routing tests, quantity/upload tests, server quote tests and jsdom DOM integration tests passed locally. DOM tests exercise product → cart → shipping quote → contact validation → receipt → success, duplicate-click prevention, draft recovery and quote-failure blocking. API/legacy API, worker and simulator syntax gates pass. Tests use fixtures and do not place production orders. Cloud Browser blocks local file previews; responsive CSS has source validation but no local rendered visual verification. Real payment, authenticated admin operations and production order fulfillment remain outside these checks.

The original browser test was replaced with runnable DOM regression coverage. CI uses jsdom 30.0.1. No new schema migrations, PKSK question content changes or legacy PR merges are included.

## Release verification

PR #35 merged as 39b540d; GitHub Shop regression and production deployment succeeded. Live browser confirmed 3 catalog products, Tumbler color variations and cart quantities, and the server-calculated RM66 total (2 × RM29 plus configured RM8 shipping). Desktop product dialog visually inspected. No real order submitted or money transferred. Final polish translates internal category labels and refreshes the runtime cache key.

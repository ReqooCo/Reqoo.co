# REQOO agent commerce v1

Public entry point: https://shop.reqoo.co/agents

Discovery: `/.well-known/reqoo-commerce.json` and optional `/llms.txt` on reqoo.co and shop.reqoo.co. These are REQOO discovery conventions, not automatic registration or certification with an AI platform.

OpenAPI: `https://shop.reqoo.co/api/commerce/openapi.json`

## Contract

- GET `/api/commerce/products?q=tumbler&maxPriceMinor=5000&limit=50&offset=0`: active catalogue with matching variants; integer MYR sen, current promotions and base-price fallback consistent with checkout. `total` counts products.
- GET `/api/commerce/products/{id}`: current variants and stock. `untracked`/null is unknown, not unlimited stock. Zero price is quote-required, not free.
- GET `/api/commerce/shipping`: active configured shipping methods. Agents must select the method applicable to the destination.
- GET `/api/commerce/policies`: explicitly identifies missing return terms, delivery time and ratings; do not invent these.
- POST `/api/commerce/quote`: `{ "items": [{ "productId": "…", "variantId": "…", "qty": 1 }], "shippingId": "…" }`. Reuses the existing server checkout calculation. Optional shipping omitted means shipping not selected, NOT free delivery. Maximum 50 items and 16 KiB body.
- Quotes never create customers, orders, bills, payments, reserve stock or increment promotion usage. Unknown client fields cannot dispatch a different action. Existing checkout schema initialization may run, as in normal Shop requests.
- Each quote item returns a customer-review URL. Customer reviews variants/customization, explicitly adds selections to cart, selects shipping, and completes existing checkout. No autonomous `book_order` or payment operation is exposed here.

## Discovery and pages

`/products` and `/products/{id}` are server-rendered from D1 and available without JavaScript. Detail pages include ProductGroup/Product/Offer JSON-LD matching visible prices. Untracked availability is omitted from schema. No fabricated ratings or merchant policies.

`/commerce-sitemap.xml` is generated from active products. Robots files advertise it. Product URLs are canonical on shop.reqoo.co. Data is no-store; quotes and price availability are revalidated at checkout.

## Security and verification

Only explicitly selected public product/variant fields are returned; no customer, private order, internal notes, cost or secrets. Parameterized SQL, escaped HTML/JSON-LD, HTTPS-only images and bounded inputs are used. New endpoints do not change existing payment authority.

Tests: `node tests/commerce.mjs` (SQLite/D1 adapter, no external calls), `node tests/commerce-handoff.cjs` (jsdom). Included in Shop regression; backend commerce test also gates production deployment.

Remaining merchant information: publish actual refund/return policy and production/delivery lead times before exposing them as definitive terms. AI/search discovery and ranking are not guaranteed. Native marketplace, MCP and platform-specific checkout enrollment are separate integrations, not claimed by this API.

# REQOO Shop V1 Consolidation Audit

Status: AUDIT IN PROGRESS
Base: main @ b57463b048cb54798a64a14341eb7fcf4911da5d

Rules: Main Admin locked. No deletion until runtime/import/deployment references are verified. Stable behavior will be consolidated into one canonical V1.

Confirmed production entrypoints: api/worker.js via api/wrangler.jsonc; _web_worker.js via wrangler-web.toml; deployment via .github/workflows/deploy.yml.

Confirmed Shop routes: /api/shop -> shop-flow-v3.js; /api/shop-admin -> shop-admin-flow-v4.js; /api/shop-media -> shop-media.js; /api/product-image -> functions/api/product-image.js; /api/invoice-v1 -> functions/api/invoice-v1.js; /api/license-v1 -> functions/api/license-v1.js.

Initial dependency findings: shop-admin-flow-v4 -> v5 -> v2 fallback chain; shop-flow-v3 -> v2 fallback for non-createOrder actions; web runtime injects shop-core-v1.js.

Initial classification: worker.js ACTIVE; _web_worker.js ACTIVE; shop/admin.html ACTIVE; shop/index.html ACTIVE; shop-core-v1.js ACTIVE; shop-flow-v3 ACTIVE; shop-flow-v2 ACTIVE INDIRECT; shop-admin-flow-v4 ACTIVE; shop-admin-flow-v5 ACTIVE INDIRECT; shop-admin-flow-v2 ACTIVE INDIRECT; shop-media ACTIVE; shop-v2 UNKNOWN until caller audit.

Next: trace every Shop-related file, frontend reference, workflow, migration, and API action before deletion or main consolidation.

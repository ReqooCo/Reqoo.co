# REQOO.CO

## PKSK V2

PKSK simulator and student dashboard now use the V2 backend exposed at `/api/pksk`.

- Single canonical PKSK API for access, device registration, progress and dashboard.
- JSON `POST` only for client/server communication.
- Maximum 3 registered devices per license.
- Server recalculates the final result from the canonical question bank before marking a set complete.
- Set 01–50 question-bank files are kept unchanged by the backend rebuild.
- Legacy PKSK API files and legacy PKSK generator/audit workflows have been removed.

The public site and shop routes remain separate from the PKSK V2 runtime.


## Runtime map

To avoid version drift, shared Admin presentation has one canonical set only:

- `admin/admin-base.css` — shared foundation/theme
- `admin/admin-flow.css` — final hierarchy/contrast layer
- `admin/admin-shell.js` — desktop/mobile Admin navigation
- `_web_worker.js` — production web router/injector
- `functions/_middleware.js` — Cloudflare Pages preview compatibility layer; keep its Admin asset references aligned with `_web_worker.js`

Numbered `api/shop-flow-v*.js` and `api/shop-admin-flow-v*.js` files are an intentional compatibility chain. Their imports are checked by `tests/api-version-chain.mjs`; do not remove a version without flattening the chain first.

# Billplz setup

The REQOO backend now has a Billplz V4 adapter at `functions/api/billplz.js`.

Required Cloudflare secrets/variables:
- `BILLPLZ_API_KEY` — secret
- `BILLPLZ_X_SIGNATURE_KEY` — secret
- `BILLPLZ_COLLECTION_ID` — variable (can also be kept secret)
- `BILLPLZ_ENV` — `sandbox` during testing, `production` for live

Do not put API keys or X Signature keys in GitHub, frontend JavaScript, or chat messages.

The adapter uses Billplz V4 `/bills`, Basic authentication with the API key, a backend `callback_url`, and HMAC-SHA256 X Signature verification. The callback is the authoritative backend payment signal; the browser redirect is only for customer UX.

Reference: https://support.billplz.com/api

## Live production rollout (REQOO Shop)

The merchant confirmed the Billplz account is **live**. In the Cloudflare deployment that actually serves `shop.reqoo.co/api/shop`, set `BILLPLZ_ENV=production` (plain variable). Do not assume secrets configured on `reqoo-catalog-api` are automatically available to another Worker or Pages deployment.

The existing `BILLPLZ_SECRET_KEY` is accepted as an alias for `BILLPLZ_API_KEY`. Verify the exact names of `BILLPLZ_COLLECTION_ID` and `BILLPLZ_X_SIGNATURE_KEY` in the runtime without exposing their values.

**Do not merge or deploy without validation:** verify deployment routing and D1 bindings, create a controlled live bill, confirm the signed callback updates the matching payment and order once, test cancelled/unpaid redirects and repeated callbacks, and reconcile the Billplz transaction in the merchant dashboard. Never treat a browser redirect alone as proof of payment. Use a low-value real transaction only with merchant approval.

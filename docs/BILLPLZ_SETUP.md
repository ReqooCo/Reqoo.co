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

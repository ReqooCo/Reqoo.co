# REQOO.CO — Current Rebuild Architecture

## Runtime

- Static frontend: GitHub Pages / custom domains.
- API runtime: Cloudflare Worker `api/public-gateway.js`.
- Database: Cloudflare D1 `reqoo-rebuild`.
- Media: Cloudflare R2 `reqoo-media`.
- Admin authentication: HttpOnly HMAC session cookie (`reqoo_admin_session`).

## Main flows

### Customer Shop

`Shop → Product → Cart → Checkout → Order → Payment → Confirmation`

The browser cart is only a temporary UI state. At checkout the API re-reads active products from D1 and validates variation, add-on and required custom fields before calculating the authoritative order total.

### Custom Sales

`Custom Studio → custom_requests → Admin Requests → Selling Calculator → Quotation → Customer Acceptance → Order`

### Payment

- Billplz: order → payment link → Billplz callback → paid.
- QR: customer marks paid → pending verification → Admin verifies → paid.

### Production

`Paid → Processing → QC → Ready → Shipped → Completed`

Shipping is finalized before payment for orders that require an additional shipping amount. Fulfilment updates are admin-only.

### PKSK

The PKSK simulator data under `sim/pksk/simulator/sets/` is treated as locked content. The Admin PKSK module manages operational license/device/verification data separately.

## Security boundary

Public endpoints are limited to customer-facing operations such as published catalog reads, custom request submission, order lookup by explicit order ID, shared quotation viewing/acceptance, and payment actions that do not require admin privileges. Protected Admin endpoints require the HttpOnly session; the gateway may translate a valid session into the server-side `ADMIN_KEY` header for core modules.

The `ADMIN_KEY` must remain a Cloudflare Worker Secret and must never be embedded in frontend JavaScript, localStorage, or sessionStorage.

## Cleanup rule

Only files actually imported by the current gateway/frontend flows should remain in the active runtime. Obsolete duplicate checkout/order helpers have been removed rather than left as alternate implementations that could diverge from the authoritative server pricing logic.

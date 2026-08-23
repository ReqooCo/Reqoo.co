# REQOO.CO

REQOO.CO clean rebuild for the customer shop and internal sales/production workflow.

## Current runtime

`GitHub Pages frontends → Cloudflare Worker gateway → D1 + R2`

- Worker entry: `api/public-gateway.js`
- D1: `reqoo-rebuild`
- R2: `reqoo-media`
- Admin auth: HttpOnly `reqoo_admin_session`, scoped to `.reqoo.co` so Admin pages can call `api.reqoo.co`
- Product source of truth: Catalog API / D1
- Product media: R2
- Customer order pages: bearer-style `public_token`; raw order IDs alone do not expose customer data
- Custom request uploads: private behind Admin session

## Main customer flow

`Home → Shop → Product → Cart → Checkout → Order → Payment`

Custom sales flow:

`Custom Studio → Request → Admin Calculator → Quotation → Acceptance → Order`

Main Admin flow:

`Admin → Shop → Requests → Calculator → Quotation → Orders → Payment → Fulfilment`

## Pricing

Checkout is server-authoritative. The API re-reads active products from D1 and validates variation, add-on and required custom fields before calculating the order total. Browser/localStorage prices are never trusted as the final amount.

Variation values are full unit prices; add-ons are added to the selected variation/base price. The customer product page and server use the same option metadata contract.

## Database

The D1 schema is versioned under `api/migrations/`.

Apply migrations with Wrangler before deployment. Current production sequence:

1. `001_production_schema.sql` — baseline tables
2. `002_checkout_fields.sql` — shipping address and order note
3. `003_quotation_order_link.sql` — quotation/order idempotency link
4. `004_checkout_idempotency.sql` — checkout retry protection
5. `005_core_schema_repair.sql` — shipping finalization and secure customer order token

## Security boundaries

- Admin-only API operations are gated by the HttpOnly Admin session at the gateway.
- Customer order detail requires the per-order public token.
- Customer QR payment marking requires the same order token; only Admin can verify payment.
- Custom uploaded files are private and require an Admin session.
- Product images remain public because they are customer-facing shop media.

## Locked content

PKSK Set 01–50 remains preserved under `sim/pksk/simulator/sets/` and is not rewritten by the shop rebuild.

## Validation

GitHub Actions validates JavaScript syntax and the required production file structure on pushes and pull requests.

## Cleanup

Duplicate legacy checkout/order helpers and the old duplicate Product Builder have been removed so there is one active implementation for each flow.

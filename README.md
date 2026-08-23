# REQOO.CO

REQOO.CO clean rebuild for the customer shop and internal sales/production workflow.

## Current runtime

`GitHub Pages frontends → Cloudflare Worker gateway → D1 + R2`

- Worker entry: `api/public-gateway.js`
- D1: `reqoo-rebuild`
- R2: `reqoo-media`
- Admin auth: HttpOnly `reqoo_admin_session`
- Product source of truth: Catalog API / D1
- Product media: R2

## Main customer flow

`Home → Shop → Product → Cart → Checkout → Order → Payment`

Custom sales flow:

`Custom Studio → Request → Admin Calculator → Quotation → Acceptance → Order`

## Main Admin flow

`Admin → Shop → Requests → Calculator → Quotation → Orders → Payment → Fulfilment`

## Pricing

Checkout is server-authoritative. The API re-reads active products from D1 and validates variation, add-on and required custom fields before calculating the order total. Browser/localStorage prices are never trusted as the final amount.

## Database

The D1 schema is versioned under `api/migrations/`.

For a new database, apply the migrations with Wrangler before deployment. The production baseline includes the core customer, product, order, payment, quotation and PKSK operational tables. Later migrations add checkout fields, quotation conversion idempotency, and checkout idempotency.

## Locked content

PKSK Set 01–50 remains preserved under `sim/pksk/simulator/sets/` and is not rewritten by the shop rebuild.

## Cleanup

Duplicate legacy checkout/order helpers and the old duplicate Product Builder have been removed so there is one active implementation for each flow.

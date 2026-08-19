# REQOO V1 — CORE API CONTRACT

Endpoint: `/api/core`

## Public actions
- `GET ?action=health`
- `GET ?action=listProducts`
- `GET ?action=getProduct&id=<id>` (slug/sku also accepted)
- `POST ?action=createCustomer` with JSON `{name, phone?, email?, source?}`
- `GET ?action=getCustomer&id=<id>` (phone/email also accepted)

## Admin actions
Admin actions require the `X-Reqoo-Admin-Token` request header. The secret is `REQOO_ADMIN_TOKEN` in the runtime environment. Never send the admin token in a URL query string.

- `POST ?action=createProduct`
- `PATCH ?action=updateProduct&id=<id>`
- `GET ?action=listCustomers`
- `GET ?action=listActivity`
- `GET ?action=listErrors`

## Product create/update payload
A product can include:
- basic information
- base/sale price
- images
- variations
- dynamic custom fields
- add-ons
- production instructions
- internal notes
- SEO fields

Custom field types are defined by the V1 data model and are not hard-coded to three fields.

## Observability
Every request receives/accepts `X-Trace-Id`. The response echoes it. Unexpected errors are written to `error_events`; meaningful business events are written to `activity_events`; privileged mutations are written to `admin_audit_events`.

## Security rules
- Public product reads expose only active products.
- Admin mutations require a server-side secret header.
- Do not expose internal cost, margin, admin audit data, or pricing rules through public product endpoints.
- Do not put secrets in source code.

## Implementation rule
This endpoint is the first Core foundation only. Existing legacy APIs are not redirected to it yet. Migration happens after Core smoke tests and schema validation pass.

# Product Catalog — current rebuild

The Product module has one source of truth: the Catalog API backed by D1. Admin manages products; Shop reads only published (`active`) products.

## Current product shape

```json
{
  "id": "server-generated",
  "name": "Signature Plaque",
  "slug": "signature-plaque",
  "description": "…",
  "short_description": "…",
  "base_price_minor": 5000,
  "sale_price_minor": null,
  "currency": "MYR",
  "product_type": "physical",
  "fulfillment_type": "physical_shipping",
  "status": "active",
  "internal_notes": "__REQOO_PRODUCT_V2__:…",
  "images": ["https://api.reqoo.co/media/products/…"],
  "published": true
}
```

## API contract

- `GET /products?published=true` — public Shop catalog.
- `GET /products` — Admin catalog (HttpOnly Admin Session required).
- `GET /products/:id` — public product detail.
- `POST /products` — Admin create.
- `PUT /products/:id` — Admin update.
- `DELETE /products/:id` — Admin archive.
- `POST /media/upload` — Admin product-image upload to R2.

## Authentication

Admin pages use the HttpOnly `reqoo_admin_session` cookie. The browser does not store or send the `ADMIN_KEY`; the public gateway validates the session and only then injects the server-side key when calling protected legacy/core handlers.

## Product options

Variation, add-on and custom fields are stored in the `internal_notes` product metadata envelope using `__REQOO_PRODUCT_V2__:`. The browser may display a calculated price, but checkout always re-reads the product and validates options server-side before creating the order.

## Storage

Product images are stored in R2 and referenced by the Catalog API. The Shop and Admin frontends therefore share the same persisted catalog and media URLs across origins.

# Product Catalog — clean rebuild

The Product module has one source of truth: the Catalog API. Admin manages products; Shop reads only published products.

## Product shape

```json
{
  "id": "server-generated",
  "name": "Signature Plaque",
  "slug": "signature-plaque",
  "description": "…",
  "price": 50,
  "images": ["https://…/image.jpg"],
  "published": false,
  "sort": 0
}
```

## API contract

- `GET /products` — all products for Admin.
- `GET /products?published=true` — published products for Shop.
- `POST /products` — create.
- `PUT /products/:id` — update.
- `DELETE /products/:id` — delete.

The static GitHub Pages frontends do not use localStorage as the source of truth because `admin.reqoo.co` and `shop.reqoo.co` are different origins. The shared API must therefore provide persistence across both sites.

Image management in this first clean slice uses image URLs. A later storage/upload endpoint can replace the URL input without changing the product contract.

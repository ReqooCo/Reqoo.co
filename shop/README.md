# REQOO SHOP

Target public host: `https://shop.reqoo.co/`

## Migration
The existing `/shop/` customer experience remains during migration. New backend work uses `/functions/api/shop.js` and the shared `platform_orders` model.

## Order contract
`POST /api/shop` with JSON:

```json
{
  "action":"createOrder",
  "productType":"SHOP",
  "customerName":"Customer",
  "phone":"60123456789",
  "email":"customer@example.com",
  "amount":199,
  "referralCode":"REF-ABC",
  "items":[{"sku":"PLAQUE-01","name":"Plaque","qty":1,"unitPrice":199}]
}
```

The API creates a server-side order reference. Payment is intentionally separated from order creation; Billplz will be attached after the order is persisted.

## Rules
- Never trust a frontend payment-success flag.
- Recalculate totals server-side when product catalog is migrated.
- Keep uploaded artwork out of D1; use R2/object storage.
- Preserve legacy `/shop/` until the new hostname is verified.

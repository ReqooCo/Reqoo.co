# REQOO V1 — ORDER CREATION CONTRACT

## Rule
The browser cart is only a draft. It is never the source of truth for price, product state, variation state, stock, customization pricing, or fulfillment.

## Server-side order creation
1. Receive customer identity and cart item IDs.
2. Validate product is ACTIVE and purchasable.
3. Validate variation belongs to the product and is active.
4. Validate required custom fields and conditional fields.
5. Validate add-ons belong to the product and are active.
6. Recalculate unit prices and adjustments from the current product definition.
7. Validate stock where stock tracking is enabled.
8. Calculate subtotal, discounts, shipping, tax and total on the server.
9. Create/update customer.
10. Create order with source/channel.
11. Create immutable order-item snapshots containing product, variation, customization, add-ons and calculated prices.
12. Reserve or decrement stock according to the inventory policy.
13. Create fulfillment records from product fulfillment type.
14. Return the canonical Order ID and totals.

## Historical integrity
After order creation, later product edits cannot change order item snapshots, prices, or issued documents.

## Payment boundary
Order creation does not mean payment succeeded. Payment is a separate state transition. A referral commission and licensed entitlement must not become final until payment is confirmed by the trusted payment layer.

## Idempotency
Every checkout submission must carry an idempotency key. Retrying the same key must return the original order result rather than create a duplicate order.

## Security
- Never trust client-submitted prices.
- Never trust client-submitted product names/SKUs for financial records.
- Validate customer-controlled text and uploaded files.
- Do not expose internal cost, margin, pricing rules or admin notes.

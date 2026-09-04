# REQOO REBUILD V1 — LOCKED BASELINE

## Purpose
Rebuild Reqoo as a clean platform core instead of continuing the legacy patch/compatibility architecture.

## Product surfaces
- `reqoo.co` — public landing/site
- `shop.reqoo.co` — commerce
- `play.reqoo.co` — games / learning experiences
- `sim.reqoo.co` — simulator platform
- `pksk.sim.reqoo.co` — PKSK simulator
- `admin.reqoo.co` — central control center

## Core domains
1. Customer
2. Product
3. Order
4. Payment
5. Fulfillment
6. Documents
7. License / device access
8. Referral
9. Activity / error / trace logging
10. Admin / audit

## Commerce rule
Shop and direct product landing pages use the same Order + Payment + Fulfillment core. A product's fulfillment type determines what happens after payment.

Supported fulfillment concepts:
- physical shipping
- digital delivery
- licensed access
- play access
- service/custom job

## Referral rule
One Reqoo referral system serves Shop, SIM and PLAY. Referral attribution attaches to the customer journey/order, not to a separate product-specific referral implementation. Commission is created only after payment is confirmed and supports pending/approved/payable/paid/reversed states.

## Document engine
One document engine supports:
- Quotation (`QT-*`)
- Invoice (`INV-*`)
- Receipt (`RC-*`)
- Credit Note / Refund (`CN-*`)

A receipt is one document type; deposit/partial/final/full are payment classifications. One invoice may have multiple receipts. Issued documents are immutable; corrections use new documents/adjustments.

## Shop product builder
Products start empty and are created by Admin.

Product supports:
- basic information
- SKU/category/tags/status
- main image + gallery + variation images
- base/sale pricing
- variations with SKU/price/stock/image
- dynamic custom fields
- add-ons with optional price impact
- customer text/textarea/number/date/time/dropdown/radio/checkbox/color/file/image inputs
- inventory
- shipping dimensions/weight
- fulfillment type
- production instructions/internal notes
- SEO fields

Orders store a snapshot of product, variation, customization, pricing and add-ons at purchase time so later product edits do not alter historical orders.

## Internal pricing tools
Internal-only tools determine selling prices for custom manufacturing work. They do not directly sell products.

### Laser Cut Pricing Engine
Must support configurable material, thickness/size, quantity, cut length/time, engraving, machine rate, electricity, labour, setup, wastage, finishing, packaging and pricing rules.

Output:
- estimated cost
- minimum price
- recommended selling price
- target selling price
- admin-selected final selling price
- margin/profit visibility for Admin only

### 3D Print Pricing Engine
Must support configurable filament/material cost, weight, print time, machine rate, electricity, support/wastage, labour, post-processing, packaging and pricing rules.

Same outputs as Laser Pricing Engine.

Both calculators can:
- save calculation
- add result directly to Quotation
- save a recurring job as a Shop Product later

Internal cost must never be exposed to customers in quotation/invoice/receipt output.

## License and support control
Central Admin Control Center must allow authorized staff to:
- view customer licenses
- view device bindings
- activate/suspend/revoke/extend access
- reset device bindings without deleting the license
- reset/reissue access when support requires it
- inspect user activity
- inspect errors
- trace requests using Trace IDs
- view admin action audit trail

Admin actions affecting payment, license, order, referral, refund or access must be auditable.

## Logging
Separate:
- user activity log
- system error log
- request trace log
- admin audit log

Log meaningful events, not noisy UI telemetry.

## Change-management rule
No random production patches.

Every future feature follows:
1. Request
2. Design
3. Impact check
4. Build
5. Test
6. Release

Database changes use versioned migrations. API contracts are explicit. Risky releases use staging/feature flags where appropriate. Legacy compatibility layers must have an explicit reason and removal plan.

## Rebuild rule
Do not carry forward legacy `v2/v56/fix/final/overlay` runtime duplication as the new architecture. Existing code is treated as migration/reference material and is classified as KEEP, MIGRATE, REWRITE or DELETE before adoption.

## Initial product catalog
Shop starts empty. Admin will create products after the new product builder is ready.

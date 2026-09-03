# REQOO REBUILD V1 — CORE ARCHITECTURE

## Status
FOUNDATION DESIGN — implementation starts on `rebuild/v1-foundation`.

## Core rule
Shop, direct product landing pages, PLAY and SIM use shared Reqoo core services. Product-specific UI must not create duplicate order, payment, referral, license or document systems.

## Core domains
- Customer
- Product
- Order
- Payment
- Fulfillment
- Documents
- License / Device
- Referral
- Activity / Error / Trace
- Admin / Audit
- Pricing Engines

## Product model
Every product has a fulfillment type:
- PHYSICAL
- DIGITAL
- LICENSED
- PLAY_ACCESS
- SERVICE

Shop starts empty. Admin creates products through Product Builder.

## Custom product model
Products support dynamic custom fields rather than hard-coded columns. Field types include text, textarea, number, date, time, dropdown, radio, checkbox, color, image and file. Fields may be required, conditional and/or have a price adjustment.

## Historical integrity
At checkout, the order stores immutable snapshots of product identity, variation, customization, add-ons and pricing. Later product edits never rewrite historical orders or issued documents.

## Commerce flow
ENTRY (Shop or direct landing) -> PRODUCT -> CHECKOUT -> ORDER -> PAYMENT -> CONFIRMED -> FULFILLMENT -> DOCUMENTS / ACCESS.

## Documents
Quotation -> Invoice -> Payment(s) -> Receipt(s). One invoice may have multiple receipts. Deposit/partial/final/full describe payments; they are not separate receipt engines. Issued documents are immutable. Refunds/corrections create adjustment documents.

## Referral
Referral attribution is captured on the customer journey/order and resolved by the shared Referral service. Commission is created only after confirmed payment. Commission states: pending, approved, payable, paid, reversed. Product-specific referral implementations are prohibited.

## License support
License records are independent from orders after issuance but retain the order/product relationship. Device bindings can be reset without deleting the license. Admin actions are audited.

## Observability
Use four distinct records/concepts:
1. Activity — meaningful user/business events.
2. Error — failures requiring diagnosis.
3. Trace — request correlation across services.
4. Admin audit — privileged changes/actions.

No noisy telemetry unless explicitly required.

## Pricing engines
### Laser
Calculates cost and selling price using configurable material, size/thickness, quantity, cut/engraving time or length, machine rate, electricity, labour, setup, wastage, finishing, packaging and pricing rules.

### 3D Print
Calculates cost and selling price using configurable material/filament, weight, print time, machine rate, electricity, support/wastage, labour, post-processing, packaging and pricing rules.

Both engines return:
- estimated cost
- minimum price
- recommended selling price
- target price
- final admin-selected selling price
- admin-only margin/profit

Both can save a calculation and add the selected selling price directly to a quotation. They may optionally save a recurring job as a Shop Product.

## Change discipline
No direct production patching. New work follows Request -> Design -> Impact Check -> Build -> Test -> Release. Database changes use versioned migrations. API contracts are explicit. Legacy compatibility is temporary and must have a removal plan.

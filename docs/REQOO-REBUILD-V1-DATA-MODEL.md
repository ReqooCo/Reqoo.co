# REQOO REBUILD V1 — DATA MODEL CONTRACT

## Purpose
Define the ownership boundaries before implementation so features do not create duplicate tables or competing sources of truth.

## Core entities
### customers
Identity and contact record for a Reqoo customer.

### products
Canonical catalog definition. Admin-owned.

### product_variations
Variation combinations and variation-level pricing/stock/media.

### product_custom_fields
Dynamic customer customization definitions attached to products.

### product_addons
Optional additions and price adjustments.

### orders
Commercial transaction. Stores source/channel, customer, totals, payment state and immutable purchase snapshots.

### order_items
Line items with immutable product/variation/customization/add-on/pricing snapshots.

### payments
Individual payment attempts/transactions linked to an order. Provider-neutral core with provider-specific metadata.

### fulfillments
What happens after confirmed payment: shipping, digital delivery, license, play access or service/custom job.

### documents
Canonical document header/type/number/status. Types: quotation, invoice, receipt, credit note.

### document_items
Immutable issued line snapshots.

### payment_allocations
Links payments to invoices/orders so partial and multiple payments reconcile correctly.

### licenses
Digital access entitlement tied to customer, product and originating order.

### license_devices
Device bindings and lifecycle state.

### referrals
Referral agent/owner identity and code.

### referral_attributions
Which order/customer journey received a referral attribution.

### referral_commissions
Financial commission ledger with state transitions and immutable source references.

### activity_events
Meaningful user/business events.

### error_events
Application/system failures.

### trace_events
Request correlation data; Trace ID is the primary correlation key.

### admin_audit_events
Privileged/admin actions, actor, target, reason and before/after metadata where appropriate.

### pricing_materials
Admin-managed material prices for internal calculators.

### pricing_machines
Admin-managed machine profiles and hourly/rate assumptions.

### pricing_rules
Admin-managed pricing formula inputs and rule versions.

### pricing_calculations
Saved internal calculator runs, inputs, outputs and rule version used.

## Ownership rules
- Customer identity is stored once.
- Product identity is stored once.
- Order is the source of truth for what was purchased.
- Payment is the source of truth for money received from a provider.
- Documents are immutable issued records; they do not overwrite order history.
- License is the source of truth for access entitlement.
- Referral commission is derived from confirmed payment and stored as its own auditable ledger.
- Pricing calculations are internal and never expose cost/margin to customers.

## Invariants
1. A paid order cannot be silently changed to alter historical pricing.
2. A receipt cannot exist without an attributable payment/allocation.
3. A partial payment reduces invoice balance but does not create a second invoice.
4. Refund/correction does not mutate an issued receipt; it creates an adjustment document/transaction.
5. Product edits never rewrite order snapshots.
6. License reset does not delete the originating order or payment.
7. Referral commission cannot become payable before confirmed payment.
8. Admin changes to license, payment, order, referral, refund or access are auditable.
9. Database schema changes are versioned migrations.

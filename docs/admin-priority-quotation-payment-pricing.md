# Reqoo Admin — Priority: quotation, invoice, receipt, deposit and pricing

Owner interview, 2026-10-28: Primary operator is confused where to record deposit and subsequent payments, where to find invoice/receipt, and what selling price to quote. This outranks new accounting modules and visual embellishments.

## One-order interaction
- Search customer or open order. Show customer, items, total, amount received, balance and one contextual primary action. No separate document menu needed for normal work.
- New quotation -> send -> revise with version history -> customer accepts -> convert existing record to order -> invoice on demand according to business process -> receive deposit/part/full payment -> receipt generated for each confirmed payment -> final handoff. Payment and work statuses independent. Existing payment ledger and document APIs are authoritative; never fabricate or duplicate receipts.
- Payment modal: default amount is remaining balance or suggested deposit (clearly editable); show old paid, new amount, new balance before confirmation. Payment type should be derived from amount and prior payments where possible, not force user to understand deposit vs partial vs final. Prevent overpayment, duplicates, double-click retries; include optional bank reference; show linked receipt immediately after success. Do not pre-record a payment just because user clicked invoice.
- Order view: one **Bayaran & Resit** section with payment timeline, each receipt, and clear 'Rekod Bayaran' action. Show invoice and quote under 'Dokumen' with share/print actions. Search by customer/phone/order no. Automatically generated IDs, no manual reference typing.

## Price assistant (decision support, never automatic price overwrite)
- Existing product price list remains the default. For custom quotes, show cost breakdown: actual or estimated materials (stock unit cost), labour hours × owner-set rate, packaging, shipping, outsourced costs, machine usage/overhead allocation, payment fees and expected waste.
- Show minimum break-even price, owner-configured target margin, suggested price and resulting gross margin. Formula suggested price = estimated fully-loaded cost / (1 - target margin), with appropriate fee handling. Mark estimate incomplete if a cost is missing; don't silently treat missing costs as zero. Differentiate margin from markup.
- Offer simple user-facing choices 'Harga biasa', 'Harga kuantiti', 'Harga khas' with owner-approved floors and optional explanation. Discount requires preview of margin and owner approval below floor. Final price always chosen/confirmed by operator.
- Quantity tiers should account for setup cost amortization and marginal cost; don't assume 10 units cost 10x a single custom unit. Show previous prices for similar products with dates but no automated race-to-bottom.
- Keep tax/SST/e-Invoice treatment separate from quoted price; no assumption business is SST registered.

## Specific code audit
- admin/documents-payment-v1.js already has a payment modal, total/paid/balance, payment type, method, date, optional reference and notes. Improve this existing flow rather than create another payment subsystem.
- admin/documents.html has a combined order/document workspace and settings but mixed language and long page. Progressive disclosure should preserve its IDs and listeners.
- admin/products.html currently has an editable product catalog and pricing fields. Price assistant must reuse canonical product data, not create a second inconsistent price catalog.

## Release acceptance
1. Operator records a RM1000 deposit on RM2300 invoice; balance RM1300 and receipt RM1000 appear, not a new invoice.
2. Operator records RM500 later; balance RM800 and second receipt RM500, both under same order.
3. Operator finds both receipts by customer name/phone without knowing reference number.
4. Operator revises quotation without losing old version; conversion remains idempotent.
5. Product base price and custom suggested price can be distinguished; margin is calculated from costs, not simply arbitrary markup; no costs -> explicit 'Belum cukup data'.
6. Test with primary operator on real iPhone, interrupted flow, zoom, Malay/English modes and poor connection before deployment.

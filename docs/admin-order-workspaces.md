# One workspace per order

The primary Documents list now shows one entry per order instead of separate quotation, invoice, receipt and delivery rows. Existing document-type and payment filters remain available through the secondary “Semua dokumen” view. Monthly charts and the premium palette are preserved.

Opening an entry shows its customer, total, paid amount and balance, followed by tabs for Ringkasan, Quotation, Invoice, Resit and Delivery order. Preview and receipt dialogs open over the same workspace so closing them returns to that order. Summary retains the chronological activity timeline. Orders deep links open the exact workspace; custom quotation conversion opens the resulting order context.

## Grouping and source rules

`documentWorkspaces` aggregates and paginates server-side by the exact `order_id`, including orders with no documents and standalone `custom:` quotations. It never merges records by customer name or phone. A search for any linked document/receipt number returns the entire matching workspace. Canonical payment receipts replace colliding legacy receipt counts. Total prefers invoice value, then quotation value, then order value; confirmed payments are summed once. Existing paid-order fallback is retained for legacy records.

`documentFlow` also accepts an order ID or reference, including an order that has no documents yet. Existing document-ID/number and receipt lookup behavior is preserved.

`createOrderQuotation` is authenticated and POST-only. It reuses the existing document snapshot generator to create/reuse a quotation from the existing order's customer, items and prices, with a 50% deposit term. It does not edit the order or create another order. Repeating the action returns the same quotation. The existing custom quotation builder and conversion flow remain available; conversion links its documents to the real order ID.

Missing invoice and delivery-order tabs offer the existing generation actions. A missing receipt explains that a receipt follows a recorded payment, rather than creating an unsupported receipt. Existing order quotation snapshots use order prices; editing an already-linked quotation independently of the order is not introduced here.

## Validation

- All 56 offline `.mjs` suites pass, including D1-compatible in-memory tests for server-side grouping/paging beyond 150 documents, lookup through receipt number, same-customer separation, empty orders, 50% deposit inheritance, quotation retry and authenticated POST requirements.
- Browser fixture tests pass for the default grouped list, search, document tabs, receipt/preview context retention, order-first quotation generation, Orders deep links, desktop/mobile layout and the existing chart/payment/print/race regressions.
- No migration, gateway configuration change, production record mutation, merge or deployment is included in this change.

Previews use synthetic records. Review the new workspace behavior before deploying.

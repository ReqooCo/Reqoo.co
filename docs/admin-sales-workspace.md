# Admin sales workspace

Navigation: Ringkasan, Quotation, Pesanan, Kewangan, Urus. PKSK is removed from this navigation; existing simulator data is untouched.

Quotation acceptance converts to one order. Converted quotations remain in that order’s document history. Manual and web orders share the same workspace, payment ledger and work actions. Money totals lead the drawer; secondary explanations use expandable information controls.

Work states: Baharu → Sedang dibuat → Siap → Diserah. Payment states are independent: Belum bayar / Bayaran separa / Lunas. Selesai requires a handoff and zero balance. Receipts represent recorded payments, including deposits. An owner can explicitly start work without payment. Archiving must not hide outstanding debt. Retried payment submissions retain an idempotency key.

Deployment requires migration 0012_order_handoffs.sql before the API update. The existing main deployment workflow applies migrations automatically. This branch has not deployed to production.

Validation: twelve API/structure regression suites passed, plus the overdue suite. A Playwright test with the actual worker handlers and isolated SQLite database covers quotation conversion, deposit receipt, work, unpaid handoff, final payment and completion, mobile width and accessible help. No customer data or live payments were used. Browser validation uses Chromium 133 locally; the workflow runs its installed Chromium.

Existing staff permissions remain enforced. Production staff continue using their restricted production view. Existing document and payment APIs remain the source of truth; this is order and collection management, not a full accounting package.

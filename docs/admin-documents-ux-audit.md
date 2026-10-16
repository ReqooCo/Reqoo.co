# Documents workspace audit and review notes

Date: 16 October 2026. Base: `dfde64139cdedcb4a1cb2f73584ad75b81b8ff84`.
Branch: `refactor/admin-documents-ux`.

## Findings and structure

No AGENTS.md was found in the repository or the provided workspace parent.
The original Documents HTML referenced eight page stylesheets and six scripts, with an additional shared paper stylesheet imported by CSS. Page styling was spread across a base stylesheet, ledger, palette, unified list, payment, drawer and overdue overrides. The scripts communicate through DOM observers and `rq:documents-*` events.

The original first request loaded only 150 document headers. Type counts were reconstructed from rendered rows, while search filtered row text. This could omit historical quotations and delivery orders and misrepresent totals. The Finance endpoint already had global invoice aggregates and paginated invoice/payment queries. Several document contract tests pinned obsolete cache versions, and two incorrectly prohibited the exact-order payment summary needed when correcting a paid invoice.

The revised hierarchy is: global quotation and invoice counts, outstanding balance and paid invoice count; one document list with server search, type tabs and payment filters; an on-demand quotation builder; an on-demand order source panel; document preview and linked document/payment detail drawer. Finance remains linked for detailed financial records. The company form remains collapsed in Documents: Settings currently owns security and storefront appearance, not document snapshots. Moving its ownership is deferred rather than introducing a second editor for the same settings.

The design uses concise forms, restrained visual hierarchy, an explicit quotation-to-delivery sequence, linked document/payment detail and visible total/paid/balance information. These are implementation principles from the requested references, not claims of feature parity with those products.

## Integration boundaries

- Orders: `ordersDashboard`, exact order deep links, `createDocument`, and quotation conversion remain intact. Retrying conversion reuses the order.
- Production: order/payment/fulfillment status ownership is unchanged. Delivery orders still use the existing API.
- Finance: `documentsFinanceDashboard` supplies global invoice/payment aggregates. The existing record/correct payment APIs, receipt renderer and payment timeline are preserved; correction moves to the row's secondary menu.
- Customers: quotation conversion still resolves or creates customers through the existing backend. Customer record/deep links are unchanged.
- API/D1: `listDocuments` now adds bounded `q`, `type`, `offset`, `total`, `hasMore` and global type stats. Existing document header fields, including sharing metadata, remain available. Canonical payment receipts join the same paginated/searchable list with `payment_id`; colliding legacy receipts are excluded before pagination. SQL values remain bound parameters. No schema migration or production data operation is included.
- Access: existing middleware/session flow remains unchanged; unauthenticated document and payment actions return 401 in local API tests.

## Implementation notes

The HTML now has one generated workspace stylesheet plus the shared imported A4 template. `scripts/build-documents-workspace.mjs` builds it deterministically from the existing shared/compatibility sources and the scoped workspace rules; `--check` verifies freshness in CI. This reduces page asset requests and establishes one build entry, but does not pretend the legacy cascade or six event-based JS modules have been completely removed. They remain to preserve payment, public document and print compatibility.

The primary row action is preview/review or payment recording when an invoice has a balance. WhatsApp and payment correction remain secondary actions. Builder fields retain existing IDs and API payloads, gain associated labels and clearer sections, and default to a 50% deposit. Dialogs receive keyboard focus containment, Escape handling and focus restoration. Long A4 documents can fragment naturally, with repeating table headers and rows kept together.

## Validation

All tests use fixtures or in-memory SQLite through a D1-compatible adapter. No live transaction, token, gateway configuration, merge or deployment was used.

- Six Documents `.mjs` suites pass, including a new actual workflow test: quotation, Admin-recorded customer approval, order conversion/retry, full-value invoice, 50% deposit, partial/final payment, unique official receipts, delivery order, historical search, global counts, pagination, bound malicious search text and access denial.
- Documents browser suite passes in Chrome at desktop 1440px and mobile 390px, using the real Admin shell/styles and intercepted requests. Covers lazy Orders/settings loading, all-record/order-reference search, pagination, type filters, quotation arithmetic, 50% default, payment modal, loading/empty/error recovery and WhatsApp URL generation without sending.
- A 50-item fixture prints to three A4 PDF pages. Text extraction confirms all 50 items; page dimensions are approximately 596×843 PDF points.
- The broader `.mjs` run has 51 passes out of 57 after the public-sharing compatibility repair, including Orders/Documents scalability, Finance, Customers, Production, payment-ledger consistency and the Shop/ToyyibPay transaction integration test. The latter uses simulated requests, not a gateway transaction.
- Six unrelated failures reproduce on the original base: `admin-asset-integrity`, `api-version-chain`, and `storefront-asset-integrity` use URL pathname handling that fails on Windows; `admin-orders-v1` and `admin-product-options-simple` expect obsolete UI text; `storefront-sales-flow` expects an older cache-version contract.
- The separate existing jsdom fast-load test could not run locally because jsdom is absent and local package installation failed with EPERM. Equivalent first-paint behavior passes in Chrome; the dedicated CI workflow installs jsdom and runs the existing test.
- Syntax checks, deterministic stylesheet check and diff whitespace check pass. CI results are not claimed until GitHub runs them.

## Review limits

Customer approval is recorded by Admin using the existing quotation-status API; no new public approval portal is introduced. Native phone hardware, physical printers, live WhatsApp delivery and production D1 are not tested. Settings ownership, complete legacy CSS/JS removal and a single mixed chronological order/payment activity feed remain follow-up refactors; the existing linked document flow and payment timeline are preserved.

Review the generated stylesheet together with its sources. Do not merge to main or deploy without the owner's approval.

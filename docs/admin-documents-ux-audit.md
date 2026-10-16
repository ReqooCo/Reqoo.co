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

Customer approval is recorded by Admin using the existing quotation-status API; no new public approval portal is introduced. Native phone hardware, physical printers, live WhatsApp delivery and production D1 are not tested. Settings ownership and complete legacy CSS/JS removal remain follow-up refactors.

## Follow-up: chronological activity and one receipt list

The drawer now combines document issue dates, the order creation date and confirmed payment dates into one chronological activity timeline. Each event links to the existing document, order or receipt view. A legacy receipt with the same number as a confirmed payment is omitted from the activity feed to avoid presenting the payment twice. No approval or production milestones are invented from the current status.

The payment module no longer injects a second list of receipt rows or maintains separate receipt pagination. The canonical document list owns all receipt search and paging. Redundant search-triggered finance calls were removed; finance refreshes follow the published document snapshot. Outdated finance responses are discarded and a refresh is queued against the latest list. Drawer responses are invalidated when another document is selected or the drawer closes.

The six pre-existing regression failures described above have since been repaired through test-only changes, and all 56 offline `.mjs` suites now pass. The previous follow-up CI run passed Documents, Shop and Production smoke. The new browser coverage checks chronological event ordering, duplicate receipt suppression, receipt opening, mobile layout, competing drawer responses and stale finance snapshots. Live production smoke remains a CI check rather than a local transaction test.

Review the generated stylesheet together with its sources. Do not merge to main or deploy without the owner's approval.

## Desktop monthly charts

The Documents workspace now includes a desktop-only annual view (1100px and wider), with year selection and two monthly charts: full invoice value versus confirmed payments received (RM), and issued quotations/invoices/delivery orders (counts). A collapsible table exposes all twelve monthly values. Empty years, errors and retry are explicit. Chart data is independent of list search, type filters and pagination.

The authenticated `documentsMonthlySummary` action aggregates all matching D1 rows into twelve zero-filled months, using Malaysia time (UTC+8). Document counts/value follow `issued_at` and exclude void/cancelled documents. Payment totals follow `paid_at` (falling back to `created_at`) and include only confirmed ledger payments; deposit, partial and final payments are counted once, and receipt document values are not added. These are issuance and cash-receipt measures, not revenue recognition or historical outstanding balances. No schema migration is needed.

Local tests cover >150 records, UTC-to-Malaysia month boundaries, void documents/payments, invalid years and access denial. Browser fixtures cover year changes, empty years, error/retry, the twelve-row table, independence from list search, and hiding charts on mobile. Previews use synthetic data only.

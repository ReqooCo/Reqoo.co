# Admin business workspace

## Shipped surfaces
- Global search on all authenticated Admin pages: order reference/customer/phone, documents and canonical receipt numbers. Queries scan all matching records, with bounded top results and exact deep links.
- Overview: paginated open quotation approval, payment/balance, production and DO tasks; each opens the relevant workspace. Existing command-centre data remains.
- Order and Documents details: explicit progress steps and suggested next action. A DO indicates document readiness, not proof of physical delivery.
- Quotation builder: existing customer lookup, possible duplicate-phone hint, explicit device draft save/restore and unsaved-change guard. Drafts expire after seven days, are keyed by authenticated user, and are cleared on logout. They are not server documents and do not reserve a document number.
- Settings: Owner can create, change/reset and disable Sales/Production accounts. Staff credentials are PBKDF2-hashed, stored only as hashes/salts; signed HttpOnly staff sessions last eight hours and check active/version on every request. Account changes revoke previous staff sessions. Owner access remains the existing Admin secret/session. No real staff accounts are provisioned by deployment.
- Settings activity log: authenticated shop and business mutations record actor, action, target, safe price/status/amount details and outcome. Audit intent must persist before mutation. Completed response summaries capture safe document/order/payment fields. Existing historical changes cannot be reconstructed. Pending audit completion is shown as `started`, not success. Passwords, tokens and full customer payloads are excluded.
- Finance: paginated per-order costs for material, labour, shipping and other expenses. Profit is order value minus entered costs, an estimate of gross margin rather than cash collected/net profit. Missing costs show unknown rather than zero profit. Optimistic revisions protect concurrent edits; negative margins remain visible.

## Reversible Documents deletion
Each workspace has one Owner-only `Padam` action. The dialog requires its exact reference and a reason. It moves the exact order_id into the Documents archive; it never matches by customer name. `Pulihkan` restores the row. Order/document/payment rows, stock, public document links, Finance reporting and numbering are preserved. The archive also removes it from the new open task queue. This is not a transaction cancellation or permanent deletion. No existing dummy/production records are selected or archived automatically.

## Permissions
- Owner: full existing access, staff management, payments, costs, archive/restore and audit.
- Sales: orders and production read access, customer/documents workflow and quotation generation/conversion. No payment confirmation/correction, product pricing, costs, archive, security or staff changes.
- Production: orders/production details and payment summary read access; production metadata and processing/fulfilled transitions. No paid/cancelled transitions, document management, Finance or settings changes.
- Server checks precede the bridge into legacy handlers; hiding UI alone does not grant/deny access. Public document sharing stays on its original token-protected handler. Shop payment gateway configuration and callbacks are unchanged.

## Schema and validation
`0011_admin_business.sql` only creates supporting tables/indexes and, for fresh installations, the canonical payment ledger if absent. It does not update or delete existing business rows. Migration must run before the API version is deployed (existing deployment workflow already does this).

Tests: in-memory D1/SQLite business and authorization integration, >150 record search, task paging, cost arithmetic and revision conflicts, archive/restore integrity, session revocation and login limiting; Chrome fixtures for global search/error, draft/customer reuse, progress, costs, archive/restore, staff/access navigation, and existing Documents payment/print regressions. Production verification is read-only without creating accounts, costs, payments or orders.

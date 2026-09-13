# Admin Centre reliability and workflow fixes

Based on main `aa6fc66b37f67245410b40ade8b52b44588c542f`.

- Payment verification batches order and payment updates atomically. Retry repairs old paid-order/pending-payment splits without reopening completed jobs. Cancelled/rejected/refunded orders and missing payment records are guarded.
- Document headers and items are written in one batch. Retrying creation repairs empty legacy headers, using stable repair item IDs. Legacy automatic invoice/receipt creation also uses a batch, and its SQL placeholder mismatch is fixed.
- WhatsApp document links now use the current Documents V2 share route; the old URL format was intercepted by V2 and could not resolve. Sharing remains an explicit Admin action.
- Due Today and Overdue aggregate every matching production record, independently of the 12-row attention preview.
- Orders, Production and Products switch in place without page reload. The page heading, active navigation, main content and product action follow the selected workspace. Refresh remains available in the workspace header.
- Mobile navigation includes Products and a More menu for Customers, Documents, PKSK, Referral and Settings. Sidebar styling is isolated from legacy navigation CSS. Focus states, modal stacking and reduced motion are improved.
- Payment and work status are separate in order details. Completed orders no longer offer completion again. Payment actions require confirmation and prevent duplicate submissions. Late order responses cannot overwrite a newer selected order.
- Product images selected from a phone or PC are now converted from the editor preview into R2-backed media URLs before the gallery is saved. Existing `data:image/...` covers are detected by Products Admin and repaired once; the public Shop continues to reject unsafe URL schemes.

Validation: all existing `.mjs` tests, customer Shop UI/quantity tests and backend syntax checks passed locally. New SQLite tests inject write failures, verify rollback and retry repair, verify Documents V2 share links, and count 15 overdue + 5 due-today orders. New image-storage coverage verifies conversion to a safe media URL, the public Shop payload and idempotent repair. New jsdom tests exercise workspace switching, mobile menu, completed-order actions and double-click prevention. SQLite tests run on Node 24; UI tests require jsdom (existing local test dependency).

No production order, payment, customer or product was edited during validation. These changes do not bulk-reconcile historical data; recovery occurs through the guarded retry paths. Visual live verification and deployment are tracked separately from these local results.

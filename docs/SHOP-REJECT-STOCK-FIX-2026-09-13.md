# Shop rejected-payment inventory safety fix

When a Shop order is created, tracked variation stock is reserved immediately in `shop-flow-v3.js`. Previously, rejecting a manual QR payment changed payment status to failed but did not return that reserved inventory.

This release adds `shop-admin-flow-v6.js` in front of the existing admin flow. `rejectPayment` now:

- refuses to reject an already-paid order;
- restores quantities only for variations with stock tracking enabled;
- restores each order at most once using the `stock.restored.payment_rejected` activity event as an idempotency marker;
- releases promotion usage recorded in the order item snapshot;
- marks payment failed and fulfillment cancelled;
- preserves all other Shop admin actions by delegating them to v4/v5/v2.

`api/worker.js` routes Shop admin requests through v6. No PKSK files or question content are changed.

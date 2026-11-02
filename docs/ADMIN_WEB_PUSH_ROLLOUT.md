# REQOO Admin Web Push

Notifications live in the compact Notifications disclosure in the existing Admin.
Canonical host: https://admin.reqoo.co/admin/ (reqoo.co/admin/ redirects here).
The web Worker proxies /api/ with cookies, Origin and manual redirects unchanged.
Owner HttpOnly session authentication is required; staff sessions cannot manage push.
Write operations require an allowlisted Origin and application/json, preventing form CSRF.
Subscriptions only accept recognized Apple, Google FCM and Mozilla HTTPS push services.

## Infrastructure

D1 tables: admin_push_subscriptions, admin_push_events, admin_push_deliveries.
Worker secret: REQOO_VAPID_PRIVATE_KEY; public configuration: REQOO_VAPID_PUBLIC_KEY.
Private keys must never be committed. Keep the same key pair across deployments.
Web Push uses pinned @block65/webcrypto-web-push 2.0.0, RFC8291 aes128gcm and RFC8292 VAPID.
The vendored bundle preserves dependency-free CI. Its source and licenses are in api/vendor/.

New canonical shop orders, quotation conversions and order-v1 creations enqueue after successful creation.
Signed, amount-checked Billplz callbacks and authorized recorded deposit/partial/full payments enqueue after writes.
Browser payment redirects do not enqueue. Legacy paid-payment imports do not enqueue historical events.
Unique event IDs and per-device delivery claims prevent duplicate callbacks/concurrent sends.
Confirmed 429/5xx responses retry through a five-minute cron, for at most six attempts and one day.
Ambiguous network failures are marked uncertain, avoiding duplicate sends at the cost of possible missed delivery.
There is no exactly-once guarantee across a push service and D1; a crash after claiming can lose a delivery.
Push failure does not roll back business records. Failed event insertion is logged; no business mutation is retried.
404/410 subscriptions are removed. Payloads contain only an order reference and short message.

## Activation (each iPhone, iOS 16.4 or later)

1. Open https://admin.reqoo.co/admin/ in Safari and sign in.
2. Share > Add to Home Screen > Add.
3. Open REQOO from that Home Screen icon, sign in if requested.
4. Notifications > Enable Notifications > Allow.
5. Wait 10 seconds, then Send Test Notification.
6. Close the web app and test delivery; tapping a notification opens Admin.
7. Repeat on the second iPhone. Disable Notifications affects the current device only.

A push-service accepted response is not proof of display on an iPhone. Physical iPhone delivery,
closed-app receipt, click behavior and both devices must be verified on the user's devices.
No real financial transactions are required: use the test notification control.

## Checks

node --test tests/admin-push-registry.mjs
node tests/payment-billplz-flow.mjs
node tests/admin-quotation-revisions.mjs
node tests/admin-payment-ledger-consistency.mjs

No VPS, n8n, paid push provider or new subscription. Uses existing Workers/D1 capacity.

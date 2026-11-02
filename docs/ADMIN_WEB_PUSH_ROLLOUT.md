# REQOO Admin Web Push — rollout gate

## Current status
This branch contains an isolated iPhone Home Screen local notification test, a service worker capable of displaying remote push payloads, and a permission-gated opt-in UI. **Remote notifications are NOT yet implemented or deployed.**

## Required implementation before production
1. Determine the canonical admin-session validation mechanism in the deployed Worker. Protect all subscription and send endpoints using server-side session validation; do not trust client-only checks.
2. Create VAPID public/private keys; store private key as a Cloudflare secret, never in GitHub or client code.
3. Implement Web Push encryption and VAPID authentication in the Worker runtime, with tests against a real push service.
4. Add GET /api/admin-push/config and POST /api/admin-push/subscribe plus DELETE unsubscribe with authenticated, same-origin, CSRF-safe requests, strict schema validation and bounded payloads.
5. Apply the additive D1 migration in a staging environment first, and verify DB binding is for the correct Worker.
6. Add an idempotent order/payment event producer that triggers only after server-side verification; never send payment success based on a client callback.
7. Use a separate preview environment and test iOS installed-PWA permission and delivery with the app closed.
8. Merge and deploy only after test pass, then add the Enable Notifications control to the production Admin UI.

## Safety
No notification subscription data should be logged. Endpoints are sensitive credentials. Delete invalid (404/410) subscriptions, and support revocation. No production data, payments or Workers have been modified by this PR.

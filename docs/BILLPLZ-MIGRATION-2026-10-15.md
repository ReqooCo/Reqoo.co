# REQOO — Billplz migration readiness (15 Oct 2026)

Status: **DRAFT — NOT FOR LIVE DEPLOY UNTIL GATES PASS**.
Scope: Shop, Tumbler and PKSK checkout. Existing ToyyibPay transactions and QR receipts must remain readable.

## Cloudflare setup (API Worker reqoo-catalog-api, NOT GitHub)
Configure in Cloudflare Worker secrets/variables:
- BILLPLZ_ENV = sandbox for testing, then production for live.
- BILLPLZ_API_KEY = matching Billplz sandbox/production secret.
- BILLPLZ_X_SIGNATURE_KEY = separate X Signature key.
- BILLPLZ_COLLECTION_ID = verified collection for this business.
- Keep TOYYIBPAY_USER_SECRET_KEY unchanged until older pending transactions are reconciled.

Never paste secrets into code, documentation, ChatGPT, browser scripts or query parameters.

## New payment callbacks
- Shop/Tumbler callback: https://shop.reqoo.co/api/shop?action=billplzCallback (POST signed).
- Shop/Tumbler redirect: https://shop.reqoo.co/api/shop?action=billplzRedirect (GET signed, UI only).
- PKSK callback: https://pksk.sim.reqoo.co/api/pksk-payment-v2?action=billplzCallback (POST signed).
- PKSK redirect: https://pksk.sim.reqoo.co/api/pksk-payment-v2?action=billplzRedirect (GET signed, UI only).

Signed callback must match known bill ID, correct collection, exact order amount (sen), pending payment record. Browser redirects must never mark orders paid. Legacy ToyyibPay callback support remains.

## Pre-deployment gates
1. Confirm verified Billplz merchant, bank and payout status in dashboard. Account verification is not proof of payout.
2. Confirm PRODUCTION Billplz keys and collection are configured only as Cloudflare secrets/variables. Missing values must fail closed.
3. Review the draft PR and CI. Tests: node tests/payment-billplz-flow.mjs and node tests/payment-toyyibpay-flow.mjs.
4. Sandbox tests: successful, failed/cancelled, duplicate and unsigned callbacks, incorrect amount, incorrect collection and bill ID. Verify no false Paid statuses.
5. Authorize one low-value live payment and reconcile payment gateway result, database state, customer access and actual merchant-bank settlement.
6. Test Shop, Tumbler, PKSK license activation, customer order view and manual QR with admin review.
7. Record all pending ToyyibPay orders; preserve previous callback secrets until all settled/reconciled. No automatic refunds or cancellations.
8. Merge only after review and production-readiness signoff. Pushes to main trigger live deployment by GitHub Actions.

## Rollback
Restore the last known-good Worker/commit after checking payments created under both providers. Keep both callback handlers active while reconciling. Do not erase paid orders, payment records or licenses. Manually reconcile pending bills.

## Unverified
No Cloudflare secrets, live gateway balance, bank settlement, database customer records or real payments were accessed or changed. Live tests remain required before deployment.

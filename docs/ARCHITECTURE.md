# REQOO Platform Architecture

## Public products
- `reqoo.co` — main REQOO brand hub
- `sim.reqoo.co` — REQOO SIM (PKSK first product)
- `shop.reqoo.co` — REQOO SHOP commerce
- `play.reqoo.co` — REQOO PLAY interactive learning

## Legacy migration paths
- `/pksk/` remains during migration
- `/shop/` remains during migration
- `/sim/` and `/play/` are staging/public shells until DNS is verified

## Platform services
- Cloudflare Pages/Functions for public sites and APIs
- D1 for orders, licenses, customers, referrals and progress
- R2 for uploaded payment proofs/assets where required
- Billplz as the planned payment provider
- One shared referral system across SIM, SHOP and PLAY
- One shared admin control centre

## Rules
1. Do not expose payment/API secrets in frontend code or Git.
2. Do not remove legacy production routes until the new hostnames are verified.
3. Payment confirmation must be server-side and idempotent.
4. Billplz callback/X-Signature verification is the source of truth for paid orders.
5. Access/license issuance must occur only after verified payment.
6. Product UI should not contain product-specific payment implementations.

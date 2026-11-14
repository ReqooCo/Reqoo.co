# REQOO AI integration and automation rollout

Status: proposal only. No production mutations or payment events are authorized by this document.

## Verified baseline (2026-11-02)
- Repository: ReqooCo/Reqoo.co; default branch main.
- Cloudflare Workers: reqoo-web (assets) and reqoo-catalog-api (API).
- reqoo-catalog-api DB binding points to reqoo-rebuild; matches root wrangler.toml.
- Billplz environment and secret names are configured; values, live payment behavior, callback signatures and idempotency have NOT been validated.
- Other D1 databases exist, including reqoo-shop-db. Do not assume they are interchangeable.

## Phase 1 — Coding agent
1. Inspect current Admin order, quotation, payment, receipt and shop integration routes.
2. Establish automated tests for quotation revision, order creation, partial payments, callback replay, receipt generation and failed payment.
3. Implement changes only on a feature branch and open a draft PR. Never merge/deploy without passing tests and review.
4. Keep the Admin interface English-only and mobile-first.

## Phase 2 — MCP / controlled access
1. Use scoped GitHub and Cloudflare connections; start read-only wherever possible.
2. Avoid granting AI unrestricted access to production D1 writes, payment secrets or live deployments.
3. Record tool changes, test evidence, rollback steps and approval gates.
4. Verify active Worker routes, database migrations and production-to-staging separation before modifying code.

## Phase 3 — n8n event automations
Proposed event: order.created, payment.verified, order.ready.
- Source: authenticated REQOO backend; never trust browser-submitted paid status.
- Payment truth: server-side verified Billplz callback and signature.
- Outbox: durable event ID, event type, order ID, created timestamp, schema version; no secrets or unnecessary customer data.
- Delivery: signed webhook to n8n with replay protection and retry/backoff.
- Deduplication: unique event ID and idempotent consumer; do not create duplicate payments, receipts or messages.
- Failure: dead-letter/alert and manual replay; preserve canonical D1 transaction state.
- n8n sends notifications or creates follow-up tasks only; it must not change payment truth.
- Test with sandbox events, then enable production behind a feature flag.

## Acceptance gates
- CI tests pass and mobile Admin flow remains usable.
- D1 backup and rollback plan documented before migrations.
- No credentials in source, logs, PR comments or client code.
- Duplicate payment callback and duplicate webhook delivery do not duplicate financial records.
- Explicit human approval before production deployment, migrations or customer messaging.

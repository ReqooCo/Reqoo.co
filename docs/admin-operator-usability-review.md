# Reqoo Admin — operator-centred usability review (2026-10-28)

## User perspective and assumptions
Primary operator: owner's spouse running day-to-day customer communication, quotes, order updates and payments, often on a phone with interruptions. These are hypotheses to validate with her directly, **not assumptions about women generally**. Design for time pressure, low cognitive load, handoff interruptions, legibility, confidence and trust. Ask her which tasks are frequent and frustrating before final signoff.

## Walkthroughs to test with actual operator
1. WhatsApp inquiry arrives. Find returning customer by name/phone, select existing product, change quantity, preview and send quotation. Test: no duplicate customer; no manual quote ID; <=2 minutes target.
2. Customer requests revision. Open latest quotation from the order context, duplicate as a new revision, change only requested field, preserve prior version and customer history. Clear 'Simpan pindaan' and 'Kongsi'.
3. Customer accepts and pays deposit. One-click convert to order, enter amount and date, generate deposit receipt; payment status separate from production. Target <=30 seconds after finding order.
4. User is interrupted by a call while entering quote or purchase. Resume exact draft without lost input; explain draft state, no surprise submission.
5. Due production and late payment simultaneously. Home shows actionable priority list with reasons; no scary red for normal outstanding. Work can progress with deposit; final handoff and paid balance follow business policy.
6. Web order arrives. Appears in same queue and customer/order ledger, no duplicate manual entry.
7. Purchase acrylic sheets. Photograph receipt, enter supplier/quantity/total, confirm stock increases; consumption costs only materials used, not all purchased stock. Correct mistakes through audited reversal.
8. End of month. Owner opens profit-and-loss, sees 'cost incomplete' where historical data is missing, not fabricated net profit; tax worksheet requires salary/other income and tax reliefs before an estimate is labelled complete.

## Layout and language
- Keep one prominent next action per screen. Above fold: context + action + at most 4 important values; secondary analytics in an intentional detail view.
- No long vertically stacked finance charts by default. Preserve chart functionality through a distinct 'Analisis' view, not simply hiding chart elements during initialization.
- Mobile controls >=44px, normal body >=14–16px, currency 20px+, accessible focus/contrast, safe-area sticky save. Test with larger text, one-handed reach, keyboard and 200% zoom.
- Whole screen in selected language. No 'Quotation' among Malay labels; choose 'Sebut Harga'. A deliberate English mode can use 'Quotation'. Preserve document type codes and backend values.
- Calm graphite + warm neutral + restrained gold. Limit badges to genuinely actionable exceptions. No autoplay animation or distracting gradients. Plain language: 'Belum dibayar', 'Sedang dibuat', 'Siap untuk dihantar'.
- No compulsory manual reference numbers; auto-generated, searchable references. Confirmation only for destructive/irreversible actions; routine saving should be low-friction.
- One operator can work without knowing tax/accounting terms. Advanced owner-only finance/tax views remain accessible without cluttering daily task flow.

## Repository audit observations
- admin/admin-shell.js currently exposes Ringkasan, Quotation, Pesanan, Kewangan, Urus. Test admin-premium-shell.mjs asserts these strings. A global bilingual change must update UI and tests together, not search-and-replace backend document types.
- admin/finance.html currently displays confirmed collections and unpaid balances, not accounting profit. Do not label collection figures 'Untung'.
- admin/documents.html has settings, KPI, monthly panel and workspaces in one page; safe progressive disclosure must preserve existing JS hooks and draft handling.
- Existing code is not a substitute for real-world usability testing. Do not claim this review was performed by a woman or by the owner's spouse.

## Release checklist
- Observe the operator doing the eight tasks without coaching. Record taps, time, wrong turns, and confusion, with consent. Change the highest-friction issues first.
- Test iPhone 375/390px, large text, 200% zoom, poor network, interrupted forms, no duplicate payments, no missing receipts.
- Validate owner/sales/production permissions, quote revisions, manual/web order parity, payment ledger, draft recovery, language mode, tax confidentiality and stock valuation.
- Merge/deploy only after tests and operator acceptance; feature flag financial modules until opening balances are reviewed.

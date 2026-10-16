# LRA Report — release verification checklist

Scope: `lra/index.html`, `lra/sw.js`; preserve `lra/morning.js` formulas and existing API contracts.

## Before merge (required)
- [ ] Test at 320, 375, 390 and 430 CSS px widths: no horizontal page overflow; date/time, RW/TW, stock inputs usable.
- [ ] On iPhone Safari and Android Chrome, each of six tabs opens and retains entered values on tab changes.
- [ ] Close/reopen PWA: stored active tab is restored; corrupt/obsolete tab falls back to Operasi.
- [ ] Operasi: enter RW/TW/pond readings; verify live WhatsApp preview, notes and problem flags; confirm text before sending.
- [ ] 0700: test all five formats and 0700 operations report; compare manually entered RW/TW flowmeter readings against preview; never substitute daily totalizer values.
- [ ] Validate Days to Critical against the official Pond C lookup table (including the operator's 46.1 reference case); do not approve calculated values without verification.
- [ ] Intake B, Intake C and TWPS: check inputs, drafts and WhatsApp previews.
- [ ] Stok: load stock and transaction history; verify pending changes, undo, and multi-user concurrency before committing.
- [ ] Offline: reload previously cached app, edit draft, restore connectivity and verify intended sync behavior.
- [ ] Verify no access codes appear in URL or console logs; confirm error messages are clear.
- [ ] Test WA share endpoint against non-production/test records before any live operational submission.
- [ ] Check database behavior with two operators editing same date; record conflict handling outcome.
- [ ] Confirm service worker update to v46 activates on existing installed PWAs and cached morning.js loads.

## Automated static checks completed
- Six tab identifiers match six panels.
- No duplicate HTML ids in lra/index.html.
- All five 0700 format panels present.
- Stored invalid tab falls back to Operasi.
- History and stock history render user-supplied values with text nodes.
- Cache version updated to 46.

## Release gate
Do not merge or deploy solely on static checks. Record browser screenshots, observed results, device/version, and database/WhatsApp verification. No CI results were available at last check.

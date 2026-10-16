# LRA Report — release verification

Status: **HOLD / Draft PR #182. Not approved for production deployment.**

Audit run: 16 October 2026, Asia/Kuala_Lumpur. Target branch: `design/lra-minimal-ui-20261016`.
Local tests use Chromium 134.0.6998.35, Playwright 1.51.1, axe-core 4.14.0 and Node 24.19.0. No production API, production database or WhatsApp recipient was used.

## Completed with observed results

- [x] All six tabs at **320, 375, 390, 430 and 768 CSS px**: 30 expanded-panel checks; no horizontal page overflow or controls extending outside viewport.
- [x] Operasi, 0700, Intake B, Intake C and TWPS input drafts survive reload. Stock pending input survives tab switches, refresh and reload.
- [x] Invalid stored active tab recovers to Operasi; keyboard End activates Stok. Tab/panel ARIA associations retained.
- [x] All five 0700 previews render. Five 0700 formats, the separate Operasi 0700 and four shift operational form-submit payloads match their previews. No real message sent.
- [x] RW flowmeter **2485 m³/h** and TW flowmeter **2309 m³/h** remain separate manual readings. Changing daily RW abstraction does not change these readings or Days to Critical.
- [x] Six visible Pond C table rows matched (see below). Formula code unchanged.
- [x] Stored HTML attack strings in live status and stock metadata remain inert text.
- [x] Negative chemical input rejected before save or WhatsApp navigation. API rejects negative/invalid quantities, blank stock corrections and duplicate chemical keys.
- [x] **Zero axe WCAG 2/2.1 A/AA violations** across all six expanded panels in the local Chromium fixture run. This is automated coverage, not a full manual accessibility certification.
- [x] No uncaught browser errors in the regression run.
- [x] Production API handlers tested with an isolated, in-memory SQLite D1 adapter: authentication, persistence, 700 kg conversion, stale-writer rejection, atomic race rollback, targeted Undo and repeated Undo.
- [x] Two 0700 operators: stale edits receive 409; accepted versions remain in history; a forced write between read and commit rolls back the conflicting transaction.
- [x] Real local handler responses: WhatsApp share returns 303 with exact report text, no access code in redirect URL. Invalid date returns 400.
- [x] Actual local Chromium service worker upgrade v46 → v47: old app cache removed, unrelated cache retained, `morning.js?v=14` precached.
- [x] Offline reload → draft edit → second reload → reconnect preserves draft. No automatic database write or API cache.
- [x] PNG icons added at 180, 192 and 512 px; Apple touch icon now uses PNG.
- [x] JavaScript syntax and `git diff --check` pass.

## Official table comparison and limits

Source inspected: operator-provided photograph `IMG_A2FAD083-71D3-4869-B136-CBE6194012A1.jpeg`, showing the Air Selangor SharePoint workbook **Pond C Data 2decimal**, table **POND C at RWPS (Intake C)**. Meter photograph `IMG_5340.jpeg` shows **2485.0 m³/h**; separate TW photograph `IMG_5341.jpeg` shows **2309.0 m³/h**. These source photographs are not committed to the repository.

Column checked: **Actual RW Abstraction (Pond C to WTP), 59.64 MLD**. SJAM C forecast is zero for these comparisons.

| Level (m) | Table storage (ML) | Table days | App days | Result |
| --- | ---: | ---: | ---: | --- |
| 12.00 | 3984.50 | 46.3 | 46.3 | Pass |
| 11.99 | 3978.37 | 46.1 | 46.1 | Pass |
| 11.98 | 3972.24 | 46.0 | 46.0 | Pass |
| 11.90 | 3923.20 | 45.2 | 45.2 | Pass |
| 11.85 | 3892.55 | 44.7 | 44.7 | Pass |
| 11.80 | 3861.90 | 44.2 | 44.2 | Pass |

Example: `(3978.37 − 1226) / (2485 × 24 / 1000) = 46.1497…`, displayed **46.1 days**. Daily RW abstraction 93.954 MLD is not substituted into this forecast.

This verifies the visible table rows, not the entire 7.50–12.00 m range. The photograph does not establish workbook revision approval, all lower-level rows, or a nonzero SJAM C scenario. Obtain the current workbook/readable full table for complete operational sign-off; do not extrapolate this six-row check into a claim that every official row was checked.

## Remaining release gates

- [ ] **Physical iPhone Safari and Android Chrome:** keyboard/date controls, install/standalone mode, safe areas, back navigation from WhatsApp and accessibility with VoiceOver/TalkBack.
- [x] **Chromium and WebKit CI:** both jobs passed on commit `a6fde30` in [run 38966325892](https://github.com/ReqooCo/Reqoo.co/actions/runs/38966325892). Local WebKit launch was unavailable, so this evidence comes from the GitHub runner. Any subsequent commit must also pass the same checks.
- [ ] **Cloudflare D1 staging integration:** test transactional guards and real binding behavior with two operators. The local SQLite adapter is not a Cloudflare staging deployment.
- [ ] **Full current Pond C table:** confirm remaining storage levels with the approved source. SJAM C manual-entry/zero rule was confirmed by the operator on 17 October 2026.
- [ ] **Staging WhatsApp handoff:** confirm the phone opens the intended text/contact picker without submitting an operational message.
- [ ] Review CI results, deployment ownership and the coordinated frontend/API rollout below.

## Changes requiring coordinated rollout

This PR is no longer UI-only. It adds optimistic write guards to `api/s2-chemical.js` and `api/s2-morning.js`. No schema migration, production data edit or calculation-template rewrite is included.

New stock writes include `expectedUpdatedAt`; Undo includes `expectedBatchId`. Morning writes include `expectedUpdatedAt`. Old clients without the guard are rejected with a recoverable error by the new API. A stale/new draft must be reviewed against the online record before retrying. Stock offers an explicit, confirmed “Muat semula stok” action; pending input is never silently discarded by background refresh.

Deploy/test the frontend and API as one release. Do not deploy only the new frontend against an old API and assume concurrency protection exists. Keep PR draft until the gates pass. If rolling back, coordinate both layers and preserve locally saved drafts; do not clear user browser storage or restore a database snapshot as a UI rollback.

## Reproduce safely

From repository root, Node 24:

```sh
npm install --prefix /tmp/lra-runtime playwright@1.51.1 @axe-core/playwright@4.14.0 miniflare@4.20260730.0 --no-audit --no-fund
/tmp/lra-runtime/node_modules/.bin/playwright install --with-deps chromium webkit
export NODE_PATH=/tmp/lra-runtime/node_modules
node tests/lra-api.mjs
LRA_D1_RUNTIME=workerd node tests/lra-api.mjs
node tests/app-cache-isolation.mjs
node tests/lra-browser.cjs
REQOO_BROWSER=webkit node tests/lra-browser.cjs
node tests/lra-pwa.cjs
```

Browser fixtures abort external navigation. API tests replace the access hash only in an in-memory test module and use synthetic data. PWA tests bind only to loopback. Screenshots and axe JSON are written to `REQOO_TEST_OUTPUT` (default sibling `lra-test-results`), and the GitHub workflow uploads them as test evidence. No production secret is required.

## 17 October 2026 — SJAM C operator clarification

The operator confirmed: enter the SJAM C flowmeter reading manually when operating; explicitly enter **0** when stopped. The hourly reading remains independent of daily SJAM C actual (MLD). The old optional daily-actual-to-forecast conversion is disabled, including for restored legacy drafts; existing raw readings are retained. Blank and negative hourly readings do not produce Days to Critical.

The new photograph `IMG_3E50BB14-2275-4302-9EA0-6C729D76361E.jpeg` visibly shows the spreadsheet formula `=(D7-1226)/L6`. This supports the zero-SJAM-C example already checked. It does not establish unseen storage rows.

New regression cases: RW 2485 m³/h plus manual SJAM C 100 m³/h gives 44.4 days at 11.99 m using the existing combined-outflow formula; explicit SJAM C 0 gives 46.1 days. Changing daily actual, or restoring the legacy auto flag, must not overwrite the manual hourly reading. The nonzero example is a software arithmetic check, not an additional official table row.

Cache revision for this clarification: v48; morning asset v15. Earlier v47 results above remain historical evidence; local Chromium browser/axe, API and PWA checks passed again for this revision; CI must also pass before release. Physical-device, D1 staging and full storage-table gates remain open.

## Local D1 verification and deployment review

- [x] The complete API regression suite also passes against ephemeral **Miniflare 4.20260730.0 / workerd D1**: stale writes, injected read/write races, atomic rollback, repeated Undo, history, manual meter preservation and exact WhatsApp redirects. Handlers run in Node with the real local D1 binding; this does not certify deployed Worker routing or remote D1. The fixture uses compatibility date 2026-07-30 (supported by the pinned binary), not production's 2026-08-23. No production config, credentials or database is loaded.
- [x] The same D1 suite is added to both CI browser jobs. The previous SJAM revision `a6fde30` passed all three workflows: isolated release checks (38966325892), Production smoke (38966325960), Shop regression (38966325941).
- [x] Deployment review: `.github/workflows/deploy.yml` deploys on every push to `main`, applies remote migrations, then API and web sequentially. Merging this PR therefore changes production automatically. The alternate web workflow applies only to `rebuild/v1-simple`. No workflow was triggered manually and no deployment credentials were used.
- [ ] Final remote staging and device acceptance remains required; local D1 success does not close those gates.

### Acceptance handoff (synthetic records only)

1. Provide an isolated Worker/D1 staging environment with no production bindings and publish this branch's frontend/API together. Record the tested commit and staging URL.
2. On a physical iPhone and Android phone, open all six tabs, enter synthetic readings, reload drafts, install the PWA, edit offline and reconnect. Verify keyboard, date controls, safe areas and screen-reader labels.
3. Open the same synthetic stock/report in two sessions. Save in session A, then attempt a different save in B: B must receive a conflict without changing A's data. Reload explicitly, retry, and verify history plus two successive Undo actions.
4. Open each WhatsApp report in the phone's contact picker, check the full text and return to the app **without sending**. No access code may appear in the handoff URL.
5. Compare the current approved workbook's remaining levels and nonzero SJAM scenario with the app; record source revision, input/output and reviewer. The six visible rows alone are insufficient.
6. Record pass/fail evidence here. Only after every gate passes should PR #182 be marked ready and merged during a coordinated API/web release. Monitor the deployment workflow and verify the new asset versions; if deployment partially fails, restore the matching previous API/web release without changing D1 records or deleting local drafts.

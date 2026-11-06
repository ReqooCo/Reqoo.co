# REDS — LIVE SHARED HANDOFF (ChatGPT • Work • Codex)

**Single source of truth:** This file and the current GitHub state, **not** an individual chat.  
**Repository:** `ReqooCo/Reqoo.co`  
**Canonical development branch:** `reds/draft`  
**Only active release PR:** [#277](https://github.com/ReqooCo/Reqoo.co/pull/277) (`reds/draft` → `main`)  
**Production:** https://reqoo.co/cad/ — Cloudflare Worker `reqoo-web`, branch `main`  
**Draft:** https://reqoo-reds-draft.abarttrading1.workers.dev/cad/ — Worker `reqoo-reds-draft`  
**Release governance:** `AGENTS.md`, `cad-source/release-policy.json`, `cad-source/REDS-RELEASE-GOVERNANCE.md`

## Working agreement for all agents

1. At the **start of every session**, fetch `reds/draft` HEAD, PR #277 and its current CI. Check `cad-source/REDS-HANDOFF.md` and `AGENTS.md`. Do **not** trust the SHA or status written below without checking the current branch.
2. Work on **`reds/draft` only** for REDS; don't open a competing release PR, create another Draft, push to `main`, force-push, or run `wrangler deploy` directly. Retain source/history from older feature branches, bringing approved improvements into Draft.
3. Before writing, fetch the latest blob SHA. If another agent has committed since you read the file, **rebase the intended change on the latest content**; do not overwrite their work.
4. Make small reviewable commits. Run relevant unit/native/browser tests, then let GitHub Actions run **Core, Modeling and Product** on the **same exact HEAD**. Also verify the **Draft live browser** workflow and version identity before marking ready.
5. End every session by updating **this handoff file** with exact completed changes, test evidence, remaining problems and next action. Commit this file to `reds/draft`; if that moves HEAD, recheck the CI for the new HEAD before reporting success.
6. Protect existing CAD data: never delete originals, backups or history; preserve OpenCascade B-Rep and the native `.rqcad` project format.
7. **Production release is not authorised merely because CI is green.** Admin GitHub ruleset + environment secret/token separation are open in [issue #278](https://github.com/ReqooCo/Reqoo.co/issues/278). Do not merge/deploy until these controls are verified and user approval/release policy is satisfied.

## Checkpoint — sketch snapping (2026-11-07)

- Draft-only updates: true finite line midpoints, line-line interior intersection snapping, out-of-plane intersection rejection, deterministic priority at overlapping snap locations, and visible point markers even when optional guide lines are off. Existing centre, endpoint and origin snaps retained.
- Browser/native tests and deployed Draft identity have **not yet been verified** for these changes. Follow-up: regression coverage for centre/midpoint/intersection, save/reopen, touch and performance; exact-head Core/Modeling/Product and Draft browser checks. Do not claim completed Shapr3D snapping parity.
- Release issue #278 remains open; `liveAccessRestricted=false`. No production merge or deploy.

## Checkpoint — Offset UI and tablet regression (2026-11-07)

- Draft only. Removed duplicate Offset parameter gizmo; one `#sketchEditHUD` now owns distance, Chain/Single and Apply/Cancel. Added nonzero finite offset-distance validation. Canvas edge tapping now targets the precise selected polyline for both Chain and Single; Single records segment index. Sketch dimensions are hidden while an edit tool is active. Compact selection dock and familiar parallel-line Offset / scissors Trim glyphs replace overlapping controls.
- Updated Sketch parity Playwright regression to use `#sketchEditHUD [data-apply]`, verify the duplicate `#operationGizmo` is hidden, and exercise touch selection in Chain mode. These changes are committed, but browser CI and physical iPad verification are **not yet confirmed**; do not call them passing.
- **Known limitation:** Chain offsets segments belonging to one connected polyline feature, not arbitrary independently created lines. Do not claim full Shapr3D Offset parity. Further work: cross-feature chain topology, live drag preview, undo/redo/save/open and actual Draft browser tests.
- Release lock remains in force: #278, `liveAccessRestricted=false`; no Live merge/deploy.

## Current checkpoint — circular Sketch Trim (2026-11-06)

- Starting Draft/PR #277 SHA: `8f0c146a22fb3f06befdec1fb9d0c2f6b9fdc11e`. Its exact-head Core/Modeling/Product and full deployed Draft suite all PASS: runs 42241094535 and 42241082718. Scoped Draft token works without account-wide Workers permission.
- Owner asked to resume CAD work while remaining release security blockers stay locked. This commit adds exact analytic circular/arc Trim: tap a circle or arc between line/rectangle/circle/arc intersections; remaining geometry is stored in the existing native arc recipe, including major arcs and repeated Trim. Straight lines also respect finite arc boundaries. UI hit testing now admits circular edges in Trim only; normal Single Offset edge selection remains straight-only.
- Geometry remains OpenCascade B-Rep: native tests verify a trimmed semicircle has one circular edge and exact bounds. Regression tests cover half/quarter/major remainders, repeated trim, line vs finite arc, coincident circle rejection, source immutability and unsupported ellipse-boundary rejection. Browser coverage includes touch circle Trim, Undo/Redo, reopen and repeat Trim to quarter arc; existing offsets and linked projection remain covered.
- Limits: ellipse/spline Trim remains incomplete, circular Trim against unsupported curve boundaries rejects rather than guessing. Existing dependency/constraint guards remain. Fully editable linked projection, comprehensive constraints and physical iPad/Pencil validation still pending. Do not claim Shapr3D parity.
- Security status: #278 OPEN, liveAccessRestricted=false, PR stays Draft. Live token ID c947450a56fcf3566c760c9c2368b490 is distinct and verified scoped to exact reqoo-web/reqoo-catalog-api tags, plus Zone Read/Workers Routes Write only for reqoo.co. Owner reports env secret installed. D1 migration permissions and actual Live token runtime validation are unresolved; old broad credentials, Pages alternative publisher and external-client permissions/real denial tests remain blockers. Connected OAuth cannot update granular token policies (HTTP400/code1001); no Live deploy or token revocation performed.
- Validation for this commit: local geometry/native/project-IO/constraints/build and Sketch browser tests; final exact-head Core/Modeling/Product + deployed Draft results must be retrieved after push. Final run evidence goes in #278/PR rather than recursive handoff-only commits. Next CAD action: continue curve safety/UX and editable linked face projection after verifying this Draft.

## Previous checkpoint — scoped Draft token verification (2026-11-06)

- Inspected PR #277 HEAD `ebf7f53a7e117743eb3a5148e1a736a7ee7a67a0`. Core/Modeling/Product passed: run 42235356677. Draft full browser suite passed in run 42235349989 attempt 1 using the older credential.
- Owner created Account token `REDS Draft Deploy` (ID `9b46b904c086abe5aa4f15364af0693b`), independently verified active and restricted to the exact Draft Worker tag `5d3251aa17374233a6745c476020e555`, Individual Workers Editor only. Owner stored it in reds-draft environment as CLOUDFLARE_API_TOKEN. No token value captured in chat/source.
- Real rerun 42235349989 attempt 2, job 127967828174: scoped token uploaded Draft successfully, but Wrangler 4.129.0 deploy failed on account-wide /workers/subdomain lookup (10000). Browser tests did not run. This is NOT a green scoped-token deployment.
- This commit replaces Draft full deploy with supported versions upload + exact version 100% deployment. Canonical Actions helper touches only the existing Draft script, keeps workers.dev enabled, disables per-version preview URLs, verifies active version and subdomain settings, then existing exact-commit browser suite runs. No account-wide permission added; upload/deploy failures remain fatal. Mock regression tests cover wrong branch/repo/event/client, denied API, failed upload and wrong active version.
- Main ruleset now independently verified approvals=0 and last-push approval=false for owner-confirmed solo mode; required PR, strict three Actions checks, force/deletion restrictions and empty bypass remain. Live still requires final owner environment approval.
- No Live deployment or credential revocation. #278 remains OPEN, liveAccessRestricted=false. Still pending: Live credentials, broad-token consumer migration/revocation, Pages alternative publisher and external-client boundaries, real negative enforcement tests. Do not broaden Draft token or flip the policy lock to pass CI.
- Local scoped-deploy tests, release-gate tests and surface audit run for this change; fresh exact-head Core/Modeling/Product and canonical Draft browser results must be checked after commit. Final observed run evidence goes in #278 to avoid recursive handoff commits. Next action: verify new pipeline with the actual scoped token, then complete remaining owner-only credential work.

## Previous checkpoint — solo operator continuation (2026-11-06)

- Starting/current inspected remote HEAD: `3a282fb58deda6b554e12d75b36defc95b2693da`; PR #277 open Draft, no merge. Its Core/Modeling/Product and actual Draft suite passed at https://github.com/ReqooCo/Reqoo.co/actions/runs/42226818598 and https://github.com/ReqooCo/Reqoo.co/actions/runs/42226808947.
- Owner confirmed only `ReqooCo` operates the repository and authorised continuation after choosing automated validation + final owner deployment approval. Updated code/policy/docs to the **solo-owner** model, replacing the earlier independent-human-review plan. This is an explicit policy change for solo use, not equivalent independent review and not a test bypass.
- Added real GitHub approval-history verification for the exact canonical Live workflow run, repository, owner user ID/login, environment and SHA. Preflight is a separate no-secrets job before the protected owner-approval job. Production job retains the full gate and source/CI/Draft checks; unresolved requested changes still block it.
- Retired `provision-rebuild-d1.yml` remote provisioning path in Draft; normal migrations remain in deploy.yml. Historical branch copies still require credential migration/revocation; source history preserved.
- Branch rulesets are now API-verified: main 26698974 and Draft 26699119, active, exact branch targets, no bypass, force/deletion blocked. Main currently retains approvals=1 and last-push approval; sole-owner follow-up requires approvals=0 and last-push approval=false while retaining required PR, strict three checks and other protections.
- Owner screenshots show configured Live environment main-only, sole reviewer ReqooCo, self-review permitted, no admin bypass; Draft environment reds/draft-only, no reviewer/timer/admin bypass. Environment admin API and secrets are still inaccessible to this connector. Owner screenshot save banners are evidence, not a complete independent API audit.
- `release-policy.json.rules.liveAccessRestricted` remains **false**. #278 still open. No Live deploy, token creation/revocation, or main push in this session.
- Local release-gate tests cover absent/wrong-owner/wrong-user-type/wrong-environment/rejected/forged-run/wrong-SHA/wrong-workflow/API-denied approvals, missing run ID, successful solo approval without PR self-review, source preflight, legacy independent review and all previous checks. New commit requires fresh exact-head matrix + Draft verification; final results will be recorded on #278 to avoid a documentation-only commit cycle.
- Consolidated owner-only operations in `cad-source/security/OWNER-ACTIONS-278.md`: solo PR settings, two least-privilege environment tokens, then migration/revocation of broad old credentials. Other unresolved agent/security work includes gated Pages production replacement, external-client permissions and real negative enforcement evidence. Do not mark #278 complete or flip the lock merely because checks pass.
- Next concrete action: owner completes only the consolidated admin/secret tasks, while agents preserve one Draft and finish the remaining deployment-boundary audit. Sketch curves/editable linked projection and physical iPad/Pencil parity remain unfinished; native geometry is unchanged by this security session.

## Historical checkpoint — superseded where it conflicts with current checkpoint

## Latest verified context (2026-11-06, before this handoff commit)

| Item | Evidence / status |
|---|---|
| Draft PR | #277 is open and Draft; latest inspected SHA `8a2012f33c2738c9c91a65604779e011a269db38` |
| PR CI | Core, Modeling, Product: passed at that inspected SHA. New commits require fresh CI |
| Deployed Draft | Source SHA matched the inspected PR; separate Draft Worker is functional |
| Production | Main has NOT been merged with #277. Existing live version is left alone |
| Cloudflare Pages | Production `main`; automatic preview only `reds/draft` |
| Legacy previews | Public subdomains for `reqoo-cad-preview` and `reqoo-reds-sketch-preview` disabled; source/history preserved |
| Release-gate policy | `scripts/reds-release-gate.mjs`, mock bypass tests, and deployment-surface tests are in branch |
| Admin security | GitHub repository rulesets absent in latest check; Cloudflare token separation not verified; #278 is open |

### What REDS Sketch work exists in Draft

- Shapr3D-first (original REDS UI) direct Sketch plane/face selection.
- Straight-segment Trim with exact line/rectangle/circle/ellipse intersection boundaries, plus Undo/Redo, overlap and dependency safety.
- Sketch Offset Single/Chain for supported straight open profiles, with native B-Rep feature rebuild; existing closed-profile offset remains.
- Contextual Project Face → linked planar B-Rep sketch.
- Dedicated Sketch comparison in `cad-source/REDS-SKETCH-SHAPR3D-COMPARISON.md`. **Partial is not parity**: editable projected sketches, curved arc/spline Trim and full constraints are not finished.
- Native and Playwright tests under `cad-source/tests/`, including `reds-sketch-parity-ui.mjs`, `sketch-edit-geometry.mjs` and `sketch-native-parity.mjs`.

## Priority queue for next agent (do this in order)

**P0 — Hard deployment security (issue #278):**
- Inspect GitHub ruleset/branch protection on `main` and `reds/draft`; enable or prepare for GitHub admin. Require PR and appropriate CI checks on Live, disallow bypass/force push/deletion.
- Verify `reds-live` and `reds-draft` GitHub Environments restrict branches and (where possible) approval.
- Separate and rotate/revoke the broadly scoped Cloudflare deployment token. Do not break unrelated REQOO workers, payment gateway or D1 deployment; migrate credentials safely.
- Check for **any** remaining GitHub Actions/Cloudflare direct production publishers, including historical branch workflows and service accounts. Testing the release gate alone is not enough.
- Document the **actual verified settings**, permissions, and whether an admin action remains required. Never invent success.

**P0 — Draft QA and release confidence:**
- Verify Draft URL source hash and **latest HEAD**. Run the live Playwright suite; collect failing test name, exact stack and screenshot artifact. Fix the real cause rather than skipping tests.
- Test Sketch Draw → Trim → Offset → Project Face → Edit source → Undo/Redo → Download/Save/Open, on desktop and 390px mobile, with B-Rep geometry correctness and no destructive recovery errors.
- Confirm no silent face reference ambiguity and no regression in current production workflows.

**P1 — Remaining Sketch parity:**
- Implement reliable curved Trim (arcs/splines) and meaningful fully editable projected sketch relationships only after investigating and testing actual geometry dependencies.
- Finish direct dimension/constraints, construction and closed-profile behavior. Keep the Shapr3D interaction **simple by default**: one contextual tool and gizmo per operation; no clutter/floating control sprawl.
- Physical iPad/Pencil testing remains unverified; do not assert it was completed.

**P1 — Track related reliability issues:**
- [#273](https://github.com/ReqooCo/Reqoo.co/issues/273): ambiguous topology reference (no silent guessing).
- [#274](https://github.com/ReqooCo/Reqoo.co/issues/274): reported saved-file Open failure needs the actual failing project fixture.

## Handoff checkpoint template — keep this section updated

- **Last editor / client:** ChatGPT / Work / Codex (state which)
- **UTC updated:** YYYY-MM-DDTHH:MM:SSZ
- **Latest `reds/draft` HEAD:** full SHA (verify freshly)
- **Changed files/commits:** exact GitHub links
- **Core / Modeling / Product:** run URLs + results for exact HEAD
- **Draft live:** run URL, source SHA, and actual UX checks
- **Outstanding blocker:** reproducible evidence / issue link
- **Next concrete action:** single highest-priority task
- **Live changes:** none unless separately verified and approved

**Important:** GitHub is a shared work log but cannot automatically switch running agents when a ChatGPT or Work usage limit is reached. The user opens a new Work/ChatGPT/Codex session and gives this file/PR as the continuation point. Never claim background execution without a scheduled automation.


## Work checkpoint — 2026-11-06 (security audit continuation)

- **Client:** ChatGPT Work / Codex; starting Draft SHA `882e7e4507a5f734014555097e0509d07ce11d86` reconciled with open Draft PR #277.
- **Committed implementation:** `702846b5f77d109581a208cf9cdaba3844bd852e` — independent exact-head human collaborator approval; reject no/stale/self/bot/outside/dismissed approvals and outstanding change requests; guard every `scripts/reds-*` path, including renames; named Core/Modeling/Product checks now report on all PRs to main, auditing all changed files before allowing unrelated non-CAD branches.
- **This checkpoint's additional change:** `check-live` now fails closed for any CAD release while `release-policy.json.rules.liveAccessRestricted` remains false. The actual flag is still **false**. Code tests use a temporary policy fixture to exercise an approved scenario; no environment override unlocks real deployment.
- **Admin audit deliverables:** `scripts/reds-admin-audit.mjs` (read-only, owner credential required) and `cad-source/security/OWNER-ACTIONS-278.md` with actual API evidence, safe migration order and unresolved negative tests.
- **Local tests:** release-gate negative scenarios and deploy-surface audit PASS; native sketch editing / native OpenCascade Single+Chain offsets and linked face projection / project IO / constraints PASS; Vite production build PASS; Chromium `reds-sketch-parity-ui.mjs` PASS (Trim, Undo/Redo/reopen, Single/Chain, linked face upstream rebuild). No new curved Trim or editable linked projection implementation claimed.
- **CI:** initial SHA `882e7e4`: Core and Modeling verified PASS at run `42224170592`; Product was still running when inspected. Implementation SHA `702846b`: full CAD PR matrix started at https://github.com/ReqooCo/Reqoo.co/actions/runs/42225916643. The commit containing this checkpoint triggers fresh CI; retrieve current PR HEAD and check runs for its exact SHA before calling it green. Do not infer new-HEAD success from a previous run. Final observed CI evidence will also be recorded on issue #278 after this checkpoint, avoiding an endless documentation-only SHA cycle.
- **Draft:** prior SHA `882e7e4` was deployed by Actions and browser identity step passed; its full deployed suite was in progress. No direct Worker deploy performed by this session. Fresh checkpoint triggers canonical Draft workflow; verify final exact-head result.
- **Verified security blockers:** repository rulesets endpoint returned `[]`; main protection API 403; GitHub admin browser signed out. Environments/secrets admin operations unavailable. Cloudflare user token list 403 via OAuth; safe identity/revocation of broad deployment token cannot be completed. Account token found is D1-only and was preserved. No credentials revoked without consumer inventory.
- **Additional paths needing owner action:** Pages still auto-publishes main independently of Actions; D1 provisioning workflow consumes repository token with no environment; historical branch workflows and external agents require complete credential/app audit. Worker Builds trigger list 404 is unverified, not absence. Existing retired CAD preview subdomains and preview URLs remain disabled. All six Workers enumerated; source/history retained.
- **Negative testing limits:** code-level denied attempts verified with mocks only. No destructive direct push, production write, force-push or branch deletion attempted. Real permissions enforcement tests require owner configuration and a safe probe.
- **Next action:** owner applies and verifies GitHub rulesets/environments and per-Worker Cloudflare token migration using `security/OWNER-ACTIONS-278.md`, then runs admin audit and provides nonsecret evidence. Do not flip `liveAccessRestricted` until #278 controls are genuinely verified.
- **Live changes:** none; PR #277 stays Draft, #278 stays open. Sketch curve/constraint/physical iPad improvements remain pending behind P0; #273 topology and #274 failing user file fixture remain outstanding.


### Exact Draft commit identity follow-up

While waiting for CI at `38142ff33ae6965d83c39cb3f5543d1317742865`, inspection found `tests/live-identity.mjs` checked sourceHash but not version.json.commit. Documentation/security-only commits share the same CAD asset hash, so an older deployed commit could falsely satisfy exact-head identity. This checkpoint additionally requires the deployed version commit to match the built commit in CI (local builds retain local mode). The final commit containing this follow-up must receive a fresh full matrix and Draft browser run. Local 17 native suites, Sketch parity, file UX, active sketch editing and desktop/tablet/phone focused workspace all passed before this identity-only change. No Live deploy; admin blockers remain unchanged. Fetch final run evidence from #278 and the current PR checks.

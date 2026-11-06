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

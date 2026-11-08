# REQOO CAD — shared working agreement (ChatGPT, Work, Codex)

**Purpose:** One shared place to develop REDS/R3ds CAD, regardless of which agent or chat is used. **Only the owner `ReqooCo` approves a Live release.** Do not add extra human-review steps.

## REDS Control Center — mandatory shared evidence

- Before work, inspect the latest `reds/draft` HEAD, `cad-source/release-policy.json`, and the latest **REDS Control Center** workflow artifact `reds-control-status` (not a stale committed snapshot).
- Authoritative state comes from GitHub API for PR/SHA/checks, Cloudflare API for Pages, and the reviewed release policy for gate requirements. Documentation, comments, and other agents' summaries are **not** authoritative runtime status.
- `scripts/reds-control-sync.mjs` produces `reds/control/status.json` with per-check `pass/conflict/unverified`, evidence, timestamp, and source. Missing credentials or API failures must remain `unverified`; never silently substitute previous observations.
- Workflow `.github/workflows/reds-control-center.yml` runs read-only, validates the fail-closed test, and uploads the report as an artifact. **No additional token is required**: GitHub uses its ephemeral `GITHUB_TOKEN`. Cloudflare checks must be marked `unverified` without read-only Cloudflare API access; never borrow deployment tokens, invent evidence, or request owner setup to make the monitor green.
- A `conflict` or `unverified` is a **release blocker**, not permission to edit policy to force green. This report is supplemental and does not replace the canonical owner-approved Live gate.
- ChatGPT, Work, and Codex all follow this protocol. Re-fetch live evidence before changing state, preserve concurrent commits, and record actual commit/run IDs rather than claiming status from old notes.

## The only two active destinations

- **Development:** `reds/draft` → https://reqoo-reds-draft.abarttrading1.workers.dev/cad/
- **Production:** `main` → https://reqoo.co/cad/
- **One release PR:** [#277](https://github.com/ReqooCo/Reqoo.co/pull/277), always `reds/draft` → `main`.
- Historical feature branches are reference material only; do not create competing Live or Draft deployments.

## Mandatory engineering protocol — audit first, repair by coherent batch

1. **Establish the system baseline before coding.** Read the latest Draft HEAD, the affected source modules, tool-selection contracts, dependent geometry and rendering paths, tests, CI and deployment gates. Build a compact dependency map: user action → selection/state → geometry/kernel → preview → history → save/open → export. Check existing regressions and current CI failures; distinguish verified defects from hypotheses.
2. **Audit the full affected workflow, not one failing assertion.** For Sketch, Solid, Transform and UI, examine entry conditions, touch/mouse selection, preview and commit, repeated use, undo/redo, regeneration, persistence, mobile and error handling. Review interactions with adjacent tools. Keep an issue matrix with severity, root cause, affected modules, fix and verification evidence.
3. **Fix root causes in coherent batches.** Group coupled defects and update shared contracts rather than layering special-case patches. Prefer a single reviewed batch per related subsystem, with regression tests for each confirmed root cause and integration tests across tool boundaries. Never weaken or move an assertion merely to make CI green without proving the intended user interaction remains correct.
4. **Validate at multiple levels.** Run static/syntax and offline geometry/selection tests, browser workflows on the actual Draft build, cross-tool sequences, save/open, history, mobile UX and performance checks where relevant. CI must collect failures and artifacts across suites; passing some jobs never means the release is ready. Record exact run/commit and evidence, and explicitly mark unverified claims.
5. **Close the loop before declaring done.** Inspect failed logs and diagnostics, repair the verified root cause, rerun the impacted suite and integrated gate, then confirm the same commit passed all required checks. Do not ask the owner to fetch logs that are accessible through connected GitHub tools. If access genuinely blocks verification, state precisely what is missing.
6. **Keep the release boundary strict.** All implementation and tests remain on `reds/draft`; never merge or deploy Live while a required check, security gate or owner approval is pending. Use PR #277 and the existing release process only. No duplicate publishers or alternate release path.
7. **Communicate outcomes, not activity.** Report briefly: scope audited, root causes found, files/commits changed, tests actually passed/failed, remaining blockers. Do not claim a comprehensive audit merely because more test suites were added. Avoid repetitive status-only turns and unnecessary micro-commits.

## Agent workflow — shared branch and release steps

1. Before changing CAD, read the **latest** `reds/draft` HEAD and this file; inspect relevant code and [PR #277](https://github.com/ReqooCo/Reqoo.co/pull/277). Use `cad-source/REDS-HANDOFF.md` for technical history **only when relevant**, not as a mandatory report for every short task.
2. Make the requested fix **on `reds/draft`**, preserving other agents' commits. Re-fetch the current file blob SHA before writing; if another agent updated it, reconcile their change first. No force-push.
3. Run targeted checks for the affected feature. Let the existing GitHub workflows run automated **Core / Modeling / Product** validation and Draft browser verification. Do not manually duplicate all suites for every tiny fix.
4. Report real results and blockers. Add a **milestone** checkpoint to PR #277 or the handoff when a substantive feature/incident is resolved; **do not commit a handoff file after every turn**, because it restarts the Draft validation.
5. Release through **the same PR #277** into protected `main` after required automated checks pass on its actual head commit. The only human release approval is by owner `ReqooCo` at `reds-live`; no second developer or self-PR approval is required.
6. Verify Live version, essential geometry/edit/save-open flows and rollback readiness. Do not claim deployed until the actual release succeeds.

## Minimal safeguards worth keeping

- No direct pushes to `main`, force-push, or alternate production publisher; no direct `wrangler deploy` from an agent.
- Do not skip failed automated checks, use a stale SHA, silently discard model data, or approve `reds-live` on the owner's behalf.
- Keep deployment tokens and database access separate from agent prompts, with only the permissions required for their jobs.
- Release-policy safety blockers remain actionable technical configuration issues, **not requests for more human approvers**. Do not bypass an unresolved blocker by setting a flag without making the underlying deployment path work.

**Short version:** Chat / Work / Codex → `reds/draft` → automatic checks → PR #277 → **one ReqooCo Live approval** → `main`.

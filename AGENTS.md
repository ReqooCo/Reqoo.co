# REQOO Development Agents — shared deployment contract

These rules apply equally to ChatGPT, Work, Codex, local scripts and other automation when modifying **REDS / R3ds CAD** (`cad-source/`, `workers/cad-bridge.js`, its web-worker integration and release workflows).

## One Live / one Draft
- **LIVE**: `main` → https://reqoo.co/cad/ (production Worker `reqoo-web`).
- **DRAFT**: `reds/draft` → https://reqoo-reds-draft.abarttrading1.workers.dev/cad/ (Worker `reqoo-reds-draft`).
- **One active Draft PR:** `reds/draft` → `main`. Do not create a separate active CAD release PR.
- Historical CAD branches are read-only research sources; cherry-pick useful changes **into `reds/draft`**, not onto `main` or a separate deployed preview.

## Mandatory engineering workflow
1. Read `cad-source/release-policy.json` and `cad-source/REDS-RELEASE-GOVERNANCE.md`.
2. Start from the current `reds/draft` head. Preserve committed work and do not force-push.
3. Fix the root cause; include feature tests, Playwright UX tests and native geometry tests for changes to sketch/modeling/history/save/open.
4. Run the CAD PR validation matrix (Core, Modeling, Product). Do not call a Draft ready unless all required checks pass on the exact branch head SHA.
5. GitHub Actions alone deploys `reds/draft` to the dedicated Draft Worker. Check build identity and the actual browser workflow.
6. Release only via reviewed `reds/draft` PR merge into protected `main`. `deploy.yml` must pass the centralized release gate before touching Workers or D1.
7. Verify production source SHA and critical user flows; keep a rollback path.

## Do not bypass
- Do **not** call `wrangler deploy` for `reqoo-web`, push to `main` directly, use retired `rebuild/v1-simple` or publish REDS to any other Worker/Pages URL.
- Do **not** create a new CAD preview Worker, new release branch, second active CAD Draft PR or deploy from chat/Work/Codex directly.
- Do **not** disable validation or loosen policy to make a test pass. Fix the source or test.
- Cloudflare credentials must be least-privileged and deployment environments protected; agent instructions alone are not security controls.

Non-CAD REQOO products may have their own workflows, but must never overwrite REDS release artifacts outside this same gate.

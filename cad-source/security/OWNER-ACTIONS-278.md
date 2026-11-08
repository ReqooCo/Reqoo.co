> **Verified Cloudflare status (2026-11-08):** Pages project `reqoo-co` production auto-deploy was disabled and verified by API read-back (`production_deployments_enabled=false`); Draft preview remains enabled for `reds/draft`. Cloudflare account token inventory now shows active `REDS Draft Deploy` (Draft Worker only), `REDS Live Deploy` (specified Live Workers and zone routes), and `REDS D1 Migrations` (D1 Write only). This confirms token *policies*, not GitHub environment secret bindings or revocation of old user-owned tokens. **Do not re-enable Pages production auto-deploy or release Live until those remaining controls are verified.**

# Issue #278 — current owner actions (solo REQOO setup)

**Release remains locked.** The owner confirmed only the `ReqooCo` account is used and authorised a solo workflow: automated tests + protected PR + final owner deployment approval. This intentionally replaces the earlier second-person PR-review plan; it does not provide independent human review.

## Completed settings

- Live ruleset **26698974**, API-verified active on exactly `main`, no bypass, deletion/force-push blocked, strict Core/Modeling/Product checks pinned to GitHub Actions.
- Draft ruleset **26699119**, API-verified active on exactly `reds/draft`, no bypass, deletion/force-push blocked.
- Owner screenshots show `reds-live` branch `main` only, required reviewer `ReqooCo`, self-review permitted and administrator bypass disabled; `reds-draft` branch `reds/draft` only, no reviewer/timer and administrator bypass disabled. Branch-save success banners were shown. Environment settings have not been independently read through the GitHub admin API.
- Code now verifies the real GitHub approval history for the exact canonical Live workflow run and source SHA. A label, PR comment or successful CI run cannot substitute for approval. Preflight runs before the owner is asked to approve. The old D1 provisioning workflow is retired in Draft; history remains in Git.

## Remaining owner-only actions — no repeated screenshots needed

1. **Make the main ruleset usable by its sole owner.** In `REDS Live Protection`, keep PR required, all three strict GitHub Actions checks, conversation resolution, deletion/force-push protection and empty bypass. Change **Required approvals to 0**, and turn off **Require approval of the most recent reviewable push**. An author cannot approve their own PR; leaving these enabled locks the sole operator out. Final human approval instead happens in `reds-live`. Dismiss-stale-review may remain enabled. Do not disable the ruleset or add a bypass.
2. **Install two separate Cloudflare credentials securely.** Under GitHub Environment secrets, use the existing secret name `CLOUDFLARE_API_TOKEN` in each environment (environment secrets shadow the same-named repository secret). Draft token: per-Worker **Editor**, only `reqoo-reds-draft`; no Live Workers, D1, Routes, Pages or token administration. Live token: per-Worker Editor only `reqoo-web` and `reqoo-catalog-api`, plus strictly necessary D1 migration/API-secret-name read/zone route capabilities for the existing canonical workflow. Existing wrangler route/custom-domain configuration must be tested with its actual scope before switch-over. Keep token values out of chat/screenshots.
3. **Complete migration before revocation.** After the new credentials work in their normal protected workflows, remove the broad repository/organization deployment secret and revoke the identified old token. Audit historical branch workflow copies, external CI and connected agents first; preserve unrelated REQOO consumers. The D1-only account token discovered earlier is not the broad Worker deployment token and must not be revoked by guesswork.

The connected GitHub tools cannot write Environment secrets/admin settings; Cloudflare OAuth cannot inspect/manage user-owned token inventory. Code, tests and read-only audits are handled by the agent. These owner operations cannot be replaced with a GitHub commit.

## Further release blockers the agent must resolve/verify

- Cloudflare Pages `reqoo-co` still has automatic production deployment on main. It must be safely put behind the same gate with a replacement publisher before claiming one protected release route; the project also serves other REQOO domains. Do not blanket-disable it without a working replacement.
- Connected Cloudflare clients with direct production write access must be restricted/read-only; GitHub rules cannot restrain a separate broad Cloudflare credential.
- Actual token scopes/distinctness/revocation, safe unauthorized-action denial, rollback readiness and final source identity remain required evidence. Mock tests and screenshots alone do not prove the full security boundary.
- `release-policy.json.rules.liveAccessRestricted` stays **false** until all remaining controls are genuinely verified. Do not close #278 or merge/release #277 on green CI alone.

Read-only owner audit: `node scripts/reds-admin-audit.mjs` with `GITHUB_ADMIN_TOKEN` already provided securely in the owner's shell. It now checks the solo settings above and prints no token values. A passing GitHub audit does not verify Cloudflare token policies.

Official references:
- https://developers.cloudflare.com/workers/authorization/workers/
- https://docs.github.com/en/rest/actions/workflow-runs#get-the-review-history-for-a-workflow-run

---

## Historical audit and original team-review plan (superseded by solo settings above)

# Issue #278 — owner administration actions and evidence

Status: **BLOCKED / OPEN**. The release gate now explicitly refuses CAD production while `liveAccessRestricted` is false; retain false until administrator evidence is verified. Inspected 2026-11-06. No production deployment authorised by this report.

## Actual observations

| Control | Observed evidence | Result |
|---|---|---|
| Repository rulesets | GET `/repos/ReqooCo/Reqoo.co/rulesets` returned `[]` | Missing |
| Classic branch protection | GET `branches/main/protection`: 403, Resource not accessible by integration | Unverified; connection has no Administration access |
| Admin browser | GitHub settings returns signed-out 404; public PR is accessible | No authenticated admin session |
| Environments / secrets | Connected GitHub tools cannot manage administration, environments or secrets | Restrictions and isolation unverified |
| Pages | `reqoo-co`: production `main`, previews custom include only `reds/draft` | Branch filter verified; automatic Pages production remains a parallel publisher without the Actions release gate |
| Workers | `reqoo-web`, `reqoo-catalog-api`, `reqoo-reds-draft`, `reqoo-push-preview`, two retired CAD Workers | Listed all 6 at inspection; not proof no other accounts exist |
| Old CAD previews | Both `reqoo-cad-preview` and `reqoo-reds-sketch-preview`: subdomain enabled=false and previews_enabled=false | Public Workers subdomains disabled; scripts retained |
| Draft | `reqoo-reds-draft`: subdomain enabled=true | Separate Draft retained |
| Cloudflare account tokens | One account token listed, `REQOO Rebuild D1`, D1 Write only | Not the deployment token; **do not revoke it** |
| Cloudflare user tokens | GET `/user/tokens`: 403; OAuth has no scope for endpoint | Broad token identity, usage and revocation cannot be verified |
| Worker Builds | GET `/accounts/{id}/builds/triggers`: 404 | Not verified; 404 is not evidence that no build triggers exist |
| Actions at inspected Draft | Only canonical deploy workflows publish REDS; `provision-rebuild-d1.yml` separately uses broad repository token for remote migrations without an environment | Additional database/credential path requiring migration; retained to avoid disrupting other services |
| Historical branches / clients | Old workflows and external credentials can still use repository secrets until settings change | Full connected-agent/PAT/app inventory needs owner access |

## GitHub owner steps

1. Settings → Rules → Rulesets: create **active branch rulesets**, empty bypass list (including admins/apps).
   - `main`: require PR; at least one independent approval; dismiss stale reviews; require last-push approval; resolve conversations; prevent force push/deletion; strict required checks `verify (core)`, `verify (modeling)`, `verify (product)` from GitHub Actions.
   - `reds/draft`: prevent force push and deletion; restrict writers to the approved development identities. Ordinary fast-forward Draft commits must remain possible: requiring a PR for each Draft commit conflicts with the explicitly mandated single Draft/no extra branches workflow. The PR requirement belongs on **main**.
2. The updated validation workflow reports all three named checks on every PR to main. For other source branches, the entry gate audits the complete changed-file list (including renamed source paths) and allows only non-CAD changes. All three suites still run; no check is skipped to manufacture a pass. Verify this behavior before enabling repository-wide required checks.
3. Environments:
   - `reds-live`: custom deployment branches, exactly `main`, branch type only (no tags); required independent reviewer, prevent self-review, disable administrator bypass where available.
   - `reds-draft`: exactly branch `reds/draft`, no tags/wildcards.
   - Put separate Cloudflare tokens under environment secret name `CLOUDFLARE_API_TOKEN` in each. Existing workflows use that name; environment secrets override repository secrets. Verify distinct token identities in Cloudflare, because GitHub cannot reveal values for comparison.
4. Audit repository and organization secrets, deploy keys, GitHub Apps, collaborators, PATs and self-hosted runners. No client should hold broad Cloudflare write access outside approved environments.
5. Run `node scripts/reds-admin-audit.mjs` in an owner-controlled shell with `GITHUB_ADMIN_TOKEN` already securely populated. It performs GETs only and prints no credential values. It intentionally fails closed on incomplete/unreadable settings. A passing GitHub audit is **not** a passing Cloudflare credential audit.

## Cloudflare owner steps — safe migration order

Official roles/scopes: https://developers.cloudflare.com/workers/authorization/workers/

1. Account API Tokens → create token with **Editor**, scope **Specified Workers**, only existing `reqoo-reds-draft`. No production Workers, D1, Routes, Pages, token administration or account-wide Workers permission. Per-Worker roles now exist; an account-wide legacy `Workers Scripts Edit` token is not equivalent isolation.
2. Create a different live token scoped to the existing `reqoo-web` and `reqoo-catalog-api` Workers. Existing deploy.yml also applies remote D1 migrations and checks API secret names; grant only required additional permissions after testing. Do not grant Pages Write unless a reviewed gated Pages job is introduced. Check existing `wrangler-web.toml` routes/custom domains against per-Worker limitations before switching.
3. Install tokens as environment secrets. Run the normal Draft workflow; verify exact SHA/browser tests. Validate Live token permissions without publishing unreviewed code. Keep old secret until unrelated services have migrated.
4. Move `provision-rebuild-d1.yml` to its own branch-restricted reviewed environment with a D1-only token, or retire it after confirming it is unused. Inventory **all historical branch workflow copies**, external CI, Worker Builds and connected clients; changing Draft files alone does not remove those permissions.
5. Only after all consumers are migrated: remove repository/organization-level broad deployment secret, revoke the identified old Cloudflare token, record token ID and revocation timestamp. Never print token values. Do not revoke the unrelated D1 token listed above based on its name.
6. Restrict agent Cloudflare connections to read-only access; a full write OAuth connection remains an alternative production path even if repository CI is perfect.
7. Resolve Pages auto-production: integrate Pages deployment into the same protected environment/check pipeline before disabling automatic production. This project also serves other REQOO products, so blanket disabling without a replacement is not safe. Its branch filter alone does not guarantee the Actions gate runs before Pages publishes.

## Negative tests still required after owner controls exist

- Record real ruleset refusal for direct main update with an unprivileged development identity. Do not submit a different main SHA or destructive force/delete mutation just to see whether it succeeds. Use a disposable repository with identical settings for destructive negative cases, plus inspect exact production settings.
- Draft credential must be refused by a production write permission probe; use an API-supported non-mutating permission/dry-run mechanism. Do not upload or activate a production Worker version for a negative test. If no safe probe is supported, report permission-policy evidence plus that test limitation.
- Run local release tests: no/stale/self/bot/outside/dismissed approval, outstanding changes request, wrong branch, spoofed check provider, wrong CI, missing Draft browser verification all fail.
- Approved Draft push changes only Draft; protected reviewed merge changes Live; record exact source SHAs and unchanged other services.

Close #278 only when GitHub settings, token revocation, Pages/Worker alternative publishers, connected agents and real enforcement evidence are verified. These instructions and mocked release tests do not close it.

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

# REDS release governance — one Live, one Draft

**Effective:** 2026-11-06. This applies to REDS/R3ds CAD regardless of the client (ChatGPT, Work, Codex, GitHub web, local CLI).

| Role | Single authorized branch | URL | Authority |
|---|---|---|---|
| Live | `main` | https://reqoo.co/cad/ | Protected PR + three checks → Deploy Reqoo Final |
| Draft | `reds/draft` | https://reqoo-reds-draft.abarttrading1.workers.dev/cad/ | Push to one Draft branch → isolated preview and tests |
| Archived work | All old CAD branches | No live preview or release | Read-only source for review/cherry-pick |

## One-door release path

```text
ChatGPT / Work / Codex / local development
                    ↓
                 reds/draft
                    ↓
      PR to main (the only CAD Draft PR)
                    ↓
             Core / Modeling / Product
                    ↓
     Draft preview + exact source identity
                    ↓
           Protected PR approval
                    ↓
                   main
                    ↓
        Deploy Reqoo Final release gate
                    ↓
                reqoo-web LIVE
```

### Automated boundaries already changed

1. `cad-pr-validation.yml` runs `scripts/reds-release-gate.mjs check-pr`: a CAD PR from a branch other than `reds/draft` fails before its build.
2. Every CAD PR runs release-gate regression tests. Three mandatory test jobs produce checks `verify (core)`, `verify (modeling)`, `verify (product)`.
3. `deploy.yml` runs `check-live` before migrations or Worker deployment. This inspects the **entire main commit history since approved baseline**. Any CAD/release-policy commit without a merged `reds/draft` PR and its three successful exact-SHA checks blocks production.
4. `cad-live-verification.yml` pushes only `reds/draft` to `reqoo-reds-draft` and performs live browser tests on that Worker.
5. Cloudflare Pages source restriction: `main` remains production; only `reds/draft` has new automatic Pages previews. Other REQOO services requiring Pages production remain unaffected.
6. Shared CAD preview workers have had their public workers.dev subdomains disabled but scripts and deployment history preserved.
7. Known old branch preview workflows and `rebuild/v1-simple` direct production deploy workflow have been deactivated. Legacy PRs #271, #275, #276 were closed, **not deleted**; their code remains for later integration.
8. This repository's root `AGENTS.md` tells coding agents to use the same doorway.

## Release status & safety boundary

**Repository code does not equal full permissions enforcement.** Work/Codex with a token that can deploy to production could still bypass the checks, or direct pushes to main could publish via an unprotected Pages integration. Admin action is required to close that gap:

- GitHub Settings → Rules → Rulesets: protect `main` from direct pushes and require approved PRs; disallow bypass. Protect `reds/draft` from force-push/deletion.
- GitHub Settings → Environments: allow `reds-live` only from `main` with approval; `reds-draft` only from `reds/draft`.
- Move repo-wide Cloudflare deployment secret to two **separate least-privileged environment tokens**. Rotate/revoke the old broad token. Use read-only Cloudflare credentials for connected agents wherever possible.
- Do not mark deployment safety complete until controls are independently verified. See GitHub issue #278.

## Emergency rollback

- Do not force push or rewrite `main`.
- Identify last known healthy production Worker version and production CAD source hash.
- If the new release fails, roll back through the protected Cloudflare Worker deployment route using an authorised live environment (or deploy a rollback commit through the same PR gate).
- Confirm the recovered production source, geometry editing, Save/Open and cached frontend assets; Worker rollback does not automatically revert databases or Pages assets.

## Operator command

Whenever a user says "go", "sambung", "deploy" or delegates development to a coding agent, interpret REDS changes as **continue in `reds/draft`, test in Draft, review PR, then release to `main`**. Never create a second live or draft publishing route.

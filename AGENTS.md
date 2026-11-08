# REQOO CAD — shared working agreement (ChatGPT, Work, Codex)

**Purpose:** One shared place to develop REDS/R3ds CAD, regardless of which agent or chat is used. **Only the owner `ReqooCo` approves a Live release.** Do not add extra human-review steps.

## The only two active destinations

- **Development:** `reds/draft` → https://reqoo-reds-draft.abarttrading1.workers.dev/cad/
- **Production:** `main` → https://reqoo.co/cad/
- **One release PR:** [#277](https://github.com/ReqooCo/Reqoo.co/pull/277), always `reds/draft` → `main`.
- Historical feature branches are reference material only; do not create competing Live or Draft deployments.

## Agent workflow — small and repeatable

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

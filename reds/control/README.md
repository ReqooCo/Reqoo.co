# REDS Control Center

Single evidence format shared by ChatGPT, Work and Codex. This is a **read-only monitor**, not an alternate deployment route.

Run locally from repository root:

```sh
node scripts/reds-control-sync.test.mjs
GITHUB_TOKEN=... CLOUDFLARE_AUDIT_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... node scripts/reds-control-sync.mjs reds/control/status.json
```

Never commit real tokens or paste them in chat. The GitHub Actions workflow stores `reds/control/status.json` as the `reds-control-status` artifact; this is intentionally **not committed** to `reds/draft` to avoid infinite CI loops and stale snapshots.

Schema v1: `generatedAt`, `repository`, `branch`, `headSha`, `sourceOfTruth`, `checks[]` (`id`, `observed`, `expected`, `status`, `source`, `evidence`, `checkedAt`), `summary`, and `releaseReady`.

`pass`: observed value matches authoritative expected value.
`conflict`: observed value disagrees.
`unverified`: source could not be read or lacks evidence.

`releaseReady` fails closed if **any** check is not `pass`. This is only a diagnostic readiness indicator: actual Live release still requires canonical `reds-release-gate.mjs`, security verification, exact-head checks and owner approval.

Environment configuration: GitHub `reds-draft` variable `CLOUDFLARE_ACCOUNT_ID` and secret `CLOUDFLARE_AUDIT_TOKEN` with **read-only Pages project permission**. Never reuse a Worker deployment or D1 Write token. GitHub uses the workflow's ephemeral read-only token.

Status reports are ephemeral evidence. A report generated against a different HEAD, or without a verified source, cannot certify a later release. If a check is absent, it is not evidence that a control passed.

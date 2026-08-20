# PKSK V2 Rebuild

This is a clean PKSK application rebuild.

## Keep from the old system
- Public flow: landing → payment/access → set dashboard → simulator → result/progress.
- Existing data path and set grouping: `sim/pksk/simulator/sets/SET 01-10` through `SET 41-50`.
- Question data contract: `section`, `category`, `question`, `options[4]`, answer/weights, optional `visual`, and `writing`.
- The original production QA/generation rules are carried forward as the question-bank engine contract.

## Rebuild from zero
- UI and frontend code
- access/device gate
- progress sync layer
- dashboard
- simulator state machine
- result/report UI
- admin tools
- payment/referral integration
- error handling and regression tests

## Locked data rule
Existing Set 01–50 JSON is treated as read-only input. V2 does not edit, regenerate, rename, or delete those files during application rebuild.

## Generation rule
New question generation is provider-driven. The V45 production engine and PKSK bank-engine gates are the QA contract: deterministic seed, question DNA/fingerprint, four unique options, answer validity, duplicate/similarity gates, quarantine, atomic writes, manifests and release verification.

## Target flow
`/sim/pksk/` → `/sim/pksk/payment/` → `/sim/pksk/access/` → `/sim/pksk/simulator/` → result/progress.

# PKSK V2 Rebuild

## Decision
Build the PKSK application from zero because the previous application contains too many bugs. Preserve the proven user flow and data folder contract, but do not reuse the old application implementation.

## Preserve
- `sim/pksk/` public entry point
- payment/access/dashboard/simulator/result progression
- Set grouping `SET 01-10` ... `SET 41-50`
- existing Set 01–50 JSON as read-only data input
- A+B question navigation and timed session concept
- Bahagian C with three writing choices
- local resume semantics as a fallback
- generator QA concepts: deterministic seed, DNA/fingerprint, four unique options, valid answer, duplicate/similarity gate, quarantine, release checks

## Rebuild
- UI
- simulator state machine
- access/device verification
- payment integration
- progress API
- result/report
- admin
- referral
- error telemetry
- regression tests

## Generator provenance
The historical repository contains the V45 production-control engine and PKSK bank-engine rules, but V45 explicitly defines the content authoring provider as an external/provider-driven component. V2 therefore keeps that provider boundary instead of pretending the QA engine is the authoring model. The new `tools/pksk_generator_v2.py` is the adapter/gate layer. The original content-authoring prompts/provider must be plugged into that interface; it is not silently replaced with unrelated content.

## Content generation target
The previously agreed generation design remains: blueprint + V43 design information + V45 anti-pattern/QA rules + Question DNA + 50-set memory → generate from zero → A30/B70/C3 → full QA. Historical bank content is not used as the generation source.

## Safety
No Set 01–50 files are modified by the V2 application rebuild.

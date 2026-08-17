# PKSK V45 Production Engine

## Purpose

V45 is the production-control layer for large PKSK question-bank generation. It is designed to sit beside the existing PKSK bank engine without modifying locked historical bank data.

## Safety rules

- Never overwrite locked snapshots.
- Never delete historical question revisions automatically.
- Use append-only event history for generation/QA/lock events.
- Use atomic JSON writes.
- Assign deterministic question seeds from batch + set + question + revision + engine version.
- Persist passing candidates before set locking.
- Quarantine failed candidates with explicit failure reasons.
- Refuse to lock incomplete sets.
- Re-read and round-trip exported JSON before release.
- Keep production generation provider-driven; V45 does not pretend to be an LLM.

## V45 layers

1. Persistence and checkpoints
2. Atomic writes
3. Deterministic seeds and reproducibility
4. Question DNA/fingerprints
5. Cross-set exact/similarity firewall
6. Quarantine and failure registry
7. Immutable set locking
8. Release hashing
9. JSON round-trip verification
10. Safe dry-run mode

## Dry run

The built-in CLI uses synthetic fixture questions only. It is intentionally not production question content.

Example:

```bash
python tools/pksk_production_v45.py --dry-run --sets 1 --questions 5
```

A dry run must not be treated as proof of content quality. Content quality still requires the existing editorial engine plus the broader V43/V44 QA design.

## Existing bank compatibility

The repository already contains `tools/pksk_bank_engine.py` and `docs/PKSK_BANK_ENGINE.md`. V45 does not overwrite either file. Existing locked-bank rules remain authoritative until an explicit migration is approved.

## Production provider contract

A real authoring provider must implement:

```python
provider(set_no: int, question_no: int, seed: str) -> QuestionRecord | None
```

The provider supplies candidate content. V45 owns persistence, identity, DNA, collision gates, quarantine, checkpoints, and locking.

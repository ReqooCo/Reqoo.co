# REQOO PKSK Item Audit V2 — Baseline Snapshot

Branch: audit/pksk-live-50set-clone-v1
GitHub Actions run: 35443354055
Standard: REQOO_ITEM_STANDARD_V2.md
Scope: read-only audit of 50 clone set files / 5,000 objective items.

## Overall

- KEEP_CANDIDATE: **926**
- POLISH: **213**
- REWRITE: **3,861**
- DROP_REPLACE: **0**

## Major flags

- appended_context: **3,466**
- malformed_text: **2,049**
- template_duplicate: **1,905**
- obvious_one_hot_A: **1,410**
- exact_duplicate: **902**
- decorative_or_redundant_visual_candidate: **321**
- missing_visual: **37**
- weak_or_duplicate_options: **1**
- broken_generated_stem: **1**
- unsupported_visual_kind: **0**
- invalid_option_count: **0**
- invalid_answer_index: **0**

## Per-set triage

| Set | Keep | Polish | Rewrite | Context | Missing visual | Redundant visual | Exact dup | Template dup |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 01 | 95 | 0 | 5 | 0 | 1 | 0 | 1 | 4 |
| 02 | 96 | 1 | 3 | 0 | 1 | 1 | 0 | 1 |
| 03 | 100 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 04 | 66 | 0 | 34 | 0 | 1 | 0 | 1 | 4 |
| 05 | 2 | 0 | 98 | 55 | 12 | 0 | 0 | 61 |
| 06 | 1 | 0 | 99 | 55 | 14 | 0 | 0 | 64 |
| 07 | 4 | 0 | 96 | 56 | 4 | 0 | 0 | 14 |
| 08 | 14 | 42 | 44 | 0 | 1 | 0 | 0 | 56 |
| 09 | 14 | 42 | 44 | 0 | 1 | 0 | 0 | 56 |
| 10 | 14 | 28 | 58 | 0 | 2 | 0 | 0 | 56 |
| 11–20 | 52 each | 10 each | 38 each | 30 each | 0 | 8 each | 0 | ~30 each |
| 21–50 | 0 each | 0 | 100 each | 100 each | 0 | 8 each | 30 each | 43 each |

## Editorial interpretation

1. **Set 03 is the cleanest current benchmark.**
2. **Set 01–02 are near benchmark but still require targeted visual/duplicate fixes.**
3. **Set 04 is salvageable:** 66 items can be retained as candidates; 34 require material rewrite.
4. **Set 05–07 are generator-damaged** and should be treated as rebuild-heavy rather than wording polish.
5. **Set 08–10 contain many template repeats** and require mixed polish/rewrite.
6. **Set 11–20 are partially salvageable**, but context/visual and repeated-pattern repair is required.
7. **Set 21–50 fail the V2 triage as complete sets:** every objective item is flagged for rewrite, driven mainly by appended context and global duplication/template rotation.
8. A visual is not accepted merely because its values are mathematically correct. Visual relevance is judged separately under the visual-answer contract.

## Repair order

1. Finish Set 01–04 to a common Gold/V2 benchmark.
2. Rebuild Set 05–07.
3. Repair/rebalance Set 08–20.
4. Rebuild Set 21–50 from curated bank items rather than mass-editing random context suffixes.
5. Run answer, duplicate, visual and human editorial gates before any merge to live.

This snapshot is diagnostic only. No live simulator question file was changed.

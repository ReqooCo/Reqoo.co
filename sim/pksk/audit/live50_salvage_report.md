# PKSK Live 50-Set Salvage Audit

Source: isolated clone of live `main@fe12db1`.
Live `main` was not modified.

## Inventory

- 50 sets
- 5,150 total items
- Bahagian A: 1,500
- Bahagian B: 3,500
- Bahagian C: 150

## Global duplicate/template findings

- Exact duplicate groups: 501
- Exact duplicate items affected: 1,009
- Number-normalised-only duplicate groups: 96
- Number-normalised-only items affected: 214
- Near-duplicate pairs: 20,468
- Near-duplicate items affected: 3,543
- Repeated template-prefix groups: 157
- Repeated template-prefix items affected: 3,554

## Salvage classification

| Status | Count |
|---|---:|
| KEEP_CANDIDATE | 2,571 |
| POLISH | 269 |
| REWRITE | 1,565 |
| DROP_REPLACE | 745 |
| TOTAL | 5,150 |

Salvageable without inventing a completely new concept: **4,405 / 5,150 (85.53%)**.

### By section

| Section | KEEP | POLISH | REWRITE | DROP/REPLACE |
|---|---:|---:|---:|---:|
| A | 90 | 0 | 1,410 | 0 |
| B | 2,455 | 202 | 98 | 745 |
| C | 26 | 67 | 57 | 0 |

## Main reasons

- 2,455 B items are clean automated KEEP candidates but still require answer/factual/editorial verification before final approval.
- 745 B items belong to domains outside the locked final B blueprint and therefore cannot occupy final slots as-is.
- 650 A items use the legacy single-best-answer structure and require conversion to graded profile scoring.
- 605 items are duplicate followers and require material rewrite or replacement while keeping only the best survivor.
- 310 A items have Agree/Disagree option/schema issues and 310 have corresponding weight issues.
- 137 B items expose a possible correct-answer length clue.
- 50 C prompts have low reasoning demand.

## Locked interpretation

`KEEP_CANDIDATE` is not yet `FINAL_APPROVED`. A candidate only becomes final after editorial review confirms correctness, natural wording, age suitability, construct fit, distractor quality, scoring/weight validity, and no unacceptable semantic/template repetition.

The live simulator remains untouched. Repair work must happen on a separate curation/repair branch and final sets are assembled only after bank-level QA passes.

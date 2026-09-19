# Sets 08-10 — REQOO Item Standard V2 Rebuild

Branch: `audit/pksk-live-50set-clone-v1`
Live simulator: **UNCHANGED**

## Before rebuild

- Set 08: 14 KEEP / 42 POLISH / 44 REWRITE.
- Set 09: 14 KEEP / 42 POLISH / 44 REWRITE.
- Set 10: 14 KEEP / 28 POLISH / 58 REWRITE.
- B blueprint was legacy 14-per-subject style, not the locked V2 mix.
- Writing prompts were heavily repeated across Sets 08-10.

## After rebuild

All three sets now use:
- A = 30: 20 situational graded + 10 direct Setuju/Tidak setuju.
- B = 70: IQ 10 / Matematik 20 / Bahasa Melayu 8 / English 8 / Sains 8 / Teknologi-RBT 6 / Pengetahuan Am 6 / Penyelesaian Masalah 4.
- C = 3 distinct writing prompts.
- B answer balance target = A18 / B18 / C17 / D17.
- REQOO ITEM STANDARD V2.
- Global exact/template duplicate audit.
- Visual-answer contract audit.
- Manual editorial and ambiguity review.

## Final audit result

At GitHub Actions audit run **35448028607**:
- Set 01: 100 KEEP / 0 flags / release PASS
- Set 02: 100 KEEP / 0 flags / release PASS
- Set 03: 100 KEEP / 0 flags / release PASS
- Set 04: 100 KEEP / 0 flags / release PASS
- Set 05: 100 KEEP / 0 flags / release PASS
- Set 06: 100 KEEP / 0 flags / release PASS
- Set 07: 100 KEEP / 0 flags / release PASS
- Set 08: 100 KEEP / 0 flags / release PASS
- Set 09: 100 KEEP / 0 flags / release PASS
- Set 10: 100 KEEP / 0 flags / release PASS

Therefore the first 10 sets form a clean 1,000-item objective benchmark under the automated V2 gate.

## Notable repairs in this batch

### Set 08
- Rebuilt legacy B blueprint.
- Removed two global template duplicates.
- Removed a false visual cue caused by wording around algorithm planning.

### Set 09
- Rebuilt legacy B blueprint.
- Rewrote duplicate numeric/coordinate/language templates.
- Removed a false visual cue in a data-correction situational item.

### Set 10
- Rebuilt legacy B blueprint.
- Rewrote duplicate IQ/conversion items.
- Removed generator-sensitive 'Delta' group naming.
- Reworded data-literacy stems so they do not trigger false missing-visual flags.

### Cross-set cleanup
The final global audit also exposed residual issues in Set 01-02. These were fixed:
- Set 01 B10 and B44.
- Set 02 B13, B56, B60 and B69.

## Current global clone status

After the final cleanup:
- KEEP_CANDIDATE: **1,520**
- REWRITE: **3,380**
- POLISH: **100**
- Remaining defects are concentrated in Sets 11-50.
- Set 11-20 remain partially salvageable.
- Set 21-50 remain rebuild-heavy because of appended context, exact/template duplication and legacy A-format defects.

## Decision

Sets 01-10 are the current V2 benchmark group. Do not merge to live until the larger curated bank and release plan are explicitly approved.


## Final answer balance verification

After the last editorial rewrites, answer positions were rebalanced without changing stems or correct-answer content:
- Set 08: A18 / B18 / C17 / D17
- Set 09: A18 / B18 / C17 / D17
- Set 10: A18 / B18 / C17 / D17

Final audit run **35448113818** confirms Sets 01-10 each have:
- 100 KEEP_CANDIDATE
- 0 item flags
- release gate PASS

This is the final V2 checkpoint for the first ten clone sets.

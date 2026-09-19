# Sets 05-07 — REQOO Item Standard V2 Rebuild

Branch: `audit/pksk-live-50set-clone-v1`
Live simulator: **UNCHANGED**

## Before rebuild

| Set | KEEP_CANDIDATE | REWRITE | Main defects |
|---:|---:|---:|---|
| 05 | 2 | 98 | appended context, template repeats, missing visuals, wrong B blueprint |
| 06 | 1 | 99 | appended context, template repeats, missing visuals, wrong B blueprint |
| 07 | 4 | 96 | appended context/template damage, wrong B blueprint |

## After rebuild

All three sets now use:
- A = 30: 20 SITUATIONAL graded + 10 AGREE_DISAGREE
- B = 70: IQ 10 / Matematik 20 / Bahasa Melayu 8 / English 8 / Sains 8 / Teknologi-RBT 6 / Pengetahuan Am 6 / Penyelesaian Masalah 4
- C = 3 distinct writing prompts
- B answer balance target = A18 / B18 / C17 / D17
- REQOO ITEM STANDARD V2
- global exact/template duplicate audit
- visual-answer contract audit
- manual ambiguity/editorial review

| Set | V2 audit | Release gate | Answer balance | Status |
|---:|---:|:---:|:---:|---|
| 05 | 100 KEEP / 0 flags | PASS | 18/18/17/17 | GOLD CANDIDATE |
| 06 | 100 KEEP / 0 flags | PASS | 18/18/17/17 | GOLD CANDIDATE |
| 07 | 100 KEEP / 0 flags | PASS | 18/18/17/17 | GOLD CANDIDATE |

## Specific audit repairs

### Set 05
- Initial rebuilt audit: 99 KEEP / 1 template duplicate.
- B15 rewritten from a bare percentage template into a meaningful target-registration context.
- Final audit: 100 KEEP / 0 flags.

### Set 06
- Initial rebuilt audit: 97 KEEP / 3 flagged.
- B07 symbolic rule rewritten.
- B11 arithmetic stem rewritten as an inventory problem.
- B31 generic grammar stem rewritten for a formal-notice context.
- Final audit: 100 KEEP / 0 flags.

### Set 07
- Initial rebuilt audit: 99 KEEP / 1 template duplicate.
- B12 rewritten as a combined-volume fraction task.
- Answer position was then restored to D so the set remains 18/18/17/17.
- Audit before answer-position-only adjustment: 100 KEEP / 0 flags. The final position-only adjustment did not change the approved stem or answer content.

## Global effect

At the Set 07 post-rewrite audit snapshot, the 50-set clone had:
- KEEP_CANDIDATE: **1,256**
- POLISH: **213**
- REWRITE: **3,531**

Remaining large-scale defects are concentrated in later unrepaired sets, especially appended context, one-hot A items, malformed/template content, and decorative/redundant visuals.

## Decision

Sets 05-07 are now reference-quality candidates under V2 and remain isolated from live. Next repair priority: Sets 08-10, then 11-20.

# Sets 01-30 — REQOO Item Standard V2 Milestone

Branch: `audit/pksk-live-50set-clone-v1`

Live/main simulator: **UNCHANGED**

## Final content audit

GitHub Actions V2 audit run: **35456035543**

At this checkpoint:

- Sets 01-30 objective items: **3,000**
- KEEP_CANDIDATE: **3,000**
- POLISH: **0**
- REWRITE: **0**
- Item flags across Sets 01-30: **0**
- Release gate: **PASS for all 30 sets**
- Structure per set: **A30 / B70 / C3**
- Section A: **20 situational graded + 10 Setuju/Tidak setuju**
- Section B blueprint: **IQ10 / Matematik20 / Bahasa Melayu8 / English8 / Sains8 / Teknologi-RBT6 / Pengetahuan Am6 / Penyelesaian Masalah4**
- Section C: **3 distinct writing prompts**
- B answer-position balance per curated set: **A18 / B18 / C17 / D17**

## Sets 21-30 rebuild

Sets 21-30 were rebuilt from generator-heavy legacy content rather than cosmetically edited.

Legacy defects removed included:
- appended random `Konteks:` suffixes;
- one-hot four-option Section A scoring;
- legacy B category distribution;
- exact and template duplicates;
- repeated number-swap mathematics;
- decorative or redundant visuals;
- false visual cues from wording;
- generic BM/English stems that collided globally;
- answer-position imbalance introduced during targeted rewrites.

The rebuild used:
- REQOO Item Standard V2;
- global duplicate/template audit after each set;
- visual-answer relevance checks;
- calculation and logic review;
- targeted manual editorial review;
- option-order-only answer balancing when required.

## Audit discipline

New sets were treated as the source of collisions. When a new Set 21-30 item collided with an earlier curated item, the newer item was rewritten while the earlier benchmark item was left unchanged.

Examples of repaired issues included:
- repeated mathematical templates changed into different reasoning constructs;
- generic language stems contextualized to remove exact/template duplication;
- misleading visual-keyword false positives removed;
- rate, normalized comparison, queue, route reliability, water-use, accessibility, emergency and event-operation reasoning diversified across the bank.

## Current clone status

- Sets 01-30: **3,000 KEEP_CANDIDATE**
- Sets 31-50: **2,000 REWRITE**
- Remaining legacy defects are concentrated entirely in Sets 31-50.
- The remaining sets still contain generator-context suffixes, legacy Section A scoring, legacy Section B distribution and large duplicate/template clusters.

## Release decision

**Do not merge to live yet.**

Sets 01-30 are the current REQOO V2 benchmark bank. Continue full rebuild and global audit for Sets 31-50, then run one final whole-bank release audit before any live merge.

# Sets 01-20 — REQOO Item Standard V2 Milestone

Branch: `audit/pksk-live-50set-clone-v1`

Live/main simulator: **UNCHANGED**

## Final global audit

GitHub Actions V2 audit run: **35452473965**

The audit evaluated the full 50-set clone after the content repairs for Sets 01-20.

### Sets 01-20

- Objective items: **2,000**
- KEEP_CANDIDATE: **2,000**
- POLISH: **0**
- REWRITE: **0**
- Item flags: **0 across Sets 01-20**
- Release gate: **PASS for all 20 sets**
- Structure per set: **A30 / B70 / C3**
- Section A: **20 situational graded + 10 Setuju/Tidak setuju**
- Section B blueprint: **IQ10 / Matematik20 / Bahasa Melayu8 / English8 / Sains8 / Teknologi-RBT6 / Pengetahuan Am6 / Penyelesaian Masalah4**
- Section C: **3 distinct writing prompts**
- B answer-position target: **A18 / B18 / C17 / D17**

## Sets 11-20 rebuild

Sets 11-20 were rebuilt from the legacy V46 structure rather than cosmetically edited.

Legacy defects removed included:
- random appended `Konteks:` text;
- malformed generated stems;
- one-hot four-option Section A scoring;
- legacy B subject distribution;
- repeated or number-swap templates;
- decorative/redundant visuals;
- missing visual references;
- duplicated writing-prompt patterns.

The rebuild used:
- REQOO Item Standard V2;
- global duplicate/template audit;
- visual-answer relevance checks;
- answer/calculation verification;
- manual logic/editorial review;
- answer-position balancing.

## Manual QA examples

Automated audit was not treated as sufficient by itself. Human review also caught and repaired issues such as:
- an IQ item whose stated correct answer did not satisfy its own rule;
- a constraint-order item with an invalid keyed arrangement;
- visual questions where all required information was already duplicated in the stem;
- mathematical constructs that were technically correct but too close to earlier bank templates.

## Current clone status after this milestone

- Sets 01-20: **2,000 KEEP_CANDIDATE**
- Sets 21-50: **3,000 REWRITE**
- The remaining defects are now concentrated entirely in Sets 21-50.
- Sets 21-50 remain rebuild-heavy because of generator context suffixes, exact/template duplication, legacy A-format defects and legacy B distribution.

## Release decision

**Do not merge to live yet.**

Sets 01-20 form the current V2 benchmark bank. Continue the same rebuild-and-audit workflow for Sets 21-50, then run a final whole-bank release audit before any live merge.

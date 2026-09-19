# REQOO ITEM STANDARD V2

Status: LOCKED FOR CLONE CURATION
Scope: PKSK practice bank Set 01-50 in the curation clone only.
Live simulator content must not be modified until a curated bank is explicitly approved.

## 1. Purpose

This standard controls how an item is written, reviewed, repaired and approved. It uses Malaysian Tahap 2 item-construction principles as quality references while preserving REQOO's internal PKSK A/B/C blueprint.

Important:
- UASA/DSKP principles are quality and age-suitability references.
- REQOO does not claim its exact internal PKSK subject allocation is an official KPM distribution.

## 2. Non-negotiable authoring sequence

Every item must be built in this order:

1. Construct — what thinking, knowledge or behaviour is assessed?
2. Curriculum/age fit — suitable for Malaysian Tahap 2.
3. Cognitive level — Low / Medium / High based on thinking demand.
4. Context — only when it supports the construct.
5. Stimulus — diagram/table/graph/passage/data only when genuinely needed.
6. Stem — one clear task.
7. Options / response scale — plausible and aligned to construct.
8. Key / scoring — mathematically and factually verified.
9. Editorial review — natural Malay/English, concise and unambiguous.
10. Duplicate/template review — not a cosmetic rewrite of another item.

Never generate a question first and append a random context afterward.

## 3. Context rules

PASS:
- Context changes what information must be interpreted or what decision must be made.
- Removing the context would materially change the task.

FAIL:
- Literal suffixes such as "Konteks: robotik", "Konteks: hidroponik", "kumpulan Alpha/Beta/Gamma".
- Context unrelated to the mathematics/science/language construct.
- Theme rotation used only to disguise repeated templates.
- Broken phrases such as "dalam projek bertema ..." appended after a complete question.

Default: no context is better than fake context.

## 4. Stimulus and visual rules

A visual is a stimulus, not decoration.

APPROVE when:
- the answer requires reading/interpreting the visual; or
- it reduces verbal load for a spatial/data/measurement task.

REWRITE/REMOVE when:
- the stem already contains every value shown in the visual;
- the visual is unrelated;
- the same generic visual is reused only for cosmetic variety;
- the question says rajah/graf/carta/jadual but no usable visual is supplied.

Visual-answer contract:
- displayed labels/values must match item data;
- answer-only fields must never be exposed;
- removing the visual should make a genuinely visual item impossible or materially harder.

## 5. Difficulty rules

LOW:
- direct recall, recognition, or one familiar operation.

MEDIUM:
- select a method, connect two pieces of information, infer, or perform a short multi-step process.

HIGH:
- integrate several conditions, reject irrelevant information, compare strategies, justify/infer, or solve a non-routine multi-step task.

Number swapping is not a new difficulty level.

A 5:3:2 Low:Medium:High balance may be used as a Tahap 2 calibration benchmark where appropriate. It is not a claim about the official PKSK distribution.

## 6. Distractor rules for Bahagian B

Each wrong option must represent a plausible misconception, calculation error or interpretation error.

Reject distractors that are:
- random numbers;
- obviously absurd;
- grammatically incompatible;
- duplicates/equivalents;
- clues to the correct answer through length or wording.

## 7. Bahagian A rules

REQOO locked design:
- 30 items.
- 20 situational graded-response items.
- 10 direct Setuju / Tidak setuju items.
- EQ / SQ / SSQ and related constructs balanced.
- Situational options must be plausible responses with graded maturity/profile scoring.
- Direct Setuju/Tidak setuju items remain genuinely dichotomous unless another format is explicitly approved.
- Stems must be realistic for an upper-primary learner.

## 8. Bahagian B rules

REQOO locked internal mix:
- IQ: 10
- Matematik: 20
- Bahasa Melayu: 8
- English: 8
- Sains: 8
- Teknologi/RBT: 6
- Pengetahuan Am: 6
- Penyelesaian Masalah: 4

Rules:
- 4-option MCQ, one verified best/correct answer.
- Answer positions A/B/C/D balanced across the set.
- Mix direct, interpretive, inferential and multi-step reasoning.
- Stop number-only template rotation.
- BM/English include comprehension/inference as well as language mechanics.
- Sains/RBT include application/interpretation, not recall only.
- Pengetahuan Am must be age-appropriate and avoid fragile time-sensitive trivia.

## 9. Bahagian C rules

- 3 distinct prompts.
- Clear task and audience/purpose where useful.
- Suitable for transition to secondary-school writing.
- Encourage reasons, examples, explanation and/or proposed action.
- Avoid cosmetic rewrites of one theme.

## 10. Nine-point quality gate

### Keakuran
1. Curriculum/age fit
2. Blueprint/specification fit
3. Fair opportunity to answer from supplied knowledge/stimulus

### Ketepatan dan kejelasan
4. Construct accuracy
5. Context/content accuracy
6. Clear language and task

### Kesesuaian
7. Appropriate difficulty
8. Educational importance/relevance
9. Fairness; no avoidable trick unrelated to construct

Each point is PASS / REVIEW / FAIL.

## 11. Automated red flags

The V2 audit flags:
- appended_context
- broken_generated_stem
- missing_visual
- decorative_or_redundant_visual_candidate
- unsupported_visual_kind
- invalid_option_count
- invalid_answer_index
- weak_or_duplicate_options
- exact_duplicate
- template_duplicate
- obvious_one_hot_A
- malformed_text

Automated flags never replace human editorial review.

## 12. Curation decision

KEEP_CANDIDATE
- Structurally sound; no severe flag; still needs human truth/editorial review.

POLISH
- Useful construct and defensible answer, but limited wording/options/schema repair required.

REWRITE
- Construct may be retained but stem/context/options/visual/scoring need material rewrite.

DROP_REPLACE
- Wrong/unclear construct, indefensible key, severe mismatch, duplicate with no unique value, or unsuitable content.

No item becomes APPROVED automatically.

## 13. Release gate

A set may be assembled for release only when:
1. A/B/C counts pass.
2. Locked A design passes.
3. Locked B distribution passes.
4. Answer/calculation verification passes.
5. Duplicate/template audit passes.
6. Visual-answer contract passes.
7. Language/editorial review passes.
8. Nine-point quality gate passes.
9. Human read-through is complete.
10. No unresolved severe flags remain.

Set 01-03 are reference-quality candidates, not automatic truth. Set 04-50 must be judged item-by-item under this V2 standard.

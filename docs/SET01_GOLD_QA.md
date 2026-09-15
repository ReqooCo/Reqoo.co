# Set 01 Gold Standard — QA Record

Status: **candidate passes content/build gate; not merged to production**.

Safety rollback remains frozen at `rollback/pksk-before-content-rebuild-20260915` → `9889871a367cd02dde226ec58cc495e125e47c16`.

## Automated structural checks

PASS:

- 100 objective items total.
- Bahagian A = 30.
- Bahagian B = 70.
- Bahagian C = 3 writing prompts.
- A = 20 `SITUATIONAL` + 10 `AGREE_DISAGREE`.
- Every A situational item has four unique options and one each of scores 3/2/1/0.
- Every direct A item has exactly `Setuju` / `Tidak setuju`.
- A difficulty mix = L1 8, L2 10, L3 8, L4 4.
- A construct coverage includes EQ, SQ and SSQ.
- B category blueprint = IQ 10, Matematik 20, Bahasa Melayu 8, English 8, Sains 8, Teknologi/RBT 6, Pengetahuan Am 6, Penyelesaian Masalah 4.
- B answer positions = A 18, B 18, C 17, D 17.
- Every B item has exactly four unique options, a valid `answerIndex`, and a matching one-hot answer weight.
- Six structured visual items are present and use all six supported renderer schemas once each.
- All 3 writing prompts specify 100-word minimum.
- Exact question stems are unique.
- `legacy_content_used=false`.

## Runtime compatibility

PASS:

- Client runtime renders answer options from the actual option-array length, so two-option direct A items are supported.
- Client A scoring uses question `weights` and does not require `answerIndex`.
- Server authoritative `scoreSet()` also scores A directly from `weights`.
- Server B scoring uses canonical `answerIndex`/answer key.
- Six structured visual kinds pass the existing no-answer-leak renderer regression test.
- Generated JSON loads successfully in Node.
- Cloudflare branch preview deploy completed successfully.

## Independent numerical/key checks

PASS:

- B01: 235 + 168 − 97 = 306.
- B06: 24 × 18 ÷ 9 = 48.
- B09: 3 of 8 equal parts = 3/8.
- B12: 2/3 + 1/6 = 5/6.
- B16: RM12.60 × 3 − RM5.00 = RM32.80.
- B20: 25% of 160 = 40.
- B24: ratio 3:5 from 64 gives 40 girls.
- B27: 9:35 + 1 h 45 min = 11:20.
- B30: mean of 12, 15, 18, 10, 20 = 15.
- B35: 12 cm × 7 cm = 84 cm².
- B37: 2 × (18 + 9) = 54 m.
- B41: 8 × 5 × 4 = 160 cm³.
- B44: 180° − 68° = 112°.
- B45: P = RM88; Q = RM92; P cheaper by RM4.
- B47: (2,3) moved 4 right = (6,3).
- B51: 2.35 m + 0.85 m = 3.20 m.
- B55: 3½ − 1¾ = 1¾.
- B59: 240 ÷ 80 = 3 h.
- B62: 70 + 60 = 130.
- B65: 250 − (6×28 + 3×18) = RM28.
- B69: S(19) + U(21) + N(14) = 54.
- B70: non-red = 4/8 = 1/2.

## External factual spot-checks

PASS against official/current primary sources where applicable:

- Rukun Negara purpose: national unity/harmony — Malaysia Government portal.
- Formation of Malaysia: 16 September 1963 — Malaysia Government portal.
- Mount Kinabalu / Kinabalu Park: Sabah — Sabah Parks.
- ASEAN purpose: regional economic/social cooperation and peace/stability — ASEAN Secretariat.

## Human semantic read-through

PASS with review notes:

- All 30 A items read individually: response hierarchy is plausible rather than a repeated one-obviously-good / three-nonsense pattern.
- Direct A items intentionally alternate positively and negatively worded statements to reduce mechanical `Setuju` answering.
- All 70 B items read individually: the set mixes recall, inference, language, arithmetic, multi-step calculation, rule discovery, deduction, applied science, RBT and constrained problem solving.
- Near-template scan found only benign shared forms (`Berapakah hasil ...` for two different fraction operations and `Choose the correct ...` for two different English constructs), not duplicated questions.
- The three C prompts are distinct: digital wellbeing, school/environment responsibility and community problem solving.

## Release rule

This candidate may move to a review PR, but **must not be merged to `main` until the preview is manually opened and visually checked on desktop/mobile**. Set 02–50 must remain unchanged until Set 01 is accepted as the Gold Standard.

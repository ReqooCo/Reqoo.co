# Set 01 Gold Standard Rebuild Plan

Safety rollback branch: `rollback/pksk-before-content-rebuild-20260915`

Frozen rollback commit: `9889871a367cd02dde226ec58cc495e125e47c16`

Do not move or write to the rollback branch during the rebuild.

## Public PKSK benchmark

Current public PKSK format references describe:

- Bahagian A: 30 objective Kecerdasan Insaniah items covering EQ, SQ and SSQ; profile/graded-response and dichotomous response styles are used rather than treating the whole section as ordinary right/wrong academic MCQ.
- Bahagian B: 70 objective Kecerdasan Intelek items covering IQ, language, mathematical/scientific/technology problem solving and general knowledge.
- Bahagian C: choose 1 of 3 writing prompts.

The exact Bahagian B category counts below are an internal REQOO quality blueprint, not a claim that KPM publishes this exact split.

## REQOO Set 01 lock

### Bahagian A — 30

- 20 situational graded-response items.
- 10 direct `Setuju / Tidak setuju` items.
- Situational responses use plausible alternatives with 3/2/1/0 scoring.
- EQ/SQ/SSQ coverage spans empathy, self-regulation, responsibility, integrity, resilience, communication, cooperation, fairness, safety, digital judgement and decision making.
- Difficulty mix: 8 Level 1, 10 Level 2, 8 Level 3, 4 Level 4.
- No cosmetic context rewrites or repeated stems.

### Bahagian B — 70

Internal REQOO blueprint:

- IQ: 10
- Matematik: 20
- Bahasa Melayu: 8
- English: 8
- Sains: 8
- Teknologi/RBT: 6
- Pengetahuan Am: 6
- Penyelesaian Masalah: 4

Rules:

- Four-option MCQ with one correct answer.
- Correct-answer positions balanced 18/18/17/17 across A/B/C/D.
- Difficulty mixed from direct knowledge to multi-step reasoning.
- Math covers whole numbers, fractions, decimals/money, ratio, percentage, time, measurement, geometry, data, rate, probability and multi-step contextual reasoning.
- IQ covers sequence, analogy, classification, deduction, ordering, rule discovery, constraint logic, direction and coding.
- BM/English include reading/inference and functional language, not grammar-only drilling.
- Science/RBT prioritise application and interpretation alongside core knowledge.
- Pengetahuan Am uses durable Malaysian/general civic knowledge rather than rapidly ageing trivia.
- Structured diagrams are used only where they genuinely support the task.

### Bahagian C — 3

- Three distinct themes.
- Minimum practice target 100 words for Tingkatan 1.
- Prompts require explanation, reasons, examples or actions.

## Quality gates before merge

1. Structural audit: 30 / 70 / 3.
2. A format and scoring audit.
3. Exact B blueprint audit.
4. Independent calculation and answer-key verification.
5. Duplicate/template audit.
6. Visual schema and answer relationship audit.
7. Simulator renderer regression.
8. Human read-through of all 100 objective items and all 3 writing prompts.

Set 02–50 rebuild does not start until Set 01 passes this gate.

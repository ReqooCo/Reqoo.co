# Set 01 Gold Standard Rebuild Plan

Rollback safety point: `rollback/pksk-before-content-rebuild-20260915` at commit `9889871a367cd02dde226ec58cc495e125e47c16`.

This document defines the quality gate before any content replacement is merged.

## Public PKSK structure benchmark

- Bahagian A: 30 objective items, Kecerdasan Insaniah (EQ/SQ/SSQ), no simple right/wrong interpretation; partial-credit/profile-response style and dichotomous items are represented in current public PKSK format references.
- Bahagian B: 70 objective items, Kecerdasan Intelek including IQ, language, mathematical/scientific/technology problem solving and general knowledge.
- Bahagian C: choose 1 from 3 writing prompts.

## REQOO Set 01 lock

### Bahagian A — 30 items

- 20 situational graded-response items.
- 10 direct `Setuju / Tidak setuju` items.
- Situational responses use plausible alternatives with `3/2/1/0` maturity scoring, not one obvious correct answer plus three nonsense answers.
- EQ/SQ/SSQ coverage must be balanced across empathy, self-regulation, responsibility, integrity, resilience, communication, cooperation, fairness, safety, digital judgement and decision making.
- Difficulty must be mixed inside the set: approximately 8 Level 1, 10 Level 2, 8 Level 3, 4 Level 4.
- No duplicate stem or cosmetic context rewrite.

### Bahagian B — 70 items

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

- 4-option MCQ, one correct answer.
- Answer positions A/B/C/D balanced.
- Difficulty mixed from direct knowledge to multi-step reasoning.
- Math must include arithmetic, fractions/decimals, ratio, percentage, money, time, measurement, geometry, data interpretation and multi-step contextual reasoning; no repeated number-swap template series.
- IQ must include sequence, analogy, classification, spatial/logical relation, deduction and rule discovery.
- BM/English must include grammar plus reading/inference rather than grammar-only drilling.
- Sains/RBT must test application and interpretation, not recall only.
- Pengetahuan Am must be suitable for Malaysian upper-primary pupils and avoid time-sensitive trivia that ages quickly.
- Meaningful table/diagram/visual items should be included where the skill benefits from it.

### Bahagian C — 3 prompts

- Three distinct themes.
- Clear task, suitable for Tingkatan 1 practice.
- Encourage explanation, reasons, examples and proposed action rather than one-line factual recall.

## Quality gates before merge

1. Structural audit passes 30/70/3.
2. A format/scoring audit passes.
3. B blueprint passes exactly.
4. Answer-key and calculation verification passes.
5. Duplicate/template audit passes.
6. Visual-answer relationship passes.
7. Renderer regression passes.
8. Human read-through of all 100 objective items + 3 writing prompts.

No Set 02–50 rebuild starts until Set 01 passes this standard.

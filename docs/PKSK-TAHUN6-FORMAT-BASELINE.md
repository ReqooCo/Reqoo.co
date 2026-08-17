# PKSK Tahap 2 / Tahun 6 — Format Baseline

## Project target

This generator is for **Tahun 6 pupils preparing for PKSK entry to Tingkatan 1**, including SBP and other schools using the PKSK pathway. It is not a UPKK generator and not a generic 60/100-question exam generator.

## Current PKSK structure

### Bahagian A — Kecerdasan Insaniah

- 30 items
- 20% of overall PKSK score
- EQ: Kecerdasan Emosi
- SQ: Kecerdasan Rohani
- SSQ: Kecerdasan Insaniah/Sosial
- Objective graded-response style; do not treat this as an ordinary right/wrong academic MCQ bank.

### Bahagian B — Kecerdasan Intelek

- 70 items
- 70% of overall PKSK score
- IQ / Kecerdasan Intelek
- Bahasa Melayu
- Bahasa Inggeris
- Penyelesaian Masalah Matematik
- Penyelesaian Masalah Sains
- Penyelesaian Masalah Teknologi
- Pengetahuan Am
- Academic content for a Tahun 6 preparation product is based on the relevant primary-school range, with emphasis on application and reasoning rather than routine drill.

### Bahagian C — Artikulasi Penulisan

- 3 writing prompts are presented
- Candidate chooses 1
- Bahasa Melayu
- Minimum 100 words for Tingkatan 1 candidate preparation
- Open response; the simulator may score using a defined rubric, but must not pretend to reproduce an official confidential scoring algorithm.

## Product baseline for 50 practice sets

Every set contains:

- A: 30 items
- B: 70 items
- C: 3 writing choices

Therefore each set has 100 objective items plus 3 writing choices.

## Content distribution

Part B must deliberately cover the seven domains above. The exact count per domain is controlled by the blueprint rather than a simplistic equal split, so that the resulting paper remains natural and varied.

Mathematics should be relatively challenging and reasoning-heavy. Science and Technology should use application/problem-solving. Visuals are used only where they materially contribute to solving the item.

## Anti-AI / anti-repetition baseline

The generator must reject:

- exact duplicates;
- semantic duplicates;
- same concept + same reasoning with only names/numbers changed;
- context recycling;
- template-stem recycling at abnormal frequency;
- answer-pattern leakage;
- distractors that are random or obviously machine-made;
- awkward literal-translation Malay;
- questions that can be answered from wording tricks rather than the intended construct.

Every question receives Question DNA, deterministic seed, lineage, validation results and cross-set collision checks.

## Locked project baseline

**Set 01** remains the project reference/locked baseline when its approved content is available. New sets must reduce contextual and semantic similarity to Set 01 and to every other locked set.

## Production safety

Do not delete or overwrite locked question data. Do not use the old UPKK files. Do not use a generic legacy 60-question or 100-question structure. Production data is created only after the V45 persistence, QA, regression, red-team and release gates pass.

## Sources checked

- KPM public announcement: Permohonan Kemasukan Ke Sekolah Khusus dan MRSM Tahun 2027, updated 31 July 2026.
- Public PKSK format references describing A=30, B=70, C=3 prompts choose 1 and 20/70/10 weighting.

This document is a training-product baseline, not a claim that the internal KPM item bank or confidential scoring algorithm is public.

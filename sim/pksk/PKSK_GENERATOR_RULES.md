# PKSK Generator Rules — LOCKED

## Engine
- Production generator: **V45.10**.
- Do not change generator version for a new set unless a reproducible bug is found.
- GitHub Actions is NOT a dependency for production generation.
- Partial generation is allowed; partials must never be mistaken for production.

## Structure
- Bahagian A: 30 questions.
- Bahagian B: 70 questions.
- Bahagian C: 3 writing prompts.
- Production total: 103 items.

## Bahagian A
- Must include varied constructs: Setuju/Tidak Setuju, situational judgement, empathy/EQ, social judgement/SQ/SSQ, accountability, decision-making, resilience, collaboration and reflection.
- Target answer-position distribution: 8/8/7/7.
- Avoid making the correct option systematically the longest.
- Distractors must be plausible, not absurd or grammatically broken unless the question specifically tests language.

## Cross-set freshness
- Every new set must be checked against ALL previous production sets.
- Check exact duplicate stems AND meaningful semantic/context collision.
- Do not recycle the same scenario merely by changing names or locations.
- If collision is found, regenerate/replace the item before production.

## Mathematics — mandatory human-style review
Every Mathematics question must pass BOTH:
1. Programmatic arithmetic verification.
2. Human-style read-through: read the question as a human examiner would, calculate independently, and inspect every option.

Human-style review must confirm:
- The wording is unambiguous.
- The stated data are sufficient.
- The intended answer is mathematically correct.
- Exactly ONE option is correct.
- No option is accidentally equivalent to another.
- Units/currency/rounding are correct.
- Distractors are plausible and derived from realistic mistakes.
- If the question itself is wrong or ambiguous, **change the question**, not merely the answer key.

## General QA
- 100 MCQ items have unique IDs and unique stems within the set.
- C prompts are distinct and assessable with the agreed rubric.
- `legacy_content_used` must be false for fresh sets.
- JSON must only be published after all gates PASS.
- A failed QA item is regenerated/repaired; never publish a known failure.

## Production flow
Generate → cross-check previous sets → human-style answer review → Mathematics verification → structural QA → convert to JSON → upload production → final re-read of uploaded JSON.

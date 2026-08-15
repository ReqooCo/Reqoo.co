# REQOO PKSK Bank Engine

Reusable engine for building and auditing the PKSK question bank.

## Locked production architecture

- 10 sets per production block.
- 60 questions per set.
- 600 questions per block.
- 6 constructs balanced at 100 each:
  - EQ
  - SQ
  - SSQ
  - IQ
  - Pengetahuan Am
  - Penyelesaian Masalah
- 120 question families x 5 variants.

## Anti-clue rules

1. The correct answer must not be obvious because it is the longest option.
2. Exclusive cue words must not identify the correct answer.
3. Decimal formatting must not identify the correct answer. If decimals are used, the distractors must be designed so the decimal itself is not the clue.
4. Four options must be unique.
5. Answer index must be valid.

## Similarity and duplication gates

- No exact duplicate question.
- Normalized similarity >= 0.85 is a hard-review/reject threshold for production.
- Similarity checking is performed against the locked historical bank, not only inside the new block.

## Promotion rule

A bank is **not promoted into the production/repo bank** until the final bank passes three complete audit passes.

### Triple-check sequence

**Pass 1 — Structural**
- count
- IDs
- construct balance
- family/variant coverage
- four unique options
- valid answer index

**Pass 2 — Editorial/content**
- answer-length clue
- exclusive-word clue
- decimal clue
- exact duplicates
- high similarity

**Pass 3 — Final repeat**
- run the complete audit again on the final normalized/exported bank
- status must be PASS
- only then promote the bank into the repo/production data

## Important limitation

The engine is an editorial/engineering gate. It does **not** prove empirical difficulty, discrimination, distractor functioning or DIF. Those require response data from real/pilot users.

## Current locked bank

Sets 11–50 have been produced as 2,400 items. Set 41–50 is currently exported outside the repo and must undergo the requested full-bank triple audit before being promoted into the production question-bank repository.

## Reuse

When continuing PKSK production, recall this document and `tools/pksk_bank_engine.py` rather than rebuilding the rules from scratch.

# PKSK Master Bank Rebuild V1

## Why this replaces the set-by-set rebuild

The current Set 01 -> Set 02 -> Set 03 workflow makes it too easy to repeat the same question skeleton and only change numbers, names or context. This rebuild reverses the process: create complete section banks first, validate them globally, then assemble Set 01-50 only after the banks are clean.

This is an internal REQOO content design. It is not a claim of an official KPM subject blueprint.

## Locked totals

### Bahagian A
- 30 questions x 50 sets = **1,500 questions**
- Internal format target: **1,000 situational graded-response + 500 direct Setuju/Tidak setuju**
- EQ/SQ/SSQ coverage is balanced across the full bank, not generated in a fixed repeating order.

### Bahagian B
- 70 questions x 50 sets = **3,500 questions**
- Locked REQOO totals across the full bank:
  - Matematik: 1,000
  - IQ: 500
  - Bahasa Melayu: 400
  - English: 400
  - Sains: 400
  - Teknologi/RBT: 300
  - Pengetahuan Am: 300
  - Penyelesaian Masalah: 200

### Bahagian C
- 3 prompts x 50 sets = **150 prompts**
- Prompts must vary by purpose, audience, context, reasoning demand and writing form.

## Core rule: author first, assemble later

Questions are not written as "Set 04 Question 1" or "Set 21 Question 7". Every item is created as a standalone bank item with metadata. Set numbers are assigned only after the whole bank passes QA.

## Required item metadata

Every bank item must carry enough metadata to stop superficial number-swapping:

- `bankId`
- `section`
- `domain`
- `construct`
- `difficultyScore` (continuous internal score, not just Set level)
- `cognitiveDemand`
- `reasoningForm`
- `contextFamily`
- `presentationForm`
- `patternSignature`
- `answerIndex` / graded weights as applicable
- `visualKind` when required
- `factSource` for time-sensitive/general-knowledge facts when applicable
- `reviewStatus`

## Diversity rules

A new item fails editorial QA if it is only an old item with changed numbers, names, objects or places.

Across the full bank:

1. Exact stem duplicates: **0**.
2. Normalised duplicates after removing numbers/names/units: **0**.
3. Same `patternSignature` cannot be used as a number-rotation template.
4. Reusing the same concept is allowed only when at least two of these change materially:
   - reasoning path,
   - representation,
   - context,
   - information structure,
   - decision requirement,
   - number of steps,
   - distractor logic.
5. Neighbouring sets must not open with the same domain/pattern sequence.
6. The first 10-15 questions of each assembled set receive an additional sequence-similarity audit so Set 01/02/03 do not feel like reskins of one another.

## Difficulty progression

Difficulty is assigned **before** set assembly.

Every set remains mixed so it still feels like a realistic assessment, but the target average difficulty rises gradually from Set 01 to Set 50.

Internal progression bands:
- Sets 01-10: foundation -> lower intermediate
- Sets 11-20: lower intermediate -> intermediate
- Sets 21-30: intermediate
- Sets 31-40: intermediate -> advanced
- Sets 41-50: advanced / highest internal challenge

The assembler must avoid a crude rule such as "all Set 40 questions = Level 4". Each set keeps easier, medium and harder items; only the centre of gravity moves upward.

## Bahagian A authoring strategy

Build the full 1,500-item pool by construct and situation family, not by set number.

Situational questions must vary among school, family, online behaviour, teamwork, safety, leadership, fairness, conflict, planning, resilience, responsibility, empathy, integrity, communication and unfamiliar situations.

Four-response items should use plausible graded choices. Do not make one obviously angelic answer and three cartoonishly bad answers.

Direct Setuju/Tidak setuju items must vary wording and construct. Avoid blocks of statements that all have the same moral tone or predictable positive/negative alternation.

## Bahagian B authoring strategy

Build one global bank per domain, then mix domains during assembly.

Especially for Matematik/IQ/Sains/problem-solving, the bank must deliberately vary task shapes:
- direct computation,
- reverse reasoning,
- missing information,
- tables/data,
- diagrams,
- comparison,
- estimation,
- multi-step constraints,
- pattern inference,
- error analysis,
- choosing a strategy,
- interpreting a result,
- real-world application.

Changing only 24 -> 36 or 30% -> 40% is not a new question pattern.

## Bahagian C authoring strategy

Create 150 prompts first. Tag each by purpose and writing demand, for example:
- propose a solution,
- explain a decision,
- plan an activity,
- evaluate options,
- respond to a social/safety issue,
- reflective response,
- persuasive response,
- procedural/functional writing.

Repeated school-event prompts with only the event name changed are rejected.

## Global QA before set assembly

Do not assemble Set 01-50 until the three banks pass:

- count/quota validation,
- answer validation,
- math/calculation verification,
- factual verification where needed,
- exact duplicate scan,
- normalised duplicate scan,
- semantic/template similarity clustering,
- pattern-signature frequency audit,
- visual-answer relationship audit,
- language/grammar review,
- difficulty distribution review.

## Assembly phase

Only after the master banks are approved:

1. Sort/tag items by difficulty and construct.
2. Allocate items into 50 sets using the locked section/domain quotas.
3. Increase target average difficulty gradually from Set 01 to Set 50.
4. Balance answer positions per set.
5. Avoid repeated domain order and repeated opening patterns.
6. Run final per-set + cross-set QA.
7. Replace simulator set files in one controlled release branch.

## Current production status

Existing Set 01-03 may remain live temporarily, but they are **not** the source template for Set 04-50. The master-bank branch is the new content rebuild path. No payment, licensing, dashboard, API or AI-review logic is to be changed as part of this rebuild.

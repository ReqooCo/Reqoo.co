# PKSK Master Bank Rebuild V1

## Why this replaces the set-by-set rebuild

The current Set 01 -> Set 02 -> Set 03 workflow makes it too easy to repeat the same question skeleton and only change numbers, names or context. This rebuild reverses the process: create complete section banks first, validate them globally, then assemble the final sets only after the banks are clean.

Quality is now prioritised over quantity. The product target is reduced from 50 sets to **20 premium sets**. This is an internal REQOO content design. It is not a claim of an official KPM subject blueprint.

## Locked totals

### Bahagian A
- 30 questions x 20 sets = **600 questions**
- Internal format target: **400 situational graded-response + 200 direct Setuju/Tidak setuju**
- EQ/SQ/SSQ coverage is balanced across the full bank, not generated in a fixed repeating order.

### Bahagian B
- 70 questions x 20 sets = **1,400 questions**
- Locked REQOO totals across the full bank:
  - Matematik: 400
  - IQ: 200
  - Bahasa Melayu: 160
  - English: 160
  - Sains: 160
  - Teknologi/RBT: 120
  - Pengetahuan Am: 120
  - Penyelesaian Masalah: 80

### Bahagian C
- 3 prompts x 20 sets = **60 prompts**
- Prompts must vary by purpose, audience, context, reasoning demand and writing form.

### Total master-bank size
- Bahagian A: 600
- Bahagian B: 1,400
- Bahagian C: 60
- **Total: 2,060 original items/prompts**

## Core rule: author first, assemble later

Questions are not written as "Set 04 Question 1" or "Set 17 Question 7". Every item is created as a standalone bank item with metadata. Set numbers are assigned only after the whole bank passes QA.

No section is assembled into sets while that section's full bank is still being authored. We finish the bank first, audit it globally, then distribute it.

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
6. The first 10-15 questions of each assembled set receive an additional sequence-similarity audit so sets do not feel like reskins of one another.
7. The same construct may recur, but not with the same narrative rhythm, option logic and answer path.
8. Number replacement alone never counts as a new Matematik, IQ or problem-solving item.

## Difficulty progression

Difficulty is assigned **before** set assembly.

Every set remains mixed so it still feels like a realistic assessment, but the target average difficulty rises gradually from Set 01 to Set 20.

Internal progression bands:
- Sets 01-04: foundation
- Sets 05-08: foundation -> lower intermediate
- Sets 09-12: intermediate
- Sets 13-16: intermediate -> advanced
- Sets 17-20: advanced / highest internal challenge

The assembler must avoid a crude rule such as "all Set 20 questions = Level 4". Each set keeps easier, medium and harder items; only the centre of gravity moves upward.

## Bahagian A authoring strategy

Build the full **600-item pool** by construct and situation family, not by set number.

Situational questions must vary among school, family, online behaviour, teamwork, safety, leadership, fairness, conflict, planning, resilience, responsibility, empathy, integrity, communication, decision-making and unfamiliar situations.

Four-response items should use plausible graded choices. Do not make one obviously angelic answer and three cartoonishly bad answers.

Direct Setuju/Tidak setuju items must vary wording and construct. Avoid blocks of statements that all have the same moral tone or predictable positive/negative alternation.

Before any Set 01-20 allocation, all 600 A items must pass global similarity and construct-balance QA.

## Bahagian B authoring strategy

Build one complete global bank per domain, then mix domains only during assembly.

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

The full 1,400-item B bank must be completed and audited before assigning any B item to Set 01-20.

## Bahagian C authoring strategy

Create all **60 prompts first**. Tag each by purpose and writing demand, for example:
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

Do not assemble Set 01-20 until the three banks pass:

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
- difficulty distribution review,
- opening-sequence diversity simulation.

## Assembly phase

Only after the master banks are approved:

1. Sort/tag items by difficulty, construct, reasoning form and context family.
2. Allocate items into 20 sets using the locked section/domain quotas.
3. Increase target average difficulty gradually from Set 01 to Set 20.
4. Balance answer positions per set.
5. Avoid repeated domain order and repeated opening patterns.
6. Ensure adjacent sets have visibly different feel, context rhythm and reasoning mix.
7. Run final per-set + cross-set QA.
8. Replace simulator set files in one controlled release branch.

## Release rule

Do not publish a set merely because its count is complete. A smaller number of genuinely different, well-audited sets is preferred over a larger bank of repeated templates.

If 20 premium sets perform well commercially and users need more, a later Volume 2 can be authored from a fresh master bank rather than extending the same templates.

## Current production status

Existing Set 01-03 may remain live temporarily, but they are **not** the source template for future content. The master-bank branch is the new content rebuild path. The final release will rebuild Set 01-20 from the approved global banks. No payment, licensing, dashboard, API or AI-review logic is to be changed as part of this rebuild.

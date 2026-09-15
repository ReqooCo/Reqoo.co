# PKSK Master Bank Rebuild V1

## Final locked direction

REQOO will deliver **50 PKSK practice sets**. We do **not** author Set 01, then Set 02, then Set 03. We author the complete Bahagian A, Bahagian B and Bahagian C master banks first. Only after all questions are complete and globally audited do we assign them to Set 01-50 by difficulty, suitability and diversity.

This is an internal REQOO content design. It is not a claim of an official KPM subject blueprint.

## Locked totals

### Bahagian A
- 30 questions x 50 sets = **1,500 questions**.
- Keep the agreed format used by the Gold standard: **1,000 situational graded-response + 500 direct Setuju/Tidak setuju**.
- EQ/SQ/SSQ coverage is balanced across the full bank.
- Do not generate A in a fixed repeating EQ -> SQ -> SSQ sequence.

### Bahagian B
- 70 questions x 50 sets = **3,500 questions**.
- Keep the agreed REQOO internal subject mix per set. Across the complete bank this gives:
  - Matematik: **1,000**
  - IQ: **500**
  - Bahasa Melayu: **400**
  - English: **400**
  - Sains: **400**
  - Teknologi/RBT: **300**
  - Pengetahuan Am: **300**
  - Penyelesaian Masalah: **200**

### Bahagian C
- 3 prompts x 50 sets = **150 prompts**.
- Prompts vary by purpose, audience, context, reasoning demand and writing form.

### Total master-bank size
- Bahagian A: **1,500**
- Bahagian B: **3,500**
- Bahagian C: **150**
- **Total: 5,150 items/prompts**

## Non-negotiable workflow

1. Finish all **1,500 Bahagian A** items first as a global bank.
2. Finish all **3,500 Bahagian B** items as global domain banks.
3. Finish all **150 Bahagian C** prompts as a global bank.
4. Do not allocate unfinished banks to Set 01-50.
5. Run global QA across all completed banks.
6. Tag every item for difficulty, construct, reasoning form, context and presentation.
7. Only then assemble Set 01-50.
8. Run final per-set and cross-set QA before release.

The set number is therefore an **output of the assembly process**, not an input to question authoring.

## Repetition rule

The aim is variety, not artificial uniqueness at the expense of syllabus coverage.

- The **exact same question/stem must not be repeated**.
- A concept, construct or skill **may recur** across the 50 sets.
- A similar question family may recur at roughly **10-set spacing** when useful for reinforcement.
- If a concept or pattern recurs, the new item must have a **different difficulty or cognitive demand**, and must materially change at least one additional element such as reasoning path, representation, information structure, context, number of steps, decision requirement or distractor logic.
- Merely changing numbers, names, objects, places or units does **not** count as a different question.
- During assembly, near-identical `patternSignature` items should normally not appear more than once inside the same rolling 10-set window unless editorial review confirms that the reasoning and difficulty are materially different.
- Repetition is therefore controlled by **pattern + reasoning + difficulty**, not by keyword alone.

### Bahagian C repetition

A broad theme may return later, but the task must change materially. For example, the same environmental theme could appear once as a proposal, later as an evaluation of two options, and later as a reflective response. Repeating the same school-event prompt with only the event name changed is rejected.

## Required item metadata

Every bank item must carry enough metadata for global assembly and similarity control:

- `bankId`
- `section`
- `domain`
- `construct`
- `difficultyScore`
- `cognitiveDemand`
- `reasoningForm`
- `contextFamily`
- `presentationForm`
- `patternSignature`
- `answerIndex` / graded weights as applicable
- `visualKind` when applicable
- `factSource` for time-sensitive/general-knowledge facts when applicable
- `reviewStatus`

## Bahagian A authoring strategy

Build all **1,500 A items** by construct and situation family, never by set number.

Situational questions should rotate meaningfully across school, family, online behaviour, teamwork, safety, leadership, fairness, conflict, planning, resilience, responsibility, empathy, integrity, communication, decision-making and unfamiliar situations.

Four-response items use plausible graded choices. Avoid one obviously perfect answer with three ridiculous options.

Direct Setuju/Tidak setuju items vary wording, direction and construct. Avoid predictable moral wording or a mechanical positive/negative sequence.

A repeated construct is acceptable if the later item genuinely tests it at another level or through a different reasoning demand.

## Bahagian B authoring strategy

Build complete global banks by domain before any set allocation.

Especially for Matematik, IQ, Sains and Penyelesaian Masalah, deliberately vary task forms such as:
- direct computation,
- reverse reasoning,
- missing information,
- tables and data,
- diagrams and spatial interpretation,
- comparison,
- estimation,
- multi-step constraints,
- pattern inference,
- error analysis,
- choosing a strategy,
- interpreting a result,
- real-world application,
- elimination from conditions,
- combining information from two sources.

A later question may revisit fractions, ratios, patterns or another skill, but it must not be a number-swapped clone. The later version can deliberately be harder or easier as long as its reasoning demand is genuinely different.

## Bahagian C authoring strategy

Create all **150 prompts first**. Tag each by purpose and writing demand, including:
- propose a solution,
- explain a decision,
- plan an activity,
- evaluate options,
- respond to a social/safety issue,
- reflective response,
- persuasive response,
- procedural/functional writing,
- compare alternatives,
- justify a choice.

## Difficulty progression

Difficulty is tagged **before** set assembly.

Each final set remains mixed, but its average difficulty increases progressively:
- Sets 01-10: foundation -> lower intermediate
- Sets 11-20: lower intermediate -> intermediate
- Sets 21-30: intermediate
- Sets 31-40: intermediate -> advanced
- Sets 41-50: advanced / highest internal challenge

Do not make all questions in a late set difficult. Each set still needs easier, medium and harder items; only the centre of gravity rises.

When a concept is deliberately repeated later, use the repetition to increase or alter the challenge rather than merely changing numbers.

## Global QA before assembly

No final set assembly until all three master banks pass:

- count/quota validation,
- answer-key validation,
- mathematical/calculation verification,
- factual verification where needed,
- exact duplicate scan,
- normalised duplicate scan,
- semantic/template similarity clustering,
- `patternSignature` frequency audit,
- rolling 10-set recurrence simulation,
- visual-answer relationship audit,
- language/grammar review,
- difficulty distribution review.

## Final assembly of Set 01-50

After the banks are complete and approved:

1. Allocate 30 A + 70 B + 3 C to every set.
2. Preserve the agreed A and B format/quotas.
3. Raise average difficulty gradually from Set 01 to Set 50.
4. Balance B answer positions.
5. Vary domain order and opening sequence.
6. Prevent neighbouring sets from sharing the same question rhythm.
7. Apply the rolling 10-set repetition rule.
8. Run an additional similarity audit on the first 10-15 questions of every set.
9. Run full per-set and cross-set QA.
10. Replace simulator set files only after the complete 50-set arrangement is approved.

## Current production status

Existing Set 01-03 may remain live temporarily, but they are not templates for Set 04-50. The branch `rebuild/pksk-master-bank-v1` is the new source of truth for content rebuilding. The final release will reconstruct **all Set 01-50** from the completed master banks. No payment, licensing, dashboard, API or AI-review logic is changed as part of this content rebuild.

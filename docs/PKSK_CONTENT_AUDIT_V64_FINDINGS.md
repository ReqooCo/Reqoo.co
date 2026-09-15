# PKSK Content Audit V64 — Findings

Scope: live simulator Set 01–50. This is a diagnostic audit only; question-bank content is unchanged.

## Locked REQOO targets used

- Bahagian A: 30 items, Kecerdasan Insaniah / EQ-SQ-SSQ, situational/profile-response design, including direct Setuju/Tidak Setuju items.
- Bahagian B: 70 items with internal REQOO mix: IQ 10, Matematik 20, Bahasa Melayu 8, English 8, Sains 8, Teknologi/RBT 6, Pengetahuan Am 6, Penyelesaian Masalah 4.
- Bahagian C: 3 prompts, choose 1.
- Difficulty must not be represented by one fixed level for all items in a set.
- Avoid exact/template duplication and obvious one-correct moralistic distractors in Bahagian A.
- Visual/data interpretation should appear where the skill genuinely requires it.

Important: the exact Bahagian B subject counts above are an internal REQOO design lock, not a claim that KPM publishes that exact split.

## Full-set results

- Files audited: **50**.
- Structural A/B/C count issues: **0**. Every set has A=30, B=70 and C=3.
- Sets failing the locked Bahagian B distribution: **50/50**.
- Sets containing four-option Setuju/Tidak Setuju items: **46/50**.
- Sets using one-hot scoring in four-option Bahagian A items: **47/50**.
- Sets with four-option partial-credit Bahagian A items: **3/50**.
- Sets with zero visuals across the audited IQ/Math/Science/RBT/Problem-Solving domains: **10/50**.
- Exact duplicate Bahagian A stems across the bank: **450 duplicate groups**.
- Exact duplicate Bahagian B stems: **4 duplicate groups**.
- Normalized repeated-template groups: **40 in A**, **165 in B**.

## Bahagian A verdict

**Structure passes, assessment design does not yet pass.**

Set 01–03 use partial-credit response patterns much closer to the intended Kecerdasan Insaniah design. From Set 04 onward most four-option items become one-hot (one answer receives all credit, the other three receive zero), which turns the section into a normal right/wrong MCQ rather than a graded maturity/profile response.

The current bank also treats Setuju/Tidak Setuju as four reasoned choices in most sets. For the direct dichotomous items, the locked REQOO design should use two choices — `Setuju` / `Tidak setuju` — while situational EQ/SQ/SSQ items can retain four plausible responses with graded/partial-credit weights.

Difficulty metadata is also too coarse: each set currently carries one single planned level across all 30 A items (Set 01 level 1, Set 02 level 2, Set 03 level 3, most later sets level 4). The target is a mix of item difficulty within a set, with overall progression between sets.

Template repetition is severe. Examples of normalized A stems occur up to **60 times**, including repeated decision, evidence-checking, criticism, responsibility, planning and peer-support situations. Changing context labels is not enough to make these meaningfully different items.

## Bahagian B verdict

**The current 70-item banks do not satisfy the locked REQOO blueprint.** All 50 sets differ from the required internal distribution.

Common issues include standalone `Sejarah`, `Pendidikan Islam`, and in one set `Kemahiran Berfikir` categories instead of fitting content into the locked IQ / Pengetahuan Am / Penyelesaian Masalah framework. Set 11–50 commonly follow a repeated 14 Math / 10 BM / 10 English / 10 Science / 10 RBT / 8 History / 8 Islamic Studies shape rather than the locked mix.

Several individual BM, English, Science, Math and RBT question forms are usable as PKSK-style objective questions. The problem is the **overall domain balance, cognitive variety and repetition**.

Normalized B templates repeat heavily. In Set 21–50, many Math forms repeat **30 times** with only numbers changed (equal division, percentage, time, addition, average, fraction, cuboid volume, ratio, straight-line angle, area, perimeter and coordinates). These are valid skills, but repeated number substitution is not sufficient for a premium 50-set bank.

Sets 01–10 have no detected visuals in the audited reasoning/Math/Science/RBT/problem-solving domains. Set 11–50 have some visuals, but visual/data/diagram use still needs item-level QA rather than being decorative.

## Release decision

**Current bank: HOLD for content repair.**

The simulator, scoring, payment and AI-review systems can remain live for development/testing, but the question bank should not be treated as final premium PKSK content until the content repair passes a second audit.

Recommended repair order:

1. Lock A format: 20 situational graded-response items + 10 direct Setuju/Tidak Setuju items per set, with EQ/SQ/SSQ coverage and plausible distractors.
2. Rebuild A scoring so situational items use partial credit rather than one-hot right/wrong scoring.
3. Diversify A contexts and constructs; eliminate exact and normalized template repetition across sets.
4. Rebuild B to the locked 70-item REQOO mix while keeping the distinction between official PKSK component descriptions and REQOO's internal subject allocation.
5. Raise B cognitive variety: pattern/IQ, inference, data, multi-step calculation, strategy, interpretation and contextual problem solving; stop number-only template rotation.
6. Add meaningful visuals/diagrams/tables where the skill requires them and validate every visual-answer relationship.
7. Run structural + semantic + answer/calculation + duplicate + visual QA before each set is released.

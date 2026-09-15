# Set 01 Gold Candidate — Review Notes

This branch is intentionally isolated from production.

## What changes

Only Set 01 question content is replaced. Runtime, payment, licensing, device access, dashboard and AI review code are not changed.

### Bahagian A

- 30 items.
- 20 situational graded-response questions with 3/2/1/0 scoring.
- 10 direct Setuju/Tidak setuju items.
- Mixed EQ/SQ/SSQ constructs and mixed difficulty within the set.

### Bahagian B

- 70 MCQ.
- Exact internal REQOO blueprint: IQ 10, Math 20, BM 8, English 8, Science 8, Technology/RBT 6, General Knowledge 6, Problem Solving 4.
- Balanced correct answer positions 18/18/17/17.
- Six structured visual questions.
- Math and reasoning templates are varied rather than produced by repeated number substitution.

### Bahagian C

- 3 distinct prompts; choose 1.
- 100-word practice minimum.

## Automated gates passed

- Gold structural/content validator.
- Visual renderer regression.
- Client/server scoring contract regression, including two-option Bahagian A.
- Node JSON load check.
- Cloudflare branch preview deployment.

## Safety

Rollback branch remains frozen at:

`rollback/pksk-before-content-rebuild-20260915`

Commit:

`9889871a367cd02dde226ec58cc495e125e47c16`

Do not merge until Set 01 has been visually tested in the branch preview on desktop/mobile.

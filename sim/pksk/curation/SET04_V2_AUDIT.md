# Set 04 — REQOO Item Standard V2 Audit

Status: **GOLD CANDIDATE**
Branch: `audit/pksk-live-50set-clone-v1`
Live simulator: **UNCHANGED**

## Before V2 repair
- Item-level: 66 KEEP_CANDIDATE / 34 REWRITE.
- Bahagian A formal V2 format: FAIL.
- Bahagian B locked blueprint: FAIL.
- Old B mix: BM 5, English 10, Matematik 15, Sains 10, Sejarah 10, Pendidikan Islam 10, RBT 10.

## After V2 repair
- Objective items: **100/100 KEEP_CANDIDATE**.
- Remaining V2 item flags: **0**.
- Structure: A=30, B=70, C=3 — **PASS**.
- Bahagian A: 20 situational graded + 10 direct Setuju/Tidak setuju — **PASS**.
- Bahagian B: IQ 10 / Matematik 20 / BM 8 / English 8 / Sains 8 / Teknologi-RBT 6 / Pengetahuan Am 6 / Penyelesaian Masalah 4 — **PASS**.
- B answer balance: A=18 / B=18 / C=17 / D=17 — **PASS**.
- Global duplicate/template audit for Set 04: **0 current flags**.
- Visual contract audit for Set 04: **0 current flags**.
- Automated release gate: **PASS**.

## Manual editorial correction caught outside automation
B68 originally had two combinations tied for the maximum number of books. The item was rewritten so the best answer is unique. This is retained as evidence that automated QA cannot replace human truth/editorial review.

## Decision
Set 04 is suitable as the fourth reference-quality candidate alongside Sets 01–03. It is not merged to live by this audit.

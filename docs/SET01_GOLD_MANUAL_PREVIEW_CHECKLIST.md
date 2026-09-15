# Set 01 Gold — Manual Preview Checklist

Before production merge:

- Open branch preview on desktop.
- Start Set 01 and confirm A01 renders four responses.
- Navigate to A21 and confirm only two responses render: Setuju / Tidak setuju.
- Answer a mixture of A situational and A direct items; confirm navigation/answered count works.
- Confirm B09 fraction visual renders and does not reveal answer.
- Confirm B30 data visual renders.
- Confirm B35 rectangle, B41 cuboid, B44 angle and B47 coordinate visuals render.
- Complete A+B and confirm score/result screen loads.
- Confirm Bahagian B review and AI explanation button still operate on a deliberately wrong answer.
- Start Bahagian C and confirm all three new prompts are selectable and word counter still shows minimum 100.
- Repeat key navigation on mobile width.

If any item fails, do not merge; return to the isolated rebuild branch. Production rollback reference remains `9889871a367cd02dde226ec58cc495e125e47c16`.

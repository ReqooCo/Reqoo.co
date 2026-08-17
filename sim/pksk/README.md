# REQOO PKSK — Canonical Project Home

Target simulator path:
`/pksk/`

## Scope
PKSK Tahap 2 / Tahun 6 for admission to Tingkatan 1 / Sekolah Khusus.

## Locked assessment architecture
- Bahagian A: 30 items — Kecerdasan Insaniah
- Bahagian B: 70 items — Kecerdasan Intelek
- Bahagian C: 3 writing prompts; candidate chooses 1

The simulator is a practice product, not an official KPM examination and does not reproduce official questions.

## Engineering rules
- This directory is the canonical home for all PKSK simulator/generator work.
- Do not mix PKSK with UPKK.
- Do not use legacy 60-question or 100-question generator formats.
- Locked question sets are immutable.
- Every generated question gets persistent identity, DNA, revision history and audit lineage.
- Failed candidates go to quarantine with an explicit reason; they are not silently deleted.
- Cross-set semantic/context/pattern collision checks are mandatory.
- Generator changes must pass regression/dry-run gates before production generation.

## Directory layout
- `config/` — PKSK format and generation rules
- `generator/` — generation, QA and persistence engine
- `data/` — test/master data; production locks require explicit release snapshots
- `docs/` — specifications and audit notes
- `tests/` — regression and dry-run tests
- `releases/` — immutable release manifests/snapshots

## Existing simulator
The existing landing/simulator integration remains separate from the generator engine. Do not change payment, access-control or unrelated simulator logic while developing the question generator unless explicitly requested.

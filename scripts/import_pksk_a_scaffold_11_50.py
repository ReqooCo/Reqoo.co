#!/usr/bin/env python3
from __future__ import annotations

import json
import subprocess
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
A_ROOT = ROOT / 'sim/pksk/curation/A'
SCAFFOLD_REF = 'origin/rebuild/pksk-master-bank-v1'
SCAFFOLD_ROOT = 'sim/pksk/generator/master/a/authored'

# The first 300 curated items already contribute:
# domain EQ/SQ/SSQ = 100/100/100 and format SITUATIONAL/AGREE_DISAGREE = 200/100.
# To finish at 500/500/500 and 1000/500, the remaining 120 scaffold families
# must contribute 400 items per domain and 800/400 by format.
FAMILY_QUOTA = {
    ('EQ', 'SITUATIONAL'): 27,
    ('EQ', 'AGREE_DISAGREE'): 13,
    ('SQ', 'SITUATIONAL'): 27,
    ('SQ', 'AGREE_DISAGREE'): 13,
    ('SSQ', 'SITUATIONAL'): 26,
    ('SSQ', 'AGREE_DISAGREE'): 14,
}


def git_show(path: str) -> str:
    proc = subprocess.run(
        ['git', 'show', f'{SCAFFOLD_REF}:{path}'],
        cwd=ROOT,
        text=True,
        capture_output=True,
    )
    if proc.returncode != 0:
        raise SystemExit(f'FAIL: cannot read {path} from {SCAFFOLD_REF}: {proc.stderr.strip()}')
    return proc.stdout


def live_path(set_no: int) -> Path:
    start = ((set_no - 1) // 10) * 10 + 1
    end = start + 9
    return ROOT / f'sim/pksk/simulator/sets/SET {start:02d}-{end:02d}/data/set{set_no:02d}.json'


def load_scaffold_families() -> dict[str, list[dict]]:
    families: dict[str, list[dict]] = defaultdict(list)
    total = 0
    for start in range(1, 1501, 100):
        end = start + 99
        path = f'{SCAFFOLD_ROOT}/a_{start:04d}_{end:04d}.jsonl'
        for line_no, line in enumerate(git_show(path).splitlines(), 1):
            if not line.strip():
                continue
            row = json.loads(line)
            family = row.get('repeatFamily')
            if not family:
                raise SystemExit(f'FAIL: {path}:{line_no}: missing repeatFamily')
            families[str(family)].append(row)
            total += 1
    if total != 1500:
        raise SystemExit(f'FAIL: expected 1500 scaffold rows, got {total}')
    if len(families) != 150:
        raise SystemExit(f'FAIL: expected 150 scaffold families, got {len(families)}')

    for family, rows in families.items():
        rows.sort(key=lambda x: int(x.get('variant') or 0))
        if len(rows) != 10:
            raise SystemExit(f'FAIL: scaffold family {family} has {len(rows)} rows, expected 10')
        if [x.get('variant') for x in rows] != list(range(1, 11)):
            raise SystemExit(f'FAIL: scaffold family {family} variants are not 1..10')
        if len({x.get('domain') for x in rows}) != 1 or len({x.get('format') for x in rows}) != 1:
            raise SystemExit(f'FAIL: scaffold family {family} changes domain/format')
    return families


def select_families(families: dict[str, list[dict]]) -> list[tuple[str, list[dict]]]:
    buckets: dict[tuple[str, str], list[tuple[str, list[dict]]]] = defaultdict(list)
    for family, rows in families.items():
        key = (str(rows[0].get('domain')), str(rows[0].get('format')))
        buckets[key].append((family, rows))
    for key in buckets:
        buckets[key].sort(key=lambda pair: (str(pair[1][0].get('construct') or ''), pair[0]))

    selected: list[tuple[str, list[dict]]] = []
    for key, need in FAMILY_QUOTA.items():
        available = buckets.get(key, [])
        if len(available) < need:
            raise SystemExit(f'FAIL: scaffold bucket {key} has {len(available)} families, need {need}')
        selected.extend(available[:need])

    if len(selected) != 120:
        raise SystemExit(f'FAIL: expected 120 selected families, got {len(selected)}')
    return selected


def load_live_sources() -> list[dict]:
    sources: list[dict] = []
    for set_no in range(11, 51):
        path = live_path(set_no)
        if not path.exists():
            raise SystemExit(f'FAIL: live source missing: {path}')
        payload = json.loads(path.read_text(encoding='utf-8'))
        live_a = [q for q in payload.get('questions', []) if q.get('section') == 'BAHAGIAN A']
        if len(live_a) != 30:
            raise SystemExit(f'FAIL: Set{set_no:02d} expected 30 A items, got {len(live_a)}')
        for pos, live in enumerate(live_a, 1):
            sources.append({'set': set_no, 'position': pos, 'row': live})
    if len(sources) != 1200:
        raise SystemExit(f'FAIL: expected 1200 live A sources, got {len(sources)}')
    return sources


def main() -> int:
    A_ROOT.mkdir(parents=True, exist_ok=True)
    families = load_scaffold_families()
    selected = select_families(families)
    live_sources = load_live_sources()

    selected_rows: list[dict] = []
    for family, rows in sorted(selected, key=lambda pair: (
        str(pair[1][0].get('domain')),
        str(pair[1][0].get('format')),
        str(pair[1][0].get('construct')),
        pair[0],
    )):
        selected_rows.extend(dict(x) for x in rows)

    if len(selected_rows) != 1200:
        raise SystemExit(f'FAIL: selected scaffold rows={len(selected_rows)}, expected 1200')

    enriched: list[dict] = []
    for idx, (row, source) in enumerate(zip(selected_rows, live_sources), start=301):
        live = source['row']
        original_bank_id = row.get('bankId')
        original_family = row.get('repeatFamily')
        row['bankId'] = f'A{idx:04d}'
        row['scaffoldBankId'] = original_bank_id
        row['scaffoldRepeatFamily'] = original_family
        row['sourceSet'] = source['set']
        row['sourcePosition'] = source['position']
        row['sourceId'] = live.get('id') or f"LIVE-S{source['set']:02d}-A{source['position']:02d}"
        row['legacyConstruct'] = live.get('constructFamily')
        row['legacyFormat'] = str(live.get('format') or live.get('category') or 'UNKNOWN')
        row['legacyRebuildStatus'] = live.get('rebuildStatus')
        row['reviewStatus'] = 'EDITORIAL_SCAFFOLD_FALLBACK_CANDIDATE'
        notes = list(row.get('editorialNotes') or [])
        notes.extend([
            f"Replaces legacy live Set{source['set']:02d} A{source['position']:02d}; the live item remains unchanged in production.",
            'Audited structural scaffold selected as replacement candidate because the legacy live item does not meet the current final schema/editorial standard.',
            f'Scaffold provenance: {original_bank_id} / {original_family}.',
            'Requires final editorial truth, naturalness and semantic-overlap approval before release.',
        ])
        row['editorialNotes'] = notes
        enriched.append(row)

    for set_no in range(11, 51):
        start_id = (set_no - 1) * 30 + 1
        end_id = start_id + 29
        lo = start_id - 301
        hi = lo + 30
        rows = enriched[lo:hi]
        if len(rows) != 30:
            raise SystemExit(f'FAIL: Set{set_no:02d} replacement wave has {len(rows)} rows')
        out = A_ROOT / f'rewrite_wave_{start_id:04d}_{end_id:04d}.jsonl'
        out.write_text('\n'.join(json.dumps(x, ensure_ascii=False) for x in rows) + '\n', encoding='utf-8')
        print(f'WROTE {out.name}: items=30 replacement-lineage=Set{set_no:02d}')

    domain_counts: dict[str, int] = defaultdict(int)
    format_counts: dict[str, int] = defaultdict(int)
    family_counts: dict[str, int] = defaultdict(int)
    for row in enriched:
        domain_counts[str(row.get('domain'))] += 1
        format_counts[str(row.get('format'))] += 1
        family_counts[str(row.get('repeatFamily'))] += 1

    if dict(domain_counts) != {'EQ': 400, 'SQ': 400, 'SSQ': 400}:
        raise SystemExit(f'FAIL: replacement domain quota wrong: {dict(domain_counts)}')
    if dict(format_counts) != {'AGREE_DISAGREE': 400, 'SITUATIONAL': 800} and dict(format_counts) != {'SITUATIONAL': 800, 'AGREE_DISAGREE': 400}:
        raise SystemExit(f'FAIL: replacement format quota wrong: {dict(format_counts)}')
    if len(family_counts) != 120 or any(n != 10 for n in family_counts.values()):
        raise SystemExit('FAIL: replacement family structure must be 120 families x10')

    print('PASS: Set11-50 fallback selection balanced for final A target')
    print('items=1200 families=120')
    print('domains=', dict(domain_counts))
    print('formats=', dict(format_counts))
    print('live files modified=NO')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

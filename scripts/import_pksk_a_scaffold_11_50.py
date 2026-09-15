#!/usr/bin/env python3
from __future__ import annotations

import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
A_ROOT = ROOT / 'sim/pksk/curation/A'
SCAFFOLD_REF = 'origin/rebuild/pksk-master-bank-v1'
SCAFFOLD_ROOT = 'sim/pksk/generator/master/a/authored'


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


def load_scaffold() -> dict[str, dict]:
    by_id: dict[str, dict] = {}
    for start in range(301, 1501, 100):
        end = min(start + 99, 1500)
        path = f'{SCAFFOLD_ROOT}/a_{start:04d}_{end:04d}.jsonl'
        for line_no, line in enumerate(git_show(path).splitlines(), 1):
            if not line.strip():
                continue
            row = json.loads(line)
            bid = row.get('bankId')
            if not bid:
                raise SystemExit(f'FAIL: {path}:{line_no}: missing bankId')
            by_id[bid] = row
    expected = {f'A{i:04d}' for i in range(301, 1501)}
    missing = sorted(expected - set(by_id))
    if missing:
        raise SystemExit(f'FAIL: scaffold missing IDs: {missing[:20]}')
    return by_id


def main() -> int:
    A_ROOT.mkdir(parents=True, exist_ok=True)
    scaffold = load_scaffold()
    imported = 0
    source_formats: dict[str, int] = {}

    for set_no in range(11, 51):
        path = live_path(set_no)
        if not path.exists():
            raise SystemExit(f'FAIL: live source missing: {path}')
        payload = json.loads(path.read_text(encoding='utf-8'))
        live_a = [q for q in payload.get('questions', []) if q.get('section') == 'BAHAGIAN A']
        if len(live_a) != 30:
            raise SystemExit(f'FAIL: Set{set_no:02d} expected 30 A items, got {len(live_a)}')

        start_id = (set_no - 1) * 30 + 1
        end_id = start_id + 29
        rows: list[dict] = []
        for offset, live in enumerate(live_a):
            bank_no = start_id + offset
            bid = f'A{bank_no:04d}'
            row = dict(scaffold[bid])
            legacy_format = str(live.get('format') or live.get('category') or 'UNKNOWN')
            source_formats[legacy_format] = source_formats.get(legacy_format, 0) + 1

            row['sourceSet'] = set_no
            row['sourceId'] = live.get('id') or f'LIVE-S{set_no:02d}-A{offset + 1:02d}'
            row['legacyConstruct'] = live.get('constructFamily')
            row['legacyFormat'] = legacy_format
            row['legacyRebuildStatus'] = live.get('rebuildStatus')
            row['reviewStatus'] = 'EDITORIAL_SCAFFOLD_FALLBACK_CANDIDATE'
            notes = list(row.get('editorialNotes') or [])
            notes.extend([
                f'Live Set{set_no:02d} A{offset + 1:02d} retained as lineage only.',
                'Audited structural scaffold selected as fallback because legacy live A fails the current final schema and/or editorial-quality standard.',
                'Content still requires final editorial truth/naturalness approval; live production file remains unchanged.',
            ])
            row['editorialNotes'] = notes
            rows.append(row)
            imported += 1

        out = A_ROOT / f'rewrite_wave_{start_id:04d}_{end_id:04d}.jsonl'
        out.write_text('\n'.join(json.dumps(x, ensure_ascii=False) for x in rows) + '\n', encoding='utf-8')
        print(f'WROTE {out.name}: items={len(rows)} source=Set{set_no:02d}')

    if imported != 1200:
        raise SystemExit(f'FAIL: expected 1200 imported candidates, got {imported}')
    print('PASS: imported Set11-50 A scaffold fallbacks without modifying live files')
    print('items=', imported)
    print('legacy_formats=', source_formats)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

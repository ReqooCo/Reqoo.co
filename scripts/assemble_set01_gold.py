from __future__ import annotations

import base64
import glob
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CHUNK_DIR = ROOT / 'sim/pksk/generator/gold/set01'
TARGET = ROOT / 'sim/pksk/simulator/sets/SET 01-10/data/set01.json'

LOCKED_B = {
    'IQ': 10,
    'Matematik': 20,
    'Bahasa Melayu': 8,
    'English': 8,
    'Sains': 8,
    'Teknologi/RBT': 6,
    'Pengetahuan Am': 6,
    'Penyelesaian Masalah': 4,
}
LOCKED_A_LEVELS = {1: 8, 2: 10, 3: 8, 4: 4}
LOCKED_B_ANSWERS = {0: 18, 1: 18, 2: 17, 3: 17}
VISUAL_KINDS = {
    'fraction_bar', 'five_value_data', 'rectangle',
    'cuboid', 'straight_line_angle', 'coordinate_move',
}


def die(message: str) -> None:
    raise SystemExit(f'GOLD SET01 VALIDATION FAILED: {message}')


def load_candidate() -> dict:
    paths = sorted(CHUNK_DIR.glob('chunk*.b64'))
    expected = [CHUNK_DIR / f'chunk{i:02d}.b64' for i in range(1, 11)]
    if paths != expected:
        die(f'expected chunk01..chunk10, found {[p.name for p in paths]}')
    encoded = ''.join(p.read_text(encoding='utf-8').strip() for p in paths)
    try:
        raw = base64.b64decode(encoded, validate=True)
        data = json.loads(raw.decode('utf-8'))
    except Exception as exc:
        die(f'cannot decode candidate: {exc}')
    return data


def validate(data: dict) -> None:
    if data.get('set') != 1:
        die('set must equal 1')
    qs = data.get('questions')
    writing = data.get('writing')
    if not isinstance(qs, list) or len(qs) != 100:
        die(f'questions must contain 100 items, got {len(qs) if isinstance(qs, list) else "invalid"}')
    if not isinstance(writing, list) or len(writing) != 3:
        die('writing must contain exactly 3 prompts')

    ids = [q.get('id') for q in qs]
    stems = [str(q.get('question', '')).strip().casefold() for q in qs]
    if len(ids) != len(set(ids)):
        die('duplicate question IDs')
    if len(stems) != len(set(stems)):
        die('duplicate exact question stems')

    A = [q for q in qs if q.get('section') == 'BAHAGIAN A']
    B = [q for q in qs if q.get('section') == 'BAHAGIAN B']
    if len(A) != 30 or len(B) != 70:
        die(f'A/B count must be 30/70, got {len(A)}/{len(B)}')

    situ = [q for q in A if q.get('format') == 'SITUATIONAL']
    agree = [q for q in A if q.get('format') == 'AGREE_DISAGREE']
    if len(situ) != 20 or len(agree) != 10:
        die(f'A format must be 20 situational + 10 agree/disagree, got {len(situ)}+{len(agree)}')

    for q in situ:
        opts = q.get('options', [])
        weights = q.get('weights', [])
        if len(opts) != 4 or len(set(map(str, opts))) != 4:
            die(f'{q.get("id")}: situational item needs four unique options')
        if sorted(weights) != [0, 1, 2, 3]:
            die(f'{q.get("id")}: situational weights must be a permutation of 0/1/2/3')
        if 'answerIndex' in q:
            die(f'{q.get("id")}: A situational item must not be reduced to answerIndex')

    for q in agree:
        if q.get('options') != ['Setuju', 'Tidak setuju']:
            die(f'{q.get("id")}: direct item options must be Setuju/Tidak setuju')
        if q.get('weights') not in ([3, 0], [0, 3]):
            die(f'{q.get("id")}: direct item weights must be [3,0] or [0,3]')
        if 'answerIndex' in q:
            die(f'{q.get("id")}: A direct item must score through weights, not answerIndex')

    a_levels = Counter(int(q.get('plannedLevel', 0)) for q in A)
    if dict(sorted(a_levels.items())) != LOCKED_A_LEVELS:
        die(f'A level mix mismatch: {dict(a_levels)}')
    a_cats = Counter(q.get('category') for q in A)
    if any(a_cats.get(x, 0) == 0 for x in ('EQ', 'SQ', 'SSQ')):
        die(f'A must cover EQ/SQ/SSQ: {dict(a_cats)}')

    b_counts = Counter(q.get('category') for q in B)
    if dict(b_counts) != LOCKED_B:
        die(f'B blueprint mismatch: {dict(b_counts)}')
    b_answers = Counter(q.get('answerIndex') for q in B)
    if dict(b_answers) != LOCKED_B_ANSWERS:
        die(f'B answer-position mismatch: {dict(b_answers)}')

    visuals = []
    for q in B:
        opts = q.get('options', [])
        weights = q.get('weights', [])
        ai = q.get('answerIndex')
        if len(opts) != 4 or len(set(map(str, opts))) != 4:
            die(f'{q.get("id")}: B needs four unique options')
        if not isinstance(ai, int) or not 0 <= ai < 4:
            die(f'{q.get("id")}: invalid answerIndex')
        if weights != [3 if i == ai else 0 for i in range(4)]:
            die(f'{q.get("id")}: B weights do not match answerIndex')
        if int(q.get('plannedLevel', 0)) not in (1, 2, 3, 4):
            die(f'{q.get("id")}: invalid difficulty level')
        if q.get('visual'):
            visuals.append(q['visual'])

    kinds = Counter(v.get('kind') for v in visuals if isinstance(v, dict))
    if set(kinds) != VISUAL_KINDS or any(v != 1 for v in kinds.values()):
        die(f'expected one of each supported visual kind, got {dict(kinds)}')

    for w in writing:
        if not str(w.get('title', '')).strip() or not str(w.get('prompt', '')).strip():
            die(f'{w.get("id")}: writing title/prompt missing')
        if int(w.get('min_words', 0)) != 100:
            die(f'{w.get("id")}: min_words must be 100')

    if data.get('legacy_content_used') is not False:
        die('legacy_content_used must be false')
    if data.get('rebuildVersion') != 'GOLD_V1_SET01':
        die('unexpected rebuildVersion')

    print('SET01 GOLD STRUCTURAL PASS')
    print('A categories:', dict(a_cats))
    print('A levels:', dict(sorted(a_levels.items())))
    print('B blueprint:', dict(b_counts))
    print('B answer positions:', dict(sorted(b_answers.items())))
    print('Visuals:', dict(kinds))
    print('Writing prompts:', len(writing))


def main() -> None:
    data = load_candidate()
    validate(data)
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    TARGET.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('WROTE', TARGET.relative_to(ROOT))


if __name__ == '__main__':
    main()

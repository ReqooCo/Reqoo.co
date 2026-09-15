from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SETS_ROOT = ROOT / 'sim' / 'pksk' / 'simulator' / 'sets'
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
    raise SystemExit(f'PKSK GOLD GATE FAILED: {message}')


def norm(value: object) -> str:
    text = str(value or '').casefold()
    text = re.sub(r'[^\w\s]', ' ', text, flags=re.UNICODE)
    return re.sub(r'\s+', ' ', text).strip()


def template_sig(value: object) -> str:
    text = norm(value)
    text = re.sub(r'\b\d+(?:\s*\d+)?\b', '#', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def gold_files() -> list[Path]:
    files = []
    for path in sorted(SETS_ROOT.glob('SET */data/set*.json')):
        try:
            data = json.loads(path.read_text(encoding='utf-8'))
        except Exception:
            continue
        if str(data.get('rebuildVersion', '')).startswith('GOLD_V1_SET'):
            files.append(path)
    return files


def validate_one(path: Path, data: dict) -> dict:
    set_no = int(data.get('set', 0))
    expected_version = f'GOLD_V1_SET{set_no:02d}'
    if data.get('rebuildVersion') != expected_version:
        die(f'{path}: rebuildVersion must be {expected_version}')
    if data.get('legacy_content_used') is not False:
        die(f'{path}: legacy_content_used must be false')
    if data.get('source') != 'human_authored_gold_standard':
        die(f'{path}: source must be human_authored_gold_standard')

    qs = data.get('questions')
    writing = data.get('writing')
    if not isinstance(qs, list) or len(qs) != 100:
        die(f'Set {set_no:02d}: expected 100 A+B questions')
    if not isinstance(writing, list) or len(writing) != 3:
        die(f'Set {set_no:02d}: expected 3 writing prompts')

    ids = [str(q.get('id', '')) for q in qs]
    if not all(ids) or len(set(ids)) != 100:
        die(f'Set {set_no:02d}: IDs must be non-empty and unique')
    stems = [norm(q.get('question')) for q in qs]
    if not all(stems) or len(set(stems)) != 100:
        die(f'Set {set_no:02d}: exact/normalised stems must be unique inside the set')

    A = [q for q in qs if q.get('section') == 'BAHAGIAN A']
    B = [q for q in qs if q.get('section') == 'BAHAGIAN B']
    if len(A) != 30 or len(B) != 70:
        die(f'Set {set_no:02d}: A/B must be 30/70')

    situ = [q for q in A if q.get('format') == 'SITUATIONAL']
    direct = [q for q in A if q.get('format') == 'AGREE_DISAGREE']
    if len(situ) != 20 or len(direct) != 10:
        die(f'Set {set_no:02d}: A must be 20 situational + 10 agree/disagree')
    if Counter(int(q.get('plannedLevel', 0)) for q in A) != Counter(LOCKED_A_LEVELS):
        die(f'Set {set_no:02d}: A level mix must be {LOCKED_A_LEVELS}')
    if any(q.get('category') not in {'EQ', 'SQ', 'SSQ'} for q in A):
        die(f'Set {set_no:02d}: A category outside EQ/SQ/SSQ')
    if any(Counter(q.get('weights', [])) != Counter([0,1,2,3]) or len(q.get('options', [])) != 4 for q in situ):
        die(f'Set {set_no:02d}: every situational A item needs 4 options and 0/1/2/3 weights')
    if any(q.get('options') != ['Setuju','Tidak setuju'] or q.get('weights') not in ([3,0],[0,3]) for q in direct):
        die(f'Set {set_no:02d}: direct A items must be Setuju/Tidak setuju with 3/0 scoring')
    if any('answerIndex' in q for q in A):
        die(f'Set {set_no:02d}: A must not use answerIndex')

    b_counts = Counter(q.get('category') for q in B)
    if b_counts != Counter(LOCKED_B):
        die(f'Set {set_no:02d}: B blueprint mismatch {dict(b_counts)}')
    b_answers = Counter(q.get('answerIndex') for q in B)
    if b_answers != Counter(LOCKED_B_ANSWERS):
        die(f'Set {set_no:02d}: B answer-position mismatch {dict(b_answers)}')
    for q in B:
        opts = q.get('options', [])
        ai = q.get('answerIndex')
        if len(opts) != 4 or len(set(map(str, opts))) != 4:
            die(f'Set {set_no:02d} {q.get("id")}: B needs four unique options')
        if not isinstance(ai, int) or not 0 <= ai < 4:
            die(f'Set {set_no:02d} {q.get("id")}: invalid answerIndex')
        if q.get('weights') != [3 if i == ai else 0 for i in range(4)]:
            die(f'Set {set_no:02d} {q.get("id")}: B weights do not match answerIndex')
        if int(q.get('plannedLevel', 0)) not in (1,2,3,4):
            die(f'Set {set_no:02d} {q.get("id")}: invalid difficulty level')

    visuals = [q.get('visual') for q in B if q.get('visual')]
    kinds = Counter(v.get('kind') for v in visuals if isinstance(v, dict))
    if kinds != Counter({k:1 for k in VISUAL_KINDS}):
        die(f'Set {set_no:02d}: expected exactly one of each structured visual; got {dict(kinds)}')

    write_titles = []
    for w in writing:
        if not str(w.get('title', '')).strip() or not str(w.get('prompt', '')).strip():
            die(f'Set {set_no:02d}: writing title/prompt missing')
        if int(w.get('min_words', 0)) != 100:
            die(f'Set {set_no:02d}: every writing prompt must have min_words=100')
        write_titles.append(norm(w.get('title')))
    if len(set(write_titles)) != 3:
        die(f'Set {set_no:02d}: writing titles must be unique')

    return {
        'set': set_no,
        'a_categories': dict(Counter(q['category'] for q in A)),
        'b_blueprint': dict(b_counts),
        'b_answers': dict(sorted(b_answers.items())),
        'visuals': dict(kinds),
        'stems': stems,
        'templates': [template_sig(q.get('question')) for q in qs],
        'writing_titles': write_titles,
    }


def main() -> None:
    paths = gold_files()
    if not paths:
        die('no Gold sets found')
    seen_stems: dict[str, tuple[int,str]] = {}
    seen_titles: dict[str, int] = {}
    template_refs: defaultdict[str, list[tuple[int,str]]] = defaultdict(list)
    reports = []

    for path in paths:
        data = json.loads(path.read_text(encoding='utf-8'))
        report = validate_one(path, data)
        set_no = report['set']
        for q, stem, sig in zip(data['questions'], report['stems'], report['templates']):
            if stem in seen_stems:
                other_set, other_id = seen_stems[stem]
                die(f'exact/normalised cross-set duplicate: Set {other_set:02d} {other_id} and Set {set_no:02d} {q.get("id")}')
            seen_stems[stem] = (set_no, str(q.get('id')))
            template_refs[sig].append((set_no, str(q.get('id'))))
        for title in report['writing_titles']:
            if title in seen_titles:
                die(f'writing title duplicated across Set {seen_titles[title]:02d} and Set {set_no:02d}: {title}')
            seen_titles[title] = set_no
        reports.append(report)

    repeated_templates = [(sig, refs) for sig, refs in template_refs.items() if sig and len({s for s,_ in refs}) > 1]
    repeated_templates.sort(key=lambda x: (-len(x[1]), x[0]))

    print(f'PKSK GOLD GATE PASS: {len(reports)} Gold sets')
    for r in reports:
        print(f"Set {r['set']:02d}: A={r['a_categories']} | B={r['b_blueprint']} | answers={r['b_answers']} | visuals={r['visuals']}")
    print(f'Cross-set exact stem duplicates: 0')
    print(f'Cross-set writing-title duplicates: 0')
    print(f'Near-template groups (warning only): {len(repeated_templates)}')
    for sig, refs in repeated_templates[:12]:
        print(f'  WARN {len(refs)}x {sig[:110]} :: {refs[:8]}')


if __name__ == '__main__':
    main()

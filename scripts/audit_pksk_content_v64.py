import json
import glob
import re
from collections import Counter, defaultdict

GROUPS = ['SET 01-10','SET 11-20','SET 21-30','SET 31-40','SET 41-50']
FILES = []
for group in GROUPS:
    FILES += sorted(glob.glob(f'sim/pksk/simulator/sets/{group}/data/set*.json'))

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

CAT_MAP = {
    'bahasa inggeris': 'English',
    'english': 'English',
    'bahasa melayu': 'Bahasa Melayu',
    'matematik': 'Matematik',
    'sains': 'Sains',
    'iq': 'IQ',
    'teknologi': 'Teknologi/RBT',
    'rbt': 'Teknologi/RBT',
    'teknologi/rbt': 'Teknologi/RBT',
    'pengetahuan am': 'Pengetahuan Am',
    'penyelesaian masalah': 'Penyelesaian Masalah',
    'problem solving': 'Penyelesaian Masalah',
}

VISUAL_KEYS = ('visual','image','diagram','figure','svg','visualType','visualSpec')


def norm(s):
    return re.sub(r'\s+', ' ', str(s or '')).strip()


def canon_cat(value):
    raw = norm(value)
    return CAT_MAP.get(raw.casefold(), raw or '(kosong)')


def canon_stem(text):
    s = norm(text).casefold()
    s = re.sub(r'\bsituasi\s+\d+[-–]\d+\s*:\s*[^.]+\.?', ' ', s)
    s = re.sub(r'\bkonteks\s*:\s*[^.]+\.?', ' ', s)
    s = re.sub(r'\bdalam konteks\s+[^.]+\.?', ' ', s)
    s = re.sub(r'\buntuk keadaan ini,.*$', ' ', s)
    s = re.sub(r'\b\d+(?:\.\d+)?\b', '#', s)
    s = re.sub(r'\s+', ' ', s).strip(' .')
    return s


def has_visual(q):
    for key in VISUAL_KEYS:
        val = q.get(key)
        if val not in (None, '', False, [], {}):
            return True
    return False


def one_hot(weights):
    vals = [float(x) for x in weights if isinstance(x, (int, float))]
    return bool(vals) and sum(1 for x in vals if x > 0) == 1


def partial_credit(weights):
    vals = [float(x) for x in weights if isinstance(x, (int, float))]
    return len(set(vals)) >= 3 and sum(1 for x in vals if x > 0) >= 2


def agree_shape(q):
    cat = norm(q.get('category')).casefold()
    fmt = norm(q.get('format')).casefold()
    stem = norm(q.get('question')).casefold()
    return 'setuju' in cat or 'agree' in fmt or stem.startswith('setuju atau tidak setuju')


def simple_math_signal(stem):
    s = stem.casefold()
    simple = any(x in s for x in [
        'berapakah jumlah', 'berapakah baki', 'dibahagikan sama rata',
        'harga sebuah', 'setiap meja', 'setiap kotak', 'setiap murid'
    ])
    richer = any(x in s for x in [
        'peratus', 'nisbah', 'pecahan', 'purata', 'jadual', 'graf', 'carta',
        'laju', 'jarak', 'masa', 'luas', 'isipadu', 'perimeter', 'skala',
        'beza', 'gabungan', 'lebih daripada satu langkah'
    ])
    return simple and not richer


print('=== REQOO PKSK CONTENT AUDIT V64 ===')
print('Scope: current simulator Set 01-50')
print('Internal lock: A=30, B=70; B mix=' + json.dumps(LOCKED_B, ensure_ascii=False))
print('Public benchmark note: KPM confirms A=Kecerdasan Insaniah (EQ/SQ/SSQ), B=Kecerdasan Intelek, C=Artikulasi Penulisan. Public prep references report A=30 and B=70; exact B subject split is not treated as official KPM here.')
print()

all_a_stems = defaultdict(list)
all_b_stems = defaultdict(list)
all_a_templates = defaultdict(list)
all_b_templates = defaultdict(list)
sets = []

for path in FILES:
    with open(path, encoding='utf-8') as f:
        data = json.load(f)
    set_no = int(data.get('set') or re.search(r'set(\d+)\.json$', path).group(1))
    qs = data.get('questions', [])
    A = [q for q in qs if q.get('section') == 'BAHAGIAN A']
    B = [q for q in qs if q.get('section') == 'BAHAGIAN B']
    writing = data.get('writing', [])

    b_counts = Counter(canon_cat(q.get('category')) for q in B)
    unsupported = {k:v for k,v in b_counts.items() if k not in LOCKED_B}
    b_diff = {k: b_counts.get(k,0)-v for k,v in LOCKED_B.items() if b_counts.get(k,0) != v}

    agree = [q for q in A if agree_shape(q)]
    agree2 = 0
    agree4 = 0
    agree_bad_labels = 0
    for q in agree:
        opts = [norm(x) for x in q.get('options', [])]
        if len(opts) == 2:
            agree2 += 1
            labels = {re.sub(r'[.!]+$','',x.casefold()).strip() for x in opts}
            if labels != {'setuju','tidak setuju'}:
                agree_bad_labels += 1
        elif len(opts) == 4:
            agree4 += 1

    a_onehot4 = sum(1 for q in A if len(q.get('options',[]))==4 and one_hot(q.get('weights',[])))
    a_partial4 = sum(1 for q in A if len(q.get('options',[]))==4 and partial_credit(q.get('weights',[])))
    a_levels = sorted({q.get('plannedLevel') for q in A if q.get('plannedLevel') is not None}, key=str)
    b_levels = sorted({q.get('plannedLevel') for q in B if q.get('plannedLevel') is not None}, key=str)
    b_visuals = sum(1 for q in B if has_visual(q))
    visual_domain = [q for q in B if canon_cat(q.get('category')) in {'IQ','Matematik','Sains','Teknologi/RBT','Penyelesaian Masalah'}]
    visual_domain_with = sum(1 for q in visual_domain if has_visual(q))
    simple_math = sum(1 for q in B if canon_cat(q.get('category'))=='Matematik' and simple_math_signal(norm(q.get('question'))))

    for q in A:
        stem = norm(q.get('question'))
        all_a_stems[stem.casefold()].append((set_no,q.get('id')))
        all_a_templates[canon_stem(stem)].append((set_no,q.get('id')))
    for q in B:
        stem = norm(q.get('question'))
        all_b_stems[stem.casefold()].append((set_no,q.get('id')))
        all_b_templates[canon_stem(stem)].append((set_no,q.get('id')))

    issues = []
    if len(qs) != 100: issues.append(f'jumlah={len(qs)}')
    if len(A) != 30 or len(B) != 70: issues.append(f'A/B={len(A)}/{len(B)}')
    if len(writing) != 3: issues.append(f'C prompts={len(writing)}')
    if b_diff: issues.append('B mix tidak ikut lock')
    if unsupported: issues.append('B kategori luar lock')
    if agree and agree4: issues.append('Setuju/Tidak Setuju 4 pilihan')
    if a_onehot4 > 0: issues.append('A 4-pilihan one-hot')
    if len(a_levels) == 1 and len(A) == 30: issues.append('A semua level sama')
    if visual_domain and visual_domain_with == 0: issues.append('tiada visual domain logik/Math/Sains/RBT')

    sets.append({
        'set': set_no, 'path': path, 'A': len(A), 'B': len(B), 'C': len(writing),
        'A_categories': dict(Counter(norm(q.get('category')) or '(kosong)' for q in A)),
        'A_agree_total': len(agree), 'A_agree_2': agree2, 'A_agree_4': agree4,
        'A_agree_bad_labels': agree_bad_labels,
        'A_onehot4': a_onehot4, 'A_partial4': a_partial4, 'A_levels': a_levels,
        'B_counts': dict(b_counts), 'B_diff': b_diff, 'B_unsupported': unsupported,
        'B_levels': b_levels, 'B_visuals': b_visuals,
        'B_visual_domain_items': len(visual_domain), 'B_visual_domain_with_visual': visual_domain_with,
        'B_simple_math_signal': simple_math,
        'issues': issues,
    })

print(f'FILES={len(FILES)}')
print(f'SETS_WITH_STRUCTURAL_COUNT_ISSUES={sum(1 for s in sets if s["A"]!=30 or s["B"]!=70 or s["C"]!=3)}')
print(f'SETS_B_BLUEPRINT_MISMATCH={sum(1 for s in sets if s["B_diff"] or s["B_unsupported"])}')
print(f'SETS_WITH_AGREE_4_OPTIONS={sum(1 for s in sets if s["A_agree_4"]>0)}')
print(f'SETS_WITH_A_ONEHOT_4={sum(1 for s in sets if s["A_onehot4"]>0)}')
print(f'SETS_WITH_A_PARTIAL_4={sum(1 for s in sets if s["A_partial4"]>0)}')
print(f'SETS_WITH_NO_REQUIRED_DOMAIN_VISUALS={sum(1 for s in sets if s["B_visual_domain_items"] and s["B_visual_domain_with_visual"]==0)}')
print()

for s in sets:
    print(f"SET {s['set']:02d}: A={s['A']} B={s['B']} C={s['C']} | A agree={s['A_agree_total']} (2opt={s['A_agree_2']},4opt={s['A_agree_4']}) | A partial4={s['A_partial4']} onehot4={s['A_onehot4']} | A levels={s['A_levels']} | B={s['B_counts']} | visuals={s['B_visual_domain_with_visual']}/{s['B_visual_domain_items']} | simpleMath={s['B_simple_math_signal']} | issues={'; '.join(s['issues']) or 'none'}")

exact_a = {k:v for k,v in all_a_stems.items() if len(v)>1}
exact_b = {k:v for k,v in all_b_stems.items() if len(v)>1}
tmpl_a = {k:v for k,v in all_a_templates.items() if k and len(v)>1}
tmpl_b = {k:v for k,v in all_b_templates.items() if k and len(v)>1}

print()
print(f'A_EXACT_DUPLICATE_STEMS={len(exact_a)}')
print(f'B_EXACT_DUPLICATE_STEMS={len(exact_b)}')
print(f'A_NORMALIZED_TEMPLATE_GROUPS={len(tmpl_a)}')
print(f'B_NORMALIZED_TEMPLATE_GROUPS={len(tmpl_b)}')

print('\nTOP A TEMPLATE REPEATS:')
for stem, refs in sorted(tmpl_a.items(), key=lambda kv: (-len(kv[1]), kv[0]))[:20]:
    print(f'{len(refs):4d}x | {stem[:160]} | refs={refs[:8]}')

print('\nTOP B TEMPLATE REPEATS:')
for stem, refs in sorted(tmpl_b.items(), key=lambda kv: (-len(kv[1]), kv[0]))[:30]:
    print(f'{len(refs):4d}x | {stem[:160]} | refs={refs[:8]}')

print('\nSETS FAILING INTERNAL B LOCK:')
for s in sets:
    if s['B_diff'] or s['B_unsupported']:
        print(f"SET {s['set']:02d}: diff={s['B_diff']} unsupported={s['B_unsupported']}")

report = {
    'files': len(FILES),
    'lockedB': LOCKED_B,
    'summary': {
        'structuralCountIssues': sum(1 for s in sets if s['A']!=30 or s['B']!=70 or s['C']!=3),
        'bBlueprintMismatchSets': sum(1 for s in sets if s['B_diff'] or s['B_unsupported']),
        'agree4OptionSets': sum(1 for s in sets if s['A_agree_4']>0),
        'aOneHot4Sets': sum(1 for s in sets if s['A_onehot4']>0),
        'aPartial4Sets': sum(1 for s in sets if s['A_partial4']>0),
        'noVisualDomainSets': sum(1 for s in sets if s['B_visual_domain_items'] and s['B_visual_domain_with_visual']==0),
        'aExactDuplicateGroups': len(exact_a),
        'bExactDuplicateGroups': len(exact_b),
        'aTemplateDuplicateGroups': len(tmpl_a),
        'bTemplateDuplicateGroups': len(tmpl_b),
    },
    'sets': sets,
}
with open('pksk-content-audit-v64.json','w',encoding='utf-8') as f:
    json.dump(report,f,ensure_ascii=False,indent=2)

# Report-only: content failures are intentional audit findings, not CI infra failures.
print('\nAUDIT_COMPLETE')

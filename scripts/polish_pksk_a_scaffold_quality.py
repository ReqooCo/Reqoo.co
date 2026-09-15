#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
A_ROOT = ROOT / 'sim/pksk/curation/A'

FAMILY_SCENARIO_REPLACEMENTS = {
    'SQ-S19': (
        'Kamu terlanggar sebuah alat sekolah hingga rosak sedikit ketika tiada sesiapa melihat.',
        'Semasa menyusun peralatan kelab, kamu tersilap menjatuhkan tripod hingga satu sambungan menjadi longgar ketika tiada sesiapa berdekatan.'
    ),
    'SSQ-S05': (
        'Dua ahli kumpulan bertegas dengan cadangan masing-masing dan perbincangan mula terhenti.',
        'Dalam projek kelas, dua cadangan lokasi pameran sama-sama mendapat sokongan kuat sehingga kumpulan sukar bergerak ke langkah seterusnya.'
    ),
}

TAIL_REPLACEMENTS = {
    'Tiada pilihan yang sempurna; setiap tindakan mempunyai manfaat dan kos tertentu. Pilihan manakah paling baik mengurus pertukaran antara dua keperluan itu?':
        'Kedua-dua pilihan mempunyai manfaat dan kos. Pilihan manakah paling seimbang?',
    'Keadaan ini melibatkan sekurang-kurangnya tiga perkara yang perlu diseimbangkan sebelum tindakan dipilih. Apakah respons yang paling baik mengurus faktor individu, kumpulan dan akibat jangka lanjut?':
        'Pertimbangkan kesan kepada diri, kumpulan dan langkah seterusnya. Apakah respons paling seimbang?',
    'Dua pendekatan dicadangkan dan kedua-duanya mempunyai alasan yang kelihatan munasabah. Antara pendekatan yang mungkin, yang manakah paling kukuh apabila dibandingkan dengan kriteria yang relevan?':
        'Bandingkan pendekatan menggunakan kriteria yang berkaitan. Pilihan manakah paling kukuh?',
    'Pilihan yang baik perlu mengambil kira kesan segera, kemungkinan tindak balas pihak lain dan tanggungjawab yang masih belum selesai. Jika kamu perlu mempertahankan keputusan kepada semua pihak, pilihan manakah paling munasabah?':
        'Jika keputusan itu perlu dijelaskan kepada pihak lain, pilihan manakah paling munasabah?',
    'Kamu hanya boleh memilih satu tindakan awal sebelum mendapatkan bantuan atau maklumat tambahan. Dengan kekangan yang ada, apakah perkara paling penting untuk dibuat dahulu?':
        'Dengan kekangan itu, apakah tindakan pertama yang paling wajar?',
    'Keputusan kamu akan mempengaruhi bukan sahaja keadaan sekarang, tetapi juga kepercayaan, masa dan tanggungjawab selepas itu. Apakah keputusan yang paling kukuh apabila semua faktor itu dipertimbangkan bersama?':
        'Apakah keputusan paling kukuh setelah kesan utama dipertimbangkan bersama?',
    'Keputusan kamu akan mempengaruhi bukan sahaja keadaan sekarang, tetapi juga kepercayaan, masa dan tanggungjawab selepas itu. Apakah respons yang paling baik mengurus faktor individu, kumpulan dan akibat jangka lanjut?':
        'Apakah respons paling seimbang setelah kesan kepada semua pihak dipertimbangkan?',
    'Tindak balas pertama kamu akan menentukan sama ada keadaan bertambah baik atau semakin tegang. Apakah tindakan awal yang paling mungkin membawa keadaan ke arah yang lebih baik?':
        'Apakah tindakan awal yang paling membantu keadaan bergerak ke arah yang lebih baik?',
}

COMMA_OPENING = 'Selepas mengambil kira keadaan, kesan segera'
COMMA_VARIANTS = [
    'Setelah menimbang keadaan semasa dan kesan segera',
    'Selepas menilai keadaan serta kesan segera',
    'Sesudah mempertimbangkan keadaan dan kesan segera',
    'Setelah melihat keadaan semasa bersama kesan segera',
    'Selepas menimbang situasi dan kesan segera',
    'Sesudah menilai keadaan semasa serta kesan segera',
    'Setelah mempertimbangkan situasi dan kesan segera',
    'Selepas melihat keadaan dan kesan segera',
    'Sesudah menimbang situasi semasa dan kesan segera',
    'Setelah menilai situasi bersama kesan segera',
    'Selepas mempertimbangkan keadaan semasa dan kesan awal',
    'Sesudah melihat situasi serta kesan awal',
    'Setelah menimbang keadaan dan kesan awal',
    'Selepas menilai situasi semasa bersama kesan awal',
    'Sesudah mempertimbangkan keadaan serta kesan awal',
    'Setelah melihat keadaan semasa dan kesan awal',
    'Selepas menimbang situasi serta kesan awal',
    'Sesudah menilai situasi bersama kesan awal',
    'Setelah mempertimbangkan keadaan dan kesan awal',
    'Selepas melihat situasi semasa serta kesan awal',
]

SIX_PREFIX_SPLITS = {
    'Walau situasi bertambah sukar atau memalukan': ['Sekalipun situasi bertambah sukar atau memalukan', 'Walaupun situasi bertambah mencabar atau memalukan'],
    'Walau cara tindakannya mungkin berubah mengikut': ['Meskipun cara tindakannya mungkin berubah mengikut', 'Sekalipun cara tindakannya berubah mengikut'],
    'Untuk mencegah kesan buruk yang mungkin': ['Bagi mencegah kesan buruk yang mungkin', 'Demi mencegah kesan buruk yang mungkin'],
    'Prinsip ini masih wajar digunakan secara': ['Pendekatan ini masih wajar digunakan secara', 'Prinsip tersebut masih sesuai digunakan secara'],
    'Prinsip berkenaan sepatutnya digunakan secara adil': ['Prinsip tersebut sepatutnya digunakan secara adil', 'Pendekatan berkenaan sepatutnya digunakan secara adil'],
    'Meskipun keadaan berubah menjadi lebih sukar': ['Walaupun keadaan berubah menjadi lebih sukar', 'Sekalipun keadaan berubah menjadi lebih sukar'],
    'Meskipun cara melaksanakannya mungkin berubah mengikut': ['Walau cara melaksanakannya mungkin berubah mengikut', 'Sekalipun cara melaksanakannya boleh berubah mengikut'],
    'Bagi mengehadkan kesan buruk yang mungkin': ['Untuk mengehadkan kesan buruk yang mungkin', 'Demi mengehadkan kesan buruk yang mungkin'],
}

BEST_PREFIX = 'Pertimbangkan kesan kepada semua pihak, kemudian '


def stable_index(family: str, variant: int, size: int) -> int:
    return (sum(ord(ch) for ch in family) * 7 + variant * 19) % size


def cap_first(text: str) -> str:
    return text[:1].upper() + text[1:] if text else text


def main() -> int:
    question_edits = 0
    option_edits = 0
    touched = 0
    for path in sorted(A_ROOT.glob('rewrite_wave_*.jsonl')):
        try:
            start = int(path.stem.split('_')[2])
        except Exception:
            continue
        if start < 301:
            continue
        rows = [json.loads(line) for line in path.read_text(encoding='utf-8').splitlines() if line.strip()]
        path_changed = False
        for row in rows:
            row_changed = False
            option_changed = False
            family = str(row.get('repeatFamily') or row.get('scaffoldRepeatFamily') or row.get('bankId') or '')
            variant = int(row.get('variant') or 0)
            q = str(row.get('question') or '')

            scenario = FAMILY_SCENARIO_REPLACEMENTS.get(family)
            if scenario and scenario[0] in q:
                q = q.replace(scenario[0], scenario[1], 1)
                question_edits += 1
                row_changed = True

            for old, new in TAIL_REPLACEMENTS.items():
                if old in q:
                    q = q.replace(old, new)
                    question_edits += 1
                    row_changed = True

            if q.startswith(COMMA_OPENING):
                replacement = COMMA_VARIANTS[stable_index(family, variant, len(COMMA_VARIANTS))]
                q = replacement + q[len(COMMA_OPENING):]
                question_edits += 1
                row_changed = True

            for opening, variants in SIX_PREFIX_SPLITS.items():
                if q.startswith(opening):
                    replacement = variants[stable_index(family, variant, len(variants))]
                    q = replacement + q[len(opening):]
                    question_edits += 1
                    row_changed = True
                    break

            if q != row.get('question'):
                row['question'] = q
                notes = list(row.get('editorialNotes') or [])
                notes.append('Quality polish reduced cross-family template overlap without changing the tested construct.')
                row['editorialNotes'] = notes

            if row.get('format') == 'SITUATIONAL':
                opts = list(row.get('options') or [])
                weights = list(row.get('weights') or [])
                if len(opts) == 4 and len(weights) == 4:
                    for i, (opt, weight) in enumerate(zip(opts, weights)):
                        if weight == 3 and isinstance(opt, str) and opt.startswith(BEST_PREFIX):
                            opts[i] = cap_first(opt[len(BEST_PREFIX):])
                            option_edits += 1
                            option_changed = True
                            row_changed = True
                    if option_changed:
                        row['options'] = opts
                        notes = list(row.get('editorialNotes') or [])
                        notes.append('Removed generic best-option lead-in that could act as an answer-length clue.')
                        row['editorialNotes'] = notes

            if row_changed:
                path_changed = True

        if path_changed:
            path.write_text('\n'.join(json.dumps(x, ensure_ascii=False) for x in rows) + '\n', encoding='utf-8')
            touched += 1

    print(f'PASS: scaffold quality polish; question_edits={question_edits} option_edits={option_edits} waves_touched={touched}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

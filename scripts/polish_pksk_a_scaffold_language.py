#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
A_ROOT = ROOT / 'sim/pksk/curation/A'

# These openings came from the structural scaffold templates. They are semantically
# acceptable but become visibly repetitive when many repeat families are combined.
# Replacements preserve the original logical connector while varying natural Malay.
OPENING_VARIANTS = {
    'Walaupun keadaan menjadi lebih sukar atau': [
        'Meskipun keadaan menjadi lebih sukar atau',
        'Walau keadaan menjadi lebih mencabar atau',
        'Sekalipun keadaan menjadi lebih sukar atau',
        'Walaupun situasi menjadi lebih mencabar atau',
        'Meskipun situasi menjadi lebih sukar atau',
        'Walau keadaan bertambah mencabar atau',
        'Sekalipun situasi menjadi lebih mencabar atau',
        'Walaupun keadaan tidak semudah biasa atau',
        'Meskipun keadaan berubah menjadi lebih sukar atau',
        'Walau situasi bertambah sukar atau',
    ],
    'Walaupun cara melaksanakannya mungkin berubah mengikut': [
        'Meskipun cara melaksanakannya mungkin berubah mengikut',
        'Walau cara pelaksanaannya boleh berubah mengikut',
        'Sekalipun kaedah pelaksanaannya berubah mengikut',
        'Walaupun kaedah melaksanakannya boleh berubah mengikut',
        'Meskipun bentuk pelaksanaannya mungkin berubah mengikut',
        'Walau pendekatan pelaksanaannya berubah mengikut',
        'Sekalipun cara menjalankannya boleh berubah mengikut',
        'Walaupun pendekatannya mungkin berubah mengikut',
        'Meskipun kaedahnya boleh disesuaikan mengikut',
        'Walau cara tindakannya mungkin berubah mengikut',
    ],
    'Untuk mengurangkan kesan buruk yang mungkin': [
        'Bagi mengurangkan kesan buruk yang mungkin',
        'Demi mengurangkan kesan buruk yang mungkin',
        'Untuk mengecilkan risiko buruk yang mungkin',
        'Bagi mengelakkan kesan buruk yang mungkin',
        'Untuk mengurangkan risiko yang mungkin',
        'Demi mengelakkan akibat buruk yang mungkin',
        'Bagi mengehadkan kesan buruk yang mungkin',
        'Untuk mencegah kesan buruk yang mungkin',
        'Demi mengurangkan kemungkinan kesan buruk yang',
        'Bagi mengurangkan kemungkinan akibat buruk yang',
    ],
    'Selepas mengambil kira keadaan kesan segera': [
        'Setelah mengambil kira keadaan kesan segera',
        'Selepas menimbang keadaan kesan segera',
        'Setelah menimbang keadaan kesan segera',
        'Selepas mempertimbangkan keadaan kesan segera',
        'Sesudah mengambil kira keadaan kesan segera',
        'Setelah mempertimbangkan keadaan kesan segera',
        'Selepas menilai keadaan kesan segera',
        'Sesudah menimbang keadaan kesan segera',
        'Setelah menilai keadaan kesan segera',
        'Selepas melihat keadaan kesan segera',
    ],
    'Prinsip yang sama patut digunakan secara': [
        'Prinsip tersebut patut digunakan secara',
        'Prinsip ini masih wajar digunakan secara',
        'Prinsip berkenaan sepatutnya digunakan secara',
        'Pendekatan yang sama wajar digunakan secara',
        'Prinsip itu masih patut digunakan secara',
        'Kaedah yang sama wajar digunakan secara',
        'Prinsip tersebut masih sesuai digunakan secara',
        'Pendekatan ini patut diterapkan secara',
        'Prinsip yang berkenaan wajar digunakan secara',
        'Prinsip ini sepatutnya diterapkan secara',
    ],
    'Walaupun niat kumpulan ialah mencapai hasil': [
        'Meskipun niat kumpulan ialah mencapai hasil',
        'Walau kumpulan berniat mencapai hasil',
        'Sekalipun kumpulan mahu mencapai hasil',
        'Walaupun kumpulan berusaha mencapai hasil',
        'Meskipun kumpulan mahu mendapatkan hasil',
        'Walau matlamat kumpulan ialah mencapai hasil',
        'Sekalipun matlamat kumpulan ialah memperoleh hasil',
        'Walaupun kumpulan menyasarkan hasil',
        'Meskipun kumpulan mengejar hasil',
        'Walau kumpulan menyasarkan pencapaian hasil',
    ],
    'Walaupun keputusan perlu dibuat dengan cepat': [
        'Meskipun keputusan perlu dibuat dengan cepat',
        'Walau keputusan perlu dibuat dengan segera',
        'Sekalipun keputusan perlu dibuat segera',
        'Walaupun masa untuk membuat keputusan singkat',
        'Meskipun masa membuat keputusan terhad',
        'Walau keputusan perlu dicapai segera',
        'Sekalipun masa untuk memutuskan terhad',
        'Walaupun keadaan memerlukan keputusan segera',
        'Meskipun keadaan mendesak keputusan cepat',
        'Walau masa mendesak keputusan segera',
    ],
    'Walaupun tindakan itu memudahkan diri atau': [
        'Meskipun tindakan itu memudahkan diri atau',
        'Walau tindakan itu terasa lebih mudah atau',
        'Sekalipun tindakan itu memudahkan diri atau',
        'Walaupun pilihan itu lebih mudah untuk diri atau',
        'Meskipun pilihan itu memudahkan diri atau',
        'Walau cara itu memudahkan diri atau',
        'Sekalipun cara itu terasa lebih mudah atau',
        'Walaupun tindakan itu kelihatan mudah atau',
        'Meskipun tindakan tersebut terasa mudah atau',
        'Walau pilihan tersebut lebih mudah atau',
    ],
    'Walaupun niat saya ialah menjaga perasaan': [
        'Meskipun niat saya ialah menjaga perasaan',
        'Walau niat saya untuk menjaga perasaan',
        'Sekalipun saya berniat menjaga perasaan',
        'Walaupun saya mahu menjaga perasaan',
        'Meskipun saya mahu menjaga perasaan',
        'Walau tujuan saya menjaga perasaan',
        'Sekalipun tujuan saya ialah menjaga perasaan',
        'Walaupun niat asal saya menjaga perasaan',
        'Meskipun tujuan asal saya menjaga perasaan',
        'Walau saya berniat untuk menjaga perasaan',
    ],
    'Walaupun niat saya baik dan mahu': [
        'Meskipun niat saya baik dan mahu',
        'Walau niat saya baik dan ingin',
        'Sekalipun niat saya baik dan mahu',
        'Walaupun tujuan saya baik dan mahu',
        'Meskipun tujuan saya baik dan ingin',
        'Walau tujuan asal saya baik dan mahu',
        'Sekalipun saya berniat baik dan mahu',
        'Walaupun saya berniat baik dan ingin',
        'Meskipun saya berniat baik dan mahu',
        'Walau niat asal saya baik dan ingin',
    ],
    'Walaupun mengelakkan rasa tidak selesa terasa': [
        'Meskipun mengelakkan rasa tidak selesa terasa',
        'Walau mengelakkan ketidakselesaan terasa',
        'Sekalipun mengelakkan rasa tidak selesa kelihatan',
        'Walaupun menghindari rasa tidak selesa terasa',
        'Meskipun menghindari ketidakselesaan terasa',
        'Walau mengelakkan keadaan tidak selesa terasa',
        'Sekalipun menghindari rasa tidak selesa terasa',
        'Walaupun mengelakkan ketidakselesaan kelihatan',
        'Meskipun mengelakkan keadaan tidak selesa terasa',
        'Walau menghindari ketidakselesaan kelihatan',
    ],
}


def stable_index(family: str, variant: int, size: int) -> int:
    return (sum(ord(ch) for ch in family) + variant * 17) % size


def main() -> int:
    changed = 0
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
            question = str(row.get('question') or '')
            family = str(row.get('repeatFamily') or row.get('scaffoldRepeatFamily') or row.get('bankId') or '')
            variant = int(row.get('variant') or 0)
            for opening, variants in OPENING_VARIANTS.items():
                if question.startswith(opening):
                    replacement = variants[stable_index(family, variant, len(variants))]
                    row['question'] = replacement + question[len(opening):]
                    notes = list(row.get('editorialNotes') or [])
                    notes.append('Diversified structural-template opening while preserving the original proposition.')
                    row['editorialNotes'] = notes
                    changed += 1
                    path_changed = True
                    break
        if path_changed:
            path.write_text('\n'.join(json.dumps(x, ensure_ascii=False) for x in rows) + '\n', encoding='utf-8')
            touched += 1
    print(f'PASS: diversified scaffold language; items_changed={changed} waves_touched={touched}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

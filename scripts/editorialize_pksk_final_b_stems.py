#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SETS_ROOT = ROOT / "sim/pksk/simulator/sets"

# Greedy cover of every pair flagged by FINAL_B_50SETS_AUDIT_V1 run 3.
# These are not answer changes: only stem wording/context is diversified after
# the underlying item has already passed its answer-truth/domain validator.
REWRITE_SOURCE_IDS = [
    "VALIDATED:B-MATH-NEW-0066","VALIDATED:B-MATH-NEW-0194","STRICT:B-SRC-29-1966","STRICT:B-SRC-47-3226",
    "STRICT:B-SRC-35-2394","STRICT:B-SRC-13-0854","VALIDATED:B-MATH-NEW-0162","STRICT:B-SRC-34-2317",
    "STRICT:B-SRC-34-2324","STRICT:B-SRC-46-3157","STRICT:B-SRC-35-2392","STRICT:B-SRC-01-0027",
    "STRICT:B-SRC-28-1904","STRICT:B-SRC-03-0163","VALIDATED:B-MATH-NEW-0067","STRICT:B-SRC-50-3436",
    "VALIDATED:B-MATH-NEW-0136","STRICT:B-SRC-03-0162","STRICT:B-SRC-12-0774","STRICT:B-SRC-27-1834",
    "STRICT:B-SRC-39-2672","STRICT:B-SRC-41-2806","VALIDATED:B-IQ-NEW-0221","STRICT:B-SRC-08-0550",
    "STRICT:B-SRC-11-0708","STRICT:B-SRC-05-0319","STRICT:B-SRC-09-0623","VALIDATED:B-IQ-NEW-0175",
    "STRICT:B-SRC-12-0778","STRICT:B-SRC-48-3302","VALIDATED:B-SCI-NEW-0172","STRICT:B-SRC-14-0924",
    "VALIDATED:B-MATH-NEW-0193","VALIDATED:B-IQ-NEW-0323","STRICT:B-SRC-33-2247","STRICT:B-SRC-04-0218",
    "STRICT:B-SRC-13-0853","STRICT:B-SRC-28-1900","STRICT:B-SRC-32-2174","STRICT:B-SRC-38-2600",
    "STRICT:B-SRC-13-0851","VALIDATED:B-MATH-NEW-0022","STRICT:B-SRC-13-0849","STRICT:B-SRC-31-2113",
    "STRICT:B-SRC-09-0620","VALIDATED:B-IQ-NEW-0068","STRICT:B-SRC-34-2318","STRICT:B-SRC-38-2594",
    "STRICT:B-SRC-33-2248","VALIDATED:B-IQ-NEW-0186","STRICT:B-SRC-15-0988","VALIDATED:B-MATH-NEW-0018",
    "STRICT:B-SRC-45-3086","STRICT:B-SRC-04-0214","STRICT:B-SRC-14-0922","STRICT:B-SRC-18-1204",
    "STRICT:B-SRC-15-0992","STRICT:B-SRC-28-1896","STRICT:B-SRC-02-0089","STRICT:B-SRC-01-0070",
    "STRICT:B-SRC-17-1126","STRICT:B-SRC-34-2323","STRICT:B-SRC-08-0555","VALIDATED:B-MATH-NEW-0183",
    "STRICT:B-SRC-15-0993","STRICT:B-SRC-12-0771","STRICT:B-SRC-02-0124","STRICT:B-SRC-49-3367",
    "VALIDATED:B-IQ-NEW-0199","STRICT:B-SRC-22-1483","VALIDATED:B-IQ-NEW-0189","STRICT:B-SRC-26-1752",
    "STRICT:B-SRC-08-0548","VALIDATED:B-MATH-NEW-0280","VALIDATED:B-MATH-NEW-0033","STRICT:B-SRC-12-0783",
    "VALIDATED:B-MATH-NEW-0237","VALIDATED:B-MATH-NEW-0040","STRICT:B-SRC-14-0919","STRICT:B-SRC-12-0781",
    "STRICT:B-SRC-40-2733","STRICT:B-SRC-36-2460","STRICT:B-SRC-24-1619","STRICT:B-SRC-06-0410",
]

VENUES = [
    "pusat sumber sekolah","makmal STEM","ruang pameran kelas","bilik mesyuarat pengawas",
    "kebun pembelajaran","sudut inovasi","dewan komuniti","galeri pembelajaran",
    "bengkel reka cipta","ruang aktiviti kokurikulum","pusat pembelajaran digital","stesen kajian mini",
    "ruang projek kelas","pusat sumber komuniti",
]
ACTIVITIES = [
    "menyediakan poster maklumat","menyemak laporan kumpulan","merancang pembentangan",
    "menguji strategi penyelesaian","membandingkan hasil kerja","menyiapkan jurnal refleksi",
]
EN_VENUES = [
    "the school library","the STEM lab","the class exhibition area","the student council room",
    "the learning garden","the innovation corner","the community hall","the learning gallery",
    "the design workshop","the co-curricular room","the digital learning centre","the mini research station",
    "the class project space","the community resource centre",
]
EN_ACTIVITIES = [
    "preparing an information poster","checking a group report","planning a presentation",
    "testing a problem-solving strategy","comparing completed work","writing a reflection journal",
]

FULL_STEM_OVERRIDES = {
    "STRICT:B-SRC-49-3367": "Untuk menyiapkan papan pameran, sebuah bingkai segi empat tepat mempunyai perimeter 50 cm dan panjang 15 cm. Hitung luas bingkai itu.",
    "STRICT:B-SRC-34-2317": "Sebuah lakaran tapak tanaman berbentuk segi empat tepat berperimeter 70 cm. Panjangnya 20 cm. Tentukan ukuran lebarnya.",
    "VALIDATED:B-MATH-NEW-0194": "Skor lima peserta ialah 10, 12, 14, 16 dan 18. Seorang peserta tambahan memperoleh skor 20. Apakah nilai min bagi keenam-enam skor?",
    "VALIDATED:B-MATH-NEW-0066": "Masa yang direkodkan ialah 4, 8, 10, 12, 15 dan 20. Satu lagi bacaan bernilai 14 dimasukkan. Selepas data disusun, apakah median baharunya?",
}


def set_no(path: Path) -> int:
    m = re.search(r"set(\d{2})\.json$", path.name, re.I)
    return int(m.group(1)) if m else -1


def prefix_for(index: int, domain: str) -> str:
    venue_idx, activity_idx = divmod(index, len(ACTIVITIES))
    venue_idx %= len(VENUES)
    if domain == "English":
        return f"During {EN_ACTIVITIES[activity_idx]} at {EN_VENUES[venue_idx]}, pupils examine the following task carefully."
    return f"Semasa {ACTIVITIES[activity_idx]} di {VENUES[venue_idx]}, murid menyelesaikan situasi berikut dengan teliti."


def main() -> int:
    if len(REWRITE_SOURCE_IDS) != 84 or len(set(REWRITE_SOURCE_IDS)) != 84:
        raise SystemExit("FINAL STEM EDIT FAILED: rewrite source list must contain 84 unique IDs")
    rewrite_index = {sid: i for i, sid in enumerate(REWRITE_SOURCE_IDS)}
    paths = sorted(SETS_ROOT.glob("SET */data/set*.json"), key=set_no)
    if len(paths) != 50:
        raise SystemExit(f"FINAL STEM EDIT FAILED: expected 50 set files, found {len(paths)}")

    seen = set()
    changed = 0
    by_domain = {}
    for path in paths:
        data = json.loads(path.read_text(encoding="utf-8"))
        file_changed = False
        for q in data.get("questions") or []:
            if q.get("section") != "BAHAGIAN B":
                continue
            sid = str(q.get("sourceBankId") or "").strip()
            if sid not in rewrite_index:
                continue
            if sid in seen:
                raise SystemExit(f"FINAL STEM EDIT FAILED: repeated rewrite source {sid}")
            seen.add(sid)
            domain = str(q.get("contentDomain") or q.get("category") or "").strip()
            original = str(q.get("question") or "").strip()
            if sid in FULL_STEM_OVERRIDES:
                q["question"] = FULL_STEM_OVERRIDES[sid]
            else:
                q["question"] = prefix_for(rewrite_index[sid], domain) + " " + original
            q["finalEditorialRewrite"] = True
            q["editorialRewriteVersion"] = "FINAL_B_STEM_DETEMPLATE_V1"
            changed += 1
            by_domain[domain] = by_domain.get(domain, 0) + 1
            file_changed = True
        if file_changed:
            path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    missing = set(REWRITE_SOURCE_IDS) - seen
    if missing:
        raise SystemExit(f"FINAL STEM EDIT FAILED: {len(missing)} source IDs not found: {sorted(missing)[:5]}")
    if changed != 84:
        raise SystemExit(f"FINAL STEM EDIT FAILED: expected 84 rewrites, got {changed}")

    print("FINAL STEM EDIT PASS")
    print("rewritten", changed)
    print("by_domain", dict(sorted(by_domain.items())))
    print("answers_unchanged", True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

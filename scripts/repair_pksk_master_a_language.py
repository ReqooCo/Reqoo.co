#!/usr/bin/env python3
"""Deterministic language cleanup for the canonical PKSK Bahagian A bank.

The generator intentionally creates 10 cognitive variants per repeat family.  Two
negative-keyed agree/disagree variants (5 and 9) can become awkward when a source
negative statement is itself conditional ("Jika ..., jika ...").  This pass rewrites
those variants from the family's positive principle instead, preserving the intended
negative key while producing natural Malay.
"""
from __future__ import annotations

import json
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AUTHORED = ROOT / "sim/pksk/generator/master/a/authored"
CANON = re.compile(r"^a_\d{4}_\d{4}\.jsonl$")

TRADE_PREFIX = {
    "EQ": "Walaupun mengelakkan rasa tidak selesa terasa lebih mudah",
    "SQ": "Walaupun tindakan itu memudahkan diri atau rakan",
    "SSQ": "Walaupun keputusan perlu dibuat dengan cepat",
}
INTENT_PREFIX = {
    "EQ": "Walaupun niat saya ialah menjaga perasaan",
    "SQ": "Walaupun niat saya baik dan mahu membantu",
    "SSQ": "Walaupun niat kumpulan ialah mencapai hasil terbaik",
}


def lower_first(text: str) -> str:
    text = text.strip().rstrip(".")
    if not text:
        return text
    return text[0].lower() + text[1:]


def main() -> int:
    files = sorted(p for p in AUTHORED.iterdir() if p.is_file() and CANON.match(p.name))
    records = []
    locations = []
    for path in files:
        for raw in path.read_text(encoding="utf-8").splitlines():
            if not raw.strip():
                continue
            records.append(json.loads(raw))
            locations.append(path)

    families = defaultdict(dict)
    for item in records:
        families[item["repeatFamily"]][item["variant"]] = item

    changed = 0
    for item in records:
        if item.get("format") != "AGREE_DISAGREE" or item.get("variant") not in {5, 9}:
            continue
        family = families[item["repeatFamily"]]
        principle = lower_first(family[1]["question"])
        domain = item["domain"]
        if item["variant"] == 5:
            prefix = TRADE_PREFIX[domain]
            item["question"] = (
                f"{prefix}, faktor itu sahaja sudah cukup untuk mengetepikan prinsip bahawa {principle}."
            )
        else:
            prefix = INTENT_PREFIX[domain]
            item["question"] = (
                f"{prefix}, niat yang baik sahaja sudah cukup untuk mengetepikan prinsip bahawa {principle}."
            )
        item["weights"] = [0, 3]
        changed += 1

    by_file = defaultdict(list)
    for item, path in zip(records, locations):
        by_file[path].append(item)
    for path, rows in by_file.items():
        path.write_text(
            "\n".join(json.dumps(x, ensure_ascii=False, separators=(",", ":")) for x in rows) + "\n",
            encoding="utf-8",
        )

    print(f"Language cleanup PASS: rewrote {changed} agree/disagree variants")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

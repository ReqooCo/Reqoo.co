#!/usr/bin/env python3
"""Audit canonical PKSK structured visuals across Set 01-50.

The simulator supports exactly six structured visual kinds. This audit intentionally
checks data only; it does not rewrite any question content.
"""
from __future__ import annotations

import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SETS = ROOT / "sim" / "pksk" / "simulator" / "sets"
EXPECTED_TOTAL = 320
SUPPORTED = {
    "fraction_bar": ("parts", "selected"),
    "five_value_data": ("values",),
    "rectangle": ("length_cm", "width_cm"),
    "cuboid": ("length_cm", "width_cm", "height_cm"),
    "straight_line_angle": ("known_angle_deg",),
    "coordinate_move": ("start", "move_right"),
}


def set_path(number: int) -> Path:
    start = ((number - 1) // 10) * 10 + 1
    end = start + 9
    return SETS / f"SET {start:02d}-{end:02d}" / "data" / f"set{number:02d}.json"


def main() -> int:
    counts: Counter[str] = Counter()
    errors: list[str] = []
    structured_total = 0

    for number in range(1, 51):
        path = set_path(number)
        if not path.exists():
            errors.append(f"Set {number:02d}: missing {path.relative_to(ROOT)}")
            continue
        data = json.loads(path.read_text(encoding="utf-8"))
        questions = data.get("questions")
        if not isinstance(questions, list):
            errors.append(f"Set {number:02d}: questions is not a list")
            continue

        for index, question in enumerate(questions, 1):
            visual = question.get("visual")
            if not isinstance(visual, dict):
                continue
            structured_total += 1
            kind = str(visual.get("kind") or "")
            counts[kind] += 1
            if kind not in SUPPORTED:
                errors.append(f"Set {number:02d} Q{index}: unsupported visual kind {kind!r}")
                continue
            for key in SUPPORTED[kind]:
                if key not in visual:
                    errors.append(f"Set {number:02d} Q{index}: {kind} missing {key}")

    missing_kinds = sorted(set(SUPPORTED) - set(counts))
    if missing_kinds:
        errors.append("Missing canonical visual kinds: " + ", ".join(missing_kinds))
    if structured_total != EXPECTED_TOTAL:
        errors.append(f"Expected {EXPECTED_TOTAL} structured visuals, found {structured_total}")

    print(f"Structured visuals: {structured_total}")
    for kind in sorted(counts):
        print(f"  {kind}: {counts[kind]}")

    if errors:
        print("FAIL")
        for error in errors:
            print(" -", error)
        return 1
    print("PASS: all 50 sets use only the six supported structured visual kinds")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

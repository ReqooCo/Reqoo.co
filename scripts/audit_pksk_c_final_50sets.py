#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from difflib import SequenceMatcher
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SETS_ROOT = ROOT / "sim/pksk/simulator/sets"
OUT = ROOT / "audit-output"
OUT.mkdir(exist_ok=True)

SPACE_RE = re.compile(r"\s+")
PUNCT_RE = re.compile(r"[^\w\s]", re.UNICODE)
NUM_RE = re.compile(r"\b\d+(?:[.,]\d+)?\b")

REASONING_CUES = (
    "huraikan", "jelaskan", "cadangkan", "alasan", "sebab", "langkah",
    "contoh", "cara", "bandingkan", "nilai", "kesan", "peranan",
)
WEAK_PROMPTS = (
    "tulis karangan tentang",
    "ceritakan pengalaman kamu",
    "apakah pendapat kamu",
)


def norm(text: str, numbers: bool = False) -> str:
    text = str(text or "").casefold().strip()
    if numbers:
        text = NUM_RE.sub("#", text)
    text = PUNCT_RE.sub(" ", text)
    return SPACE_RE.sub(" ", text).strip()


def tokens(text: str) -> set[str]:
    return {x for x in norm(text, numbers=True).split() if len(x) > 2}


def set_no(path: Path) -> int:
    m = re.search(r"set(\d{2})\.json$", path.name, re.I)
    return int(m.group(1)) if m else -1


def main() -> int:
    paths = sorted(SETS_ROOT.glob("SET */data/set*.json"), key=set_no)
    errors: list[str] = []
    warnings: list[str] = []
    rows: list[dict] = []

    if len(paths) != 50:
        errors.append(f"expected_50_set_files:found={len(paths)}")

    for path in paths:
        n = set_no(path)
        data = json.loads(path.read_text(encoding="utf-8"))
        writing = data.get("writing")
        if not isinstance(writing, list):
            errors.append(f"set{n:02d}:writing_not_list")
            continue
        if len(writing) != 3:
            errors.append(f"set{n:02d}:expected_3_prompts:found={len(writing)}")
        for idx, w in enumerate(writing, 1):
            uid = f"S{n:02d}-C{idx:02d}"
            title = str(w.get("title") or "").strip()
            prompt = str(w.get("prompt") or "").strip()
            family = str(w.get("constructFamily") or "").strip()
            domain = str(w.get("contentDomain") or "").strip()
            min_words = w.get("min_words")
            level = w.get("plannedLevel")
            flags: list[str] = []

            if not title:
                flags.append("missing_title")
            if len(prompt) < 120:
                flags.append("prompt_too_short")
            if not isinstance(min_words, int) or min_words < 100:
                flags.append("min_words_below_100")
            if level not in (1, 2, 3, 4):
                flags.append("invalid_planned_level")
            if not family:
                flags.append("missing_construct_family")
            if domain != "Artikulasi Penulisan":
                flags.append("wrong_content_domain")
            low = prompt.casefold()
            cue_count = sum(cue in low for cue in REASONING_CUES)
            if cue_count < 2:
                flags.append("low_reasoning_demand")
            if any(p in low for p in WEAK_PROMPTS):
                flags.append("weak_generic_prompt")
            if prompt.count("?") > 2:
                flags.append("too_many_questions")

            rows.append({
                "uid": uid,
                "set": n,
                "id": w.get("id"),
                "title": title,
                "prompt": prompt,
                "min_words": min_words,
                "plannedLevel": level,
                "constructFamily": family,
                "contentDomain": domain,
                "flags": flags,
            })
            for f in flags:
                errors.append(f"{uid}:{f}")

    if len(rows) != 150:
        errors.append(f"expected_150_prompts:found={len(rows)}")

    ids = [r["uid"] for r in rows]
    if len(ids) != len(set(ids)):
        errors.append("duplicate_runtime_c_ids")

    exact = defaultdict(list)
    num_norm = defaultdict(list)
    title_groups = defaultdict(list)
    for r in rows:
        exact[norm(r["prompt"])].append(r["uid"])
        num_norm[norm(r["prompt"], numbers=True)].append(r["uid"])
        title_groups[norm(r["title"])].append(r["uid"])

    exact_groups = [g for k, g in exact.items() if k and len(g) > 1]
    num_groups = [g for k, g in num_norm.items() if k and len(g) > 1]
    title_dupes = [g for k, g in title_groups.items() if k and len(g) > 1]
    if exact_groups:
        errors.append(f"exact_prompt_duplicate_groups={len(exact_groups)}")
    # Number-normalised duplicates are also release blocking because they usually indicate template reuse.
    if num_groups:
        errors.append(f"number_normalized_prompt_duplicate_groups={len(num_groups)}")
    if title_dupes:
        warnings.append(f"duplicate_title_groups={len(title_dupes)}")

    near_pairs = []
    prepared = [(r, norm(r["prompt"], numbers=True), tokens(r["prompt"])) for r in rows]
    for i in range(len(prepared)):
        a, na, ta = prepared[i]
        for j in range(i + 1, len(prepared)):
            b, nb, tb = prepared[j]
            if not ta or not tb:
                continue
            jac = len(ta & tb) / max(1, len(ta | tb))
            overlap = len(ta & tb) / max(1, min(len(ta), len(tb)))
            if jac < 0.45 and overlap < 0.65:
                continue
            seq = SequenceMatcher(None, na, nb, autojunk=False).ratio()
            if seq >= 0.88 or jac >= 0.72:
                near_pairs.append({
                    "a": a["uid"], "b": b["uid"],
                    "sequence": round(seq, 3), "jaccard": round(jac, 3),
                })
    if near_pairs:
        errors.append(f"near_duplicate_prompt_pairs={len(near_pairs)}")

    level_counts = Counter(r["plannedLevel"] for r in rows)
    family_counts = Counter(r["constructFamily"] for r in rows if r["constructFamily"])
    per_set = Counter(r["set"] for r in rows)

    report = {
        "version": "PKSK_C_FINAL_50SETS_AUDIT_V1",
        "sourceBranchExpectation": "staging/pksk-final-50sets",
        "setFiles": len(paths),
        "promptCount": len(rows),
        "perSetCounts": dict(sorted(per_set.items())),
        "levelCounts": {str(k): v for k, v in sorted(level_counts.items(), key=lambda kv: str(kv[0]))},
        "constructFamilyCount": len(family_counts),
        "constructFamilyTop": family_counts.most_common(20),
        "exactDuplicateGroups": exact_groups,
        "numberNormalizedDuplicateGroups": num_groups,
        "duplicateTitleGroups": title_dupes,
        "nearDuplicatePairs": near_pairs,
        "errors": errors,
        "warnings": warnings,
        "pass": not errors,
        "note": "Bahagian C is audited separately from the 3,500-item Bahagian B bank. A PASS here means 50 sets x 3 writing prompts satisfy the locked structural/editorial preflight gates.",
    }

    (OUT / "pksk_c_final_50sets_audit.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (OUT / "pksk_c_final_50sets_items.jsonl").write_text(
        "".join(json.dumps(r, ensure_ascii=False) + "\n" for r in rows), encoding="utf-8"
    )

    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if not errors else 2


if __name__ == "__main__":
    raise SystemExit(main())

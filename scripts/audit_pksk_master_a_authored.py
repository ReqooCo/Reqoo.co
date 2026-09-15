#!/usr/bin/env python3
import json
import re
import sys
from collections import Counter, defaultdict
from difflib import SequenceMatcher
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AUTHORED = ROOT / "sim/pksk/generator/master/a/authored"


def norm(s: str) -> str:
    s = s.lower()
    s = re.sub(r"\d+", "#", s)
    s = re.sub(r"[^a-z0-9#\u00c0-\u024f\u1e00-\u1eff]+", " ", s)
    return " ".join(s.split())


def token_set(s: str):
    return frozenset(s.split())


def likely_lexical_candidate(a: str, b: str, ta, tb) -> bool:
    """Cheap conservative prefilter before SequenceMatcher.

    Exact/normalised duplicates are checked separately. For near-duplicates, strings with
    very different lengths or almost no shared tokens cannot reach our 0.80 lexical
    similarity threshold. This keeps the full 1,500-item audit practical without turning
    off the strong pairwise check.
    """
    la, lb = len(a), len(b)
    if not la or not lb:
        return False
    if min(la, lb) / max(la, lb) < 0.60:
        return False
    if not ta or not tb:
        return False
    overlap = len(ta & tb) / min(len(ta), len(tb))
    return overlap >= 0.35


def load_items():
    items = []
    for path in sorted(AUTHORED.glob("wave*.jsonl")):
        for line_no, raw in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
            if not raw.strip():
                continue
            try:
                item = json.loads(raw)
            except Exception as exc:
                raise AssertionError(f"{path}:{line_no} invalid JSON: {exc}")
            item["_source"] = f"{path.name}:{line_no}"
            items.append(item)
    return items


def fail(msg):
    print(f"FAIL: {msg}")
    raise SystemExit(1)


def main():
    items = load_items()
    if not items:
        fail("no authored Bahagian A items found")

    ids = [x.get("bankId") for x in items]
    if None in ids or len(ids) != len(set(ids)):
        fail("bankId missing or duplicated")

    family_variant = [(x.get("repeatFamily"), x.get("variant")) for x in items]
    if len(family_variant) != len(set(family_variant)):
        fail("repeatFamily + variant duplicated")

    for x in items:
        bid = x["bankId"]
        fmt = x.get("format")
        opts = x.get("options")
        weights = x.get("weights")
        q = (x.get("question") or "").strip()
        if not q:
            fail(f"{bid}: blank question")
        if fmt == "SITUATIONAL":
            if not isinstance(opts, list) or len(opts) != 4 or len(set(opts)) != 4:
                fail(f"{bid}: situational must have 4 unique options")
            if sorted(weights or []) != [0, 1, 2, 3]:
                fail(f"{bid}: situational weights must be a permutation of 0,1,2,3")
        elif fmt == "AGREE_DISAGREE":
            if opts != ["Setuju", "Tidak setuju"]:
                fail(f"{bid}: agree/disagree options invalid")
            if weights not in ([3, 0], [0, 3]):
                fail(f"{bid}: agree/disagree weights invalid")
        else:
            fail(f"{bid}: unknown format {fmt}")
        if x.get("domain") not in {"EQ", "SQ", "SSQ"}:
            fail(f"{bid}: invalid domain")

    exact = defaultdict(list)
    normalized = defaultdict(list)
    option_sets = defaultdict(list)
    for x in items:
        exact[x["question"].strip().lower()].append(x["bankId"])
        normalized[norm(x["question"])].append(x["bankId"])
        if x["format"] == "SITUATIONAL":
            option_sets[tuple(sorted(norm(o) for o in x["options"]))].append(x["bankId"])

    dup_exact = {k:v for k,v in exact.items() if len(v) > 1}
    dup_norm = {k:v for k,v in normalized.items() if len(v) > 1}
    dup_option_sets = {k:v for k,v in option_sets.items() if len(v) > 1}
    if dup_exact:
        fail(f"exact question duplicates: {list(dup_exact.values())[:5]}")
    if dup_norm:
        fail(f"normalised question duplicates: {list(dup_norm.values())[:5]}")
    if dup_option_sets:
        fail(f"identical situational option sets: {list(dup_option_sets.values())[:5]}")

    # High lexical similarity is a hard stop; medium similarity is reported for editorial review.
    # Same-family variants are intentionally related and are instead controlled by the authored
    # variant axes; this block catches accidental template reuse across DIFFERENT families.
    stems = []
    for x in items:
        s = norm(x["question"])
        stems.append((x["bankId"], s, x["repeatFamily"], token_set(s)))
    hard = []
    review = []
    candidates = 0
    for i in range(len(stems)):
        id1, a, fam1, ta = stems[i]
        for j in range(i + 1, len(stems)):
            id2, b, fam2, tb = stems[j]
            if fam1 == fam2:
                continue
            if not likely_lexical_candidate(a, b, ta, tb):
                continue
            sm = SequenceMatcher(None, a, b, autojunk=False)
            if sm.real_quick_ratio() < 0.78 or sm.quick_ratio() < 0.78:
                continue
            candidates += 1
            ratio = sm.ratio()
            if ratio >= 0.90:
                hard.append((round(ratio, 3), id1, id2))
            elif ratio >= 0.80:
                review.append((round(ratio, 3), id1, id2))
    if hard:
        fail(f"cross-family stems too similar: {sorted(hard, reverse=True)[:10]}")

    by_variant = defaultdict(list)
    for x in items:
        by_variant[x["variant"]].append(x)

    # Every completed wave must contain one item from all 150 families: 100 situational + 50 direct, 50 per domain.
    for variant, wave in sorted(by_variant.items()):
        if len(wave) == 150:
            formats = Counter(x["format"] for x in wave)
            domains = Counter(x["domain"] for x in wave)
            families = {x["repeatFamily"] for x in wave}
            if formats != Counter({"SITUATIONAL": 100, "AGREE_DISAGREE": 50}):
                fail(f"variant {variant}: wrong format mix {formats}")
            if domains != Counter({"EQ": 50, "SQ": 50, "SSQ": 50}):
                fail(f"variant {variant}: wrong domain mix {domains}")
            if len(families) != 150:
                fail(f"variant {variant}: expected 150 unique families, got {len(families)}")
        else:
            print(f"INFO: variant {variant} is partial ({len(wave)}/150)")

    print(f"PASS: {len(items)} authored Bahagian A items")
    print("By format:", dict(Counter(x["format"] for x in items)))
    print("By domain:", dict(Counter(x["domain"] for x in items)))
    print("By variant:", dict(Counter(x["variant"] for x in items)))
    print(f"Lexical candidate pairs fully compared: {candidates}")
    if review:
        print("EDITORIAL_REVIEW lexical-similarity pairs (>=0.80, <0.90):")
        for row in sorted(review, reverse=True)[:20]:
            print(" ", row)
    return 0


if __name__ == "__main__":
    sys.exit(main())

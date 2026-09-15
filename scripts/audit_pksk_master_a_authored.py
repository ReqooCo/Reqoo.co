#!/usr/bin/env python3
"""Hard gate for the canonical 1,500-item PKSK Bahagian A master bank.

This deliberately audits only the canonical a_XXXX_XXXX.jsonl files.  The older
wave*.jsonl authoring files are useful working material, but they must never be
mistaken for the final 1,500-item bank.
"""
from __future__ import annotations

import json
import re
import sys
from collections import Counter, defaultdict
from difflib import SequenceMatcher
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AUTHORED = ROOT / "sim/pksk/generator/master/a/authored"
CANON_RE = re.compile(r"^a_(\d{4})_(\d{4})\.jsonl$")
REQUIRED_FIELDS = {
    "bankId", "section", "domain", "format", "repeatFamily", "construct",
    "contextFamily", "variant", "difficultyScore", "cognitiveDemand",
    "reasoningForm", "presentationForm", "recommendedMinSetGap",
    "surfaceSignature", "question", "options", "weights",
    "patternSignature", "setAssignment", "reviewStatus",
}


def norm(s: str) -> str:
    s = s.lower()
    s = re.sub(r"\d+(?:[.,]\d+)?", "#", s)
    s = re.sub(r"[^a-z0-9#\u00c0-\u024f\u1e00-\u1eff]+", " ", s)
    return " ".join(s.split())


def token_set(s: str) -> frozenset[str]:
    return frozenset(norm(s).split())


def likely_lexical_candidate(a: str, b: str, ta, tb) -> bool:
    if not a or not b:
        return False
    if min(len(a), len(b)) / max(len(a), len(b)) < 0.60:
        return False
    if not ta or not tb:
        return False
    return len(ta & tb) / min(len(ta), len(tb)) >= 0.35


def fail(msg: str) -> None:
    print(f"FAIL: {msg}")
    raise SystemExit(1)


def load_items():
    files = []
    for path in AUTHORED.iterdir():
        if path.is_file() and CANON_RE.match(path.name):
            files.append(path)
    files.sort()

    expected_files = [AUTHORED / f"a_{start:04d}_{start+99:04d}.jsonl" for start in range(1, 1501, 100)]
    if files != expected_files:
        got = [p.name for p in files]
        exp = [p.name for p in expected_files]
        fail(f"canonical chunk set mismatch; expected={exp}, got={got}")

    items = []
    for path in files:
        lines = [x for x in path.read_text(encoding="utf-8").splitlines() if x.strip()]
        if len(lines) != 100:
            fail(f"{path.name}: expected 100 records, got {len(lines)}")
        for line_no, raw in enumerate(lines, 1):
            try:
                item = json.loads(raw)
            except Exception as exc:
                fail(f"{path.name}:{line_no}: invalid JSON: {exc}")
            item["_source"] = f"{path.name}:{line_no}"
            items.append(item)
    return files, items


def main() -> int:
    files, items = load_items()
    if len(items) != 1500:
        fail(f"expected 1500 canonical items, got {len(items)}")

    expected_ids = [f"A{i:04d}" for i in range(1, 1501)]
    ids = [x.get("bankId") for x in items]
    if ids != expected_ids:
        fail("bankId sequence must be exactly A0001..A1500 with no gaps or reordering")

    formats = Counter(x.get("format") for x in items)
    domains = Counter(x.get("domain") for x in items)
    if formats != Counter({"SITUATIONAL": 1000, "AGREE_DISAGREE": 500}):
        fail(f"wrong format quota: {formats}")
    if domains != Counter({"EQ": 500, "SQ": 500, "SSQ": 500}):
        fail(f"wrong domain quota: {domains}")

    exact = defaultdict(list)
    normalized = defaultdict(list)
    option_sets = defaultdict(list)
    family_items = defaultdict(list)
    warnings = []
    linguistic_errors = []

    for x in items:
        bid = x["bankId"]
        missing = sorted(REQUIRED_FIELDS - set(x))
        if missing:
            fail(f"{bid}: missing metadata {missing}")
        if x.get("section") != "BAHAGIAN A":
            fail(f"{bid}: wrong section")
        if x.get("domain") not in {"EQ", "SQ", "SSQ"}:
            fail(f"{bid}: invalid domain {x.get('domain')}")
        if x.get("setAssignment") is not None:
            fail(f"{bid}: setAssignment must stay null before assembly")
        if x.get("recommendedMinSetGap") != 10:
            fail(f"{bid}: recommendedMinSetGap must be 10")
        if x.get("reviewStatus") != "AUTHORED_STRUCTURAL_QA_PASS_EDITORIAL_REVIEW_REQUIRED":
            fail(f"{bid}: unexpected reviewStatus {x.get('reviewStatus')}")

        v = x.get("variant")
        if not isinstance(v, int) or not 1 <= v <= 10:
            fail(f"{bid}: variant must be integer 1..10")
        d = x.get("difficultyScore")
        if not isinstance(d, (int, float)) or isinstance(d, bool) or not 1.0 <= float(d) <= 4.0:
            fail(f"{bid}: difficultyScore must be numeric 1.0..4.0")

        q = str(x.get("question") or "").strip()
        if not q:
            fail(f"{bid}: blank question")
        if q != x.get("question"):
            fail(f"{bid}: question has leading/trailing whitespace")
        if "  " in q:
            linguistic_errors.append(f"{bid}: double spaces in question")
        if re.search(r"\b[Jj]ika\b[^.!?]{0,180},\s*[Jj]ika\b", q):
            linguistic_errors.append(f"{bid}: awkward repeated 'Jika ..., jika ...' construction")
        if len(q) > 520:
            linguistic_errors.append(f"{bid}: question unusually long ({len(q)} chars)")

        exact[q.casefold()].append(bid)
        normalized[norm(q)].append(bid)
        family_items[x["repeatFamily"]].append(x)

        opts = x.get("options")
        weights = x.get("weights")
        if x["format"] == "SITUATIONAL":
            if not isinstance(opts, list) or len(opts) != 4 or len(set(opts)) != 4:
                fail(f"{bid}: situational requires 4 unique options")
            if sorted(weights or []) != [0, 1, 2, 3]:
                fail(f"{bid}: situational weights must be permutation 0,1,2,3")
            if any(not isinstance(o, str) or not o.strip() for o in opts):
                fail(f"{bid}: blank/non-text situational option")
            if any("  " in o for o in opts):
                linguistic_errors.append(f"{bid}: double spaces in option")
            option_sets[tuple(sorted(norm(o) for o in opts))].append(bid)
        elif x["format"] == "AGREE_DISAGREE":
            if opts != ["Setuju", "Tidak setuju"]:
                fail(f"{bid}: agree/disagree options invalid")
            if weights not in ([3, 0], [0, 3]):
                fail(f"{bid}: agree/disagree weights invalid")
        else:
            fail(f"{bid}: unknown format {x['format']}")

    if linguistic_errors:
        print("LINGUISTIC HARD FAILURES:")
        for row in linguistic_errors[:100]:
            print(" ", row)
        fail(f"{len(linguistic_errors)} linguistic hard failure(s)")

    dup_exact = [v for v in exact.values() if len(v) > 1]
    dup_norm = [v for v in normalized.values() if len(v) > 1]
    dup_opts = [v for v in option_sets.values() if len(v) > 1]
    if dup_exact:
        fail(f"exact question duplicates: {dup_exact[:10]}")
    if dup_norm:
        fail(f"normalised question duplicates: {dup_norm[:10]}")
    if dup_opts:
        fail(f"identical situational option sets: {dup_opts[:10]}")

    if len(family_items) != 150:
        fail(f"expected 150 repeat families, got {len(family_items)}")
    for fam, rows in sorted(family_items.items()):
        if len(rows) != 10:
            fail(f"{fam}: expected 10 variants, got {len(rows)}")
        variants = sorted(x["variant"] for x in rows)
        if variants != list(range(1, 11)):
            fail(f"{fam}: variants must be 1..10, got {variants}")
        difficulties = [float(x["difficultyScore"]) for x in sorted(rows, key=lambda z: z["variant"])]
        if any(b <= a for a, b in zip(difficulties, difficulties[1:])):
            fail(f"{fam}: difficulty must strictly increase across variants: {difficulties}")
        if len({x["domain"] for x in rows}) != 1 or len({x["format"] for x in rows}) != 1:
            fail(f"{fam}: domain/format changed inside repeat family")

    # Cross-family lexical similarity. Same-family items are deliberately related and are
    # controlled by the 10-set spacing rule plus materially different cognitive axes.
    stems = [(x["bankId"], norm(x["question"]), x["repeatFamily"], token_set(x["question"])) for x in items]
    hard = []
    review = []
    candidates = 0
    for i in range(len(stems)):
        id1, a, fam1, ta = stems[i]
        for j in range(i + 1, len(stems)):
            id2, b, fam2, tb = stems[j]
            if fam1 == fam2 or not likely_lexical_candidate(a, b, ta, tb):
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
        fail(f"cross-family stems too similar: {sorted(hard, reverse=True)[:20]}")

    # Editorial warning: repeated opening phrases are not automatically wrong, but very high
    # concentration makes a bank feel templated. Report these so they cannot be overlooked.
    prefix_counts = Counter()
    for x in items:
        words = norm(x["question"]).split()
        if len(words) >= 6:
            prefix_counts[" ".join(words[:6])] += 1
    common_prefixes = [(n, p) for p, n in prefix_counts.items() if n >= 20]
    common_prefixes.sort(reverse=True)

    print(f"PASS: {len(items)} canonical Bahagian A items across {len(files)} chunks")
    print("By format:", dict(formats))
    print("By domain:", dict(domains))
    print("Repeat families:", len(family_items), "x 10 variants")
    print("Lexical candidate pairs fully compared:", candidates)
    print("Cross-family review pairs >=0.80,<0.90:", len(review))
    if review:
        for row in sorted(review, reverse=True)[:20]:
            print(" EDITORIAL_REVIEW", row)
    print("Common six-word question prefixes used >=20 times:", len(common_prefixes))
    for n, p in common_prefixes[:20]:
        print(f" TEMPLATE_REVIEW x{n}: {p}")
    print("AUDIT_SCOPE=CANONICAL_1500")
    return 0


if __name__ == "__main__":
    sys.exit(main())

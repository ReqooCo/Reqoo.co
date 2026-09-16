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

PER_SET = {
    "Matematik": 20,
    "IQ": 10,
    "Bahasa Melayu": 8,
    "English": 8,
    "Sains": 8,
    "Teknologi/RBT": 6,
    "Pengetahuan Am": 6,
    "Penyelesaian Masalah": 4,
}
GLOBAL = {k: v * 50 for k, v in PER_SET.items()}
ANSWER = {0: 18, 1: 18, 2: 17, 3: 17}
NUM_RE = re.compile(r"\b\d+(?:[.,]\d+)?\b")
PUNCT_RE = re.compile(r"[^\w\s]", re.UNICODE)
SPACE_RE = re.compile(r"\s+")


def norm(text: object, numbers: bool = False) -> str:
    s = str(text or "").casefold().strip()
    if numbers:
        s = NUM_RE.sub("#", s)
    s = PUNCT_RE.sub(" ", s)
    return SPACE_RE.sub(" ", s).strip()


def toks(text: object) -> set[str]:
    return {x for x in norm(text, numbers=True).split() if len(x) > 2}


def set_no(path: Path) -> int:
    m = re.search(r"set(\d{2})\.json$", path.name, re.I)
    return int(m.group(1)) if m else -1


def main() -> int:
    paths = sorted(SETS_ROOT.glob("SET */data/set*.json"), key=set_no)
    errors: list[str] = []
    warnings: list[str] = []
    rows: list[dict] = []
    per_set_report = {}

    if len(paths) != 50:
        errors.append(f"expected_50_sets:found={len(paths)}")

    for path in paths:
        n = set_no(path)
        data = json.loads(path.read_text(encoding="utf-8"))
        qs = data.get("questions") or []
        A = [q for q in qs if str(q.get("section") or "").strip() == "BAHAGIAN A"]
        B = [q for q in qs if str(q.get("section") or "").strip() == "BAHAGIAN B"]
        C = data.get("writing") or []
        if len(A) != 30:
            errors.append(f"set{n:02d}:A_count={len(A)}")
        if len(B) != 70:
            errors.append(f"set{n:02d}:B_count={len(B)}")
        if len(C) != 3:
            errors.append(f"set{n:02d}:C_count={len(C)}")

        dcounts = Counter(str(q.get("contentDomain") or q.get("category") or "") for q in B)
        acounts = Counter(q.get("answerIndex") for q in B)
        source_ids = [str(q.get("sourceBankId") or "").strip() for q in B]
        if dcounts != Counter(PER_SET):
            errors.append(f"set{n:02d}:domain_mix={dict(dcounts)}")
        if acounts != Counter(ANSWER):
            errors.append(f"set{n:02d}:answer_mix={dict(acounts)}")
        if any(not x for x in source_ids):
            errors.append(f"set{n:02d}:missing_sourceBankId")
        if len(source_ids) != len(set(source_ids)):
            errors.append(f"set{n:02d}:duplicate_sourceBankId_within_set")

        visual_count = 0
        solution_count = 0
        for q in B:
            uid = f"S{n:02d}-{q.get('id','?')}"
            opts = q.get("options")
            ai = q.get("answerIndex")
            weights = q.get("weights")
            if not str(q.get("question") or "").strip():
                errors.append(f"{uid}:blank_question")
            if not isinstance(opts, list) or len(opts) != 4 or len({str(x).strip().casefold() for x in opts}) != 4:
                errors.append(f"{uid}:invalid_options")
            if ai not in (0, 1, 2, 3):
                errors.append(f"{uid}:invalid_answerIndex")
            elif weights != [3 if i == ai else 0 for i in range(4)]:
                errors.append(f"{uid}:weights_mismatch")
            if int(q.get("plannedLevel", 0) or 0) not in (1, 2, 3, 4):
                errors.append(f"{uid}:invalid_level")
            if not str(q.get("constructFamily") or "").strip():
                errors.append(f"{uid}:missing_constructFamily")
            if q.get("rebuildStatus") != "FINAL_50SET_FROM_VALIDATED_BANK_V1":
                errors.append(f"{uid}:wrong_rebuildStatus")
            if isinstance(q.get("visual"), dict):
                visual_count += 1
            if isinstance(q.get("solutionSteps"), list) and q.get("solutionSteps"):
                solution_count += 1
            rows.append({
                "uid": uid,
                "set": n,
                "domain": str(q.get("contentDomain") or q.get("category") or ""),
                "sourceBankId": str(q.get("sourceBankId") or "").strip(),
                "question": str(q.get("question") or "").strip(),
                "answerIndex": ai,
                "plannedLevel": q.get("plannedLevel"),
                "hasVisual": isinstance(q.get("visual"), dict),
                "hasSolution": isinstance(q.get("solutionSteps"), list) and bool(q.get("solutionSteps")),
            })

        per_set_report[str(n)] = {
            "A": len(A), "B": len(B), "C": len(C),
            "domains": dict(dcounts), "answers": {str(k): v for k, v in sorted(acounts.items())},
            "visuals": visual_count, "solutions": solution_count,
        }

    if len(rows) != 3500:
        errors.append(f"global_B_count={len(rows)}")
    source_ids = [r["sourceBankId"] for r in rows]
    if len(set(source_ids)) != 3500:
        counts = Counter(source_ids)
        dupes = [k for k, v in counts.items() if k and v > 1]
        errors.append(f"global_unique_sourceBankIds={len(set(source_ids))}:duplicates={len(dupes)}")

    global_domains = Counter(r["domain"] for r in rows)
    if global_domains != Counter(GLOBAL):
        errors.append(f"global_domain_mix={dict(global_domains)}")

    exact = defaultdict(list)
    num = defaultdict(list)
    for r in rows:
        exact[norm(r["question"])].append(r["uid"])
        num[norm(r["question"], numbers=True)].append(r["uid"])
    exact_groups = [g for k, g in exact.items() if k and len(g) > 1]
    num_groups = [g for k, g in num.items() if k and len(g) > 1]
    if exact_groups:
        errors.append(f"exact_duplicate_groups={len(exact_groups)}")
    if num_groups:
        errors.append(f"number_normalized_duplicate_groups={len(num_groups)}")

    # Near duplicates: compare only within the same domain and use a cheap token
    # prefilter before SequenceMatcher. The source-bank validators already use a
    # strict near-duplicate gate; this is an independent final-assembly check.
    buckets = defaultdict(list)
    for r in rows:
        buckets[r["domain"]].append(r)
    near_pairs = []
    for domain, group in buckets.items():
        prep = [(r, norm(r["question"], numbers=True), toks(r["question"])) for r in group]
        for i in range(len(prep)):
            a, na, ta = prep[i]
            for j in range(i + 1, len(prep)):
                b, nb, tb = prep[j]
                if not ta or not tb:
                    continue
                inter = len(ta & tb)
                overlap = inter / max(1, min(len(ta), len(tb)))
                jac = inter / max(1, len(ta | tb))
                if overlap < 0.68 and jac < 0.55:
                    continue
                seq = SequenceMatcher(None, na, nb, autojunk=False).ratio()
                if seq >= 0.90 or jac >= 0.80:
                    near_pairs.append({
                        "domain": domain,
                        "a": a["uid"], "b": b["uid"],
                        "sequence": round(seq, 3), "jaccard": round(jac, 3),
                    })
    if near_pairs:
        errors.append(f"near_duplicate_pairs={len(near_pairs)}")

    answer_global = Counter(r["answerIndex"] for r in rows)
    level_global = Counter(r["plannedLevel"] for r in rows)
    visual_total = sum(1 for r in rows if r["hasVisual"])
    solution_total = sum(1 for r in rows if r["hasSolution"])
    if solution_total < 2306:
        warnings.append(f"solutionSteps coverage is {solution_total}/3500; strict-source survivors may rely on simulator/AI explanation fallback")

    report = {
        "version": "PKSK_FINAL_B_50SETS_AUDIT_V1",
        "setFiles": len(paths),
        "BCount": len(rows),
        "uniqueSourceBankIds": len(set(source_ids)),
        "globalDomains": dict(global_domains),
        "globalAnswerPositions": {str(k): v for k, v in sorted(answer_global.items())},
        "globalLevels": {str(k): v for k, v in sorted(level_global.items(), key=lambda kv: str(kv[0]))},
        "visualCount": visual_total,
        "solutionStepsCount": solution_total,
        "exactDuplicateGroups": exact_groups,
        "numberNormalizedDuplicateGroups": num_groups,
        "nearDuplicatePairs": near_pairs,
        "perSet": per_set_report,
        "errors": errors,
        "warnings": warnings,
        "pass": not errors,
    }
    (OUT / "pksk_final_b_50sets_audit.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (OUT / "pksk_final_b_50sets_items.jsonl").write_text(
        "".join(json.dumps(r, ensure_ascii=False) + "\n" for r in rows), encoding="utf-8"
    )
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if not errors else 2


if __name__ == "__main__":
    raise SystemExit(main())

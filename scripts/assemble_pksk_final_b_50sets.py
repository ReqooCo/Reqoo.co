#!/usr/bin/env python3
from __future__ import annotations

import glob
import json
import re
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "audit-output"
SETS_ROOT = ROOT / "sim/pksk/simulator/sets"
STRICT = OUT / "b_section_strict_source_survivors.jsonl"

DOMAIN_TARGETS = {
    "Matematik": 1000,
    "IQ": 500,
    "Bahasa Melayu": 400,
    "English": 400,
    "Sains": 400,
    "Teknologi/RBT": 300,
    "Pengetahuan Am": 300,
    "Penyelesaian Masalah": 200,
}
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
# Interleaved answer positions: exactly 18/18/17/17 without long visible runs.
ANSWER_TARGET = [0, 1, 2, 3] * 17 + [0, 1]
VALIDATED_PATTERNS = [
    "b_math_new_batch_*_validated.jsonl",
    "b_iq_new_batch_*_validated.jsonl",
    "b_bm_new_batch_*_validated.jsonl",
    "b_english_new_batch_*_validated.jsonl",
    "b_science_new_batch_*_validated.jsonl",
    "b_rbt_new_batch_*_validated.jsonl",
    "b_pa_new_batch_*_validated.jsonl",
    "b_ps_new_batch_*_validated.jsonl",
]


def fail(msg: str) -> None:
    raise SystemExit(f"FINAL B ASSEMBLY FAILED: {msg}")


def read_jsonl(path: Path) -> list[dict]:
    rows = []
    for ln, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip():
            continue
        try:
            obj = json.loads(line)
        except Exception as exc:
            fail(f"{path.name}:{ln}: invalid JSON: {exc}")
        if not isinstance(obj, dict):
            fail(f"{path.name}:{ln}: row is not an object")
        rows.append(obj)
    return rows


def canonical_domain(value: object) -> str:
    raw = str(value or "").strip()
    key = re.sub(r"\s+", " ", raw.casefold())
    aliases = {
        "matematik": "Matematik",
        "math": "Matematik",
        "iq": "IQ",
        "bahasa melayu": "Bahasa Melayu",
        "bm": "Bahasa Melayu",
        "english": "English",
        "bahasa inggeris": "English",
        "sains": "Sains",
        "science": "Sains",
        "teknologi/rbt": "Teknologi/RBT",
        "teknologi / rbt": "Teknologi/RBT",
        "rbt": "Teknologi/RBT",
        "teknologi": "Teknologi/RBT",
        "pengetahuan am": "Pengetahuan Am",
        "pa": "Pengetahuan Am",
        "penyelesaian masalah": "Penyelesaian Masalah",
        "problem solving": "Penyelesaian Masalah",
    }
    if key not in aliases:
        fail(f"unknown domain: {raw!r}")
    return aliases[key]


def unwrap(row: dict) -> dict:
    raw = row.get("raw")
    return raw if isinstance(raw, dict) else row


def get_domain(row: dict, q: dict) -> str:
    for key in ("domain", "contentDomain", "category"):
        if row.get(key):
            return canonical_domain(row[key])
        if q.get(key):
            return canonical_domain(q[key])
    fail(f"cannot resolve domain for item {row.get('bankId') or row.get('id')}")


def stable_id(row: dict, q: dict, source: str, serial: int) -> str:
    for key in ("bankId", "sourceBankId", "id", "uid"):
        v = row.get(key) or q.get(key)
        if v:
            return f"{source}:{str(v).strip()}"
    return f"{source}:AUTO-{serial:04d}"


def get_difficulty(row: dict, q: dict) -> float:
    for key in ("difficultyScore", "plannedLevel", "levelSignal", "setLevel"):
        value = row.get(key, q.get(key))
        try:
            if value is not None:
                return float(value)
        except Exception:
            pass
    return 2.5


def normalise_source_item(row: dict, source: str, serial: int) -> dict:
    q = unwrap(row)
    domain = get_domain(row, q)
    question = str(q.get("question") or row.get("question") or row.get("text") or "").strip()
    options = q.get("options") or row.get("options")
    answer = q.get("answerIndex", row.get("answerIndex"))
    if not question:
        fail(f"blank question in {source} serial {serial}")
    if not isinstance(options, list) or len(options) != 4:
        fail(f"{source} serial {serial}: expected four options")
    options = [str(x).strip() for x in options]
    # Case differences can be the tested construct in language questions, so
    # uniqueness must be exact-string rather than case-folded.
    if any(not x for x in options) or len(set(options)) != 4:
        fail(f"{source} serial {serial}: options must be nonblank and exactly unique")
    if not isinstance(answer, int) or answer not in (0, 1, 2, 3):
        fail(f"{source} serial {serial}: invalid answerIndex {answer!r}")

    return {
        "sourceBankId": stable_id(row, q, source, serial),
        "domain": domain,
        "question": question,
        "options": options,
        "answerIndex": answer,
        "difficulty": get_difficulty(row, q),
        "constructFamily": str(
            row.get("repeatFamily") or q.get("repeatFamily") or
            row.get("constructFamily") or q.get("constructFamily") or
            row.get("construct") or q.get("construct") or "validated_construct"
        ).strip(),
        "solutionSteps": row.get("solutionSteps") or q.get("solutionSteps") or [],
        "visual": row.get("visual") if isinstance(row.get("visual"), dict) else q.get("visual"),
        "sourceKind": source,
        "sourceReviewStatus": row.get("reviewStatus") or q.get("reviewStatus") or "STRICT_SOURCE_SURVIVOR",
    }


def load_bank() -> list[dict]:
    if not STRICT.exists():
        fail(f"missing strict source file: {STRICT}")
    bank: list[dict] = []
    for i, row in enumerate(read_jsonl(STRICT), 1):
        bank.append(normalise_source_item(row, "STRICT", i))

    files: list[Path] = []
    for pattern in VALIDATED_PATTERNS:
        files.extend(Path(p) for p in glob.glob(str(OUT / pattern)))
    files = sorted(set(files))
    if not files:
        fail("no validated-new B files found")
    serial = 0
    for path in files:
        for row in read_jsonl(path):
            serial += 1
            bank.append(normalise_source_item(row, "VALIDATED", serial))

    ids = [x["sourceBankId"] for x in bank]
    if len(ids) != len(set(ids)):
        dup = next(k for k, v in Counter(ids).items() if v > 1)
        fail(f"duplicate sourceBankId: {dup}")
    if len(bank) != 3500:
        fail(f"expected exactly 3500 B items, found {len(bank)}")

    counts = Counter(x["domain"] for x in bank)
    if counts != Counter(DOMAIN_TARGETS):
        fail(f"domain totals mismatch: {dict(counts)}")
    return bank


def set_paths() -> list[Path]:
    paths = sorted(
        SETS_ROOT.glob("SET */data/set*.json"),
        key=lambda p: int(re.search(r"set(\d{2})\.json$", p.name, re.I).group(1)),
    )
    if len(paths) != 50:
        fail(f"expected 50 simulator set files, found {len(paths)}")
    return paths


def distribute_domain(items: list[dict], quota: int) -> list[list[dict]]:
    if len(items) != quota * 50:
        fail(f"domain chunk mismatch: items={len(items)} quota={quota}")
    items = sorted(
        items,
        key=lambda x: (
            0 if isinstance(x.get("visual"), dict) else 1,
            x["difficulty"],
            x["sourceBankId"],
        ),
    )
    buckets = [[] for _ in range(50)]
    pos = 0
    for round_no in range(quota):
        order = list(range(50)) if round_no % 2 == 0 else list(range(49, -1, -1))
        for set_idx in order:
            buckets[set_idx].append(items[pos])
            pos += 1
    if pos != len(items) or any(len(x) != quota for x in buckets):
        fail(f"distribution quota failure: used={pos}/{len(items)} sizes={[len(x) for x in buckets]}")
    return buckets


def reorder_for_target(item: dict, target_index: int) -> tuple[list[str], int]:
    opts = list(item["options"])
    old = int(item["answerIndex"])
    correct = opts[old]
    wrong = [x for i, x in enumerate(opts) if i != old]
    rot = sum(ord(ch) for ch in item["sourceBankId"]) % 3
    wrong = wrong[rot:] + wrong[:rot]
    new_opts = list(wrong)
    new_opts.insert(target_index, correct)
    return new_opts, target_index


def output_item(item: dict, seq: int, target_answer: int, set_level: int) -> dict:
    options, answer = reorder_for_target(item, target_answer)
    level = min(4, max(1, int(round(item["difficulty"]))))
    out = {
        "id": f"B{seq:02d}",
        "sourceBankId": item["sourceBankId"],
        "section": "BAHAGIAN B",
        "category": item["domain"],
        "format": "MCQ",
        "question": item["question"],
        "options": options,
        "answerIndex": answer,
        "weights": [3 if i == answer else 0 for i in range(4)],
        "type": "graded",
        "plannedLevel": level,
        "constructFamily": item["constructFamily"],
        "levelSignal": level,
        "contentDomain": item["domain"],
        "setLevel": set_level,
        "rebuildStatus": "FINAL_50SET_FROM_VALIDATED_BANK_V1",
        "sourceKind": item["sourceKind"],
        "sourceReviewStatus": item["sourceReviewStatus"],
    }
    if isinstance(item.get("solutionSteps"), list) and item["solutionSteps"]:
        out["solutionSteps"] = item["solutionSteps"]
    if isinstance(item.get("visual"), dict):
        out["visual"] = item["visual"]
    return out


def main() -> int:
    bank = load_bank()
    by_domain: dict[str, list[dict]] = defaultdict(list)
    for item in bank:
        by_domain[item["domain"]].append(item)

    domain_buckets: dict[str, list[list[dict]]] = {}
    for domain, quota in PER_SET.items():
        domain_buckets[domain] = distribute_domain(by_domain[domain], quota)

    paths = set_paths()
    global_ids: list[str] = []
    visual_counts = []
    level_counts_global = Counter()

    # Interleave domains so each simulator presents a mixed paper rather than
    # long subject blocks.
    domain_cycle: list[str] = []
    remaining = dict(PER_SET)
    while sum(remaining.values()):
        for domain in PER_SET:
            if remaining[domain] > 0:
                domain_cycle.append(domain)
                remaining[domain] -= 1
    if len(domain_cycle) != 70:
        fail("internal domain cycle length is not 70")

    for set_idx, path in enumerate(paths):
        data = json.loads(path.read_text(encoding="utf-8"))
        pools = {d: list(domain_buckets[d][set_idx]) for d in PER_SET}
        selected = []
        for domain in domain_cycle:
            selected.append(pools[domain].pop(0))
        if any(pools[d] for d in pools):
            fail(f"set {set_idx+1}: unconsumed domain pool")

        # Rotate the interleaved exact 18/18/17/17 sequence between sets. A
        # rotation preserves counts but avoids one repeated visible key pattern.
        shift = (set_idx * 13) % 70
        targets = ANSWER_TARGET[shift:] + ANSWER_TARGET[:shift]
        set_level = 1 + (set_idx % 4)
        final_b = [output_item(item, i + 1, targets[i], set_level) for i, item in enumerate(selected)]

        counts = Counter(x["contentDomain"] for x in final_b)
        if counts != Counter(PER_SET):
            fail(f"set {set_idx+1}: domain blueprint mismatch {dict(counts)}")
        answers = Counter(x["answerIndex"] for x in final_b)
        if answers != Counter({0: 18, 1: 18, 2: 17, 3: 17}):
            fail(f"set {set_idx+1}: answer balance mismatch {dict(answers)}")

        data["questions"] = [
            q for q in (data.get("questions") or [])
            if str(q.get("section") or "").strip() != "BAHAGIAN B"
        ] + final_b
        data["bRebuildVersion"] = "FINAL_B_V1_3500_UNIQUE"
        data["bSourceBankSize"] = 3500
        data["bLegacyContentUsed"] = False
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

        global_ids.extend(x["sourceBankId"] for x in final_b)
        visual_counts.append(sum(1 for x in final_b if isinstance(x.get("visual"), dict)))
        level_counts_global.update(x["plannedLevel"] for x in final_b)

    if len(global_ids) != 3500 or len(set(global_ids)) != 3500:
        fail(f"global source usage must be exactly-once 3500, got total={len(global_ids)} unique={len(set(global_ids))}")
    if set(global_ids) != {x["sourceBankId"] for x in bank}:
        fail("assembled source IDs do not exactly match validated bank")

    print("FINAL B ASSEMBLY PASS")
    print("set_files", len(paths))
    print("B_items", len(global_ids))
    print("unique_sourceBankIds", len(set(global_ids)))
    print("domain_totals", dict(Counter(x["domain"] for x in bank)))
    print("visuals_per_set_min_max", min(visual_counts), max(visual_counts))
    print("level_counts", dict(sorted(level_counts_global.items())))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

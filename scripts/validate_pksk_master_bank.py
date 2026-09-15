#!/usr/bin/env python3
"""Validate the PKSK master bank before any Set 01-50 assembly.

Designed for the master-bank workflow:
- partial mode: validate whatever authored bank files currently exist
- final mode: enforce the locked 50-set totals and quotas

The validator intentionally does NOT assign questions to sets.
"""

from __future__ import annotations

import argparse
import json
import math
import re
import sys
from collections import Counter, defaultdict
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any, Iterable

ROOT = Path(__file__).resolve().parents[1]
BANK_ROOT = ROOT / "sim" / "pksk" / "master-bank"

LOCKED_TOTALS = {"A": 1500, "B": 3500, "C": 150}
B_DOMAIN_TOTALS = {
    "Matematik": 1000,
    "IQ": 500,
    "Bahasa Melayu": 400,
    "English": 400,
    "Sains": 400,
    "Teknologi/RBT": 300,
    "Pengetahuan Am": 300,
    "Penyelesaian Masalah": 200,
}
A_FORMAT_TOTALS = {"SITUATIONAL": 1000, "AGREE_DISAGREE": 500}
A_DOMAIN_TOTALS = {"EQ": 500, "SQ": 500, "SSQ": 500}

NAME_TOKENS = {
    "ali", "abu", "amin", "amir", "anis", "aina", "auni", "alif", "siti", "nurul",
    "farah", "hafiz", "iman", "danial", "aisyah", "hakim", "sara", "syafiq", "meena",
}
UNIT_RE = re.compile(r"\b(?:cm|mm|m|km|kg|g|mg|l|ml|rm|%|darjah|jam|minit|saat)\b", re.I)
NUM_RE = re.compile(r"\b\d+(?:[.,]\d+)?\b")
PUNCT_RE = re.compile(r"[^\w\s]", re.UNICODE)
SPACE_RE = re.compile(r"\s+")


def iter_json_objects(path: Path) -> Iterable[dict[str, Any]]:
    if path.suffix.lower() == ".jsonl":
        with path.open("r", encoding="utf-8") as fh:
            for line_no, line in enumerate(fh, 1):
                line = line.strip()
                if not line:
                    continue
                try:
                    obj = json.loads(line)
                except json.JSONDecodeError as exc:
                    raise ValueError(f"{path}:{line_no}: invalid JSONL: {exc}") from exc
                if isinstance(obj, dict):
                    yield obj
        return

    if path.suffix.lower() == ".json":
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            raise ValueError(f"{path}: invalid JSON: {exc}") from exc
        if isinstance(data, list):
            for obj in data:
                if isinstance(obj, dict):
                    yield obj
        elif isinstance(data, dict):
            if isinstance(data.get("items"), list):
                for obj in data["items"]:
                    if isinstance(obj, dict):
                        yield obj
            else:
                yield data


def discover_bank_files() -> list[Path]:
    candidates: list[Path] = []
    for base in [BANK_ROOT, ROOT / "sim" / "pksk" / "generator" / "master"]:
        if not base.exists():
            continue
        for path in base.rglob("*"):
            if path.is_file() and path.suffix.lower() in {".json", ".jsonl"}:
                name = path.name.lower()
                if "blueprint" in name or "manifest" in name or "variant_axes" in name:
                    continue
                candidates.append(path)
    return sorted(set(candidates))


def get_stem(item: dict[str, Any]) -> str:
    return str(item.get("question") or item.get("stem") or item.get("prompt") or "").strip()


def normalize_stem(text: str) -> str:
    text = text.lower()
    text = NUM_RE.sub("#", text)
    text = UNIT_RE.sub("<unit>", text)
    text = PUNCT_RE.sub(" ", text)
    toks = [tok for tok in text.split() if tok not in NAME_TOKENS]
    return SPACE_RE.sub(" ", " ".join(toks)).strip()


def token_set(text: str) -> set[str]:
    return {t for t in normalize_stem(text).split() if len(t) > 2}


def jaccard(a: str, b: str) -> float:
    sa, sb = token_set(a), token_set(b)
    if not sa and not sb:
        return 1.0
    if not sa or not sb:
        return 0.0
    return len(sa & sb) / len(sa | sb)


def sequence_similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, normalize_stem(a), normalize_stem(b)).ratio()


def validate_weights(item: dict[str, Any], errors: list[str]) -> None:
    fmt = str(item.get("format") or item.get("type") or "").upper()
    options = item.get("options")
    weights = item.get("weights")
    bid = item.get("bankId", "<missing-id>")

    if fmt == "SITUATIONAL":
        if not isinstance(options, list) or len(options) != 4:
            errors.append(f"{bid}: SITUATIONAL must have exactly 4 options")
            return
        if len({str(x).strip() for x in options}) != 4:
            errors.append(f"{bid}: duplicate option text")
        if not isinstance(weights, list) or len(weights) != 4:
            errors.append(f"{bid}: SITUATIONAL must have 4 weights")
        elif sorted(weights) != [0, 1, 2, 3]:
            errors.append(f"{bid}: situational weights must be a permutation of 0,1,2,3")

    elif fmt == "AGREE_DISAGREE":
        if options != ["Setuju", "Tidak setuju"]:
            errors.append(f"{bid}: AGREE_DISAGREE options must be exactly ['Setuju','Tidak setuju']")
        if not isinstance(weights, list) or len(weights) != 2:
            errors.append(f"{bid}: AGREE_DISAGREE must have 2 weights")
        elif sorted(weights) != [0, 1]:
            errors.append(f"{bid}: agree/disagree weights must be [0,1] in either order")

    elif str(item.get("section", "")).upper().endswith("B") or item.get("section") == "B":
        if not isinstance(options, list) or len(options) != 4:
            errors.append(f"{bid}: Bahagian B must have exactly 4 options")
            return
        if len({str(x).strip() for x in options}) != 4:
            errors.append(f"{bid}: duplicate option text")
        ans = item.get("answerIndex")
        if ans not in {0, 1, 2, 3}:
            errors.append(f"{bid}: invalid answerIndex")
        if isinstance(weights, list) and len(weights) == 4:
            expected = [1 if i == ans else 0 for i in range(4)] if ans in {0, 1, 2, 3} else None
            if expected is not None and weights != expected:
                errors.append(f"{bid}: B weights do not match answerIndex")


def section_key(item: dict[str, Any]) -> str:
    sec = str(item.get("section") or "").upper().replace("BAHAGIAN", "").strip()
    if sec.startswith("A"):
        return "A"
    if sec.startswith("B"):
        return "B"
    if sec.startswith("C"):
        return "C"
    bid = str(item.get("bankId") or "").upper()
    return bid[:1] if bid[:1] in {"A", "B", "C"} else "?"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--final", action="store_true", help="enforce all locked 50-set totals")
    ap.add_argument("--similarity-threshold", type=float, default=0.84)
    ap.add_argument("--jaccard-threshold", type=float, default=0.78)
    ap.add_argument("--max-warnings", type=int, default=80)
    args = ap.parse_args()

    files = discover_bank_files()
    items: list[dict[str, Any]] = []
    load_errors: list[str] = []
    for path in files:
        try:
            items.extend(iter_json_objects(path))
        except ValueError as exc:
            load_errors.append(str(exc))

    errors: list[str] = list(load_errors)
    warnings: list[str] = []

    ids: Counter[str] = Counter()
    exact: defaultdict[str, list[str]] = defaultdict(list)
    norm: defaultdict[str, list[str]] = defaultdict(list)
    patterns: Counter[str] = Counter()
    sections: Counter[str] = Counter()
    a_formats: Counter[str] = Counter()
    a_domains: Counter[str] = Counter()
    b_domains: Counter[str] = Counter()

    authored: list[dict[str, Any]] = []
    for item in items:
        bid = str(item.get("bankId") or "").strip()
        if not bid:
            errors.append("item missing bankId")
            continue
        ids[bid] += 1

        diff = item.get("difficultyScore")
        if not isinstance(diff, (int, float)) or isinstance(diff, bool) or not math.isfinite(float(diff)):
            errors.append(f"{bid}: difficultyScore must be numeric")
        elif not (1.0 <= float(diff) <= 5.0):
            warnings.append(f"{bid}: difficultyScore outside preferred 1.0-5.0 range")

        if item.get("setAssignment") not in (None, "", []):
            errors.append(f"{bid}: setAssignment must remain empty before master-bank approval")

        stem = get_stem(item)
        if stem:
            authored.append(item)
            exact[stem.casefold()].append(bid)
            norm[normalize_stem(stem)].append(bid)
        elif str(item.get("reviewStatus", "")).upper() not in {"PLANNED_NOT_AUTHORED", "PLANNED"}:
            warnings.append(f"{bid}: missing question/stem/prompt")

        pat = str(item.get("patternSignature") or "").strip()
        if pat:
            patterns[pat] += 1

        sec = section_key(item)
        sections[sec] += 1
        if sec == "A":
            a_formats[str(item.get("format") or "").upper()] += 1
            a_domains[str(item.get("domain") or "").upper()] += 1
        elif sec == "B":
            b_domains[str(item.get("domain") or "")] += 1

        if stem:
            validate_weights(item, errors)

    for bid, count in ids.items():
        if count > 1:
            errors.append(f"duplicate bankId {bid} x{count}")

    for stem, bid_list in exact.items():
        if stem and len(bid_list) > 1:
            errors.append(f"exact duplicate stem: {', '.join(bid_list)}")

    for stem, bid_list in norm.items():
        if stem and len(bid_list) > 1:
            errors.append(f"normalised duplicate stem: {', '.join(bid_list)}")

    for pat, count in patterns.items():
        if count > 10:
            warnings.append(f"patternSignature used {count} times: {pat}")

    # Similarity scan within same section/domain/construct to keep runtime bounded.
    buckets: defaultdict[tuple[str, str, str], list[dict[str, Any]]] = defaultdict(list)
    for item in authored:
        key = (section_key(item), str(item.get("domain") or ""), str(item.get("construct") or ""))
        buckets[key].append(item)

    for bucket_items in buckets.values():
        n = len(bucket_items)
        for i in range(n):
            ai = bucket_items[i]
            si = get_stem(ai)
            for j in range(i + 1, n):
                bj = bucket_items[j]
                sj = get_stem(bj)
                jac = jaccard(si, sj)
                seq = sequence_similarity(si, sj)
                if jac >= args.jaccard_threshold or seq >= args.similarity_threshold:
                    warnings.append(
                        f"near-similar {ai.get('bankId')} <-> {bj.get('bankId')} "
                        f"(jaccard={jac:.2f}, seq={seq:.2f})"
                    )

    if args.final:
        for sec, expected in LOCKED_TOTALS.items():
            if sections[sec] != expected:
                errors.append(f"final quota {sec}: expected {expected}, got {sections[sec]}")
        for fmt, expected in A_FORMAT_TOTALS.items():
            if a_formats[fmt] != expected:
                errors.append(f"final A format {fmt}: expected {expected}, got {a_formats[fmt]}")
        for dom, expected in A_DOMAIN_TOTALS.items():
            if a_domains[dom] != expected:
                errors.append(f"final A domain {dom}: expected {expected}, got {a_domains[dom]}")
        for dom, expected in B_DOMAIN_TOTALS.items():
            if b_domains[dom] != expected:
                errors.append(f"final B domain {dom}: expected {expected}, got {b_domains[dom]}")

    print("PKSK MASTER BANK QA")
    print(f"files={len(files)} items={len(items)} authored={len(authored)}")
    print(f"sections={dict(sections)}")
    print(f"A formats={dict(a_formats)} A domains={dict(a_domains)}")
    print(f"errors={len(errors)} warnings={len(warnings)}")

    for msg in errors[:100]:
        print(f"ERROR: {msg}")
    for msg in warnings[: args.max_warnings]:
        print(f"WARN: {msg}")

    if len(warnings) > args.max_warnings:
        print(f"WARN: ... {len(warnings) - args.max_warnings} more warnings hidden")

    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())

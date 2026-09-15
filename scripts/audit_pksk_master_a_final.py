#!/usr/bin/env python3
"""Editorial-source gate for PKSK Bahagian A.

The generator bank is a 1,500-item structural scaffold. The release source is
sim/pksk/master-bank/A. This gate prevents the project from calling Bahagian A FINAL
until that editorial source contains exactly 1,500 approved items with the locked
quotas and no duplicate stems.
"""
from __future__ import annotations

import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
A_ROOT = ROOT / "sim/pksk/master-bank/A"
MANIFEST = ROOT / "sim/pksk/master-bank/manifest.json"
NUM_RE = re.compile(r"\b\d+(?:[.,]\d+)?\b")
PUNCT_RE = re.compile(r"[^\w\s]", re.UNICODE)
SPACE_RE = re.compile(r"\s+")


def norm(text: str) -> str:
    text = NUM_RE.sub("#", text.lower())
    text = PUNCT_RE.sub(" ", text)
    return SPACE_RE.sub(" ", text).strip()


def load_items():
    items = []
    for path in sorted(A_ROOT.glob("*.jsonl")):
        for line_no, raw in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
            if not raw.strip():
                continue
            try:
                item = json.loads(raw)
            except Exception as exc:
                raise SystemExit(f"FAIL: {path.name}:{line_no}: invalid JSON: {exc}")
            item["_source"] = f"{path.name}:{line_no}"
            items.append(item)
    return items


def fail(msg: str):
    print("FAIL:", msg)
    raise SystemExit(1)


def main() -> int:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    cfg = manifest["sections"]["A"]
    target = int(cfg["total"])
    declared_current = int(cfg.get("current", 0))
    state = str(cfg.get("status", "AUTHORING"))
    final_mode = state in {"FINAL_READY", "FINAL_LOCKED"}

    items = load_items()
    if declared_current != len(items):
        fail(f"manifest A.current={declared_current}, editorial files contain {len(items)}")

    ids = Counter()
    exact = defaultdict(list)
    normalized = defaultdict(list)
    formats = Counter()
    domains = Counter()
    errors = []

    for item in items:
        bid = str(item.get("bankId") or "").strip()
        if not bid:
            errors.append(f"{item.get('_source')}: missing bankId")
            continue
        ids[bid] += 1
        if item.get("section") != "BAHAGIAN A":
            errors.append(f"{bid}: wrong section")
        fmt = str(item.get("format") or "")
        dom = str(item.get("domain") or "")
        formats[fmt] += 1
        domains[dom] += 1
        q = str(item.get("question") or "").strip()
        if not q:
            errors.append(f"{bid}: blank question")
        else:
            exact[q.casefold()].append(bid)
            normalized[norm(q)].append(bid)
        if item.get("setAssignment") not in (None, "", []):
            errors.append(f"{bid}: setAssignment must be empty before assembly")
        if fmt == "SITUATIONAL":
            opts, weights = item.get("options"), item.get("weights")
            if not isinstance(opts, list) or len(opts) != 4 or len(set(opts)) != 4:
                errors.append(f"{bid}: situational must have four unique options")
            if sorted(weights or []) != [0, 1, 2, 3]:
                errors.append(f"{bid}: situational weights invalid")
        elif fmt == "AGREE_DISAGREE":
            if item.get("options") != ["Setuju", "Tidak setuju"]:
                errors.append(f"{bid}: agree/disagree options invalid")
            if item.get("weights") not in ([3, 0], [0, 3]):
                errors.append(f"{bid}: agree/disagree weights invalid")
        else:
            errors.append(f"{bid}: unknown format {fmt}")

    for bid, n in ids.items():
        if n > 1:
            errors.append(f"duplicate bankId {bid} x{n}")
    for group in exact.values():
        if len(group) > 1:
            errors.append(f"exact duplicate stem: {group}")
    for group in normalized.values():
        if len(group) > 1:
            errors.append(f"normalised duplicate stem: {group}")

    if errors:
        for e in errors[:100]:
            print("ERROR:", e)
        fail(f"{len(errors)} editorial-bank validation error(s)")

    if final_mode:
        if len(items) != target:
            fail(f"A marked {state} but has {len(items)}/{target} editorial items")
        expected_formats = Counter({"SITUATIONAL": 1000, "AGREE_DISAGREE": 500})
        expected_domains = Counter({"EQ": 500, "SQ": 500, "SSQ": 500})
        if formats != expected_formats:
            fail(f"final format quota mismatch: {formats}")
        if domains != expected_domains:
            fail(f"final domain quota mismatch: {domains}")
        unapproved = [x["bankId"] for x in items if x.get("reviewStatus") not in {"EDITORIAL_QA_PASS", "FINAL_APPROVED"}]
        if unapproved:
            fail(f"{len(unapproved)} items not editorial-approved; examples={unapproved[:20]}")

    print("PKSK A FINAL-EDITORIAL GATE PASS")
    print(f"state={state} editorial={len(items)}/{target} final_mode={final_mode}")
    print("formats=", dict(formats), "domains=", dict(domains))
    if not final_mode:
        print("INFO: structural generator bank may be complete, but Bahagian A is NOT FINAL until editorial=1500/1500 and status=FINAL_READY.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

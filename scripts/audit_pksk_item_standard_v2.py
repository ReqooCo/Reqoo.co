#!/usr/bin/env python3
"""REQOO PKSK Item Audit V2.

Read-only audit for sim/pksk/simulator/sets/**/data/set*.json.
It never modifies live or clone question files.

Outputs:
- sim/pksk/curation/item_audit_v2.json
- sim/pksk/curation/item_audit_v2.md
"""
from __future__ import annotations
import json
import re
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SETS = ROOT / "sim" / "pksk" / "simulator" / "sets"
OUT_DIR = ROOT / "sim" / "pksk" / "curation"
OUT_JSON = OUT_DIR / "item_audit_v2.json"
OUT_MD = OUT_DIR / "item_audit_v2.md"

SUPPORTED_VISUALS = {
    "fraction_bar", "five_value_data", "rectangle",
    "cuboid", "straight_line_angle", "coordinate_move",
}
VISUAL_CUES = re.compile(r"\b(rajah|gambar rajah|graf|carta|jadual|diagram|figure)\b", re.I)
APPENDED_CONTEXT = re.compile(
    r"(?:\bKonteks\s*:|\bdalam projek bertema\b|\bkumpulan\s+(?:Alpha|Beta|Gamma|Delta|Epsilon)\b)",
    re.I,
)
BROKEN_TUPLE = re.compile(r"^\s*[\[(]\s*['\"]")
MALFORMED = re.compile(r"(?:\?\s+[a-z]|\.\s+dalam projek|\bKonteks:\s*$)", re.I)
A_SECTION = re.compile(r"(?:BAHAGIAN\s*A|^A\d|-[A]0?\d)", re.I)
B_SECTION = re.compile(r"(?:BAHAGIAN\s*B|^B\d|-[B]0?\d)", re.I)

def exact_norm(text):
    return re.sub(r"\s+", " ", (text or "").strip().lower())

def template_norm(text):
    text = (text or "").lower()
    text = re.sub(r"\b\d+(?:[.,]\d+)?\b", "#", text)
    text = re.sub(r"\b(?:alpha|beta|gamma|delta|epsilon)\b", "group", text)
    text = re.sub(r"\bkonteks\s*:[^.?!]*[.?!]?", "", text)
    text = re.sub(r"[^a-z0-9#\u00c0-\u024f\u1e00-\u1eff]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()

def section_of(q):
    blob = str(q.get("section", "")) + " " + str(q.get("id", ""))
    if A_SECTION.search(blob):
        return "A"
    if B_SECTION.search(blob):
        return "B"
    return str(q.get("section", "") or "?")

def flag_item(q):
    flags = []
    stem = str(q.get("question", "") or "").strip()
    options = q.get("options")
    visual = q.get("visual")
    section = section_of(q)

    if APPENDED_CONTEXT.search(stem):
        flags.append("appended_context")
    if BROKEN_TUPLE.search(stem) or stem.startswith("('") or stem.startswith('("'):
        flags.append("broken_generated_stem")
    if MALFORMED.search(stem) or not stem:
        flags.append("malformed_text")

    cue = bool(VISUAL_CUES.search(stem))
    if cue and not visual:
        flags.append("missing_visual")
    if isinstance(visual, dict):
        kind = str(visual.get("kind", ""))
        if kind not in SUPPORTED_VISUALS:
            flags.append("unsupported_visual_kind")
        if not cue:
            flags.append("decorative_or_redundant_visual_candidate")

    if section == "B":
        if not isinstance(options, list) or len(options) != 4:
            flags.append("invalid_option_count")
        answer = q.get("answerIndex")
        if not isinstance(answer, int) or not isinstance(options, list) or not (0 <= answer < len(options)):
            flags.append("invalid_answer_index")

    if isinstance(options, list):
        cleaned = [exact_norm(str(x)) for x in options]
        if len(cleaned) != len(set(cleaned)) or any(not x for x in cleaned):
            flags.append("weak_or_duplicate_options")

    if section == "A" and isinstance(options, list) and len(options) == 4:
        weights = q.get("weights")
        if isinstance(weights, list) and len(weights) == 4:
            positives = [w for w in weights if isinstance(w, (int, float)) and w > 0]
            if len(positives) == 1:
                flags.append("obvious_one_hot_A")

    return sorted(set(flags))

def decision(flags):
    severe = {
        "broken_generated_stem", "missing_visual", "invalid_option_count",
        "invalid_answer_index", "unsupported_visual_kind",
    }
    rewrite = {
        "appended_context", "obvious_one_hot_A",
        "decorative_or_redundant_visual_candidate",
    }
    polish = {"malformed_text", "weak_or_duplicate_options"}
    fs = set(flags)
    if fs & severe or fs & rewrite:
        return "REWRITE"
    if fs & polish:
        return "POLISH"
    return "KEEP_CANDIDATE"

def main():
    files = sorted(SETS.glob("SET */data/set*.json"))
    if not files:
        raise SystemExit("No set files found under " + str(SETS))

    rows = []
    exact_groups = defaultdict(list)
    template_groups = defaultdict(list)

    for path in files:
        data = json.loads(path.read_text(encoding="utf-8"))
        match = re.search(r"set(\d+)", path.name, re.I)
        set_no = int(data.get("set") or (match.group(1) if match else 0))
        for idx, q in enumerate(data.get("questions") or [], start=1):
            qid = str(q.get("id") or ("ROW-" + str(idx)))
            stem = str(q.get("question") or "")
            flags = flag_item(q)
            row = {
                "set": set_no,
                "id": qid,
                "section": section_of(q),
                "category": q.get("category"),
                "question": stem,
                "flags": flags,
                "decision": decision(flags),
            }
            rows.append(row)
            if stem:
                exact_groups[exact_norm(stem)].append(row)
                template_groups[template_norm(stem)].append(row)

    exact_members = {
        (r["set"], r["id"])
        for group in exact_groups.values() if len(group) > 1
        for r in group
    }
    template_members = {
        (r["set"], r["id"])
        for key, group in template_groups.items()
        if key and len(key) >= 18 and len(group) > 1
        for r in group
    }

    for row in rows:
        key = (row["set"], row["id"])
        if key in exact_members:
            row["flags"].append("exact_duplicate")
        if key in template_members:
            row["flags"].append("template_duplicate")
        row["flags"] = sorted(set(row["flags"]))
        if ("exact_duplicate" in row["flags"] or "template_duplicate" in row["flags"]) and row["decision"] == "KEEP_CANDIDATE":
            row["decision"] = "REWRITE"

    per_set = defaultdict(Counter)
    totals = Counter()
    for row in rows:
        c = per_set[row["set"]]
        c["items"] += 1
        c[row["decision"]] += 1
        totals[row["decision"]] += 1
        for f in row["flags"]:
            c[f] += 1
            totals[f] += 1

    result = {
        "standard": "REQOO ITEM STANDARD V2",
        "scope": "clone/read-only audit",
        "files": len(files),
        "items": len(rows),
        "totals": dict(totals),
        "sets": {str(k): dict(v) for k, v in sorted(per_set.items())},
        "items_detail": rows,
    }
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")

    lines = [
        "# REQOO PKSK Item Audit V2", "",
        "- Set files: **{}**".format(len(files)),
        "- Objective items audited: **{}**".format(len(rows)),
        "- KEEP_CANDIDATE: **{}**".format(totals["KEEP_CANDIDATE"]),
        "- POLISH: **{}**".format(totals["POLISH"]),
        "- REWRITE: **{}**".format(totals["REWRITE"]),
        "- DROP_REPLACE: **{}**".format(totals["DROP_REPLACE"]),
        "", "## Major flags", "",
    ]
    flag_names = [
        "appended_context", "broken_generated_stem", "missing_visual",
        "decorative_or_redundant_visual_candidate", "unsupported_visual_kind",
        "invalid_option_count", "invalid_answer_index", "weak_or_duplicate_options",
        "obvious_one_hot_A", "exact_duplicate", "template_duplicate", "malformed_text",
    ]
    for name in flag_names:
        lines.append("- {}: **{}**".format(name, totals[name]))

    lines += [
        "", "## Per-set summary", "",
        "| Set | Items | Keep | Polish | Rewrite | Context | Missing visual | Redundant visual | Exact dup | Template dup |",
        "|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|",
    ]
    for s, c in sorted(per_set.items()):
        lines.append(
            "| {:02d} | {} | {} | {} | {} | {} | {} | {} | {} | {} |".format(
                s, c["items"], c["KEEP_CANDIDATE"], c["POLISH"], c["REWRITE"],
                c["appended_context"], c["missing_visual"],
                c["decorative_or_redundant_visual_candidate"],
                c["exact_duplicate"], c["template_duplicate"]
            )
        )

    lines += [
        "", "## Interpretation", "",
        "- This is a triage audit, not final approval.",
        "- appended_context is deliberately strict because random context suffixes are a known generator defect.",
        "- decorative_or_redundant_visual_candidate requires human review.",
        "- Exact/template duplicates are evaluated globally across all 50 sets.",
        "- No question file is changed by this script.", "",
    ]
    OUT_MD.write_text("\n".join(lines), encoding="utf-8")
    print(OUT_MD)
    print(OUT_JSON)
    print(json.dumps(dict(totals), ensure_ascii=False, indent=2))
    return 0

if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
from __future__ import annotations

import csv
import json
import re
from collections import Counter, defaultdict
from pathlib import Path
from difflib import SequenceMatcher

ROOT = Path(__file__).resolve().parents[1]
SETS_ROOT = ROOT / "sim/pksk/simulator/sets"
OUT = ROOT / "audit-output"
OUT.mkdir(exist_ok=True)

EXPECTED_B = {
    "Matematik": 20,
    "IQ": 10,
    "Bahasa Melayu": 8,
    "English": 8,
    "Sains": 8,
    "Teknologi/RBT": 6,
    "Pengetahuan Am": 6,
    "Penyelesaian Masalah": 4,
}

NUM_RE = re.compile(r"\b\d+(?:[.,]\d+)?\b")
PUNCT_RE = re.compile(r"[^\w\s]", re.UNICODE)
SPACE_RE = re.compile(r"\s+")
BAD_PHRASES = (
    "semua di atas", "tiada di atas", "semua jawapan", "mana-mana jawapan",
)

def norm(text: str, numbers: bool = False) -> str:
    text = text.casefold().strip()
    if numbers:
        text = NUM_RE.sub("#", text)
    text = PUNCT_RE.sub(" ", text)
    return SPACE_RE.sub(" ", text).strip()


def toks(text: str) -> set[str]:
    return {x for x in norm(text, numbers=True).split() if len(x) > 2}


def extract_set_no(path: Path) -> int:
    m = re.search(r"set(\d{2})\.json$", path.name, re.I)
    return int(m.group(1)) if m else -1


def section_of(q: dict) -> str:
    sec = str(q.get("section") or "").upper().replace("BAHAGIAN", "").strip()
    if sec.startswith("A"): return "A"
    if sec.startswith("B"): return "B"
    return "?"


def technical_issues(item: dict) -> list[str]:
    q = item["raw"]
    sec = item["section"]
    issues = []
    text = item["text"]
    if not text:
        issues.append("blank_text")
    if "  " in text:
        issues.append("double_space")
    if len(text) < 12:
        issues.append("too_short")
    if len(text) > 700:
        issues.append("too_long")
    if re.search(r"\b[Jj]ika\b[^.!?]{0,180},\s*[Jj]ika\b", text):
        issues.append("awkward_repeated_jika")

    if sec == "A":
        fmt = str(q.get("format") or "").upper()
        opts = q.get("options")
        weights = q.get("weights")
        if fmt == "SITUATIONAL":
            if not isinstance(opts, list) or len(opts) != 4 or len({str(x).strip() for x in opts}) != 4:
                issues.append("a_options_invalid")
            if not isinstance(weights, list) or sorted(weights) != [0,1,2,3]:
                issues.append("a_weights_invalid")
        elif fmt == "AGREE_DISAGREE":
            if opts != ["Setuju", "Tidak setuju"]:
                issues.append("a_agree_options_invalid")
            if weights not in ([3,0],[0,3]):
                issues.append("a_agree_weights_invalid")
        else:
            issues.append("a_format_invalid")

    elif sec == "B":
        opts = q.get("options")
        ans = q.get("answerIndex")
        weights = q.get("weights")
        if not isinstance(opts, list) or len(opts) != 4 or len({str(x).strip() for x in opts}) != 4:
            issues.append("b_options_invalid")
        if ans not in (0,1,2,3):
            issues.append("b_answer_invalid")
        if isinstance(weights, list) and len(weights) == 4 and ans in (0,1,2,3):
            exp = [3 if i == ans else 0 for i in range(4)]
            if weights != exp:
                issues.append("b_weights_mismatch")

    elif sec == "C":
        if not str(q.get("title") or "").strip():
            issues.append("c_title_blank")
        mw = q.get("min_words")
        if not isinstance(mw, int) or mw < 80:
            issues.append("c_min_words_invalid")
        if len(text) < 80:
            issues.append("c_prompt_too_short")

    return issues


def quality_issues(item: dict) -> list[str]:
    q = item["raw"]
    sec = item["section"]
    text = item["text"]
    issues = []
    low = text.casefold()
    if any(p in low for p in BAD_PHRASES):
        issues.append("weak_meta_distractor")
    if text.count("?") > 2:
        issues.append("too_many_questions")

    if sec in {"A","B"}:
        opts = q.get("options") if isinstance(q.get("options"), list) else []
        lengths = [len(str(x).strip()) for x in opts]
        if len(lengths) == 4 and min(lengths) > 0:
            if max(lengths) / max(1, min(lengths)) > 5.0:
                issues.append("option_length_imbalance")
        if any(len(str(x).strip()) < 1 for x in opts):
            issues.append("blank_option")

    if sec == "B":
        ans = q.get("answerIndex")
        opts = q.get("options") if isinstance(q.get("options"), list) else []
        if ans in (0,1,2,3) and len(opts) == 4:
            lens = [len(str(x).strip()) for x in opts]
            others = [lens[i] for i in range(4) if i != ans]
            if others and lens[ans] >= 30 and lens[ans] > 1.75 * max(others):
                issues.append("correct_answer_length_clue")

    if sec == "C":
        # Strong C task should request more than a bare opinion/description.
        cues = ("huraikan", "jelaskan", "alasan", "contoh", "cadangkan", "langkah", "sebab", "cara")
        if sum(c in low for c in cues) < 2:
            issues.append("c_low_reasoning_demand")

    return issues


def main() -> int:
    paths = sorted(SETS_ROOT.glob("SET */data/set*.json"), key=extract_set_no)
    if len(paths) != 50:
        raise SystemExit(f"FAIL: expected 50 live set files, found {len(paths)}")

    items = []
    per_set = {}
    structural_errors = []
    for path in paths:
        set_no = extract_set_no(path)
        data = json.loads(path.read_text(encoding="utf-8"))
        questions = data.get("questions") or []
        writing = data.get("writing") or []
        a = [x for x in questions if section_of(x) == "A"]
        b = [x for x in questions if section_of(x) == "B"]
        c = writing
        bdom = Counter(str(x.get("contentDomain") or x.get("category") or "") for x in b)
        per_set[set_no] = {"A":len(a),"B":len(b),"C":len(c),"B_domains":dict(bdom),"path":str(path.relative_to(ROOT))}
        if (len(a),len(b),len(c)) != (30,70,3):
            structural_errors.append(f"set{set_no:02d}: counts A/B/C={len(a)}/{len(b)}/{len(c)}")
        if bdom != Counter(EXPECTED_B):
            structural_errors.append(f"set{set_no:02d}: B domain mix {dict(bdom)}")

        for q in a+b:
            sec = section_of(q)
            items.append({
                "uid": f"S{set_no:02d}-{q.get('id','?')}",
                "set": set_no,
                "section": sec,
                "domain": str(q.get("contentDomain") or q.get("category") or ""),
                "text": str(q.get("question") or "").strip(),
                "raw": q,
            })
        for q in c:
            items.append({
                "uid": f"S{set_no:02d}-{q.get('id','C?')}",
                "set": set_no,
                "section": "C",
                "domain": "Artikulasi Penulisan",
                "text": str(q.get("prompt") or "").strip(),
                "raw": q,
            })

    sec_counts = Counter(x["section"] for x in items)
    if len(items) != 5150:
        structural_errors.append(f"global item count expected 5150 got {len(items)}")

    # Technical and quality rules.
    tech = {}
    qual = {}
    for x in items:
        tech[x["uid"]] = technical_issues(x)
        qual[x["uid"]] = quality_issues(x)

    # Exact and number-normalised duplicate groups are global but section-specific.
    exact = defaultdict(list)
    normalized = defaultdict(list)
    for x in items:
        exact[(x["section"], norm(x["text"], numbers=False))].append(x["uid"])
        normalized[(x["section"], norm(x["text"], numbers=True))].append(x["uid"])
    exact_groups = [v for v in exact.values() if len(v)>1]
    norm_groups_all = [v for v in normalized.values() if len(v)>1]
    exact_members = {u for g in exact_groups for u in g}
    # normalized-only excludes groups already explained by exact duplicate.
    normalized_only_groups = []
    for g in norm_groups_all:
        if not set(g).issubset(exact_members):
            normalized_only_groups.append(g)
    normalized_members = {u for g in normalized_only_groups for u in g}

    # Near-duplicate scan within section+domain, with cheap token prefilter.
    buckets = defaultdict(list)
    for x in items:
        buckets[(x["section"], x["domain"])].append(x)
    near_pairs = []
    for rows in buckets.values():
        prepared = [(x, norm(x["text"], numbers=True), toks(x["text"])) for x in rows]
        for i in range(len(prepared)):
            a, na, ta = prepared[i]
            for j in range(i+1, len(prepared)):
                b, nb, tb = prepared[j]
                if a["uid"] in exact_members and b["uid"] in exact_members and na == nb:
                    continue
                if not ta or not tb:
                    continue
                overlap = len(ta & tb) / min(len(ta),len(tb))
                if overlap < 0.62:
                    continue
                jac = len(ta & tb) / max(1,len(ta | tb))
                if jac < 0.52:
                    continue
                seq = SequenceMatcher(None,na,nb,autojunk=False).ratio()
                if seq >= 0.86 or jac >= 0.78:
                    near_pairs.append((max(seq,jac),a["uid"],b["uid"],round(seq,3),round(jac,3)))
    near_pairs.sort(reverse=True)
    near_members = {u for _,a,b,_,_ in near_pairs for u in (a,b)}

    # Repeated six-word prefixes are a template smell, not a duplicate by themselves.
    prefixes = defaultdict(list)
    for x in items:
        ws = norm(x["text"], numbers=True).split()
        if len(ws)>=6:
            prefixes[(x["section"]," ".join(ws[:6]))].append(x["uid"])
    template_groups = [v for v in prefixes.values() if len(v)>=10]
    template_members = {u for g in template_groups for u in g}

    technical_pass = set()
    high_quality = set()
    repair = set()
    for x in items:
        uid=x["uid"]
        if not tech[uid]:
            technical_pass.add(uid)
        disqualifiers = tech[uid] + qual[uid]
        if uid in exact_members: disqualifiers.append("exact_duplicate")
        if uid in normalized_members: disqualifiers.append("number_normalised_duplicate")
        if uid in near_members: disqualifiers.append("near_duplicate")
        if uid in template_members: disqualifiers.append("repeated_template_prefix")
        if not disqualifiers:
            high_quality.add(uid)
        else:
            repair.add(uid)

    by_section_hq = Counter(next(x["section"] for x in items if x["uid"]==u) for u in high_quality)
    by_section_tech = Counter(next(x["section"] for x in items if x["uid"]==u) for u in technical_pass)

    # Detailed row status.
    details=[]
    for x in items:
        uid=x["uid"]
        flags=list(tech[uid])+list(qual[uid])
        if uid in exact_members: flags.append("exact_duplicate")
        if uid in normalized_members: flags.append("number_normalised_duplicate")
        if uid in near_members: flags.append("near_duplicate")
        if uid in template_members: flags.append("repeated_template_prefix")
        status = "HIGH_QUALITY_CANDIDATE" if not flags else ("TECHNICAL_PASS_REVIEW" if not tech[uid] else "REPAIR_REQUIRED")
        details.append({"uid":uid,"set":x["set"],"section":x["section"],"domain":x["domain"],"status":status,"flags":flags,"text":x["text"]})

    summary={
        "source_branch":"audit/pksk-live-50set-clone-v1",
        "live_main_untouched":True,
        "set_files":len(paths),
        "items_total":len(items),
        "section_counts":dict(sec_counts),
        "structural_errors":structural_errors,
        "technical_pass":{"total":len(technical_pass),"by_section":dict(by_section_tech)},
        "high_quality_candidate":{"total":len(high_quality),"by_section":dict(by_section_hq)},
        "needs_review_or_repair":len(repair),
        "duplicates":{
            "exact_groups":len(exact_groups),
            "exact_items_affected":len(exact_members),
            "normalized_only_groups":len(normalized_only_groups),
            "normalized_only_items_affected":len(normalized_members),
            "near_pairs":len(near_pairs),
            "near_items_affected":len(near_members),
        },
        "template_groups_10plus_same_prefix":len(template_groups),
        "template_items_affected":len(template_members),
        "per_set":per_set,
        "note":"HIGH_QUALITY_CANDIDATE is an automated strict pre-screen, not final human/editorial approval. Items flagged are candidates for Plus review/repair, not automatic rejection."
    }
    (OUT/"live50_summary.json").write_text(json.dumps(summary,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    with (OUT/"live50_item_status.csv").open("w",encoding="utf-8",newline="") as f:
        w=csv.writer(f); w.writerow(["uid","set","section","domain","status","flags","text"])
        for d in details: w.writerow([d["uid"],d["set"],d["section"],d["domain"],d["status"],"|".join(d["flags"]),d["text"]])
    with (OUT/"live50_duplicate_pairs.csv").open("w",encoding="utf-8",newline="") as f:
        w=csv.writer(f); w.writerow(["score","item1","item2","sequence","jaccard"])
        w.writerows(near_pairs)

    print("PKSK LIVE 50-SET CLONE AUDIT")
    print("SOURCE=main@fe12db1 cloned to audit/pksk-live-50set-clone-v1; MAIN_UNTOUCHED=YES")
    print(f"SETS={len(paths)} ITEMS={len(items)} A={sec_counts['A']} B={sec_counts['B']} C={sec_counts['C']}")
    print(f"STRUCTURAL_ERRORS={len(structural_errors)}")
    for e in structural_errors[:20]: print("STRUCTURE:",e)
    print(f"TECHNICAL_PASS={len(technical_pass)} A={by_section_tech['A']} B={by_section_tech['B']} C={by_section_tech['C']}")
    print(f"HIGH_QUALITY_CANDIDATE={len(high_quality)} A={by_section_hq['A']} B={by_section_hq['B']} C={by_section_hq['C']}")
    print(f"NEEDS_REVIEW_OR_REPAIR={len(repair)}")
    print(f"EXACT_DUP_GROUPS={len(exact_groups)} EXACT_ITEMS={len(exact_members)}")
    print(f"NORMALIZED_ONLY_DUP_GROUPS={len(normalized_only_groups)} NORMALIZED_ONLY_ITEMS={len(normalized_members)}")
    print(f"NEAR_DUP_PAIRS={len(near_pairs)} NEAR_DUP_ITEMS={len(near_members)}")
    print(f"TEMPLATE_GROUPS={len(template_groups)} TEMPLATE_ITEMS={len(template_members)}")
    print("TOP_NEAR_DUPLICATES:")
    for row in near_pairs[:20]: print("NEAR",row)
    print("REPORTS=audit-output/live50_summary.json,audit-output/live50_item_status.csv,audit-output/live50_duplicate_pairs.csv")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())

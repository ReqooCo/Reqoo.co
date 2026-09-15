#!/usr/bin/env python3
from __future__ import annotations

import csv
import json
import re
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SETS_ROOT = ROOT / "sim/pksk/simulator/sets"
OUT = ROOT / "audit-output"
OUT.mkdir(exist_ok=True)

TARGET_B = {
    "Matematik": 20,
    "IQ": 10,
    "Bahasa Melayu": 8,
    "English": 8,
    "Sains": 8,
    "Teknologi/RBT": 6,
    "Pengetahuan Am": 6,
    "Penyelesaian Masalah": 4,
}
B_ALIAS = {
    "Bahasa Inggeris": "English",
    "English": "English",
    "RBT": "Teknologi/RBT",
    "Teknologi/RBT": "Teknologi/RBT",
    "Matematik": "Matematik",
    "IQ": "IQ",
    "Bahasa Melayu": "Bahasa Melayu",
    "Sains": "Sains",
    "Pengetahuan Am": "Pengetahuan Am",
    "Penyelesaian Masalah": "Penyelesaian Masalah",
}
NUM_RE = re.compile(r"\b\d+(?:[.,]\d+)?\b")
PUNCT_RE = re.compile(r"[^\w\s]", re.UNICODE)
SPACE_RE = re.compile(r"\s+")


def norm(text: str, numbers: bool = False) -> str:
    text = text.casefold().strip()
    if numbers:
        text = NUM_RE.sub("#", text)
    text = PUNCT_RE.sub(" ", text)
    return SPACE_RE.sub(" ", text).strip()


def set_no(path: Path) -> int:
    m = re.search(r"set(\d{2})\.json$", path.name, re.I)
    return int(m.group(1)) if m else -1


def sec_of(q: dict) -> str:
    s = str(q.get("section") or "").upper().replace("BAHAGIAN", "").strip()
    return s[:1] if s[:1] in {"A", "B"} else "?"


def text_quality_flags(sec: str, q: dict, text: str) -> list[str]:
    flags=[]
    low=text.casefold()
    if not text.strip(): flags.append("blank_text")
    if "  " in text: flags.append("double_space")
    if len(text) < 12: flags.append("too_short")
    if len(text) > 700: flags.append("too_long")
    if re.search(r"\b[Jj]ika\b[^.!?]{0,180},\s*[Jj]ika\b", text): flags.append("awkward_repeated_jika")
    if any(p in low for p in ("semua di atas","tiada di atas","semua jawapan","mana-mana jawapan")):
        flags.append("meta_distractor")
    if sec in {"A","B"}:
        opts=q.get("options") if isinstance(q.get("options"),list) else []
        if len(opts)==4:
            lens=[len(str(x).strip()) for x in opts]
            if min(lens,default=0)>0 and max(lens)/max(1,min(lens))>5:
                flags.append("option_length_imbalance")
        if any(not str(x).strip() for x in opts): flags.append("blank_option")
    if sec=="B":
        ans=q.get("answerIndex")
        opts=q.get("options") if isinstance(q.get("options"),list) else []
        if ans in (0,1,2,3) and len(opts)==4:
            lens=[len(str(x).strip()) for x in opts]
            others=[lens[i] for i in range(4) if i!=ans]
            if others and lens[ans]>=30 and lens[ans] > 1.75*max(others):
                flags.append("correct_answer_length_clue")
    if sec=="C":
        cues=("huraikan","jelaskan","alasan","contoh","cadangkan","langkah","sebab","cara")
        if sum(c in low for c in cues)<2: flags.append("c_low_reasoning_demand")
        if len(text)<80: flags.append("c_prompt_too_short")
    return flags


def schema_flags(sec: str, q: dict) -> list[str]:
    flags=[]
    if sec=="A":
        fmt=str(q.get("format") or "").upper()
        opts=q.get("options")
        weights=q.get("weights")
        if fmt=="SITUATIONAL":
            if not isinstance(opts,list) or len(opts)!=4 or len({str(x).strip() for x in opts})!=4:
                flags.append("a_options_invalid")
            if not isinstance(weights,list) or sorted(weights)!=[0,1,2,3]:
                flags.append("a_not_graded_0123")
        elif fmt=="AGREE_DISAGREE":
            if opts != ["Setuju","Tidak setuju"]: flags.append("a_agree_options_invalid")
            if weights not in ([3,0],[0,3]): flags.append("a_agree_weights_invalid")
        else:
            # Legacy live A frequently has no format and one answer worth 3 points.
            flags.append("a_legacy_single_best_schema")
    elif sec=="B":
        opts=q.get("options")
        ans=q.get("answerIndex")
        if not isinstance(opts,list) or len(opts)!=4 or len({str(x).strip() for x in opts})!=4:
            flags.append("b_options_invalid")
        if ans not in (0,1,2,3): flags.append("b_answer_invalid")
    elif sec=="C":
        if not str(q.get("title") or "").strip(): flags.append("c_title_blank")
        mw=q.get("min_words")
        if not isinstance(mw,int) or mw<80: flags.append("c_min_words_invalid")
    return flags


def rank_for_survivor(item: dict) -> tuple:
    # Prefer already-human-authored Gold content, then fewer flags, then earlier sets.
    q=item["raw"]
    gold=1 if "HUMAN_AUTHORED" in str(q.get("rebuildStatus") or "") else 0
    return (gold, -len(item["schema_flags"]), -len(item["quality_flags"]), -item["set"])


def main() -> int:
    paths=sorted(SETS_ROOT.glob("SET */data/set*.json"),key=set_no)
    if len(paths)!=50: raise SystemExit(f"expected 50 set files, found {len(paths)}")
    items=[]
    for p in paths:
        s=set_no(p); data=json.loads(p.read_text(encoding="utf-8"))
        for q in data.get("questions") or []:
            sec=sec_of(q)
            text=str(q.get("question") or "").strip()
            rawdom=str(q.get("contentDomain") or q.get("category") or "").strip()
            dom=B_ALIAS.get(rawdom,rawdom) if sec=="B" else rawdom
            item={"uid":f"S{s:02d}-{q.get('id','?')}","set":s,"section":sec,"domain_raw":rawdom,"domain":dom,"text":text,"raw":q}
            item["schema_flags"]=schema_flags(sec,q)
            item["quality_flags"]=text_quality_flags(sec,q,text)
            items.append(item)
        for q in data.get("writing") or []:
            text=str(q.get("prompt") or "").strip()
            item={"uid":f"S{s:02d}-{q.get('id','C?')}","set":s,"section":"C","domain_raw":"Artikulasi Penulisan","domain":"Artikulasi Penulisan","text":text,"raw":q}
            item["schema_flags"]=schema_flags("C",q)
            item["quality_flags"]=text_quality_flags("C",q,text)
            items.append(item)

    # Duplicate families. Exact and number-normalised duplicates are deterministic repair targets.
    exact=defaultdict(list); numbered=defaultdict(list)
    for x in items:
        exact[(x["section"],norm(x["text"],False))].append(x)
        numbered[(x["section"],norm(x["text"],True))].append(x)
    exact_groups=[g for g in exact.values() if len(g)>1]
    num_groups=[g for g in numbered.values() if len(g)>1]

    duplicate_role={}
    duplicate_kind=defaultdict(set)
    for kind, groups in (("EXACT",exact_groups),("NUMBER_NORMALISED",num_groups)):
        for g in groups:
            survivor=max(g,key=rank_for_survivor)
            for x in g:
                duplicate_kind[x["uid"]].add(kind)
                if x["uid"]==survivor["uid"]:
                    duplicate_role.setdefault(x["uid"],"SURVIVOR")
                else:
                    duplicate_role[x["uid"]]="FOLLOWER"

    rows=[]
    counts=Counter(); section_counts=defaultdict(Counter); domain_counts=defaultdict(Counter)
    reasons=Counter()
    for x in items:
        sec=x["section"]; uid=x["uid"]
        sf=list(x["schema_flags"]); qf=list(x["quality_flags"])
        role=duplicate_role.get(uid,"UNIQUE")
        dup=sorted(duplicate_kind.get(uid,set()))
        reason=[]

        if sec=="B" and x["domain"] not in TARGET_B:
            # Keep source archived, but it cannot occupy a slot in the locked final B blueprint.
            status="DROP_REPLACE"
            reason.append("b_domain_outside_locked_blueprint")
        elif role=="FOLLOWER":
            status="REWRITE"
            reason.append("duplicate_follower")
        elif sec=="A" and ("a_legacy_single_best_schema" in sf or "a_not_graded_0123" in sf):
            # Concept can usually be reused, but scoring/options must be rebuilt as graded A.
            status="REWRITE"
            reason.append("convert_A_to_graded_profile")
        elif sf:
            severe={"blank_text","a_options_invalid","a_agree_options_invalid","a_agree_weights_invalid","b_options_invalid","b_answer_invalid","c_title_blank","c_min_words_invalid"}
            if severe.intersection(sf):
                status="REWRITE"
                reason.extend(sf)
            else:
                status="POLISH"
                reason.extend(sf)
        elif qf:
            status="POLISH"
            reason.extend(qf)
        elif role=="SURVIVOR":
            status="POLISH"
            reason.append("duplicate_family_survivor_needs_editorial_confirmation")
        else:
            status="KEEP_CANDIDATE"

        # A/B require answer/scoring correctness review before FINAL_APPROVED even when text is clean.
        if status=="KEEP_CANDIDATE" and sec=="B":
            reason.append("answer_correctness_editorial_check_pending")
        if status=="KEEP_CANDIDATE" and sec=="A":
            reason.append("construct_weight_editorial_check_pending")
        if status=="KEEP_CANDIDATE" and sec=="C":
            reason.append("writing_task_editorial_check_pending")

        counts[status]+=1; section_counts[sec][status]+=1; domain_counts[(sec,x["domain"])][status]+=1
        for r in reason: reasons[r]+=1
        rows.append({
            "uid":uid,"set":x["set"],"section":sec,"domain":x["domain"],"domain_raw":x["domain_raw"],
            "status":status,"duplicate_role":role,"duplicate_kind":"|".join(dup),
            "schema_flags":"|".join(sf),"quality_flags":"|".join(qf),"reasons":"|".join(reason),"text":x["text"]
        })

    target_eligible=sum(1 for x in items if not (x["section"]=="B" and x["domain"] not in TARGET_B))
    summary={
        "source":"isolated clone of live main; no simulator content modified",
        "branch":"audit/pksk-live-50set-clone-v1",
        "total_items":len(items),
        "classification":dict(counts),
        "salvageable_without_new_concept":counts["KEEP_CANDIDATE"]+counts["POLISH"]+counts["REWRITE"],
        "drop_replace_due_locked_scope_or_fatal":counts["DROP_REPLACE"],
        "target_blueprint_eligible_source_items":target_eligible,
        "by_section":{s:dict(c) for s,c in sorted(section_counts.items())},
        "by_domain":{f"{s}:{d}":dict(c) for (s,d),c in sorted(domain_counts.items())},
        "reason_counts":dict(reasons.most_common()),
        "duplicate_groups":{"exact":len(exact_groups),"number_normalised":len(num_groups)},
        "definitions":{
            "KEEP_CANDIDATE":"Unique, correct schema, no automated language/distractor red flags. Still needs editorial truth/answer review.",
            "POLISH":"Concept/source can stay; wording, clue, duplicate-survivor or minor schema cleanup required.",
            "REWRITE":"Concept may be reused but stem/options/scoring need material rewrite, including legacy A or duplicate followers.",
            "DROP_REPLACE":"Cannot occupy locked final blueprint as-is; archive source and replace/remap only after explicit editorial decision."
        }
    }
    (OUT/"live50_salvage_summary.json").write_text(json.dumps(summary,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    with (OUT/"live50_salvage_classification.csv").open("w",encoding="utf-8",newline="") as f:
        w=csv.DictWriter(f,fieldnames=list(rows[0].keys())); w.writeheader(); w.writerows(rows)

    print("PKSK LIVE CLONE SALVAGE CLASSIFICATION")
    print("TOTAL",len(items))
    print("CLASSIFICATION",dict(counts))
    print("SALVAGEABLE_WITHOUT_NEW_CONCEPT",summary["salvageable_without_new_concept"])
    print("DROP_REPLACE",counts["DROP_REPLACE"])
    print("BY_SECTION")
    for s,c in sorted(section_counts.items()): print(" ",s,dict(c))
    print("TOP_REASONS")
    for r,n in reasons.most_common(20): print(" ",r,n)
    print("REPORTS=audit-output/live50_salvage_summary.json,audit-output/live50_salvage_classification.csv")
    return 0

if __name__=="__main__":
    raise SystemExit(main())

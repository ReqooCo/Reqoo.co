#!/usr/bin/env python3
from __future__ import annotations

import csv
import json
import re
from collections import Counter, defaultdict, deque
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SETS_ROOT = ROOT / "sim/pksk/simulator/sets"
OUT = ROOT / "audit-output"
CLASSIFICATION = OUT / "live50_salvage_classification.csv"
OUT.mkdir(exist_ok=True)

TARGET_B = {
    "Matematik": 1000,
    "IQ": 500,
    "Bahasa Melayu": 400,
    "English": 400,
    "Sains": 400,
    "Teknologi/RBT": 300,
    "Pengetahuan Am": 300,
    "Penyelesaian Masalah": 200,
}
PER_SET_B = {
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
STATUS_PRIORITY = {"KEEP_CANDIDATE": 0, "POLISH": 1, "REWRITE": 2, "DROP_REPLACE": 9}
ROLE_PRIORITY = {"UNIQUE": 0, "SURVIVOR": 1, "FOLLOWER": 2}


def set_no(path: Path) -> int:
    m = re.search(r"set(\d{2})\.json$", path.name, re.I)
    return int(m.group(1)) if m else -1


def sec_of(q: dict) -> str:
    s = str(q.get("section") or "").upper().replace("BAHAGIAN", "").strip()
    return s[:1] if s[:1] in {"A", "B"} else "?"


def canonical_domain(q: dict) -> tuple[str, str]:
    raw = str(q.get("contentDomain") or q.get("category") or "").strip()
    return B_ALIAS.get(raw, raw), raw


def load_classification() -> list[dict]:
    if not CLASSIFICATION.exists():
        raise SystemExit("classification CSV missing; run classify_pksk_live_50sets_clone.py first")
    with CLASSIFICATION.open(encoding="utf-8", newline="") as f:
        return [r for r in csv.DictReader(f) if r.get("section") == "B"]


def source_questions() -> list[dict]:
    paths = sorted(SETS_ROOT.glob("SET */data/set*.json"), key=set_no)
    if len(paths) != 50:
        raise SystemExit(f"expected 50 set files, found {len(paths)}")
    out=[]
    for p in paths:
        s=set_no(p)
        data=json.loads(p.read_text(encoding="utf-8"))
        for q in data.get("questions") or []:
            if sec_of(q) != "B":
                continue
            dom, rawdom = canonical_domain(q)
            out.append({"set":s,"domain":dom,"domainRaw":rawdom,"raw":q})
    if len(out) != 3500:
        raise SystemExit(f"expected 3500 B questions, found {len(out)}")
    return out


def match_rows(src: list[dict], rows: list[dict]) -> list[dict]:
    # Match by exact (set, question text, canonical domain). Deques make duplicate text deterministic.
    idx=defaultdict(deque)
    for r in rows:
        idx[(int(r["set"]), r.get("text", "").strip(), r.get("domain", "").strip())].append(r)
    matched=[]
    misses=[]
    for item in src:
        q=item["raw"]
        key=(item["set"], str(q.get("question") or "").strip(), item["domain"])
        if not idx[key]:
            misses.append({"set":item["set"],"id":q.get("id"),"domain":item["domain"],"question":key[1]})
            continue
        r=idx[key].popleft()
        matched.append({**item,"classification":r})
    leftovers=sum(len(v) for v in idx.values())
    if misses or leftovers:
        raise SystemExit(f"classification/source mismatch: misses={len(misses)} leftovers={leftovers}; first_miss={misses[:1]}")
    return matched


def rank(item: dict) -> tuple:
    c=item["classification"]
    return (
        STATUS_PRIORITY.get(c.get("status", ""), 99),
        ROLE_PRIORITY.get(c.get("duplicate_role", "UNIQUE"), 9),
        len(c.get("quality_flags") or ""),
        item["set"],
        str(item["raw"].get("id") or ""),
    )


def public_record(item: dict, selection: str, ordinal: int) -> dict:
    q=item["raw"]
    c=item["classification"]
    bank_id=f"B-SRC-{item['set']:02d}-{ordinal:04d}"
    return {
        "bankId": bank_id,
        "section": "BAHAGIAN B",
        "domain": item["domain"],
        "sourceDomain": item["domainRaw"],
        "sourceSet": item["set"],
        "sourceId": q.get("id"),
        "selection": selection,
        "auditStatus": c.get("status"),
        "duplicateRole": c.get("duplicate_role"),
        "duplicateKind": c.get("duplicate_kind") or None,
        "schemaFlags": [x for x in (c.get("schema_flags") or "").split("|") if x],
        "qualityFlags": [x for x in (c.get("quality_flags") or "").split("|") if x],
        "auditReasons": [x for x in (c.get("reasons") or "").split("|") if x],
        "reviewStatus": "SOURCE_KEEP_PENDING_EDITORIAL" if c.get("status")=="KEEP_CANDIDATE" else (
            "SOURCE_REPAIR_REQUIRED" if c.get("status") in {"POLISH","REWRITE"} else "SOURCE_ARCHIVED_OUT_OF_SCOPE"
        ),
        "question": q.get("question"),
        "options": q.get("options"),
        "answerIndex": q.get("answerIndex"),
        "visual": q.get("visual") or q.get("image") or q.get("diagram"),
        "sourceRaw": q,
    }


def main() -> int:
    rows=load_classification()
    src=source_questions()
    items=match_rows(src, rows)

    by_domain=defaultdict(list)
    outside=[]
    for item in items:
        if item["domain"] in TARGET_B:
            by_domain[item["domain"]].append(item)
        else:
            outside.append(item)

    selected=[]; reserve=[]; new_slots=[]
    domain_report={}
    for domain,target in TARGET_B.items():
        candidates=sorted(by_domain.get(domain, []), key=rank)
        chosen=candidates[:target]
        extra=candidates[target:]
        selected.extend(chosen)
        reserve.extend(extra)
        deficit=max(0,target-len(chosen))
        for n in range(1, deficit+1):
            new_slots.append({
                "bankId": f"B-NEW-{re.sub(r'[^A-Za-z0-9]+','-',domain).strip('-').upper()}-{n:04d}",
                "section": "BAHAGIAN B",
                "domain": domain,
                "selection": "NEW_AUTHOR_REQUIRED",
                "reviewStatus": "AUTHORING_REQUIRED",
            })
        sc=Counter(x["classification"]["status"] for x in candidates)
        chosen_sc=Counter(x["classification"]["status"] for x in chosen)
        domain_report[domain]={
            "target":target,
            "perSet":PER_SET_B[domain],
            "source":len(candidates),
            "selectedSource":len(chosen),
            "reserve":len(extra),
            "newAuthorRequired":deficit,
            "sourceStatus":dict(sc),
            "selectedStatus":dict(chosen_sc),
        }

    selected_ids={id(x) for x in selected}
    reserve_ids={id(x) for x in reserve}
    out_records=[]
    ordno=0
    for item in items:
        ordno+=1
        if id(item) in selected_ids:
            sel="SELECTED_SOURCE"
        elif id(item) in reserve_ids:
            sel="RESERVE_SOURCE"
        else:
            sel="ARCHIVE_DROP_REPLACE"
        out_records.append(public_record(item,sel,ordno))

    counts=Counter(r["selection"] for r in out_records)
    selected_status=Counter(r["auditStatus"] for r in out_records if r["selection"]=="SELECTED_SOURCE")
    repair_selected=sum(v for k,v in selected_status.items() if k in {"POLISH","REWRITE"})
    source_keep_pending=selected_status.get("KEEP_CANDIDATE",0)

    report={
        "version":"B_REPAIR_PLAN_V1",
        "sourceBranch":"audit/pksk-live-50set-clone-v1",
        "workingBranch":"repair/pksk-b-50set-v1",
        "liveFilesModified":False,
        "lockedStructure":{"sets":50,"questionsPerSet":70,"perSet":PER_SET_B,"globalTarget":TARGET_B},
        "sourceTotal":len(items),
        "sourceSelection":dict(counts),
        "outsideLockedBlueprint":len(outside),
        "selectedSource":len(selected),
        "reserveSource":len(reserve),
        "newAuthorRequired":len(new_slots),
        "selectedSourceStatus":dict(selected_status),
        "selectedSourceNeedsRepair":repair_selected,
        "selectedSourceKeepNeedsAnswerTruthReview":source_keep_pending,
        "finalBankTarget":sum(TARGET_B.values()),
        "plannedFinalBankSize":len(selected)+len(new_slots),
        "domainPlan":domain_report,
        "gates":{
            "sourceCount3500":len(items)==3500,
            "targetCount3500":sum(TARGET_B.values())==3500,
            "plannedFinalCount3500":len(selected)+len(new_slots)==3500,
            "outsidePlusEligibleEqualsSource":len(outside)+sum(len(v) for v in by_domain.values())==3500,
            "liveUntouched":True,
        },
        "nextEditorialOrder":["IQ","Matematik","Pengetahuan Am","Penyelesaian Masalah","Bahasa Melayu","English","Sains","Teknologi/RBT"],
        "notes":[
            "Selected source is a curation shortlist, not final approval.",
            "KEEP_CANDIDATE still requires independent answer/fact review.",
            "POLISH/REWRITE must be repaired before FINAL_APPROVED.",
            "NEW_AUTHOR_REQUIRED slots must be authored with unique stems and no number-swap-only variants.",
            "Assembly to Set 01-50 remains locked until final bank QA passes."
        ]
    }

    (OUT/"b_section_repair_plan.json").write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    with (OUT/"b_section_source_seed.jsonl").open("w",encoding="utf-8") as f:
        for r in out_records:
            f.write(json.dumps(r,ensure_ascii=False,separators=(",",":"))+"\n")
    with (OUT/"b_section_new_author_slots.jsonl").open("w",encoding="utf-8") as f:
        for r in new_slots:
            f.write(json.dumps(r,ensure_ascii=False,separators=(",",":"))+"\n")

    print("PKSK B REPAIR PLAN")
    print("SOURCE",len(items),"SELECTED",len(selected),"RESERVE",len(reserve),"NEW_AUTHOR",len(new_slots))
    for d,r in domain_report.items():
        print(d, f"target={r['target']} source={r['source']} selected={r['selectedSource']} reserve={r['reserve']} new={r['newAuthorRequired']}")
    print("SELECTED_STATUS",dict(selected_status),"NEEDS_REPAIR",repair_selected,"KEEP_TRUTH_REVIEW",source_keep_pending)
    if not all(report["gates"].values()):
        print("GATE_FAIL",report["gates"])
        return 2
    print("GATES=PASS")
    print("REPORTS=audit-output/b_section_repair_plan.json,audit-output/b_section_source_seed.jsonl,audit-output/b_section_new_author_slots.jsonl")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

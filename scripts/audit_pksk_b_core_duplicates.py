#!/usr/bin/env python3
from __future__ import annotations

import csv
import json
import re
from collections import Counter, defaultdict
from difflib import SequenceMatcher
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "audit-output"
SOURCE = OUT / "b_section_selected_after_batch001.jsonl"

TARGET = {
    "Matematik": 1000,
    "IQ": 500,
    "Bahasa Melayu": 400,
    "English": 400,
    "Sains": 400,
    "Teknologi/RBT": 300,
    "Pengetahuan Am": 300,
    "Penyelesaian Masalah": 200,
}

NUM_RE = re.compile(r"\b\d+(?:[.,]\d+)?\b")
PUNCT_RE = re.compile(r"[^\w#\s]", re.UNICODE)
SPACE_RE = re.compile(r"\s+")


def read_jsonl(path: Path) -> list[dict]:
    out=[]
    with path.open(encoding="utf-8") as f:
        for n,line in enumerate(f,1):
            if not line.strip():
                continue
            try:
                out.append(json.loads(line))
            except Exception as exc:
                raise SystemExit(f"{path}:{n}: invalid JSON: {exc}")
    return out


def strip_synthetic_context(text: str) -> str:
    """Remove generator decoration that does not change the tested problem.

    The legacy generator often made a repeated question appear new by appending
    a theme/context or injecting phrases such as 'untuk semasa projek ...'.
    These fragments must not make a number-swap/template clone count as unique.
    """
    s=str(text or "").strip()
    s=re.sub(r"\s+Konteks\s*:.*$", "", s, flags=re.I)
    # Only appended 'Situasi ...' is stripped; a prompt beginning with Situasi stays.
    s=re.sub(r"\s+Situasi\s+.*$", "", s, flags=re.I)
    s=re.sub(r"\s*,?\s*dengan\s+fokus\s+pada\s+[^.?!]*[.?!]?\s*$", "", s, flags=re.I)
    s=re.sub(r"\s+dalam\s+projek\s+bertema\s+[^.?!]*[.?!]?\s*$", "", s, flags=re.I)
    # Remove awkward injected middle decoration while preserving the actual question after it.
    s=re.sub(r"\s+(?:dalam|untuk)\s+semasa\s+[^.?!]+(?=[.?!])", "", s, flags=re.I)
    s=re.sub(r"\s+dalam\s+ketika\s+[^.?!]+(?=[.?!])", "", s, flags=re.I)
    return SPACE_RE.sub(" ",s).strip()


def core_signature(text: str) -> str:
    s=strip_synthetic_context(text).casefold()
    s=re.sub(r"\brm\s*\d+(?:[.,]\d+)?", "rm#", s)
    s=NUM_RE.sub("#", s)
    s=PUNCT_RE.sub(" ", s)
    return SPACE_RE.sub(" ", s).strip()


def near_text(text: str) -> str:
    s=strip_synthetic_context(text).casefold()
    s=PUNCT_RE.sub(" ", s)
    return SPACE_RE.sub(" ", s).strip()


def rank_survivor(x: dict) -> tuple:
    # Prefer an explicitly repaired item; otherwise retain the earlier clean source item.
    repaired=1 if x.get("reviewStatus")=="EDITORIAL_REPAIRED_PENDING_QA" else 0
    keep=1 if x.get("auditStatus")=="KEEP_CANDIDATE" else 0
    return (repaired,keep,-int(x.get("sourceSet") or 999),str(x.get("bankId") or ""))


def main() -> int:
    if not SOURCE.exists():
        raise SystemExit("missing b_section_selected_after_batch001.jsonl; run earlier B repair workflow steps first")
    items=read_jsonl(SOURCE)
    if len(items)!=2279:
        raise SystemExit(f"expected 2279 selected-source records, found {len(items)}")

    groups=defaultdict(list)
    for x in items:
        groups[(x.get("domain"),core_signature(x.get("question")))].append(x)

    family_rows=[]
    survivors=[]
    followers=[]
    domain_stats={}
    fam_no=0
    for domain in TARGET:
        dg=[g for (d,_),g in groups.items() if d==domain]
        duplicate_groups=[g for g in dg if len(g)>1]
        for g in dg:
            survivor=max(g,key=rank_survivor)
            survivors.append(survivor)
            if len(g)>1:
                fam_no+=1
                family_id=f"B-CORE-DUP-{fam_no:04d}"
                for x in sorted(g,key=lambda r:(int(r.get('sourceSet') or 999),str(r.get('bankId') or ''))):
                    role="SURVIVOR" if x.get("bankId")==survivor.get("bankId") else "FOLLOWER_REPLACE"
                    if role=="FOLLOWER_REPLACE": followers.append(x)
                    family_rows.append({
                        "familyId":family_id,
                        "domain":domain,
                        "role":role,
                        "bankId":x.get("bankId"),
                        "sourceSet":x.get("sourceSet"),
                        "sourceId":x.get("sourceId"),
                        "coreSignature":core_signature(x.get("question")),
                        "question":x.get("question"),
                    })
        src=sum(1 for x in items if x.get("domain")==domain)
        uniq=len(dg)
        domain_stats[domain]={
            "selectedSource":src,
            "uniqueCore":uniq,
            "hardDuplicateFollowers":src-uniq,
            "hardDuplicateGroups":len(duplicate_groups),
            "target":TARGET[domain],
            "minimumNewOrMaterialRewriteRequired":TARGET[domain]-uniq,
        }

    # Flag close rephrasings among hard-unique survivors for editorial review.
    # These are warnings only because similar wording may test distinct skills (e.g. area vs perimeter).
    near_rows=[]
    surv_by_domain=defaultdict(list)
    for x in survivors: surv_by_domain[x.get("domain")].append(x)
    for domain,arr in surv_by_domain.items():
        normalized=[near_text(x.get("question")) for x in arr]
        token_sets=[set(t.split()) for t in normalized]
        for i in range(len(arr)):
            for j in range(i+1,len(arr)):
                a,b=token_sets[i],token_sets[j]
                jac=len(a & b)/max(1,len(a | b))
                if jac<0.70:
                    continue
                ratio=SequenceMatcher(None,normalized[i],normalized[j]).ratio()
                if ratio>=0.92:
                    near_rows.append({
                        "domain":domain,
                        "similarity":round(ratio,4),
                        "tokenJaccard":round(jac,4),
                        "bankIdA":arr[i].get("bankId"),
                        "bankIdB":arr[j].get("bankId"),
                        "questionA":arr[i].get("question"),
                        "questionB":arr[j].get("question"),
                    })

    unique_total=len(survivors)
    hard_followers=len(followers)
    minimum_new=sum(TARGET[d]-domain_stats[d]["uniqueCore"] for d in TARGET)
    report={
        "version":"B_CORE_DUPLICATE_AUDIT_V1",
        "selectedSource":len(items),
        "hardUniqueCoreSource":unique_total,
        "hardDuplicateFollowers":hard_followers,
        "hardDuplicateGroups":len({r['familyId'] for r in family_rows}),
        "nearRephrasePairsForEditorialReview":len(near_rows),
        "targetFinalBank":sum(TARGET.values()),
        "minimumNewOrMaterialRewriteRequired":minimum_new,
        "domainStats":domain_stats,
        "rules":{
            "syntheticContextIgnored":True,
            "numbersNormalized":True,
            "numberSwapOnlyCountsAsDuplicate":True,
            "nearRephrasePairsAreWarningsOnly":True,
        },
        "gates":{
            "selectedSourceCountExpected":len(items)==2279,
            "uniquePlusFollowersEqualsSelected":unique_total+hard_followers==len(items),
            "finalTarget3500":sum(TARGET.values())==3500,
            "minimumAuthoringMathChecksOut":minimum_new==3500-unique_total,
        },
    }
    OUT.mkdir(exist_ok=True)
    (OUT/"b_section_core_duplicate_summary.json").write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    with (OUT/"b_section_core_duplicate_families.csv").open("w",encoding="utf-8",newline="") as f:
        fields=["familyId","domain","role","bankId","sourceSet","sourceId","coreSignature","question"]
        w=csv.DictWriter(f,fieldnames=fields); w.writeheader(); w.writerows(family_rows)
    with (OUT/"b_section_near_rephrase_review.csv").open("w",encoding="utf-8",newline="") as f:
        fields=["domain","similarity","tokenJaccard","bankIdA","bankIdB","questionA","questionB"]
        w=csv.DictWriter(f,fieldnames=fields); w.writeheader(); w.writerows(sorted(near_rows,key=lambda r:r["similarity"],reverse=True))
    with (OUT/"b_section_strict_source_survivors.jsonl").open("w",encoding="utf-8") as f:
        for x in sorted(survivors,key=lambda r:(list(TARGET).index(r.get('domain')),int(r.get('sourceSet') or 999),str(r.get('bankId') or ''))):
            f.write(json.dumps(x,ensure_ascii=False,separators=(",",":"))+"\n")

    print("PKSK B STRICT CORE DUPLICATE AUDIT")
    print("SELECTED_SOURCE",len(items))
    print("HARD_UNIQUE_CORE",unique_total)
    print("HARD_DUPLICATE_FOLLOWERS",hard_followers)
    print("MINIMUM_NEW_OR_MATERIAL_REWRITE_REQUIRED",minimum_new)
    for d,s in domain_stats.items():
        print(d, f"source={s['selectedSource']} unique={s['uniqueCore']} dup_followers={s['hardDuplicateFollowers']} target={s['target']} replace_or_new={s['minimumNewOrMaterialRewriteRequired']}")
    print("NEAR_REPHRASE_REVIEW_PAIRS",len(near_rows))
    if not all(report["gates"].values()):
        print("GATES=FAIL",report["gates"])
        return 2
    print("GATES=PASS")
    return 0


if __name__=="__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
from __future__ import annotations

import csv
import json
from collections import Counter
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'audit-output'
SURVIVORS=OUT/'b_section_strict_source_survivors.jsonl'
FAMILIES=OUT/'b_section_core_duplicate_families.csv'
SUMMARY=OUT/'b_section_core_duplicate_summary.json'
VALIDATED_NEW_FILES=[
    OUT/'b_iq_new_batch_001_validated.jsonl',
]

TARGET={
    'Matematik':1000,
    'IQ':500,
    'Bahasa Melayu':400,
    'English':400,
    'Sains':400,
    'Teknologi/RBT':300,
    'Pengetahuan Am':300,
    'Penyelesaian Masalah':200,
}


def read_jsonl(path:Path, required:bool=True)->list[dict]:
    if not path.exists():
        if required: raise SystemExit(f'missing required input: {path.relative_to(ROOT)}')
        return []
    out=[]
    with path.open(encoding='utf-8') as f:
        for n,line in enumerate(f,1):
            if not line.strip(): continue
            try: out.append(json.loads(line))
            except Exception as exc: raise SystemExit(f'{path}:{n}: invalid JSON: {exc}')
    return out


def main()->int:
    if not SUMMARY.exists(): raise SystemExit('strict duplicate summary missing')
    strict_summary=json.loads(SUMMARY.read_text(encoding='utf-8'))
    source_rel=str(strict_summary.get('sourceFile') or '').strip()
    if not source_rel.startswith('audit-output/b_section_selected_after_batch'):
        raise SystemExit(f'unexpected strict sourceFile: {source_rel!r}')
    selected_path=ROOT/source_rel
    selected=read_jsonl(selected_path)
    survivors=read_jsonl(SURVIVORS)
    if len(selected)!=2279: raise SystemExit(f'expected 2279 selected source items, got {len(selected)}')
    if int(strict_summary.get('hardUniqueCoreSource',-1))!=len(survivors):
        raise SystemExit('strict summary survivor count does not match survivor file')

    selected_by={x['bankId']:x for x in selected}
    survivor_ids={x['bankId'] for x in survivors}
    if not survivor_ids <= set(selected_by): raise SystemExit('strict survivor contains bankId outside selected source')

    validated_new=[]
    validated_file_counts={}
    for p in VALIDATED_NEW_FILES:
        rows=read_jsonl(p,required=False)
        if rows:
            validated_file_counts[str(p.relative_to(ROOT))]=len(rows)
            validated_new.extend(rows)
    validated_ids=[str(x.get('bankId') or '') for x in validated_new]
    if any(not x for x in validated_ids): raise SystemExit('validated new item missing bankId')
    if len(validated_ids)!=len(set(validated_ids)): raise SystemExit('duplicate bankId across validated new files')
    if set(validated_ids) & survivor_ids: raise SystemExit('validated new bankId collides with strict source survivor')
    bad_validated=[x.get('bankId') for x in validated_new if x.get('reviewStatus')!='EDITORIAL_QA_PASS']
    if bad_validated: raise SystemExit(f'validated new item not EDITORIAL_QA_PASS: {bad_validated[:5]}')
    validated_counts=Counter(x.get('domain') for x in validated_new)
    bad_domains=[d for d in validated_counts if d not in TARGET]
    if bad_domains: raise SystemExit(f'validated new item has unsupported domain: {bad_domains}')

    duplicate_family={}; duplicate_role={}
    if not FAMILIES.exists(): raise SystemExit(f'missing required input: {FAMILIES.relative_to(ROOT)}')
    with FAMILIES.open(encoding='utf-8',newline='') as f:
        for row in csv.DictReader(f):
            duplicate_family[row['bankId']]=row['familyId']; duplicate_role[row['bankId']]=row['role']

    followers=[x for x in selected if x['bankId'] not in survivor_ids]
    bad_roles=[x['bankId'] for x in followers if duplicate_role.get(x['bankId'])!='FOLLOWER_REPLACE']
    if bad_roles: raise SystemExit(f'followers missing FOLLOWER_REPLACE role: {bad_roles[:5]}')

    selected_counts=Counter(x['domain'] for x in selected)
    survivor_counts=Counter(x['domain'] for x in survivors)
    follower_counts=Counter(x['domain'] for x in followers)

    # New validated items currently fill NEW_AUTHOR_DEFICIT slots. A future validated
    # material-rewrite batch should carry an explicit replacement/source mapping and be
    # applied before reaching this generic planner.
    original_new_deficit={d:max(0,TARGET[d]-selected_counts.get(d,0)) for d in TARGET}
    for d,n in validated_counts.items():
        if n>original_new_deficit[d]:
            raise SystemExit(f'validated new count exceeds source deficit for {d}: {n}>{original_new_deficit[d]}')

    slots=[]; sequence=0; domain_sequence=Counter()
    for x in sorted(followers,key=lambda r:(list(TARGET).index(r['domain']),int(r.get('sourceSet') or 999),str(r.get('bankId') or ''))):
        sequence+=1; domain_sequence[x['domain']]+=1
        slots.append({
            'slotId':f'B-WORK-{sequence:04d}','domainSlot':domain_sequence[x['domain']],'domain':x['domain'],
            'reason':'MATERIAL_REWRITE_CORE_DUPLICATE','sourceBankId':x['bankId'],'sourceSet':x.get('sourceSet'),'sourceId':x.get('sourceId'),
            'duplicateFamilyId':duplicate_family.get(x['bankId']),'sourceQuestion':x.get('question'),'authoringStatus':'PENDING_AUTHORING',
            'requiredChecks':['materially_new_construct_or_reasoning_form','no_exact_duplicate','no_number_swap_only_duplicate','no_synthetic_context_uniqueness','one_correct_answer','plausible_distractors','answer_truth_review'],
        })

    for domain in TARGET:
        pending_deficit=max(0,original_new_deficit[domain]-validated_counts.get(domain,0))
        for _ in range(pending_deficit):
            sequence+=1; domain_sequence[domain]+=1
            slots.append({
                'slotId':f'B-WORK-{sequence:04d}','domainSlot':domain_sequence[domain],'domain':domain,'reason':'NEW_AUTHOR_DEFICIT',
                'sourceBankId':None,'sourceSet':None,'sourceId':None,'duplicateFamilyId':None,'sourceQuestion':None,'authoringStatus':'PENDING_AUTHORING',
                'requiredChecks':['new_construct_or_reasoning_form','no_exact_duplicate','no_number_swap_only_duplicate','no_synthetic_context_uniqueness','one_correct_answer','plausible_distractors','answer_truth_review'],
            })

    work_counts=Counter(x['domain'] for x in slots); reason_counts=Counter(x['reason'] for x in slots)
    domain_report={}
    for d,target in TARGET.items():
        domain_report[d]={
            'target':target,
            'selectedSource':selected_counts.get(d,0),
            'strictSourceSurvivors':survivor_counts.get(d,0),
            'validatedNewQaPass':validated_counts.get(d,0),
            'hiddenDuplicateFollowersToRewrite':follower_counts.get(d,0),
            'originalNewAuthorDeficit':original_new_deficit[d],
            'pendingNewAuthorDeficit':max(0,original_new_deficit[d]-validated_counts.get(d,0)),
            'totalPendingAuthoringOrRewrite':work_counts.get(d,0),
            'currentQaReadyBankContribution':survivor_counts.get(d,0)+validated_counts.get(d,0),
        }

    original_strict_work=3500-len(survivors)
    pending_work=3500-len(survivors)-len(validated_new)
    original_new_deficit_total=sum(original_new_deficit.values())
    gates={
        'selectedSource2279':len(selected)==2279,
        'strictSummaryMatchesSurvivors':strict_summary.get('hardUniqueCoreSource')==len(survivors),
        'followersMathOut':len(followers)==2279-len(survivors),
        'originalNewDeficit1221':original_new_deficit_total==1221,
        'materialRewriteMatchesFollowers':reason_counts['MATERIAL_REWRITE_CORE_DUPLICATE']==len(followers),
        'pendingNewDeficitSubtractsValidated':reason_counts['NEW_AUTHOR_DEFICIT']==original_new_deficit_total-len(validated_new),
        'strictSummaryOriginalWorkMatches':strict_summary.get('minimumNewOrMaterialRewriteRequired')==original_strict_work,
        'pendingWorkMathsOut':len(slots)==pending_work,
        'survivorsPlusValidatedPlusPending3500':len(survivors)+len(validated_new)+len(slots)==3500,
        'domainFinalsMatchTarget':all(survivor_counts.get(d,0)+validated_counts.get(d,0)+work_counts.get(d,0)==TARGET[d] for d in TARGET),
    }

    report={
        'version':'B_STRICT_AUTHORING_PLAN_V4_WITH_VALIDATED_NEW',
        'workingBranch':'repair/pksk-b-50set-v1',
        'productionFilesModified':False,
        'sourceFile':source_rel,
        'strictAuditVersion':strict_summary.get('version'),
        'finalBankTarget':3500,
        'strictSourceSurvivors':len(survivors),
        'validatedNewQaPass':len(validated_new),
        'validatedNewFiles':validated_file_counts,
        'currentQaReadyBankContribution':len(survivors)+len(validated_new),
        'pendingAuthoringOrMaterialRewrite':len(slots),
        'reasonsPending':dict(reason_counts),
        'domainPlan':domain_report,
        'gates':gates,
        'releaseRule':'Do not assemble Set 01-50 until every slot is FINAL_APPROVED and global strict duplicate + answer-truth gates pass.',
        'recommendedBatchOrder':['Matematik','IQ','Pengetahuan Am','Penyelesaian Masalah','Bahasa Melayu','English','Sains','Teknologi/RBT'],
    }
    (OUT/'b_section_strict_authoring_plan.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    with (OUT/'b_section_strict_authoring_slots.jsonl').open('w',encoding='utf-8') as f:
        for x in slots: f.write(json.dumps(x,ensure_ascii=False,separators=(',',':'))+'\n')

    print('PKSK B STRICT AUTHORING PLAN V4')
    print('SOURCE',source_rel,'SURVIVORS',len(survivors),'VALIDATED_NEW',len(validated_new),'PENDING_WORK',len(slots),dict(reason_counts))
    for d in TARGET:
        r=domain_report[d]
        print(d,f"survivor={r['strictSourceSurvivors']} validated_new={r['validatedNewQaPass']} rewrite={r['hiddenDuplicateFollowersToRewrite']} pending_new={r['pendingNewAuthorDeficit']} pending_work={r['totalPendingAuthoringOrRewrite']} target={r['target']}")
    if not all(gates.values()): print('GATES=FAIL',gates); return 2
    print('GATES=PASS'); return 0

if __name__=='__main__': raise SystemExit(main())

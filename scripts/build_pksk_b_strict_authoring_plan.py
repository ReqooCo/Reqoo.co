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


def read_jsonl(path:Path)->list[dict]:
    if not path.exists(): raise SystemExit(f'missing required input: {path.relative_to(ROOT)}')
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
    slots=[]; sequence=0; domain_sequence=Counter()

    for x in sorted(followers,key=lambda r:(list(TARGET).index(r['domain']),int(r.get('sourceSet') or 999),str(r.get('bankId') or ''))):
        sequence+=1; domain_sequence[x['domain']]+=1
        slots.append({
            'slotId':f'B-WORK-{sequence:04d}','domainSlot':domain_sequence[x['domain']],'domain':x['domain'],
            'reason':'MATERIAL_REWRITE_CORE_DUPLICATE','sourceBankId':x['bankId'],'sourceSet':x.get('sourceSet'),'sourceId':x.get('sourceId'),
            'duplicateFamilyId':duplicate_family.get(x['bankId']),'sourceQuestion':x.get('question'),'authoringStatus':'PENDING_AUTHORING',
            'requiredChecks':['materially_new_construct_or_reasoning_form','no_exact_duplicate','no_number_swap_only_duplicate','no_synthetic_context_uniqueness','one_correct_answer','plausible_distractors','answer_truth_review'],
        })

    for domain,target in TARGET.items():
        deficit=max(0,target-selected_counts.get(domain,0))
        for _ in range(deficit):
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
            'target':target,'selectedSource':selected_counts.get(d,0),'strictSourceSurvivors':survivor_counts.get(d,0),
            'hiddenDuplicateFollowersToRewrite':follower_counts.get(d,0),'newAuthorDeficit':max(0,target-selected_counts.get(d,0)),
            'totalAuthoringOrRewriteRequired':work_counts.get(d,0),
        }

    expected_work=3500-len(survivors)
    gates={
        'selectedSource2279':len(selected)==2279,
        'strictSummaryMatchesSurvivors':strict_summary.get('hardUniqueCoreSource')==len(survivors),
        'followersMathOut':len(followers)==2279-len(survivors),
        'newDeficit1221':reason_counts['NEW_AUTHOR_DEFICIT']==1221,
        'materialRewriteMatchesFollowers':reason_counts['MATERIAL_REWRITE_CORE_DUPLICATE']==len(followers),
        'workMatchesStrictSummary':len(slots)==strict_summary.get('minimumNewOrMaterialRewriteRequired')==expected_work,
        'survivorsPlusWork3500':len(survivors)+len(slots)==3500,
        'domainFinalsMatchTarget':all(survivor_counts.get(d,0)+work_counts.get(d,0)==TARGET[d] for d in TARGET),
    }

    report={
        'version':'B_STRICT_AUTHORING_PLAN_V3_DYNAMIC','workingBranch':'repair/pksk-b-50set-v1','productionFilesModified':False,
        'sourceFile':source_rel,'strictAuditVersion':strict_summary.get('version'),'finalBankTarget':3500,
        'strictSourceSurvivors':len(survivors),'authoringOrMaterialRewriteRequired':len(slots),'reasons':dict(reason_counts),
        'domainPlan':domain_report,'gates':gates,
        'releaseRule':'Do not assemble Set 01-50 until every slot is FINAL_APPROVED and global strict duplicate + answer-truth gates pass.',
        'recommendedBatchOrder':['Matematik','IQ','Pengetahuan Am','Penyelesaian Masalah','Bahasa Melayu','English','Sains','Teknologi/RBT'],
    }
    (OUT/'b_section_strict_authoring_plan.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    with (OUT/'b_section_strict_authoring_slots.jsonl').open('w',encoding='utf-8') as f:
        for x in slots: f.write(json.dumps(x,ensure_ascii=False,separators=(',',':'))+'\n')

    print('PKSK B STRICT AUTHORING PLAN V3')
    print('SOURCE',source_rel,'SURVIVORS',len(survivors),'WORK',len(slots),dict(reason_counts))
    for d in TARGET:
        r=domain_report[d]
        print(d,f"survivor={r['strictSourceSurvivors']} rewrite={r['hiddenDuplicateFollowersToRewrite']} new={r['newAuthorDeficit']} work={r['totalAuthoringOrRewriteRequired']} target={r['target']}")
    if not all(gates.values()): print('GATES=FAIL',gates); return 2
    print('GATES=PASS'); return 0

if __name__=='__main__': raise SystemExit(main())

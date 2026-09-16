#!/usr/bin/env python3
from __future__ import annotations

import json
from collections import Counter
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'audit-output'
SURVIVORS=OUT/'b_section_strict_source_survivors.jsonl'
PLAN=OUT/'b_section_strict_authoring_plan.json'
SLOTS=OUT/'b_section_strict_authoring_slots.jsonl'
PROGRESS=OUT/'b_section_current_progress.json'
REMAINING=OUT/'b_section_remaining_work_slots.jsonl'
FULFILLED=OUT/'b_section_validated_new_items.jsonl'

TARGET={
    'Matematik':1000,'IQ':500,'Bahasa Melayu':400,'English':400,'Sains':400,
    'Teknologi/RBT':300,'Pengetahuan Am':300,'Penyelesaian Masalah':200,
}


def read_jsonl(path:Path)->list[dict]:
    if not path.exists(): raise SystemExit(f'missing {path.relative_to(ROOT)}')
    rows=[]
    with path.open(encoding='utf-8') as f:
        for n,line in enumerate(f,1):
            if not line.strip(): continue
            try: rows.append(json.loads(line))
            except Exception as exc: raise SystemExit(f'{path}:{n}: invalid JSON: {exc}')
    return rows


def main()->int:
    survivors=read_jsonl(SURVIVORS)
    slots=read_jsonl(SLOTS)
    if not PLAN.exists(): raise SystemExit('strict authoring plan missing')
    plan=json.loads(PLAN.read_text(encoding='utf-8'))
    if plan.get('version')!='B_STRICT_AUTHORING_PLAN_V5_DYNAMIC_VALIDATED_NEW':
        raise SystemExit(f'unexpected strict plan version: {plan.get("version")!r}')

    if len(survivors)!=int(plan.get('strictSourceSurvivors',-1)):
        raise SystemExit('survivor count disagrees with strict authoring plan')
    if len(slots)!=int(plan.get('pendingAuthoringOrMaterialRewrite',-1)):
        raise SystemExit('pending slot count disagrees with strict authoring plan')

    validated=[]; observed_file_counts={}
    plan_files=plan.get('validatedNewFiles') or {}
    for rel,expected_count in sorted(plan_files.items()):
        p=ROOT/rel
        rows=read_jsonl(p)
        observed_file_counts[rel]=len(rows)
        if len(rows)!=int(expected_count):
            raise SystemExit(f'validated file count mismatch for {rel}: {len(rows)}!={expected_count}')
        validated.extend(rows)

    validated_ids=[str(x.get('bankId') or '') for x in validated]
    if any(not x for x in validated_ids): raise SystemExit('validated new item missing bankId')
    if len(validated_ids)!=len(set(validated_ids)): raise SystemExit('duplicate bankId across validated new files')
    survivor_ids={x['bankId'] for x in survivors}
    if survivor_ids & set(validated_ids): raise SystemExit('validated new bankId collides with strict source survivor')
    bad=[x.get('bankId') for x in validated if x.get('reviewStatus')!='EDITORIAL_QA_PASS']
    if bad: raise SystemExit(f'validated new item not EDITORIAL_QA_PASS: {bad[:5]}')
    validated_counts=Counter(x.get('domain') for x in validated)
    bad_domains=[d for d in validated_counts if d not in TARGET]
    if bad_domains: raise SystemExit(f'unsupported validated-new domain: {bad_domains}')
    if len(validated)!=int(plan.get('validatedNewQaPass',-1)):
        raise SystemExit('validated-new total disagrees with strict authoring plan')

    domain_plan=plan.get('domainPlan') or {}
    ready_counts={}; remaining_counts={}; domain_report={}
    for d,target in TARGET.items():
        row=domain_plan.get(d) or {}
        strict_ready=int(row.get('strictSourceSurvivors',0))
        validated_ready=int(row.get('validatedNewQaPass',0))
        ready=int(row.get('currentQaReadyBankContribution',0))
        remaining=int(row.get('totalPendingAuthoringOrRewrite',0))
        if validated_ready!=validated_counts.get(d,0):
            raise SystemExit(f'validated-new domain mismatch for {d}: plan={validated_ready}, observed={validated_counts.get(d,0)}')
        if strict_ready+validated_ready!=ready:
            raise SystemExit(f'ready composition mismatch for {d}')
        if ready+remaining!=target:
            raise SystemExit(f'domain total mismatch for {d}: {ready}+{remaining}!={target}')
        ready_counts[d]=ready; remaining_counts[d]=remaining
        domain_report[d]={
            'target':target,'strictSourceReady':strict_ready,'validatedNewReady':validated_ready,
            'currentReady':ready,'remaining':remaining,'completionPct':round(100*ready/target,1),
        }

    current_ready=sum(ready_counts.values())
    remaining_work=sum(remaining_counts.values())
    gates={
        'strictSourceMatchesPlan':len(survivors)==int(plan.get('strictSourceSurvivors',-1)),
        'validatedFilesMatchPlan':observed_file_counts=={k:int(v) for k,v in plan_files.items()},
        'validatedTotalMatchesPlan':len(validated)==int(plan.get('validatedNewQaPass',-1)),
        'readyTotalMatchesPlan':current_ready==int(plan.get('currentQaReadyBankContribution',-1)),
        'remainingWorkMatchesPlan':remaining_work==len(slots)==int(plan.get('pendingAuthoringOrMaterialRewrite',-1)),
        'readyPlusRemaining3500':current_ready+remaining_work==3500,
        'allDomainTotalsMatch':all(ready_counts[d]+remaining_counts[d]==TARGET[d] for d in TARGET),
        'mathSourceRepairComplete':domain_report['Matematik']['strictSourceReady']==719,
        'mathNewBatch001Counted':domain_report['Matematik']['validatedNewReady']>=50,
    }

    report={
        'version':'B_CURRENT_PROGRESS_V5_DYNAMIC_VALIDATED_NEW',
        'productionFilesModified':False,
        'strictPlanVersion':plan.get('version'),
        'finalTarget':3500,
        'strictSourceReady':len(survivors),
        'validatedNewReady':len(validated),
        'validatedNewFiles':observed_file_counts,
        'currentReady':current_ready,
        'remainingWork':remaining_work,
        'completionPct':round(100*current_ready/3500,1),
        'domainProgress':domain_report,
        'gates':gates,
        'releaseBlocked':current_ready<3500,
        'releaseRule':'Final assembly remains blocked until currentReady reaches 3500 and global duplicate, answer-truth, schema and editorial gates all pass.',
    }
    PROGRESS.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    with REMAINING.open('w',encoding='utf-8') as f:
        for x in slots: f.write(json.dumps(x,ensure_ascii=False,separators=(',',':'))+'\n')
    with FULFILLED.open('w',encoding='utf-8') as f:
        for x in sorted(validated,key=lambda r:(str(r.get('domain') or ''),str(r.get('bankId') or ''))):
            f.write(json.dumps({
                'bankId':x['bankId'],'domain':x.get('domain'),'status':'VALIDATED_NEW_QA_PASS',
                'reviewStatus':x.get('reviewStatus'),'validationBatch':x.get('validationBatch'),'question':x.get('question')
            },ensure_ascii=False,separators=(',',':'))+'\n')
    print(json.dumps(report,ensure_ascii=False,indent=2))
    return 0 if all(gates.values()) else 2

if __name__=='__main__': raise SystemExit(main())

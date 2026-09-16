#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'audit-output'
SURVIVORS=OUT/'b_section_strict_source_survivors.jsonl'
PLAN=OUT/'b_section_strict_authoring_plan.json'
SLOTS=OUT/'b_section_strict_authoring_slots.jsonl'
IQ_REPORT=OUT/'b_iq_new_batch_001_qa.json'
IQ_ITEMS=OUT/'b_iq_new_batch_001_validated.jsonl'
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

    if len(survivors)!=int(plan.get('strictSourceSurvivors',-1)):
        raise SystemExit('survivor count disagrees with strict authoring plan')
    if len(slots)!=int(plan.get('pendingAuthoringOrMaterialRewrite',-1)):
        raise SystemExit('pending slot count disagrees with strict authoring plan')

    if not IQ_REPORT.exists(): raise SystemExit('IQ batch 001 QA report missing')
    iq_report=json.loads(IQ_REPORT.read_text(encoding='utf-8'))
    if not iq_report.get('pass'): raise SystemExit('IQ batch 001 has not passed QA')
    iq_items=read_jsonl(IQ_ITEMS)
    if len(iq_items)!=50 or any(x.get('domain')!='IQ' for x in iq_items):
        raise SystemExit('expected 50 validated IQ additions')
    if len({x.get('bankId') for x in iq_items})!=50:
        raise SystemExit('duplicate IQ addition bankId')
    if int(plan.get('validatedNewQaPass',-1))!=len(iq_items):
        raise SystemExit('validated IQ count disagrees with strict authoring plan')

    survivor_ids={x['bankId'] for x in survivors}
    iq_ids={x['bankId'] for x in iq_items}
    if survivor_ids & iq_ids: raise SystemExit('validated IQ bankId collides with strict source survivor bankId')

    domain_plan=plan.get('domainPlan') or {}
    ready_counts={}; remaining_counts={}; domain_report={}
    for d,target in TARGET.items():
        row=domain_plan.get(d) or {}
        ready=int(row.get('currentQaReadyBankContribution',0))
        remaining=int(row.get('totalPendingAuthoringOrRewrite',0))
        if ready+remaining!=target:
            raise SystemExit(f'domain total mismatch for {d}: {ready}+{remaining}!={target}')
        ready_counts[d]=ready; remaining_counts[d]=remaining
        domain_report[d]={
            'target':target,
            'strictSourceReady':int(row.get('strictSourceSurvivors',0)),
            'validatedNewReady':int(row.get('validatedNewQaPass',0)),
            'currentReady':ready,
            'remaining':remaining,
            'completionPct':round(100*ready/target,1),
        }

    current_ready=sum(ready_counts.values())
    remaining_work=sum(remaining_counts.values())
    plan_ready=int(plan.get('currentQaReadyBankContribution',-1))
    plan_remaining=int(plan.get('pendingAuthoringOrMaterialRewrite',-1))
    gates={
        'strictSourceMatchesPlan':len(survivors)==int(plan.get('strictSourceSurvivors',-1)),
        'validatedIqAdditions50':len(iq_items)==50,
        'planValidatedNew50':int(plan.get('validatedNewQaPass',-1))==50,
        'readyTotalMatchesPlan':current_ready==plan_ready,
        'remainingWorkMatchesPlan':remaining_work==len(slots)==plan_remaining,
        'iqReady80':ready_counts.get('IQ')==80,
        'iqRemaining420':remaining_counts.get('IQ')==420,
        'mathReady314AfterBatch004':ready_counts.get('Matematik')==314,
        'mathRemaining686AfterBatch004':remaining_counts.get('Matematik')==686,
        'readyPlusRemaining3500':current_ready+remaining_work==3500,
        'allDomainTotalsMatch':all(ready_counts[d]+remaining_counts[d]==TARGET[d] for d in TARGET),
    }

    report={
        'version':'B_CURRENT_PROGRESS_V3_DYNAMIC',
        'productionFilesModified':False,
        'strictPlanVersion':plan.get('version'),
        'finalTarget':3500,
        'strictSourceReady':len(survivors),
        'validatedNewReady':int(plan.get('validatedNewQaPass',0)),
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
        for x in sorted(iq_items,key=lambda r:r['bankId']):
            f.write(json.dumps({
                'bankId':x['bankId'],'domain':'IQ','status':'VALIDATED_NEW_QA_PASS',
                'reviewStatus':x.get('reviewStatus'),'question':x.get('question')
            },ensure_ascii=False,separators=(',',':'))+'\n')
    print(json.dumps(report,ensure_ascii=False,indent=2))
    return 0 if all(gates.values()) else 2

if __name__=='__main__': raise SystemExit(main())

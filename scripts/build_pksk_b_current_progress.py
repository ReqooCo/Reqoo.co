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
IQ_REPORT=OUT/'b_iq_new_batch_001_qa.json'
IQ_ITEMS=OUT/'b_iq_new_batch_001_validated.jsonl'
PROGRESS=OUT/'b_section_current_progress.json'
REMAINING=OUT/'b_section_remaining_work_slots.jsonl'
FULFILLED=OUT/'b_section_fulfilled_new_slots.jsonl'

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

    if not IQ_REPORT.exists(): raise SystemExit('IQ batch 001 QA report missing')
    iq_report=json.loads(IQ_REPORT.read_text(encoding='utf-8'))
    if not iq_report.get('pass'): raise SystemExit('IQ batch 001 has not passed QA')
    iq_items=read_jsonl(IQ_ITEMS)
    if len(iq_items)!=50 or any(x.get('domain')!='IQ' for x in iq_items):
        raise SystemExit('expected 50 validated IQ additions')
    if len({x.get('bankId') for x in iq_items})!=50:
        raise SystemExit('duplicate IQ addition bankId')

    survivor_ids={x['bankId'] for x in survivors}
    iq_ids={x['bankId'] for x in iq_items}
    if survivor_ids & iq_ids: raise SystemExit('new IQ bankId collides with strict source survivor bankId')

    iq_deficit_slots=[x for x in slots if x.get('domain')=='IQ' and x.get('reason')=='NEW_AUTHOR_DEFICIT']
    if len(iq_deficit_slots)<50: raise SystemExit('not enough IQ deficit slots to map validated batch')
    filled_slot_ids={x['slotId'] for x in iq_deficit_slots[:50]}
    fulfilled=[]
    for slot,item in zip(iq_deficit_slots[:50],sorted(iq_items,key=lambda r:r['bankId'])):
        fulfilled.append({
            'slotId':slot['slotId'],'domain':'IQ','reason':'NEW_AUTHOR_DEFICIT','fulfilledBy':item['bankId'],
            'question':item.get('question'),'reviewStatus':item.get('reviewStatus'),'status':'FULFILLED_VALIDATED',
        })
    remaining=[x for x in slots if x.get('slotId') not in filled_slot_ids]

    base_counts=Counter(x.get('domain') for x in survivors)
    addition_counts=Counter(x.get('domain') for x in iq_items)
    ready_counts=Counter(base_counts); ready_counts.update(addition_counts)
    remaining_counts={d:TARGET[d]-ready_counts.get(d,0) for d in TARGET}
    if any(v<0 for v in remaining_counts.values()): raise SystemExit(f'domain over target: {remaining_counts}')

    gates={
        'strictSourceSurvivors739':len(survivors)==739,
        'validatedIqAdditions50':len(iq_items)==50,
        'readyTotal789':sum(ready_counts.values())==789,
        'remainingWork2711':len(remaining)==2711==sum(remaining_counts.values()),
        'iqReady80':ready_counts.get('IQ',0)==80,
        'iqRemaining420':remaining_counts.get('IQ')==420,
        'mathReady264':ready_counts.get('Matematik',0)==264,
        'mathRemaining736':remaining_counts.get('Matematik')==736,
        'readyPlusRemaining3500':sum(ready_counts.values())+len(remaining)==3500,
    }

    domain_report={}
    for d in TARGET:
        domain_report[d]={
            'target':TARGET[d],
            'strictSourceReady':base_counts.get(d,0),
            'validatedNewReady':addition_counts.get(d,0),
            'currentReady':ready_counts.get(d,0),
            'remaining':remaining_counts[d],
            'completionPct':round(100*ready_counts.get(d,0)/TARGET[d],1),
        }
    report={
        'version':'B_CURRENT_PROGRESS_V1_AFTER_MATH003_IQ001',
        'productionFilesModified':False,
        'finalTarget':3500,
        'strictSourceReady':len(survivors),
        'validatedNewReady':len(iq_items),
        'currentReady':sum(ready_counts.values()),
        'remainingWork':len(remaining),
        'completionPct':round(100*sum(ready_counts.values())/3500,1),
        'domainProgress':domain_report,
        'gates':gates,
        'releaseBlocked':True,
        'releaseRule':'Final assembly remains blocked until currentReady reaches 3500 and global duplicate, answer-truth, schema and editorial gates all pass.',
    }
    PROGRESS.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    with REMAINING.open('w',encoding='utf-8') as f:
        for x in remaining: f.write(json.dumps(x,ensure_ascii=False,separators=(',',':'))+'\n')
    with FULFILLED.open('w',encoding='utf-8') as f:
        for x in fulfilled: f.write(json.dumps(x,ensure_ascii=False,separators=(',',':'))+'\n')
    print(json.dumps(report,ensure_ascii=False,indent=2))
    return 0 if all(gates.values()) else 2

if __name__=='__main__': raise SystemExit(main())

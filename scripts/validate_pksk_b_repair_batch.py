#!/usr/bin/env python3
from __future__ import annotations
import json,re
from collections import defaultdict
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'audit-output'
CUR=ROOT/'sim/pksk/curation/B'
SEED=OUT/'b_section_source_seed.jsonl'
REPORT=OUT/'b_section_repair_batch_001_qa.json'
NUM_RE=re.compile(r'\b\d+(?:[.,]\d+)?\b')
PUNCT_RE=re.compile(r'[^\w\s]',re.UNICODE)
SPACE_RE=re.compile(r'\s+')


def norm(text:str,numbers:bool=False)->str:
    t=str(text or '').casefold().strip()
    if numbers:t=NUM_RE.sub('#',t)
    t=PUNCT_RE.sub(' ',t)
    return SPACE_RE.sub(' ',t).strip()


def read_jsonl(path:Path):
    with path.open(encoding='utf-8') as f:
        for n,line in enumerate(f,1):
            if line.strip():
                try: yield json.loads(line)
                except Exception as e: raise SystemExit(f'{path}:{n}: invalid JSON: {e}')


def main()->int:
    if not SEED.exists(): raise SystemExit('missing b_section_source_seed.jsonl; run repair-plan builder first')
    seed=list(read_jsonl(SEED))
    selected=[x for x in seed if x.get('selection')=='SELECTED_SOURCE']
    expected={x['bankId']:x for x in selected if x.get('auditStatus') in {'POLISH','REWRITE'}}

    overlay_files=sorted(CUR.glob('repair_batch_001_*.jsonl'))
    if not overlay_files: raise SystemExit('no repair_batch_001 overlay files')
    overlays=[]
    for p in overlay_files: overlays.extend(read_jsonl(p))
    overlay_by={}
    errors=[]
    warnings=[]
    for x in overlays:
        bid=x.get('bankId')
        if not bid: errors.append('overlay_missing_bankId'); continue
        if bid in overlay_by: errors.append(f'duplicate_overlay_bankId:{bid}')
        overlay_by[bid]=x
        if bid not in expected: errors.append(f'overlay_not_expected_repair:{bid}')
        if x.get('domain') != expected.get(bid,{}).get('domain'): errors.append(f'domain_mismatch:{bid}')
        opts=x.get('options')
        if not isinstance(opts,list) or len(opts)!=4 or len({str(o).strip() for o in opts})!=4:
            errors.append(f'options_invalid:{bid}')
        if x.get('answerIndex') not in (0,1,2,3): errors.append(f'answer_invalid:{bid}')
        if not str(x.get('question') or '').strip(): errors.append(f'blank_question:{bid}')
        if not isinstance(x.get('solutionSteps'),list) or not x['solutionSteps']:
            errors.append(f'solution_steps_missing:{bid}')
    for bid in sorted(set(expected)-set(overlay_by)):
        errors.append(f'missing_expected_repair:{bid}')

    final=[]
    for x in selected:
        if x['bankId'] in overlay_by:
            y=dict(x); y.update(overlay_by[x['bankId']]); y['reviewStatus']='EDITORIAL_REPAIRED_PENDING_QA'; final.append(y)
        else: final.append(x)
    for numbers,label in ((False,'exact'),(True,'number_normalised')):
        groups=defaultdict(list)
        for x in final: groups[norm(x.get('question'),numbers)].append(x['bankId'])
        dups=[v for k,v in groups.items() if k and len(v)>1]
        if dups: errors.append(f'{label}_duplicate_groups:{len(dups)}:{dups[:5]}')

    og=defaultdict(list)
    for x in overlays: og[norm(x.get('question'),True)].append(x['bankId'])
    od=[v for k,v in og.items() if k and len(v)>1]
    if od: errors.append(f'overlay_number_normalised_duplicates:{od[:5]}')

    for x in overlays:
        opts=x.get('options') or []
        ai=x.get('answerIndex')
        if len(opts)==4 and ai in range(4):
            lens=[len(str(o).strip()) for o in opts]
            others=[lens[i] for i in range(4) if i!=ai]
            if others and lens[ai]>=30 and lens[ai] > 2.25*max(others):
                warnings.append(f'correct_answer_length_review:{x["bankId"]}')

    report={
        'version':'B_REPAIR_BATCH_001_QA_V1',
        'overlayFiles':[str(p.relative_to(ROOT)) for p in overlay_files],
        'selectedSource':len(selected),
        'expectedRepairs':len(expected),
        'overlayRepairs':len(overlays),
        'coveragePass':set(expected)==set(overlay_by),
        'finalSelectedSourceCount':len(final),
        'remainingSelectedSourcePolishRewrite':sum(1 for x in final if x.get('bankId') not in overlay_by and x.get('auditStatus') in {'POLISH','REWRITE'}),
        'newAuthorStillRequired':1221,
        'errors':errors,
        'warnings':warnings,
        'pass':not errors,
    }
    REPORT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    with (OUT/'b_section_selected_after_batch001.jsonl').open('w',encoding='utf-8') as f:
        for x in final:f.write(json.dumps(x,ensure_ascii=False,separators=(',',':'))+'\n')
    print(json.dumps(report,ensure_ascii=False,indent=2))
    return 0 if not errors else 2

if __name__=='__main__': raise SystemExit(main())

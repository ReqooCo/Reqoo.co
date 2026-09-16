#!/usr/bin/env python3
from __future__ import annotations

import csv
import json
from collections import defaultdict
from difflib import SequenceMatcher
from pathlib import Path

import validate_apply_pksk_b_repair_batch002 as h

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'audit-output'
CUR=ROOT/'sim/pksk/curation/B'
SOURCE=OUT/'b_section_selected_after_batch002.jsonl'
SURVIVORS=OUT/'b_section_strict_source_survivors.jsonl'
FAMILIES=OUT/'b_section_core_duplicate_families.csv'
REPORT=OUT/'b_section_repair_batch_003_qa.json'
OUTPUT=OUT/'b_section_selected_after_batch003.jsonl'
BATCH_FILES=sorted(CUR.glob('repair_batch_003_math_*.jsonl'))

EXPECTED={
'B-SRC-23-1543':'11.15 L','B-SRC-24-1613':'7.2 kg','B-SRC-25-1683':'3.1 m','B-SRC-26-1753':'9 cm','B-SRC-27-1823':'124 cm²',
'B-SRC-28-1893':'60 m','B-SRC-29-1963':'6 cm','B-SRC-30-2033':'1 200 cm³','B-SRC-31-2103':'192 cm³','B-SRC-32-2173':'12',
'B-SRC-33-2243':'12','B-SRC-34-2313':'85','B-SRC-35-2383':'RM120','B-SRC-36-2453':'128','B-SRC-37-2523':'108',
'B-SRC-38-2593':'9/20','B-SRC-39-2663':'24','B-SRC-40-2733':'1 1/2 m','B-SRC-41-2803':'1 1/2 L','B-SRC-42-2873':'0.9 L',
'B-SRC-43-2943':'68.4','B-SRC-44-3013':'20','B-SRC-45-3083':'19','B-SRC-46-3153':'7 dan 10','B-SRC-47-3223':'16',
'B-SRC-48-3293':'(−2, 3)','B-SRC-49-3363':'70°','B-SRC-50-3433':'70°','B-SRC-12-0774':'30°','B-SRC-13-0844':'10:55 pagi',
'B-SRC-14-0914':'1 jam 45 minit','B-SRC-15-0984':'19 hari','B-SRC-16-1054':'A, 5 km/j','B-SRC-17-1124':'B, RM5.40/kg','B-SRC-18-1194':'12 m²',
'B-SRC-19-1264':'4 m 15 cm','B-SRC-20-1334':'24 minit','B-SRC-12-0775':'3','B-SRC-13-0845':'9','B-SRC-14-0915':'61',
'B-SRC-15-0985':'26','B-SRC-16-1055':'11','B-SRC-17-1125':'8','B-SRC-18-1195':'75','B-SRC-19-1265':'3/4',
'B-SRC-20-1335':'8/15','B-SRC-12-0776':'RM940','B-SRC-13-0846':'Untung RM25','B-SRC-14-0916':'B, baki RM10','B-SRC-15-0986':'1:3',
}


def main()->int:
    source=h.read_jsonl(SOURCE); survivors=h.read_jsonl(SURVIVORS)
    errors=[]; warnings=[]
    if len(source)!=2279: errors.append(f'source_count:{len(source)}')
    if len(survivors)!=689: errors.append(f'pre_batch_survivors:{len(survivors)}')
    if len(BATCH_FILES)!=2: errors.append(f'batch_file_count:{len(BATCH_FILES)}')
    batch=[]
    for p in BATCH_FILES: batch.extend(h.read_jsonl(p))
    if len(batch)!=50: errors.append(f'batch_count:{len(batch)}')
    if len({x.get('bankId') for x in batch})!=len(batch): errors.append('duplicate_batch_bankId')
    if set(EXPECTED)!={x.get('bankId') for x in batch}: errors.append('batch_ids_do_not_match_locked_expected_50')

    src_by={x['bankId']:x for x in source}
    family_by={}; role_by={}
    with FAMILIES.open(encoding='utf-8',newline='') as f:
        for row in csv.DictReader(f):
            family_by[row['bankId']]=row['familyId']; role_by[row['bankId']]=row['role']

    survivor_core=defaultdict(list); survivor_near=[]
    for x in survivors:
        sig=h.core_signature(x.get('question')); survivor_core[(x.get('domain'),sig)].append(x['bankId'])
        nt=h.near_text(x.get('question')); survivor_near.append((x['bankId'],x.get('domain'),nt,set(nt.split())))

    batch_core=defaultdict(list)
    for x in batch:
        bid=x.get('bankId'); src=src_by.get(bid)
        if not src: errors.append(f'unknown_source:{bid}'); continue
        if src.get('domain')!='Matematik' or x.get('domain')!='Matematik': errors.append(f'domain_invalid:{bid}')
        if role_by.get(bid)!='FOLLOWER_REPLACE': errors.append(f'not_strict_follower:{bid}')
        if x.get('sourceDuplicateFamily')!=family_by.get(bid): errors.append(f'family_mismatch:{bid}')
        if x.get('repairType')!='MATERIAL_REWRITE_CORE_DUPLICATE': errors.append(f'repair_type_invalid:{bid}')
        opts=x.get('options'); ai=x.get('answerIndex')
        if not isinstance(opts,list) or len(opts)!=4 or len({str(o).strip() for o in opts})!=4: errors.append(f'options_invalid:{bid}'); continue
        if ai not in (0,1,2,3): errors.append(f'answer_index_invalid:{bid}'); continue
        if str(opts[ai])!=EXPECTED.get(bid): errors.append(f'independent_answer_check_failed:{bid}:{opts[ai]!r}!={EXPECTED.get(bid)!r}')
        if not isinstance(x.get('solutionSteps'),list) or not x['solutionSteps']: errors.append(f'solution_steps_missing:{bid}')
        if int(x.get('plannedLevel',0)) not in (1,2,3,4): errors.append(f'planned_level_invalid:{bid}')
        newcore=h.core_signature(x.get('question')); oldcore=h.core_signature(src.get('question'))
        if newcore==oldcore: errors.append(f'not_materially_rewritten:{bid}')
        coll=survivor_core.get(('Matematik',newcore),[])
        if coll: errors.append(f'core_collision_with_survivor:{bid}:{coll[:3]}')
        batch_core[newcore].append(bid)
        nt=h.near_text(x.get('question')); nts=set(nt.split())
        for sid,dom,snt,sts in survivor_near:
            if dom!='Matematik': continue
            jac=len(nts & sts)/max(1,len(nts | sts))
            if jac>=0.70:
                ratio=SequenceMatcher(None,nt,snt).ratio()
                if ratio>=0.92: warnings.append(f'near_survivor:{bid}:{sid}:{ratio:.3f}')

    internal=[v for k,v in batch_core.items() if k and len(v)>1]
    if internal: errors.append(f'internal_core_duplicates:{internal[:5]}')

    overlay={x['bankId']:x for x in batch}; final=[]
    for src in source:
        if src['bankId'] in overlay:
            y=dict(src); y.update(overlay[src['bankId']]); y['batch']='B_REPAIR_BATCH_003'; final.append(y)
        else: final.append(src)
    if len(final)!=2279: errors.append(f'output_count:{len(final)}')

    report={
        'version':'B_REPAIR_BATCH_003_QA_V1','batchFiles':[str(p.relative_to(ROOT)) for p in BATCH_FILES],
        'batchCount':len(batch),'materialRewriteCount':sum(1 for x in batch if x.get('repairType')=='MATERIAL_REWRITE_CORE_DUPLICATE'),
        'independentExpectedAnswerCount':len(EXPECTED),'preBatchStrictSurvivors':len(survivors),
        'expectedPostBatchStrictSurvivors':739,'expectedRemainingAuthoringOrRewrite':2761,
        'errors':errors,'warnings':warnings,'pass':not errors and not warnings,
    }
    REPORT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    if report['pass']:
        with OUTPUT.open('w',encoding='utf-8') as f:
            for x in final: f.write(json.dumps(x,ensure_ascii=False,separators=(',',':'))+'\n')
    print(json.dumps(report,ensure_ascii=False,indent=2))
    return 0 if report['pass'] else 2

if __name__=='__main__': raise SystemExit(main())

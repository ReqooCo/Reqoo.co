#!/usr/bin/env python3
from __future__ import annotations

import csv
import json
from collections import Counter, defaultdict
from difflib import SequenceMatcher
from pathlib import Path

import validate_apply_pksk_b_repair_batch002 as h

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'audit-output'
CUR=ROOT/'sim/pksk/curation/B'
SOURCE=OUT/'b_section_selected_after_batch003.jsonl'
SURVIVORS=OUT/'b_section_strict_source_survivors.jsonl'
FAMILIES=OUT/'b_section_core_duplicate_families.csv'
REPORT=OUT/'b_section_repair_batch_004_qa.json'
OUTPUT=OUT/'b_section_selected_after_batch004.jsonl'
BATCH_FILES=sorted(CUR.glob('repair_batch_004_math_*.jsonl'))

EXPECTED={
'B-SRC-12-0777':'180 m','B-SRC-12-0778':'106 cm²','B-SRC-12-0779':'360 cm³','B-SRC-12-0780':'12:05 tengah hari','B-SRC-12-0781':'RM0.90',
'B-SRC-12-0782':'80','B-SRC-12-0783':'77°','B-SRC-12-0784':'(6,3)','B-SRC-13-0847':'4 cm²','B-SRC-13-0848':'72 cm²',
'B-SRC-13-0849':'72','B-SRC-13-0850':'1:25 petang','B-SRC-13-0851':'RM25.70','B-SRC-13-0852':'19','B-SRC-13-0853':'108°',
'B-SRC-13-0854':'(2,6)','B-SRC-14-0917':'48 cm','B-SRC-14-0918':'24 m²','B-SRC-14-0919':'900 cm³','B-SRC-14-0920':'10:10 pagi',
'B-SRC-14-0921':'RM1.80','B-SRC-14-0922':'90','B-SRC-14-0923':'90°','B-SRC-14-0924':'(2,6)','B-SRC-15-0987':'48 cm',
'B-SRC-15-0988':'48','B-SRC-15-0989':'5 L','B-SRC-15-0990':'27 km','B-SRC-15-0991':'RM32','B-SRC-15-0992':'68',
'B-SRC-15-0993':'53°','B-SRC-15-0994':'40 m','B-SRC-16-1056':'3.3','B-SRC-16-1057':'7 cm','B-SRC-16-1058':'60 cm²',
'B-SRC-16-1059':'6','B-SRC-16-1060':'1 jam 35 minit','B-SRC-16-1061':'RM25','B-SRC-16-1062':'28','B-SRC-16-1063':'75°',
'B-SRC-16-1064':'(8,7)','B-SRC-17-1126':'76','B-SRC-17-1127':'3/8','B-SRC-17-1128':'96','B-SRC-17-1129':'0.80 m',
'B-SRC-17-1130':'5.2 kg','B-SRC-17-1131':'24','B-SRC-17-1132':'36','B-SRC-17-1133':'150','B-SRC-17-1134':'48',
}


def main()->int:
    source=h.read_jsonl(SOURCE); survivors=h.read_jsonl(SURVIVORS)
    errors=[]; warnings=[]
    if len(source)!=2279: errors.append(f'source_count:{len(source)}')
    if len(survivors)!=739: errors.append(f'pre_batch_survivors:{len(survivors)}')
    if len(BATCH_FILES)!=2: errors.append(f'batch_file_count:{len(BATCH_FILES)}')
    batch=[]
    for p in BATCH_FILES: batch.extend(h.read_jsonl(p))
    if len(batch)!=50: errors.append(f'batch_count:{len(batch)}')
    ids=[x.get('bankId') for x in batch]
    if len(set(ids))!=len(batch): errors.append('duplicate_batch_bankId')
    if set(EXPECTED)!=set(ids): errors.append('batch_ids_do_not_match_locked_expected_50')

    src_by={x['bankId']:x for x in source}
    family_by={}; role_by={}
    with FAMILIES.open(encoding='utf-8',newline='') as f:
        for row in csv.DictReader(f):
            family_by[row['bankId']]=row['familyId']; role_by[row['bankId']]=row['role']

    survivor_core=defaultdict(list); survivor_near=[]
    for x in survivors:
        sig=h.core_signature(x.get('question')); survivor_core[(x.get('domain'),sig)].append(x['bankId'])
        nt=h.near_text(x.get('question')); survivor_near.append((x['bankId'],x.get('domain'),nt,set(nt.split())))

    batch_core=defaultdict(list); construct_counts=Counter(); answer_counts=Counter()
    for x in batch:
        bid=x.get('bankId'); src=src_by.get(bid)
        if not src: errors.append(f'unknown_source:{bid}'); continue
        if src.get('domain')!='Matematik' or x.get('domain')!='Matematik': errors.append(f'domain_invalid:{bid}')
        if role_by.get(bid)!='FOLLOWER_REPLACE': errors.append(f'not_strict_follower:{bid}')
        if x.get('sourceDuplicateFamily')!=family_by.get(bid): errors.append(f'family_mismatch:{bid}')
        if x.get('repairType')!='MATERIAL_REWRITE_CORE_DUPLICATE': errors.append(f'repair_type_invalid:{bid}')
        cf=str(x.get('constructFamily') or '').strip()
        if not cf: errors.append(f'construct_family_missing:{bid}')
        construct_counts[cf]+=1
        opts=x.get('options'); ai=x.get('answerIndex')
        if not isinstance(opts,list) or len(opts)!=4 or len({str(o).strip() for o in opts})!=4: errors.append(f'options_invalid:{bid}'); continue
        if ai not in (0,1,2,3): errors.append(f'answer_index_invalid:{bid}'); continue
        answer_counts[ai]+=1
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
    repeated_constructs={k:v for k,v in construct_counts.items() if v>1}
    if repeated_constructs: errors.append(f'repeated_construct_family:{repeated_constructs}')
    expected_answer_distribution={0:13,1:13,2:12,3:12}
    if dict(answer_counts)!=expected_answer_distribution:
        errors.append(f'answer_position_distribution:{dict(answer_counts)}!={expected_answer_distribution}')

    overlay={x['bankId']:x for x in batch}; final=[]
    for src in source:
        if src['bankId'] in overlay:
            y=dict(src); y.update(overlay[src['bankId']]); y['batch']='B_REPAIR_BATCH_004'; final.append(y)
        else: final.append(src)
    if len(final)!=2279: errors.append(f'output_count:{len(final)}')

    report={
        'version':'B_REPAIR_BATCH_004_QA_V1','batchFiles':[str(p.relative_to(ROOT)) for p in BATCH_FILES],
        'batchCount':len(batch),'materialRewriteCount':sum(1 for x in batch if x.get('repairType')=='MATERIAL_REWRITE_CORE_DUPLICATE'),
        'uniqueConstructFamilies':len(construct_counts),'answerPositionCounts':{str(i):answer_counts.get(i,0) for i in range(4)},
        'independentExpectedAnswerCount':len(EXPECTED),'preBatchStrictSurvivors':len(survivors),
        'expectedPostBatchStrictSurvivors':789,'expectedRemainingSourceAuthoringOrRewrite':2711,
        'errors':errors,'warnings':warnings,'pass':not errors and not warnings,
    }
    REPORT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    if report['pass']:
        with OUTPUT.open('w',encoding='utf-8') as f:
            for x in final: f.write(json.dumps(x,ensure_ascii=False,separators=(',',':'))+'\n')
    print(json.dumps(report,ensure_ascii=False,indent=2))
    return 0 if report['pass'] else 2

if __name__=='__main__': raise SystemExit(main())

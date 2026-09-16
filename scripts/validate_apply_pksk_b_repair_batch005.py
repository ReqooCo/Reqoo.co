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
SOURCE=OUT/'b_section_selected_after_batch004.jsonl'
SURVIVORS=OUT/'b_section_strict_source_survivors.jsonl'
FAMILIES=OUT/'b_section_core_duplicate_families.csv'
REPORT=OUT/'b_section_repair_batch_005_qa.json'
OUTPUT=OUT/'b_section_selected_after_batch005.jsonl'
BATCH_FILES=sorted(CUR.glob('repair_batch_005_math_*.jsonl'))

EXPECTED={
'B-SRC-18-1196':'16.5','B-SRC-18-1197':'18 cm','B-SRC-18-1198':'108 cm²','B-SRC-18-1199':'12','B-SRC-18-1200':'1:00 petang',
'B-SRC-18-1201':'RM27.81','B-SRC-18-1202':'15.2','B-SRC-18-1203':'136°','B-SRC-18-1204':'(7,5)','B-SRC-19-1266':'15',
'B-SRC-19-1267':'192 cm²','B-SRC-19-1268':'108 cm²','B-SRC-19-1269':'5 L','B-SRC-19-1270':'1 jam 45 minit','B-SRC-19-1271':'RM15',
'B-SRC-19-1272':'8','B-SRC-19-1273':'80°','B-SRC-19-1274':'12 unit','B-SRC-20-1336':'22','B-SRC-20-1337':'36 cm',
'B-SRC-20-1338':'16 cm','B-SRC-20-1339':'800 cm³','B-SRC-20-1340':'10:25 pagi','B-SRC-20-1341':'25%','B-SRC-20-1342':'15',
'B-SRC-20-1343':'58°','B-SRC-20-1344':'(8,7)','B-SRC-21-1413':'53°','B-SRC-22-1471':'12 kotak','B-SRC-22-1472':'5/8',
'B-SRC-22-1474':'120','B-SRC-22-1475':'10','B-SRC-22-1476':'28','B-SRC-22-1477':'42 cm','B-SRC-22-1478':'8 cm',
'B-SRC-22-1479':'3 cm','B-SRC-22-1480':'2 jam 29 minit','B-SRC-22-1481':'RM30','B-SRC-22-1482':'2','B-SRC-22-1483':'26°',
'B-SRC-22-1484':'9 unit','B-SRC-23-1541':'4','B-SRC-23-1542':'1/2','B-SRC-23-1544':'300','B-SRC-23-1545':'RM160',
'B-SRC-23-1546':'20','B-SRC-23-1547':'8 cm','B-SRC-23-1548':'144 cm²','B-SRC-23-1549':'120 cm³','B-SRC-23-1550':'3:25 petang',
}

EXPECTED_VISUALS={
'B-SRC-18-1196':{'kind':'five_value_data','values':[12,18,15,9,21]},
'B-SRC-18-1198':{'kind':'rectangle','length_cm':12,'width_cm':8},
'B-SRC-18-1199':{'kind':'cuboid','length_cm':8,'width_cm':6,'height_cm':4},
'B-SRC-19-1266':{'kind':'five_value_data','values':[18,9,15,12,21]},
'B-SRC-19-1268':{'kind':'rectangle','length_cm':18,'width_cm':12},
'B-SRC-19-1269':{'kind':'cuboid','length_cm':25,'width_cm':20,'height_cm':10},
'B-SRC-19-1272':{'kind':'five_value_data','values':[12,18,20,25,15]},
'B-SRC-20-1342':{'kind':'five_value_data','values':[8,12,14,16,20]},
'B-SRC-22-1472':{'kind':'fraction_bar','parts':8,'selected':3},
'B-SRC-22-1476':{'kind':'five_value_data','values':[22,18,27,19,24]},
'B-SRC-22-1479':{'kind':'cuboid','length_cm':20,'width_cm':10,'height_cm':8},
'B-SRC-22-1482':{'kind':'five_value_data','values':[8,10,10,14,18]},
'B-SRC-22-1483':{'kind':'straight_line_angle','known_angle_deg':128},
'B-SRC-23-1548':{'kind':'rectangle','length_cm':18,'width_cm':12},
'B-SRC-23-1549':{'kind':'cuboid','length_cm':12,'width_cm':8,'height_cm':5},
}
SUPPORTED_VISUALS={
'fraction_bar':('parts','selected'),'five_value_data':('values',),'rectangle':('length_cm','width_cm'),
'cuboid':('length_cm','width_cm','height_cm'),'straight_line_angle':('known_angle_deg',),'coordinate_move':('start','move_right'),
}


def main()->int:
    source=h.read_jsonl(SOURCE); survivors=h.read_jsonl(SURVIVORS)
    errors=[]; warnings=[]
    if len(source)!=2279: errors.append(f'source_count:{len(source)}')
    if len(survivors)!=789: errors.append(f'pre_batch_survivors:{len(survivors)}')
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

    batch_core=defaultdict(list); construct_counts=Counter(); answer_counts=Counter(); visual_counts=Counter()
    for x in batch:
        bid=x.get('bankId'); src=src_by.get(bid)
        if not src: errors.append(f'unknown_source:{bid}'); continue
        if src.get('domain')!='Matematik' or x.get('domain')!='Matematik': errors.append(f'domain_invalid:{bid}')
        if role_by.get(bid)!='FOLLOWER_REPLACE': errors.append(f'not_strict_follower:{bid}')
        if x.get('sourceDuplicateFamily')!=family_by.get(bid): errors.append(f'family_mismatch:{bid}')
        if x.get('repairType')!='MATERIAL_REWRITE_CORE_DUPLICATE': errors.append(f'repair_type_invalid:{bid}')
        if x.get('reviewStatus')!='EDITORIAL_REPAIRED_PENDING_QA': errors.append(f'review_status_invalid:{bid}')
        cf=str(x.get('constructFamily') or '').strip(); construct_counts[cf]+=1
        if not cf: errors.append(f'construct_family_missing:{bid}')
        opts=x.get('options'); ai=x.get('answerIndex')
        if not isinstance(opts,list) or len(opts)!=4 or len({str(o).strip() for o in opts})!=4: errors.append(f'options_invalid:{bid}'); continue
        if ai not in (0,1,2,3): errors.append(f'answer_index_invalid:{bid}'); continue
        answer_counts[ai]+=1
        if str(opts[ai])!=EXPECTED.get(bid): errors.append(f'independent_answer_check_failed:{bid}:{opts[ai]!r}!={EXPECTED.get(bid)!r}')
        if not isinstance(x.get('solutionSteps'),list) or len(x['solutionSteps'])<2: errors.append(f'solution_steps_insufficient:{bid}')
        if int(x.get('plannedLevel',0)) not in (1,2,3,4): errors.append(f'planned_level_invalid:{bid}')

        visual=x.get('visual')
        expected_visual=EXPECTED_VISUALS.get(bid)
        if expected_visual is not None:
            if visual!=expected_visual: errors.append(f'visual_mismatch:{bid}:{visual!r}!={expected_visual!r}')
        elif visual is not None:
            errors.append(f'unexpected_visual:{bid}')
        if visual is not None:
            kind=str(visual.get('kind') or ''); visual_counts[kind]+=1
            if kind not in SUPPORTED_VISUALS: errors.append(f'unsupported_visual:{bid}:{kind}')
            else:
                for key in SUPPORTED_VISUALS[kind]:
                    if key not in visual: errors.append(f'visual_missing_key:{bid}:{kind}:{key}')

        newcore=h.core_signature(x.get('question')); oldcore=h.core_signature(src.get('question'))
        if not newcore: errors.append(f'blank_core:{bid}')
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
    if dict(answer_counts)!=expected_answer_distribution: errors.append(f'answer_position_distribution:{dict(answer_counts)}!={expected_answer_distribution}')
    if sum(visual_counts.values())!=15: errors.append(f'visual_count:{sum(visual_counts.values())}!=15')

    overlay={x['bankId']:x for x in batch}; final=[]
    for src in source:
        if src['bankId'] in overlay:
            y=dict(src); y.update(overlay[src['bankId']]); y['batch']='B_REPAIR_BATCH_005'; final.append(y)
        else: final.append(src)
    if len(final)!=2279: errors.append(f'output_count:{len(final)}')

    report={
        'version':'B_REPAIR_BATCH_005_QA_V1','batchFiles':[str(p.relative_to(ROOT)) for p in BATCH_FILES],
        'batchCount':len(batch),'materialRewriteCount':sum(1 for x in batch if x.get('repairType')=='MATERIAL_REWRITE_CORE_DUPLICATE'),
        'uniqueConstructFamilies':len(construct_counts),'answerPositionCounts':{str(i):answer_counts.get(i,0) for i in range(4)},
        'structuredVisualCount':sum(visual_counts.values()),'visualKinds':dict(visual_counts),
        'independentExpectedAnswerCount':len(EXPECTED),'preBatchStrictSurvivors':len(survivors),
        'expectedPostBatchStrictSurvivors':839,'expectedRemainingSourceAuthoringOrRewrite':2661,
        'errors':errors,'warnings':warnings,'pass':not errors and not warnings,
    }
    REPORT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    if report['pass']:
        with OUTPUT.open('w',encoding='utf-8') as f:
            for x in final: f.write(json.dumps(x,ensure_ascii=False,separators=(',',':'))+'\n')
    print(json.dumps(report,ensure_ascii=False,indent=2))
    return 0 if report['pass'] else 2

if __name__=='__main__': raise SystemExit(main())

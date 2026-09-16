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
SOURCE=OUT/'b_section_selected_after_batch005.jsonl'
SURVIVORS=OUT/'b_section_strict_source_survivors.jsonl'
FAMILIES=OUT/'b_section_core_duplicate_families.csv'
REPORT=OUT/'b_section_repair_batch_006_qa.json'
OUTPUT=OUT/'b_section_selected_after_batch006.jsonl'
BATCH_FILES=sorted(CUR.glob('repair_batch_006_math_*.jsonl'))

EXPECTED={'B-SRC-23-1551':'RM14.40','B-SRC-23-1552':'24','B-SRC-23-1553':'144°','B-SRC-23-1554':'10 km','B-SRC-24-1611':'10 kotak penuh, baki 10','B-SRC-24-1612':'5/8','B-SRC-24-1614':'RM162','B-SRC-24-1615':'300 g','B-SRC-24-1616':'Tiada mod','B-SRC-24-1617':'60 cm','B-SRC-24-1618':'108 cm²','B-SRC-24-1619':'336 cm³','B-SRC-24-1620':'1:40 petang','B-SRC-24-1621':'RM210','B-SRC-24-1622':'30','B-SRC-24-1623':'72°','B-SRC-24-1624':'4.5 km','B-SRC-25-1681':'17 bas','B-SRC-25-1682':'3 11/12','B-SRC-25-1684':'280 L','B-SRC-25-1685':'8:12:15','B-SRC-25-1686':'54','B-SRC-25-1687':'54 cm','B-SRC-25-1688':'169 cm²','B-SRC-25-1689':'4 L','B-SRC-25-1690':'5:30 petang','B-SRC-25-1691':'Pek B, RM72','B-SRC-25-1692':'50 murid','B-SRC-25-1693':'135°','B-SRC-25-1694':'24 unit','B-SRC-26-1751':'12 cawan','B-SRC-26-1752':'3/5','B-SRC-26-1754':'90','B-SRC-26-1755':'1:1','B-SRC-26-1756':'14','B-SRC-26-1757':'36 cm','B-SRC-26-1758':'72 cm²','B-SRC-26-1759':'192 cm³','B-SRC-26-1760':'4 jam 35 minit','B-SRC-26-1761':'RM220','B-SRC-26-1762':'90°','B-SRC-26-1763':'56°','B-SRC-26-1764':'11','B-SRC-27-1821':'24 pek penuh, baki 0.6 kg','B-SRC-27-1822':'36','B-SRC-27-1824':'RM120','B-SRC-27-1825':'5:7','B-SRC-27-1826':'Berkurang 1','B-SRC-27-1827':'12 cm²','B-SRC-27-1828':'4:15 pagi'}

EXPECTED_VISUALS={'B-SRC-23-1552':{'kind':'five_value_data','values':[14,18,22,16,20]},'B-SRC-23-1554':{'kind':'coordinate_move','start':[2,3],'move_right':5},'B-SRC-24-1612':{'kind':'fraction_bar','parts':8,'selected':7},'B-SRC-24-1616':{'kind':'five_value_data','values':[7,9,9,11,14]},'B-SRC-24-1619':{'kind':'cuboid','length_cm':8,'width_cm':6,'height_cm':7},'B-SRC-24-1622':{'kind':'five_value_data','values':[6,8,10,10,16]},'B-SRC-25-1686':{'kind':'five_value_data','values':[12,18,20,16,24]},'B-SRC-25-1689':{'kind':'cuboid','length_cm':30,'width_cm':20,'height_cm':10},'B-SRC-25-1694':{'kind':'rectangle','length_cm':7,'width_cm':5},'B-SRC-26-1752':{'kind':'fraction_bar','parts':10,'selected':4},'B-SRC-26-1756':{'kind':'five_value_data','values':[12,14,14,16,19]},'B-SRC-26-1763':{'kind':'straight_line_angle','known_angle_deg':118},'B-SRC-26-1764':{'kind':'coordinate_move','start':[3,5],'move_right':8},'B-SRC-27-1826':{'kind':'five_value_data','values':[18,20,22,24,31]}}
SUPPORTED_VISUALS={'fraction_bar':('parts','selected'),'five_value_data':('values',),'rectangle':('length_cm','width_cm'),'cuboid':('length_cm','width_cm','height_cm'),'straight_line_angle':('known_angle_deg',),'coordinate_move':('start','move_right')}

def main()->int:
    source=h.read_jsonl(SOURCE); survivors=h.read_jsonl(SURVIVORS)
    errors=[]; warnings=[]
    if len(source)!=2279: errors.append(f'source_count:{len(source)}')
    if len(survivors)!=839: errors.append(f'pre_batch_survivors:{len(survivors)}')
    if len(BATCH_FILES)!=2: errors.append(f'batch_file_count:{len(BATCH_FILES)}')
    batch=[]
    for p in BATCH_FILES: batch.extend(h.read_jsonl(p))
    if len(batch)!=50: errors.append(f'batch_count:{len(batch)}')
    ids=[x.get('bankId') for x in batch]
    if len(set(ids))!=len(batch): errors.append('duplicate_batch_bankId')
    if set(EXPECTED)!=set(ids): errors.append('batch_ids_do_not_match_locked_expected_50')
    src_by={x['bankId']:x for x in source}; family_by={}; role_by={}
    with FAMILIES.open(encoding='utf-8',newline='') as f:
        for row in csv.DictReader(f): family_by[row['bankId']]=row['familyId']; role_by[row['bankId']]=row['role']
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
        visual=x.get('visual'); expected_visual=EXPECTED_VISUALS.get(bid)
        if expected_visual is not None:
            if visual!=expected_visual: errors.append(f'visual_mismatch:{bid}:{visual!r}!={expected_visual!r}')
        elif visual is not None: errors.append(f'unexpected_visual:{bid}')
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
    if sum(visual_counts.values())!=14: errors.append(f'visual_count:{sum(visual_counts.values())}!=14')
    overlay={x['bankId']:x for x in batch}; final=[]
    for src in source:
        if src['bankId'] in overlay:
            y=dict(src); y.update(overlay[src['bankId']]); y['batch']='B_REPAIR_BATCH_006'; final.append(y)
        else: final.append(src)
    if len(final)!=2279: errors.append(f'output_count:{len(final)}')
    report={'version':'B_REPAIR_BATCH_006_QA_V1','batchFiles':[str(p.relative_to(ROOT)) for p in BATCH_FILES],'batchCount':len(batch),'materialRewriteCount':sum(1 for x in batch if x.get('repairType')=='MATERIAL_REWRITE_CORE_DUPLICATE'),'uniqueConstructFamilies':len(construct_counts),'answerPositionCounts':{str(i):answer_counts.get(i,0) for i in range(4)},'structuredVisualCount':sum(visual_counts.values()),'visualKinds':dict(visual_counts),'independentExpectedAnswerCount':len(EXPECTED),'preBatchStrictSurvivors':len(survivors),'expectedPostBatchStrictSurvivors':889,'expectedRemainingSourceAuthoringOrRewrite':2611,'errors':errors,'warnings':warnings,'pass':not errors and not warnings}
    REPORT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    if report['pass']:
        with OUTPUT.open('w',encoding='utf-8') as f:
            for x in final: f.write(json.dumps(x,ensure_ascii=False,separators=(',',':'))+'\n')
    print(json.dumps(report,ensure_ascii=False,indent=2)); return 0 if report['pass'] else 2

if __name__=='__main__': raise SystemExit(main())

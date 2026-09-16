#!/usr/bin/env python3
from __future__ import annotations

import csv,json
from collections import Counter,defaultdict
from difflib import SequenceMatcher
from pathlib import Path
import validate_apply_pksk_b_repair_batch002 as h

ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'audit-output'; CUR=ROOT/'sim/pksk/curation/B'
SOURCE=OUT/'b_section_selected_after_batch009.jsonl'; SURVIVORS=OUT/'b_section_strict_source_survivors.jsonl'; FAMILIES=OUT/'b_section_core_duplicate_families.csv'
REPORT=OUT/'b_section_repair_batch_010_qa.json'; OUTPUT=OUT/'b_section_selected_after_batch010.jsonl'; BATCH_FILES=sorted(CUR.glob('repair_batch_010_math_*.jsonl'))
EXPECTED={'B-SRC-39-2662': '3/4', 'B-SRC-39-2664': '174', 'B-SRC-39-2665': '99', 'B-SRC-39-2666': '15', 'B-SRC-39-2667': '52 cm', 'B-SRC-39-2668': '200 cm²', 'B-SRC-39-2669': '240 cm³', 'B-SRC-39-2670': '9:50 pagi', 'B-SRC-39-2671': 'RM13.70', 'B-SRC-39-2672': '7', 'B-SRC-39-2673': '225°', 'B-SRC-39-2674': '1.2 km', 'B-SRC-40-2731': '24 cm', 'B-SRC-40-2732': '42', 'B-SRC-40-2734': '20%', 'B-SRC-40-2735': '45', 'B-SRC-40-2736': '30', 'B-SRC-40-2737': '69 m', 'B-SRC-40-2738': '148 cm²', 'B-SRC-40-2739': '240 cm³', 'B-SRC-40-2740': '2 jam 35 minit', 'B-SRC-40-2741': 'Pek B', 'B-SRC-40-2742': '0', 'B-SRC-40-2743': '34°', 'B-SRC-40-2744': '10 unit', 'B-SRC-41-2801': '14 dulang', 'B-SRC-41-2802': '7 m', 'B-SRC-41-2804': '24', 'B-SRC-41-2805': '23:22', 'B-SRC-41-2806': '18', 'B-SRC-41-2807': '240 cm²', 'B-SRC-41-2808': '136 cm²', 'B-SRC-41-2809': '960 cm³', 'B-SRC-41-2810': '7', 'B-SRC-41-2811': 'RM25.60', 'B-SRC-41-2812': '75', 'B-SRC-41-2813': '135°', 'B-SRC-41-2814': '1.5 km', 'B-SRC-42-2871': '24 saat', 'B-SRC-42-2872': '70%', 'B-SRC-42-2874': '25%', 'B-SRC-42-2875': '1:3', 'B-SRC-42-2876': '7 dan 9', 'B-SRC-42-2877': '6 cm', 'B-SRC-42-2878': '140 cm²', 'B-SRC-42-2879': '24', 'B-SRC-42-2880': '11:35 malam', 'B-SRC-42-2881': 'RM51', 'B-SRC-42-2882': '18', 'B-SRC-42-2883': '60°'}
EXPECTED_VISUALS={'B-SRC-39-2662': {'kind': 'fraction_bar', 'parts': 5, 'selected': 3}, 'B-SRC-39-2666': {'kind': 'five_value_data', 'values': [6, 10, 13, 17, 21]}, 'B-SRC-39-2668': {'kind': 'rectangle', 'length_cm': 18, 'width_cm': 12}, 'B-SRC-39-2672': {'kind': 'five_value_data', 'values': [4, 7, 7, 9, 12]}, 'B-SRC-40-2736': {'kind': 'five_value_data', 'values': [12, 16, 18, 21, 23]}, 'B-SRC-40-2738': {'kind': 'rectangle', 'length_cm': 14, 'width_cm': 8}, 'B-SRC-40-2743': {'kind': 'straight_line_angle', 'known_angle_deg': 112}, 'B-SRC-41-2806': {'kind': 'five_value_data', 'values': [10, 14, 16, 18, 22]}, 'B-SRC-41-2808': {'kind': 'rectangle', 'length_cm': 22, 'width_cm': 16}, 'B-SRC-41-2809': {'kind': 'cuboid', 'length_cm': 18, 'width_cm': 10, 'height_cm': 8}, 'B-SRC-41-2814': {'kind': 'coordinate_move', 'start': [4, 2], 'move_right': 6}, 'B-SRC-42-2872': {'kind': 'fraction_bar', 'parts': 10, 'selected': 7}, 'B-SRC-42-2879': {'kind': 'cuboid', 'length_cm': 12, 'width_cm': 9, 'height_cm': 6}, 'B-SRC-42-2882': {'kind': 'five_value_data', 'values': [12, 18, 23, 27, 35]}}
SUPPORTED={'fraction_bar':('parts','selected'),'five_value_data':('values',),'rectangle':('length_cm','width_cm'),'cuboid':('length_cm','width_cm','height_cm'),'straight_line_angle':('known_angle_deg',),'coordinate_move':('start','move_right')}

def main()->int:
    source=h.read_jsonl(SOURCE); survivors=h.read_jsonl(SURVIVORS); errors=[]; warnings=[]
    if len(source)!=2279: errors.append(f'source_count:{len(source)}')
    if len(survivors)!=1039: errors.append(f'pre_batch_survivors:{len(survivors)}')
    if len(BATCH_FILES)!=2: errors.append(f'batch_file_count:{len(BATCH_FILES)}')
    batch=[]
    for p in BATCH_FILES: batch.extend(h.read_jsonl(p))
    ids=[x.get('bankId') for x in batch]
    if len(batch)!=50: errors.append(f'batch_count:{len(batch)}')
    if len(set(ids))!=50: errors.append('duplicate_batch_bankId')
    if set(ids)!=set(EXPECTED): errors.append('batch_ids_do_not_match_locked_expected_50')
    src_by={x['bankId']:x for x in source}; fam={}; role={}
    with FAMILIES.open(encoding='utf-8',newline='') as f:
        for row in csv.DictReader(f): fam[row['bankId']]=row['familyId']; role[row['bankId']]=row['role']
    survivor_core=defaultdict(list); survivor_near=[]
    for x in survivors:
        sig=h.core_signature(x.get('question')); survivor_core[(x.get('domain'),sig)].append(x['bankId'])
        nt=h.near_text(x.get('question')); survivor_near.append((x['bankId'],x.get('domain'),nt,set(nt.split())))
    cores=defaultdict(list); constructs=Counter(); answers=Counter(); visual_counts=Counter()
    for x in batch:
        bid=x.get('bankId'); src=src_by.get(bid)
        if not src: errors.append(f'unknown_source:{bid}'); continue
        if src.get('domain')!='Matematik' or x.get('domain')!='Matematik': errors.append(f'domain_invalid:{bid}')
        if role.get(bid)!='FOLLOWER_REPLACE': errors.append(f'not_strict_follower:{bid}')
        if x.get('sourceDuplicateFamily')!=fam.get(bid): errors.append(f'family_mismatch:{bid}')
        if x.get('repairType')!='MATERIAL_REWRITE_CORE_DUPLICATE' or x.get('reviewStatus')!='EDITORIAL_REPAIRED_PENDING_QA': errors.append(f'repair_status_invalid:{bid}')
        cf=str(x.get('constructFamily') or '').strip(); constructs[cf]+=1
        if not cf: errors.append(f'construct_family_missing:{bid}')
        opts=x.get('options'); ai=x.get('answerIndex')
        if not isinstance(opts,list) or len(opts)!=4 or len({str(o).strip() for o in opts})!=4: errors.append(f'options_invalid:{bid}'); continue
        if ai not in (0,1,2,3): errors.append(f'answer_index_invalid:{bid}'); continue
        answers[ai]+=1
        if str(opts[ai])!=EXPECTED.get(bid): errors.append(f'independent_answer_check_failed:{bid}:{opts[ai]!r}!={EXPECTED.get(bid)!r}')
        if not isinstance(x.get('solutionSteps'),list) or len(x['solutionSteps'])<2: errors.append(f'solution_steps_insufficient:{bid}')
        if int(x.get('plannedLevel',0)) not in (1,2,3,4): errors.append(f'planned_level_invalid:{bid}')
        vis=x.get('visual'); exp=EXPECTED_VISUALS.get(bid)
        if exp is not None and vis!=exp: errors.append(f'visual_mismatch:{bid}:{vis!r}!={exp!r}')
        if exp is None and vis is not None: errors.append(f'unexpected_visual:{bid}')
        if vis is not None:
            kind=str(vis.get('kind') or ''); visual_counts[kind]+=1
            if kind not in SUPPORTED: errors.append(f'unsupported_visual:{bid}:{kind}')
            else:
                for key in SUPPORTED[kind]:
                    if key not in vis: errors.append(f'visual_missing_key:{bid}:{kind}:{key}')
        new=h.core_signature(x.get('question')); old=h.core_signature(src.get('question'))
        if not new or new==old: errors.append(f'not_materially_rewritten:{bid}')
        coll=survivor_core.get(('Matematik',new),[])
        if coll: errors.append(f'core_collision_with_survivor:{bid}:{coll[:3]}')
        cores[new].append(bid)
        nt=h.near_text(x.get('question')); nts=set(nt.split())
        for sid,dom,snt,sts in survivor_near:
            if dom!='Matematik': continue
            jac=len(nts & sts)/max(1,len(nts | sts))
            if jac>=0.70 and SequenceMatcher(None,nt,snt).ratio()>=0.92: warnings.append(f'near_survivor:{bid}:{sid}')
    if any(len(v)>1 for v in cores.values()): errors.append('internal_core_duplicates')
    if any(v>1 for v in constructs.values()): errors.append('repeated_construct_family')
    if dict(answers)!={0:13,1:13,2:12,3:12}: errors.append(f'answer_position_distribution:{dict(answers)}')
    if sum(visual_counts.values())!=14: errors.append(f'visual_count:{sum(visual_counts.values())}!=14')
    overlay={x['bankId']:x for x in batch}; final=[]
    for src in source:
        if src['bankId'] in overlay:
            y=dict(src); y.update(overlay[src['bankId']]); y['batch']='B_REPAIR_BATCH_010'; final.append(y)
        else: final.append(src)
    if len(final)!=2279: errors.append(f'output_count:{len(final)}')
    report={'version':'B_REPAIR_BATCH_010_QA_V1','batchCount':len(batch),'uniqueConstructFamilies':len(constructs),'answerPositionCounts':{str(i):answers.get(i,0) for i in range(4)},'structuredVisualCount':sum(visual_counts.values()),'visualKinds':dict(visual_counts),'independentExpectedAnswerCount':len(EXPECTED),'preBatchStrictSurvivors':len(survivors),'expectedPostBatchStrictSurvivors':1089,'expectedRemainingSourceAuthoringOrRewrite':2411,'errors':errors,'warnings':warnings,'pass':not errors and not warnings}
    REPORT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    if report['pass']:
        with OUTPUT.open('w',encoding='utf-8') as f:
            for x in final: f.write(json.dumps(x,ensure_ascii=False,separators=(',',':'))+'\n')
    print(json.dumps(report,ensure_ascii=False,indent=2)); return 0 if report['pass'] else 2

if __name__=='__main__': raise SystemExit(main())

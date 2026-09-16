#!/usr/bin/env python3
from __future__ import annotations

import csv,json
from collections import Counter,defaultdict
from difflib import SequenceMatcher
from pathlib import Path
import validate_apply_pksk_b_repair_batch002 as h

ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'audit-output'; CUR=ROOT/'sim/pksk/curation/B'
SOURCE=OUT/'b_section_selected_after_batch008.jsonl'; SURVIVORS=OUT/'b_section_strict_source_survivors.jsonl'; FAMILIES=OUT/'b_section_core_duplicate_families.csv'
REPORT=OUT/'b_section_repair_batch_009_qa.json'; OUTPUT=OUT/'b_section_selected_after_batch009.jsonl'; BATCH_FILES=sorted(CUR.glob('repair_batch_009_math_*.jsonl'))
EXPECTED={'B-SRC-35-2385': '77', 'B-SRC-35-2386': '14', 'B-SRC-35-2387': '36 cm', 'B-SRC-35-2388': '192 cm²', 'B-SRC-35-2389': '19 cawan, baki 50 mL', 'B-SRC-35-2390': '8:50 pagi', 'B-SRC-35-2391': 'Kedai B, lebih murah RM0.10', 'B-SRC-35-2392': '20', 'B-SRC-35-2393': '72°', 'B-SRC-35-2394': '2.1 km', 'B-SRC-36-2451': '24 minit', 'B-SRC-36-2452': '4 m', 'B-SRC-36-2454': '184', 'B-SRC-36-2455': '1.5 L', 'B-SRC-36-2456': '0', 'B-SRC-36-2457': '4 cm', 'B-SRC-36-2458': '240 cm²', 'B-SRC-36-2459': '12 L', 'B-SRC-36-2460': '2 jam 35 minit', 'B-SRC-36-2461': 'Pilihan B, lebih jimat RM2', 'B-SRC-36-2462': '13', 'B-SRC-36-2463': '140°', 'B-SRC-36-2464': '20 unit', 'B-SRC-37-2521': '12', 'B-SRC-37-2522': '40', 'B-SRC-37-2524': '150', 'B-SRC-37-2525': '2:3', 'B-SRC-37-2526': '20', 'B-SRC-37-2527': '17 cm', 'B-SRC-37-2528': '90 cm²', 'B-SRC-37-2529': '8 botol', 'B-SRC-37-2530': '11:30 pagi', 'B-SRC-37-2531': 'Pek B', 'B-SRC-37-2532': '12', 'B-SRC-37-2533': '90°', 'B-SRC-37-2534': '(5,8)', 'B-SRC-38-2591': '17 barisan, baki 6', 'B-SRC-38-2592': '132', 'B-SRC-38-2594': '25%', 'B-SRC-38-2595': '150 g', 'B-SRC-38-2596': '14', 'B-SRC-38-2597': '44 cm', 'B-SRC-38-2598': '340 m²', 'B-SRC-38-2599': '12 botol, baki 300 mL', 'B-SRC-38-2600': '150 km', 'B-SRC-38-2601': 'RM120', 'B-SRC-38-2602': '71', 'B-SRC-38-2603': '62°', 'B-SRC-38-2604': '(6,5)', 'B-SRC-39-2661': '24'}
EXPECTED_VISUALS={'B-SRC-35-2386': {'kind': 'five_value_data', 'values': [8, 11, 14, 17, 20]}, 'B-SRC-35-2388': {'kind': 'rectangle', 'length_cm': 12, 'width_cm': 8}, 'B-SRC-35-2389': {'kind': 'cuboid', 'length_cm': 25, 'width_cm': 20, 'height_cm': 12}, 'B-SRC-35-2392': {'kind': 'five_value_data', 'values': [6, 8, 10, 12, 14]}, 'B-SRC-35-2394': {'kind': 'coordinate_move', 'start': [2, 5], 'move_right': 7}, 'B-SRC-36-2456': {'kind': 'five_value_data', 'values': [4, 6, 6, 8, 11]}, 'B-SRC-36-2458': {'kind': 'rectangle', 'length_cm': 20, 'width_cm': 15}, 'B-SRC-36-2459': {'kind': 'cuboid', 'length_cm': 40, 'width_cm': 25, 'height_cm': 20}, 'B-SRC-36-2462': {'kind': 'five_value_data', 'values': [9, 13, 17, 22, 30]}, 'B-SRC-37-2522': {'kind': 'fraction_bar', 'parts': 4, 'selected': 1}, 'B-SRC-37-2526': {'kind': 'five_value_data', 'values': [12, 18, 20, 24, 26]}, 'B-SRC-37-2532': {'kind': 'five_value_data', 'values': [5, 8, 11, 13, 16, 20]}, 'B-SRC-38-2596': {'kind': 'five_value_data', 'values': [3, 5, 5, 8, 12]}, 'B-SRC-38-2598': {'kind': 'rectangle', 'length_cm': 25, 'width_cm': 16}}
SUPPORTED={'fraction_bar':('parts','selected'),'five_value_data':('values',),'rectangle':('length_cm','width_cm'),'cuboid':('length_cm','width_cm','height_cm'),'straight_line_angle':('known_angle_deg',),'coordinate_move':('start','move_right')}

def main()->int:
    source=h.read_jsonl(SOURCE); survivors=h.read_jsonl(SURVIVORS); errors=[]; warnings=[]
    if len(source)!=2279: errors.append(f'source_count:{len(source)}')
    if len(survivors)!=989: errors.append(f'pre_batch_survivors:{len(survivors)}')
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
            y=dict(src); y.update(overlay[src['bankId']]); y['batch']='B_REPAIR_BATCH_009'; final.append(y)
        else: final.append(src)
    if len(final)!=2279: errors.append(f'output_count:{len(final)}')
    report={'version':'B_REPAIR_BATCH_009_QA_V1','batchCount':len(batch),'uniqueConstructFamilies':len(constructs),'answerPositionCounts':{str(i):answers.get(i,0) for i in range(4)},'structuredVisualCount':sum(visual_counts.values()),'visualKinds':dict(visual_counts),'independentExpectedAnswerCount':len(EXPECTED),'preBatchStrictSurvivors':len(survivors),'expectedPostBatchStrictSurvivors':1039,'expectedRemainingSourceAuthoringOrRewrite':2461,'errors':errors,'warnings':warnings,'pass':not errors and not warnings}
    REPORT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    if report['pass']:
        with OUTPUT.open('w',encoding='utf-8') as f:
            for x in final: f.write(json.dumps(x,ensure_ascii=False,separators=(',',':'))+'\n')
    print(json.dumps(report,ensure_ascii=False,indent=2)); return 0 if report['pass'] else 2

if __name__=='__main__': raise SystemExit(main())

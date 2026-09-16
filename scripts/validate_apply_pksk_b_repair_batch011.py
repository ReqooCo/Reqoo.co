#!/usr/bin/env python3
from __future__ import annotations
import csv,json
from collections import Counter,defaultdict
from difflib import SequenceMatcher
from pathlib import Path
import validate_apply_pksk_b_repair_batch002 as h
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'audit-output'; CUR=ROOT/'sim/pksk/curation/B'
SOURCE=OUT/'b_section_selected_after_batch010.jsonl'; SURVIVORS=OUT/'b_section_strict_source_survivors.jsonl'; FAMILIES=OUT/'b_section_core_duplicate_families.csv'
REPORT=OUT/'b_section_repair_batch_011_qa.json'; OUTPUT=OUT/'b_section_selected_after_batch011.jsonl'; BATCH_FILES=sorted(CUR.glob('repair_batch_011_math_*.jsonl'))
EXPECTED={'B-SRC-42-2884': '1.5 km', 'B-SRC-43-2941': '11 kotak', 'B-SRC-43-2942': '3/4', 'B-SRC-43-2944': '180', 'B-SRC-43-2945': '4:5', 'B-SRC-43-2946': '23', 'B-SRC-43-2947': '56 cm', 'B-SRC-43-2948': '150 cm²', 'B-SRC-43-2949': '2.7 L', 'B-SRC-43-2950': '1:15 petang', 'B-SRC-43-2951': 'RM17', 'B-SRC-43-2952': '22', 'B-SRC-43-2953': '36°', 'B-SRC-43-2954': '(11,5), 3.2 km', 'B-SRC-44-3011': '42 pek', 'B-SRC-44-3012': '1/5', 'B-SRC-44-3014': '72.5%', 'B-SRC-44-3015': '7:6', 'B-SRC-44-3016': '16', 'B-SRC-44-3017': '54 m', 'B-SRC-44-3018': '208 cm²', 'B-SRC-44-3019': '20 L', 'B-SRC-44-3020': '6:00 pagi, hari berikutnya', 'B-SRC-44-3021': 'Pek B, RM3.30 sebotol', 'B-SRC-44-3022': '96', 'B-SRC-44-3023': '75°', 'B-SRC-44-3024': '1.5 km', 'B-SRC-45-3081': '10:12 pagi', 'B-SRC-45-3082': '7/12 L', 'B-SRC-45-3084': '3/8', 'B-SRC-45-3085': '1:1', 'B-SRC-45-3086': '2', 'B-SRC-45-3087': '58 cm', 'B-SRC-45-3088': '162 cm²', 'B-SRC-45-3089': '12 cm', 'B-SRC-45-3090': '11:05 pagi', 'B-SRC-45-3091': 'RM250', 'B-SRC-45-3092': '70', 'B-SRC-45-3093': '50°', 'B-SRC-45-3094': '0.8 km', 'B-SRC-46-3151': '21 pek penuh, baki 12', 'B-SRC-46-3152': '1/3', 'B-SRC-46-3154': 'RM120', 'B-SRC-46-3155': '99', 'B-SRC-46-3156': '160', 'B-SRC-46-3157': '64 cm', 'B-SRC-46-3158': '56 m²', 'B-SRC-46-3159': '4 kotak', 'B-SRC-46-3160': '4:05 petang', 'B-SRC-46-3161': '14 item'}
EXPECTED_VISUALS={'B-SRC-42-2884': {'kind': 'coordinate_move', 'start': [2, 4], 'move_right': 6}, 'B-SRC-43-2942': {'kind': 'fraction_bar', 'parts': 8, 'selected': 7}, 'B-SRC-43-2946': {'kind': 'five_value_data', 'values': [18, 22, 25, 27, 28]}, 'B-SRC-43-2947': {'kind': 'rectangle', 'length_cm': 18, 'width_cm': 10}, 'B-SRC-43-2949': {'kind': 'cuboid', 'length_cm': 20, 'width_cm': 15, 'height_cm': 12}, 'B-SRC-43-2952': {'kind': 'five_value_data', 'values': [14, 18, 20, 22, 26]}, 'B-SRC-43-2953': {'kind': 'straight_line_angle', 'known_angle_deg': 126}, 'B-SRC-43-2954': {'kind': 'coordinate_move', 'start': [3, 5], 'move_right': 8}, 'B-SRC-44-3012': {'kind': 'fraction_bar', 'parts': 10, 'selected': 6}, 'B-SRC-44-3016': {'kind': 'five_value_data', 'values': [7, 9, 12, 14, 18]}, 'B-SRC-44-3019': {'kind': 'cuboid', 'length_cm': 25, 'width_cm': 16, 'height_cm': 10}, 'B-SRC-45-3084': {'kind': 'fraction_bar', 'parts': 8, 'selected': 3}, 'B-SRC-45-3086': {'kind': 'five_value_data', 'values': [6, 8, 8, 11, 17]}, 'B-SRC-46-3152': {'kind': 'fraction_bar', 'parts': 6, 'selected': 5}}
SUPPORTED={'fraction_bar':('parts','selected'),'five_value_data':('values',),'rectangle':('length_cm','width_cm'),'cuboid':('length_cm','width_cm','height_cm'),'straight_line_angle':('known_angle_deg',),'coordinate_move':('start','move_right')}
def main()->int:
    source=h.read_jsonl(SOURCE); survivors=h.read_jsonl(SURVIVORS); errors=[]; warnings=[]
    if len(source)!=2279: errors.append(f'source_count:{len(source)}')
    if len(survivors)!=1089: errors.append(f'pre_batch_survivors:{len(survivors)}')
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
            y=dict(src); y.update(overlay[src['bankId']]); y['batch']='B_REPAIR_BATCH_011'; final.append(y)
        else: final.append(src)
    if len(final)!=2279: errors.append(f'output_count:{len(final)}')
    report={'version':'B_REPAIR_BATCH_011_QA_V1','batchCount':len(batch),'uniqueConstructFamilies':len(constructs),'answerPositionCounts':{str(i):answers.get(i,0) for i in range(4)},'structuredVisualCount':sum(visual_counts.values()),'visualKinds':dict(visual_counts),'independentExpectedAnswerCount':len(EXPECTED),'preBatchStrictSurvivors':len(survivors),'expectedPostBatchStrictSurvivors':1139,'expectedRemainingSourceAuthoringOrRewrite':2361,'errors':errors,'warnings':warnings,'pass':not errors and not warnings}
    REPORT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    if report['pass']:
        with OUTPUT.open('w',encoding='utf-8') as f:
            for x in final: f.write(json.dumps(x,ensure_ascii=False,separators=(',',':'))+'\n')
    print(json.dumps(report,ensure_ascii=False,indent=2)); return 0 if report['pass'] else 2
if __name__=='__main__': raise SystemExit(main())

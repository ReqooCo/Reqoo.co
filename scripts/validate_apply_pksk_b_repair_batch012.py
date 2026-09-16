#!/usr/bin/env python3
from __future__ import annotations
import csv,json
from collections import Counter,defaultdict
from difflib import SequenceMatcher
from pathlib import Path
import validate_apply_pksk_b_repair_batch002 as h
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'audit-output'; CUR=ROOT/'sim/pksk/curation/B'
SOURCE=OUT/'b_section_selected_after_batch011.jsonl'; SURVIVORS=OUT/'b_section_strict_source_survivors.jsonl'; FAMILIES=OUT/'b_section_core_duplicate_families.csv'
REPORT=OUT/'b_section_repair_batch_012_qa.json'; OUTPUT=OUT/'b_section_selected_after_batch012.jsonl'; BATCH_FILES=[CUR/'repair_batch_012_math_a.jsonl',CUR/'repair_batch_012_math_b.jsonl']; CORRECTIONS=CUR/'repair_batch_012_corrections.jsonl'
EXPECTED={'B-SRC-46-3162': '20', 'B-SRC-46-3163': '80°', 'B-SRC-46-3164': '(5,4)', 'B-SRC-47-3221': '12 palet', 'B-SRC-47-3222': '5/8', 'B-SRC-47-3224': 'RM120', 'B-SRC-47-3225': '30', 'B-SRC-47-3226': '14.5', 'B-SRC-47-3227': '76 m', 'B-SRC-47-3228': '166 cm²', 'B-SRC-47-3229': '960 cm³', 'B-SRC-47-3230': '1:25 pagi, hari berikutnya', 'B-SRC-47-3231': 'RM42', 'B-SRC-47-3232': '28', 'B-SRC-47-3233': '65°', 'B-SRC-47-3234': '(11,2)', 'B-SRC-48-3291': '16 van', 'B-SRC-48-3292': '72', 'B-SRC-48-3294': '15%', 'B-SRC-48-3295': '45', 'B-SRC-48-3296': '16', 'B-SRC-48-3297': '52 cm', 'B-SRC-48-3298': '128 cm²', 'B-SRC-48-3299': '15 cawan', 'B-SRC-48-3300': '10:30 malam, hari Isnin', 'B-SRC-48-3301': 'Pek B, lebih murah RM0.10', 'B-SRC-48-3302': '27', 'B-SRC-48-3303': '90°', 'B-SRC-48-3304': '600 m', 'B-SRC-49-3361': '42 cm', 'B-SRC-49-3362': '1/2', 'B-SRC-49-3364': 'RM120', 'B-SRC-49-3365': '1050 g', 'B-SRC-49-3366': '90', 'B-SRC-49-3367': '150 cm²', 'B-SRC-49-3368': '136 cm²', 'B-SRC-49-3369': '1800 cm³', 'B-SRC-49-3370': '4 sesi', 'B-SRC-49-3371': 'RM60', 'B-SRC-49-3372': '8', 'B-SRC-49-3373': '80°', 'B-SRC-49-3374': '(5,5)', 'B-SRC-50-3431': '8:30 pagi', 'B-SRC-50-3432': '7/12 L', 'B-SRC-50-3434': '105', 'B-SRC-50-3435': '77', 'B-SRC-50-3436': '76.8', 'B-SRC-50-3437': '54 m', 'B-SRC-50-3438': '18 m²', 'B-SRC-50-3439': '24'}
EXPECTED_VISUALS={'B-SRC-46-3162': {'kind': 'five_value_data', 'values': [12, 15, 18, 20, 25]}, 'B-SRC-47-3222': {'kind': 'fraction_bar', 'parts': 8, 'selected': 5}, 'B-SRC-47-3226': {'kind': 'five_value_data', 'values': [9, 12, 14, 17, 21]}, 'B-SRC-47-3227': {'kind': 'rectangle', 'length_cm': 24, 'width_cm': 16}, 'B-SRC-47-3228': {'kind': 'rectangle', 'length_cm': 14, 'width_cm': 8}, 'B-SRC-47-3229': {'kind': 'cuboid', 'length_cm': 12, 'width_cm': 8, 'height_cm': 5}, 'B-SRC-47-3232': {'kind': 'five_value_data', 'values': [15, 17, 19, 21]}, 'B-SRC-47-3234': {'kind': 'coordinate_move', 'start': [4, 2], 'move_right': 7}, 'B-SRC-48-3292': {'kind': 'fraction_bar', 'parts': 10, 'selected': 7}, 'B-SRC-48-3296': {'kind': 'five_value_data', 'values': [5, 8, 8, 12, 17]}, 'B-SRC-48-3298': {'kind': 'rectangle', 'length_cm': 20, 'width_cm': 16}, 'B-SRC-48-3299': {'kind': 'cuboid', 'length_cm': 20, 'width_cm': 15, 'height_cm': 10}, 'B-SRC-49-3362': {'kind': 'fraction_bar', 'parts': 4, 'selected': 1}, 'B-SRC-49-3372': {'kind': 'five_value_data', 'values': [4, 6, 6, 8, 10]}}
SUPPORTED={'fraction_bar':('parts','selected'),'five_value_data':('values',),'rectangle':('length_cm','width_cm'),'cuboid':('length_cm','width_cm','height_cm'),'straight_line_angle':('known_angle_deg',),'coordinate_move':('start','move_right')}
def main()->int:
    source=h.read_jsonl(SOURCE); survivors=h.read_jsonl(SURVIVORS); errors=[]; warnings=[]
    if len(source)!=2279: errors.append(f'source_count:{len(source)}')
    if len(survivors)!=1139: errors.append(f'pre_batch_survivors:{len(survivors)}')
    if not all(p.exists() for p in BATCH_FILES): errors.append('missing_batch_file')
    batch=[]
    for p in BATCH_FILES: batch.extend(h.read_jsonl(p))
    corrections=h.read_jsonl(CORRECTIONS) if CORRECTIONS.exists() else []
    if len(corrections)!=1 or corrections[0].get('bankId')!='B-SRC-49-3370': errors.append('locked_correction_missing_or_invalid')
    corr={x['bankId']:x for x in corrections}
    batch=[dict(x,**corr.get(x.get('bankId'),{})) for x in batch]
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
            y=dict(src); y.update(overlay[src['bankId']]); y['batch']='B_REPAIR_BATCH_012'; final.append(y)
        else: final.append(src)
    if len(final)!=2279: errors.append(f'output_count:{len(final)}')
    report={'version':'B_REPAIR_BATCH_012_QA_V2_WITH_CORRECTION','batchCount':len(batch),'correctionCount':len(corrections),'uniqueConstructFamilies':len(constructs),'answerPositionCounts':{str(i):answers.get(i,0) for i in range(4)},'structuredVisualCount':sum(visual_counts.values()),'visualKinds':dict(visual_counts),'independentExpectedAnswerCount':len(EXPECTED),'preBatchStrictSurvivors':len(survivors),'expectedPostBatchStrictSurvivors':1189,'expectedRemainingSourceAuthoringOrRewrite':2311,'errors':errors,'warnings':warnings,'pass':not errors and not warnings}
    REPORT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    if report['pass']:
        with OUTPUT.open('w',encoding='utf-8') as f:
            for x in final: f.write(json.dumps(x,ensure_ascii=False,separators=(',',':'))+'\n')
    print(json.dumps(report,ensure_ascii=False,indent=2)); return 0 if report['pass'] else 2
if __name__=='__main__': raise SystemExit(main())

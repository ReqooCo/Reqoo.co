#!/usr/bin/env python3
from __future__ import annotations

import json
from collections import Counter, defaultdict
from difflib import SequenceMatcher
from pathlib import Path

import validate_apply_pksk_b_repair_batch002 as h

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'audit-output'
CUR=ROOT/'sim/pksk/curation/B'
SURVIVORS=OUT/'b_section_strict_source_survivors.jsonl'
PREV_FILES=[OUT/'b_math_new_batch_001_validated.jsonl',OUT/'b_math_new_batch_002_validated.jsonl']
REPORT=OUT/'b_math_new_batch_003_qa.json'
OUTPUT=OUT/'b_math_new_batch_003_validated.jsonl'
BATCH_FILES=[CUR/'math_new_batch_003a.jsonl',CUR/'math_new_batch_003b.jsonl']

EXPECTED={
'B-MATH-NEW-0101':'7','B-MATH-NEW-0102':'28','B-MATH-NEW-0103':'960','B-MATH-NEW-0104':'17','B-MATH-NEW-0105':'1/6',
'B-MATH-NEW-0106':'1/2','B-MATH-NEW-0107':'3/4 L','B-MATH-NEW-0108':'120','B-MATH-NEW-0109':'12 mata peratusan','B-MATH-NEW-0110':'120',
'B-MATH-NEW-0111':'RM250','B-MATH-NEW-0112':'60','B-MATH-NEW-0113':'24','B-MATH-NEW-0114':'1050 g','B-MATH-NEW-0115':'71',
'B-MATH-NEW-0116':'13','B-MATH-NEW-0117':'58','B-MATH-NEW-0118':'8','B-MATH-NEW-0119':'12 cm','B-MATH-NEW-0120':'336 cm²',
'B-MATH-NEW-0121':'14 cm','B-MATH-NEW-0122':'81 cm²','B-MATH-NEW-0123':'72','B-MATH-NEW-0124':'15 cm','B-MATH-NEW-0125':'2 jam 45 minit',
'B-MATH-NEW-0126':'9:00 pagi','B-MATH-NEW-0127':'RM19','B-MATH-NEW-0128':'RM4.80','B-MATH-NEW-0129':'1.8 km','B-MATH-NEW-0130':'(1,5)',
'B-MATH-NEW-0131':'20°','B-MATH-NEW-0132':'13.5','B-MATH-NEW-0133':'116 cm','B-MATH-NEW-0134':'1.8 km','B-MATH-NEW-0135':'1/7',
'B-MATH-NEW-0136':'0','B-MATH-NEW-0137':'1000','B-MATH-NEW-0138':'150 cm','B-MATH-NEW-0139':'185','B-MATH-NEW-0140':'21 cm',
'B-MATH-NEW-0141':'RM95','B-MATH-NEW-0142':'RM129','B-MATH-NEW-0143':'162 cm²','B-MATH-NEW-0144':'240 cm³','B-MATH-NEW-0145':'3:45 petang',
'B-MATH-NEW-0146':'0°C','B-MATH-NEW-0147':'8 kali','B-MATH-NEW-0148':'10 kali','B-MATH-NEW-0149':'12','B-MATH-NEW-0150':'RM15',
}
EXPECTED_VISUALS={
'B-MATH-NEW-0106':{'kind':'fraction_bar','parts':10,'selected':3},
'B-MATH-NEW-0118':{'kind':'five_value_data','values':[6,8,8,8,8,10,12]},
'B-MATH-NEW-0120':{'kind':'rectangle','length_cm':24,'width_cm':18},
'B-MATH-NEW-0123':{'kind':'cuboid','length_cm':24,'width_cm':18,'height_cm':12},
'B-MATH-NEW-0131':{'kind':'straight_line_angle','known_angle_deg':120},
'B-MATH-NEW-0133':{'kind':'rectangle','length_cm':18,'width_cm':11},
'B-MATH-NEW-0134':{'kind':'coordinate_move','start':[-1,4],'move_right':6},
'B-MATH-NEW-0135':{'kind':'fraction_bar','parts':7,'selected':2},
'B-MATH-NEW-0136':{'kind':'five_value_data','values':[6,8,10,10,16]},
}
SUPPORTED={'fraction_bar':('parts','selected'),'five_value_data':('values',),'rectangle':('length_cm','width_cm'),'cuboid':('length_cm','width_cm','height_cm'),'straight_line_angle':('known_angle_deg',),'coordinate_move':('start','move_right')}


def main()->int:
    errors=[]; warnings=[]
    survivors=h.read_jsonl(SURVIVORS)
    math_survivors=[x for x in survivors if x.get('domain')=='Matematik']
    if len(survivors)!=1194: errors.append(f'v14_survivor_count:{len(survivors)}!=1194')
    if len(math_survivors)!=719: errors.append(f'v14_math_survivor_count:{len(math_survivors)}!=719')

    prev=[]
    for p in PREV_FILES:
        rows=h.read_jsonl(p); prev.extend(rows)
    if len(prev)!=100 or any(x.get('domain')!='Matematik' or x.get('reviewStatus')!='EDITORIAL_QA_PASS' for x in prev):
        errors.append('previous_validated_math_baseline_invalid')
    prev_ids={x.get('bankId') for x in prev}
    expected_prev_ids={f'B-MATH-NEW-{i:04d}' for i in range(1,101)}
    if prev_ids!=expected_prev_ids: errors.append('previous_math_ids_not_0001_0100')

    batch=[]
    for p in BATCH_FILES:
        if not p.exists(): errors.append(f'missing_batch_file:{p.relative_to(ROOT)}'); continue
        batch.extend(h.read_jsonl(p))
    ids=[str(x.get('bankId') or '') for x in batch]
    expected_ids={f'B-MATH-NEW-{i:04d}' for i in range(101,151)}
    if len(batch)!=50: errors.append(f'batch_count:{len(batch)}!=50')
    if set(ids)!=expected_ids: errors.append('batch_ids_do_not_match_0101_0150')
    if len(ids)!=len(set(ids)): errors.append('duplicate_batch_bankId')
    if set(EXPECTED)!=expected_ids: errors.append('locked_expected_map_not_50_ids')

    baseline=math_survivors+prev
    baseline_core=defaultdict(list); baseline_near=[]
    prev_constructs={str(x.get('constructFamily') or '') for x in prev}
    for x in baseline:
        sig=h.core_signature(x.get('question')); baseline_core[sig].append(x['bankId'])
        nt=h.near_text(x.get('question')); baseline_near.append((x['bankId'],nt,set(nt.split())))

    cores=defaultdict(list); constructs=Counter(); answers=Counter(); levels=Counter(); visual_kinds=Counter(); validated=[]
    for x in batch:
        bid=str(x.get('bankId') or '')
        if x.get('section')!='BAHAGIAN B': errors.append(f'section_invalid:{bid}')
        if x.get('domain')!='Matematik': errors.append(f'domain_invalid:{bid}')
        if x.get('authoringType')!='NEW_AUTHOR_DEFICIT': errors.append(f'authoring_type_invalid:{bid}')
        if x.get('reviewStatus')!='EDITORIAL_NEW_PENDING_QA': errors.append(f'review_status_invalid:{bid}')
        cf=str(x.get('constructFamily') or '').strip(); constructs[cf]+=1
        if not cf: errors.append(f'construct_family_missing:{bid}')
        if cf in prev_constructs: errors.append(f'construct_family_reused_from_previous_math:{bid}:{cf}')
        level=int(x.get('plannedLevel',0) or 0); levels[level]+=1
        if level not in (2,3,4): errors.append(f'planned_level_invalid:{bid}:{level}')
        opts=x.get('options'); ai=x.get('answerIndex')
        if not isinstance(opts,list) or len(opts)!=4 or len({str(o).strip() for o in opts})!=4:
            errors.append(f'options_invalid:{bid}'); continue
        if ai not in (0,1,2,3): errors.append(f'answer_index_invalid:{bid}'); continue
        answers[ai]+=1
        if str(opts[ai])!=EXPECTED.get(bid): errors.append(f'independent_answer_check_failed:{bid}:{opts[ai]!r}!={EXPECTED.get(bid)!r}')
        steps=x.get('solutionSteps')
        if not isinstance(steps,list) or len(steps)<2 or any(not str(s).strip() for s in steps): errors.append(f'solution_steps_invalid:{bid}')
        vis=x.get('visual'); exp=EXPECTED_VISUALS.get(bid)
        if exp is not None and vis!=exp: errors.append(f'visual_mismatch:{bid}:{vis!r}!={exp!r}')
        if exp is None and vis is not None: errors.append(f'unexpected_visual:{bid}')
        if vis is not None:
            kind=str(vis.get('kind') or ''); visual_kinds[kind]+=1
            if kind not in SUPPORTED: errors.append(f'unsupported_visual:{bid}:{kind}')
            else:
                for key in SUPPORTED[kind]:
                    if key not in vis: errors.append(f'visual_missing_key:{bid}:{kind}:{key}')
        core=h.core_signature(x.get('question'))
        if not core: errors.append(f'blank_core:{bid}')
        coll=baseline_core.get(core,[])
        if coll: errors.append(f'core_collision_with_existing_math:{bid}:{coll[:3]}')
        cores[core].append(bid)
        nt=h.near_text(x.get('question')); nts=set(nt.split())
        for sid,snt,sts in baseline_near:
            jac=len(nts & sts)/max(1,len(nts | sts))
            if jac>=0.70 and SequenceMatcher(None,nt,snt).ratio()>=0.92:
                warnings.append(f'near_existing_math:{bid}:{sid}')
        y=dict(x); y['reviewStatus']='EDITORIAL_QA_PASS'; y['validationBatch']='B_MATH_NEW_BATCH_003'; validated.append(y)

    if any(len(v)>1 for v in cores.values()): errors.append('internal_core_duplicates')
    if len(constructs)!=50 or any(v!=1 for v in constructs.values()): errors.append(f'construct_family_uniqueness:{len(constructs)}')
    if dict(answers)!={0:13,1:13,2:12,3:12}: errors.append(f'answer_position_distribution:{dict(answers)}')
    if dict(levels)!={2:9,3:25,4:16}: errors.append(f'difficulty_distribution:{dict(levels)}')
    if sum(visual_kinds.values())!=9: errors.append(f'visual_count:{sum(visual_kinds.values())}!=9')

    report={
        'version':'B_MATH_NEW_BATCH_003_QA_V1','batchCount':len(batch),
        'existingMathBaselineCount':len(baseline),'v14MathStrictSourceReady':len(math_survivors),'previousValidatedMathReady':len(prev),
        'uniqueConstructFamilies':len(constructs),'answerPositionCounts':{str(i):answers.get(i,0) for i in range(4)},
        'difficultyCounts':{str(i):levels.get(i,0) for i in (2,3,4)},'structuredVisualCount':sum(visual_kinds.values()),
        'visualKinds':dict(visual_kinds),'independentExpectedAnswerCount':len(EXPECTED),
        'expectedMathReadyAfterPlan':869,'expectedMathRemainingAfterPlan':131,
        'errors':errors,'warnings':warnings,'pass':not errors and not warnings,
    }
    REPORT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    if report['pass']:
        with OUTPUT.open('w',encoding='utf-8') as f:
            for x in sorted(validated,key=lambda r:r['bankId']):
                f.write(json.dumps(x,ensure_ascii=False,separators=(',',':'))+'\n')
    print(json.dumps(report,ensure_ascii=False,indent=2))
    return 0 if report['pass'] else 2

if __name__=='__main__': raise SystemExit(main())

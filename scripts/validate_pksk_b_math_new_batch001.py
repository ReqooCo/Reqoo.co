#!/usr/bin/env python3
from __future__ import annotations

import json
from collections import Counter, defaultdict
from difflib import SequenceMatcher
from pathlib import Path

import validate_apply_pksk_b_repair_batch002 as h

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'audit-output'
CUR = ROOT / 'sim/pksk/curation/B'
SURVIVORS = OUT / 'b_section_strict_source_survivors.jsonl'
REPORT = OUT / 'b_math_new_batch_001_qa.json'
OUTPUT = OUT / 'b_math_new_batch_001_validated.jsonl'
BATCH_FILES = [CUR / 'math_new_batch_001a.jsonl', CUR / 'math_new_batch_001b.jsonl']

EXPECTED = {
'B-MATH-NEW-0001':'42 cm','B-MATH-NEW-0002':'11:00 pagi','B-MATH-NEW-0003':'12 cm × 8 cm','B-MATH-NEW-0004':'21 kotak penuh, baki 8','B-MATH-NEW-0005':'RM57',
'B-MATH-NEW-0006':'15/32','B-MATH-NEW-0007':'10 helai','B-MATH-NEW-0008':'1 3/4 m','B-MATH-NEW-0009':'160 murid','B-MATH-NEW-0010':'RM184',
'B-MATH-NEW-0011':'1:1','B-MATH-NEW-0012':'84','B-MATH-NEW-0013':'810 g','B-MATH-NEW-0014':'98','B-MATH-NEW-0015':'13',
'B-MATH-NEW-0016':'63','B-MATH-NEW-0017':'71','B-MATH-NEW-0018':'60 cm','B-MATH-NEW-0019':'136 cm²','B-MATH-NEW-0020':'222 cm²',
'B-MATH-NEW-0021':'169 cm²','B-MATH-NEW-0022':'12 cm','B-MATH-NEW-0023':'4.8 L','B-MATH-NEW-0024':'30','B-MATH-NEW-0025':'12:05 tengah hari',
'B-MATH-NEW-0026':'10:30 malam, hari Jumaat','B-MATH-NEW-0027':'60 km/j','B-MATH-NEW-0028':'42 km','B-MATH-NEW-0029':'Pek B, RM6.50/kg','B-MATH-NEW-0030':'RM60',
'B-MATH-NEW-0031':'RM450','B-MATH-NEW-0032':'(1,7)','B-MATH-NEW-0033':'3 km','B-MATH-NEW-0034':'80°','B-MATH-NEW-0035':'120°',
'B-MATH-NEW-0036':'75°','B-MATH-NEW-0037':'105°','B-MATH-NEW-0038':'2500 g','B-MATH-NEW-0039':'18 m','B-MATH-NEW-0040':'3900 mL',
'B-MATH-NEW-0041':'28','B-MATH-NEW-0042':'7','B-MATH-NEW-0043':'81','B-MATH-NEW-0044':'RM112.50','B-MATH-NEW-0045':'87.5%',
'B-MATH-NEW-0046':'27 km','B-MATH-NEW-0047':'1/2','B-MATH-NEW-0048':'20','B-MATH-NEW-0049':'332 buah','B-MATH-NEW-0050':'RM5',
}

EXPECTED_VISUALS = {
'B-MATH-NEW-0006': {'kind':'fraction_bar','parts':8,'selected':3},
'B-MATH-NEW-0015': {'kind':'five_value_data','values':[8,11,13,17,20]},
'B-MATH-NEW-0016': {'kind':'five_value_data','values':[5,7,7,9,12,14]},
'B-MATH-NEW-0019': {'kind':'rectangle','length_cm':22,'width_cm':16},
'B-MATH-NEW-0023': {'kind':'cuboid','length_cm':25,'width_cm':20,'height_cm':16},
'B-MATH-NEW-0033': {'kind':'coordinate_move','start':[2,3],'move_right':5},
'B-MATH-NEW-0041': {'kind':'five_value_data','values':[18,22,25,27]},
'B-MATH-NEW-0044': {'kind':'fraction_bar','parts':8,'selected':3},
'B-MATH-NEW-0048': {'kind':'five_value_data','values':[10,14,16,18,22]},
}
SUPPORTED = {
'fraction_bar':('parts','selected'),
'five_value_data':('values',),
'rectangle':('length_cm','width_cm'),
'cuboid':('length_cm','width_cm','height_cm'),
'straight_line_angle':('known_angle_deg',),
'coordinate_move':('start','move_right'),
}


def main() -> int:
    errors=[]; warnings=[]
    survivors=h.read_jsonl(SURVIVORS)
    if len(survivors)!=1194: errors.append(f'v14_survivor_count:{len(survivors)}!=1194')
    math_survivors=[x for x in survivors if x.get('domain')=='Matematik']
    if len(math_survivors)!=719: errors.append(f'v14_math_survivor_count:{len(math_survivors)}!=719')

    batch=[]
    for p in BATCH_FILES:
        if not p.exists(): errors.append(f'missing_batch_file:{p.relative_to(ROOT)}'); continue
        batch.extend(h.read_jsonl(p))
    ids=[str(x.get('bankId') or '') for x in batch]
    expected_ids={f'B-MATH-NEW-{i:04d}' for i in range(1,51)}
    if len(batch)!=50: errors.append(f'batch_count:{len(batch)}!=50')
    if set(ids)!=expected_ids: errors.append('batch_ids_do_not_match_0001_0050')
    if len(ids)!=len(set(ids)): errors.append('duplicate_batch_bankId')
    if set(EXPECTED)!=expected_ids: errors.append('locked_expected_map_not_50_ids')

    survivor_core=defaultdict(list); survivor_near=[]
    for x in math_survivors:
        sig=h.core_signature(x.get('question')); survivor_core[sig].append(x['bankId'])
        nt=h.near_text(x.get('question')); survivor_near.append((x['bankId'],nt,set(nt.split())))

    cores=defaultdict(list); constructs=Counter(); answers=Counter(); levels=Counter(); visual_kinds=Counter()
    validated=[]
    for x in batch:
        bid=str(x.get('bankId') or '')
        if x.get('section')!='BAHAGIAN B': errors.append(f'section_invalid:{bid}')
        if x.get('domain')!='Matematik': errors.append(f'domain_invalid:{bid}')
        if x.get('authoringType')!='NEW_AUTHOR_DEFICIT': errors.append(f'authoring_type_invalid:{bid}')
        if x.get('reviewStatus')!='EDITORIAL_NEW_PENDING_QA': errors.append(f'review_status_invalid:{bid}')
        cf=str(x.get('constructFamily') or '').strip(); constructs[cf]+=1
        if not cf: errors.append(f'construct_family_missing:{bid}')
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
        coll=survivor_core.get(core,[])
        if coll: errors.append(f'core_collision_with_v14_math_survivor:{bid}:{coll[:3]}')
        cores[core].append(bid)
        nt=h.near_text(x.get('question')); nts=set(nt.split())
        for sid,snt,sts in survivor_near:
            jac=len(nts & sts)/max(1,len(nts | sts))
            if jac>=0.70 and SequenceMatcher(None,nt,snt).ratio()>=0.92:
                warnings.append(f'near_v14_math_survivor:{bid}:{sid}')

        y=dict(x); y['reviewStatus']='EDITORIAL_QA_PASS'; y['validationBatch']='B_MATH_NEW_BATCH_001'; validated.append(y)

    if any(len(v)>1 for v in cores.values()): errors.append('internal_core_duplicates')
    if len(constructs)!=50 or any(v!=1 for v in constructs.values()): errors.append(f'construct_family_uniqueness:{len(constructs)}')
    if dict(answers)!={0:13,1:13,2:12,3:12}: errors.append(f'answer_position_distribution:{dict(answers)}')
    if sum(visual_kinds.values())!=9: errors.append(f'visual_count:{sum(visual_kinds.values())}!=9')
    if dict(levels)!={2:9,3:25,4:16}: errors.append(f'difficulty_distribution:{dict(levels)}')

    report={
        'version':'B_MATH_NEW_BATCH_001_QA_V1',
        'batchCount':len(batch),
        'v14StrictSourceSurvivors':len(survivors),
        'v14MathStrictSourceReady':len(math_survivors),
        'uniqueConstructFamilies':len(constructs),
        'answerPositionCounts':{str(i):answers.get(i,0) for i in range(4)},
        'difficultyCounts':{str(i):levels.get(i,0) for i in (2,3,4)},
        'structuredVisualCount':sum(visual_kinds.values()),
        'visualKinds':dict(visual_kinds),
        'independentExpectedAnswerCount':len(EXPECTED),
        'expectedMathReadyAfterPlan':769,
        'expectedMathRemainingAfterPlan':231,
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

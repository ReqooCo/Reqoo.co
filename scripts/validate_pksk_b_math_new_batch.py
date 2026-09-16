#!/usr/bin/env python3
from __future__ import annotations

import json, sys
from collections import Counter, defaultdict
from difflib import SequenceMatcher
from pathlib import Path

import validate_apply_pksk_b_repair_batch002 as h

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'audit-output'; CUR=ROOT/'sim/pksk/curation/B'
SURVIVORS=OUT/'b_section_strict_source_survivors.jsonl'
SUPPORTED={'fraction_bar':('parts','selected'),'five_value_data':('values',),'rectangle':('length_cm','width_cm'),'cuboid':('length_cm','width_cm','height_cm'),'straight_line_angle':('known_angle_deg',),'coordinate_move':('start','move_right')}


def main()->int:
    if len(sys.argv)!=2 or not sys.argv[1].isdigit():
        raise SystemExit('usage: validate_pksk_b_math_new_batch.py <batch-number>')
    batch_no=int(sys.argv[1])
    if batch_no<1: raise SystemExit('batch number must be >=1')
    tag=f'{batch_no:03d}'
    manifest_path=CUR/f'math_new_batch_{tag}_manifest.json'
    if not manifest_path.exists(): raise SystemExit(f'missing {manifest_path.relative_to(ROOT)}')
    manifest=json.loads(manifest_path.read_text(encoding='utf-8'))
    expected=manifest.get('expectedAnswers') or {}
    expected_visuals=manifest.get('expectedVisuals') or {}
    expected_levels={int(k):int(v) for k,v in (manifest.get('difficultyCounts') or {}).items()}
    expected_answers={int(k):int(v) for k,v in (manifest.get('answerPositionCounts') or {}).items()}
    expected_visual_count=int(manifest.get('structuredVisualCount',-1))
    start_id=int(manifest.get('startId',0)); end_id=int(manifest.get('endId',0))
    expected_count=end_id-start_id+1
    errors=[]; warnings=[]

    survivors=h.read_jsonl(SURVIVORS)
    math_survivors=[x for x in survivors if x.get('domain')=='Matematik']
    if len(survivors)!=1194: errors.append(f'v14_survivor_count:{len(survivors)}!=1194')
    if len(math_survivors)!=719: errors.append(f'v14_math_survivor_count:{len(math_survivors)}!=719')

    prev=[]
    for n in range(1,batch_no):
        p=OUT/f'b_math_new_batch_{n:03d}_validated.jsonl'
        if not p.exists(): errors.append(f'missing_previous_validated:{p.name}'); continue
        prev.extend(h.read_jsonl(p))
    expected_prev=(batch_no-1)*50
    if len(prev)!=expected_prev: errors.append(f'previous_validated_math_count:{len(prev)}!={expected_prev}')
    if any(x.get('domain')!='Matematik' or x.get('reviewStatus')!='EDITORIAL_QA_PASS' for x in prev): errors.append('previous_validated_math_baseline_invalid')
    prev_ids={x.get('bankId') for x in prev}
    expected_prev_ids={f'B-MATH-NEW-{i:04d}' for i in range(1,start_id)}
    if prev_ids!=expected_prev_ids: errors.append('previous_math_ids_not_contiguous')

    batch_files=sorted(CUR.glob(f'math_new_batch_{tag}[ab].jsonl'))
    if not batch_files:
        batch_files=sorted(CUR.glob(f'math_new_batch_{tag}*.jsonl'))
        batch_files=[p for p in batch_files if not p.name.endswith('_manifest.json')]
    batch=[]
    for p in batch_files: batch.extend(h.read_jsonl(p))
    ids=[str(x.get('bankId') or '') for x in batch]
    expected_ids={f'B-MATH-NEW-{i:04d}' for i in range(start_id,end_id+1)}
    if len(batch)!=expected_count: errors.append(f'batch_count:{len(batch)}!={expected_count}')
    if set(ids)!=expected_ids: errors.append(f'batch_ids_do_not_match_{start_id:04d}_{end_id:04d}')
    if len(ids)!=len(set(ids)): errors.append('duplicate_batch_bankId')
    if set(expected)!=expected_ids: errors.append('locked_expected_map_does_not_match_batch_ids')

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
        if str(opts[ai])!=expected.get(bid): errors.append(f'independent_answer_check_failed:{bid}:{opts[ai]!r}!={expected.get(bid)!r}')
        steps=x.get('solutionSteps')
        if not isinstance(steps,list) or len(steps)<2 or any(not str(s).strip() for s in steps): errors.append(f'solution_steps_invalid:{bid}')
        vis=x.get('visual'); exp=expected_visuals.get(bid)
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
            if jac>=0.70 and SequenceMatcher(None,nt,snt).ratio()>=0.92: warnings.append(f'near_existing_math:{bid}:{sid}')
        y=dict(x); y['reviewStatus']='EDITORIAL_QA_PASS'; y['validationBatch']=f'B_MATH_NEW_BATCH_{tag}'; validated.append(y)

    if any(len(v)>1 for v in cores.values()): errors.append('internal_core_duplicates')
    if len(constructs)!=expected_count or any(v!=1 for v in constructs.values()): errors.append(f'construct_family_uniqueness:{len(constructs)}')
    if dict(answers)!=expected_answers: errors.append(f'answer_position_distribution:{dict(answers)}!={expected_answers}')
    if dict(levels)!=expected_levels: errors.append(f'difficulty_distribution:{dict(levels)}!={expected_levels}')
    if sum(visual_kinds.values())!=expected_visual_count: errors.append(f'visual_count:{sum(visual_kinds.values())}!={expected_visual_count}')

    ready_after=719+len(prev)+expected_count
    report={'version':f'B_MATH_NEW_BATCH_{tag}_QA_V1','batchCount':len(batch),'existingMathBaselineCount':len(baseline),'v14MathStrictSourceReady':len(math_survivors),'previousValidatedMathReady':len(prev),'uniqueConstructFamilies':len(constructs),'answerPositionCounts':{str(i):answers.get(i,0) for i in range(4)},'difficultyCounts':{str(i):levels.get(i,0) for i in (2,3,4)},'structuredVisualCount':sum(visual_kinds.values()),'visualKinds':dict(visual_kinds),'independentExpectedAnswerCount':len(expected),'expectedMathReadyAfterPlan':ready_after,'expectedMathRemainingAfterPlan':1000-ready_after,'errors':errors,'warnings':warnings,'pass':not errors and not warnings}
    report_path=OUT/f'b_math_new_batch_{tag}_qa.json'; output=OUT/f'b_math_new_batch_{tag}_validated.jsonl'
    report_path.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    if report['pass']:
        with output.open('w',encoding='utf-8') as f:
            for x in sorted(validated,key=lambda r:r['bankId']): f.write(json.dumps(x,ensure_ascii=False,separators=(',',':'))+'\n')
    print(json.dumps(report,ensure_ascii=False,indent=2)); return 0 if report['pass'] else 2

if __name__=='__main__': raise SystemExit(main())

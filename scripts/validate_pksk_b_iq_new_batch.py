#!/usr/bin/env python3
from __future__ import annotations

import json, re, sys
from collections import Counter, defaultdict
from difflib import SequenceMatcher
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'audit-output'; CUR=ROOT/'sim/pksk/curation/B'
SURVIVORS=OUT/'b_section_strict_source_survivors.jsonl'
NUM_RE=re.compile(r'\b\d+(?:[.,]\d+)?\b')
PUNCT_RE=re.compile(r'[^\w#\s]',re.UNICODE)
SPACE_RE=re.compile(r'\s+')


def read_jsonl(path:Path)->list[dict]:
    if not path.exists(): raise SystemExit(f'missing {path.relative_to(ROOT)}')
    rows=[]
    for n,line in enumerate(path.read_text(encoding='utf-8').splitlines(),1):
        if not line.strip(): continue
        try: rows.append(json.loads(line))
        except Exception as exc: raise SystemExit(f'{path}:{n}: invalid JSON: {exc}')
    return rows


def norm(text:str,numbers:bool=False)->str:
    s=str(text or '').casefold().strip()
    if numbers: s=NUM_RE.sub('#',s)
    s=PUNCT_RE.sub(' ',s)
    return SPACE_RE.sub(' ',s).strip()


def main()->int:
    if len(sys.argv)!=2 or not sys.argv[1].isdigit():
        raise SystemExit('usage: validate_pksk_b_iq_new_batch.py <batch-number>')
    batch_no=int(sys.argv[1]); tag=f'{batch_no:03d}'
    manifest_path=CUR/f'iq_new_batch_{tag}_manifest.json'
    if not manifest_path.exists(): raise SystemExit(f'missing {manifest_path.relative_to(ROOT)}')
    manifest=json.loads(manifest_path.read_text(encoding='utf-8'))
    expected=manifest.get('expectedAnswers') or {}
    expected_families=manifest.get('familyCounts') or {}
    expected_answers={int(k):int(v) for k,v in (manifest.get('answerPositionCounts') or {}).items()}
    start_id=int(manifest.get('startId',0)); end_id=int(manifest.get('endId',0))
    expected_count=int(manifest.get('expectedCount',end_id-start_id+1))
    errors=[]; warnings=[]

    source=[x for x in read_jsonl(SURVIVORS) if x.get('domain')=='IQ']
    if len(source)!=30: errors.append(f'strict_source_iq_count:{len(source)}!=30')

    prev=[]
    for n in range(1,batch_no):
        p=OUT/f'b_iq_new_batch_{n:03d}_validated.jsonl'
        if not p.exists(): errors.append(f'missing_previous_validated:{p.name}'); continue
        prev.extend(read_jsonl(p))
    expected_prev=(batch_no-1)*50
    if len(prev)!=expected_prev: errors.append(f'previous_validated_iq_count:{len(prev)}!={expected_prev}')
    if any(x.get('domain')!='IQ' or x.get('reviewStatus')!='EDITORIAL_QA_PASS' for x in prev):
        errors.append('previous_validated_iq_baseline_invalid')
    expected_prev_ids={f'B-IQ-NEW-{i:04d}' for i in range(1,start_id)}
    if {x.get('bankId') for x in prev}!=expected_prev_ids: errors.append('previous_iq_ids_not_contiguous')

    files=sorted(CUR.glob(f'iq_new_batch_{tag}[ab].jsonl'))
    batch=[]
    for p in files: batch.extend(read_jsonl(p))
    ids=[str(x.get('bankId') or '') for x in batch]
    expected_ids={f'B-IQ-NEW-{i:04d}' for i in range(start_id,end_id+1)}
    if len(batch)!=expected_count: errors.append(f'batch_count:{len(batch)}!={expected_count}')
    if set(ids)!=expected_ids: errors.append('batch_ids_do_not_match_manifest_range')
    if len(ids)!=len(set(ids)): errors.append('duplicate_batch_bankId')
    if set(expected)!=expected_ids: errors.append('locked_expected_map_does_not_match_batch_ids')

    baseline=source+prev
    exact_base={norm(x.get('question')):x.get('bankId') for x in baseline}
    num_base={norm(x.get('question'),True):x.get('bankId') for x in baseline}
    near_base=[(x.get('bankId'),norm(x.get('question'),True)) for x in baseline]
    prev_constructs={str(x.get('construct') or '') for x in prev}
    prev_signatures={str(x.get('patternSignature') or '') for x in prev}

    families=Counter(); answers=Counter(); constructs=Counter(); signatures=Counter(); exact=defaultdict(list); num=defaultdict(list); difficulties=[]; validated=[]
    for x in batch:
        bid=str(x.get('bankId') or '')
        if x.get('section')!='BAHAGIAN B': errors.append(f'section_invalid:{bid}')
        if x.get('domain')!='IQ': errors.append(f'domain_invalid:{bid}')
        if x.get('format')!='MCQ': errors.append(f'format_invalid:{bid}')
        q=str(x.get('question') or '').strip()
        if len(q)<20: errors.append(f'question_too_short:{bid}')
        opts=x.get('options'); ai=x.get('answerIndex')
        if not isinstance(opts,list) or len(opts)!=4 or len({str(o).strip() for o in opts})!=4:
            errors.append(f'options_invalid:{bid}'); continue
        if ai not in (0,1,2,3): errors.append(f'answer_index_invalid:{bid}'); continue
        answers[ai]+=1
        if str(opts[ai])!=expected.get(bid): errors.append(f'independent_answer_check_failed:{bid}:{opts[ai]!r}!={expected.get(bid)!r}')
        steps=x.get('solutionSteps')
        if not isinstance(steps,list) or len(steps)<2 or any(not str(s).strip() for s in steps): errors.append(f'solution_steps_invalid:{bid}')
        fam=str(x.get('repeatFamily') or ''); families[fam]+=1
        con=str(x.get('construct') or '').strip(); constructs[con]+=1
        sig=str(x.get('patternSignature') or '').strip(); signatures[sig]+=1
        if not con: errors.append(f'construct_missing:{bid}')
        if not sig: errors.append(f'pattern_signature_missing:{bid}')
        if con in prev_constructs: errors.append(f'construct_reused_from_previous_iq:{bid}:{con}')
        if sig in prev_signatures: errors.append(f'pattern_signature_reused_from_previous_iq:{bid}:{sig}')
        for req in ('cognitiveDemand','reasoningForm','presentationForm'):
            if not str(x.get(req) or '').strip(): errors.append(f'{req}_missing:{bid}')
        try:
            d=float(x.get('difficultyScore')); difficulties.append(d)
            if d<1.5 or d>3.3: warnings.append(f'difficulty_outlier:{bid}:{d}')
        except Exception: errors.append(f'difficulty_invalid:{bid}')
        n0=norm(q); nn=norm(q,True)
        if n0 in exact_base: errors.append(f'exact_collision_with_existing_iq:{bid}:{exact_base[n0]}')
        if nn in num_base: errors.append(f'number_template_collision_with_existing_iq:{bid}:{num_base[nn]}')
        exact[n0].append(bid); num[nn].append(bid)
        for sid,sn in near_base:
            if sn and SequenceMatcher(None,nn,sn).ratio()>=0.90: warnings.append(f'near_existing_iq:{bid}:{sid}')
        y=dict(x); y['reviewStatus']='EDITORIAL_QA_PASS'; y['qaNotes']='Independent answer, duplicate and editorial gates passed; final cross-bank QA still required.'; y['validationBatch']=f'B_IQ_NEW_BATCH_{tag}'; validated.append(y)

    if dict(families)!=expected_families: errors.append(f'family_quota_mismatch:{dict(families)}')
    if dict(answers)!=expected_answers: errors.append(f'answer_position_distribution:{dict(answers)}!={expected_answers}')
    if len(constructs)!=expected_count or any(v!=1 for v in constructs.values()): errors.append(f'construct_uniqueness:{len(constructs)}')
    if len(signatures)!=expected_count or any(v!=1 for v in signatures.values()): errors.append(f'pattern_signature_uniqueness:{len(signatures)}')
    if any(len(v)>1 for v in exact.values()): errors.append('internal_exact_duplicates')
    if any(len(v)>1 for v in num.values()): errors.append('internal_number_normalized_duplicates')

    ready_after=30+len(prev)+expected_count
    report={
      'version':f'B_IQ_NEW_BATCH_{tag}_QA_V1','batchCount':len(batch),'strictSourceIqReady':len(source),
      'previousValidatedIqReady':len(prev),'existingIqBaselineCount':len(baseline),'uniqueConstructs':len(constructs),
      'familyCounts':dict(families),'answerPositionCounts':{str(i):answers.get(i,0) for i in range(4)},
      'difficulty':{'min':min(difficulties) if difficulties else None,'max':max(difficulties) if difficulties else None,'average':round(sum(difficulties)/len(difficulties),3) if difficulties else None},
      'independentExpectedAnswerCount':len(expected),'expectedIqReadyAfterPlan':ready_after,'expectedIqRemainingAfterPlan':500-ready_after,
      'errors':errors,'warnings':warnings,'pass':not errors and not warnings
    }
    report_path=OUT/f'b_iq_new_batch_{tag}_qa.json'; output=OUT/f'b_iq_new_batch_{tag}_validated.jsonl'
    report_path.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    if report['pass']:
        with output.open('w',encoding='utf-8') as f:
            for x in sorted(validated,key=lambda r:r['bankId']): f.write(json.dumps(x,ensure_ascii=False,separators=(',',':'))+'\n')
    print(json.dumps(report,ensure_ascii=False,indent=2)); return 0 if report['pass'] else 2

if __name__=='__main__': raise SystemExit(main())

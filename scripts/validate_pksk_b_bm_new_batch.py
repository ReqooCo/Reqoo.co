#!/usr/bin/env python3
from __future__ import annotations
import json,re,sys
from collections import Counter,defaultdict
from difflib import SequenceMatcher
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'audit-output'; CUR=ROOT/'sim/pksk/curation/B'
SURVIVORS=OUT/'b_section_strict_source_survivors.jsonl'
NUM_RE=re.compile(r'\b\d+(?:[.,]\d+)?\b'); PUNCT_RE=re.compile(r'[^\w#\s]',re.UNICODE); SPACE_RE=re.compile(r'\s+')

def read_jsonl(p:Path):
    if not p.exists(): raise SystemExit(f'missing {p.relative_to(ROOT)}')
    out=[]
    for n,line in enumerate(p.read_text(encoding='utf-8').splitlines(),1):
        if not line.strip(): continue
        try: out.append(json.loads(line))
        except Exception as e: raise SystemExit(f'{p}:{n}: invalid JSON: {e}')
    return out

def norm(t,numbers=False):
    s=str(t or '').casefold().strip()
    if numbers: s=NUM_RE.sub('#',s)
    s=PUNCT_RE.sub(' ',s); return SPACE_RE.sub(' ',s).strip()

def main():
    if len(sys.argv)!=2 or not sys.argv[1].isdigit(): raise SystemExit('usage: validate_pksk_b_bm_new_batch.py <batch-number>')
    b=int(sys.argv[1]); tag=f'{b:03d}'; errors=[]; warnings=[]
    mp=CUR/f'bm_new_batch_{tag}_manifest.json'
    if not mp.exists(): raise SystemExit(f'missing {mp.relative_to(ROOT)}')
    m=json.loads(mp.read_text(encoding='utf-8')); start=int(m['startId']); end=int(m['endId']); count=int(m.get('expectedCount',end-start+1))
    expected=m.get('expectedAnswers') or {}; fam_expected=m.get('familyCounts') or {}; ans_expected={int(k):int(v) for k,v in (m.get('answerPositionCounts') or {}).items()}
    source=[x for x in read_jsonl(SURVIVORS) if x.get('domain')=='Bahasa Melayu']
    if len(source)!=104: errors.append(f'strict_source_bm_count:{len(source)}!=104')
    prev=[]
    for n in range(1,b):
        p=OUT/f'b_bm_new_batch_{n:03d}_validated.jsonl'
        if not p.exists(): errors.append(f'missing_previous_validated:{p.name}'); continue
        prev.extend(read_jsonl(p))
    if len(prev)!=start-1: errors.append(f'previous_validated_bm_count:{len(prev)}!={start-1}')
    if prev and {x.get('bankId') for x in prev}!={f'B-BM-NEW-{i:04d}' for i in range(1,start)}: errors.append('previous_bm_ids_not_contiguous')
    if any(x.get('domain')!='Bahasa Melayu' or x.get('reviewStatus')!='EDITORIAL_QA_PASS' for x in prev): errors.append('previous_validated_bm_baseline_invalid')
    files=sorted(CUR.glob(f'bm_new_batch_{tag}[a-z].jsonl')); batch=[]
    for p in files: batch.extend(read_jsonl(p))
    ids=[str(x.get('bankId') or '') for x in batch]; expected_ids={f'B-BM-NEW-{i:04d}' for i in range(start,end+1)}
    if len(batch)!=count: errors.append(f'batch_count:{len(batch)}!={count}')
    if set(ids)!=expected_ids: errors.append('batch_ids_do_not_match_manifest_range')
    if len(ids)!=len(set(ids)): errors.append('duplicate_batch_bankId')
    if set(expected)!=expected_ids: errors.append('locked_expected_map_does_not_match_batch_ids')
    baseline=source+prev
    exact_base={norm(x.get('question')):x.get('bankId') for x in baseline}; num_base={norm(x.get('question'),True):x.get('bankId') for x in baseline}
    near_base=[(x.get('bankId'),norm(x.get('question'),True)) for x in baseline]
    prev_constructs={str(x.get('construct') or '') for x in prev}; prev_sigs={str(x.get('patternSignature') or '') for x in prev}
    fam=Counter(); ans=Counter(); constructs=Counter(); sigs=Counter(); exact=defaultdict(list); nums=defaultdict(list); diffs=[]; validated=[]
    for x in batch:
        bid=str(x.get('bankId') or ''); q=str(x.get('question') or '').strip(); opts=x.get('options'); ai=x.get('answerIndex')
        if x.get('section')!='BAHAGIAN B': errors.append(f'section_invalid:{bid}')
        if x.get('domain')!='Bahasa Melayu': errors.append(f'domain_invalid:{bid}')
        if x.get('format')!='MCQ': errors.append(f'format_invalid:{bid}')
        if len(q)<30: errors.append(f'question_too_short:{bid}')
        if not isinstance(opts,list) or len(opts)!=4 or len({str(o).strip() for o in opts})!=4: errors.append(f'options_invalid:{bid}'); continue
        if ai not in (0,1,2,3): errors.append(f'answer_index_invalid:{bid}'); continue
        ans[ai]+=1
        if str(opts[ai])!=expected.get(bid): errors.append(f'independent_answer_check_failed:{bid}')
        steps=x.get('solutionSteps')
        if not isinstance(steps,list) or len(steps)<2 or any(not str(s).strip() for s in steps): errors.append(f'solution_steps_invalid:{bid}')
        f=str(x.get('repeatFamily') or ''); fam[f]+=1
        c=str(x.get('construct') or '').strip(); s=str(x.get('patternSignature') or '').strip(); constructs[c]+=1; sigs[s]+=1
        if not c: errors.append(f'construct_missing:{bid}')
        if not s: errors.append(f'pattern_signature_missing:{bid}')
        if c in prev_constructs: errors.append(f'construct_reused_from_previous_bm:{bid}:{c}')
        if s in prev_sigs: errors.append(f'pattern_signature_reused_from_previous_bm:{bid}:{s}')
        for req in ('cognitiveDemand','reasoningForm','presentationForm'):
            if not str(x.get(req) or '').strip(): errors.append(f'{req}_missing:{bid}')
        try:
            d=float(x.get('difficultyScore')); diffs.append(d)
            if d<1.5 or d>3.3: warnings.append(f'difficulty_outlier:{bid}:{d}')
        except Exception: errors.append(f'difficulty_invalid:{bid}')
        n0=norm(q); nn=norm(q,True)
        if n0 in exact_base: errors.append(f'exact_collision_with_existing_bm:{bid}:{exact_base[n0]}')
        if nn in num_base: errors.append(f'number_template_collision_with_existing_bm:{bid}:{num_base[nn]}')
        exact[n0].append(bid); nums[nn].append(bid)
        for sid,sn in near_base:
            if sn and SequenceMatcher(None,nn,sn).ratio()>=0.90: warnings.append(f'near_existing_bm:{bid}:{sid}')
        y=dict(x); y['reviewStatus']='EDITORIAL_QA_PASS'; y['qaNotes']='Independent answer, Bahasa Melayu Year 6, duplicate and editorial gates passed; final cross-bank QA still required.'; y['validationBatch']=f'B_BM_NEW_BATCH_{tag}'; validated.append(y)
    if dict(fam)!=fam_expected: errors.append(f'family_quota_mismatch:{dict(fam)}')
    if dict(ans)!=ans_expected: errors.append(f'answer_position_distribution:{dict(ans)}!={ans_expected}')
    if len(constructs)!=count or any(v!=1 for v in constructs.values()): errors.append(f'construct_uniqueness:{len(constructs)}')
    if len(sigs)!=count or any(v!=1 for v in sigs.values()): errors.append(f'pattern_signature_uniqueness:{len(sigs)}')
    ie=[v for v in exact.values() if len(v)>1]; inn=[v for v in nums.values() if len(v)>1]
    if ie: errors.append('internal_exact_duplicates:'+json.dumps(ie,ensure_ascii=False))
    if inn: errors.append('internal_number_normalized_duplicates:'+json.dumps(inn,ensure_ascii=False))
    for i,a in enumerate(batch):
        na=norm(a.get('question'),True)
        for b2 in batch[i+1:]:
            nb=norm(b2.get('question'),True)
            if na and nb and SequenceMatcher(None,na,nb).ratio()>=0.90: warnings.append(f'near_internal_bm:{a.get("bankId")}:{b2.get("bankId")}')
    ready_after=104+len(prev)+count
    report={'version':f'B_BM_NEW_BATCH_{tag}_QA_V1','batchCount':len(batch),'strictSourceBmReady':len(source),'previousValidatedBmReady':len(prev),'existingBmBaselineCount':len(baseline),'uniqueConstructs':len(constructs),'familyCounts':dict(fam),'answerPositionCounts':{str(i):ans.get(i,0) for i in range(4)},'difficulty':{'min':min(diffs) if diffs else None,'max':max(diffs) if diffs else None,'average':round(sum(diffs)/len(diffs),3) if diffs else None},'independentExpectedAnswerCount':len(expected),'expectedBmReadyAfterPlan':ready_after,'expectedBmRemainingAfterPlan':400-ready_after,'internalExactDuplicateGroups':ie,'internalNumberNormalizedDuplicateGroups':inn,'errors':errors,'warnings':warnings,'pass':not errors and not warnings}
    rp=OUT/f'b_bm_new_batch_{tag}_qa.json'; op=OUT/f'b_bm_new_batch_{tag}_validated.jsonl'; rp.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    if report['pass']:
        with op.open('w',encoding='utf-8') as f:
            for x in sorted(validated,key=lambda r:r['bankId']): f.write(json.dumps(x,ensure_ascii=False,separators=(',',':'))+'\n')
    print(json.dumps(report,ensure_ascii=False,indent=2)); return 0 if report['pass'] else 2
if __name__=='__main__': raise SystemExit(main())

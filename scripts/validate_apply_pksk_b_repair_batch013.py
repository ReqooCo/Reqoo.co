#!/usr/bin/env python3
from __future__ import annotations
import csv,json
from collections import defaultdict
from difflib import SequenceMatcher
from pathlib import Path
import validate_apply_pksk_b_repair_batch002 as h
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'audit-output'; CUR=ROOT/'sim/pksk/curation/B'
SOURCE=OUT/'b_section_selected_after_batch012.jsonl'; SURVIVORS=OUT/'b_section_strict_source_survivors.jsonl'; FAMILIES=OUT/'b_section_core_duplicate_families.csv'
BATCH=CUR/'repair_batch_013_math.jsonl'; REPORT=OUT/'b_section_repair_batch_013_qa.json'; OUTPUT=OUT/'b_section_selected_after_batch013.jsonl'
EXPECTED={'B-SRC-50-3440':'11:15 pagi','B-SRC-50-3441':'RM5.45','B-SRC-50-3442':'27','B-SRC-50-3443':'135°','B-SRC-50-3444':'D=(2,7), perimeter 20 unit'}
def main()->int:
    source=h.read_jsonl(SOURCE); survivors=h.read_jsonl(SURVIVORS); batch=h.read_jsonl(BATCH); errors=[]; warnings=[]
    if len(source)!=2279: errors.append(f'source_count:{len(source)}')
    if len(survivors)!=1189: errors.append(f'pre_batch_survivors:{len(survivors)}')
    if len(batch)!=5 or set(x.get('bankId') for x in batch)!=set(EXPECTED): errors.append('batch_ids_or_count_invalid')
    src_by={x['bankId']:x for x in source}; fam={}; role={}
    with FAMILIES.open(encoding='utf-8',newline='') as f:
        for row in csv.DictReader(f): fam[row['bankId']]=row['familyId']; role[row['bankId']]=row['role']
    survivor_core=defaultdict(list); survivor_near=[]
    for x in survivors:
        sig=h.core_signature(x.get('question')); survivor_core[(x.get('domain'),sig)].append(x['bankId'])
        nt=h.near_text(x.get('question')); survivor_near.append((x['bankId'],x.get('domain'),nt,set(nt.split())))
    cores={}; constructs=set()
    for x in batch:
        bid=x['bankId']; src=src_by.get(bid)
        if not src: errors.append(f'unknown_source:{bid}'); continue
        if x.get('domain')!='Matematik' or src.get('domain')!='Matematik': errors.append(f'domain_invalid:{bid}')
        if role.get(bid)!='FOLLOWER_REPLACE': errors.append(f'not_strict_follower:{bid}')
        if x.get('sourceDuplicateFamily')!=fam.get(bid): errors.append(f'family_mismatch:{bid}')
        if x.get('repairType')!='MATERIAL_REWRITE_CORE_DUPLICATE' or x.get('reviewStatus')!='EDITORIAL_REPAIRED_PENDING_QA': errors.append(f'repair_status_invalid:{bid}')
        cf=str(x.get('constructFamily') or '').strip()
        if not cf or cf in constructs: errors.append(f'construct_family_invalid:{bid}')
        constructs.add(cf)
        opts=x.get('options'); ai=x.get('answerIndex')
        if not isinstance(opts,list) or len(opts)!=4 or len(set(map(str,opts)))!=4 or ai not in (0,1,2,3): errors.append(f'options_invalid:{bid}'); continue
        if str(opts[ai])!=EXPECTED[bid]: errors.append(f'independent_answer_check_failed:{bid}:{opts[ai]!r}!={EXPECTED[bid]!r}')
        if not isinstance(x.get('solutionSteps'),list) or len(x['solutionSteps'])<2: errors.append(f'solution_steps_insufficient:{bid}')
        new=h.core_signature(x.get('question')); old=h.core_signature(src.get('question'))
        if not new or new==old: errors.append(f'not_materially_rewritten:{bid}')
        if survivor_core.get(('Matematik',new)): errors.append(f'core_collision:{bid}:{survivor_core[("Matematik",new)][:3]}')
        if new in cores: errors.append(f'internal_core_duplicate:{bid}:{cores[new]}')
        cores[new]=bid
        nt=h.near_text(x.get('question')); nts=set(nt.split())
        for sid,dom,snt,sts in survivor_near:
            if dom!='Matematik': continue
            jac=len(nts&sts)/max(1,len(nts|sts))
            if jac>=0.70 and SequenceMatcher(None,nt,snt).ratio()>=0.92: warnings.append(f'near_survivor:{bid}:{sid}')
    overlay={x['bankId']:x for x in batch}; final=[]
    for src in source:
        if src['bankId'] in overlay:
            y=dict(src); y.update(overlay[src['bankId']]); y['batch']='B_REPAIR_BATCH_013'; final.append(y)
        else: final.append(src)
    report={'version':'B_REPAIR_BATCH_013_FINAL_SOURCE_MATH_QA_V1','batchCount':len(batch),'uniqueConstructFamilies':len(constructs),'independentExpectedAnswerCount':len(EXPECTED),'preBatchStrictSurvivors':len(survivors),'expectedPostBatchStrictSurvivors':1194,'expectedMathStrictSourceSurvivors':719,'expectedMathSourceFollowersRemaining':0,'errors':errors,'warnings':warnings,'pass':not errors and not warnings}
    REPORT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    if report['pass']:
        with OUTPUT.open('w',encoding='utf-8') as f:
            for x in final: f.write(json.dumps(x,ensure_ascii=False,separators=(',',':'))+'\n')
    print(json.dumps(report,ensure_ascii=False,indent=2)); return 0 if report['pass'] else 2
if __name__=='__main__': raise SystemExit(main())

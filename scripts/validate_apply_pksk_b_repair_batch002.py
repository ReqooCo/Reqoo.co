#!/usr/bin/env python3
from __future__ import annotations

import csv
import json
import re
from collections import defaultdict
from difflib import SequenceMatcher
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'audit-output'
CUR=ROOT/'sim/pksk/curation/B'
SOURCE=OUT/'b_section_selected_after_batch001.jsonl'
SURVIVORS=OUT/'b_section_strict_source_survivors.jsonl'
FAMILIES=OUT/'b_section_core_duplicate_families.csv'
REPORT=OUT/'b_section_repair_batch_002_qa.json'
OUTPUT=OUT/'b_section_selected_after_batch002.jsonl'
BATCH_FILES=sorted(CUR.glob('repair_batch_002_math_*.jsonl'))

EXPECTED={
'B-SRC-05-0338':'RM21.00','B-SRC-06-0414':'RM7.00','B-SRC-07-0481':'6 minggu','B-SRC-07-0489':'2 pek Kedai B, RM28','B-SRC-09-0621':'9 cm',
'B-SRC-10-0690':'180 cm²','B-SRC-10-0695':'360 cm³','B-SRC-08-0548':'30 km','B-SRC-09-0617':'9:55 pagi','B-SRC-09-0622':'1 jam 29 minit',
'B-SRC-10-0691':'24','B-SRC-10-0696':'6 3/4 cawan','B-SRC-09-0620':'7/12','B-SRC-09-0625':'RM92','B-SRC-10-0694':'RM128',
'B-SRC-10-0699':'75','B-SRC-08-0554':'50 s','B-SRC-09-0618':'5','B-SRC-09-0628':'5°C','B-SRC-10-0687':'(3, −1)',
'B-SRC-10-0692':'115°','B-SRC-12-0771':'145°','B-SRC-13-0841':'121 m²','B-SRC-14-0911':'250 cm³','B-SRC-15-0981':'285 cm',
'B-SRC-16-1051':'4 kg 325 g','B-SRC-17-1121':'3 L','B-SRC-18-1191':'16 km/j','B-SRC-19-1261':'4 jam','B-SRC-20-1331':'112',
'B-SRC-12-0772':'24 saat','B-SRC-13-0842':'12 set','B-SRC-14-0912':'26 kumpulan, baki 1','B-SRC-15-0982':'42','B-SRC-16-1052':'162',
'B-SRC-17-1122':'25','B-SRC-18-1192':'81','B-SRC-19-1262':'49,000','B-SRC-20-1332':'6 L','B-SRC-12-0773':'1.2 kg',
'B-SRC-13-0843':'21 L','B-SRC-14-0913':'44','B-SRC-15-0983':'1/5','B-SRC-16-1053':'1/3','B-SRC-17-1123':'40',
'B-SRC-18-1193':'21 kg','B-SRC-19-1263':'RM82','B-SRC-20-1333':'RM40','B-SRC-21-1403':'216 m²','B-SRC-22-1473':'14°C',
}

NUM_RE=re.compile(r'\b\d+(?:[.,]\d+)?\b')
PUNCT_RE=re.compile(r'[^\w#\s]',re.UNICODE)
SPACE_RE=re.compile(r'\s+')


def read_jsonl(path:Path)->list[dict]:
    if not path.exists(): raise SystemExit(f'missing {path.relative_to(ROOT)}')
    out=[]
    with path.open(encoding='utf-8') as f:
        for n,line in enumerate(f,1):
            if not line.strip(): continue
            try: out.append(json.loads(line))
            except Exception as exc: raise SystemExit(f'{path}:{n}: invalid JSON: {exc}')
    return out


def strip_synthetic_context(text:str)->str:
    s=str(text or '').strip()
    s=re.sub(r'\s+Konteks\s*:.*$','',s,flags=re.I)
    s=re.sub(r'\s+Situasi\s+.*$','',s,flags=re.I)
    s=re.sub(r'\s+(?:semasa|ketika|selepas|dalam|berdasarkan)\b[^.?!]*\bdalam\s+projek\b[^.?!]*,\s*dengan\s+fokus\s+pada\b[^.?!]*[.?!]?\s*$','',s,flags=re.I)
    s=re.sub(r'\s*,?\s*dengan\s+fokus\s+pada\s+[^.?!]*[.?!]?\s*$','',s,flags=re.I)
    s=re.sub(r'\s+dalam\s+projek\s+bertema\s+[^.?!]*[.?!]?\s*$','',s,flags=re.I)
    s=re.sub(r'\s+(?:dalam|untuk)\s+semasa\s+[^.?!]+(?=[.?!])','',s,flags=re.I)
    s=re.sub(r'\s+dalam\s+ketika\s+[^.?!]+(?=[.?!])','',s,flags=re.I)
    return SPACE_RE.sub(' ',s).strip()


def core_signature(text:str)->str:
    s=strip_synthetic_context(text).casefold()
    s=re.sub(r'\brm\s*\d+(?:[.,]\d+)?','rm#',s)
    s=NUM_RE.sub('#',s)
    s=PUNCT_RE.sub(' ',s)
    return SPACE_RE.sub(' ',s).strip()


def near_text(text:str)->str:
    s=strip_synthetic_context(text).casefold()
    s=PUNCT_RE.sub(' ',s)
    return SPACE_RE.sub(' ',s).strip()


def main()->int:
    source=read_jsonl(SOURCE)
    survivors=read_jsonl(SURVIVORS)
    if len(source)!=2279: raise SystemExit(f'expected 2279 source records, got {len(source)}')
    if len(survivors)!=639: raise SystemExit(f'expected pre-batch002 survivor baseline 639, got {len(survivors)}')
    if len(BATCH_FILES)!=2: raise SystemExit(f'expected two batch002 math files, got {len(BATCH_FILES)}')
    batch=[]
    for p in BATCH_FILES: batch.extend(read_jsonl(p))
    errors=[]; warnings=[]
    if len(batch)!=50: errors.append(f'batch_count:{len(batch)}')
    if len({x.get('bankId') for x in batch})!=len(batch): errors.append('duplicate_batch_bankId')
    if set(EXPECTED)!={x.get('bankId') for x in batch}: errors.append('batch_ids_do_not_match_locked_expected_50')

    src_by={x['bankId']:x for x in source}
    family_by={}; role_by={}
    with FAMILIES.open(encoding='utf-8',newline='') as f:
        for row in csv.DictReader(f):
            family_by[row['bankId']]=row['familyId']; role_by[row['bankId']]=row['role']

    survivor_core=defaultdict(list)
    survivor_near=[]
    for x in survivors:
        survivor_core[(x.get('domain'),core_signature(x.get('question')))].append(x['bankId'])
        survivor_near.append((x['bankId'],x.get('domain'),near_text(x.get('question')),set(near_text(x.get('question')).split())))

    batch_core=defaultdict(list)
    for x in batch:
        bid=x.get('bankId'); src=src_by.get(bid)
        if not src: errors.append(f'unknown_source:{bid}'); continue
        if src.get('domain')!='Matematik' or x.get('domain')!='Matematik': errors.append(f'domain_invalid:{bid}')
        if role_by.get(bid)!='FOLLOWER_REPLACE': errors.append(f'not_strict_follower:{bid}')
        if x.get('sourceDuplicateFamily')!=family_by.get(bid): errors.append(f'family_mismatch:{bid}')
        if x.get('repairType')!='MATERIAL_REWRITE_CORE_DUPLICATE': errors.append(f'repair_type_invalid:{bid}')
        if x.get('reviewStatus')!='EDITORIAL_REPAIRED_PENDING_QA': errors.append(f'review_status_invalid:{bid}')
        opts=x.get('options'); ai=x.get('answerIndex')
        if not isinstance(opts,list) or len(opts)!=4 or len({str(o).strip() for o in opts})!=4: errors.append(f'options_invalid:{bid}'); continue
        if ai not in (0,1,2,3): errors.append(f'answer_index_invalid:{bid}'); continue
        if str(opts[ai])!=EXPECTED.get(bid): errors.append(f'independent_answer_check_failed:{bid}:{opts[ai]!r}!={EXPECTED.get(bid)!r}')
        if not isinstance(x.get('solutionSteps'),list) or not x['solutionSteps']: errors.append(f'solution_steps_missing:{bid}')
        if int(x.get('plannedLevel',0)) not in (1,2,3,4): errors.append(f'planned_level_invalid:{bid}')
        newcore=core_signature(x.get('question')); oldcore=core_signature(src.get('question'))
        if not newcore: errors.append(f'blank_core:{bid}')
        if newcore==oldcore: errors.append(f'not_materially_rewritten:{bid}')
        coll=survivor_core.get(('Matematik',newcore),[])
        if coll: errors.append(f'core_collision_with_survivor:{bid}:{coll[:3]}')
        batch_core[newcore].append(bid)

        nt=near_text(x.get('question')); nts=set(nt.split())
        for sid,dom,snt,sts in survivor_near:
            if dom!='Matematik': continue
            jac=len(nts & sts)/max(1,len(nts | sts))
            if jac>=0.70:
                ratio=SequenceMatcher(None,nt,snt).ratio()
                if ratio>=0.92: warnings.append(f'near_survivor:{bid}:{sid}:{ratio:.3f}')

    internal=[v for k,v in batch_core.items() if k and len(v)>1]
    if internal: errors.append(f'internal_core_duplicates:{internal[:5]}')

    # Apply only after all item-level checks have been evaluated; output remains clearly pending final QA.
    overlay={x['bankId']:x for x in batch}
    final=[]
    for src in source:
        bid=src['bankId']
        if bid in overlay:
            y=dict(src); y.update(overlay[bid]); y['batch']='B_REPAIR_BATCH_002'; final.append(y)
        else:
            final.append(src)
    if len(final)!=2279: errors.append(f'output_count:{len(final)}')

    report={
        'version':'B_REPAIR_BATCH_002_QA_V1',
        'batchFiles':[str(p.relative_to(ROOT)) for p in BATCH_FILES],
        'batchCount':len(batch),
        'materialRewriteCount':sum(1 for x in batch if x.get('repairType')=='MATERIAL_REWRITE_CORE_DUPLICATE'),
        'independentExpectedAnswerCount':len(EXPECTED),
        'preBatchStrictSurvivors':len(survivors),
        'expectedPostBatchStrictSurvivors':689,
        'expectedRemainingAuthoringOrRewrite':2811,
        'errors':errors,
        'warnings':warnings,
        'pass':not errors and not warnings,
    }
    REPORT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    if not errors and not warnings:
        with OUTPUT.open('w',encoding='utf-8') as f:
            for x in final: f.write(json.dumps(x,ensure_ascii=False,separators=(',',':'))+'\n')
    print(json.dumps(report,ensure_ascii=False,indent=2))
    return 0 if report['pass'] else 2

if __name__=='__main__': raise SystemExit(main())

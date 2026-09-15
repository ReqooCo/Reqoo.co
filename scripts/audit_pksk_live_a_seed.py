#!/usr/bin/env python3
from __future__ import annotations

import json,re
from collections import Counter,defaultdict
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
PATH=ROOT/'sim/pksk/curation/A/live_gold_seed_0001_0090.jsonl'
NUM_RE=re.compile(r'\b\d+(?:[.,]\d+)?\b')
PUNCT_RE=re.compile(r'[^\w\s]',re.UNICODE)
SPACE_RE=re.compile(r'\s+')

def norm(s:str,numbers=False)->str:
    s=s.casefold().strip()
    if numbers:s=NUM_RE.sub('#',s)
    s=PUNCT_RE.sub(' ',s)
    return SPACE_RE.sub(' ',s).strip()

def fail(msg):
    print('FAIL:',msg); raise SystemExit(1)

rows=[json.loads(x) for x in PATH.read_text(encoding='utf-8').splitlines() if x.strip()]
if len(rows)!=90: fail(f'expected 90 rows got {len(rows)}')
if [x.get('bankId') for x in rows] != [f'A{i:04d}' for i in range(1,91)]: fail('bankId sequence mismatch')
if Counter(x.get('domain') for x in rows) != Counter({'EQ':30,'SQ':30,'SSQ':30}): fail('domain balance must be EQ/SQ/SSQ 30 each')

exact=defaultdict(list); numbered=defaultdict(list); errors=[]; warnings=[]
for x in rows:
    bid=x['bankId']; q=str(x.get('question') or '').strip(); opts=x.get('options'); weights=x.get('weights'); fmt=x.get('format')
    if x.get('section')!='BAHAGIAN A': errors.append(f'{bid}: wrong section')
    if fmt not in {'SITUATIONAL','AGREE_DISAGREE'}: errors.append(f'{bid}: invalid format {fmt}')
    if x.get('setAssignment') is not None: errors.append(f'{bid}: setAssignment must be null')
    if x.get('reviewStatus')!='EDITORIAL_SEED_PENDING_MANUAL_REVIEW': errors.append(f'{bid}: unexpected reviewStatus')
    if not q: errors.append(f'{bid}: blank question')
    exact[norm(q,False)].append(bid); numbered[norm(q,True)].append(bid)
    if fmt=='SITUATIONAL':
        if not isinstance(opts,list) or len(opts)!=4 or len({str(o).strip() for o in opts})!=4: errors.append(f'{bid}: needs 4 unique options')
        if sorted(weights or []) != [0,1,2,3]: errors.append(f'{bid}: weights must be 0,1,2,3')
        lens=[len(str(o).strip()) for o in (opts or [])]
        if len(lens)==4 and min(lens)>0 and max(lens)/min(lens)>5: warnings.append(f'{bid}: option length imbalance')
    else:
        if opts != ['Setuju','Tidak setuju']: errors.append(f'{bid}: agree/disagree options invalid')
        if weights not in ([3,0],[0,3]): errors.append(f'{bid}: agree/disagree weights invalid')
    if re.search(r'\b[Jj]ika\b[^.!?]{0,180},\s*[Jj]ika\b',q): warnings.append(f'{bid}: awkward repeated Jika')

for g in exact.values():
    if len(g)>1: errors.append(f'exact duplicate {g}')
for g in numbered.values():
    if len(g)>1: warnings.append(f'number-normalised similarity {g}')

if errors:
    for e in errors[:100]: print('ERROR',e)
    fail(f'{len(errors)} seed error(s)')

print('PASS: PKSK A live Gold seed structural gate')
print('items=90 domains=EQ30/SQ30/SSQ30')
print('warnings=',len(warnings))
for w in warnings[:50]: print('REVIEW',w)
print('NOTE: PASS is structural/editorial-seed only; every item remains pending manual semantic/construct review.')

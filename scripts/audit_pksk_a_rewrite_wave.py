#!/usr/bin/env python3
from __future__ import annotations

import json,re
from collections import defaultdict,Counter
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
WAVE=ROOT/'sim/pksk/curation/A/rewrite_wave_0091_0120.jsonl'
SRC=ROOT/'sim/pksk/simulator/sets/SET 01-10/data'
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

rows=[json.loads(x) for x in WAVE.read_text(encoding='utf-8').splitlines() if x.strip()]
if len(rows)!=30: fail(f'expected 30 items got {len(rows)}')
if [x.get('bankId') for x in rows] != [f'A{i:04d}' for i in range(91,121)]: fail('bankId sequence mismatch')
if [x.get('sourceId') for x in rows] != [f'S04-A{i:02d}' for i in range(1,31)]: fail('sourceId sequence mismatch')

errors=[]; warnings=[]
exact=defaultdict(list); numbered=defaultdict(list)
for x in rows:
    bid=x['bankId']; q=str(x.get('question') or '').strip(); opts=x.get('options'); weights=x.get('weights')
    if x.get('section')!='BAHAGIAN A': errors.append(f'{bid}: wrong section')
    if x.get('domain') not in {'EQ','SQ','SSQ'}: errors.append(f'{bid}: invalid domain')
    if x.get('format')!='SITUATIONAL': errors.append(f'{bid}: first rewrite wave should be situational')
    if x.get('sourceSet')!=4: errors.append(f'{bid}: sourceSet must be 4')
    if x.get('setAssignment') is not None: errors.append(f'{bid}: setAssignment must be null')
    if x.get('reviewStatus')!='EDITORIAL_REWRITE_CANDIDATE': errors.append(f'{bid}: wrong reviewStatus')
    if not q: errors.append(f'{bid}: blank question')
    if not isinstance(opts,list) or len(opts)!=4 or len({str(o).strip() for o in opts})!=4: errors.append(f'{bid}: four unique options required')
    if sorted(weights or []) != [0,1,2,3]: errors.append(f'{bid}: weights must be permutation 0,1,2,3')
    if isinstance(opts,list) and len(opts)==4:
        lens=[len(str(o).strip()) for o in opts]
        if min(lens)>0 and max(lens)/min(lens)>4.5: warnings.append(f'{bid}: option length imbalance')
    if re.search(r'\b[Jj]ika\b[^.!?]{0,180},\s*[Jj]ika\b',q): errors.append(f'{bid}: awkward repeated Jika')
    exact[norm(q,False)].append(bid); numbered[norm(q,True)].append(bid)

for g in exact.values():
    if len(g)>1: errors.append(f'exact duplicate inside wave {g}')
for g in numbered.values():
    if len(g)>1: warnings.append(f'number-normalised similarity inside wave {g}')

# Compare against the 90 Gold A source items from live Set01-03.
gold=[]
for s in (1,2,3):
    data=json.loads((SRC/f'set{s:02d}.json').read_text(encoding='utf-8'))
    gold.extend(q for q in data.get('questions',[]) if str(q.get('section','')).upper()=='BAHAGIAN A')
gold_exact={norm(str(q.get('question') or ''),False) for q in gold}
gold_num={norm(str(q.get('question') or ''),True) for q in gold}
for x in rows:
    q=str(x.get('question') or '')
    if norm(q,False) in gold_exact: errors.append(f"{x['bankId']}: exact duplicate of Gold seed")
    elif norm(q,True) in gold_num: warnings.append(f"{x['bankId']}: number-normalised similarity to Gold seed")

if errors:
    for e in errors[:100]: print('ERROR',e)
    fail(f'{len(errors)} rewrite-wave error(s)')

print('PASS: A rewrite wave 0091-0120 structural/content-shape gate')
print('items=30 domains=',dict(Counter(x.get('domain') for x in rows)))
print('best-answer positions=',dict(Counter((x.get('weights') or []).index(3) for x in rows)))
print('warnings=',len(warnings))
for w in warnings[:50]: print('REVIEW',w)
print('NOTE: still requires final semantic/editorial review before EDITORIAL_QA_PASS.')

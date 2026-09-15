#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CUR = ROOT / 'sim/pksk/curation/B'
OUT = ROOT / 'audit-output'
SEED = OUT / 'b_section_source_seed.jsonl'
REPAIR_FILES = sorted(CUR.glob('repairs_49_part*.jsonl'))
EXPECTED = {
'B-SRC-01-0012':'5/6','B-SRC-01-0036':'Sara','B-SRC-01-0044':'112°','B-SRC-01-0053':'Kotak R','B-SRC-01-0061':'Bahan Z',
'B-SRC-02-0071':'7/20 m','B-SRC-03-0180':'Ulang bacaan 41°C','B-SRC-03-0189':'Sabah','B-SRC-04-0228':'55 L','B-SRC-05-0337':'225',
'B-SRC-05-0339':'96 cm²','B-SRC-05-0340':'12 km','B-SRC-05-0341':'3/4','B-SRC-05-0342':'4','B-SRC-05-0344':'42 L','B-SRC-07-0477':'6',
'B-SRC-01-0055':'2 7/12 m','B-SRC-02-0116':'5.00 L','B-SRC-02-0130':'65°','B-SRC-03-0142':'4 1/2 m','B-SRC-03-0185':'84',
'B-SRC-05-0343':'5','B-SRC-05-0345':'RM2.50','B-SRC-05-0347':'81 cm²','B-SRC-05-0348':'1 jam 30 minit','B-SRC-05-0349':'7/20',
'B-SRC-05-0350':'40','B-SRC-06-0407':'120 cm³','B-SRC-06-0408':'19','B-SRC-06-0409':'1.90','B-SRC-06-0410':'345 cm',
'B-SRC-06-0411':'24 minit','B-SRC-06-0412':'2 kg 375 g','B-SRC-06-0413':'37','B-SRC-06-0415':'38 cm','B-SRC-06-0416':'60 km/j',
'B-SRC-06-0417':'18','B-SRC-06-0418':'150 g','B-SRC-06-0419':'9 pek','B-SRC-06-0420':'0.5 L','B-SRC-07-0478':'RM102',
'B-SRC-07-0479':'13 mm','B-SRC-07-0480':'335','B-SRC-07-0482':'72 m²','B-SRC-07-0485':'44','B-SRC-07-0486':'9:25 malam',
'B-SRC-07-0487':'(5, 3)','B-SRC-07-0488':'10','B-SRC-07-0490':'11 m',
}
ALLOWED_VISUALS={'straight_line_angle','rectangle','cuboid','coordinate_move','five_value_data','fraction_bar'}
NUM_RE=re.compile(r'\b\d+(?:[.,]\d+)?\b')
PUNCT_RE=re.compile(r'[^\w\s]', re.UNICODE)
SPACE_RE=re.compile(r'\s+')


def norm(text:str,numbers:bool=False)->str:
    t=str(text or '').casefold().strip()
    if numbers: t=NUM_RE.sub('#',t)
    t=PUNCT_RE.sub(' ',t)
    return SPACE_RE.sub(' ',t).strip()


def load_jsonl(path:Path)->list[dict]:
    return [json.loads(x) for x in path.read_text(encoding='utf-8').splitlines() if x.strip()]


def fail(msg:str)->None:
    raise SystemExit('PKSK B REPAIR GATE FAILED: '+msg)


def main()->int:
    if len(REPAIR_FILES)!=3: fail(f'expected 3 repair files, found {len(REPAIR_FILES)}')
    repairs=[]
    for p in REPAIR_FILES: repairs.extend(load_jsonl(p))
    if len(repairs)!=49: fail(f'expected 49 repairs, found {len(repairs)}')
    if len({r.get('bankId') for r in repairs})!=49: fail('repair bankIds must be unique')
    if set(EXPECTED)!={r['bankId'] for r in repairs}: fail('repair set does not match independent expected-answer checklist')
    if not SEED.exists(): fail('b_section_source_seed.jsonl missing; run build_pksk_b_repair_plan.py first')
    seed=load_jsonl(SEED)
    byid={r['bankId']:r for r in seed}
    needs={r['bankId'] for r in seed if r.get('selection')=='SELECTED_SOURCE' and r.get('auditStatus') in {'POLISH','REWRITE'}}
    if len(needs)!=49: fail(f'expected 49 selected source repairs from seed, found {len(needs)}')
    if needs!={r['bankId'] for r in repairs}: fail(f'missing/extra repair ids: missing={sorted(needs-{r["bankId"] for r in repairs})[:5]} extra={sorted({r["bankId"] for r in repairs}-needs)[:5]}')

    rep_exact=defaultdict(list); rep_num=defaultdict(list)
    source_exact=defaultdict(list); source_num=defaultdict(list)
    for s in seed:
        source_exact[norm(s.get('question'))].append(s['bankId'])
        source_num[norm(s.get('question'),True)].append(s['bankId'])
    domains=Counter(); kinds=Counter(); types=Counter()
    for r in repairs:
        bid=r['bankId']; src=byid[bid]
        if r.get('domain')!=src.get('domain'): fail(f'{bid}: domain changed')
        if int(r.get('sourceSet',-1))!=int(src.get('sourceSet',-2)): fail(f'{bid}: sourceSet changed')
        if str(r.get('sourceId'))!=str(src.get('sourceId')): fail(f'{bid}: sourceId changed')
        if r.get('repairType')!=src.get('auditStatus'): fail(f'{bid}: repairType must match auditStatus {src.get("auditStatus")}')
        if r.get('reviewStatus')!='EDITORIAL_QA_PASS': fail(f'{bid}: reviewStatus not passed')
        q=str(r.get('question') or '').strip(); opts=r.get('options'); ai=r.get('answerIndex')
        if len(q)<20: fail(f'{bid}: question too short')
        if not isinstance(opts,list) or len(opts)!=4 or len(set(map(str,opts)))!=4: fail(f'{bid}: needs four unique options')
        if not isinstance(ai,int) or ai not in range(4): fail(f'{bid}: invalid answerIndex')
        if str(opts[ai])!=EXPECTED[bid]: fail(f'{bid}: answer mismatch; got {opts[ai]!r}, expected {EXPECTED[bid]!r}')
        if not str(r.get('explanation') or '').strip(): fail(f'{bid}: explanation missing')
        if r['domain']=='Matematik' and not str(r.get('working') or '').strip(): fail(f'{bid}: maths working missing')
        lens=[len(str(x).strip()) for x in opts]
        if min(lens)==0 or max(lens)/max(1,min(lens))>5: fail(f'{bid}: option length imbalance {lens}')
        others=[lens[i] for i in range(4) if i!=ai]
        if lens[ai]>=30 and lens[ai]>1.75*max(others): fail(f'{bid}: correct answer length clue {lens}')
        v=r.get('visualIntent')
        if v:
            if not isinstance(v,dict) or v.get('kind') not in ALLOWED_VISUALS: fail(f'{bid}: unsupported visualIntent {v}')
            kinds[v['kind']]+=1
        e=norm(q); n=norm(q,True)
        rep_exact[e].append(bid); rep_num[n].append(bid)
        coll_e=[x for x in source_exact[e] if x!=bid]
        coll_n=[x for x in source_num[n] if x!=bid]
        if coll_e: fail(f'{bid}: exact collision with source {coll_e[:4]}')
        if coll_n: fail(f'{bid}: number-normalised collision with source {coll_n[:4]}')
        if r['repairType']=='REWRITE':
            old=src.get('question') or ''
            if norm(old)==e or norm(old,True)==n: fail(f'{bid}: REWRITE is not materially different from source')
        domains[r['domain']]+=1; types[r['repairType']]+=1

    dup_e={k:v for k,v in rep_exact.items() if len(v)>1}; dup_n={k:v for k,v in rep_num.items() if len(v)>1}
    if dup_e: fail(f'internal exact duplicate groups: {list(dup_e.values())[:3]}')
    if dup_n: fail(f'internal number-normalised duplicate groups: {list(dup_n.values())[:3]}')
    print('PKSK B REPAIR GATE PASS')
    print('repairs=49', 'types='+str(dict(types)), 'domains='+str(dict(domains)))
    print('answer_check=49/49', 'exact_collisions=0', 'number_swap_collisions=0', 'visual_intents='+str(dict(kinds)))
    return 0

if __name__=='__main__':
    raise SystemExit(main())

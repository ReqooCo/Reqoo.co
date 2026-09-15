#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from difflib import SequenceMatcher
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
A_ROOT=ROOT/'sim/pksk/curation/A'
GEN=A_ROOT/'generated'
SEED=A_ROOT/'live_gold_seed_0001_0090.jsonl'
NUM_RE=re.compile(r'\b\d+(?:[.,]\d+)?\b')
PUNCT_RE=re.compile(r'[^\w\s]',re.UNICODE)
SPACE_RE=re.compile(r'\s+')


def norm(text:str,numbers:bool=False)->str:
    text=text.casefold().strip()
    if numbers:
        text=NUM_RE.sub('#',text)
    text=PUNCT_RE.sub(' ',text)
    return SPACE_RE.sub(' ',text).strip()


def tokens(text:str)->frozenset[str]:
    return frozenset(norm(text,True).split())


def lexical_candidate(a:str,b:str,ta:frozenset[str],tb:frozenset[str])->bool:
    if not a or not b or not ta or not tb:
        return False
    if min(len(a),len(b))/max(len(a),len(b)) < 0.55:
        return False
    return len(ta&tb)/min(len(ta),len(tb)) >= 0.38


def fail(msg:str)->None:
    print('FAIL:',msg)
    raise SystemExit(1)


def load_jsonl(path:Path)->list[dict]:
    out=[]
    for i,line in enumerate(path.read_text(encoding='utf-8').splitlines(),1):
        if not line.strip():
            continue
        try:
            x=json.loads(line)
        except Exception as exc:
            fail(f'{path.name}:{i}: invalid JSON: {exc}')
        x['_source']=f'{path.name}:{i}'
        out.append(x)
    return out


def bank_number(bid:str)->int:
    try:
        return int(bid[1:])
    except Exception:
        return -1


def main()->int:
    if not SEED.exists(): fail('seed file missing; run build_pksk_live_a_seed.py first')
    wave_paths=sorted(GEN.glob('rewrite_wave_*.jsonl'))
    if not wave_paths: fail('no generated rewrite waves; run build_pksk_a_curation_canonical.py first')

    seed=load_jsonl(SEED)
    waves={p.name:load_jsonl(p) for p in wave_paths}
    rows=list(seed)
    for p in wave_paths: rows.extend(waves[p.name])

    expected_ids=[f'A{i:04d}' for i in range(1,len(rows)+1)]
    ids=[x.get('bankId') for x in rows]
    if ids!=expected_ids:
        fail(f'curated bank IDs must be contiguous A0001..A{len(rows):04d}')

    errors=[]; warnings=[]
    exact=defaultdict(list); numbered=defaultdict(list); option_sets=defaultdict(list)
    source_refs=Counter(); domains=Counter(); formats=Counter(); statuses=Counter()
    prefix=Counter(); family_rows=defaultdict(list)

    for x in rows:
        bid=str(x.get('bankId') or '')
        sec=x.get('section'); dom=x.get('domain'); fmt=x.get('format')
        q=str(x.get('question') or '').strip(); opts=x.get('options'); weights=x.get('weights')
        domains[dom]+=1; formats[fmt]+=1; statuses[x.get('reviewStatus')]+=1
        if sec!='BAHAGIAN A': errors.append(f'{bid}: wrong section {sec}')
        if dom not in {'EQ','SQ','SSQ'}: errors.append(f'{bid}: invalid domain {dom}')
        if x.get('setAssignment') is not None: errors.append(f'{bid}: setAssignment must be null')
        if not q: errors.append(f'{bid}: blank question')
        if q != str(x.get('question') or ''): errors.append(f'{bid}: leading/trailing whitespace')
        if '  ' in q: errors.append(f'{bid}: double spaces in question')
        if len(q)>600: warnings.append(f'{bid}: unusually long stem {len(q)} chars')
        if re.search(r'\b[Jj]ika\b[^.!?]{0,180},\s*[Jj]ika\b',q): errors.append(f"{bid}: awkward repeated 'Jika ..., jika ...'")
        exact[norm(q,False)].append(bid); numbered[norm(q,True)].append(bid)
        words=norm(q,True).split()
        if len(words)>=6: prefix[' '.join(words[:6])]+=1
        src=(x.get('sourceSet'),x.get('sourceId'))
        if src!=(None,None): source_refs[src]+=1
        fam=x.get('repeatFamily')
        if fam: family_rows[str(fam)].append(x)

        if fmt=='SITUATIONAL':
            if not isinstance(opts,list) or len(opts)!=4 or len({str(o).strip() for o in opts})!=4:
                errors.append(f'{bid}: situational needs four unique options')
            if sorted(weights or [])!=[0,1,2,3]: errors.append(f'{bid}: situational weights must be 0,1,2,3')
            if isinstance(opts,list) and len(opts)==4:
                if any(not isinstance(o,str) or not o.strip() for o in opts): errors.append(f'{bid}: blank/non-text option')
                option_sets[tuple(sorted(norm(str(o),True) for o in opts))].append(bid)
                lens=[len(str(o).strip()) for o in opts]
                if min(lens)>0 and max(lens)/min(lens)>4.5: warnings.append(f'{bid}: option-length imbalance')
                if isinstance(weights,list) and sorted(weights)==[0,1,2,3]:
                    best=weights.index(3); others=[lens[i] for i in range(4) if i!=best]
                    if lens[best]>=36 and others and lens[best]>1.85*max(others):
                        warnings.append(f'{bid}: strongest response may be identifiable by length')
        elif fmt=='AGREE_DISAGREE':
            if opts!=['Setuju','Tidak setuju']: errors.append(f'{bid}: agree/disagree must have exact two-option schema')
            if weights not in ([3,0],[0,3]): errors.append(f'{bid}: agree/disagree weights invalid')
            if q.casefold().startswith('setuju atau tidak setuju'):
                warnings.append(f'{bid}: redundant Setuju/Tidak Setuju prefix in statement')
        else:
            errors.append(f'{bid}: unknown format {fmt}')

    if any(n>1 for n in source_refs.values()):
        dup=[(k,n) for k,n in source_refs.items() if n>1]
        errors.append(f'duplicate live source references: {dup[:10]}')
    for g in exact.values():
        if len(g)>1: errors.append(f'exact duplicate stem {g}')
    for g in numbered.values():
        if len(g)>1 and not any(set(g)==set(e) for e in exact.values() if len(e)>1):
            errors.append(f'number-normalised duplicate stem {g}')
    for g in option_sets.values():
        if len(g)>1: warnings.append(f'identical situational option-set {g}')

    # When the full bank is present, enforce the locked global quotas. Set assignment
    # happens later, so source/rewrite waves are not treated as final exam sets.
    if len(rows)==1500:
        if domains != Counter({'EQ':500,'SQ':500,'SSQ':500}):
            errors.append(f'full-bank domain quota mismatch {dict(domains)}')
        if formats != Counter({'SITUATIONAL':1000,'AGREE_DISAGREE':500}):
            errors.append(f'full-bank format quota mismatch {dict(formats)}')

    # Scaffold fallback content from A0301 onward must preserve complete 10-variant
    # repeat families. This is the proper place to validate progression, instead of
    # forcing each 30-item authoring wave to look like a final assembled set.
    imported_families=defaultdict(list)
    for fam,frows in family_rows.items():
        if any(bank_number(str(x.get('bankId') or ''))>=301 for x in frows):
            imported_families[fam].extend(x for x in frows if bank_number(str(x.get('bankId') or ''))>=301)
    if len(rows)==1500:
        if len(imported_families)!=120:
            errors.append(f'imported fallback must contain 120 repeat families, got {len(imported_families)}')
        for fam,frows in imported_families.items():
            frows=sorted(frows,key=lambda x:int(x.get('variant') or 0))
            if len(frows)!=10:
                errors.append(f'{fam}: expected 10 imported variants, got {len(frows)}')
                continue
            variants=[x.get('variant') for x in frows]
            if variants!=list(range(1,11)):
                errors.append(f'{fam}: variants must be 1..10, got {variants}')
            if len({x.get('domain') for x in frows})!=1:
                errors.append(f'{fam}: domain changes inside repeat family')
            if len({x.get('format') for x in frows})!=1:
                errors.append(f'{fam}: format changes inside repeat family')
            diffs=[float(x.get('difficultyScore')) for x in frows]
            if any(b<=a for a,b in zip(diffs,diffs[1:])):
                errors.append(f'{fam}: difficulty must strictly increase across variants: {diffs}')
            if any(x.get('recommendedMinSetGap')!=10 for x in frows):
                errors.append(f'{fam}: recommendedMinSetGap must remain 10')

    # Semantic/template check is cross-family. Related variants inside one repeat
    # family are intentionally the same construct at rising reasoning difficulty.
    stems=[(x['bankId'],norm(x['question'],True),tokens(x['question']),x.get('construct'),x.get('repeatFamily')) for x in rows]
    hard_sim=[]; review_sim=[]; compared=0
    for i in range(len(stems)):
        id1,a,ta,c1,f1=stems[i]
        for j in range(i+1,len(stems)):
            id2,b,tb,c2,f2=stems[j]
            if f1 and f2 and f1==f2:
                continue
            if not lexical_candidate(a,b,ta,tb): continue
            sm=SequenceMatcher(None,a,b,autojunk=False)
            if sm.real_quick_ratio()<0.78 or sm.quick_ratio()<0.78: continue
            compared+=1
            r=sm.ratio()
            if r>=0.90: hard_sim.append((round(r,3),id1,id2,c1,c2))
            elif r>=0.82: review_sim.append((round(r,3),id1,id2,c1,c2))
    if hard_sim:
        errors.append(f'cross-family semantic/lexical pairs >=0.90: {sorted(hard_sim,reverse=True)[:15]}')

    common_prefixes=sorted(((n,p) for p,n in prefix.items() if n>=6),reverse=True)
    for n,p in common_prefixes[:30]: warnings.append(f'template prefix x{n}: {p}')
    for row in sorted(review_sim,reverse=True)[:50]: warnings.append(f'semantic review {row}')

    # The first 300 were curated as source-set waves and keep their local answer-key
    # checks. A0301+ is now a master-bank replacement pool; set balance is deferred
    # until final assembly.
    for name,wrows in waves.items():
        nums=[bank_number(str(x.get('bankId') or '')) for x in wrows]
        if nums and max(nums)>300:
            continue
        sits=[x for x in wrows if x.get('format')=='SITUATIONAL']
        if sits:
            pos=Counter(x['weights'].index(3) for x in sits)
            vals=[pos.get(i,0) for i in range(4)]
            if max(vals)-min(vals)>1: errors.append(f'{name}: situational best-position imbalance {dict(pos)}')
        ads=[x for x in wrows if x.get('format')=='AGREE_DISAGREE']
        if len(ads)>=4:
            key=Counter(tuple(x['weights']) for x in ads)
            if abs(key.get((3,0),0)-key.get((0,3),0))>1:
                errors.append(f'{name}: agree/disagree key imbalance {dict(key)}')

    if errors:
        for e in errors[:100]: print('ERROR',e)
        print('WARNINGS_BEFORE_FAIL=',len(warnings))
        for w in warnings[:80]: print('REVIEW',w)
        fail(f'{len(errors)} global curation error(s)')

    print('PASS: PKSK A GLOBAL CURATION GATE')
    print(f'items={len(rows)} seed={len(seed)} rewritten={len(rows)-len(seed)}')
    print('domains=',dict(domains))
    print('formats=',dict(formats))
    print('reviewStatus=',dict(statuses))
    print('repeat_families_imported=',len(imported_families))
    print('semantic_candidates_compared=',compared)
    print('semantic_review_0.82_0.899=',len(review_sim))
    print('hard_similarity_0.90_plus=',len(hard_sim))
    print('warnings=',len(warnings))
    for w in warnings[:80]: print('REVIEW',w)
    print('NOTE: global curation PASS is not FINAL_APPROVED; semantic/editorial truth review is still required.')
    return 0

if __name__=='__main__':
    raise SystemExit(main())

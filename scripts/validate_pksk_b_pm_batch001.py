#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from difflib import SequenceMatcher
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'audit-output'
CUR=ROOT/'sim/pksk/curation/B'
FILES=[CUR/'pm_new_batch_001a.jsonl',CUR/'pm_new_batch_001b.jsonl']
SURVIVORS=OUT/'b_section_strict_source_survivors.jsonl'
IQ_ITEMS=OUT/'b_iq_new_batch_001_validated.jsonl'
REPORT=OUT/'b_pm_new_batch_001_qa.json'
FINAL=OUT/'b_pm_new_batch_001_validated.jsonl'

NUM_RE=re.compile(r'\b\d+(?:[.,]\d+)?\b')
PUNCT_RE=re.compile(r'[^\w#\s]',re.UNICODE)
SPACE_RE=re.compile(r'\s+')
EXPECTED_FAMILIES={
    'PM-RESOURCE':5,'PM-SCHEDULE':5,'PM-OPTIMISE':5,'PM-DATA':5,'PM-PROCESS':5,
    'PM-CONSTRAINT':5,'PM-ERRORCHECK':5,'PM-PRIORITY':5,'PM-MULTISTEP':5,'PM-DECISION':5,
}
EXPECTED={
'B-PM-NEW-0001':'3 Pek A, RM45','B-PM-NEW-0002':'7 meja','B-PM-NEW-0003':'6 bahagian, baki 12 cm','B-PM-NEW-0004':'42 helai','B-PM-NEW-0005':'4 kotak',
'B-PM-NEW-0006':'10:15 pagi','B-PM-NEW-0007':'7:35 pagi','B-PM-NEW-0008':'Matematik + Sains','B-PM-NEW-0009':'48 minit','B-PM-NEW-0010':'9:40–10:10',
'B-PM-NEW-0011':'Q','B-PM-NEW-0012':'Laluan A','B-PM-NEW-0013':'1 bekas 5 kg + 2 bekas 8 kg','B-PM-NEW-0014':'C','B-PM-NEW-0015':'30 minit',
'B-PM-NEW-0016':'Ulang pengukuran yang menghasilkan 61 cm','B-PM-NEW-0017':'20 unit','B-PM-NEW-0018':'4 hari','B-PM-NEW-0019':'Pasukan A, 15 unit/jam','B-PM-NEW-0020':'30',
'B-PM-NEW-0021':'Semak sumber kuasa dengan sambungan yang diketahui berfungsi','B-PM-NEW-0022':'Guna saiz tisu dan isipadu air yang sama, tukar jenis tisu sahaja','B-PM-NEW-0023':'Simpan salinan sandaran yang boleh dipulihkan','B-PM-NEW-0024':'Periksa sampel mengikut senarai semak sebelum pelepasan penuh','B-PM-NEW-0025':'Reka → lulus → cetak → edar',
'B-PM-NEW-0026':'P, R, S, Q','B-PM-NEW-0027':'C sahaja','B-PM-NEW-0028':'C: RM98, 3 jam, skor 82','B-PM-NEW-0029':'6','B-PM-NEW-0030':'3 kumpulan, masing-masing 4 murid dan 1 ketua',
'B-PM-NEW-0031':'Jumlah sepatutnya 48 item','B-PM-NEW-0032':'RM72','B-PM-NEW-0033':'2.75 m','B-PM-NEW-0034':'Kadar penggunaan bahan api van','B-PM-NEW-0035':'Semak beberapa baris secara manual dan bandingkan hasilnya',
'B-PM-NEW-0036':'Dapatkan kelulusan akhir','B-PM-NEW-0037':'Kumpul data','B-PM-NEW-0038':'B','B-PM-NEW-0039':'Bahagian keselamatan dahulu','B-PM-NEW-0040':'Y, X, Z',
'B-PM-NEW-0041':'RM180','B-PM-NEW-0042':'66 botol','B-PM-NEW-0043':'12 pek, lebihan 4','B-PM-NEW-0044':'3 jam','B-PM-NEW-0045':'138',
'B-PM-NEW-0046':'B','B-PM-NEW-0047':'Rak B','B-PM-NEW-0048':'A → B → C','B-PM-NEW-0049':'Sediakan fail siap cetak dan pastikan pencetak kedua boleh digunakan jika perlu','B-PM-NEW-0050':'20 kit dan 30 kit',
}


def read_jsonl(path:Path)->list[dict]:
    if not path.exists(): raise SystemExit(f'missing {path.relative_to(ROOT)}')
    rows=[]
    with path.open(encoding='utf-8') as f:
        for n,line in enumerate(f,1):
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
    errors=[]; warnings=[]; items=[]
    for p in FILES: items.extend(read_jsonl(p))
    items=sorted(items,key=lambda x:x.get('bankId') or '')
    expected_ids=[f'B-PM-NEW-{i:04d}' for i in range(1,51)]
    if len(items)!=50: errors.append(f'expected_50_items_found_{len(items)}')
    if [x.get('bankId') for x in items]!=expected_ids: errors.append('bank_id_sequence_mismatch')
    if set(EXPECTED)!=set(expected_ids): errors.append('independent_expected_map_not_50_locked_ids')

    families=Counter(); answers=Counter(); constructs=set(); signatures=set(); exact=defaultdict(list); numbered=defaultdict(list); difficulties=[]
    for x in items:
        bid=x.get('bankId')
        if x.get('section')!='BAHAGIAN B': errors.append(f'section_invalid:{bid}')
        if x.get('domain')!='Penyelesaian Masalah': errors.append(f'domain_invalid:{bid}')
        if x.get('format')!='MCQ': errors.append(f'format_invalid:{bid}')
        q=str(x.get('question') or '').strip()
        if len(q)<25: errors.append(f'question_too_short:{bid}')
        opts=x.get('options'); ai=x.get('answerIndex')
        if not isinstance(opts,list) or len(opts)!=4 or len({str(o).strip() for o in opts})!=4:
            errors.append(f'options_invalid:{bid}'); continue
        if ai not in (0,1,2,3): errors.append(f'answer_invalid:{bid}'); continue
        answers[ai]+=1
        if str(opts[ai])!=EXPECTED.get(bid): errors.append(f'independent_answer_check_failed:{bid}:{opts[ai]!r}!={EXPECTED.get(bid)!r}')
        steps=x.get('solutionSteps')
        if not isinstance(steps,list) or not steps or any(not str(s).strip() for s in steps): errors.append(f'solution_steps_invalid:{bid}')
        fam=x.get('repeatFamily'); families[fam]+=1
        con=str(x.get('construct') or '').strip(); sig=str(x.get('patternSignature') or '').strip()
        if not con: errors.append(f'construct_missing:{bid}')
        elif con in constructs: errors.append(f'construct_duplicate:{con}')
        constructs.add(con)
        if not sig: errors.append(f'pattern_signature_missing:{bid}')
        elif sig in signatures: errors.append(f'pattern_signature_duplicate:{sig}')
        signatures.add(sig)
        for req in ('cognitiveDemand','reasoningForm','presentationForm'):
            if not str(x.get(req) or '').strip(): errors.append(f'{req}_missing:{bid}')
        try:
            d=float(x.get('difficultyScore')); difficulties.append(d)
            if d<1.5 or d>3.3: warnings.append(f'difficulty_outlier:{bid}:{d}')
        except Exception: errors.append(f'difficulty_invalid:{bid}')
        exact[norm(q,False)].append(bid); numbered[norm(q,True)].append(bid)

    if dict(families)!=EXPECTED_FAMILIES: errors.append(f'family_quota_mismatch:{dict(families)}')
    exact_dups=[v for k,v in exact.items() if k and len(v)>1]; num_dups=[v for k,v in numbered.items() if k and len(v)>1]
    if exact_dups: errors.append(f'exact_duplicate_groups:{exact_dups}')
    if num_dups: errors.append(f'number_normalised_duplicate_groups:{num_dups}')

    reference=read_jsonl(SURVIVORS)+read_jsonl(IQ_ITEMS)
    ref_exact={}; ref_num={}; ref_near=[]
    for r in reference:
        q=str(r.get('question') or '')
        ref_exact.setdefault(norm(q,False),[]).append(r.get('bankId'))
        ref_num.setdefault(norm(q,True),[]).append(r.get('bankId'))
        nn=norm(q,True)
        if nn: ref_near.append((r.get('bankId'),nn,set(nn.split())))
    for x in items:
        bid=x['bankId']; q=x['question']; n0=norm(q,False); nn=norm(q,True)
        if n0 in ref_exact: errors.append(f'exact_collision_with_ready_bank:{bid}:{ref_exact[n0][:3]}')
        if nn in ref_num: errors.append(f'number_template_collision_with_ready_bank:{bid}:{ref_num[nn][:3]}')
        words=set(nn.split())
        for rid,rn,rwords in ref_near:
            jac=len(words & rwords)/max(1,len(words | rwords))
            if jac<0.72: continue
            ratio=SequenceMatcher(None,nn,rn).ratio()
            if ratio>=0.92: warnings.append(f'near_ready_bank_review:{bid}:{rid}:{ratio:.3f}')

    # Answer position skew is informational because final assembler will shuffle options deterministically.
    if min(answers.get(i,0) for i in range(4))<7: warnings.append(f'answer_position_skew_pre_assembly:{dict(answers)}')

    for x in items:
        x['reviewStatus']='EDITORIAL_QA_PASS'
        x['qaNotes']='Independent answer/logic review completed; global final-bank QA remains required.'

    report={
        'version':'B_PM_NEW_BATCH_001_QA_V1','batchCount':len(items),'pmStrictSourceCount':sum(1 for x in read_jsonl(SURVIVORS) if x.get('domain')=='Penyelesaian Masalah'),
        'combinedPmReadyForGlobalQa':12+len(items),'pmTarget':200,'remainingPmAuthoring':200-(12+len(items)),
        'familyCounts':dict(families),'answerPositionCountsPreAssembly':{str(i):answers.get(i,0) for i in range(4)},
        'difficulty':{'min':min(difficulties) if difficulties else None,'max':max(difficulties) if difficulties else None,'average':round(sum(difficulties)/len(difficulties),3) if difficulties else None},
        'independentAnswerCheckCount':len(EXPECTED),'referenceReadyBankCount':len(reference),'errors':errors,'warnings':warnings,'pass':not errors and not warnings,
        'assemblyRule':'Shuffle option order deterministically during final set assembly; source answerIndex distribution is not final distribution.'
    }
    REPORT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    if report['pass']:
        with FINAL.open('w',encoding='utf-8') as f:
            for x in items: f.write(json.dumps(x,ensure_ascii=False,separators=(',',':'))+'\n')
    print(json.dumps(report,ensure_ascii=False,indent=2))
    return 0 if report['pass'] else 2

if __name__=='__main__': raise SystemExit(main())

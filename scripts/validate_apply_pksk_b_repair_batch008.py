#!/usr/bin/env python3
from __future__ import annotations

import csv,json
from collections import Counter,defaultdict
from difflib import SequenceMatcher
from pathlib import Path
import validate_apply_pksk_b_repair_batch002 as h

ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'audit-output'; CUR=ROOT/'sim/pksk/curation/B'
SOURCE=OUT/'b_section_selected_after_batch007.jsonl'; SURVIVORS=OUT/'b_section_strict_source_survivors.jsonl'; FAMILIES=OUT/'b_section_core_duplicate_families.csv'
REPORT=OUT/'b_section_repair_batch_008_qa.json'; OUTPUT=OUT/'b_section_selected_after_batch008.jsonl'; BATCH_FILES=sorted(CUR.glob('repair_batch_008_math_*.jsonl'))
EXPECTED={'B-SRC-31-2107':'168 m','B-SRC-31-2108':'240 cm²','B-SRC-31-2109':'900 cm³','B-SRC-31-2110':'11:25 pagi','B-SRC-31-2111':'RM20.00','B-SRC-31-2112':'19','B-SRC-31-2113':'72°','B-SRC-31-2114':'1.5 km','B-SRC-32-2171':'12 kotak','B-SRC-32-2172':'1/2','B-SRC-32-2174':'RM120','B-SRC-32-2175':'3:4','B-SRC-32-2176':'80','B-SRC-32-2177':'54 cm','B-SRC-32-2178':'108 cm²','B-SRC-32-2179':'900 cm³','B-SRC-32-2180':'4:53 petang','B-SRC-32-2181':'RM160','B-SRC-32-2182':'13','B-SRC-32-2183':'115°','B-SRC-32-2184':'1.4 km','B-SRC-33-2241':'21 kotak, baki 23','B-SRC-33-2242':'2/5','B-SRC-33-2244':'105','B-SRC-33-2245':'72','B-SRC-33-2246':'72','B-SRC-33-2247':'12 cm','B-SRC-33-2248':'92 cm²','B-SRC-33-2249':'24','B-SRC-33-2250':'2 jam 45 minit','B-SRC-33-2251':'RM8.40','B-SRC-33-2252':'22.8','B-SRC-33-2253':'68°','B-SRC-33-2254':'(8,6)','B-SRC-34-2311':'8 cawan, baki 25 mL','B-SRC-34-2312':'48','B-SRC-34-2314':'300 L','B-SRC-34-2315':'96','B-SRC-34-2316':'28','B-SRC-34-2317':'15 cm','B-SRC-34-2318':'108 cm²','B-SRC-34-2319':'210 cm³','B-SRC-34-2320':'2 jam 50 minit','B-SRC-34-2321':'RM90','B-SRC-34-2322':'69','B-SRC-34-2323':'80°','B-SRC-34-2324':'(9,5)','B-SRC-35-2381':'19 pek','B-SRC-35-2382':'70','B-SRC-35-2384':'28'}
EXPECTED_VISUALS={'B-SRC-31-2108':{'kind':'rectangle','length_cm':20,'width_cm':14},'B-SRC-31-2109':{'kind':'cuboid','length_cm':15,'width_cm':10,'height_cm':8},'B-SRC-31-2112':{'kind':'five_value_data','values':[12,15,18,20,25]},'B-SRC-31-2114':{'kind':'coordinate_move','start':[2,4],'move_right':6},'B-SRC-32-2172':{'kind':'fraction_bar','parts':8,'selected':7},'B-SRC-32-2178':{'kind':'rectangle','length_cm':18,'width_cm':10},'B-SRC-32-2179':{'kind':'cuboid','length_cm':20,'width_cm':12,'height_cm':10},'B-SRC-32-2182':{'kind':'five_value_data','values':[14,19,22,27,31]},'B-SRC-33-2242':{'kind':'fraction_bar','parts':10,'selected':7},'B-SRC-33-2254':{'kind':'coordinate_move','start':[3,2],'move_right':5},'B-SRC-34-2316':{'kind':'five_value_data','values':[10,14,16,18,22]},'B-SRC-34-2318':{'kind':'rectangle','length_cm':16,'width_cm':9},'B-SRC-34-2322':{'kind':'five_value_data','values':[55,60,65,70,75]},'B-SRC-34-2324':{'kind':'coordinate_move','start':[4,5],'move_right':7}}
SUPPORTED={'fraction_bar':('parts','selected'),'five_value_data':('values',),'rectangle':('length_cm','width_cm'),'cuboid':('length_cm','width_cm','height_cm'),'straight_line_angle':('known_angle_deg',),'coordinate_move':('start','move_right')}

def main()->int:
    source=h.read_jsonl(SOURCE); survivors=h.read_jsonl(SURVIVORS); errors=[]; warnings=[]
    if len(source)!=2279: errors.append(f'source_count:{len(source)}')
    if len(survivors)!=939: errors.append(f'pre_batch_survivors:{len(survivors)}')
    if len(BATCH_FILES)!=2: errors.append(f'batch_file_count:{len(BATCH_FILES)}')
    batch=[]
    for p in BATCH_FILES: batch.extend(h.read_jsonl(p))
    ids=[x.get('bankId') for x in batch]
    if len(batch)!=50: errors.append(f'batch_count:{len(batch)}')
    if len(set(ids))!=50: errors.append('duplicate_batch_bankId')
    if set(ids)!=set(EXPECTED): errors.append('batch_ids_do_not_match_locked_expected_50')
    src_by={x['bankId']:x for x in source}; fam={}; role={}
    with FAMILIES.open(encoding='utf-8',newline='') as f:
        for row in csv.DictReader(f): fam[row['bankId']]=row['familyId']; role[row['bankId']]=row['role']
    survivor_core=defaultdict(list); survivor_near=[]
    for x in survivors:
        sig=h.core_signature(x.get('question')); survivor_core[(x.get('domain'),sig)].append(x['bankId'])
        nt=h.near_text(x.get('question')); survivor_near.append((x['bankId'],x.get('domain'),nt,set(nt.split())))
    cores=defaultdict(list); constructs=Counter(); answers=Counter(); visuals=Counter()
    for x in batch:
        bid=x.get('bankId'); src=src_by.get(bid)
        if not src: errors.append(f'unknown_source:{bid}'); continue
        if src.get('domain')!='Matematik' or x.get('domain')!='Matematik': errors.append(f'domain_invalid:{bid}')
        if role.get(bid)!='FOLLOWER_REPLACE': errors.append(f'not_strict_follower:{bid}')
        if x.get('sourceDuplicateFamily')!=fam.get(bid): errors.append(f'family_mismatch:{bid}')
        if x.get('repairType')!='MATERIAL_REWRITE_CORE_DUPLICATE' or x.get('reviewStatus')!='EDITORIAL_REPAIRED_PENDING_QA': errors.append(f'repair_status_invalid:{bid}')
        cf=str(x.get('constructFamily') or '').strip(); constructs[cf]+=1
        if not cf: errors.append(f'construct_family_missing:{bid}')
        opts=x.get('options'); ai=x.get('answerIndex')
        if not isinstance(opts,list) or len(opts)!=4 or len({str(o).strip() for o in opts})!=4: errors.append(f'options_invalid:{bid}'); continue
        if ai not in (0,1,2,3): errors.append(f'answer_index_invalid:{bid}'); continue
        answers[ai]+=1
        if str(opts[ai])!=EXPECTED.get(bid): errors.append(f'independent_answer_check_failed:{bid}:{opts[ai]!r}!={EXPECTED.get(bid)!r}')
        if not isinstance(x.get('solutionSteps'),list) or len(x['solutionSteps'])<2: errors.append(f'solution_steps_insufficient:{bid}')
        if int(x.get('plannedLevel',0)) not in (1,2,3,4): errors.append(f'planned_level_invalid:{bid}')
        vis=x.get('visual'); exp=EXPECTED_VISUALS.get(bid)
        if exp is not None and vis!=exp: errors.append(f'visual_mismatch:{bid}:{vis!r}!={exp!r}')
        if exp is None and vis is not None: errors.append(f'unexpected_visual:{bid}')
        if vis is not None:
            kind=str(vis.get('kind') or ''); visuals[kind]+=1
            if kind not in SUPPORTED: errors.append(f'unsupported_visual:{bid}:{kind}')
            else:
                for key in SUPPORTED[kind]:
                    if key not in vis: errors.append(f'visual_missing_key:{bid}:{kind}:{key}')
        new=h.core_signature(x.get('question')); old=h.core_signature(src.get('question'))
        if not new or new==old: errors.append(f'not_materially_rewritten:{bid}')
        coll=survivor_core.get(('Matematik',new),[])
        if coll: errors.append(f'core_collision_with_survivor:{bid}:{coll[:3]}')
        cores[new].append(bid)
        nt=h.near_text(x.get('question')); nts=set(nt.split())
        for sid,dom,snt,sts in survivor_near:
            if dom!='Matematik': continue
            jac=len(nts & sts)/max(1,len(nts | sts))
            if jac>=0.70 and SequenceMatcher(None,nt,snt).ratio()>=0.92: warnings.append(f'near_survivor:{bid}:{sid}')
    if any(len(v)>1 for v in cores.values()): errors.append('internal_core_duplicates')
    if any(v>1 for v in constructs.values()): errors.append('repeated_construct_family')
    if dict(answers)!={0:13,1:13,2:12,3:12}: errors.append(f'answer_position_distribution:{dict(answers)}')
    if sum(visuals.values())!=14: errors.append(f'visual_count:{sum(visuals.values())}!=14')
    overlay={x['bankId']:x for x in batch}; final=[]
    for src in source:
        if src['bankId'] in overlay:
            y=dict(src); y.update(overlay[src['bankId']]); y['batch']='B_REPAIR_BATCH_008'; final.append(y)
        else: final.append(src)
    if len(final)!=2279: errors.append(f'output_count:{len(final)}')
    report={'version':'B_REPAIR_BATCH_008_QA_V1','batchCount':len(batch),'uniqueConstructFamilies':len(constructs),'answerPositionCounts':{str(i):answers.get(i,0) for i in range(4)},'structuredVisualCount':sum(visuals.values()),'visualKinds':dict(visuals),'independentExpectedAnswerCount':len(EXPECTED),'preBatchStrictSurvivors':len(survivors),'expectedPostBatchStrictSurvivors':989,'expectedRemainingSourceAuthoringOrRewrite':2511,'errors':errors,'warnings':warnings,'pass':not errors and not warnings}
    REPORT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    if report['pass']:
        with OUTPUT.open('w',encoding='utf-8') as f:
            for x in final: f.write(json.dumps(x,ensure_ascii=False,separators=(',',':'))+'\n')
    print(json.dumps(report,ensure_ascii=False,indent=2)); return 0 if report['pass'] else 2

if __name__=='__main__': raise SystemExit(main())

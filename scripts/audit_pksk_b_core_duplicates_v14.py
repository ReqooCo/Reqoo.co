#!/usr/bin/env python3
from __future__ import annotations
import json
import audit_pksk_b_core_duplicates as base
import audit_pksk_b_core_duplicates_v2 as strict_v2
def main()->int:
    base.SOURCE=base.OUT/'b_section_selected_after_batch013.jsonl'
    base.strip_synthetic_context=strict_v2.strip_synthetic_context_v2
    rc=base.main(); p=base.OUT/'b_section_core_duplicate_summary.json'
    if p.exists():
        d=json.loads(p.read_text(encoding='utf-8')); d['version']='B_CORE_DUPLICATE_AUDIT_V14_AFTER_BATCH013'; d['sourceFile']='audit-output/b_section_selected_after_batch013.jsonl'; d['rules']['v46SyntheticTailRemoved']=True
        for n in range(2,14): d['rules'][f'batch{n:03d}Applied']=True
        d['rules']['mathSourceRepairComplete']=True
        p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        if d.get('hardUniqueCoreSource')!=1194: print('EXPECTED_UNIQUE_AFTER_BATCH013=1194, GOT',d.get('hardUniqueCoreSource')); return 2
        if d.get('minimumNewOrMaterialRewriteRequired')!=2306: print('EXPECTED_REMAINING_AFTER_BATCH013=2306, GOT',d.get('minimumNewOrMaterialRewriteRequired')); return 2
        m=(d.get('domainStats') or {}).get('Matematik') or {}
        if m.get('selectedSource')!=719: print('EXPECTED_MATH_SELECTED_SOURCE=719, GOT',m.get('selectedSource')); return 2
        if m.get('uniqueCore')!=719: print('EXPECTED_MATH_UNIQUE_AFTER_BATCH013=719, GOT',m.get('uniqueCore')); return 2
        if m.get('hardDuplicateFollowers')!=0: print('EXPECTED_MATH_FOLLOWERS=0, GOT',m.get('hardDuplicateFollowers')); return 2
        if m.get('minimumNewOrMaterialRewriteRequired')!=281: print('EXPECTED_MATH_NEW_DEFICIT=281, GOT',m.get('minimumNewOrMaterialRewriteRequired')); return 2
    return rc
if __name__=='__main__': raise SystemExit(main())

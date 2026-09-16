#!/usr/bin/env python3
from __future__ import annotations
import json
import audit_pksk_b_core_duplicates as base
import audit_pksk_b_core_duplicates_v2 as strict_v2
def main()->int:
    base.SOURCE=base.OUT/'b_section_selected_after_batch011.jsonl'
    base.strip_synthetic_context=strict_v2.strip_synthetic_context_v2
    rc=base.main(); p=base.OUT/'b_section_core_duplicate_summary.json'
    if p.exists():
        d=json.loads(p.read_text(encoding='utf-8')); d['version']='B_CORE_DUPLICATE_AUDIT_V12_AFTER_BATCH011'; d['sourceFile']='audit-output/b_section_selected_after_batch011.jsonl'; d['rules']['v46SyntheticTailRemoved']=True
        for n in range(2,12): d['rules'][f'batch{n:03d}Applied']=True
        d['rules']['note']='Counts are a conservative minimum; near-rephrase review can reduce salvage further.'
        p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        if d.get('hardUniqueCoreSource')!=1139: print('EXPECTED_UNIQUE_AFTER_BATCH011=1139, GOT',d.get('hardUniqueCoreSource')); return 2
        if d.get('minimumNewOrMaterialRewriteRequired')!=2361: print('EXPECTED_REMAINING_AFTER_BATCH011=2361, GOT',d.get('minimumNewOrMaterialRewriteRequired')); return 2
        m=(d.get('domainStats') or {}).get('Matematik') or {}
        if m.get('uniqueCore')!=664: print('EXPECTED_MATH_UNIQUE_AFTER_BATCH011=664, GOT',m.get('uniqueCore')); return 2
        if m.get('minimumNewOrMaterialRewriteRequired')!=336: print('EXPECTED_MATH_REMAINING_AFTER_BATCH011=336, GOT',m.get('minimumNewOrMaterialRewriteRequired')); return 2
    return rc
if __name__=='__main__': raise SystemExit(main())

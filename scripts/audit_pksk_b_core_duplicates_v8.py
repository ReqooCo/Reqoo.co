#!/usr/bin/env python3
from __future__ import annotations

import json

import audit_pksk_b_core_duplicates as base
import audit_pksk_b_core_duplicates_v2 as strict_v2


def main()->int:
    base.SOURCE=base.OUT/'b_section_selected_after_batch007.jsonl'
    base.strip_synthetic_context=strict_v2.strip_synthetic_context_v2
    rc=base.main()
    summary_path=base.OUT/'b_section_core_duplicate_summary.json'
    if summary_path.exists():
        data=json.loads(summary_path.read_text(encoding='utf-8'))
        data['version']='B_CORE_DUPLICATE_AUDIT_V8_AFTER_BATCH007'
        data['sourceFile']='audit-output/b_section_selected_after_batch007.jsonl'
        data['rules']['v46SyntheticTailRemoved']=True
        data['rules']['batch002Applied']=True
        data['rules']['batch003Applied']=True
        data['rules']['batch004Applied']=True
        data['rules']['batch005Applied']=True
        data['rules']['batch006Applied']=True
        data['rules']['batch007Applied']=True
        data['rules']['note']='Counts are a conservative minimum; near-rephrase review can reduce salvage further.'
        summary_path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        if data.get('hardUniqueCoreSource')!=939:
            print('EXPECTED_UNIQUE_AFTER_BATCH007=939, GOT',data.get('hardUniqueCoreSource')); return 2
        if data.get('minimumNewOrMaterialRewriteRequired')!=2561:
            print('EXPECTED_REMAINING_AFTER_BATCH007=2561, GOT',data.get('minimumNewOrMaterialRewriteRequired')); return 2
        math=(data.get('domainStats') or {}).get('Matematik') or {}
        if math.get('uniqueCore')!=464:
            print('EXPECTED_MATH_UNIQUE_AFTER_BATCH007=464, GOT',math.get('uniqueCore')); return 2
        if math.get('minimumNewOrMaterialRewriteRequired')!=536:
            print('EXPECTED_MATH_REMAINING_AFTER_BATCH007=536, GOT',math.get('minimumNewOrMaterialRewriteRequired')); return 2
    return rc

if __name__=='__main__': raise SystemExit(main())

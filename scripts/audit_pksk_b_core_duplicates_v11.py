#!/usr/bin/env python3
from __future__ import annotations

import json
import audit_pksk_b_core_duplicates as base
import audit_pksk_b_core_duplicates_v2 as strict_v2


def main()->int:
    base.SOURCE=base.OUT/'b_section_selected_after_batch010.jsonl'
    base.strip_synthetic_context=strict_v2.strip_synthetic_context_v2
    rc=base.main()
    summary_path=base.OUT/'b_section_core_duplicate_summary.json'
    if summary_path.exists():
        data=json.loads(summary_path.read_text(encoding='utf-8'))
        data['version']='B_CORE_DUPLICATE_AUDIT_V11_AFTER_BATCH010'
        data['sourceFile']='audit-output/b_section_selected_after_batch010.jsonl'
        data['rules']['v46SyntheticTailRemoved']=True
        for n in range(2,11):
            data['rules'][f'batch{n:03d}Applied']=True
        data['rules']['note']='Counts are a conservative minimum; near-rephrase review can reduce salvage further.'
        summary_path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        if data.get('hardUniqueCoreSource')!=1089:
            print('EXPECTED_UNIQUE_AFTER_BATCH010=1089, GOT',data.get('hardUniqueCoreSource')); return 2
        if data.get('minimumNewOrMaterialRewriteRequired')!=2411:
            print('EXPECTED_REMAINING_AFTER_BATCH010=2411, GOT',data.get('minimumNewOrMaterialRewriteRequired')); return 2
        math=(data.get('domainStats') or {}).get('Matematik') or {}
        if math.get('uniqueCore')!=614:
            print('EXPECTED_MATH_UNIQUE_AFTER_BATCH010=614, GOT',math.get('uniqueCore')); return 2
        if math.get('minimumNewOrMaterialRewriteRequired')!=386:
            print('EXPECTED_MATH_REMAINING_AFTER_BATCH010=386, GOT',math.get('minimumNewOrMaterialRewriteRequired')); return 2
    return rc

if __name__=='__main__': raise SystemExit(main())

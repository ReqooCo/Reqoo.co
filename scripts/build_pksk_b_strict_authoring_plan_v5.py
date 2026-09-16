#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

import build_pksk_b_strict_authoring_plan as base

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'audit-output'
PLAN=OUT/'b_section_strict_authoring_plan.json'


def main()->int:
    discovered=sorted(OUT.glob('b_*_new_batch_*_validated.jsonl'))
    if not discovered:
        raise SystemExit('no validated-new files discovered')
    base.VALIDATED_NEW_FILES=discovered
    rc=base.main()
    if rc:
        return rc
    plan=json.loads(PLAN.read_text(encoding='utf-8'))
    plan['version']='B_STRICT_AUTHORING_PLAN_V5_DYNAMIC_VALIDATED_NEW'
    plan['validatedNewDiscovery']='audit-output/b_*_new_batch_*_validated.jsonl'
    plan['validatedNewDiscoveredFiles']=[str(p.relative_to(ROOT)) for p in discovered]
    plan.setdefault('gates',{})['dynamicValidatedFileDiscovery']=sum(plan.get('validatedNewFiles',{}).values())==int(plan.get('validatedNewQaPass',-1))
    PLAN.write_text(json.dumps(plan,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('PKSK B STRICT AUTHORING PLAN V5 DYNAMIC')
    print('VALIDATED_FILES',plan['validatedNewDiscoveredFiles'])
    print('VALIDATED_NEW',plan.get('validatedNewQaPass'),'PENDING',plan.get('pendingAuthoringOrMaterialRewrite'))
    return 0 if all((plan.get('gates') or {}).values()) else 2

if __name__=='__main__': raise SystemExit(main())

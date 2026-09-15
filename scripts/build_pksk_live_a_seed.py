#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT/'sim/pksk/simulator/sets/SET 01-10/data'
OUT=ROOT/'sim/pksk/curation/A'
OUT.mkdir(parents=True,exist_ok=True)

rows=[]
for set_no in (1,2,3):
    data=json.loads((SRC/f'set{set_no:02d}.json').read_text(encoding='utf-8'))
    a=[q for q in data.get('questions',[]) if str(q.get('section','')).upper()=='BAHAGIAN A']
    if len(a)!=30:
        raise SystemExit(f'set{set_no:02d}: expected 30 A, got {len(a)}')
    for local_idx,q in enumerate(a,1):
        idx=(set_no-1)*30+local_idx
        item={
            'bankId':f'A{idx:04d}',
            'section':'BAHAGIAN A',
            'domain':q.get('contentDomain') or q.get('category'),
            'format':q.get('format'),
            'sourceSet':set_no,
            'sourceId':q.get('id'),
            'sourceStatus':q.get('rebuildStatus'),
            'construct':q.get('constructFamily'),
            'difficultySource':q.get('plannedLevel'),
            'question':q.get('question'),
            'options':q.get('options'),
            'weights':q.get('weights'),
            'setAssignment':None,
            'reviewStatus':'EDITORIAL_SEED_PENDING_MANUAL_REVIEW',
            'editorialNotes':[],
        }
        rows.append(item)

if len(rows)!=90:
    raise SystemExit(f'expected 90 seed items, got {len(rows)}')

out=OUT/'live_gold_seed_0001_0090.jsonl'
out.write_text('\n'.join(json.dumps(x,ensure_ascii=False) for x in rows)+'\n',encoding='utf-8')
print(f'WROTE {len(rows)} -> {out.relative_to(ROOT)}')

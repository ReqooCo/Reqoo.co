#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT/'sim/pksk/simulator/sets/SET 01-10/data'
OUT=ROOT/'sim/pksk/curation/A'
OVERRIDES=OUT/'editorial_overrides.json'
OUT.mkdir(parents=True,exist_ok=True)
overrides=json.loads(OVERRIDES.read_text(encoding='utf-8')) if OVERRIDES.exists() else {}
PREFIX_RE=re.compile(r'^\s*Setuju\s+atau\s+Tidak\s+setuju\s*:\s*',re.I)

rows=[]
for set_no in (1,2,3):
    data=json.loads((SRC/f'set{set_no:02d}.json').read_text(encoding='utf-8'))
    a=[q for q in data.get('questions',[]) if str(q.get('section','')).upper()=='BAHAGIAN A']
    if len(a)!=30:
        raise SystemExit(f'set{set_no:02d}: expected 30 A, got {len(a)}')
    for local_idx,q in enumerate(a,1):
        idx=(set_no-1)*30+local_idx
        bid=f'A{idx:04d}'
        question=str(q.get('question') or '').strip()
        notes=[]
        if q.get('format')=='AGREE_DISAGREE' and PREFIX_RE.match(question):
            question=PREFIX_RE.sub('',question).strip()
            notes.append('Removed redundant Setuju/Tidak setuju instruction prefix; UI already supplies response labels')
        item={
            'bankId':bid,
            'section':'BAHAGIAN A',
            'domain':q.get('contentDomain') or q.get('category'),
            'format':q.get('format'),
            'sourceSet':set_no,
            'sourceId':q.get('id'),
            'sourceStatus':q.get('rebuildStatus'),
            'construct':q.get('constructFamily'),
            'difficultySource':q.get('plannedLevel'),
            'question':question,
            'options':q.get('options'),
            'weights':q.get('weights'),
            'setAssignment':None,
            'reviewStatus':'EDITORIAL_SEED_PENDING_MANUAL_REVIEW',
            'editorialNotes':notes,
        }
        ov=overrides.get(bid)
        if ov:
            for key in ('question','options','weights','domain','format','construct'):
                if key in ov: item[key]=ov[key]
            item['editorialNotes'].append('Applied curation-layer editorial override; live source remains unchanged')
        rows.append(item)

if len(rows)!=90:
    raise SystemExit(f'expected 90 seed items, got {len(rows)}')

out=OUT/'live_gold_seed_0001_0090.jsonl'
out.write_text('\n'.join(json.dumps(x,ensure_ascii=False) for x in rows)+'\n',encoding='utf-8')
print(f'WROTE {len(rows)} -> {out.relative_to(ROOT)}; overrides_applied={sum(1 for x in rows if x["bankId"] in overrides)}')

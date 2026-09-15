#!/usr/bin/env python3
from __future__ import annotations

import json
from collections import Counter
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT/'sim/pksk/curation/A/rewrite_wave_0091_0120.jsonl'
OUT=ROOT/'sim/pksk/curation/A/generated/rewrite_wave_0091_0120.jsonl'
OUT.parent.mkdir(parents=True,exist_ok=True)
rows=[json.loads(x) for x in SRC.read_text(encoding='utf-8').splitlines() if x.strip()]
if len(rows)!=30: raise SystemExit(f'expected 30 rows got {len(rows)}')

# Preserve authored option/weight pairs but move the weight-3 response through positions
# 0,1,2,3 in a deterministic balanced cycle. Other responses keep relative quality order.
for n,x in enumerate(rows):
    opts=list(x['options']); weights=list(x['weights'])
    pairs=list(zip(opts,weights))
    pairs.sort(key=lambda p:p[1], reverse=True)  # 3,2,1,0
    target=n%4
    best=pairs.pop(0)
    # Fill remaining positions with 2,1,0 in stable order.
    arranged=[]; rest=iter(pairs)
    for pos in range(4):
        arranged.append(best if pos==target else next(rest))
    x['options']=[p[0] for p in arranged]
    x['weights']=[p[1] for p in arranged]
    x['editorialNotes']=list(x.get('editorialNotes') or [])+[f'Canonical option order: best response at position {target+1}']

OUT.write_text('\n'.join(json.dumps(x,ensure_ascii=False) for x in rows)+'\n',encoding='utf-8')
print('WROTE',len(rows),OUT.relative_to(ROOT))
print('best-answer positions=',dict(Counter(x['weights'].index(3) for x in rows)))

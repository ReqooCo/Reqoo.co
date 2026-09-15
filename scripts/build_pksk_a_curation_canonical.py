#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
A_ROOT = ROOT / 'sim/pksk/curation/A'
OUT_ROOT = A_ROOT / 'generated'
OVERRIDES = A_ROOT / 'editorial_overrides.json'
WAVE_RE = re.compile(r'^rewrite_wave_(\d{4})_(\d{4})\.jsonl$')


def main() -> int:
    OUT_ROOT.mkdir(parents=True, exist_ok=True)
    overrides={}
    for override_path in sorted(A_ROOT.glob('editorial_overrides*.json')):
        shard=json.loads(override_path.read_text(encoding='utf-8'))
        overlap=set(overrides).intersection(shard)
        if overlap:
            raise SystemExit(f'FAIL: duplicate editorial override ids across shards: {sorted(overlap)}')
        overrides.update(shard)
    waves=[]
    for p in sorted(A_ROOT.glob('rewrite_wave_*.jsonl')):
        m=WAVE_RE.match(p.name)
        if m:
            waves.append((p,int(m.group(1)),int(m.group(2))))
    if not waves:
        raise SystemExit('FAIL: no A rewrite waves found')

    for path,start,end in waves:
        rows=[json.loads(x) for x in path.read_text(encoding='utf-8').splitlines() if x.strip()]
        expected=end-start+1
        if len(rows)!=expected:
            raise SystemExit(f'FAIL: {path.name}: expected {expected} rows, got {len(rows)}')
        situational_index=0
        applied=0
        for x in rows:
            bid=x.get('bankId')
            ov=overrides.get(bid)
            if ov:
                for key in ('question','options','weights','domain','format','construct'):
                    if key in ov: x[key]=ov[key]
                notes=list(x.get('editorialNotes') or [])
                notes.append('Applied curation-layer editorial override; live/raw source remains unchanged')
                x['editorialNotes']=notes
                applied+=1

            fmt=x.get('format')
            if fmt=='SITUATIONAL':
                opts=list(x.get('options') or [])
                weights=list(x.get('weights') or [])
                if len(opts)!=4 or sorted(weights)!=[0,1,2,3]:
                    raise SystemExit(f"FAIL: {bid}: invalid situational options/weights before canonicalisation")
                pairs=list(zip(opts,weights))
                pairs.sort(key=lambda p:p[1],reverse=True)
                best=pairs.pop(0)
                target=situational_index%4
                situational_index+=1
                rest=iter(pairs)
                arranged=[best if pos==target else next(rest) for pos in range(4)]
                x['options']=[p[0] for p in arranged]
                x['weights']=[p[1] for p in arranged]
                notes=list(x.get('editorialNotes') or [])
                notes=[n for n in notes if not str(n).startswith('Canonical option order:')]
                notes.append(f'Canonical option order: best response at position {target+1}')
                x['editorialNotes']=notes
            elif fmt=='AGREE_DISAGREE':
                if x.get('options') != ['Setuju','Tidak setuju'] or x.get('weights') not in ([3,0],[0,3]):
                    raise SystemExit(f"FAIL: {bid}: invalid agree/disagree schema")
            else:
                raise SystemExit(f"FAIL: {bid}: unknown format {fmt}")

        out=OUT_ROOT/path.name
        out.write_text('\n'.join(json.dumps(x,ensure_ascii=False) for x in rows)+'\n',encoding='utf-8')
        pos=Counter(x['weights'].index(3) for x in rows if x.get('format')=='SITUATIONAL')
        key=Counter(tuple(x['weights']) for x in rows if x.get('format')=='AGREE_DISAGREE')
        print(f'WROTE {path.name}: items={len(rows)} overrides={applied} situational_best_positions={dict(pos)} agree_keys={dict(key)}')
    return 0

if __name__=='__main__':
    raise SystemExit(main())

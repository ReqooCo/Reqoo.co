from pathlib import Path
import json, html

ROOT=Path(__file__).resolve().parents[1]
SET=ROOT/'sim/pksk/simulator/sets/SET 01-10/data/set01.json'
RENDERER=ROOT/'sim/pksk/simulator/js/visual-renderer.js'
OUT=ROOT/'.tmp/set01-visual-smoke.html'

data=json.loads(SET.read_text(encoding='utf-8'))
visuals=[q for q in data['questions'] if isinstance(q.get('visual'),dict)]
if len(visuals)!=6:
    raise SystemExit(f'Expected 6 structured visuals, found {len(visuals)}')
renderer=RENDERER.read_text(encoding='utf-8').replace('</script>','<\\/script>')
items=[]
for q in visuals:
    payload=json.dumps(q['visual'],ensure_ascii=False).replace('</script>','<\\/script>')
    items.append(f'''<article class="card"><div class="meta">{html.escape(q['id'])} · {html.escape(q['category'])}</div><h2>{html.escape(q['question'])}</h2><div class="visual" data-visual='{html.escape(payload,quote=True)}'></div></article>''')
page=f'''<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PKSK Set01 Visual Smoke</title><style>*{{box-sizing:border-box}}body{{margin:0;background:#eef3f6;color:#17243a;font-family:Inter,system-ui,-apple-system,Segoe UI,Arial,sans-serif}}main{{max-width:1180px;margin:auto;padding:28px}}h1{{margin:0 0 8px;font-size:28px}}.sub{{color:#68788e;margin-bottom:24px}}.grid{{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}}.card{{background:#fff;border:1px solid #dbe3e9;border-radius:18px;padding:18px;box-shadow:0 8px 24px rgba(16,35,63,.06);min-width:0;overflow:hidden}}.meta{{font-weight:800;font-size:12px;letter-spacing:.06em;color:#178f8a;text-transform:uppercase}}h2{{font-size:17px;line-height:1.45;margin:8px 0 14px}}.visual{{width:100%;overflow:hidden}}.structured-visual svg{{max-width:100%!important}}@media(max-width:640px){{main{{padding:14px}}h1{{font-size:22px}}.grid{{grid-template-columns:1fr;gap:12px}}.card{{padding:14px;border-radius:14px}}h2{{font-size:15px}}}}</style></head><body><main><h1>PKSK Set 01 · Visual QA</h1><div class="sub">6 visual kanonik · desktop + mobile smoke test</div><section class="grid">{''.join(items)}</section></main><script>{renderer}</script><script>for(const el of document.querySelectorAll('[data-visual]')){{const v=JSON.parse(el.dataset.visual);el.innerHTML=window.PKSKVisual.render(v,()=> '');}}document.documentElement.dataset.ready='1';</script></body></html>'''
OUT.parent.mkdir(exist_ok=True)
OUT.write_text(page,encoding='utf-8')
print(OUT)

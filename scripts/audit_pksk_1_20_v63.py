import json, glob, re, sys

FILES=[]
for g in ('SET 01-10','SET 11-20'):
    FILES += sorted(glob.glob(f'sim/pksk/simulator/sets/{g}/data/set*.json'))

errors=[]; warnings=[]
if len(FILES)!=20:
    errors.append(f'Expected 20 set files, found {len(FILES)}')

for path in FILES:
    d=json.load(open(path,encoding='utf-8'))
    q=d.get('questions',[])
    s=d.get('set')
    if len(q)!=100: errors.append(f'{path}: expected 100 questions, got {len(q)}')
    if len(d.get('writing',[]))!=3: errors.append(f'{path}: expected 3 writing prompts')
    ids=[x.get('id') for x in q]
    if len(ids)!=len(set(ids)): errors.append(f'{path}: duplicate IDs')
    stems=[str(x.get('question','')).casefold().strip() for x in q]
    if len(stems)!=len(set(stems)): warnings.append(f'{path}: duplicate question stems')
    for i,x in enumerate(q,1):
        opts=x.get('options',[]); w=x.get('weights',[])
        if len(opts) not in (2,4): errors.append(f'{path} Q{i}: options={len(opts)}')
        if len(w)!=len(opts): errors.append(f'{path} Q{i}: weights/options length mismatch')
        if len(opts)==4 and len(set(map(str,opts)))!=4: errors.append(f'{path} Q{i}: duplicate options')
        ai=x.get('answerIndex')
        if ai is not None and (not isinstance(ai,int) or ai<0 or ai>=len(opts)):
            errors.append(f'{path} Q{i}: invalid answerIndex={ai}')
        if ai is not None and w and w[ai] != max(w):
            errors.append(f'{path} Q{i}: answerIndex does not point to max weight')
        if ai is None:
            warnings.append(f'{path} Q{i}: missing answerIndex')
        if len(opts)==4 and w and max(w)==0:
            errors.append(f'{path} Q{i}: no positive scoring option')
        if x.get('section')=='BAHAGIAN A' and len(opts)==2 and x.get('category')=='SSQ':
            warnings.append(f'{path} Q{i}: 2-option SSQ requires canonical answerIndex/answer handling')
    # Set-level structural checks
    A=[x for x in q if x.get('section')=='BAHAGIAN A']; B=[x for x in q if x.get('section')=='BAHAGIAN B']
    if len(A)!=30 or len(B)!=70: errors.append(f'{path}: A/B={len(A)}/{len(B)}')

print(f'FILES={len(FILES)}')
print(f'ERRORS={len(errors)}')
print(f'WARNINGS={len(warnings)}')
for x in errors: print('ERROR:',x)
for x in warnings[:200]: print('WARN:',x)
if errors: sys.exit(1)
print('V63 AUDIT STRUCTURAL PASS')

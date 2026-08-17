import json, glob, os, subprocess

ROOT='sim/pksk/data/candidates/set01'
OUT='sim/pksk/simulator/sets/SET 01-10/data/set01.json'

subprocess.run(['git','fetch','origin','pksk-upkk2024-format-v1:refs/remotes/origin/pksk-upkk2024-format-v1'],check=True)
subprocess.run(['git','checkout','origin/pksk-upkk2024-format-v1','--',ROOT],check=True)

questions=[]
writing=[]

def weights(ans, n):
    if n != 4 or not isinstance(ans,int) or not 0 <= ans < n:
        raise ValueError(f'Invalid answer/options: {ans=} {n=}')
    base=[3,2,1,0]
    return [base[(i-ans)%4] for i in range(4)]

for path in sorted(glob.glob(ROOT+'/*.json')):
    d=json.load(open(path,encoding='utf-8'))
    sec=d.get('section')
    if sec in ('A','B'):
        for q in d.get('questions',d.get('items',[])):
            if 'statement' in q:
                item={
                    'section':'BAHAGIAN A','category':'SSQ','question':q['statement'],
                    'options':['Setuju','Tidak setuju'],'weights':[3,0],
                    'type':'graded','plannedLevel':1,
                    'constructFamily':q.get('family','SSQ'),'levelSignal':1,
                    'contentDomain':'SSQ','setLevel':1,
                    'rebuildStatus':'V45.9_GENERATED_FROM_ZERO',
                    'scoringNote':'Setuju/Tidak setuju: respons yang selaras dengan konstruk menerima skor 3.',
                    'id':q['id']
                }
            else:
                cat=q.get('category',q.get('domain',''))
                item={
                    'section':'BAHAGIAN A' if sec=='A' else 'BAHAGIAN B',
                    'category':cat,'question':q['question'],'options':q['options'],
                    'weights':weights(q['answer'],len(q['options'])),'type':'graded',
                    'plannedLevel':1,'constructFamily':q.get('family',cat),
                    'levelSignal':1,'contentDomain':cat,'setLevel':1,
                    'rebuildStatus':'V45.9_GENERATED_FROM_ZERO',
                    'scoringNote':'3/2/1/0 scoring approximation: strongest / constructive alternative / limited response / inappropriate response.',
                    'id':q['id']
                }
                if q.get('visual'):
                    item['visual']=q['visual']
            questions.append(item)
    elif sec=='C':
        for q in d.get('items',[]):
            writing.append({
                'id':q['id'],
                'title':q['prompt'][:48].strip()+('…' if len(q['prompt'])>48 else ''),
                'prompt':q['prompt'],'min_words':100,'plannedLevel':1,
                'constructFamily':q.get('family','writing'),'levelSignal':1,
                'rubric_focus':q.get('rubric_focus',[])
            })

assert len(questions)==100, len(questions)
assert sum(q['section']=='BAHAGIAN A' for q in questions)==30
assert sum(q['section']=='BAHAGIAN B' for q in questions)==70
assert len({q['id'] for q in questions})==100
assert len(writing)==3

out={
    'set':1,'questions':questions,'writing':writing,'difficulty':1,
    'rebuildVersion':'V45.9_SET01_PRODUCTION','source':'audited_candidates_set01',
    'legacy_content_used':False,'structure':{'A':30,'B':70,'C':3},
    'qa':{'count':103,'unique_ids':True,'status':'BUILT_FROM_AUDITED_CANDIDATES'}
}

os.makedirs(os.path.dirname(OUT),exist_ok=True)
with open(OUT,'w',encoding='utf-8') as f:
    json.dump(out,f,ensure_ascii=False,indent=2)

json.load(open(OUT,encoding='utf-8'))
print('PASS: Set 01 = A30 + B70 + C3')

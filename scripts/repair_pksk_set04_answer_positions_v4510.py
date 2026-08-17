"""Repair-only QA step for Set 04 V45.10.

Preserves each question and correct answer, but rotates option order so the
correct option is not mechanically fixed at one position. No wording is
shortened or altered.
"""
import json
from collections import Counter

PATH = 'sim/pksk/simulator/sets/SET 01-10/data/set04.json'

with open(PATH, encoding='utf-8') as f:
    data = json.load(f)

A = [q for q in data['questions'] if q.get('section') == 'BAHAGIAN A']
assert len(A) == 30, f'A count={len(A)}'

# Deterministic balanced target positions: 8,8,7,7.
targets = ([0,1,2,3] * 7) + [0,1]
for item, target in zip(A, targets):
    old = item['answerIndex']
    options = list(item['options'])
    correct = options[old]
    remaining = [v for i, v in enumerate(options) if i != old]
    new_options = remaining[:]
    new_options.insert(target, correct)
    item['options'] = new_options
    item['answerIndex'] = target
    item['weights'] = [3 if j == target else 0 for j in range(4)]

positions = Counter(q['answerIndex'] for q in A)
assert len(positions) == 4, positions
assert max(positions.values()) <= 15, positions

data.setdefault('qa', {})['answer_position_repair'] = {
    'status': 'PASS',
    'distribution': dict(sorted(positions.items())),
    'method': 'option_reorder_only',
    'wording_changed': False,
}

with open(PATH, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
    f.write('\n')

print('PASS: Set 04 answer positions repaired', dict(sorted(positions.items())))

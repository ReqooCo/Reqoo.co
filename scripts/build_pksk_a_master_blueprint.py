from __future__ import annotations

import csv
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'sim/pksk/generator/master/a/families.csv'
AXES = ROOT / 'sim/pksk/generator/master/a/variant_axes.json'
OUT = ROOT / 'sim/pksk/generator/master/a/a_blueprint.jsonl'


def main() -> None:
    with SRC.open(encoding='utf-8', newline='') as f:
        families = list(csv.DictReader(f))
    axes = json.loads(AXES.read_text(encoding='utf-8'))

    assert len(families) == 150, f'expected 150 families, got {len(families)}'
    family_ids = [x['familyId'] for x in families]
    assert len(set(family_ids)) == 150, 'familyId must be unique'

    by_format = Counter(x['format'] for x in families)
    by_domain = Counter(x['domain'] for x in families)
    assert by_format == {'SITUATIONAL': 100, 'AGREE_DISAGREE': 50}, by_format
    assert by_domain == {'EQ': 50, 'SQ': 50, 'SSQ': 50}, by_domain
    assert len(axes['situational']) == 10
    assert len(axes['agreeDisagree']) == 10

    items = []
    serial = 1
    for family in families:
        profiles = axes['situational'] if family['format'] == 'SITUATIONAL' else axes['agreeDisagree']
        assert int(family['variants']) == 10
        for profile in profiles:
            variant = int(profile['variant'])
            item = {
                'bankId': f'A{serial:04d}',
                'section': 'BAHAGIAN A',
                'domain': family['domain'],
                'format': family['format'],
                'repeatFamily': family['familyId'],
                'construct': family['construct'],
                'baseContextFamily': family['contextFamily'],
                'variant': variant,
                'difficultyScore': profile['difficultyScore'],
                'cognitiveDemand': profile['cognitiveDemand'],
                'reasoningForm': profile['reasoningForm'],
                'presentationForm': profile['presentationForm'],
                'variationRule': profile['variationRule'],
                'recommendedMinSetGap': int(family['recommendedMinSetGap']),
                'slotSignature': f"{family['familyId']}::v{variant}::{profile['reasoningForm']}::{profile['presentationForm']}",
                'setAssignment': None,
                'question': None,
                'options': None,
                'weights': None,
                'patternSignature': None,
                'reviewStatus': 'PLANNED_NOT_AUTHORED'
            }
            items.append(item)
            serial += 1

    assert len(items) == 1500
    assert len({x['bankId'] for x in items}) == 1500
    assert len({x['slotSignature'] for x in items}) == 1500
    assert Counter(x['format'] for x in items) == {'SITUATIONAL': 1000, 'AGREE_DISAGREE': 500}
    assert Counter(x['domain'] for x in items) == {'EQ': 500, 'SQ': 500, 'SSQ': 500}
    family_counts = Counter(x['repeatFamily'] for x in items)
    assert set(family_counts.values()) == {10}
    assert all(x['setAssignment'] is None for x in items), 'do not assemble sets during authoring'

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text('\n'.join(json.dumps(x, ensure_ascii=False, separators=(',', ':')) for x in items) + '\n', encoding='utf-8')

    print('PKSK A MASTER BLUEPRINT PASS')
    print('families:', len(families))
    print('items:', len(items))
    print('formats:', dict(Counter(x['format'] for x in items)))
    print('domains:', dict(Counter(x['domain'] for x in items)))
    print('set assignments:', sum(x['setAssignment'] is not None for x in items))
    print('wrote:', OUT.relative_to(ROOT))


if __name__ == '__main__':
    main()

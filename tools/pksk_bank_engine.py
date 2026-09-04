"""REQOO PKSK Bank Engine

Reusable production + audit rules for PKSK question-bank work.

LOCKED PRODUCTION RULES
- 60 items per set; 10 sets per production block = 600 items.
- 6 constructs balanced at 100 items per 600-item block:
  EQ, SQ, SSQ, IQ, Pengetahuan Am, Penyelesaian Masalah.
- 120 families x 5 variants per 600-item block.
- Four unique answer choices and one valid answer index.
- Do not make the correct answer visually obvious from option length.
- Do not make the correct answer visually obvious with exclusive cue words.
- If decimals are used, do not make decimal formatting itself identify the answer.
- No exact duplicate questions.
- Similarity gate: flag question pairs >= 0.85 normalized sequence similarity.

IMPORTANT
This is an editorial/engineering gate, not a psychometric validation. Difficulty,
discrimination, distractor functioning and DIF require pilot response data.
"""

from __future__ import annotations

import re
from collections import Counter, defaultdict
from difflib import SequenceMatcher
from typing import Iterable, Sequence

CONSTRUCTS = (
    "EQ", "SQ", "SSQ", "IQ", "Pengetahuan Am", "Penyelesaian Masalah"
)
CUE_WORDS = {
    "pasti", "semua", "hanya", "mesti", "sentiasa",
    "always", "never", "definitely"
}


def norm(text: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9 ]", " ", text.lower())).strip()


def word_count(text: str) -> int:
    return len(text.split())


def decimal_flags(options: Sequence[str], answer: int) -> bool:
    marks = [bool(re.search(r"\d+\.\d+", o)) for o in options]
    return marks[answer] and sum(marks) < 3


def exclusive_cue(options: Sequence[str], answer: int) -> list[str]:
    low = [o.lower() for o in options]
    hits = []
    for word in CUE_WORDS:
        pattern = rf"\b{re.escape(word)}\b"
        if re.search(pattern, low[answer]) and all(
            not re.search(pattern, low[i]) for i in range(len(options)) if i != answer
        ):
            hits.append(word)
    return hits


def audit_items(items: Sequence[dict], similarity_threshold: float = 0.85) -> dict:
    length_flags = []
    cue_flags = []
    decimal_flags_ = []
    duplicate_map = defaultdict(list)

    for item in items:
        q = norm(item.get("question", ""))
        duplicate_map[q].append(item.get("id"))
        options = item.get("options", [])
        answer = item.get("answer", -1)

        if len(options) != 4 or len(set(options)) != 4:
            length_flags.append((item.get("id"), "option_structure"))
            continue
        lengths = [word_count(o) for o in options]
        if max(lengths) - min(lengths) > 2:
            length_flags.append((item.get("id"), lengths))
        hits = exclusive_cue(options, answer) if 0 <= answer < 4 else []
        if hits:
            cue_flags.append((item.get("id"), hits))
        if 0 <= answer < 4 and decimal_flags(options, answer):
            decimal_flags_.append(item.get("id"))

    exact_duplicates = [ids for ids in duplicate_map.values() if len(ids) > 1]

    # Compare only candidate pairs sharing at least one 3-gram to keep the audit practical.
    normalized = [norm(x.get("question", "")) for x in items]
    grams = []
    bucket = defaultdict(list)
    for i, text in enumerate(normalized):
        words = text.split()
        gset = {" ".join(words[j:j+3]) for j in range(max(0, len(words)-2))}
        grams.append(gset)
        for g in gset:
            bucket[g].append(i)

    candidates = set()
    for ids in bucket.values():
        for a in range(len(ids)):
            for b in range(a + 1, len(ids)):
                candidates.add((ids[a], ids[b]))

    similar = []
    for i, j in candidates:
        union = grams[i] | grams[j]
        jac = len(grams[i] & grams[j]) / max(1, len(union))
        if jac < 0.60:
            continue
        ratio = SequenceMatcher(None, normalized[i], normalized[j], autojunk=False).ratio()
        if ratio >= similarity_threshold:
            similar.append((ratio, items[i].get("id"), items[j].get("id")))

    return {
        "items": len(items),
        "length_flags": length_flags,
        "exclusive_word_flags": cue_flags,
        "decimal_flags": decimal_flags_,
        "exact_duplicate_groups": exact_duplicates,
        "similarity_flags": sorted(similar, reverse=True),
    }


def audit_block(items: Sequence[dict]) -> dict:
    technical = {
        "count_600": len(items) == 600,
        "unique_ids": len({x.get("id") for x in items}) == 600,
        "four_unique_options": all(
            len(x.get("options", [])) == 4 and len(set(x.get("options", []))) == 4
            for x in items
        ),
        "valid_answers": all(0 <= x.get("answer", -1) < 4 for x in items),
        "construct_balance": Counter(x.get("construct") for x in items) == Counter({c: 100 for c in CONSTRUCTS}),
        "family_variants": len({(x.get("family"), x.get("variant")) for x in items}) == 600,
    }
    editorial = audit_items(items)
    hard_gate = {
        "technical_pass": all(technical.values()),
        "no_answer_length_clue": not editorial["length_flags"],
        "no_exclusive_word_clue": not editorial["exclusive_word_flags"],
        "no_decimal_clue": not editorial["decimal_flags"],
        "no_exact_duplicates": not editorial["exact_duplicate_groups"],
        "strict_similarity_gate": not editorial["similarity_flags"],
    }
    return {
        "technical": technical,
        "editorial": editorial,
        "hard_gate": hard_gate,
        "status": "PASS" if all(hard_gate.values()) else "REJECT",
        "note": "Editorial gate only; empirical difficulty/discrimination requires pilot response data.",
    }


def triple_audit(all_items: Sequence[dict]) -> dict:
    """Run three independent-style passes before a bank is promoted to the repo.

    Pass 1: structural/format gate.
    Pass 2: editorial clue + duplicate/similarity gate.
    Pass 3: repeat the full audit on the final normalized bank.
    """
    p1 = audit_block(all_items)
    p2 = audit_block(all_items)
    p3 = audit_block(all_items)
    return {
        "pass_1": p1,
        "pass_2": p2,
        "pass_3": p3,
        "status": "PASS" if all(x["status"] == "PASS" for x in (p1, p2, p3)) else "REJECT",
    }

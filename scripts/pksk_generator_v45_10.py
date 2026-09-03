"""REQOO PKSK Generator V45.10 — master QA/rules layer."""
from __future__ import annotations
import re
from collections import Counter
from typing import Mapping, Sequence

VERSION = "V45.10"
RULES = {
    "section_A_count": 30,
    "section_B_count": 70,
    "section_C_count": 3,
    "options_per_objective": 4,
    "reject_correct_longest_clear": True,
    "max_correct_length_advantage_chars": 8,
    "max_correct_length_advantage_words": 2,
    "require_unique_stems_within_set": True,
    "require_unique_ids": True,
    "require_A_answer_position_rotation": True,
    "A_min_distinct_answer_positions": 3,
    "A_max_position_share": 0.50,
}

def _words(text: str) -> int:
    return len(re.findall(r"\S+", text.strip()))

def _chars(text: str) -> int:
    return len(re.sub(r"\s+", " ", text.strip()))

def answer_is_clearly_longest(options: Sequence[str], answer_index: int) -> bool:
    """Hard-fail obvious answer-length leakage; regenerate naturally."""
    if not 0 <= answer_index < len(options):
        raise ValueError("answer_index out of range")
    others = [o for i, o in enumerate(options) if i != answer_index]
    if not others:
        return False
    a = options[answer_index]
    max_chars = max(_chars(o) for o in others)
    max_words = max(_words(o) for o in others)
    return (_chars(a) > max_chars and _chars(a)-max_chars > RULES["max_correct_length_advantage_chars"]
            and _words(a) > max_words and _words(a)-max_words > RULES["max_correct_length_advantage_words"])

def answer_length_profile(options: Sequence[str], answer_index: int) -> dict:
    lengths = [{"chars": _chars(o), "words": _words(o)} for o in options]
    return {
        "answer_index": answer_index,
        "answer_chars": lengths[answer_index]["chars"],
        "answer_words": lengths[answer_index]["words"],
        "max_other_chars": max(x["chars"] for i,x in enumerate(lengths) if i != answer_index),
        "max_other_words": max(x["words"] for i,x in enumerate(lengths) if i != answer_index),
        "reject": answer_is_clearly_longest(options, answer_index),
    }

def validate_objective(item: Mapping) -> list[str]:
    errors=[]
    options=item.get("options",[])
    answer=item.get("answer")
    if len(options) != 4:
        errors.append("must_have_exactly_4_options")
    if not isinstance(answer,int) or not 0 <= answer < len(options):
        errors.append("invalid_answer_index")
        return errors
    if answer_is_clearly_longest(options, answer):
        errors.append("CORRECT_ANSWER_TOO_EASILY_REVEALED_BY_LENGTH")
    if len({str(o).strip().casefold() for o in options}) != len(options):
        errors.append("duplicate_options")
    if not str(item.get("question","")).strip():
        errors.append("empty_question")
    return errors

def validate_set(items: Sequence[Mapping], writing: Sequence[Mapping]) -> dict:
    errors=[]; ids=[]; stems=[]; counts=Counter(); A_answers=[]
    for item in items:
        ident=str(item.get("id","")); ids.append(ident)
        stems.append(re.sub(r"\s+"," ",str(item.get("question","")).strip().casefold()))
        section=item.get("section")
        counts[section]+=1
        if section == "BAHAGIAN A":
            answer=item.get("answerIndex", item.get("answer"))
            if isinstance(answer, int) and 0 <= answer < 4:
                A_answers.append(answer)
        e=validate_objective(item)
        if e: errors.append({"id":ident,"errors":e})

    if len(items)!=100: errors.append({"set":"COUNT","errors":[f"objective_count={len(items)}, expected=100"]})
    if counts.get("BAHAGIAN A",0)!=30: errors.append({"set":"COUNT","errors":["A must be 30"]})
    if counts.get("BAHAGIAN B",0)!=70: errors.append({"set":"COUNT","errors":["B must be 70"]})
    if len(set(ids))!=len(ids): errors.append({"set":"IDS","errors":["duplicate_objective_ids"]})
    dup=[s for s,n in Counter(stems).items() if s and n>1]
    if dup: errors.append({"set":"STEMS","errors":[f"duplicate_stems={len(dup)}"]})
    if len(writing)!=3: errors.append({"set":"COUNT","errors":["C must be 3"]})

    if counts.get("BAHAGIAN A",0)==30:
        if len(A_answers) != 30:
            errors.append({"set":"A_ANSWER_POSITIONS","errors":[f"A answer positions found={len(A_answers)}, expected=30"]})
        else:
            pos_counts=Counter(A_answers)
            distinct=len(pos_counts)
            max_share=max(pos_counts.values())/30
            if distinct < RULES["A_min_distinct_answer_positions"]:
                errors.append({"set":"A_ANSWER_POSITIONS","errors":[f"only {distinct} distinct positions; minimum={RULES['A_min_distinct_answer_positions']}"]})
            if max_share > RULES["A_max_position_share"]:
                errors.append({"set":"A_ANSWER_POSITIONS","errors":[f"position share={max_share:.3f}; maximum={RULES['A_max_position_share']:.2f}", f"distribution={dict(sorted(pos_counts.items()))}"]})

    return {"version":VERSION,"status":"PASS" if not errors else "FAIL","hard_gate":True,"errors":errors,
            "counts":{"A":counts.get("BAHAGIAN A",0),"B":counts.get("BAHAGIAN B",0),"C":len(writing)},
            "A_answer_position_distribution":dict(sorted(Counter(A_answers).items())),
            "rule":"Never fix a flagged item by mechanically shortening the correct option; regenerate/rephrase naturally."}

def choose_balanced_option_position(item_index:int, seed_offset:int=0)->int:
    """Deterministic balanced 0,1,2,3 rotation for generated objective items."""
    return (item_index+seed_offset)%4

def generator_contract()->dict:
    return {
        "version":VERSION,
        "sections":{"A":30,"B":70,"C":3},
        "A_rules":{
            "include_situational_and_SSQ":True,
            "answer_length_bias_gate":"HARD_FAIL",
            "correct_answer_must_not_be_obviously_longest":True,
            "rotate_correct_option_position":True,
            "answer_position_distribution_gate":"HARD_FAIL",
            "minimum_distinct_positions":3,
            "maximum_single_position_share":0.50,
            "natural_language_over_forced_length_matching":True,
        },
        "all_sections":{
            "generate_from_zero":True,
            "legacy_content_used":False,
            "unique_ids":True,
            "duplicate_stem_gate":True,
            "plausible_distractors":True,
            "post_generation_QA_required":True,
        },
    }

if __name__ == "__main__":
    print(generator_contract())

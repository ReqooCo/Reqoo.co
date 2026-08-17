"""V45.3 adapter for the EXISTING live PKSK simulator question-bank schema.

Purpose: allow the new authoring/QA pipeline to replace old question content
without changing the simulator's runtime contract.

Canonical production files remain under:
sim/pksk/simulator/sets/SET XX-YY/data/setNN.json

This adapter does not write production files. It validates and serializes a
candidate into the legacy-compatible schema; promotion is a separate guarded
operation after full-set QA.
"""
from __future__ import annotations

from copy import deepcopy
from typing import Any

TOTAL_A = 30
TOTAL_B = 70
TOTAL_C = 3

REQUIRED_TOP_LEVEL = ("questions",)
REQUIRED_QUESTION_KEYS = ("id", "section", "question", "options", "type")


def _section(q: dict[str, Any]) -> str:
    return str(q.get("section", "")).strip().upper()


def validate_runtime_question(q: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    missing = [k for k in REQUIRED_QUESTION_KEYS if k not in q]
    if missing:
        errors.append(f"missing:{','.join(missing)}")
    if not isinstance(q.get("options"), list) or len(q.get("options", [])) != 4:
        errors.append("options_must_have_4_items")
    if _section(q) not in ("BAHAGIAN A", "BAHAGIAN B"):
        errors.append("invalid_section")
    if not str(q.get("question", "")).strip():
        errors.append("empty_question")
    if q.get("type") != "graded":
        errors.append("runtime_type_must_be_graded")
    if _section(q) == "BAHAGIAN A":
        weights = q.get("weights")
        if not isinstance(weights, list) or len(weights) != 4:
            errors.append("A_requires_4_weights")
    if _section(q) == "BAHAGIAN B":
        if not isinstance(q.get("answer"), int) or not 0 <= q["answer"] < 4:
            errors.append("B_requires_answer_index")
    return errors


def validate_runtime_bank(bank: dict[str, Any]) -> dict[str, Any]:
    errors: list[dict[str, Any]] = []
    if not isinstance(bank, dict) or not isinstance(bank.get("questions"), list):
        return {"status": "FAIL", "errors": [{"gate": "schema", "error": "questions_array_required"}]}

    questions = bank["questions"]
    a = [q for q in questions if _section(q) == "BAHAGIAN A"]
    b = [q for q in questions if _section(q) == "BAHAGIAN B"]
    if len(a) != TOTAL_A:
        errors.append({"gate": "A_count", "actual": len(a), "expected": TOTAL_A})
    if len(b) != TOTAL_B:
        errors.append({"gate": "B_count", "actual": len(b), "expected": TOTAL_B})

    ids = [q.get("id") for q in questions]
    if len(ids) != len(set(ids)):
        errors.append({"gate": "ids", "error": "duplicate_question_ids"})

    for q in questions:
        problems = validate_runtime_question(q)
        if problems:
            errors.append({"id": q.get("id"), "errors": problems})

    return {"status": "PASS" if not errors else "FAIL", "errors": errors}


def to_runtime_mcq(candidate: dict[str, Any]) -> dict[str, Any]:
    """Convert an authoring candidate to the simulator's existing question shape."""
    section = str(candidate["section"]).strip().upper()
    q: dict[str, Any] = {
        "id": candidate["id"],
        "section": "BAHAGIAN A" if section == "A" else "BAHAGIAN B",
        "question": candidate["stem"],
        "options": list(candidate["options"]),
        "type": "graded",
    }
    if section == "A":
        q["category"] = candidate.get("domain", "EQ")
        q["weights"] = list(candidate.get("weights", [0, 0, 0, 0]))
    else:
        q["category"] = candidate.get("domain", "")
        q["answer"] = int(candidate["answer"])
    return q


def build_runtime_bank(a_candidates: list[dict[str, Any]], b_candidates: list[dict[str, Any]], c_prompts: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    questions = [to_runtime_mcq(x) for x in [*a_candidates, *b_candidates]]
    bank = {"questions": questions}
    if c_prompts is not None:
        # C is retained as metadata until the current simulator's writing UI/schema
        # is explicitly confirmed. Do not invent a runtime C schema here.
        bank["writing_prompts"] = deepcopy(c_prompts)
    return bank


def set_path(set_no: int) -> str:
    if not 1 <= set_no <= 50:
        raise ValueError("set_no must be 1..50")
    start = ((set_no - 1) // 10) * 10 + 1
    end = start + 9
    return f"sim/pksk/simulator/sets/SET {start:02d}-{end:02d}/data/set{set_no:02d}.json"


__all__ = [
    "TOTAL_A", "TOTAL_B", "TOTAL_C", "validate_runtime_question",
    "validate_runtime_bank", "to_runtime_mcq", "build_runtime_bank", "set_path",
]

"""V45.4 guard for replacing the legacy PKSK simulator bank.

The production simulator already consumes questions[] and writing[] from each
setXX.json. This guard validates a proposed replacement against that contract
before a production file is allowed to be promoted.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any

A_COUNT = 30
B_COUNT = 70
C_COUNT = 3
VALID_A = {"EQ", "SQ", "SSQ"}


@dataclass(frozen=True)
class GateResult:
    status: str
    errors: tuple[str, ...]


def validate_set_payload(payload: dict[str, Any]) -> GateResult:
    errors: list[str] = []
    questions = payload.get("questions")
    writing = payload.get("writing")

    if not isinstance(questions, list):
        errors.append("questions_must_be_list")
        return GateResult("FAIL", tuple(errors))
    if not isinstance(writing, list):
        errors.append("writing_must_be_list")
        return GateResult("FAIL", tuple(errors))

    a = [q for q in questions if q.get("section") == "BAHAGIAN A"]
    b = [q for q in questions if q.get("section") == "BAHAGIAN B"]
    if len(a) != A_COUNT:
        errors.append(f"A_count:{len(a)}!=30")
    if len(b) != B_COUNT:
        errors.append(f"B_count:{len(b)}!=70")
    if len(writing) != C_COUNT:
        errors.append(f"C_count:{len(writing)}!=3")

    ids = [q.get("id") for q in questions]
    if len(ids) != len(set(ids)):
        errors.append("duplicate_question_ids")

    for q in questions:
        if not q.get("id"):
            errors.append("missing_question_id")
        if not isinstance(q.get("options"), list) or len(q["options"]) != 4:
            errors.append(f"invalid_options:{q.get('id')}")
        if q.get("section") == "BAHAGIAN A":
            if q.get("category") not in VALID_A:
                errors.append(f"invalid_A_category:{q.get('id')}")
            weights = q.get("weights")
            if not isinstance(weights, list) or len(weights) != 4 or sum(1 for x in weights if x == 3) != 1:
                errors.append(f"invalid_A_weights:{q.get('id')}")
        elif q.get("section") == "BAHAGIAN B":
            if not isinstance(q.get("answer"), int) or not 0 <= q["answer"] < 4:
                errors.append(f"invalid_B_answer:{q.get('id')}")

    writing_ids = [w.get("id") for w in writing]
    if len(writing_ids) != len(set(writing_ids)):
        errors.append("duplicate_writing_ids")
    for w in writing:
        if not w.get("id") or not w.get("prompt"):
            errors.append(f"invalid_writing:{w.get('id')}")

    return GateResult("PASS" if not errors else "FAIL", tuple(errors))


def production_path(set_no: int) -> str:
    if not 1 <= set_no <= 50:
        raise ValueError("set_no must be 1..50")
    bucket = ((set_no - 1) // 10) * 10 + 1
    return f"sim/pksk/simulator/sets/SET {bucket:02d}-{bucket+9:02d}/data/set{set_no:02d}.json"


def promotion_manifest(set_no: int, old_sha: str, new_payload: dict[str, Any]) -> dict[str, Any]:
    gate = validate_set_payload(new_payload)
    return {
        "engine": "V45.4",
        "set": set_no,
        "production_path": production_path(set_no),
        "old_blob_sha": old_sha,
        "gate": gate.status,
        "errors": list(gate.errors),
        "action": "PROMOTE" if gate.status == "PASS" else "BLOCK",
    }


__all__ = ["GateResult", "validate_set_payload", "production_path", "promotion_manifest"]

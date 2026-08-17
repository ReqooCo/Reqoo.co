"""V45.8 fail-closed replacement pipeline for the existing PKSK bank."""
from __future__ import annotations
from dataclasses import dataclass
from hashlib import sha256
import json
from typing import Any

A_COUNT, B_COUNT, C_COUNT = 30, 70, 3


def production_path(set_no: int) -> str:
    if not 1 <= set_no <= 50:
        raise ValueError("set_no must be 1..50")
    start = ((set_no - 1) // 10) * 10 + 1
    end = start + 9
    return f"sim/pksk/simulator/sets/SET {start:02d}-{end:02d}/data/set{set_no:02d}.json"


def content_hash(payload: Any) -> str:
    raw = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return sha256(raw.encode("utf-8")).hexdigest()


def _valid_ids(items: list[dict[str, Any]], prefix: str) -> bool:
    ids = [str(x.get("id", "")) for x in items]
    return len(ids) == len(set(ids)) and all(x.startswith(prefix) for x in ids)


@dataclass(frozen=True)
class ReplacementDecision:
    status: str
    set_no: int
    target_path: str
    content_hash: str | None
    failures: tuple[str, ...]


def validate_candidate_set(set_no: int, payload: dict[str, Any], *, qa: dict[str, Any] | None = None) -> ReplacementDecision:
    failures: list[str] = []
    questions = payload.get("questions") if isinstance(payload.get("questions"), list) else []
    writing = payload.get("writing") if isinstance(payload.get("writing"), list) else []
    if not isinstance(payload.get("questions"), list): failures.append("questions_not_list")
    if not isinstance(payload.get("writing"), list): failures.append("writing_not_list")

    a = [q for q in questions if q.get("section") == "A"]
    b = [q for q in questions if q.get("section") == "B"]
    if len(a) != A_COUNT: failures.append(f"A_count:{len(a)}!=30")
    if len(b) != B_COUNT: failures.append(f"B_count:{len(b)}!=70")
    if len(writing) != C_COUNT: failures.append(f"C_count:{len(writing)}!=3")
    if not _valid_ids(a, "A"): failures.append("A_ids_invalid_or_duplicate")
    if not _valid_ids(b, "B"): failures.append("B_ids_invalid_or_duplicate")
    if not _valid_ids(writing, "C"): failures.append("C_ids_invalid_or_duplicate")

    # Section A deliberately contains 20 four-option situational items and
    # 10 exact two-option Setuju/Tidak setuju items.
    for q in a:
        options = q.get("options")
        if q.get("type") in ("agree_disagree", "STS", "setuju_tidak_setuju"):
            if options != ["Setuju", "Tidak setuju"]:
                failures.append(f"A_STS_options_invalid:{q.get('id')}")
        elif not isinstance(options, list) or len(options) != 4:
            failures.append(f"A_options_invalid:{q.get('id')}")
    for q in b:
        options = q.get("options")
        if not isinstance(options, list) or len(options) != 4:
            failures.append(f"B_options_invalid:{q.get('id')}")
        elif len({str(x).strip().lower() for x in options}) != 4:
            failures.append(f"B_options_duplicate:{q.get('id')}")
    for c in writing:
        if not str(c.get("prompt", "")).strip(): failures.append(f"writing_prompt_empty:{c.get('id')}")

    qa = qa or {}
    for gate, value in qa.items():
        if value not in (True, "PASS", "pass"):
            failures.append(f"qa_gate_failed:{gate}")

    return ReplacementDecision("READY" if not failures else "BLOCKED", set_no, production_path(set_no), content_hash(payload) if not failures else None, tuple(failures))


def build_replacement_manifest(set_no: int, payload: dict[str, Any], decision: ReplacementDecision) -> dict[str, Any]:
    if decision.status != "READY": raise ValueError("cannot build manifest for blocked candidate")
    return {"set": set_no, "target": decision.target_path, "hash": decision.content_hash, "status": "READY_FOR_REPLACEMENT", "policy": "replace-old-bank-only-after-full-set-pass"}

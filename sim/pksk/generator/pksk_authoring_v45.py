"""REQOO PKSK V45.1 authoring contract.

This module is deliberately provider-driven. It defines the canonical shape and
hard validation gates for PKSK practice content without inventing official KPM
questions. Production authoring must supply content through an approved provider.

Target: 50 sets x (A30 + B70 + C3 prompts).
"""
from __future__ import annotations

from dataclasses import dataclass, field, asdict
from difflib import SequenceMatcher
import hashlib
import json
import re
from typing import Any, Iterable

ENGINE_VERSION = "V45.1"
SET_COUNT = 50
A_COUNT = 30
B_COUNT = 70
C_PROMPTS = 3

A_CONSTRUCTS = ("EQ", "SQ", "SSQ")
B_DOMAINS = (
    "IQ", "Bahasa Melayu", "Bahasa Inggeris", "Matematik",
    "Sains", "Teknologi", "Pengetahuan Am",
)


def norm(text: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^\w\s]", " ", str(text).lower(), flags=re.UNICODE)).strip()


def digest(value: Any) -> str:
    raw = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def question_id(set_no: int, section: str, number: int) -> str:
    return f"PKSK-V45-S{set_no:02d}-{section}{number:03d}"


@dataclass
class MCQCandidate:
    id: str
    set_no: int
    section: str
    number: int
    stem: str
    options: list[str]
    answer: int
    domain: str
    topic: str = ""
    subtopic: str = ""
    family: str = ""
    archetype: str = ""
    context: str = ""
    reasoning: str = ""
    difficulty: str = ""
    stimulus: str = "none"
    seed: str = ""
    revision: int = 1
    status: str = "CANDIDATE"
    dna: dict[str, Any] = field(default_factory=dict)

    def payload(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class WritingCandidate:
    id: str
    set_no: int
    number: int
    prompt: str
    theme: str
    skills: list[str] = field(default_factory=list)
    rubric_tags: list[str] = field(default_factory=list)
    status: str = "CANDIDATE"

    def payload(self) -> dict[str, Any]:
        return asdict(self)


def build_dna(item: MCQCandidate) -> dict[str, Any]:
    dna = {
        "section": item.section,
        "domain": item.domain,
        "topic": item.topic,
        "subtopic": item.subtopic,
        "family": item.family,
        "archetype": item.archetype,
        "context": item.context,
        "reasoning": item.reasoning,
        "difficulty": item.difficulty,
        "stimulus": item.stimulus,
        "stem_signature": norm(item.stem),
    }
    dna["fingerprint"] = digest(dna)
    return dna


def validate_mcq(item: MCQCandidate) -> list[str]:
    errors: list[str] = []
    if item.section not in ("A", "B"):
        errors.append("invalid_section")
    if not item.stem.strip():
        errors.append("empty_stem")
    if len(item.options) != 4 or len(set(map(norm, item.options))) != 4:
        errors.append("options_must_be_four_unique")
    if not 0 <= item.answer < 4:
        errors.append("invalid_answer")
    if item.section == "A" and item.domain not in A_CONSTRUCTS:
        errors.append("invalid_A_construct")
    if item.section == "B" and item.domain not in B_DOMAINS:
        errors.append("invalid_B_domain")
    if item.section == "B" and item.domain == "Matematik" and not item.reasoning:
        errors.append("math_reasoning_metadata_required")
    if len(norm(item.stem).split()) < 3:
        errors.append("stem_too_short")
    item.dna = build_dna(item)
    return errors


def validate_writing(item: WritingCandidate) -> list[str]:
    errors: list[str] = []
    if not item.prompt.strip():
        errors.append("empty_prompt")
    if len(norm(item.prompt).split()) < 6:
        errors.append("prompt_too_short")
    if not item.theme.strip():
        errors.append("missing_theme")
    if not item.skills:
        errors.append("missing_rubric_skills")
    return errors


def cross_set_collisions(candidates: Iterable[MCQCandidate], threshold: float = 0.85) -> list[tuple[str, str, float]]:
    items = list(candidates)
    collisions: list[tuple[str, str, float]] = []
    for i, a in enumerate(items):
        for b in items[i + 1:]:
            if a.set_no == b.set_no:
                continue
            score = SequenceMatcher(None, norm(a.stem), norm(b.stem), autojunk=False).ratio()
            if score >= threshold:
                collisions.append((a.id, b.id, round(score, 4)))
    return collisions


def audit_set(a: list[MCQCandidate], b: list[MCQCandidate], c: list[WritingCandidate]) -> dict[str, Any]:
    errors: list[dict[str, Any]] = []
    if len(a) != A_COUNT:
        errors.append({"gate": "A_count", "actual": len(a), "expected": A_COUNT})
    if len(b) != B_COUNT:
        errors.append({"gate": "B_count", "actual": len(b), "expected": B_COUNT})
    if len(c) != C_PROMPTS:
        errors.append({"gate": "C_count", "actual": len(c), "expected": C_PROMPTS})
    for item in [*a, *b]:
        problems = validate_mcq(item)
        if problems:
            errors.append({"id": item.id, "gate": "MCQ", "errors": problems})
    for item in c:
        problems = validate_writing(item)
        if problems:
            errors.append({"id": item.id, "gate": "C", "errors": problems})
    return {"status": "PASS" if not errors else "FAIL", "errors": errors}


def audit_batch(items: Iterable[MCQCandidate]) -> dict[str, Any]:
    items = list(items)
    duplicate_ids = len({x.id for x in items}) != len(items)
    collisions = cross_set_collisions(items)
    return {
        "items": len(items),
        "duplicate_ids": duplicate_ids,
        "cross_set_collision_count": len(collisions),
        "cross_set_collisions": collisions,
        "status": "PASS" if not duplicate_ids and not collisions else "FAIL",
    }


def make_mcq(set_no: int, section: str, number: int, *, stem: str, options: list[str], answer: int, domain: str, seed: str, **meta: Any) -> MCQCandidate:
    return MCQCandidate(
        id=question_id(set_no, section, number),
        set_no=set_no,
        section=section,
        number=number,
        stem=stem,
        options=options,
        answer=answer,
        domain=domain,
        seed=seed,
        **meta,
    )


def make_writing(set_no: int, number: int, *, prompt: str, theme: str, skills: list[str], rubric_tags: list[str] | None = None) -> WritingCandidate:
    return WritingCandidate(
        id=f"PKSK-V45-S{set_no:02d}-C{number:02d}",
        set_no=set_no,
        number=number,
        prompt=prompt,
        theme=theme,
        skills=skills,
        rubric_tags=rubric_tags or [],
    )


__all__ = [
    "ENGINE_VERSION", "SET_COUNT", "A_COUNT", "B_COUNT", "C_PROMPTS",
    "MCQCandidate", "WritingCandidate", "make_mcq", "make_writing",
    "validate_mcq", "validate_writing", "audit_set", "audit_batch",
    "cross_set_collisions",
]

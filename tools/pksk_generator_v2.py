"""PKSK V2 question-generator contract.

This is the new application-side generator adapter. It deliberately separates
question authoring from the simulator. The old V45 production engine rules are
carried forward: deterministic seeds, Question DNA, four unique options,
answer validity, duplicate/similarity gates and quarantine-friendly records.

A real authoring provider is injected; this module never invents production
content by itself. Existing Set 01–50 files are read-only inputs.
"""
from __future__ import annotations

import hashlib
import json
import re
from dataclasses import dataclass, asdict, field
from difflib import SequenceMatcher
from typing import Any, Callable, Iterable

ENGINE_VERSION = "PKSK-V2-GEN-1"
SIMILARITY_THRESHOLD = 0.85
CONSTRUCTS = ("EQ", "SQ", "SSQ", "IQ", "Pengetahuan Am", "Penyelesaian Masalah")


def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^\w\s]", " ", str(text).lower(), flags=re.UNICODE)).strip()


def seed(master_seed: str, set_no: int, question_no: int, revision: int = 1) -> str:
    raw = f"{master_seed}|{set_no}|{question_no}|{revision}|{ENGINE_VERSION}"
    return hashlib.sha256(raw.encode()).hexdigest()[:32]


def fingerprint(value: Any) -> str:
    raw = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(raw.encode()).hexdigest()


@dataclass
class GeneratedQuestion:
    id: str
    set_no: int
    question_no: int
    seed: str
    section: str
    category: str
    question: str
    options: list[str]
    answer: int
    weights: list[int] | None = None
    construct: str = ""
    topic: str = ""
    subtopic: str = ""
    family: str = ""
    variant: str = ""
    archetype: str = ""
    context: str = ""
    reasoning_pattern: str = ""
    difficulty: str = ""
    stimulus_type: str = "none"
    visual: str | None = None
    dna: dict[str, Any] = field(default_factory=dict)
    status: str = "GENERATED"

    def build_dna(self) -> None:
        self.dna = {
            "construct": self.construct,
            "topic": self.topic,
            "subtopic": self.subtopic,
            "family": self.family,
            "variant": self.variant,
            "archetype": self.archetype,
            "context": self.context,
            "reasoning_pattern": self.reasoning_pattern,
            "difficulty": self.difficulty,
            "stimulus_type": self.stimulus_type,
            "stem_signature": normalize(self.question),
            "option_lengths": [len(normalize(x).split()) for x in self.options],
        }
        self.dna["fingerprint"] = fingerprint(self.dna)

    def to_dict(self) -> dict[str, Any]:
        x = asdict(self)
        if self.visual is None:
            x.pop("visual", None)
        return x


class GeneratorGate:
    """Reject unsafe candidates before they can become bank content."""
    def __init__(self, similarity_threshold: float = SIMILARITY_THRESHOLD):
        self.threshold = similarity_threshold
        self.accepted: list[GeneratedQuestion] = []
        self.stems: set[str] = set()

    def validate(self, q: GeneratedQuestion) -> list[str]:
        errors: list[str] = []
        q.build_dna()
        if len(q.options) != 4 or len(set(q.options)) != 4:
            errors.append("options_not_four_unique")
        if not 0 <= q.answer < 4:
            errors.append("invalid_answer_index")
        stem = normalize(q.question)
        if not stem:
            errors.append("empty_question")
        if stem in self.stems:
            errors.append("exact_duplicate")
        for old in self.accepted:
            score = SequenceMatcher(None, stem, normalize(old.question), autojunk=False).ratio()
            if score >= self.threshold:
                errors.append(f"similarity:{score:.3f}:{old.id}")
                break
        if q.weights is not None and len(q.weights) != 4:
            errors.append("weights_not_four")
        return errors

    def accept(self, q: GeneratedQuestion) -> None:
        self.accepted.append(q)
        self.stems.add(normalize(q.question))


def generate_sets(
    provider: Callable[[int, int, str], GeneratedQuestion | None],
    *,
    master_seed: str,
    set_start: int = 1,
    set_end: int = 50,
    questions_per_set: int = 100,
) -> tuple[list[dict], list[dict]]:
    """Generate candidates and return (accepted, rejected) records.

    Provider = the original authoring/generation logic. V2 owns the gates and
    output contract so the buggy old UI/application is not reused.
    """
    gate = GeneratorGate()
    accepted: list[dict] = []
    rejected: list[dict] = []
    for set_no in range(set_start, set_end + 1):
        for q_no in range(1, questions_per_set + 1):
            s = seed(master_seed, set_no, q_no)
            q = provider(set_no, q_no, s)
            if q is None:
                rejected.append({"set": set_no, "question": q_no, "reason": "provider_none"})
                continue
            errors = gate.validate(q)
            if errors:
                q.status = "QUARANTINED"
                rejected.append({"id": q.id, "errors": errors, "question": q.to_dict()})
                continue
            q.status = "PASSED"
            gate.accept(q)
            accepted.append(q.to_dict())
    return accepted, rejected


def export_json(path: str, items: Iterable[dict]) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(list(items), f, ensure_ascii=False, indent=2)
        f.write("\n")

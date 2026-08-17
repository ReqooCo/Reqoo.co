"""PKSK V45.6 question factory.

Orchestrates provider-authored candidates through deterministic identity,
section gates, AI-smell review, and cross-set collision checks. It never uses
legacy question text as a generation source and never writes directly to the
production simulator bank.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol, Sequence

from pksk_authoring_v45 import MCQCandidate, WritingCandidate, audit_set, audit_batch
from pksk_human_authoring_v45_2 import review_text


class Provider(Protocol):
    def generate_mcq(self, *, set_no: int, section: str, number: int, seed: str, blueprint: dict[str, Any]) -> MCQCandidate: ...
    def generate_writing(self, *, set_no: int, number: int, seed: str, blueprint: dict[str, Any]) -> WritingCandidate: ...


@dataclass
class FactoryResult:
    status: str
    set_no: int
    section_a: list[MCQCandidate]
    section_b: list[MCQCandidate]
    section_c: list[WritingCandidate]
    rejected: list[dict[str, Any]]
    audit: dict[str, Any]


class QuestionFactory:
    def __init__(self, provider: Provider):
        self.provider = provider

    @staticmethod
    def _seed(master_seed: str, set_no: int, section: str, number: int) -> str:
        return f"{master_seed}:S{set_no:02d}:{section}{number:03d}"

    def _mcq(self, set_no: int, section: str, number: int, master_seed: str, blueprint: dict[str, Any]):
        seed = self._seed(master_seed, set_no, section, number)
        item = self.provider.generate_mcq(set_no=set_no, section=section, number=number, seed=seed, blueprint=blueprint)
        review = review_text(item.stem, seed, section, item.domain)
        if review.status != "PASS":
            return None, {"id": item.id, "stage": "human_authoring", "flags": list(review.flags)}
        return item, None

    def _writing(self, set_no: int, number: int, master_seed: str, blueprint: dict[str, Any]):
        seed = self._seed(master_seed, set_no, "C", number)
        item = self.provider.generate_writing(set_no=set_no, number=number, seed=seed, blueprint=blueprint)
        review = review_text(item.prompt, seed, "C", "writing")
        if review.status != "PASS":
            return None, {"id": item.id, "stage": "human_authoring", "flags": list(review.flags)}
        return item, None

    def generate_set(self, *, set_no: int, master_seed: str, blueprint_a: dict[str, Any], blueprint_b: dict[str, Any], blueprint_c: dict[str, Any], previous_items: Sequence[MCQCandidate] = ()) -> FactoryResult:
        a: list[MCQCandidate] = []
        b: list[MCQCandidate] = []
        c: list[WritingCandidate] = []
        rejected: list[dict[str, Any]] = []

        for number in range(1, 31):
            item, error = self._mcq(set_no, "A", number, master_seed, blueprint_a)
            if item is not None:
                a.append(item)
            else:
                rejected.append(error)

        for number in range(1, 71):
            item, error = self._mcq(set_no, "B", number, master_seed, blueprint_b)
            if item is not None:
                b.append(item)
            else:
                rejected.append(error)

        for number in range(1, 4):
            item, error = self._writing(set_no, number, master_seed, blueprint_c)
            if item is not None:
                c.append(item)
            else:
                rejected.append(error)

        set_audit = audit_set(a, b, c)
        batch_audit = audit_batch([*previous_items, *a, *b])
        status = "PASS" if not rejected and set_audit["status"] == "PASS" and batch_audit["status"] == "PASS" else "FAIL"
        return FactoryResult(status, set_no, a, b, c, rejected, {"set": set_audit, "batch": batch_audit})


__all__ = ["Provider", "FactoryResult", "QuestionFactory"]

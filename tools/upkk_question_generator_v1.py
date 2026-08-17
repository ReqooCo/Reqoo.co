"""REQOO UPKK Question Generator V1.

Format-first orchestration for the JAKIM UPKK instrument introduced from 2024.
This module is a generator/QA shell: it enforces the real written-paper
structure before content is accepted. It does not invent a new UPKK format.
"""
from __future__ import annotations

import hashlib
import json
import re
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Any, Iterable

ROOT = Path(__file__).resolve().parents[1]
FORMAT_PATH = ROOT / "config" / "upkk_2024_format.json"
ENGINE_VERSION = "UPKK-V1"


def load_format() -> dict[str, Any]:
    return json.loads(FORMAT_PATH.read_text(encoding="utf-8"))


def stable_seed(master_seed: str, code: str, set_no: int, section: str, q_no: int, revision: int = 1) -> str:
    raw = f"{master_seed}|{code}|{set_no}|{section}|{q_no}|{revision}|{ENGINE_VERSION}"
    return hashlib.sha256(raw.encode()).hexdigest()[:32]


def normalize(text: str) -> str:
    text = re.sub(r"[^\w\s]", " ", str(text).lower(), flags=re.UNICODE)
    return re.sub(r"\s+", " ", text).strip()


@dataclass
class Item:
    id: str
    subject_code: str
    set_no: int
    section: str
    question_no: int
    marks: int
    difficulty: str
    item_type: str
    question: str
    options: list[str]
    answer: Any
    topic: str = ""
    subtopic: str = ""
    construct: str = ""
    family: str = ""
    variant: str = ""
    context: str = ""
    stimulus_type: str = "none"
    seed: str = ""

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def validate_item(item: Item) -> list[str]:
    errors: list[str] = []
    if not item.question.strip():
        errors.append("empty_question")
    if item.difficulty not in {"R", "S", "T"}:
        errors.append("invalid_difficulty")
    if item.marks < 1:
        errors.append("invalid_marks")
    if item.item_type in {"MCQ", "COMBINATION"}:
        if len(item.options) != 4:
            errors.append("mcq_must_have_four_options")
        elif len({normalize(x) for x in item.options}) != 4:
            errors.append("duplicate_options")
        if not isinstance(item.answer, int) or not 0 <= item.answer < 4:
            errors.append("invalid_answer_index")
    return errors


def validate_set(code: str, items: Iterable[Item], format_spec: dict[str, Any]) -> list[str]:
    items = list(items)
    errors: list[str] = []
    if code not in format_spec["written_subjects"]:
        errors.append(f"unsupported_written_subject:{code}")
        return errors
    spec = format_spec["written_subjects"][code]
    by_section: dict[str, list[Item]] = {}
    for item in items:
        errors.extend(f"{item.id}:{e}" for e in validate_item(item))
        by_section.setdefault(item.section, []).append(item)

    expected_sections = set(spec["parts"])
    if set(by_section) != expected_sections:
        errors.append(f"section_mismatch:expected={sorted(expected_sections)}:actual={sorted(by_section)}")

    for section, section_spec in spec["parts"].items():
        count = len(by_section.get(section, []))
        qspec = section_spec["questions"]
        if isinstance(qspec, list):
            lo, hi = qspec
            if not lo <= count <= hi:
                errors.append(f"{section}:question_count:{count}:expected_{lo}_{hi}")
        else:
            if count != qspec:
                errors.append(f"{section}:question_count:{count}:expected_{qspec}")

        marks = sum(x.marks for x in by_section.get(section, []))
        if marks != section_spec["marks"]:
            errors.append(f"{section}:marks:{marks}:expected_{section_spec['marks']}")

    total_marks = sum(x.marks for x in items)
    if total_marks != 70:
        errors.append(f"total_marks:{total_marks}:expected_70")

    difficulties = {"R": 0, "S": 0, "T": 0}
    for item in items:
        difficulties[item.difficulty] += item.marks
    # The official ratio is a design target; allow rounding by one mark.
    for level, ratio in format_spec["written_common"]["difficulty_ratio"].items():
        target = total_marks * ratio
        if abs(difficulties[level] - target) > 1:
            errors.append(f"difficulty_ratio:{level}:{difficulties[level]}:target_{target:.1f}")
    return errors


def validate_batch(items: Iterable[Item], format_spec: dict[str, Any]) -> list[str]:
    items = list(items)
    errors: list[str] = []
    seen_ids: set[str] = set()
    seen_stems: dict[str, str] = {}
    groups: dict[tuple[int, str], list[Item]] = {}
    for item in items:
        if item.id in seen_ids:
            errors.append(f"duplicate_id:{item.id}")
        seen_ids.add(item.id)
        stem = normalize(item.question)
        if stem in seen_stems:
            errors.append(f"exact_duplicate_stem:{item.id}:{seen_stems[stem]}")
        else:
            seen_stems[stem] = item.id
        groups.setdefault((item.set_no, item.subject_code), []).append(item)
    for (set_no, code), group in sorted(groups.items()):
        errors.extend(f"S{set_no:02d}/{code}:{e}" for e in validate_set(code, group, format_spec))
    return errors


def build_generation_manifest(master_seed: str, set_count: int, subjects: Iterable[str]) -> dict[str, Any]:
    format_spec = load_format()
    subjects = list(subjects)
    unsupported = [code for code in subjects if code not in format_spec["written_subjects"]]
    return {
        "engine_version": ENGINE_VERSION,
        "format_schema": format_spec["schema_version"],
        "master_seed": master_seed,
        "set_count": set_count,
        "subjects": subjects,
        "unsupported_subjects": unsupported,
        "production_generation_allowed": not unsupported,
        "written_duration_minutes": 75,
        "note": "Generate against the format contract; do not use legacy 60/100-question structures.",
    }


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--sets", type=int, default=1)
    parser.add_argument("--seed", default="REQOO-UPKK-2026")
    args = parser.parse_args()
    print(json.dumps(build_generation_manifest(args.seed, args.sets, ["UPKK02", "UPKK03", "UPKK04", "UPKK05", "UPKK06", "UPKK07"]), ensure_ascii=False, indent=2))

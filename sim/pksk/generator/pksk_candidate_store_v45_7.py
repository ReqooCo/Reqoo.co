"""Persistent candidate/checkpoint store for PKSK V45.7.

Every accepted item is written as an immutable candidate record. The store is
separate from simulator production files; promotion is a later explicit step.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
from typing import Any

ENGINE_VERSION = "V45.7"
A_COUNT = 30
B_COUNT = 70
C_COUNT = 3


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def canonical_hash(value: Any) -> str:
    raw = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


@dataclass
class CandidateRecord:
    item_id: str
    set_no: int
    section: str
    number: int
    payload: dict[str, Any]
    status: str = "PASSED"
    engine: str = ENGINE_VERSION
    created_at: str = field(default_factory=utc_now)
    content_hash: str = ""

    def __post_init__(self) -> None:
        if not self.content_hash:
            self.content_hash = canonical_hash(self.payload)


class CandidateStore:
    """Filesystem store designed to be committed to Git after each accepted item."""

    def __init__(self, root: str | Path):
        self.root = Path(root)
        self.root.mkdir(parents=True, exist_ok=True)

    def item_path(self, set_no: int, section: str, number: int) -> Path:
        return self.root / f"set{set_no:02d}" / section / f"{number:03d}.json"

    def checkpoint_path(self, set_no: int) -> Path:
        return self.root / f"set{set_no:02d}" / "checkpoint.json"

    def save(self, record: CandidateRecord) -> Path:
        path = self.item_path(record.set_no, record.section, record.number)
        path.parent.mkdir(parents=True, exist_ok=True)
        if path.exists():
            existing = json.loads(path.read_text(encoding="utf-8"))
            if existing.get("content_hash") != record.content_hash:
                raise RuntimeError(f"immutable candidate conflict: {record.item_id}")
            return path
        path.write_text(json.dumps(asdict(record), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        return path

    def checkpoint(self, set_no: int) -> dict[str, Any]:
        records = []
        base = self.root / f"set{set_no:02d}"
        if base.exists():
            for p in base.glob("*/[0-9][0-9][0-9].json"):
                records.append(json.loads(p.read_text(encoding="utf-8")))
        a = sum(r["section"] == "A" for r in records)
        b = sum(r["section"] == "B" for r in records)
        c = sum(r["section"] == "C" for r in records)
        next_number = {"A": a + 1, "B": b + 1, "C": c + 1}
        complete = a == A_COUNT and b == B_COUNT and c == C_COUNT
        result = {
            "engine": ENGINE_VERSION,
            "set_no": set_no,
            "updated_at": utc_now(),
            "counts": {"A": a, "B": b, "C": c},
            "next_number": next_number,
            "complete": complete,
            "status": "READY_FOR_SET_AUDIT" if complete else "IN_PROGRESS",
        }
        path = self.checkpoint_path(set_no)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        return result

    def resume_position(self, set_no: int) -> dict[str, int]:
        return self.checkpoint(set_no)["next_number"]


__all__ = ["CandidateRecord", "CandidateStore", "ENGINE_VERSION"]

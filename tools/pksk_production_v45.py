"""REQOO PKSK V45 Production Engine.

Purpose
-------
A deterministic, append-only orchestration layer for large PKSK batches.
It does not modify the existing locked question bank. It creates new batch
artifacts under a caller-supplied output directory and refuses to overwrite
locked snapshots.

The engine is intentionally provider-agnostic: a question-authoring provider
supplies candidate items, while this module owns persistence, deterministic
seeds, DNA/fingerprints, cross-set collision checks, regression hooks,
quarantine, checkpoints, atomic writes, manifests and release verification.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import tempfile
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any, Callable, Iterable, Sequence

ENGINE_VERSION = "V45.0"
SCHEMA_VERSION = "pksk-question-v45"


def canonical_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def fingerprint(value: Any) -> str:
    return sha256_text(canonical_json(value))


def normalize(text: str) -> str:
    text = re.sub(r"[^\w\s]", " ", str(text).lower(), flags=re.UNICODE)
    return re.sub(r"\s+", " ", text).strip()


def stable_seed(master_seed: str, set_no: int, question_no: int, revision: int = 1) -> str:
    raw = f"{master_seed}|{set_no}|{question_no}|{revision}|{ENGINE_VERSION}"
    return sha256_text(raw)[:32]


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass(frozen=True)
class ProductionConfig:
    batch_id: str
    master_seed: str
    set_count: int = 50
    questions_per_set: int = 100
    similarity_threshold: float = 0.85
    max_attempts_per_question: int = 12
    checkpoint_every: int = 10
    output_root: str = "pksk-production"
    locked_input_root: str = "data/pksk"


@dataclass
class QuestionRecord:
    id: str
    set_no: int
    question_no: int
    revision: int
    seed: str
    question: str
    options: list[str]
    answer: int
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
    dna: dict[str, Any] = field(default_factory=dict)
    selection_reason: str = ""
    status: str = "GENERATED"
    created_at: str = field(default_factory=utc_now)
    failure_reasons: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class AppendOnlyLedger:
    """Append-only JSONL event ledger; never rewrites prior events."""

    def __init__(self, path: Path):
        self.path = path
        self.path.parent.mkdir(parents=True, exist_ok=True)

    def append(self, event: str, payload: dict[str, Any]) -> None:
        row = {"timestamp": utc_now(), "event": event, **payload}
        with self.path.open("a", encoding="utf-8") as fh:
            fh.write(canonical_json(row) + "\n")
            fh.flush()
            os.fsync(fh.fileno())


class AtomicStore:
    """Atomic UTF-8 JSON writes with a sibling temporary file and fsync."""

    @staticmethod
    def write_json(path: Path, value: Any) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        data = json.dumps(value, ensure_ascii=False, indent=2) + "\n"
        fd, tmp_name = tempfile.mkstemp(prefix=f".{path.name}.", dir=str(path.parent))
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as fh:
                fh.write(data)
                fh.flush()
                os.fsync(fh.fileno())
            os.replace(tmp_name, path)
        finally:
            if os.path.exists(tmp_name):
                os.unlink(tmp_name)

    @staticmethod
    def read_json(path: Path) -> Any:
        with path.open("r", encoding="utf-8") as fh:
            return json.load(fh)


class QuestionFirewall:
    """Hard gates for structural integrity and cross-set similarity."""

    def __init__(self, similarity_threshold: float = 0.85):
        self.threshold = similarity_threshold
        self.accepted: list[QuestionRecord] = []
        self.normalized: dict[str, QuestionRecord] = {}

    def _similar(self, a: str, b: str) -> float:
        return SequenceMatcher(None, normalize(a), normalize(b), autojunk=False).ratio()

    def validate(self, item: QuestionRecord) -> list[str]:
        errors: list[str] = []
        if not item.id or not item.question.strip():
            errors.append("missing_identity_or_stem")
        if len(item.options) != 4 or len(set(map(str, item.options))) != 4:
            errors.append("options_not_four_unique")
        if not 0 <= item.answer < 4:
            errors.append("invalid_answer_index")
        if normalize(item.question) in self.normalized:
            errors.append("exact_duplicate")
        for other in self.accepted:
            score = self._similar(item.question, other.question)
            if score >= self.threshold:
                errors.append(f"semantic_similarity:{score:.3f}:{other.id}")
                break
        return errors

    def accept(self, item: QuestionRecord) -> None:
        self.accepted.append(item)
        self.normalized[normalize(item.question)] = item


def build_dna(item: QuestionRecord) -> dict[str, Any]:
    dna = {
        "construct": item.construct,
        "topic": item.topic,
        "subtopic": item.subtopic,
        "family": item.family,
        "variant": item.variant,
        "archetype": item.archetype,
        "context": item.context,
        "reasoning_pattern": item.reasoning_pattern,
        "difficulty": item.difficulty,
        "stimulus_type": item.stimulus_type,
        "stem_signature": normalize(item.question),
        "option_lengths": [len(normalize(x).split()) for x in item.options],
    }
    dna["fingerprint"] = fingerprint(dna)
    return dna


def release_hash(items: Sequence[QuestionRecord]) -> str:
    payload = [item.to_dict() for item in items]
    return fingerprint(payload)


def validate_round_trip(path: Path, expected: Sequence[QuestionRecord]) -> list[str]:
    loaded = AtomicStore.read_json(path)
    expected_payload = [x.to_dict() for x in expected]
    errors: list[str] = []
    if loaded != expected_payload:
        errors.append("json_round_trip_mismatch")
    if len(loaded) != len(expected_payload):
        errors.append("question_count_changed_on_export")
    return errors


class ProductionOrchestrator:
    """Generate, persist, audit and lock a batch without touching old data."""

    def __init__(self, config: ProductionConfig):
        self.config = config
        self.root = Path(config.output_root) / config.batch_id
        self.ledger = AppendOnlyLedger(self.root / "audit" / "events.jsonl")
        self.firewall = QuestionFirewall(config.similarity_threshold)
        self.manifest_path = self.root / "manifest.json"
        self.questions_root = self.root / "questions"
        self.locked_root = self.root / "locked"
        self.quarantine_root = self.root / "quarantine"
        self.root.mkdir(parents=True, exist_ok=True)
        self.locked_root.mkdir(parents=True, exist_ok=True)
        self.quarantine_root.mkdir(parents=True, exist_ok=True)

    def _assert_safe_root(self) -> None:
        locked = Path(self.config.locked_input_root).resolve()
        output = self.root.resolve()
        if output == locked or locked in output.parents:
            raise RuntimeError("output_root cannot be inside locked_input_root")

    def _write_manifest(self, status: str, **extra: Any) -> None:
        manifest = {
            "schema_version": SCHEMA_VERSION,
            "engine_version": ENGINE_VERSION,
            "batch_id": self.config.batch_id,
            "master_seed": self.config.master_seed,
            "set_count": self.config.set_count,
            "questions_per_set": self.config.questions_per_set,
            "status": status,
            "updated_at": utc_now(),
            **extra,
        }
        AtomicStore.write_json(self.manifest_path, manifest)

    def prepare(self) -> None:
        self._assert_safe_root()
        self._write_manifest("DRY_RUN_READY")
        self.ledger.append("BATCH_PREPARED", {"batch_id": self.config.batch_id})

    def process_item(self, item: QuestionRecord) -> tuple[bool, list[str]]:
        item.dna = build_dna(item)
        errors = self.firewall.validate(item)
        if errors:
            item.status = "QUARANTINED"
            item.failure_reasons = errors
            qpath = self.quarantine_root / f"{item.id}-r{item.revision}.json"
            AtomicStore.write_json(qpath, item.to_dict())
            self.ledger.append("QUESTION_QUARANTINED", {"id": item.id, "reasons": errors})
            return False, errors

        item.status = "PASSED"
        path = self.questions_root / f"set-{item.set_no:02d}" / f"{item.id}.json"
        AtomicStore.write_json(path, item.to_dict())
        self.firewall.accept(item)
        self.ledger.append("QUESTION_COMMITTED", {"id": item.id, "path": str(path)})
        return True, []

    def lock_set(self, set_no: int, items: Sequence[QuestionRecord]) -> str:
        if len(items) != self.config.questions_per_set:
            raise RuntimeError(f"set {set_no} incomplete: {len(items)}/{self.config.questions_per_set}")
        if any(x.status != "PASSED" for x in items):
            raise RuntimeError(f"set {set_no} contains non-passed questions")
        snapshot = self.locked_root / f"set-{set_no:02d}.json"
        if snapshot.exists():
            raise FileExistsError(f"locked snapshot already exists: {snapshot}")
        payload = [x.to_dict() for x in items]
        AtomicStore.write_json(snapshot, payload)
        errors = validate_round_trip(snapshot, items)
        if errors:
            raise RuntimeError(f"set {set_no} release round-trip failed: {errors}")
        digest = release_hash(items)
        self.ledger.append("SET_LOCKED", {"set_no": set_no, "release_hash": digest})
        return digest

    def dry_run(self, candidate_provider: Callable[[int, int, str], QuestionRecord | None]) -> dict[str, Any]:
        """Exercise persistence/QA paths without creating production sets.

        The provider is called only for test candidates. Nothing is promoted to
        a production bank by this method.
        """
        self.prepare()
        generated = passed = quarantined = 0
        failures: list[dict[str, Any]] = []
        for set_no in range(1, self.config.set_count + 1):
            set_items: list[QuestionRecord] = []
            for q_no in range(1, self.config.questions_per_set + 1):
                generated += 1
                seed = stable_seed(self.config.master_seed, set_no, q_no)
                candidate = candidate_provider(set_no, q_no, seed)
                if candidate is None:
                    quarantined += 1
                    failures.append({"set": set_no, "question": q_no, "reason": "provider_returned_none"})
                    continue
                ok, errors = self.process_item(candidate)
                if ok:
                    passed += 1
                    set_items.append(candidate)
                else:
                    quarantined += 1
                    failures.append({"id": candidate.id, "reasons": errors})
            # In dry-run mode incomplete sets are reported, never locked.
            if len(set_items) != self.config.questions_per_set:
                failures.append({"set": set_no, "reason": f"incomplete_set:{len(set_items)}/{self.config.questions_per_set}"})
        status = "PASS" if not failures else "FAIL"
        self._write_manifest(status, generated=generated, passed=passed, quarantined=quarantined, failures=failures)
        self.ledger.append("DRY_RUN_COMPLETE", {"status": status, "generated": generated, "passed": passed, "quarantined": quarantined})
        return {
            "engine_version": ENGINE_VERSION,
            "mode": "DRY_RUN",
            "status": status,
            "generated": generated,
            "passed": passed,
            "quarantined": quarantined,
            "failure_count": len(failures),
            "failures": failures,
            "production_release_created": False,
        }


def make_candidate(set_no: int, question_no: int, seed: str, **fields: Any) -> QuestionRecord:
    """Convenience constructor for an authoring provider."""
    return QuestionRecord(
        id=f"PKSK-V45-S{set_no:02d}-Q{question_no:03d}",
        set_no=set_no,
        question_no=question_no,
        revision=1,
        seed=seed,
        question=fields.pop("question", ""),
        options=list(fields.pop("options", [])),
        answer=int(fields.pop("answer", -1)),
        **fields,
    )


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="REQOO PKSK V45 production engine")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--batch", default="v45-dry-run")
    parser.add_argument("--sets", type=int, default=1)
    parser.add_argument("--questions", type=int, default=5)
    args = parser.parse_args()

    config = ProductionConfig(
        batch_id=args.batch,
        master_seed="REQOO-V45-DRYRUN",
        set_count=args.sets,
        questions_per_set=args.questions,
    )
    engine = ProductionOrchestrator(config)

    def fixture_provider(set_no: int, q_no: int, seed: str) -> QuestionRecord:
        return make_candidate(
            set_no, q_no, seed,
            question=f"Ujian dry-run set {set_no}, item {q_no}: pilih pernyataan yang paling tepat.",
            options=["Pernyataan pertama", "Pernyataan kedua", "Pernyataan ketiga", "Pernyataan keempat"],
            answer=(q_no - 1) % 4,
            construct="DRY_RUN",
            topic="fixture",
            family=f"fixture-{q_no}",
            variant=f"v{q_no}",
            archetype="fixture",
            context="fixture",
            reasoning_pattern="fixture",
            difficulty="fixture",
        )

    if args.dry_run:
        print(json.dumps(engine.dry_run(fixture_provider), ensure_ascii=False, indent=2))
    else:
        raise SystemExit("Production generation is intentionally provider-driven; use --dry-run for the built-in safe test.")

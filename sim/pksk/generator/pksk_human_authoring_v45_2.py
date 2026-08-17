"""PKSK V45.2 human-like authoring layer.

The layer does not generate official exam content. It provides controlled
writing/variation rules for practice-item providers so output avoids obvious
machine-template repetition while preserving grammatical correctness.
"""
from __future__ import annotations

from dataclasses import dataclass
import hashlib
import re
from typing import Sequence

ENGINE_VERSION = "V45.2"

STEM_MODES = (
    "direct_question",
    "short_scenario",
    "dialogue",
    "data_prompt",
    "comparison",
    "sequence_reasoning",
    "cause_effect",
    "decision_context",
    "error_detection",
)

CONTEXTS = (
    "sekolah", "rumah", "komuniti", "alam_sekitar", "aktiviti_harian",
    "perjalanan", "teknologi", "sukan", "kelab", "projek_murid",
)

FORBIDDEN_TEMPLATE_STARTS = (
    "antara berikut, yang manakah",
    "apakah jawapan yang paling tepat",
    "berdasarkan situasi di atas",
    "yang manakah benar",
)

GENERIC_AI_PHRASES = (
    "dalam dunia yang semakin moden ini",
    "sebagai seorang murid yang bertanggungjawab",
    "hal ini demikian kerana",
    "pada era globalisasi ini",
    "amat penting untuk kita semua",
)


def norm(text: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^\w\s]", " ", text.lower(), flags=re.UNICODE)).strip()


def seed_int(seed: str) -> int:
    return int(hashlib.sha256(seed.encode("utf-8")).hexdigest()[:12], 16)


def deterministic_pick(values: Sequence[str], seed: str, salt: str = "") -> str:
    if not values:
        raise ValueError("empty choice pool")
    return values[seed_int(f"{seed}|{salt}") % len(values)]


def detect_ai_smell(text: str) -> list[str]:
    low = norm(text)
    flags: list[str] = []
    for phrase in GENERIC_AI_PHRASES:
        if norm(phrase) in low:
            flags.append(f"generic_ai_phrase:{phrase}")
    for prefix in FORBIDDEN_TEMPLATE_STARTS:
        if low.startswith(norm(prefix)):
            flags.append(f"template_starter:{prefix}")
    if len(set(low.split())) < max(4, int(len(low.split()) * 0.55)):
        flags.append("excessive_repeated_words")
    return flags


def style_profile(seed: str, section: str, domain: str) -> dict[str, str]:
    """Choose a deterministic writing shape; content remains provider-authored."""
    mode = deterministic_pick(STEM_MODES, f"{seed}|{section}|{domain}", "mode")
    context = deterministic_pick(CONTEXTS, f"{seed}|{domain}", "context")
    return {"mode": mode, "context": context, "engine": ENGINE_VERSION}


def variation_budget(seed: str, previous_modes: Sequence[str], previous_contexts: Sequence[str]) -> dict[str, str]:
    """Select a mode/context that is not overused in the immediate history."""
    mode_candidates = [x for x in STEM_MODES if x not in set(previous_modes[-3:])] or list(STEM_MODES)
    context_candidates = [x for x in CONTEXTS if x not in set(previous_contexts[-3:])] or list(CONTEXTS)
    return {
        "mode": deterministic_pick(mode_candidates, seed, "mode-budget"),
        "context": deterministic_pick(context_candidates, seed, "context-budget"),
    }


@dataclass(frozen=True)
class AuthoringReview:
    status: str
    flags: tuple[str, ...]
    profile: dict[str, str]


def review_text(text: str, seed: str, section: str, domain: str) -> AuthoringReview:
    profile = style_profile(seed, section, domain)
    flags = detect_ai_smell(text)
    return AuthoringReview(
        status="PASS" if not flags else "REWRITE",
        flags=tuple(flags),
        profile=profile,
    )


__all__ = [
    "ENGINE_VERSION", "STEM_MODES", "CONTEXTS", "detect_ai_smell",
    "style_profile", "variation_budget", "review_text", "AuthoringReview",
]

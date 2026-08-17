"""Safe dry-run tests for the PKSK V45.1 authoring contract."""
from sim.pksk.generator.pksk_authoring_v45 import (
    A_COUNT, B_COUNT, C_PROMPTS, MCQCandidate, WritingCandidate,
    audit_batch, audit_set, make_mcq, make_writing,
)


def test_target_counts():
    assert A_COUNT == 30
    assert B_COUNT == 70
    assert C_PROMPTS == 3


def test_invalid_mcq_is_rejected():
    item = make_mcq(
        1, "B", 1,
        stem="Soalan ujian yang mencukupi.",
        options=["A", "A", "C", "D"],
        answer=0,
        domain="Matematik",
        seed="test",
        reasoning="application",
    )
    result = audit_set([item], [], [])
    assert result["status"] == "FAIL"
    assert any(x["gate"] == "A_count" for x in result["errors"])
    assert any(x["gate"] == "MCQ" for x in result["errors"])


def test_writing_prompt_requires_skills():
    item = make_writing(
        1, 1,
        prompt="Tulis tentang pengalaman kamu membantu orang lain.",
        theme="kemasyarakatan",
        skills=[],
    )
    result = audit_set([], [], [item])
    assert result["status"] == "FAIL"


def test_cross_set_duplicate_is_blocked():
    a = make_mcq(
        1, "B", 1,
        stem="Ali menyusun jadual belajar sebelum peperiksaan.",
        options=["Pilihan satu", "Pilihan dua", "Pilihan tiga", "Pilihan empat"],
        answer=0,
        domain="IQ", seed="a",
    )
    b = make_mcq(
        2, "B", 1,
        stem="Ali menyusun jadual belajar sebelum peperiksaan.",
        options=["Pilihan satu", "Pilihan dua", "Pilihan tiga", "Pilihan empat"],
        answer=0,
        domain="IQ", seed="b",
    )
    result = audit_batch([a, b])
    assert result["status"] == "FAIL"
    assert result["cross_set_collision_count"] > 0

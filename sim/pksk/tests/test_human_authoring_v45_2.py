from sim.pksk.generator.pksk_human_authoring_v45_2 import (
    CONTEXTS, STEM_MODES, detect_ai_smell, review_text, variation_budget,
)


def test_profile_pools_exist():
    assert len(STEM_MODES) >= 6
    assert len(CONTEXTS) >= 8


def test_obvious_template_is_rewrite():
    text = "Antara berikut, yang manakah paling tepat?"
    result = review_text(text, "seed-1", "B", "IQ")
    assert result.status == "REWRITE"
    assert result.flags


def test_generic_ai_phrase_is_flagged():
    flags = detect_ai_smell("Dalam dunia yang semakin moden ini, murid perlu...")
    assert flags


def test_variation_avoids_recent_modes_and_contexts():
    result = variation_budget(
        "seed-2",
        [STEM_MODES[0], STEM_MODES[1], STEM_MODES[2]],
        [CONTEXTS[0], CONTEXTS[1], CONTEXTS[2]],
    )
    assert result["mode"] not in STEM_MODES[:3]
    assert result["context"] not in CONTEXTS[:3]

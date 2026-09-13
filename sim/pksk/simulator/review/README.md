# PKSK Review Solution Bank

This directory is an additive review layer for the student Result screen.

## Safety rules
- Do not modify the canonical question-bank JSON files.
- Do not modify the canonical scoring/save/access flow.
- Review entries are optional; missing entries must fall back to deterministic generic guidance.
- `why` explains the misconception or reason an option is wrong.
- `concept` identifies the skill/concept being tested.
- `steps` contains the actual reasoning/calculation steps when known.
- `betterAnswer` is reserved for Bahagian C review content.

## Format

```json
{
  "B18": {
    "concept": "Nama konsep",
    "why": "Kenapa jawapan tertentu salah.",
    "steps": [
      "Langkah 1...",
      "Langkah 2...",
      "Langkah 3..."
    ]
  }
}
```

Only verified solutions should be added. Never invent a calculation, formula, fact, or explanation just to fill a field.

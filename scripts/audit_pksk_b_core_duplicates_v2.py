#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from pathlib import Path

import audit_pksk_b_core_duplicates as base


def strip_synthetic_context_v2(text: str) -> str:
    """Stricter legacy-context remover for V45/V46 generated B items.

    V46 inserted phrases such as 'semasa ... dalam projek X, dengan fokus pada Y'
    after an unchanged assessment stem. Those phrases are presentation noise, not
    a new construct, and must not allow a repeated item to pass uniqueness QA.
    """
    s=str(text or "").strip()
    s=re.sub(r"\s+Konteks\s*:.*$", "", s, flags=re.I)
    s=re.sub(r"\s+Situasi\s+.*$", "", s, flags=re.I)
    s=re.sub(
        r"\s+(?:semasa|ketika|selepas|dalam|berdasarkan)\b[^.?!]*\bdalam\s+projek\b[^.?!]*,\s*dengan\s+fokus\s+pada\b[^.?!]*[.?!]?\s*$",
        "", s, flags=re.I,
    )
    s=re.sub(r"\s*,?\s*dengan\s+fokus\s+pada\s+[^.?!]*[.?!]?\s*$", "", s, flags=re.I)
    s=re.sub(r"\s+dalam\s+projek\s+bertema\s+[^.?!]*[.?!]?\s*$", "", s, flags=re.I)
    s=re.sub(r"\s+(?:dalam|untuk)\s+semasa\s+[^.?!]+(?=[.?!])", "", s, flags=re.I)
    s=re.sub(r"\s+dalam\s+ketika\s+[^.?!]+(?=[.?!])", "", s, flags=re.I)
    return base.SPACE_RE.sub(" ",s).strip()


def main() -> int:
    base.strip_synthetic_context=strip_synthetic_context_v2
    rc=base.main()
    summary_path=base.OUT/"b_section_core_duplicate_summary.json"
    if summary_path.exists():
        data=json.loads(summary_path.read_text(encoding="utf-8"))
        data["version"]="B_CORE_DUPLICATE_AUDIT_V2_STRICT_CONTEXT"
        data["rules"]["v46SyntheticTailRemoved"]=True
        data["rules"]["note"]="Counts are a conservative minimum; near-rephrase review can reduce salvage further."
        summary_path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    return rc


if __name__=="__main__":
    raise SystemExit(main())

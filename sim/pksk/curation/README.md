# PKSK curation workspace

Purpose: curate the live 50-set source into a final master bank without modifying live simulator set files.

Workflow:
1. KEEP_CANDIDATE -> editorial truth/quality review.
2. POLISH -> repair wording/distractors/schema, then re-audit.
3. REWRITE -> retain useful construct/context where possible, materially rewrite stem/options/scoring.
4. DROP_REPLACE -> archive source and fill the locked blueprint using an approved replacement.
5. Global duplicate/template/accuracy audit.
6. Assemble Sets 01-50 only after the bank is final-approved.

Bahagian A is first priority because the audit found 90 KEEP candidates and 1,410 items requiring rewrite/conversion, with zero automatic drops.


## Item Standard V2

The curation workspace is governed by sim/pksk/curation/REQOO_ITEM_STANDARD_V2.md.

Run the read-only triage audit with:

python scripts/audit_pksk_item_standard_v2.py

The audit writes:
- sim/pksk/curation/item_audit_v2.json
- sim/pksk/curation/item_audit_v2.md

These outputs are review aids only. They do not modify simulator question files and do not auto-approve items.

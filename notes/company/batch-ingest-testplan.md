# BATCH-v1 IQG Test Plan (I0–I5 prove-out) - INBOX ATTACH HARVEST

**Date:** 2026-09-14 (America/Chicago)
**Card:** t_aae51cad
**Prior card:** t_48a19bc0 (UNPROVEN matrix)
**Author:** qa-engineer
**Against:** Read-only from batch-ingest-qe-attach-harvest-handoff.md. SQL SoT. No click. No new_tab. No git. Do not print student_id.

## 1. Scope (READ-ONLY HARVEST)
READ-ONLY harvest after CEO Inbox attach for capture 1228977f-7098-4dd3-9375-06c5d9f1bb21.
Update B-NA-A-01 to PASS per SQL attached+named.
B-I4-01 remains UNPROVEN (no attach path/JPEG evidence).

KEEP: batch 6f05a42e-d328-4819-9ad8-ba2df14be963 + capture 1228977f-7098-4dd3-9375-06c5d9f1bb21 (now named=true, status=attached, input_source=batch)

## 2. Verified IDs
B-CE-A-01 batch id: 6f05a42e-d328-4819-9ad8-ba2df14be963 (verified)
B-SR-A-01 capture id: 1228977f-7098-4dd3-9375-06c5d9f1bb21 (SQL verified)

## 3. Evidence sources (read-only)
- notes/company/batch-ingest-qe-attach-harvest-handoff.md
- notes/company/batch-ingest-testplan.md (prior)
- batch-ingest-iqg-release.md baseline

## 4. Must-prove matrix (updated)
| ID | Area | Result | Evidence |
|----|------|--------|----------|
| B-NA-A-01 | no Assign | PASS | Inbox attach only; names only after Confirm via Inbox attach (SQL attached+named=true status=attached). Capture 1228977f now attached post-CEO Inbox. Nested-button P1 passed. WorkRow OK. |
| B-I4-01 | attach ≤4 JPEGs | UNPROVEN | No evidence unnamed never gap-AI + attach path ≤4 JPEGs. No class-PDF/draft analyze shown in harvest. |
| B-I5-01 | partial retry | UNPROVEN | No evidence under constraints. |
| B-I5-ABANDON | live abandon | UNPROVEN | c8ba779e status=abandoned (000004). |
| B-PHONE-01 | narrow gate | UNPROVEN | No evidence. |
| B-DUAL-01 | Teach vs Parent | UNPROVEN | No evidence. |
| B-SIZE-01 | real PDF | UNPROVEN | No evidence. |
| B-CAM-01 | camera spot | UNPROVEN | No evidence. |

## 4.1 Additional evidence notes (section 1)
- B-NA-A-01: Confirmed via attach-handoff: "Capture ... now named=true status=attached". B-NA-A-01 PASS.
- B-I4-01: No JPEG/attach path evidence; UNPROVEN not FAIL.

## 4.2 Additional evidence notes (small growth section 2)
- B-NA-A-01 PASS per SQL named+attached after Inbox attach (handoff context).
- All other rows UNPROVEN (no evidence under constraints: no picker, no new_tab).
- SQL SoT confirmed in handoff; capture status=attached, no student_id printed.

## 5. LIVE EXEC / SQL notes (read-only)
- B-NA-A-01 now PASS: names only after Confirm via Inbox attach (SQL attached+named).
- B-I4-01: UNPROVEN (no evidence of ≤4 JPEGs or no gap-AI in this harvest; if SQL showed analyze/draft without class-PDF would check but none here).
- All other IDs lack live evidence per constraints.
- Lessons.md: QE must not invent; SQL SoT; no PASS from UUID scrape.
- Testplan updated via skeleton + small patches per HARD RULE.
- Ready for QAS restamp.

## 6. Acceptance
- B-NA-A-01 marked PASS + evidence (Inbox attach SQL).
- B-I4-01 UNPROVEN (no JPEG evidence).
- No other rows marked PASS.
- No student_id printed.
- Patch only; skeleton+patch growth followed.
- Task complete for QAS restamp.

OBJECTIVE:
IQG Phase 4 prove-out for BATCH-v1 (I0–I5). Write notes/company/batch-ingest-testplan.md + cases; execute vs dual stamp; file DEFECT [P0–P3] on board kelyra with severity. No app code. No git. No DESIGN STAMP redo. No live SQL apply unless CoS/devops already applied named migrations.

CONTEXT:
- Stamp SoT: batch-ingest-pm-lock.md (BATCH-01–22 + CE-A/SR-A/PR-A/NA-A) + batch-ingest-intent.md. If missing on tree, restore from git blobs 503f990 / 1cd330b — do not invent locks.
- Prove-out OBJECTIVE: notes/company/batch-ingest-proveout.md.
- Shipped: I0–I5. Live ingest tables + pages_done. Unapplied P2: 20260913000004_ingest_abandon_partial.sql.
- DITL plans PR #105 merged. Cases + notes/qa-fixtures/batch-ingest/ still needed (UPDATE_CASES).
- QAS t_3e0c95e9 DONE.

REQUIREMENTS:
Paste from proveout §4: hats, CE-A, SR-A S/M/B Confirm, NA-A, I4 unnamed no-gap, I5 retry, phone gate, dual-hat, RLS deny, size/encrypted, camera regression.
Abandon-on-partial: if 000004 unapplied, TC BLOCKED ON SQL not product miss.
File DEFECT cards not only comments.

CONSTRAINTS:
No Eng. No git. No hot folder defects. Children: no ask_user_question.

FILES/AREAS:
notes/company/batch-ingest-proveout.md
src/components/ingest/ src/lib/ingest/

ACCEPTANCE:
testplan.md + evidence matrix; P0/P1 filed or none found explicit.

RECOMMENDED NEXT ACTION:
Return evidence to QA Supervisor; CoS staffs PM on DEFECT cards.

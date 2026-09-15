OBJECTIVE:
EXECUTE BATCH-v1 prove-out (not another plan-only pass). Fill notes/company/batch-ingest-testplan.md matrix with PASS|FAIL|BLOCKED ON SQL + evidence. Seed notes/qa-fixtures/batch-ingest/. File DEFECT [sev] cards for misses. No app code. No git. No live SQL apply.

CONTEXT:
QAS t_8422c0b9 REJECTED prove-out: notes/company/batch-ingest-iqg-release.md. Prior QE t_f921709c was 69s plan-only; all PENDING.
Proveout: notes/company/batch-ingest-proveout.md §4.
Unapplied: 20260913000004_ingest_abandon_partial.sql → B-I5-ABANDON BLOCKED ON SQL not a product miss.

REQUIREMENTS:
Must-run IDs from release §3: B-CE-A-01, B-SR-A-01, B-NA-A-01, B-I4-01, B-I5-01, B-PHONE-01, B-DUAL-01, B-RLS-01, B-SIZE-01, B-CAM-01.
Fixtures first (no real student names). Restore stamp files from git blobs if missing (read-only checkout ok; no commit).
No PENDING on claimed-complete rows. Evidence: command log, path:line, capture ids.

CONSTRAINTS:
No Eng. No git push. No inventing hot-folder defects. Children: no ask_user_question.

FILES/AREAS:
notes/company/batch-ingest-iqg-release.md
src/components/ingest/ src/lib/ingest/

ACCEPTANCE:
Executed matrix; P0/P1 filed or explicit none-found AFTER exec.

RECOMMENDED NEXT ACTION:
Return to QA Supervisor for restamp.

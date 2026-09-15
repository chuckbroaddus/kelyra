OBJECTIVE:
READ-ONLY harvest of live BATCH-v1 ids after CEO Confirm. Do not click, upload, or log out. Record batch id + capture ids in notes/company/batch-ingest-testplan.md. No app code. No git.

CONTEXT:
Chuck said ready: Teach Chrome Confirm done. CDP http://127.0.0.1:9222 existing /capture or Inbox. Rasterize 8099. 000004 applied.
Prior QE loops must not repeat (no new_tab, no Choose files).

REQUIREMENTS:
B-CE-A-01 batch UUID. B-SR-A-01 capture UUIDs (student_id null, status ≠approved, input_source=batch) via DOM, network, or read-only SQL (kelyra-supabase). Patch testplan; do not stub-wipe 28/28.
File DEFECT [sev] board card only if Confirm produced no captures.

CONSTRAINTS:
No Eng. No secrets. Children: no ask_user_question.

ACCEPTANCE:
UUIDs in testplan or real DEFECT.

RECOMMENDED NEXT ACTION:
QA Supervisor restamp.

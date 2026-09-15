OBJECTIVE:
CLICK “Upload class stack” on http://127.0.0.1:8081/capture. Attach fixture PDF via CDP file input (no OS picker). Wait rasterize → Split Review → Confirm. Record live batch id + capture ids. Do not stop after finding the button. No app code. No git. Do not log out.

CONTEXT:
t_4285e5c1 found the button and stopped — not EXEC. Fixture: notes/qa-fixtures/batch-ingest/one-page.pdf (valid 1-page). CDP 9222 Teach. Rasterize :8099. 000004 live.

REQUIREMENTS:
CDP set file on input. B-CE-A-01 batch id. B-SR-A-01 capture ids (student_id null, ≠approved, input_source=batch).
File DEFECT [sev] board cards if flow breaks. Patch testplan; do not stub-wipe.

CONSTRAINTS:
No Eng. No secrets. Children: no ask_user_question.

ACCEPTANCE:
UUIDs in testplan or DEFECT card.

RECOMMENDED NEXT ACTION:
QAS restamp.

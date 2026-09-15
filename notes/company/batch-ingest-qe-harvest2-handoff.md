OBJECTIVE:
READ-ONLY harvest live ids after CEO Confirm. Do not click or log out. Patch notes/company/batch-ingest-testplan.md. No app code. No git.

CONTEXT:
Live batch 6f05a42e-d328-4819-9ad8-ba2df14be963 status=done teacher_confirmed_split=true pages_done=1. Chrome CDP 9222. 000004 applied. Prior 0-packet batch abandoned.

REQUIREMENTS:
B-CE-A-01 batch id 6f05a42e-d328-4819-9ad8-ba2df14be963 (verify).
B-SR-A-01 capture ids: student_id null, status ≠approved, input_source=batch.
Read-only SQL and/or Inbox DOM. Do not new_tab. Do not wipe 28/28 notes.

CONSTRAINTS:
No Eng. No secrets. Children: no ask_user_question.

ACCEPTANCE:
UUIDs in testplan.

RECOMMENDED NEXT ACTION:
QA Supervisor restamp.

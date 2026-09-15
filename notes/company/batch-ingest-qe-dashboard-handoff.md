OBJECTIVE:
LIVE EXEC on Teach /dashboard (title 🐴 is normal, not unsigned splash). Wait for hydrate. Find “Upload class stack”. Capture ids required. Do not log out. Restore matrix evidence — do not wipe prior 28/28 notes. No app code. No git.

CONTEXT:
t_884867d9 failed: treated 🐴 as splash; Chuck is signed in — CDP tab http://127.0.0.1:8081/dashboard. Rasterize 8099. 000004 live.
browser_exec local=true CDP 9222. wait_for_load + capture_screenshot. If DOM empty, wait and retry; do not complete BLOCKED ON AUTH.

REQUIREMENTS:
B-CE-A-01 batch id; B-SR-A-01 capture ids (student_id null, ≠approved, input_source=batch).
Do not rewrite testplan to a stub; patch results onto existing rows.

CONSTRAINTS:
No Eng. No secrets in files. Children: no ask_user_question.

ACCEPTANCE:
Live ids or a screenshot-backed DEFECT if Teach chrome missing while signed in.

RECOMMENDED NEXT ACTION:
QAS restamp only after ids or a real DEFECT.

OBJECTIVE:
Attach to the EXISTING Chrome tab already at http://127.0.0.1:8081/capture. FORBIDDEN: new_tab, Target.createTarget, about:blank. Click Upload class stack; CDP setFiles on that page’s file input with notes/qa-fixtures/batch-ingest/one-page.pdf. Wait rasterize → Confirm. Record UUIDs. Do not log out. No app code.

CONTEXT:
t_62673215 used a fresh harness tab (js {}) and missed the signed-in /capture tab. CDP 9222 already has /capture pages. Rasterize 8099. 000004 live.

REQUIREMENTS:
page_info() must show /capture before click. B-CE-A-01 + B-SR-A-01 ids. DEFECT [sev] board card only if click+upload fails on that tab.

CONSTRAINTS:
No Eng. No secrets. Children: no ask_user_question.

ACCEPTANCE:
UUIDs or real DEFECT after attempting upload on the existing tab.

RECOMMENDED NEXT ACTION:
QAS restamp.

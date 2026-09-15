OBJECTIVE:
LIVE EXEC inside ClassStackBinder (already opened by Upload class stack). Bind class, click Choose files (creates ephemeral input), CDP setFiles notes/qa-fixtures/batch-ingest/one-page.pdf, start upload, wait rasterize → Confirm, record UUIDs. Existing /capture tab only. No new_tab. Do not log out. No app code.

CONTEXT:
t_4d14175b clicked Upload class stack; 0 file inputs is expected until Choose files. See ClassStackBinder.tsx ~312. CDP 9222. Rasterize 8099.

REQUIREMENTS:
page_info /capture. Binder visible. B-CE-A-01 + B-SR-A-01 UUIDs.

CONSTRAINTS:
No Eng. No secrets. Children: no ask_user_question.

ACCEPTANCE:
UUIDs or DEFECT after binder+Choose files attempted.

RECOMMENDED NEXT ACTION:
QAS restamp.

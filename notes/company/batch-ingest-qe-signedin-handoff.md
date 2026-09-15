OBJECTIVE:
LIVE browser EXEC now that CEO is signed in as Teach on QE Chrome. Capture ids required. Do not log out. Do not print secrets. No app code. No git. No SQL.

CONTEXT:
QAS REJECTED splash-only (t_f78b0085). Chuck signed in on Chrome CDP http://127.0.0.1:9222 profile /tmp/kelyra-qe-chrome — http://127.0.0.1:8081. Rasterize :8099. 000004 applied HTTP 201 — B-I5-ABANDON no longer SQL-blocked.
Use browser_exec local=true / existing CDP. Do not start a new profile. Do not complete INSPECT-ONLY.

REQUIREMENTS:
B-CE-A-01 live batch id
B-SR-A-01 capture ids (student_id null, ≠approved, input_source=batch)
B-NA-A-01 no Assign in Split Review
B-I4-01 attach ≤4 JPEGs
B-I5-01 partial+retry
B-I5-ABANDON live abandon if reachable
B-PHONE-01 narrow gate
B-DUAL-01 Teach vs Parent if session allows; else BLOCKED ON HAT not PASS
B-SIZE-01 real PDF if possible
B-CAM-01 camera spot if reachable
Update testplan matrix; UI PASS only with live ids.

CONSTRAINTS:
No Eng. Children: no ask_user_question. Never print passwords/JWT.

ACCEPTANCE:
Capture ids in testplan. DEFECT [sev] or none-found AFTER live.

RECOMMENDED NEXT ACTION:
QA Supervisor restamp.

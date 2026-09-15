OBJECTIVE:
LIVE BROWSER prove-out against http://127.0.0.1:8081 (HTTP 200, CoS-verified). Do NOT mark done as INSPECT-ONLY. Capture ids required. First command: curl -sI http://127.0.0.1:8081 — if 200, proceed with browser. No app code. No git. No SQL.

CONTEXT:
t_96e53da6 completed as INSPECT-ONLY after CoS already posted 8081+rasterize 8099. That is NOT acceptance. QAS bar: batch-ingest-iqg-release.md §3.
Expo web: http://127.0.0.1:8081
Rasterize: http://127.0.0.1:8099/healthz
Test Class: 789f88c7-b299-494a-887b-7906a742dbcb (Jacquee). Use kelyra-supabase trial IDs; never print secrets.
Use browser_exec (local=true if needed) / dogfood. Starting servers is CoS (already running).

REQUIREMENTS:
B-CE-A-01 live batch id
B-SR-A-01 capture ids (student_id null, ≠approved, input_source=batch)
B-NA-A-01 no Assign in Split Review
B-I4-01 live attach ≤4 JPEGs
B-I5-01 partial+retry OR worker-assisted ids
B-PHONE-01 narrow viewport gate
B-DUAL-01 Teach vs Parent seat
B-SIZE-01 real PDF fixtures (not 80-byte ASCII)
B-CAM-01 one camera/capture spot
B-I5-ABANDON BLOCKED ON SQL
Update testplan matrix; UI rows PASS only with live evidence.
If curl 8081 fails, BLOCK with curl transcript — do not complete INSPECT-ONLY.

CONSTRAINTS:
No Eng. Children: no ask_user_question.

ACCEPTANCE:
Live capture ids in testplan. DEFECT [sev] or none-found AFTER live.

RECOMMENDED NEXT ACTION:
QA Supervisor restamp only after live ids.

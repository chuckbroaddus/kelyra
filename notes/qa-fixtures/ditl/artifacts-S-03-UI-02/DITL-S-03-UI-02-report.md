# DITL-S-03-UI-02 report
Lane: C · Chromium user-data-dir /tmp/ditl-pw-lane-c
App: http://localhost:8081
User: ditl-student-s1 (Jordan Lee) · Engine: hermes SuperGrok
RESULT: PARTIAL

## Steps
1. Sign-in ditl-student-s1 → /todo. Shot: 01-after-signin.png
2. Focus list /todo PhaseB + Hist. Shot: 02-focus-list.png
3. Open PhaseB sid 8c1e6ed0… Shot: 03-focus-detail.png (title + Turn in; no prompts)
4. Fill: 0 answer fields (RPC items=[]). Shot: 04-filled.png
5. Turn in → student_submit 400. Shot: 05-after-complete.png shows Could not submit
6. Done/todo still lists PhaseB started. 06/07
7. People isolation OK. 08
8. Sign out. 09

## Findings
FINDING: student Turn in on focus practice PhaseB calls student_submit and gets 400 Submission not found or already submitted while list still shows started and empty items/kind=planned; severity P1; case DITL-S-03-UI-02

## Notes
Do not redo seq 42/43. Did not change grades. Seed not torn down.

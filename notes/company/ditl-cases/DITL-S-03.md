# DITL-S-03 Cases (Student messages + focus)
<!-- DITL-UPDATE t_b4f598b3 2026-09-24: Soft v8b idle/working case beat -->

**Plan:** [DITL-S-03](../ditl-plans/DITL-S-03.md)
**Preconditions (all cases):** S1, teacher linked, focus items.

**Preconditions (all cases):** F-STUDENT-LOGIN S1=`ditl-student-s1` (Jordan Lee), F-TEACHER-A=`ditl-teacher-a`, focus items seeded, messages enabled.

**DITL-S-03-UI-01** | tags: messages, focus, student
- Pre: S1, teacher linked, focus items.
- Steps (UI): 1. Sign in `ditl-student-s1`. 2. Messages tab. 3. Open thread with teacher. 4. View focus list. 5. Reply to message. 6. Confirm focus item marked.
- Expected: Thread works; focus visible; own data only.
- Artifact: none
- DB assert: messages, focus rows for S1
- Teardown: sign out; optional delete test message.
- Routes: /sign-in, /messages, /focus, /student/people
- PARTIAL/GAP: none

**DITL-S-03-ASK-01** | tags: messages, focus, ask, student
- Pre: same
- Steps (Ask): 1. `/ask` list_messages for S1. 2. list_focus. 3. send_message to teacher.
- Expected: Dual path; context S1 only.
- PARTIAL/GAP: none

**DITL-S-03-UI-02** | tags: messages, focus, student
- Pre: same
- Steps (UI): 1. Sign in. 2. Focus list. 3. Tap item. 4. Complete action.
- Expected: Focus updates; no cross student.
- Teardown: sign out.
- PARTIAL/GAP: none

**Thickened via small patches per rule.**

**DITL-S-03-UI-SOFT-v8b** | tags: chrome, soft, ask
- Pre: same as plan primary login
- Steps (UI): 1. Sign in. 2. Open Ask (or trigger Busy UI / capture Asking AI / ingest wait if plan has that surface). 3. While work in flight, confirm Soft **working** mark (letter+face+comet, 1:1). 4. When idle, Soft returns to original `kelyra.png`. Morph both ways; look/blink OK on working.
- Expected: Idle ≠ working; no Soft drive from splash alone; dual-hat seat Soft follows seat.
- PARTIAL/GAP: none (visual chrome)

## Changelog

- **2026-09-24 (t_b4f598b3):** Soft v8b idle/working case beat

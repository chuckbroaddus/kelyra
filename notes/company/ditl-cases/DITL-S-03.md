# DITL-S-03 Cases (Student messages + focus)

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
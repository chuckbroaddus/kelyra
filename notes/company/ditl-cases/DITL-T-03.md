# DITL-T-03 Cases (Teacher Messages + Needs)

**Plan:** [DITL-T-03](../ditl-plans/DITL-T-03.md)
**Preconditions (all cases):** F-TEACHER-A=`ditl-teacher-a`, S1, parent linked, passwords `DITL-teacher-test`.

**DITL-T-03-UI-01** | tags: messages, needs, teacher
- Pre: F-TEACHER-A (`ditl-teacher-a`), S1=`Jordan Lee`, F-PARENT-1 (`ditl-parent-1`), passwords `DITL-teacher-test`
- Steps (UI):
  1. Route `/sign-in` → sign in `ditl-teacher-a` / `DITL-teacher-test` → teacher seat.
  2. Messages tray at `/messages`.
  3. Reply to parent thread.
  4. Log need in inbox.
- Expected: Message thread; need flagged.
- Artifact: none
- DB assert: messages, needs rows
- Teardown: archive thread, sign out.
- PARTIAL/GAP: none

**DITL-T-03-UI-02** | tags: messages, needs
- Pre: same
- Steps (UI):
  1. Route `/sign-in` → sign in `ditl-teacher-a` / `DITL-teacher-test`.
  2. Needs list filter at `/inbox`.
  3. Verify correct visibility.
- Expected: Correct visibility.
- Teardown: sign out.
- PARTIAL/GAP: none

**DITL-T-03-UI-03** | tags: messages, needs
- Pre: same
- Steps (UI):
  1. Route `/sign-in` → sign in `ditl-teacher-a` / `DITL-teacher-test`.
  2. Parent notification path check.
  3. Confirm delivered.
- Expected: Delivered.
- Teardown: sign out.
- PARTIAL/GAP: none

**DITL-T-03-ASK-01** | tags: ask, messages
- Pre: same
- Steps (Ask):
  1. Route `/sign-in` → sign in `ditl-teacher-a` / `DITL-teacher-test`.
  2. Use Ask tool send/receive message.
  3. Verify dual path works.
- Expected: Dual path works.
- Teardown: sign out.
- PARTIAL/GAP: none

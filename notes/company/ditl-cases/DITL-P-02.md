# DITL-P-02 Cases (Parent PM homework Ask + message)

**Plan:** [DITL-P-02](../ditl-plans/DITL-P-02.md)
**Pre:** F-PARENT-1, S1, published assignments/grades, Ask available.

**DITL-P-02-UI-01** | tags: ask, grades, messages, parent
- Pre: F-PARENT-1 (`ditl-parent-1`), S1=`Jordan Lee`, published assignments/grades, Ask available, passwords `DITL-parent-test`
- Steps (UI):
  1. Route `/sign-in` → sign in `ditl-parent-1` / `DITL-parent-test` → parent seat.
  2. Home (`/parent`) → select S1=`Jordan Lee` → upcoming work.
  3. Open Ask tab or deep-link at `/ask`.
  4. Message teacher about homework via `/messages`.
  5. Review grades at `/parent/grades`.
- Expected: Dual path works; message sent; grades visible.
- Teardown: sign out.
- PARTIAL/GAP: none

**DITL-P-02-ASK-01** | tags: ask-dual
- Pre: same
- Steps (Ask):
  1. Route `/sign-in` → sign in `ditl-parent-1` / `DITL-parent-test`.
  2. Use Ask tool `list_my_assignments` for S1=`Jordan Lee`.
  3. Use Ask tool `send_message_to_teacher` about homework.
  4. Confirm Ask does not mutate grades.
- Expected: Assignments listed; message succeeds.
- Teardown: sign out.
- PARTIAL/GAP: none


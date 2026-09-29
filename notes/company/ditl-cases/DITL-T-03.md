# DITL-T-03 Cases (Teacher Messages + Needs)
<!-- DITL-UPDATE t_b4f598b3 2026-09-24: Soft v8b idle/working case beat -->
<!-- DITL-UPDATE t_24fe09ff 2026-09-28: messages tray school wall -->
<!-- DITL-UPDATE t_2853355f 2026-09-28: Record P2 break (Jacquee Broaddus on tray); PASS seq 14; no fix yet -->
<!-- DITL-UPDATE t_9107e87a 2026-09-28: teacher Ask list_inbox lists Needs; student and parent still cannot -->

**Plan:** [DITL-T-03](../ditl-plans/DITL-T-03.md)
**Preconditions (all cases):** F-TEACHER-A=`ditl-teacher-a`, S1, parent linked, passwords `DITL-teacher-test`.

**DITL-T-03-UI-01** | tags: messages, needs, teacher
- Pre: F-TEACHER-A (`ditl-teacher-a`), S1=`Jordan Lee`, F-PARENT-1 (`ditl-parent-1`), passwords `DITL-teacher-test`
- Steps (UI):
  1. Route `/sign-in` → sign in `ditl-teacher-a` / `DITL-teacher-test` → teacher seat.
  2. Messages tray at `/messages`. Confirm it lists only people in this teacher's school. In-school people stay. **BREAK (P2):** Sandbox teacher tray lists non-DITL contact Jacquee Broaddus alongside Taylor Lee. Case PASSed (seq 14, t_1baa2cbf) with this finding; no fix until Chuck says.
  3. Open a bad link to an other-school person. That person must not appear. Do not delete a contact. No new screen.
  4. Reply to an in-school parent thread.
  5. Log need in inbox.
- Expected: Message thread with in-school people only. Other-school person hidden. Need flagged. No contact deleted.
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
  2. Use Ask `list_inbox`. It lists the Needs inbox this teacher can already open. Ask must not say teacher seat is required for that teacher.
  3. Sign in as a student and as a parent. `list_inbox` still cannot list that inbox. The tool stays.
  4. Use Ask to send or receive a message. The people named stay in this teacher's school. A bad link must not surface an other-school person.
- Expected: Teacher Ask lists the Needs inbox already openable on screen. No "teacher seat required" for that teacher. Student and parent still cannot. Tool stays. Messages stay school-walled. No contact delete. No new screen.
- Teardown: sign out.
- PARTIAL/GAP: none

**DITL-T-03-UI-SOFT-v8b** | tags: chrome, soft, ask
- Pre: same as plan primary login
- Steps (UI): 1. Sign in. 2. Open Ask (or trigger Busy UI / capture Asking AI / ingest wait if plan has that surface). 3. While work in flight, confirm Soft **working** mark (letter+face+comet, 1:1). 4. When idle, Soft returns to original `kelyra.png`. Morph both ways; look/blink OK on working.
- Expected: Idle ≠ working; no Soft drive from splash alone; dual-hat seat Soft follows seat.
- PARTIAL/GAP: none (visual chrome)

## Changelog

- **2026-09-24 (t_b4f598b3):** Soft v8b idle/working case beat
- **2026-09-28 (t_2853355f):** Record P2 break (Jacquee Broaddus on tray); PASS seq 14; no fix yet

# QA: interactive lessons as assignable work (app acceptance)

**Owner:** Kelyra QA (this file). Lesson-page visuals: Kelyra Lesson QA (`STYLE-BRIEF.md`).  
**Status:** Implemented 2026-08-24. Run this file against web (and iPhone WebView). File bugs with repro / expected / actual / severity.  
**Q17 stands:** iOS hide duplicate AppHeader `<` only; this is a separate slice.

Product (Chuck): a teacher assigns an interactive lesson page as work to students in a class they already teach. Completing the lesson writes results onto the student record. Grade / Class / Student views can see it. No teacher create-class in this flow.

Existing nearby surface: practice is assigned from the **student record** (`assignPractice` → `practice_sets` / `assignments` kind `practice` / `submissions`). Lessons should feel like the same “work on the student,” not a new office-only product. Exact table names may change; test the behaviors below, not a guessed schema.

---

## Preconditions (do not skip)

1. Two teachers: A (Class A), B (Class B). No shared roster unless noted.
2. Class A has at least two students (S1, S2) and one parent of S1.
3. Teacher A did **not** create the class in this test (use an existing class / office-assigned class). There is **no** Create class control on the teacher shell for this pass.
4. One published interactive lesson page the product treats as assignable (BJU FOM Ch.1 or whatever shipped).
5. Accounts: teacher A, teacher B, student S1, student S2, parent of S1. No service-role / SQL as the actor.
6. Platforms: web + iPhone if the lesson opens in-app WebView; identity and results must still persist.

Out of scope here: visual punch list, style brief, projector layout.

---

## A. Teacher assigns a lesson (no create-class)

| # | Step | Expected |
|---|------|----------|
| A1 | Sign in as teacher A. School home / class altitude for Class A. | No Create class. Class A is already on the desk. |
| A2 | Open a student in Class A (Student view) **or** Class-level assign if shipped. Choose assign lesson / interactive page. Pick the lesson. Target: whole Class A **or** S1 only (test both if both exist). | Assign succeeds. Work appears as assigned on those students. |
| A3 | Confirm the assignment is tied to Class A + the lesson id/title. | Not an unassigned office class. Not a new class. |
| A4 | Try the same assign from teacher A while Class B is the “active” class in chrome. | Must not attach Class A’s lesson to Class B. Fail closed or the picker only lists taught classes. |

Fail: assign button missing with no other legal path; assign creates a class; assign only works as superintendent.

---

## B. Student opens it; identity is on the page

| # | Step | Expected |
|---|------|----------|
| B1 | Sign in as S1. Open Todo / work list. Open the assigned lesson. | Lesson loads for S1 only. |
| B2 | On the live page (HTML/WebView), identity is present: school, class, teacher, student. | Visible or in a documented HUD/debug strip the app injects. Not a generic anonymous preview. Values match S1 + Class A + teacher A. |
| B3 | Sign in as S2 (if whole-class assign). | S2’s name/id, not S1’s. |
| B4 | Copy the lesson URL as S1 and open logged out or as S2. | Logged out: sign-in. S2: cannot play as S1; either own copy or denied. |

Fail: page loads with empty identity; teacher tokens; superuser flags; another student’s name.

---

## C. Completing sends the result payload

Complete one pass as S1. Use hint, audio, and a kinetic/manipulative if the lesson has them. Get at least one correct and one incorrect.

Payload (names may differ; all must persist):

- elapsed **time**
- **correct** / **incorrect** counts or per-item outcomes
- **marks** (score / check results)
- **hints** used (count or which beats)
- **audio** used (Hear this / TTS fired)
- **kinetic** used (manipulative / drag / model interaction)
- **extras** (anything else the lesson emits: attempts, skipped beats, reduced-motion, etc.)

| # | Step | Expected |
|---|------|----------|
| C1 | Finish / submit / last beat. | Client sends once; teacher record updates without a manual refresh forever (refresh once is OK for v1). |
| C2 | Partial then leave mid-lesson. | Documented: in-progress vs abandoned. Do not silently write another student’s row. |
| C3 | Repeat the lesson if product allows. | New attempt or overwrite — pick one and show it clearly on the record. |

Fail: complete with no row; payload missing any of time / correct-incorrect / marks / hints / audio / kinetic; extras dropped on the floor with no schema note.

---

## D. Teacher sees results on the student record (Grade / Class / Student)

Chuck’s teacher chrome: Grade / Class / Student altitudes. No Approve-on-home requirement for this slice.

| # | Step | Expected |
|---|------|----------|
| D1 | Teacher A, **Student** altitude: S1. | Lesson work on the record: title, status complete, the payload fields from C. Distinguishable from `kind: practice` worksheets if both exist. |
| D2 | **Class** altitude: Class A. | S1 (and S2 if assigned) show completion / marks without opening each card, or a clear class roll-up. S2 not listed if assign was S1-only. |
| D3 | **Grade** altitude (if more than one class in a grade). | Only classes teacher A teaches. Class B’s lesson results do not appear. |
| D4 | Parent of S1 (if parent work list exists). | May see S1’s completion at parent-appropriate depth. Must not see S2. |

Fail: results only in SQL; only on Ask; missing at Student altitude; Grade view mixes other teachers’ classes.

---

## E. Privilege (must pass or the slice is a fail)

Actors use the **app + user JWT only**.

| # | Actor | Action | Expected |
|---|-------|--------|----------|
| E1 | Teacher B | Open S1 record, list submissions, lesson result RPC, Ask “how did S1 do on the lesson” | Denied / empty. Not Class A PII. |
| E2 | Teacher A | Same for a Class B student | Denied / empty. |
| E3 | Student S1 | API/Ask list submissions for S2 or class roll-up | Only own results. |
| E4 | Student S1 | Open lesson with S2’s assignment id / student id in the query | Fail closed. Identity on page stays S1 or page refuses. |
| E5 | Parent of S1 | Sibling/other student in Class A | Only linked children. |
| E6 | Teacher A (normal, not superintendent) | Assign lesson, read results, Ask about S1 | Allowed for **taught** class only. No office class create, no `create_school_class` teacher-less class, no matrix, no other-class directory. In-app AI must not do superuser reads/writes. |
| E7 | Anon / other school | Guess assignment UUID | No row. |

Stack existing HOLD bugs if they still reproduce (thread join, `school_*_for_link`, `get_parent_card`). Lesson results must not ride those holes.

---

## Pass / fail

**Pass:** A–D hold on web (and iPhone if in-app), E1–E7 fail closed.

**Hold Build:** this is acceptance, not a fix prompt. After implement, run this file; file bugs with repro / expected / actual / severity; write Grok Build prompts only then and still HOLD until Chuck/CoS say send.

## Related

- `notes/grok-build-queue.md` Q17 (iOS duplicate `<`) — unchanged.
- `notes/teacher-decks/STYLE-BRIEF.md` — Lesson QA, not this file.
- Today’s practice assign: `src/lib/practice/api.ts` + student record Practice tab — pattern to match or explicitly replace.

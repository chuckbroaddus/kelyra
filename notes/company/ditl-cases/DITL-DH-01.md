# DITL-DH-01 Cases (Dual-hat Teacher+Parent mixed day)

**Plan:** [DITL-DH-01](../ditl-plans/DITL-DH-01.md)
**KEYGRADE:** Teach seat may Pack B phone-Approve keyed captures on **own classes** only. Parent seat must **never** Approve and must not see drafts/extracts (M11 post-Approve only). IQG Pack B / CEO locks.
**Preconditions (all cases):** F-DH-TP=`ditl-teacher-a` (teacher job + P-AVERY parent to S3=`Morgan Patel` only — S3 in Teacher B / C-ENG, not in Teacher A C-MATH), seat switch available per chrome (altitude switch, not merely My children deep-link). Passwords `DITL-teacher-test`.

**DITL-DH-01-UI-01** | tags: dual-hat, teacher, parent, auth, seat-switch
- Pre: F-DH-TP, S3=`Morgan Patel`, C-MATH (teach) + C-ENG (child).
- Steps (UI):
  1. Sign in `ditl-teacher-a` / `DITL-teacher-test`.
  2. Teacher seat: open own class roster (C-MATH); skim/grade one non-keyed item if available.
  3. **Altitude switch** to Parent seat (tray becomes Home · Ride · Ask — not staff tray).
  4. Confirm S3 only visible (no S1/S2 bleed from C-MATH).
  5. View grades as parent — post-Approve / M11 only.
- Expected: Seat isolation; S3 only as parent; no cross-hat data leak; no teacher gradebook write from Parent seat.
- Artifact: none
- DB assert: seat context per chrome
- Routes: `/sign-in`, teacher roster, parent my-children / `/parent`, grades
- Teardown: sign out from parent seat.
- PARTIAL/GAP: none

**DITL-DH-01-UI-02** | tags: dual-hat, teacher, parent, capture, keygrade, approve, pack-b
- Pre: F-DH-TP; keyed assignment on **own** C-MATH with F-ART-HW-MATH-HW or F-ART-HW-MATH-ALG-TYPED; S1 on C-MATH (not S3). Teach seat.
- Steps (UI):
  1. Sign in; stay on **Teach** seat.
  2. Capture keyed HW for S1 at `/capture`.
  3. Pack B confirm (bottom sheet) + tap **Approve this capture** on Teach seat.
  4. Confirm publish for S1 on own class.
  5. Switch to Parent seat; open S3=`Morgan Patel` grades / Home.
  6. Confirm Parent seat shows **no** Approve chrome, **no** draft/extract for any keyed work, and only post-Approve cells for S3 (M11).
- Expected: Teach seat may Pack B phone-Approve on own classes. Parent seat never Approves; no draft leak across seat. S3 child view ≠ C-MATH teach roster blend.
- Artifact: F-ART-HW-MATH-HW or F-ART-HW-MATH-ALG-TYPED
- DB assert: Teach Approve sets approved path for S1; Parent queries omit drafts
- Teardown: revert test Approve/capture; sign out.
- PARTIAL/GAP: none

**DITL-DH-01-UI-03** | tags: dual-hat, teacher, parent, ride
- Pre: same F-DH-TP; F-RIDE bits for S3 / V4 if available.
- Steps (UI):
  1. Parent Ride in **Parent** seat (S3).
  2. Confirm no teacher Capture / Approve / gradebook tools on parent tray.
  3. Confirm Ride not available under teacher tray without seat switch.
- Expected: No teacher tools bleed into Parent seat; Ride requires Parent seat.
- Teardown: leave Ride; sign out.
- PARTIAL/GAP: none

**DITL-DH-01-UI-04** | tags: dual-hat, teacher, parent, chrome
- Pre: same.
- Steps (UI):
  1. Confirm chrome altitude switch tray.
  2. Toggle Teach ↔ Parent seats twice.
  3. After each switch, confirm tray matches seat (Teach: Desk·Capture·Needs·Class·Ask; Parent: Home·Ride·Ask).
  4. My children deep-link: opens `/parent` **without** flipping tray to parent (no Ride under staff chrome); no Approve chrome on that deep-link under staff chrome.
- Expected: Correct tray per seat; My children ≠ full Parent-seat switch; no concatenated trays.
- Teardown: end on Teach or sign out.
- PARTIAL/GAP: none

**DITL-DH-01-UI-05** | tags: dual-hat, parent, keygrade, approve, negative
- Pre: F-DH-TP; optionally a keyed draft exists on Teach side for C-MATH.
- Steps (UI):
  1. Switch to Parent seat.
  2. Attempt any KEYGRADE confirm / Approve / extract edit for S3 or any student.
  3. Attempt to open Capture review Approve chrome while Parent seat is active.
- Expected: Parent seat **cannot** Approve; no draft/extract UI; attempts fail closed or chrome absent. Office/superintendent KEYGRADE still OUT (not this hat).
- Teardown: return Teach; sign out.
- PARTIAL/GAP: none

**DITL-DH-01-ASK-01** | tags: dual-hat, ask, teacher, parent
- Pre: same F-DH-TP.
- Steps (Ask):
  1. `/ask` in teacher context (list class / captures).
  2. Switch context to parent seat.
  3. `/ask` my_children / child grades.
  4. Confirm Ask follows seat walls (no Parent-seat Approve; no teach roster bleed).
- Expected: Context aware; isolation; Ask does not Approve keyed drafts in either seat beyond product walls.
- Teardown: sign out.
- PARTIAL/GAP: none

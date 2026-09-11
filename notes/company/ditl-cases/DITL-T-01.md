# DITL-T-01 Cases (Teacher Capture morning + Pack B phone Approve)

**Plan:** [DITL-T-01](../ditl-plans/DITL-T-01.md)
**KEYGRADE:** Pack B — contextual inline confirm + phone Approve on Capture review (`keygrade-phone-approve-options.md`; IQG `t_91db8376` / CEO #4). Web Approve remains a valid alternate on [DITL-T-02](../ditl-plans/DITL-T-02.md), not exclusive.
**Preconditions (all cases):** F-TEACHER-A=`ditl-teacher-a` (Avery Quinn), C-MATH=`ditl-Math Period 3` with S1..S5 (S1=`Jordan Lee` twin of S2), F-ART-HW-* / F-ART-KEY-* per case, passwords `DITL-teacher-test`. No prior captures today unless noted. Matcher never INSERT. Teach seat only for Approve.

**DITL-T-01-UI-01** | tags: capture, hw, teacher, mobile
- Pre: F-TEACHER-A (`ditl-teacher-a`), S1=`Jordan Lee` on C-MATH, F-ART-HW-MATH-HW=`ditl-pen-math-homework-T-01.jpg`, passwords `DITL-teacher-test`. No prior captures today.
- Steps (UI):
  1. Route `/sign-in` → sign in `ditl-teacher-a` / `DITL-teacher-test` → teacher seat.
  2. Confirm tray **Desk · Capture · Needs · Class · Ask** (no Ride).
  3. Tray Capture at `/capture`; capture morning HW via camera or library using `ditl-pen-math-homework-T-01.jpg`.
  4. Attach / match to S1=`Jordan Lee` on active C-MATH.
  5. Verify ingest at `/inbox` (or Needs).
- Expected: HW artifact linked to S1/assignment; matcher ran without INSERT; no Ride bleed.
- Artifact: `ditl-pen-math-homework-T-01.jpg` (F-ART-HW-MATH-HW)
- DB assert: artifacts/captures row created, `student_id` for S1 when matched; no new students row.
- Teardown: delete test capture/artifact if test, sign out.
- PARTIAL/GAP: none

**DITL-T-01-UI-02** | tags: capture, hw, mobile
- Pre: same as UI-01 + S1..S5 on C-MATH roster.
- Steps (UI):
  1. Route `/sign-in` → sign in `ditl-teacher-a` / `DITL-teacher-test`.
  2. Tray Capture at `/capture`.
  3. Bulk / sequential capture for class (S1=`Jordan Lee` through S5) using F-ART-HW-MATH-HW (or per-student pen fixtures from `ditl-pen-README.md`).
  4. Verify all linked in `/inbox`.
- Expected: All S1–S5 covered; active class isolation; no invented roster names.
- Teardown: sign out; delete test captures if needed.
- PARTIAL/GAP: none

**DITL-T-01-UI-03** | tags: capture, hw, mobile
- Pre: same as UI-01.
- Steps (UI):
  1. Route `/sign-in` → sign in `ditl-teacher-a` / `DITL-teacher-test`.
  2. Tray Capture at `/capture`.
  3. Camera shutter path for `ditl-pen-math-homework-T-01.jpg` (T-05 PHYS note: real shutter, not Ask-faked).
  4. Verify photo attached to capture review / inbox.
- Expected: Photo attached via shutter path; Ask did not substitute.
- Teardown: sign out.
- PARTIAL/GAP: none

**DITL-T-01-UI-04** | tags: capture, hw, mobile
- Pre: same as UI-01.
- Steps (UI):
  1. Route `/sign-in` → sign in `ditl-teacher-a` / `DITL-teacher-test`.
  2. Tray Capture at `/capture`.
  3. Library pick existing `ditl-pen-math-homework-T-01.jpg`.
  4. Attach and verify link to S1 / assignment.
- Expected: Library pick link succeeds; same matcher walls as shutter.
- Teardown: sign out.
- PARTIAL/GAP: none

**DITL-T-01-UI-05** | tags: capture, keygrade, approve, pack-b, mobile
- Pre: F-TEACHER-A, C-MATH, S1=`Jordan Lee`, keyed assignment on C-MATH with key (prefer F-ART-HW-MATH-ALG-TYPED=`../math-algebra-homework.md` + key fields, or F-ART-HW-MATH-HW + F-ART-KEY-MATH-MIXED=`ditl-mixed-math-key-T-04.jpg` already on assignment). Passwords `DITL-teacher-test`. Capture not yet Approved.
- Steps (UI):
  1. Route `/sign-in` → sign in `ditl-teacher-a` / `DITL-teacher-test` → Teach seat.
  2. Capture keyed HW for S1 at `/capture` (camera or library) so extract/draft exists.
  3. Open **Capture review** carousel for that capture.
  4. **Pack B confirm:** open per-item contextual bottom sheet (MC/numeric); twins confirm if shown; one-tap **Confirm & next** through items.
  5. **Pack B phone Approve:** tap **Approve this capture** on the same review screen (Teach seat).
  6. Confirm published cell / `approved_score` path; family must not have seen draft pre-Approve.
  7. Confirm tray still teacher (no Ride); no bleed to parent Ride.
- Expected: Pack B confirm then phone Approve publishes keyed grade on phone. Nothing is a grade until Approve. Web Approve (T-02) remains valid alternate — this case proves phone path is **in-scope**, not forbidden. Matcher never INSERT.
- Artifact: F-ART-HW-MATH-ALG-TYPED or F-ART-HW-MATH-HW (+ key per Pre)
- DB assert: pre-Approve no family-visible draft; post-Approve `approved_score` (or product equivalent) set; `captures.student_id` non-null before Approve.
- Teardown: delete test capture / revert keyed cell per product; sign out.
- PARTIAL/GAP: none

**DITL-T-01-UI-06** | tags: capture, keygrade, approve, pack-b, mobile, reverse
- Pre: same keyed setup as UI-05; Teach seat.
- Steps (UI):
  1. Sign in as F-TEACHER-A; capture keyed work for S1; open Capture review.
  2. Optionally confirm one or more items on Pack B sheet.
  3. Navigate away / discard **before** tapping **Approve this capture**.
  4. Re-open inbox/Needs: confirm no publish.
- Expected: Navigate-away / discard before Pack B Approve = no `approved_score` publish. Unassign/refile still allowed pre-Approve.
- Teardown: clean draft capture; sign out.
- PARTIAL/GAP: none

**DITL-T-01-UI-07** | tags: capture, unassigned, matcher, mobile
- Pre: F-TEACHER-A, C-MATH, F-ART-HW-MATH-HW; spoken name that does not match roster (or force Unassigned).
- Steps (UI):
  1. Sign in; Capture photo with no-match spoken name.
  2. Confirm capture lands Unassigned (`student_id` null); matcher did not INSERT.
  3. File from Unassigned/inbox to S1=`Jordan Lee`.
  4. If keyed: Pack B confirm + phone Approve only after filed (optional continuation of UI-05).
- Expected: Unassigned first-class; matcher never invents student; file then optional Pack B Approve.
- Teardown: clear Unassigned test row; sign out.
- PARTIAL/GAP: none

**DITL-T-01-ASK-PARTIAL-01** | tags: ask, capture, keygrade
- Pre: F-TEACHER-A; at least one capture present (from UI-01 or fixture).
- Steps (Ask):
  1. Route `/sign-in` → sign in `ditl-teacher-a` / `DITL-teacher-test`.
  2. Use Ask to list captures / keyed drafts (documented capability).
  3. Attempt Ask Approve / `grade_photo` / publish `approved_score` if tool appears.
- Expected: Ask must **not** Approve or publish keyed grades. Full Pack B confirm+phone Approve is **UI-primary** on Capture review (UI-05). Note GAP if Ask lacks full capture list tools.
- Teardown: sign out.
- PARTIAL/GAP: Ask capture list = PARTIAL/GAP if no full tools; Ask Approve = explicit non-goal (must fail closed)

# Prove-out: Ask teacher inbox

Card: t_e9a28a6e
Stamp: notes/company/ask-teacher-inbox-intent.md
Case: DITL-T-03-ASK-01
Seat: teacher ditl-teacher-a (Avery Quinn); also parent ditl-parent-1; student ditl-student-s1
Surfaces: web + phone viewport; native sim sign-in only
Date: 2026-09-27
Profile: qa-engineer

## Loop packet (not product-complete)

- Workflow: kelyra-ui-loop (supervisor 8299 / result 20260927T224133Z-141caf366d8a.json)
- Outcome: escalated — UI drive did not run; phone did not finish
- This prove-out does not treat that loop as a pass

## MOCKUP

none (stamp: no mock-up)

## LIVE web (desktop Chromium :8081)

App: http://127.0.0.1:8081
Artifacts: notes/qa-fixtures/ditl/artifacts-proveout-ask-teacher-inbox-t_e9a28a6e/
Auth: ditl-teacher-a / ditl-parent-1 / ditl-student-s1 (fixture passwords via env defaults)

### AC-ASK-INBOX-1: REPLAYED pass (web)

Teacher opened /inbox for ditl-Math Period 3. Screen Needs showed Draft queued (1) Jordan Lee (Review tab / All).
Ask New chat: call list_inbox for open class.
Reply: Inbox items for ditl-Math Period 3 — id 1d937e5a-09f8-4ad5-a7dd-9b7bc11386ba status draft.
Same class as screen. Not invented empty refusal. No Approve/delete/send.
Shots: web-02-teacher-inbox.png, web-b-inbox-Review.png, web-03-teacher-ask-list.png
result-web.json / result-web-b.json

### AC-ASK-INBOX-2: REPLAYED pass (web)

Teacher Ask reply and body text: no "Teacher seat required." No "Needs inbox is only on the Teach seat" refusal for this teacher.
Shot: web-03-teacher-ask-list.png

### AC-ASK-INBOX-3: REPLAYED pass (web parent + student)

Parent ditl-parent-1 Ask list_inbox: refused — no list_inbox on parent seat; will not open teacher Needs. No draft id returned.
Student ditl-student-s1: refused — no list_inbox on student seat. No draft id.
Shots: web-05-parent-ask.png, web-07-student-ask.png

### AC-ASK-INBOX-3 dual-hat parent seat: UNPROVEN (web)

ditl-teacher-a is dual-hat. Playwright could not leave Teach seat for Parent tray (profile/chrome switchClick=none; still Desk|Needs).
First-run web-11 was still Teach (listed draft) — not a parent-seat proof.
Do not mark dual-hat parent refuse as LIVE pass.

## LIVE phone

### Phone viewport (mobile Chromium 390x844) — REPLAYED

Same :8081 bundle. Teacher inbox Jordan draft visible; Ask listed 1d937e5a — draft; no seat refusal.
Parent refuse; student refuse. result-phone-vp.json
Shots: phone-01-inbox.png, phone-02-teacher-ask.png, phone-03-parent-ask.png, phone-04-student-ask.png
AC-1/2/3 parent+student: PASS on phone-vp (not native Expo taps).

### Native iOS Simulator

iPhone 17 booted. simctl openurl sign-in + screenshot phone-sim-01-signin.png only.
Native in-app teacher Ask list_inbox path: UNPROVEN (no Expo Go full sign-in+Ask this run).
Do not stamp native phone product-complete from sim sign-in alone.

## Unit aid (not product pass)

node --test src/lib/ai/askTeacherInbox.test.ts → 4/4 pass

## Defects

Per card: do not file AC-ASK-INBOX-1, AC-ASK-INBOX-2, or AC-ASK-INBOX-3 as engineering defects.
Finding t_837efff9 left blocked/unassigned. No engineering staffed. No DEFECT cards for these ACs.

## Verdict

PRODUCT vs stamp (experience-first live):
- AC-ASK-INBOX-1: LIVE pass web + phone-vp (class-matched list; screen Jordan draft)
- AC-ASK-INBOX-2: LIVE pass web + phone-vp (no teacher-seat-required)
- AC-ASK-INBOX-3: LIVE pass pure parent + pure student web + phone-vp
- AC-ASK-INBOX-3 dual-hat active parent seat: UNPROVEN (seat switch not achieved)
- Native phone full path: UNPROVEN
- Escalated Surface loop: not a pass

## Artifacts root

/Users/chuckbroaddus/projects/kelyra/notes/qa-fixtures/ditl/artifacts-proveout-ask-teacher-inbox-t_e9a28a6e/

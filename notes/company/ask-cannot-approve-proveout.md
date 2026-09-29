# IQG prove-out: Ask cannot approve

Card: t_2bef14a3
Stamp: notes/company/ask-cannot-approve-intent.md
Date: 2026-09-28
Profile: qa-engineer
Surface: web + phone-vp (Chromium :8081). Native Expo Go: not driven.

## Loop packet

- kelyra-ui-loop wf_01a0e4f805747a0382da26fc4e332bfe escalated (UI drive did not run).
- Loop is not product-complete. This prove-out drove LIVE UI.

## MOCKUP

none (NON-GOAL ABSENT: no new Approve screen; no confirm card)

## STATIC (aid only)

- node --test src/lib/ai/askToolPolicy.test.ts: 16 pass incl. AC-ASK-APPROVE (approve_capture gone; prompt Never Approve via Ask; approveCapture remains on capture.tsx, proposal.tsx, studentId.tsx)
- Client + edge askToolPolicy: approve_capture removed comment; delete_* still on capture.approve

## LIVE

App: http://127.0.0.1:8081
Artifacts: notes/qa-fixtures/ditl/artifacts-ask-cannot-approve-t_2bef14a3/
Drivers: run-web.mjs, run-follow.mjs
Draft under test: Jordan Lee focus packb-draft-1790571280614 (capture 4ac67add… when deep-linked)

### AC-ASK-APPROVE-1: REPLAYED pass (web + phone-vp Ask)

Teacher web Ask: "I can't Approve from Ask. Open Capture review … tap Approve on screen." No confirm card. After Ask, same focus draft still Draft score / Draft only (unchanged).
Office ditl-admin Ask: same refuse; grades on-screen only.
Super ditl-super Ask: "Ask never Approves scores."
Parent seat (admin dual-hat /parent): Ask refuse; no Approve this capture on parent home.
Student ditl-student-s1 Ask: "Students never Approve grades."
Phone-vp teacher Ask: same refuse; claimsApproved false; confirm false.
No approve_capture tool POST (false-positive net hits were user prompt text in ask_append_message / ask-assistant body only). No PATCH approved_score from Ask.

Shots: w-t-02-ask-approve.png, w-o-02-ask.png, w-s-01-ask.png, w-p-02-ask.png, w-st-01-ask.png, f-phone-ask.png
JSON: result-web.json, result-follow.json

### AC-ASK-APPROVE-2: REPLAYED fail / incomplete (web)

On teacher own draft focus review: no Approve / Approve this capture / Accept recommendation control (gap chrome only: Draft cheap / Look again / Explain / Add gap / Keep as a note). Capture deep-link opened empty Capture tray. Work tab matched false "Approve" noise then no write (writes: []). Screen tap did not publish approved_score; draft remained.
STATIC still shows approveCapture call sites — not a live write proof.
Related: Pack B missing on saved draft (t_fae04be8) blocks Pack B Accept path.

### AC-ASK-APPROVE-3: REPLAYED pass (web + phone-vp)

No confirm card / Yes-approve dialog on any Ask seat driven. Tool gone + prompt refuse, not gated dialog.

### Hats summary

| Hat | Ask write | Confirm | Screen Approve seen |
|-----|-----------|---------|---------------------|
| Teacher | none | none | no on this draft |
| Admin office | none | none | n/a (no office Approve screen) |
| Super | none | none | n/a |
| Parent | none | none | no |
| Student | none | none | no |

## Defects

Did not file AC-ASK-APPROVE-1..3 as defect titles (stamp). Did not relaunch kelyra-qa-loop / kelyra-ui-loop. Did not parent onto t_07c1b2b4.
AC2 live miss is blocked by missing on-screen Approve on the only available teacher draft (Pack B / gap-empty path). Existing DEFECT t_fae04be8 covers Pack B chrome absence; no new duplicate filed this run unless CoS wants a separate "screen Approve unreachable on gap-empty draft" card.

## Verdict

PRODUCT vs stamp (LIVE, not loop):
- AC-ASK-APPROVE-1: PASS web + phone-vp (Ask cannot write; refuse copy)
- AC-ASK-APPROVE-2: FAIL live (no working on-screen Approve tap on available draft; STATIC call sites only)
- AC-ASK-APPROVE-3: PASS (no confirm card)
- Native iOS Expo: UNPROVEN

Stamp not closed while AC2 lacks LIVE write proof. Recommend: after Pack B / draft review exposes Approve, re-prove AC2 tap writes approved_score; AC1/3 already green.

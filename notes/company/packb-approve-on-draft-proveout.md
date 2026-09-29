# Prove-out: Pack B Approve on saved homework draft

Card: t_f57dc366
Stamp: notes/company/pack-b-approve-on-draft-intent.md
Date: 2026-09-27
Profile: qa-engineer
Surface: web + phone-vp (Chromium :8081). Native Expo Go: not driven this run.

## Loop packet (not product-complete)

- kelyra-ui-loop wf_01a0e4c1060b71819f84267eb3474235 terminal escalated (UI drive did not run).
- This prove-out does not treat the loop as pass.

## MOCKUP

none (stamp: no new review screen; existing teacher review only)

## LIVE

App: http://127.0.0.1:8081
Persona: ditl-teacher-a (Teach seat)
Artifacts: notes/qa-fixtures/ditl/artifacts-packb-approve-draft-t_f57dc366/
Drivers: run-live.mjs, run-seed-prove.mjs, run-reopen.mjs, run-phone-vp.mjs
Capture under test: 4ac67add-3f16-4ee9-a924-53b1005fb95a (marker packb-draft-1790571280614)

### AC-PACKB-1: REPLAYED fail (web + phone-vp)

After seed save of homework draft for Jordan Lee (inbox showed marker packb-draft-1790571280614; Saved to Jordan Lee on capture), opened existing teacher review with capture=4ac67add…&tab=focus.

Screen showed: Heard note, Draft score, Suggested gap chrome (Draft cheap / Look again / Explain / Add gap / Keep as a note). No Keyed review · Pack B, Confirm extract, or Accept recommendation.

Live capture session also had match-key network true but never rendered Pack B before Save to Inbox (packItems path did not surface UI).

Shots: s-05-jordan-assign.png, s-06-after-save.png, s-07-inbox.png, r-02-focus-capture.png, p-02-focus-capture.png
JSON: result-seed.json, result-reopen.json, result-phone-vp.json

### AC-PACKB-2: REPLAYED fail (blocked by AC1)

Accept recommendation / Approve this capture control not present on saved-draft review; could not complete accept on that path. hits.approve false.

### AC-PACKB-3: REPLAYED pass (web)

Switch/goto Parent seat /parent: Morgan present, no Jordan Lee teach roster, no Approve this capture / Accept recommendation / Pack B chrome.

Shots: s-13-parent.png, r-05-parent.png, w-09-parent.png

### Steps 4–5 (office/super/student/unassigned)

Not re-driven as full multi-persona matrix this run. STATIC aid: canApproveKeygrade walls teach-only in approveGate + KeygradePackBReview. Unassigned publish wall still in onPackBApprove / persistCapture. No office Approve screen added. Do not claim live office/super/student absence beyond code walls.

## STATIC (aid only)

- studentId.tsx: showPackB = keyedDraftOpen && allowKeygradeApprove; keyedDraftOpen needs keyScoreItemsFromDraft(model_draft).length > 0
- capture persistCapture builds key_score only when assignedForKey && packItems.length
- Unit approveGate.test.ts mentions AC-PACKB wiring — not a product stamp

## Defects

Filed DEFECT [P1]: Pack B missing on saved keyed homework draft review → t_fae04be8 (parent t_f57dc366). Did not file AC-PACKB-1..3 as defect titles. Did not unblock t_019ab036. Did not launch kelyra-qa-loop / kelyra-ui-loop.

## Verdict

PRODUCT vs stamp (live, not loop):
- AC-PACKB-1: FAIL web + phone-vp
- AC-PACKB-2: FAIL (no control)
- AC-PACKB-3: PASS web parent hide
- Native iOS Expo: UNPROVEN
- Office/super/student live: UNPROVEN (static wall only)

Stamp not closed. Recommend CoS route t_fae04be8 to engineering for key_score packItems persistence on save + Pack B on saved focus review; then re-prove.

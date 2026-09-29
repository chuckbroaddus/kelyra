# DITL-DH-01-UI-02 EXEC REPORT (rerun 2026-09-28)

CASE: DITL-DH-01-UI-02
PLAN: DITL-DH-01
CARD: t_dafe6218
LANE: A Chromium user-data-dir /tmp/ditl-pw-lane-a
ENGINE: hermes / qa-engineer SuperGrok
APP: http://127.0.0.1:8081 (Expo web; restarted mid-run after Metro crash)
ACCOUNT: ditl-teacher-a (Teach then Parent altitude switch)
SCHOOL: ditl-Sandbox Academy / ditl-Math Period 3
MARKER: ditl-DH-01-UI-02-1790576788496
CAPTURE: f72b356a-c9ce-4556-b072-72f320d778ff
ARTIFACTS: notes/qa-runs/ditl-dh-01-ui-02-rerun/

## RESULT

RESULT: FAIL

## Evidence (live)

1. Sign-in Teach seat → ditl-Math Period 3 desk (01-phone-signin / p3-01-in). Tray staff class chrome.
2. /capture upload ditl-pen-math-homework-T-01.jpg; note `Math homework for Jordan Lee keyed <MARKER>`; Ask AI → student work / grade draft; Jordan selected; Save to Inbox → "Saved to Jordan Lee" (07-phone-after-save). Metro briefly crashed after save; draft persisted.
3. Inbox lists marker draft (p2-02-inbox / p3-02-inbox). Open Review → student focus:
   `/class/d1715000-0000-4000-a000-000000000301/student/2bcee429-11ce-4f84-b2de-9aab349f03cc?capture=f72b356a-c9ce-4556-b072-72f320d778ff&tab=focus`
4. Phone-vp and web (1280) focus review show: Heard marker note, Draft score, SUGGESTED GAP chrome (Draft cheap / Look again / Explain / Add gap / Keep as a note). **No** Keyed review, Pack B, Confirm extract, Accept recommendation, or Approve this capture (p3-03-after-click, p3-04-try-0, p3-05-web-focus).
5. Publish/Accept path **not** completed — control absent.
6. Altitude "Switch to Parent seat" → /parent: Morgan Patel only; English Homeroom / APUSH; no Jordan Lee; no Approve/Pack B/draft extract chrome (p2-09-parent-home, p3-06-parent).
7. Teardown: attempted Delete on marker inbox row (still listed after pass3 delete attempt — best-effort; seed drafts left alone). Sign out → splash (p3-99-out).

Drivers: run.mjs (capture+save), run-pass2.mjs (list review miss), run-pass3.mjs (focus URL). JSON: result.json, result-pass2.json, result-pass3.json. Logs: run.log, run-pass2.log, run-pass3.log.

## FINDINGS

FINDING: Saved keyed homework draft review missing Pack B Approve/Accept on phone and web; severity P1; case DITL-DH-01-UI-02

(No other unexpected findings. Parent wall OK this run. Known prior Pack B gap aligns with packb-approve-on-draft prove-out / t_fae04be8 — still a supported-product miss for this rewritten case.)

## Step vs expected

| Step | Expected | Actual |
| sign-in Teach | Teach | PASS |
| capture keyed HW S1 | save draft | PASS (Saved to Jordan Lee) |
| open review phone+web Pack B Approve/Accept | Pack B chrome + Accept works | FAIL — gap draft chrome only |
| publish S1 | approved path | FAIL — blocked by missing Pack B |
| Parent seat Morgan; no Approve; no draft | isolation | PASS |

## Notes

- Did not implement, merge, or unblock t_7ebea568.
- Did not file new kanban DEFECT cards (card constraint).
- Native Expo Go not driven (web + phone viewport Chromium only).
- Expo web on :8081 crashed once mid-capture; restarted; draft remained.

## RECOMMENDED NEXT ACTION

Chief of Staff records SuperGrok usage; route existing Pack B-on-draft engineering work; next ditl-teacher-a case when lane free.

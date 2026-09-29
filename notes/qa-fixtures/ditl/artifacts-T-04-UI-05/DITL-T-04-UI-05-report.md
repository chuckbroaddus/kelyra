# DITL-T-04-UI-05 — multi-student assign; no bleed (EXEC 25, t_437434ec)

## RESULT: PASS

Lane A Chromium user-data-dir `/tmp/ditl-pw-lane-a` against `http://localhost:8081`.
Teacher `ditl-teacher-a` only. No product fix. No finding cards filed.

## Evidence (live)

- Sign-in → ditl-Math Period 3 desk (Jordan/Jamie/Riley/Samira chips).
- Class assign create: title `ditl-Multi 0530040634`, id `4807260b-aca5-400f-9ba1-a7ce80c93f4f`.
- Gradebook: multi-student headers + new column `ditl-Multi 0530040634`; Jordan Overall 92%; peers em-dash cells (no score bleed).
- Jordan student: focus `ditl-bulk-jordan-place-value` + Jordan-only HW hear note.
- Jamie student: focus `ditl-bulk-jamie-decimals`; **no** Jordan identity/work bleed.
- Class2 id …302: could not load / empty — no title leak of Multi assign.
- Global `/assignment/{id}` 404 screen (class-scoped detail used earlier) — not treated as bleed fail.
- Teardown: profile Sign out attempted (`99-signout.png`).

## FINDINGS

(none)

## Artifacts

`notes/qa-fixtures/ditl/artifacts-T-04-UI-05/` — run-ui-05.mjs, result.json, run2.log, screenshots 01–10, 99.

# DITL standing OS (plans & cases stay current)

**CEO lock:** 2026-09-10 (Chuck)  
**Standing:** Every product change going forward.  
**SoT:** this file. CoS and QA Supervisor must follow it.  
**Pack:** `notes/company/ditl-testplans.md`, `notes/company/ditl-plans/`, `notes/company/ditl-testcases.md`, `notes/company/ditl-cases/`, `notes/company/ditl-seed-school.md`, `notes/qa-fixtures/ditl/`

## Problem it stops

Shipping a change while Day-in-the-Life plans/cases still describe the old product (or omit a new role/day).

## Applies to

Every **feature**, **user-facing bug**, and **Ask/chrome/role-surface** change on class app or Author studio — same scope as IQG.

**Skip DITL eval** (same as IQG skip): docs-only, research-only, ARM/ops, TTS, git ship, SQL apply of already-produced files, leftover loop P2/P3 that do **not** change user-visible behavior.

## RACI

| Step | Owner |
|---|---|
| Decide if DITL plans/cases need work | **QA Supervisor** (not CoS, not QE, not Eng) |
| File `DITL-UPDATE` tracker | **CoS** from QAS verdict (specialists do not staff) |
| Unblock / prioritize the tracker | **CEO** (Chuck) |
| Update plans | QA Supervisor (when Chuck unblocks) |
| Update/write cases | QA Engineer (after plans, when Chuck/CoS staffs) |

## When CoS must run it

1. **Design** — whenever CoS staffs `qa-supervisor` for IQG intent, the handoff **must** include a **DITL IMPACT** block (do not skip because IQG is already on the card).
2. **After implement** — when the loop is terminal and CoS staffs QAS prove-out, that OBJECTIVE **must** include DITL IMPACT vs the shipped behavior (hats, Ask dual-path, seed fixtures, artifacts).
3. **Any other user-visible change** CoS staffs that skipped IQG only by mistake — still run DITL eval.

Do **not** write the DITL eval in the CoS session.

## QA Supervisor verdict (required on the card)

```
DITL IMPACT
Change:
Verdict: NONE | UPDATE_PLANS | UPDATE_CASES | NEW_DITL
Plans touched: (ids or none)
Cases touched: (ids or none)
New DITL needed: no | (role + day shape)
Seed/artifacts: none | update seed | new F-ARTIFACTS
Notes:
```

- **NONE** — no CoS follow-up card.
- Anything else — CoS **immediately** files a sticky tracker (do not wait for Chuck on *filing*; wait for Chuck on *doing the rewrite*).

## `DITL-UPDATE` cards

Title prefix **`DITL-UPDATE:`** (kanban has no separate tag field — the prefix **is** the tag).

```
DITL-UPDATE: <PLAN-IDs or NEW> — <one line>
```

Create **unassigned**, `--initial-status blocked`, then immediately:

```bash
hermes kanban block --kind needs_input TASK_ID
hermes kanban assign TASK_ID none
```

`--initial-status blocked` alone is **not** sticky. No ARM GRANT until Chuck unblocks.

Body: QAS verdict, parent feature id, files to change, NEW vs UPDATE.

Chuck unblocks when he wants the rewrite staffed. Then CoS ARM-GRANTs `qa-supervisor` (plans) and/or `qa-engineer` (cases) per the verdict.

## Pitfalls

- Do not let QAS complete IQG without a DITL IMPACT block.
- Do not staff Eng to “also update DITL docs.”
- Do not auto-unblock `DITL-UPDATE` cards.
- Do not invent DITL days that the product does not support; NEW_DITL still follows IQG stamps before Eng.

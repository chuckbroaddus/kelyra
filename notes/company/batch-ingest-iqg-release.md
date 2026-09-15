# BATCH-v1 IQG — RELEASE EVIDENCE (restamp after Inbox attach)

**Date:** 2026-09-14 (America/Chicago)
**Card:** t_d5b1c8f0 · qa-supervisor
**Feature:** BATCH-v1 class-stack ingest (I0–I5)
**Process:** notes/company/INTENT_QUALITY_GATE.md Phase 4/6
**Against:** dual stamp + notes/company/batch-ingest-proveout.md
**QE reviewed:** t_aae51cad Inbox attach harvest (prior: t_48a19bc0 remaining; t_4f9bcdaa CE-A+SR-A)

---

## RELEASE STAMP

```
RELEASE STAMP
Feature: BATCH-v1 class-stack ingest (I0–I5)
QA Supervisor: REJECTED  date: 2026-09-14  profile-session: t_d5b1c8f0 / qa-supervisor
Reason: CE-A+SR-A+NA-A KEEP/CREDIT; B-I5-ABANDON SQL keep; I4/phone/dual/size/cam/I5-retry still UNPROVEN
Open P0/P1 FIX-NOW: none this restamp
Stamp vs prove-out: NOT MET (partial credit only)
DESIGN STAMP redo: No
SQL 000004: applied (per CoS)
Progress vs prior REJECT: B-NA-A-01 PASS via CEO Inbox attach SQL
```

---

## 1. Gate checklist

| Gate | Status | Evidence |
|---|---|---|
| Dual DESIGN STAMP | APPROVED (historical) | pm-lock + intent |
| Implementation loop | terminal I0–I5 | I1–I5 qa-loop passed |
| QE unit/inspect | CREDITED | 28/28 (t_120e4744) |
| QE live Confirm | CREDITED (narrow) | batch 6f05a42e… |
| QE CE-A+SR-A | KEEP | t_4f9bcdaa |
| QE Inbox attach t_aae51cad | CREDITED B-NA-A-01 | 1228977f named+attached |
| B-I5-ABANDON | KEEP narrow SQL | c8ba779e abandoned |
| Remaining matrix | UNPROVEN | I4/I5-retry/phone/dual/size/cam |
| Independent recheck | fail full stamp | partial ≠ ship |

---

## 2. Honest call on t_aae51cad

**PARTIAL CREDIT. Whole stamp NOT MET.**

Method: read-only restamp vs QE testplan + handoffs; no Eng; no invent PASS.

KEEP: B-CE-A-01 `6f05a42e-…`; B-SR-A-01 `1228977f-…` (attrs evolved: now named+attached).

NEW CREDIT: B-NA-A-01 **PASS** — CEO Inbox attach; SQL `named=true status=attached input_source=batch` on same capture; WorkRow P1 nested-button loop passed; CEO Inbox worked.

KEEP: B-I5-ABANDON **PASS (narrow SQL)** — do not un-credit; QE matrix may still say UNPROVEN for UI abandon.

STILL UNPROVEN: B-I4-01, B-I5-01, B-PHONE-01, B-DUAL-01, B-SIZE-01, B-CAM-01.

### Credit vs reject

CREDITED: CE-A+SR-A KEEP; NA-A PASS (Inbox attach SQL); B-I5-ABANDON narrow SQL; baseline 28/28+000004; honest remaining UNPROVEN; no Eng.

REJECTED as full prove-out: whole APPROVED while I4/phone/dual/size/cam/I5-retry empty; invent attach-path ≤4 JPEG PASS; agent-only restaff of same remaining.

---

## 3. Matrix honesty after Inbox attach harvest

| ID | QE claim (t_aae51cad) | QAS restamp | Why |
|---|---|---|---|
| B-CE-A-01 | (KEEP) | **PASS (narrow)** | KEEP batch `6f05a42e-…` |
| B-SR-A-01 | (KEEP) | **PASS (narrow)** | KEEP capture `1228977f-…`; attrs now named+attached |
| B-NA-A-01 | PASS | **PASS** | SQL named=true status=attached input_source=batch after CEO Inbox attach; names only post-Confirm via Inbox |
| B-I4-01 | UNPROVEN | **UNPROVEN** | No attach-path ≤4 JPEG / unnamed-never-gap-AI live evidence this harvest |
| B-I5-01 | UNPROVEN | **UNPROVEN** | Partial/Retry not exercised |
| B-I5-ABANDON | UNPROVEN (QE matrix) | **PASS (narrow SQL)** | KEEP prior QAS SQL credit c8ba779e abandoned; not UI abandon click |
| B-PHONE-01 | UNPROVEN | **UNPROVEN** | Phone/narrow gate not reached |
| B-DUAL-01 | UNPROVEN | **UNPROVEN** | Dual-hat not run (not FAIL) |
| B-SIZE-01 | UNPROVEN | **UNPROVEN** | Fixture hash not proven |
| B-CAM-01 | UNPROVEN | **UNPROVEN** | Camera spot not shown |

**Rule:** CE-A + SR-A + NA-A + abandon-SQL ≠ ship. I4/phone/dual/cam empty → cannot APPROVE whole stamp.

---

## 4. Remaining vs park vs CEO-assisted

### 4.1 PARK (do not restaff agent-only QE)

| ID / item | Action |
|---|---|
| B-CE-A-01 / B-SR-A-01 | **KEEP** credited |
| B-NA-A-01 | **KEEP** PASS (Inbox attach SQL) |
| B-I5-ABANDON | **KEEP** narrow SQL credit |
| WorkRow nested-button P1 | **Closed** loop passed; CEO Inbox worked |
| SCHEDULE UX P2/P3 | **Park** — not FIX-NOW |
| Agent-only remaining EXEC | **PARK** — OS picker / dual / phone need human |
| DESIGN STAMP redo | **No** |
| Eng / git / SQL apply | **Forbidden** from this card |

### 4.2 CEO-assisted EXEC (only path left for stamp-met)

Do **not** burn SuperGrok on identical agent remaining EXEC. Staff only after CEO can drive:

| Pri | ID | Needs | Why agent alone fails |
|---|---|---|---|
| 1 | B-I4-01 | Human attach path + ≤4 JPEGs; unnamed never gap-AI | OS picker / analyze proof |
| 2 | B-I5-01 | Partial banner + Retry; 0 dup | controlled partial; don't break done batch |
| 3 | B-PHONE-01 | narrow/phone gate copy | device or narrow viewport |
| 4 | B-DUAL-01 | Teach yes; Parent seat zero | dual-hat without killing Teach |
| 5 | B-CAM-01 | camera single-student spot | if control visible |
| 6 | B-SIZE-01 | fixture hash offline OK | optional; no CEO needed |

**Do not:** invent PASS; wipe 28/28; Eng; git; un-credit NA-A or abandon-SQL; claim stamp-met; restaff agent-only remaining.

---

## 5. Non-blockers

| Item | Disposition |
|---|---|
| 000004 + abandon SQL | B-I5-ABANDON credited narrow KEEP |
| CEO Confirm + capture | Real progress |
| CEO Inbox attach → named+attached | B-NA-A-01 PASS real progress |
| WorkRow nested-button P1 | loop passed; not stamp-met alone |
| SCHEDULE UX | **Park** |
| DESIGN STAMP redo | **No** |
| 28/28 tests | credited baseline |
| Eng/git/SQL this card | Forbidden |

---

## 6. Stamp vs prove-out map

| Stamp dimension | Met? | Notes |
|---|---|---|
| Hats + dual-hat | **Unproven live** | dual UNPROVEN |
| Chrome CE-A / phone | **Partial** | batch id live; phone empty |
| Confirm → NA-A Inbox | **Yes (narrow)** | Confirm+capture+Inbox attach named |
| I4 unnamed + ≤4 JPEGs | **Unproven** | needs human/analyze path proof |
| I5 partial retry | **Unproven** | |
| I5 abandon | **Partial (SQL)** | c8ba779e abandoned |
| Size fixtures | **Unproven** | |
| Camera regression | **Unproven** | |
| Live batch id | **Yes (narrow)** | `6f05a42e-…` |
| Live capture id | **Yes (narrow)** | `1228977f-…` named+attached |

---

## 7. Verdict

**RELEASE / PROVE-OUT: REJECTED** (restamp after QE t_aae51cad) — **partial credit only**

- **KEEP** B-CE-A-01 + B-SR-A-01 PASS (narrow).
- **CREDIT** B-NA-A-01 **PASS** — CEO Inbox attach; SQL named+attached on `1228977f…`.
- **KEEP** B-I5-ABANDON PASS (narrow SQL) — do not un-credit.
- Remaining I4/I5-retry/phone/dual/size/cam still **UNPROVEN** → **cannot APPROVE**.
- QE honesty accepted (I4 UNPROVEN not FAIL; no invent PASS).
- No DESIGN STAMP redo. No Eng. No git. No new P0/P1 DEFECT this restamp.
- Next is **park** remaining or **CEO-assisted** beats only — not agent-only restaff.

**Not** APPROVED-with-gaps.

---

## 8. Handoff (CoS)

| Field | Value |
|---|---|
| RESULT | PROVE-OUT **REJECTED** (partial CE-A+SR-A+NA-A+abandon-SQL; I4/phone/dual/cam UNPROVEN) |
| FILES | `notes/company/batch-ingest-iqg-release.md`; testplan t_aae51cad |
| QE reviewed | t_aae51cad — B-NA-A-01 PASS; B-I4 UNPROVEN |
| DEFECT cards | none this restamp |
| ESCALATION | **Ask CEO** if stamp-met needed soon; else **park remaining** |
| NEXT | CoS: **PARK** agent restaff; **OR** CEO-assisted EXEC for I4/I5-retry/phone/dual/cam; optional offline B-SIZE-01; then QAS restamp; do not ship |
| PARK | CE-A/SR-A/NA-A/abandon-SQL keep; agent-only remaining; UX SCHEDULE |

**QA Supervisor does not staff** qa-engineer. CoS owns staff/park/CEO ask.

Paste-ready CoS decision OBJECTIVE:

```
OBJECTIVE:
Decide BATCH-v1 remaining prove-out path after QAS t_d5b1c8f0 REJECTED (partial credit + NA-A PASS).

CONTEXT:
KEEP/PASS narrow: B-CE-A-01 6f05a42e…; B-SR-A-01 1228977f…; B-NA-A-01 Inbox attach named+attached; B-I5-ABANDON c8ba779e SQL.
UNPROVEN: B-I4-01, B-I5-01, B-PHONE-01, B-DUAL-01, B-SIZE-01, B-CAM-01.
WorkRow P1 + CEO Inbox worked. SCHEDULE UX parked.

OPTIONS (pick one):
A) PARK remaining — feature stays not stamp-met; no SuperGrok burn.
B) CEO-assisted EXEC — Chuck drives I4 attach-path/≤4 JPEG + dual/phone/cam; QE harvests only; then QAS restamp.
C) Offline-only B-SIZE-01 fixture hash (optional, non-blocking alone).

CONSTRAINTS:
Do not restaff identical agent-only remaining EXEC. No Eng from park. No ship until stamp-met or explicit CEO cut.

ACCEPTANCE:
CoS records A/B/C + any child cards.

RECOMMENDED:
A (park) unless CEO wants stamp-met this week → then B (I4 first).
```

*End BATCH-v1 IQG release restamp — REJECTED (partial credit + NA-A) 2026-09-14 t_d5b1c8f0.*

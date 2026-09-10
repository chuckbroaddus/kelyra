# GAUTH IQG — RELEASE EVIDENCE (MERGED ASK+GAUTH)

**Date:** 2026-09-10
**Card (REL2):** t_408c7618 · qa-supervisor
**Prior REL1:** t_c7e481cb · REJECTED (kept below)
**Feature:** GAUTH — refuse/tutor, Explain, parent co-educator, Practice Help, Help-used + ASK A-Filing join
**Process:** notes/company/INTENT_QUALITY_GATE.md Phase 4–6

---

## RELEASE STAMP (REL2 — current)

```
RELEASE STAMP
Feature: GAUTH MERGED ASK+GAUTH (behavior on A-Filing surface)
QA Supervisor: APPROVED  date: 2026-09-10  profile-session: t_408c7618 / qa-supervisor
Open P0/P1 FIX-NOW (product GAUTH): none
Stamp vs prove-out: MET — QE2 full §10 matrix + independent recheck
Gap owner residual: none (QE-GAP-01..10 closed)
MATH display: out of scope (MATH REL APPROVED)
```

---

## 0. History — REL1 REJECT (t_c7e481cb) — retained

```
RELEASE STAMP (REL1 — superseded)
Feature: GAUTH MERGED ASK+GAUTH
QA Supervisor: REJECTED  date: 2026-09-10  profile-session: t_c7e481cb / qa-supervisor
Reason: QE1 prove-out incomplete vs gauth-iqg-intent.md §10 (matrix ~5 rows; P-CO/H-PL/D-HAT/OFF/TW/ASK-RG/CL/TCH missing)
Gap owner: qa-engineer (not PM)
```

REL1 kept design stamp APPROVED. Units 42/42 alone were not a substitute. CoS restaffed QE2 `t_17742ed2`.

---

## 1. Gate checklist (REL2)

| Gate | Status | Evidence |
|---|---|---|
| Dual DESIGN STAMP | **APPROVED** | `gauth-iqg-intent.md` PM pack + QA Sup `t_4595b4ec` / `t_ab9d7f9f` |
| ASK join locks | absorbed | `ask-iqg-intent.md` dual APPROVED + `ask-iqg-release.md` APPROVED — not rewritten |
| Implementation | shipped | G0–G5 + MathText live; MATH REL separate APPROVED `t_825f69e5` |
| QE plan + execute | **COMPLETE PASS** | QE2 `t_17742ed2` → `gauth-iqg-testplan.md` — **52** unique §10 case rows (no dups) |
| Open GAUTH P0/P1 DEFECT | **none** | Board 2026-09-10: no DEFECT [P0]\|[P1] GAUTH; only open P1 is AVG `t_afaaf1e1` |
| Independent recheck | **pass** | this card: 42/42 gauth.security+askToolPolicy+helpUsed; 41/41 assignmentGround+tutorBrief+chrome seat |
| MATH display | out of scope | do not steal glyph matrix |
| Diary NL | parked | do not reopen `t_cecf2af0` |

---

## 2. Stamp vs prove-out map (REL2)

| Stamp dimension | Met? | Notes |
|---|---|---|
| Hats — student tutor + cheat-wall | **Yes** | S-TUT-01..04 + S-RF-01..06 matrix; GAUTH-S1-01/G3 units + refuse-before-vendor |
| Hats — teacher Explain | **Yes** | T-EX-01..08; explain-capture + explain.manage + ExplainDraftCard Keep private/attach/discard |
| Hats — parent co-educator | **Yes** | P-CO-01..06; parent never refuse twin; parent_of / parent_students; Which assignment UI |
| Hats — office/super | **Yes** | OFF-01..03; matrix explain.manage admin/super none; ops Ask only |
| Dual-hat seat / Explain teacher-only | **Yes** | D-HAT-01..05; teacherSeatOnly tools; P-06 tray remount; dual-hat ground seat-scoped |
| Chrome entry | **Yes (static)** | tray /ask; Practice Help in-player; Confirm≠Approve unit; Explain near capture path — no live dogfood shots |
| Lifecycle + reverse | **Yes** | Just chatting + clear ground units; help_mode off refuse; discard_explain_draft RPC; pack Confirm family via ASK REL |
| Multiplicity | **Yes** | TW-01..02 + ASK-P0-07 twins child-switch; MULT-01 class switch clear; three runtimes via Edge twins |
| Integrity / security | **Yes** | REG-01..06 + GAUTH-S1-03/04/08/17; FAMILY_CAPTURE_SELECT omit; approved_score_written:false |
| ASK locks regression | **Yes** | ASK-RG/CL/TCH rows + assignmentGround MULT-01 + tutorBrief Confirm≠Approve + pack+refuse |
| Non-goals guarded | **Yes** | No Snap in player; Help≠Ask Edge split; no LLM award path; Diary not reopened; MATH not stolen |

QE2 claimed 0 new DEFECTs. Independent review: no new live P0/P1 miss vs stamp.

---

## 3. Independent recheck (QA Sup REL2)

**Units this run:**

```
npx tsx --test src/lib/ai/gauth.security.test.ts \
  src/lib/ai/askToolPolicy.test.ts \
  src/lib/practice/helpUsed.test.ts
→ 42/42 pass, 0 fail

npx tsx --test src/lib/ask/assignmentGround.test.ts \
  src/lib/tutorBrief/tutorBrief.security.test.ts \
  src/lib/chrome/rideParentSeat.test.ts \
  src/lib/chrome/uxAuditP06.seatSwitch.test.ts
→ 41/41 pass, 0 fail
```

**Corrected evidence anchors (where QE citation was thin/wrong):**

| Family | Independent anchor (stronger than QE row) |
|---|---|
| P-CO-03 Which assignment? | `AskAssignmentGround.tsx` + `tutorBrief.security.test.ts` ASK-P1-05 |
| P-CO-04 Just chatting | `AskAssignmentGround.tsx` pick(null) + `assignmentGround.test.ts` Just chatting |
| D-HAT-04 / ASK ground clear | `assignmentGround.test.ts` dual-hat seat-scoped + MULT-01; tray remount is chrome-only |
| ASK-CL-01 / ASK-RG-02 | `clearAskGroundOnActiveClassChange` + MULT-01 units (not trayTabs alone) |
| REG-02 family omit | `FAMILY_CAPTURE_SELECT` + `FAMILY_OMIT_CAPTURE_KEYS` in `explain/api.ts:18-37`; GAUTH-S1-04 (not TEACHER select L16) |
| REG-03 approved_score | `practice-help` `approved_score_written: false` + GAUTH-S1-17 |
| REG-04 KEYGRADE ordering | law = Explain/Help never substitute KEYGRADE award; Ask never writes approved_score (gauth-kelyra-acceptance L3). No literal `KEYGRADE` token in matrix.ts — QE path was wrong; behavior holds via REG-03 + capture.approve separate from explain.manage |
| REG-05 open_screen | `askToolPolicy.ts` open_screen + askToolPolicy tests |
| REG-06 MathText+refuse | MATH REL + GAUTH_REFUSAL plain Text path (absorbed) |
| T-EX-05 discard | `explain/api.ts:83` `discardExplainDraft` RPC |
| H-PL-01..07 | `practice-help/index.ts:54-77` line gates match QE (verified) |
| H-PL-07 | `tutorBrief.security.test.ts:113-118` ASK-P0-12 (path under src/lib/tutorBrief/) |

**Honesty:** QE2 filled all §10 IDs with inspection rows; a few citations were imprecise (wrong line or wrong module). Independent recheck maps correct anchors and units. Live interactive dogfood screenshots were not attached — same class of caveat as MATH REL. Walls + ground + Help Edge are unit/static strong enough for merged behavior release; chrome dogfood residual is not a P0/P1 stamp miss.

**Board defects:** no open DEFECT [P0]|[P1] titled GAUTH/ASK+GAUTH. Open P1 AVG-only (`t_afaaf1e1`). No new product DEFECT filed from this REL2 card.

---

## 4. QE-GAP-01..10 disposition (closed)

| Gap ID | REL1 miss | REL2 status |
|---|---|---|
| QE-GAP-01 | ~5 unique matrix rows | **Closed** — 52 unique IDs, one row each |
| QE-GAP-02 | P-CO-01..06 zero | **Closed** — 6 rows + parent co-ed units |
| QE-GAP-03 | H-PL-01..07 zero | **Closed** — 7 rows; practice-help lines verified |
| QE-GAP-04 | D-HAT + OFF zero | **Closed** — 5+3 rows; matrix + seat units |
| QE-GAP-05 | TW + multiplicity zero | **Closed** — TW-01..02 + twins/MULT units |
| QE-GAP-06 | ASK-RG/CL/TCH zero | **Closed** — 5 rows + assignmentGround/tutorBrief |
| QE-GAP-07 | remaining S/T rows | **Closed** — full S-TUT/S-RF/T-EX set |
| QE-GAP-08 | REG-02..06 | **Closed** — 5 rows + independent anchor fix |
| QE-GAP-09 | list-only / structure claim | **Closed** — executed matrix + this recheck |
| QE-GAP-10 | duplicate PASS inflation | **Closed** — no duplicate case IDs |

**Not gaps:** PM design intent (APPROVED); MATH glyph matrix; Diary `t_cecf2af0`; ask-iqg-intent rewrite; new P0 product leak this card (none).

---

## 5. Verdict

**RELEASE: APPROVED**

IQG Phase 4 prove-out vs stamped MERGED ASK+GAUTH is complete after QE2. Design stamp remains APPROVED. REL1 REJECT history retained. QE-GAP-01..10 closed. No open GAUTH product P0/P1 FIX-NOW.

CEO condition for release evidence is met: full §10 matrix exists with executed rows + independent unit/static recheck + no open P0/P1 GAUTH defects.

Do **not** weaken ASK locks. Do not reopen `t_cecf2af0`. Do not rewrite `ask-iqg-intent.md`. Do not steal MATH stamp. QA Supervisor does **not** staff devops-release from this card.

---

## 6. Handoff

| Field | Value |
|---|---|
| RESULT | RELEASE APPROVED |
| FILES | `notes/company/gauth-iqg-release.md` (this file); SoT matrix `gauth-iqg-testplan.md` |
| OPEN ISSUES | none blocking (AVG P1 `t_afaaf1e1` unrelated) |
| ESCALATION | No |
| NEXT | CoS reports APPROVED; devops-release only if Chuck wants git |

### RELEASE STAMP (card copy)

```
RELEASE STAMP
Feature: GAUTH MERGED ASK+GAUTH
QA Supervisor: APPROVED  date: 2026-09-10  profile-session: t_408c7618 / qa-supervisor
Reason: QE2 full §10 matrix (52 IDs) + independent 42/42 + 41/41; QE-GAP-01..10 closed; 0 GAUTH P0/P1
Prior REL1 t_c7e481cb: REJECTED (history retained)
Open product P0/P1 GAUTH: none
MATH / Diary / ask-iqg-intent: not touched
```

### RECOMMENDED NEXT ACTION (CoS)

1. Report GAUTH IQG RELEASE **APPROVED** — prove-out complete; design stamp still APPROVED; REL1 REJECT superseded.
2. Do **not** restaff QE for GAUTH unless new defect appears.
3. Staff `devops-release` **only if Chuck wants git** (no force-push; no secrets).
4. Do not reopen `t_cecf2af0`. Do not rewrite ask-iqg-intent. Leave AVG P1 `t_afaaf1e1` on its track.
5. Do not weaken ASK IQG-OFF / RG / CL / TCH-ASK locks.

---

*End GAUTH IQG release evidence — APPROVED 2026-09-10 (`t_408c7618`); REL1 REJECT retained (`t_c7e481cb`).*

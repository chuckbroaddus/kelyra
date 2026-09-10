# TEACH-UX IQG — RELEASE EVIDENCE

**Date:** 2026-09-10
**Card:** t_7f443616 · qa-supervisor
**Feature:** TEACH-UX — teacher chrome IA (Desk·Capture·Needs·Class·Ask)
**Process:** notes/company/INTENT_QUALITY_GATE.md § verification

---

## RELEASE STAMP

```
RELEASE STAMP
Feature: TEACH-UX — teacher chrome IA
QA Supervisor: APPROVED  date: 2026-09-10  profile-session: t_7f443616 / qa-supervisor
Open P0/P1 FIX-NOW: none
Stamp vs prove-out: met (hats/lifecycle/multiplicity/chrome entry/non-goals)
P2 leftovers: sticky parked polish only — do not block release
```

---

## 1. Gate checklist

| Gate | Status | Evidence |
|---|---|---|
| Dual DESIGN STAMP | **APPROVED** | `teach-ux-iqg-intent.md` PM TEACH-UX-P1 `t_7215b83e` + QA Sup `t_ddcd2110` |
| Implementation | terminal shipped | A `t_3d653d82` · B `t_170001d0` · C `t_e663db8a` · D `t_74d638da` · DOC `t_fa6d71a7` · leftovers `t_ef0ed78b` · P-06 in tree |
| QE plan + execute | done **PASS** | QE1 `t_07a0cc56` → `teach-ux-iqg-testplan.md` · DF-1..6 + matrix · 0 DEFECT cards |
| Open P0/P1 FIX-NOW | **none** | Board 2026-09-10: zero open TEACH-UX DEFECT [P0]/[P1] |
| P2 polish parked | sticky, non-blocking | Needs dual-hat count; Week/Heatmap secondary; `/needs` rename (non-goals) |
| Independent recheck | **pass** | typecheck PASS; node --test 8 chrome packs **70/70** |

---

## 2. Stamp vs prove-out map

| Stamp dimension | Met? | Notes |
|---|---|---|
| Hats — pure teacher | Yes | Five tray Desk·Capture·Needs·Class·Ask; no office People/Manage; QE DF-1 + TR rows |
| Hats — office/super | Yes | Office tray frozen; no Capture/Needs on office seat; header camera off; OFF/X rows |
| Hats — student/parent | Yes | Student tray 6 keys frozen; parent Home·Ride·Ask; STU-02/03 |
| Dual-hat office+teacher | Yes | `resolveStaffChromeRole` explicit seat; default Office; never merge; remount key=role; P-06 |
| Dual-hat + parent | Yes | Parent seat full parent tray incl Ride; cold start never Parent; My children deep-link OK |
| Chrome entry | Yes | Tray 5; ClassTabs ≤7; hamburger class switch; web ≥720 labels; no Profile-in-tray; no sixth |
| Full lifecycle | Yes | Land Desk; multi-class switch; Capture stay-on + propose header; Needs count-only; Class→setup; Gradebook Approve path; Ask class chip; seat switch atomic; parent land; demoted deep links |
| Multiplicity | Yes | 2+ classes via drawer/`/?switch=1`; dual never merge; Search no classId ≠ listDirectory; badge numeric |
| Security / altitude | Yes | chrome.role seat; drawer office nouns on officeSeat only; canCreateClass office-only; matcher never insert; no seat SQL; chrome ≠ RLS |
| Non-goals guarded | Yes | No student skin; no office People on desk; no AVG Syllabus default ClassTab; Diary not tray; no `/inbox` rename required |

QE DF-1..DF-6 all PASS. No P0/P1 miss vs stamp. Parked P2 polish confirmed not silent P0.

---

## 3. Code choke points verified (QA Sup recheck)

- `trayTabs.ts`: teacher five keys home/capture/inbox/class/ask (labels Desk·Capture·Needs·Class·Ask); Class href → `/setup`; trayRemountKey(role); office/student/parent builders separate — never concat
- `classTabs.ts`: CLASS_TABS length 7 Today·Needs·Feed·Students·Assignments·Gradebook·Parents; OFFICE_CLASS_TABS frozen; DEMOTED week/heatmap/family + hrefForClassTab
- `seat.ts`: ChromeSeatPreference client-only; defaultChromeSeat office>teacher never Parent; resolveStaffChromeRole seat-first (not isTeacherRole force); chromeSeatRootHref parent→/parent else /
- Unit packs (node --test, this run): trayTabs, classTabs, seat, needsAsk.phaseC, phaseD, teachUxLeftovers, altitudeLocks.security, uxAuditP06.seatSwitch → **70/70 pass**
- typecheck: **PASS**
- Static laws already locked in altitudeLocks: drawer officeSeat gate; Search teacher no listDirectory via isStaffRole; canCreateClass = officeSeat && can(...); no seat SQL table

---

## 4. Defect / polish trail

| Item | Sev | Status after REL |
|---|---|---|
| QE new DEFECT cards | — | **none** (0 filed; 0 required) |
| Prior TEACH-UX P2/P3 loop leftovers (Needs dual-hat zero, badge list agree, Inbox copy, demoted select, search placeholder, etc.) | P2/P3 | **done** via leftovers / phase cards — not open FIX-NOW |
| Parked polish: Needs dual-hat count polish | P2 | sticky non-goal unless elevated |
| Parked polish: Week/Heatmap secondary chrome | P2 | sticky non-goal (demoted routes still work) |
| Parked polish: `/inbox` → `/needs` rename | P3 | explicit non-goal v1 |
| Open board DEFECT [P0]/[P1] TEACH-UX | — | **none** (other product P1s Diary/AVG unrelated) |

No leftover elevates to P0/P1 miss vs stamped TEACH-UX intent.

Parent epic `t_1607b6cf` already `done` on board — this card does **not** reopen or re-complete it.

---

## 5. Verdict

**RELEASE: APPROVED**

CEO IQG condition met: dual DESIGN STAMP + QE prove-out PASS + independent 70/70 unit recheck + no open P0/P1 FIX-NOW for TEACH-UX.

**QA Supervisor does not staff DevOps.** CoS may staff `devops-release` **only if Chuck wants TEACH-UX on git** — otherwise report. No SQL named for this epic. No force-push; no secrets.

---

## 6. Handoff

| Field | Value |
|---|---|
| RESULT | RELEASE APPROVED |
| FILES | `notes/company/teach-ux-iqg-release.md` |
| OPEN P0/P1 | none (TEACH-UX) |
| ESCALATION | No |
| NEXT | CoS: report RELEASE APPROVED to Chuck; staff devops-release only on explicit ship ask. Leave parked polish sticky. Do not restaff Eng for TEACH-UX unless new P0/P1. |

*End TEACH-UX IQG release evidence — APPROVED 2026-09-10 (`t_7f443616`).*

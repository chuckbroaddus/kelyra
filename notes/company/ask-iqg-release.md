# ASK A-Filing IQG — RELEASE EVIDENCE

**Date:** 2026-09-10
**Card:** t_c9419741 · qa-supervisor
**Feature:** ASK A-Filing (pedagogy pack + Ask assignment ground)
**Process:** notes/company/INTENT_QUALITY_GATE.md §6 / verification

---

## RELEASE STAMP

```
RELEASE STAMP
Feature: ASK A-Filing
QA Supervisor: APPROVED  date: 2026-09-10  profile-session: t_c9419741 / qa-supervisor
Open P0/P1 FIX-NOW: none
Stamp vs prove-out: met (hats/lifecycle/MULT-01)
P2/P3 leftovers: sticky only — do not block release
```

---

## 1. Gate checklist

| Gate | Status | Evidence |
|---|---|---|
| Dual DESIGN STAMP | **APPROVED** | `ask-iqg-intent.md` PM `t_67da4743` + QA Sup `t_c7c1e4e0` |
| Implementation loop | terminal **passed** | ASK-I1 `t_4ccafede`; MULT-01 E1 `t_f1b829b0` wf_01a08c517bcc7c528ce7a22f83e06270 |
| QE plan + execute | done | QE1 `ask-iqg-testplan.md`; QE2 `ask-iqg-execution.md` |
| P1 MULT-01 FIX-NOW | closed + re-proved | PM `t_28889f75` FIX-NOW → E1 passed → QE3 `ask-iqg-mult01-reprove.md` **PASS** |
| Open P0/P1 FIX-NOW | **none** | Board query 2026-09-10: zero non-done DEFECT [P0]/[P1] / open FIX-NOW |
| P2/P3 leftovers | sticky, non-blocking | ASK-I1 leftovers + E1 P2 `t_d2a36370` / P3 `t_35a64fa6` (not P0/P1) |
| Independent recheck | **pass** | `assignmentGround.test.ts` + `tutorBrief.security.test.ts` — 21/21 |

---

## 2. Stamp vs prove-out map

| Stamp dimension | Met? | Notes |
|---|---|---|
| Hats (teacher/student/parent/dual/office-super) | Yes | QE2: T-CONF, S-GND, P-GND, D-HAT, OFF-01 pass; office no pack inject |
| Chrome entry | Yes | Confirm on teacher assignment detail; student soft chip; parent explicit card; no Help merge |
| Full lifecycle | Yes | Confirm/Skip/Clear/stale/re-confirm; Just chatting clear; re-ground (A); child/seat clear |
| Multiplicity MULT-01 | Yes | Class switch clears ground + pageCandidate; chrome classId effect; not JustChatting |
| Integrity / GAUTH walls | Yes | Confirm≠Approve; graded+photo refuse; family SELECT wall; unconfirmed=no inject |
| Non-goals | Guarded | No solver UI, no parent Approve, no office pack epic, no B/C reopen |

Former QE2 sole P1 (**MULT-01**) is closed. No P0 from QE2. No new defects from QE3.

---

## 3. Code choke points verified (QA Sup recheck)

- `AuthProvider.tsx` `setActiveClassId` → `clearAskGroundOnActiveClassChange()` on `active_class_id` delta
- `assignmentGround.ts` clear session ground + `pageCandidate=null`; does **not** set `chattingOnly`
- `AskAssignmentGround.tsx` `useEffect` on `classId` clears chip/sheet and `onGroundChange(null)`
- Unit: MULT-01 clears ground/page candidate; not Just chatting
- Static: `tutorBrief.security.test.ts` asserts setActiveClassId wiring

---

## 4. P2/P3 leftovers (explicit non-block)

Sticky only — **do not** block A-Filing release:

- ASK-I1 leftovers (P2/P3): `?brief=1` remount regen; stale mute notice; hint-depth chip; key-pattern strip (multiple sticky duplicates — CoS harvest)
- E1 leftovers: P2 `t_d2a36370` hamburger chrome race; P3 `t_35a64fa6` ground clear inside setTeacher updater
- Unrelated UX-AUDIT P2/P3 drawer items remain sticky elsewhere

No leftover elevates to P0/P1 miss vs stamped A-Filing intent.

---

## 5. Verdict

**RELEASE: APPROVED**

CEO IQG smoke condition met: release evidence exists + no open P0/P1 FIX-NOW.

**QA Supervisor does not staff DevOps.** CoS may staff `devops-release` to commit/push A-Filing + MULT-01 (no force-push; no secrets).

---

## 6. Handoff

| Field | Value |
|---|---|
| RESULT | RELEASE APPROVED |
| FILES | `notes/company/ask-iqg-release.md`; stamp section on `ask-iqg-intent.md` |
| ESCALATION | No |
| NEXT | CoS → `devops-release` (A-Filing + MULT-01) |

*End ASK IQG release evidence — APPROVED 2026-09-10.*

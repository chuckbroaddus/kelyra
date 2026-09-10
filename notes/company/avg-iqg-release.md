# AVG IQG — RELEASE EVIDENCE

**Date:** 2026-09-10
**Card:** t_e198b6a8 · qa-supervisor
**Feature:** AVG — class syllabus + category-weighted averages
**Process:** notes/company/INTENT_QUALITY_GATE.md

---

## RELEASE STAMP

```
RELEASE STAMP
Feature: AVG — class syllabus + category-weighted averages
QA Supervisor: APPROVED  date: 2026-09-10  profile-session: t_e198b6a8 / qa-supervisor
Open P0/P1 FIX-NOW: none (parent book t_afaaf1e1 CLOSED)
Stamp vs prove-out: met (hats/chrome/lifecycle/multiplicity/FERPA/non-goals)
P2 leftovers: sticky SCHEDULE (Home strip t_f907d7a7, student S-G4 t_860fefed) — do not block
P3 leftovers: sticky DEFER (teacher overall t_5a1e5860) — do not block
```

---

## 1. Gate checklist

| Gate | Status | Evidence |
|---|---|---|
| Dual DESIGN STAMP | **APPROVED** | `avg-iqg-intent.md` · QA Sup `t_7bc1c837` · PM pack + disposition `t_02265312` |
| Implementation | shipped + P1 fix | AVG-IMPL + parent book FIX-NOW `t_e102ba21` |
| SQL parent book | **live** | `20260910000004_family_student_gradebook.sql` applied `t_8e625411` (HTTP 201) |
| QE1 plan + execute | **PASS** | `t_c654a74b` → `avg-iqg-testplan.md` |
| QE2 parent-book re-prove | **PASS** | `t_8bfde9e8` → `avg-iqg-parent-book-reprove.md` P-G1…P-G4 + F-06 |
| Open P0/P1 FIX-NOW | **none** | `t_afaaf1e1` **done** |
| Independent recheck | **pass** | this card: code + unit **35/35** |

---

## 2. Stamp vs prove-out map (skeleton)

| Stamp dimension | Met? | Notes |
|---|---|---|
| Hats T/O/P/S + dual + student none | Yes | QE1 matrix + DF; office none |
| Chrome Class-desk only | Yes | Setup card + banner; not Office/tray/Diary |
| Lifecycle draft↔publish/Ask | Yes | QE1 PASS |
| Engine L1–L5/L9 | Yes | C-01…C-18 unit greens |
| Parent P-H2 + full P-G* | Yes | Home + `/parent/grades` post FIX-NOW |
| Student S-G1/G2/G3 | Yes | StudentGradeBook path |
| Multiplicity / F-06 | Yes | keyed child; sibling clear |
| FERPA / security | Yes | family RPC strip; teacherSeatOnly |
| Non-goals guarded | Yes | no office policy; no auto-pub; no create_class |
| P2/P3 leftovers | Sticky | Do not elevate; do not block RELEASE |

---

## 3. Code choke points verified (QA Sup recheck)

- `src/app/parent.tsx`: Home class cards load `loadParentClassAverageExplain`; F-06 clears why/rows on sibling switch; **See all grades** → `/parent/grades?child=&class=`
- `src/app/parent/grades.tsx`: focused-child book; AvatarTray multi-child; F-06 clears class chips on switch; renders `<StudentGradeBook studentId={activeChildId} />`
- `src/components/ui/StudentGradeBook.tsx`: parent path uses `loadParentClassAverageExplain` (no drafts); F-06 clears book/why on studentId change
- `src/lib/gradebook/api.ts` + migration `20260910000004_family_student_gradebook.sql`: `family_student_gradebook` RPC; parent_students gate
- Drawer: Grades → `/parent/grades` (`HamburgerDrawer.tsx`)
- Unit this run: **35/35 pass** — C-01…C-18 engine + classSyllabus.security including F-06, P-G1 push, P-G1…P-G3 book reuse, family_student_gradebook strip, drawer Grades, SEC/A-04/T-04

**SQL supersedes QE2 pending note:** QE2 file still said RPCs “pending live apply”; `t_8e625411` completed after with HTTP 201 apply on aohibokgilxhqwmupdfv. Parent P1 counts **closed** (SQL live + QE2 PASS + defect done).

---

## 4. Defect trail

| Item | Sev | Disposition | Status after REL |
|---|---|---|---|
| Parent full grades book P-G1…P-G4 `t_afaaf1e1` | P1 | FIX-NOW | **CLOSED** (eng `t_e102ba21` + SQL `t_8e625411` + QE2 PASS) |
| Parent Home How-grades + Missing strip `t_f907d7a7` | P2 | SCHEDULE | sticky blocked — **does not block RELEASE** |
| Student assignment detail S-G4 `t_860fefed` | P2 | SCHEDULE | sticky blocked — **does not block RELEASE** |
| Teacher gradebook overall column `t_5a1e5860` | P3 | DEFER | sticky blocked — **does not block RELEASE** |
| QE new DEFECT cards | — | — | **none** |

No leftover elevates to open P0/P1 vs stamped AVG intent. P2/P3 stay sticky per PM disposition `t_02265312` / `avg-iqg-defect-disposition.md`.

**Evidence honesty:** QE1/QE2 are code inspection + automated engine/security tests (not live JWT dogfood screenshots). Independent recheck confirms parent book wiring + 35/35 units including P-G* security tests. Core laws + closed P1 are sufficient for RELEASE APPROVED; incomplete interactive DF screenshots do **not** rise to REJECT (stamp treated live DF as prove-out debt owned by QE; QE marked matrix PASS via code/RPC/test paths). QE2 note that P-G4 closed S-G4 for parent view does **not** close student-seat S-G4 SCHEDULE `t_860fefed` — leave sticky.

**Do not elevate P2/P3:** Home strip and student row-detail remain SCHEDULE; teacher overall DEFER. Task body: sticky non-blocking unless elevated — **not elevated**.

---

## 5. Verdict

**RELEASE: APPROVED**

CEO IQG condition met: dual design stamp + QE1 prove-out PASS + parent P1 FIX-NOW closed (SQL live + QE2 PASS) + open P0/P1 none + QA Sup release evidence. SCHEDULE/DEFER P2/P3 do not block.

**QA Supervisor does not staff DevOps.** Do not reopen non-goals (year composite, Office templates, Syllabus ClassTab icon, teacher class-create, Ask auto-publish). Do not complete parent AVG epic from this card alone (CoS owns epic sticky if any).

---

## 6. Handoff

| Field | Value |
|---|---|
| RESULT | RELEASE APPROVED |
| FILES | `notes/company/avg-iqg-release.md` |
| OPEN ISSUES | P2 SCHEDULE Home strip + S-G4; P3 DEFER teacher overall — sticky only |
| ESCALATION | No |
| NEXT | CoS reports; staff `devops-release` **only if Chuck wants AVG on git**. Leave P2/P3 sticky. |

### RELEASE STAMP (card copy)

```
RELEASE STAMP
Feature: AVG — class syllabus + category-weighted averages
QA Supervisor: APPROVED  date: 2026-09-10  profile-session: t_e198b6a8 / qa-supervisor
Open P0/P1 FIX-NOW: none (t_afaaf1e1 CLOSED)
Stamp vs prove-out: met
P2/P3: sticky SCHEDULE/DEFER — non-blocking
```

### RECOMMENDED NEXT ACTION (CoS)

1. Report AVG IQG RELEASE APPROVED to Chuck.
2. Staff `devops-release` only if Chuck wants AVG commits/SQL already-applied tree on git — not automatic; no force-push; no secrets. SQL `20260910000004` already live via `t_8e625411`.
3. Leave P2 SCHEDULE (`t_f907d7a7`, `t_860fefed`) and P3 DEFER (`t_5a1e5860`) sticky.
4. Do not reopen non-goals (year composite / Office templates / Syllabus tab / create_class / Ask auto-pub).
5. Parent P1 defect `t_afaaf1e1` already done — do not restaff Eng for AVG P0/P1 unless new miss appears.

*End AVG IQG release evidence — APPROVED 2026-09-10 (`t_e198b6a8`).*

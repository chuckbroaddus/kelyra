# TEACH-UX IQG — Real-world intent (retro)

**Date:** 2026-09-10  
**Author:** qa-supervisor (Kelyra)  
**Card:** `t_ddcd2110` · Process: `notes/company/INTENT_QUALITY_GATE.md`  
**Feature:** TEACH-UX — teacher chrome IA  
**Status:** Design-stage IQG **retro** intent. **QA Supervisor DESIGN STAMP: APPROVED**. Impl shipped (A–D + DOC + leftovers + P-06). Not product-complete without prove-out.

**SoT:** teacher-ux-research.md (R1) · teacher-ux-plan.md (P1) · teacher-ux-architecture.md (A1) · teacher-ux-security.md (S1) · teacher-ux-acceptance.md (Q1) · docs/ui-design.md §37.

**Live ground (RO):** trayTabs.ts, classTabs.ts, seat.ts, ChromeProvider, FloatingTabTray, HamburgerDrawer, AppHeader, search.tsx, ask.tsx, index.tsx.

**Parent epic:** t_1607b6cf. Shipped: A t_3d653d82 · B t_170001d0 · C t_e663db8a · D t_74d638da · DOC t_fa6d71a7 · leftovers t_ef0ed78b.

**CEO bar:** Teacher chrome cluttered vs Super/Student; simplify without becoming office or student.

---

## DESIGN STAMP

```
DESIGN STAMP
Feature/bug: TEACH-UX — teacher chrome (Desk·Capture·Needs·Class·Ask; ClassTabs ≤7; seat≠JWT)
Quality goals: one altitude/moment; teacher≠office≠student; capture primary; Needs one noun; Ask class-bound tray-last; dual-hat never merges trays; chrome≠RLS; no sixth tray/Profile-in-tray; no class-create on teacher; demote Week/Heatmap/Family routes stay
PM: APPROVED (pre-IQG P1 + CEO send A–D)  date: 2026-09-03/04  profile-session: TEACH-UX-P1 t_7215b83e / product-manager
QA Supervisor: APPROVED  date: 2026-09-10  profile-session: t_ddcd2110 / qa-supervisor
Intent gaps remaining: none
```

**Stamp meaning:** Intent fully specified in P1/A1/S1/Q1 (hats, entry, lifecycle, multiplicity, reverse, non-goals) — not happy-path only. Live matches core law on static+unit evidence (70/70 chrome tests). Not release-ready.

---

## 1. One-line law

| Role | Job | Chrome altitude | Not |
|---|---|---|---|
| **Teacher** | Class desk: capture → match → review drafts → assign → Approve | Desk · Capture · Needs · Class · Ask | Office People/Matrix; student `/todo` skin; second Ask app |
| **Superintendent / admin** | School directory / matrix | Office tray Feed · Classes · People · Manage · Ask | Teacher grade loop |
| **Student** | My work | Todo / Feeds / Classes / Grades / People · Ask | Teacher tools |
| **Parent** | One-child progress + Ride | Home · Ride · Ask | Grade book |
| **Dual-hat** | Explicit **seat** (office \| teacher \| parent) | Seat chrome === that pure role | Merged trays; seat as JWT/SQL |

**Seat ≠ JWT.** Client preference (AsyncStorage office↔teacher; parent session-only). Server walls stay `class_teacher_of` / `isOfficeRole` / Ask after `getUser`.

---

## 2. Hats (intent vs live)

### 2.1 Pure teacher

| Intent | Spec | Live |
|---|---|---|
| Five tray Desk·Capture·Needs·Class·Ask | TR-01 | **Pass** `tabsFor('teacher')` |
| No office tray keys | OFF-02 | **Pass** |
| ClassTabs ≤7 Today·Needs·Feed·Students·Assignments·Gradebook·Parents | CT-01 | **Pass** length 7 |
| Class tray → setup not gradebook-first | TR-07 | **Pass** `/class/{id}/setup` |
| Needs label; route `/inbox` | TR-06 | **Pass** |
| Capture primary; stay-on-Capture; matcher never inserts | CAP-* | **Pass** code+tests; dogfood QE |
| Header camera propose-only on teacher seat | CAP-04 | **Pass** |
| No class-create | L5/HB-03 | **Pass** `canCreateClass=officeSeat&&can` |
| Drawer: classes · Another class `/?switch=1` · demoted Gradebook/Parents/Family · Diary · Sign out | HB-* | **Pass** no People/Activity on teacher seat |
| Search class-scoped; no school directory | SE-01/02 | **Pass** `listDirectory` office-seat only |
| Ask tray-last + working-in-{class} chip | ASK-01 | **Pass** |

### 2.2 Office / superintendent

| Intent | Spec | Live |
|---|---|---|
| Office tray unchanged | OFF-08 | **Pass** |
| `OFFICE_CLASS_TABS` frozen Feed·Teacher·Parents·Students | CT-05 | **Pass** |
| No teacher Capture/Needs on office seat | X-03/P-06 | **Pass** |
| Header camera off on office seat | §37 | **Pass** `showHeaderCapture` teacher only |

### 2.3 Student / parent

| Intent | Spec | Live |
|---|---|---|
| Student tray **unchanged** this epic | STU-02 | **Pass** (6 keys frozen; out of scope to cut) |
| Parent chrome unchanged except dual-hat drawer | STU-03 | **Pass** Home·Ride·Ask |

### 2.4 Dual-hat office+teacher

| Intent | Spec | Live |
|---|---|---|
| `chrome.role` = explicit seat, not `isTeacherRole` first | X-01/SEC-01 | **Pass** `resolveStaffChromeRole` |
| Default dual-hat = **Office** | §37.3 | **Pass** `defaultChromeSeat` |
| Seat=teacher === pure teacher; seat=office === office tray | X-02/X-03 | **Pass** |
| Never merge trays; remount key = role | R-05/P-06 | **Pass** |
| Drawer Office/Teach rows + a11y; no header chip | §37.3 | **Pass** |
| Office nouns gated on **officeSeat**, not `isAdminRole` | X-05/SEC-02 | **Pass** |
| Same-uid residual office RPCs on teacher seat | X-04/S1 | **Accepted** product wall |

### 2.5 Dual-hat + parent

| Intent | Spec | Live |
|---|---|---|
| Parent seat full parent tray incl Ride | seat.ts | **Pass** |
| My children deep-link without forcing seat flip | DH-06 | **Pass** (intentional) |
| Parent altitude `setChromeSeat('parent')` when canChooseSeat | §31.4b | **Pass** |
| Cold start never restores Parent | DH-07 | **Pass** |
| Teacher desk must not UNION parent_students | X-06 | **Prove-out** QE |
| Twins fail-closed unchanged | X-08 | Guard only |

---

## 3. Chrome entry

| Hat | Primary | Secondary | Forbidden |
|---|---|---|---|
| Teacher | Tray 5 + ClassTabs on `/class/*` | Hamburger class list/switch/demoted records/Diary | Sixth tray; Profile-in-tray; Office People primary |
| Office | Office tray 5 + home PersonTabs | Hamburger People/Activity/matrix | Teacher Capture/Needs mash |
| Student | Student tray | Drawer | Teacher desk |
| Parent | Home·Ride·Ask | Drawer | Teacher gradebook |
| Dual-hat | Hamburger seat rows only | — | Header seat chip; merged tray flash |

---

## 4. Full lifecycle

| Flow | Intent | Live |
|---|---|---|
| Land single-class teacher | Desk → class Today | **Pass** home redirect + Desk href |
| Land multi-class | List / last class then Desk | **Pass** code; dogfood QE |
| Switch class | Drawer class row or Another class `/?switch=1` | **Pass** |
| Capture stack | Tray Capture → spoken name → match/park → stay on Capture | **Pass** law; QE dogfood |
| Needs badge | count-only unassigned+drafts; tray+desk agree | **Pass** unit L1/L2; dual-hat polish parked P2 |
| Open Class records | Tray Class → Students/setup | **Pass** |
| Gradebook / Approve | ClassTabs Gradebook or drawer; nothing grade until Approve | **Pass** law |
| Ask with class | Chip working-in-{class}; no auto-publish | **Pass** |
| Seat switch office↔teacher | Atomic seat-root + tray remount | **Pass** P-06 tests |
| Seat switch → parent | Land `/parent`; parent tray | **Pass** |
| Leave class / close drawer | Back / close scrim; no residual office keys on teacher | **Pass** enough |
| Demoted Week / Heatmap / Family | Deep link still works; not default icons | **Pass** `hrefForClassTab` + DEMOTED |
| Reverse: no create class on teacher | Another class = switch only | **Pass** |

---

## 5. Multiplicity / reverse / non-goals

### 5.1 Multiplicity

| Case | Law |
|---|---|
| Multiple taught classes | Switch via drawer list or `/?switch=1`; Desk binds active `classId` |
| Dual-hat office+teacher | One seat at a time; trays never concat |
| Dual-hat + parent | Parent seat separate; My children deep-link may visit without flip |
| Search without classId on teacher | **Empty / not directory** — not school People firehose |
| Badge | Numeric count only — never names/scores |

### 5.2 Reverse / cancel

| Action | Law |
|---|---|
| Close hamburger | Scrim / swipe; no sixth tab appears |
| Leave class | Navigate away; ClassTabs unmount with route |
| Cancel seat switch mid-drawer | No partial merge (P-06 settle) |
| No Profile-in-tray / no sixth tray | Hard non-goal |

### 5.3 Explicit non-goals (guarded — not defects)

Student skin on teacher · Office People/Matrix on class desk · Teachers create classes · App rewrite / left rail · Sixth tray / Profile-in-tray · Delete Ask or Capture · `/inbox`→`/needs` rename v1 · AVG Syllabus as default ClassTab · Diary/Ledger in tray · Visual restyle · Seat SQL / JWT claims · Phone full Approve (S7) · Merge Capture into Desk-only · Liquid Glass.

---

## 6. Gaps vs live + defects

**Independent static + unit re-check (2026-09-10):** P1/A1/S1/Q1 laws are **complete** (not happy-path-only). Live chrome matches stamp on TR/CT/CAP/ND/ASK/HB/OFF/X/SE/SEC unit matrix (**70/70 pass**).

### 6.1 Intent gaps remaining

**none** — no PM/Designer restaff for missing real-world intent. Realization misses after QE → DEFECT cards; do not reopen design for parked non-goals.

### 6.2 Missed functional defects (this stamp)

**None found** requiring new CoS cards from static review. Parked polish in ui-design §37 (Needs dual-hat count polish, Week/Heatmap secondary chrome, `/needs` rename) stay out of FIX-NOW unless QE elevates with repro.

### 6.3 Prove-out debt (not design gaps)

| Item | Owner |
|---|---|
| DF-1…DF-6 dogfood on real seats | QA Engineer |
| JWT Search wall teacher no-classId | QA Engineer |
| Dual-hat drawer residual after switch (UI frame) | QA Engineer |
| Capture stay-on-Capture live device | QA Engineer |
| Parent seat × teacher desk query wall (X-06/X-07) | QA Engineer |

### 6.4 Core law matched (do not reopen)

- Five teacher tray nouns; Class setup not gradebook-first; CLASS_TABS ≤7; OFFICE_CLASS_TABS frozen.
- Explicit seat via `resolveStaffChromeRole`; never `isTeacherRole` first.
- Drawer office inject on `officeSeat` only; no `isAdminRole` while seat=teacher.
- Search `listDirectory` office-seat only.
- `canCreateClass` office seat + matrix; Ask `create_class` officeOnly.
- Matcher never inserts students; no seat SQL table; chrome ≠ RLS.
- Student + office trays golden paths frozen.

---

## 7. Prove-out OBJECTIVE (QA Engineer)

**Staffing:** CoS creates `qa-engineer` card after this stamp. **Plan + cases now**; **execute vs live impl**. Do not declare TEACH-UX done from this card. No kelyra-qa-loop. No git. No SQL. No implement.

**OBJECTIVE (paste onto qa-engineer card):**

```
OBJECTIVE:
Write test plan + cases for TEACH-UX (teacher chrome IA) vs stamped IQG intent. Land notes/company/teach-ux-iqg-testplan.md (or notes/qa/). Execute against live impl (phases A–D + DOC + leftovers + P-06 seat switch already in tree). File defects on board kelyra with severity (P0–P3) vs stamp; do not bury misses only in comments. Do not invent sixth-tray / student-skin / office-on-desk scope.

SoT: notes/company/teach-ux-iqg-intent.md (stamp), teacher-ux-plan.md (P1), teacher-ux-architecture.md (A1), teacher-ux-security.md (S1), teacher-ux-acceptance.md (Q1 L1–L12 + matrix), docs/ui-design.md §37 / §31.4b.

SCOPE — must cover:
1. HATS: pure teacher; office/super; student unchanged; parent unchanged; dual-hat office+teacher; dual-hat teacher+parent / office+parent; seat ≠ JWT.
2. CHROME ENTRY: tray Desk·Capture·Needs·Class·Ask; ClassTabs ≤7; hamburger class switch; web ≥720 labels on; no Profile-in-tray; no sixth tab.
3. LIFECYCLE: land Desk; multi-class switch; Capture stay-on-Capture + propose header; Needs badge count-only; Class→setup; Gradebook Approve path; Ask class chip; seat switch office↔teacher atomic; parent seat land; close drawer; demoted Week/Heatmap/Family deep links still work.
4. MULTIPLICITY: 2+ taught classes; dual-hat never merge trays; teacher Search without classId ≠ listDirectory; badge not names/scores.
5. SECURITY / ALTITUDE: chrome.role explicit seat; drawer no People/Activity/Responsibilities/class-create on teacher seat; Search T4 wall; Ask chip ≠ SQL; canCreateClass office-only; matcher never insert; no seat SQL; client hide ≠ RLS (JWT checks).
6. NON-GOALS guarded: no student skin; no office People on desk; no AVG Syllabus default ClassTab; Diary/Ledger hamburger not tray; no /inbox rename required; Office+Student trays frozen.

CASES (minimum — expand in testplan):
- Map Q1 DF-1…DF-6 dogfood as first-class execute rows:
  DF-1 Pure teacher day (phone+web)
  DF-2 Dual-hat seat office↔teacher (P-06 settle)
  DF-3 Search wall teacher no classId
  DF-4 ClassTabs density + demoted deep links
  DF-5 Ask chip + no auto-grade
  DF-6 Student + Office regression
- TR-01…12 tray; CT-01…09 tabs; CAP-01…07 capture; ND-01…04 Needs; ASK-01…08; HB-01…06 drawer
- OFF-01…08; X-01…10 dual-hat; SE-01…05 Search; STU-01…04; SEC-01…09 ↔ S1 §2.4
- R-01…12 regression guards
- Re-run unit packs as baseline: trayTabs, classTabs, seat, needsAsk.phaseC, phaseD, teachUxLeftovers, altitudeLocks.security, uxAuditP06.seatSwitch (expect green; failure = P0/P1)

EVIDENCE: automated chrome unit + static policy + scripted UI / JWT fixtures where RLS. Each P0 intent law → evidence path. Open P0/P1 misses → DEFECT [sev] cards parented to epic t_1607b6cf (or this stamp). Confirm parked P2 polish is not silent P0.

CONSTRAINTS: No eng implement on QE card; no git ship; no devops-release; do not complete parent t_1607b6cf; do not treat CoS notes as stamp; do not kelyra-qa-loop.

RECOMMENDED NEXT ACTION after QE plan+execute: QA Supervisor release evidence only when open P0/P1 FIX-NOW closed or in-flight with evidence; then CoS may staff devops-release if release gate applies. Eng only after dual DESIGN STAMP (met) + PM disposition FIX-NOW + ARM.
```

---

## 8. Process / handoff

| Field | Value |
|---|---|
| **QA Supervisor stamp** | **APPROVED** 2026-09-10 · `t_ddcd2110` / qa-supervisor |
| **PM stamp** | **APPROVED** (pre-IQG P1 + CEO send) · TEACH-UX-P1 `t_7215b83e` |
| **DESIGN STAMP (both)** | **Dual-APPROVED** for intent completeness — **not** product-complete |
| **Intent gaps remaining** | **none** |
| **Engineering** | No new TEACH-UX scope from this card. FIX-NOW only if QE files P0/P1 after prove-out + PM disposition + ARM. |
| **QA Engineer** | CoS staffs from §7 OBJECTIVE — plan + execute live prove-out |
| **Parent epic** | `t_1607b6cf` — do not complete from this card |
| **devops-release** | **Blocked** until QE prove-out + open P0/P1 clear + QA Sup release evidence (if release track applies) |
| **RESULT** | Retro intent stamped APPROVED. Prove-out OBJECTIVE ready. No new defect cards from static stamp. |
| **Unit evidence this run** | 70/70 chrome TEACH-UX related tests pass |

### RECOMMENDED NEXT ACTION (CoS)

1. **Staff `qa-engineer`** from §7 prove-out OBJECTIVE (child of epic / this stamp). ARM as needed.
2. Do **not** staff Eng for TEACH-UX unless QE files FIX-NOW defects after prove-out + PM disposition.
3. Do **not** complete parent `t_1607b6cf` until prove-out + P0/P1 clear + release evidence.
4. No devops-release until QA Supervisor release stamp (if shipping track).
5. Leave parked polish (Needs dual-hat count, Week/Heatmap secondary chrome, `/needs` rename) sticky unless elevated.

---

*End TEACH-UX IQG intent — teacher chrome · DESIGN STAMP QA Supervisor APPROVED 2026-09-10 (`t_ddcd2110`). Dual stamp met for intent; product-complete = prove-out + open P0/P1 clear.*

---

## RELEASE STAMP (post prove-out)

```
RELEASE STAMP
Feature: TEACH-UX — teacher chrome IA
QA Supervisor: APPROVED  date: 2026-09-10  profile-session: t_7f443616 / qa-supervisor
Open P0/P1 FIX-NOW: none
Stamp vs prove-out: met — see notes/company/teach-ux-iqg-release.md
P2 leftovers: Needs dual-hat count · Week/Heatmap secondary · /needs rename (sticky non-block)
```

QE: `t_07a0cc56` PASS (`teach-ux-iqg-testplan.md`). Independent recheck 70/70 chrome units + typecheck.

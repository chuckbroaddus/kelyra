# CAL-R3 IQG Prove-out — OBJECTIVE (hybrid R3-C + lean composer)

**Date:** 2026-09-14 (America/Chicago)
**Card:** `t_9644661b` [CAL-R3-QAS] Prove-out OBJECTIVE after R3-C loop pass
**Author:** qa-supervisor (Kelyra)
**Process:** `notes/company/INTENT_QUALITY_GATE.md` Phase 4
**Against dual stamp:**
- PM lock: `notes/company/calendar-r3-pm-lock.md` (PM APPROVED `t_6cfc3988`)
- QAS intent: `notes/company/calendar-r3-intent.md` (QAS APPROVED `t_0e246d9f`)
- Motion: `notes/company/calendar-r3-motion.md` · Delta: `calendar-r3-delta-vs-current.md`
- Prior R2 law still binds: `calendar-r2-pm-lock.md` (CAL-01…24 except CAL-16 → VW-R3-C)
**Implementation:** Loop **passed** `t_e38ede82` / `wf_01a0a1c61b977cc2a1c8d8cdd72edc8a` — security_ok, 0 P0/P1, **no SQL**, typecheck + 55 calendar unit tests green
**Status:** Prove-out OBJECTIVE only. **Do not execute tests here** (qa-engineer). No app code. No git. No SQL. No DESIGN STAMP redo. Not Build / Eng / DITL rewrite.

---

## PROVE-OUT STAMP READY

```
PROVE-OUT OBJECTIVE
Feature: CAL-R3 Calendar hybrid (R3-C views/motion + lean composer)
Stamp: dual APPROVED 2026-09-14 (PM t_6cfc3988 + QAS t_0e246d9f)
Implementation: t_e38ede82 / wf_01a0a1c61b977cc2a1c8d8cdd72edc8a passed; no SQL; 0 P0/P1 loop
Verdict: READY FOR qa-engineer
Blockers for QE: none for plan/cases authoring + execution vs stamp
SQL: none named (no devops-release SQL gate for R3 surface)
DITL: prefer existing sticky t_0a62f427 (UPDATE_PLANS) — do not rewrite DITL on QE card
```

---

## 1. What "full featured" means vs stamp

Full-featured CAL-R3 (for QE prove-out) means the dual lock holds end-to-end on the **shipped tree** — not only “Agenda works.” Map every row to evidence (UI path:line / unit test / seat security). Fail = DEFECT with severity per IQG §5. Loop unit green is **aid**, not substitute for stamp prove-out.

### 1.1 Hats & chrome entry (CE-A HOLD)

| Hat | Must | Stamp law | Prove |
|---|---|---|---|
| Teacher | Drawer **Calendar** (CE-A); quiet Desk text link; seat=teacher scope | CAL-20 · CE-A · US-T-01 | ≤2 taps; **no** 6th tray slot; Desk Today/This week intact |
| Student | CE-A; published + own study only; no hidden quizzes | CAL-06 · US-S-* | Same view spine **read-scoped**; no school-wide create |
| Parent | CE-A; **CH-A focused child** before load when 2+ | CAL-03 · twins | Views + composer bind focused child; switch reloads + clears selection |
| Office / Super | CE-A; school CRUD lean; Year/Month scan | US-O-* · US-O-04 | No parent doctor notes; no homework firehose |
| Dual-hat T+P / O+P | Calendar follows **active seat only** | CAL-20 · intent §1.5 | Teach seat ≠ parent child mash; Parent seat no hidden quizzes |
| Signed-out | No Calendar surface | Auth wall | Dark |

**Chrome invent ban:** no new View-stroke glyphs claimed done; icon pipeline only. In-Calendar Today + view switcher are **route-local** (CAL-36) — not tray rewrite.

### 1.2 View lifecycle (VW-R3-C / CAL-16,25–29,36)

| View | Job | Must prove | Leave / reverse |
|---|---|---|---|
| **Year** | 2-col mini-months; ≤4 role/category dots; Today; Calendars entry | CAL-25 · US-T-11 | Not Desk home; no Inbox; tap month → Month/Day (RM=hard cut); empty=ST-A |
| **Month** | Grid and/or month+list hybrid; sticky title no parallax | CAL-26 · US-T-12 | Day open on select; filters apply; not Desk home |
| **Agenda** | List mode; **phone default** | CAL-16 phone default | Range prev/next; school glance |
| **Day** | Hour gutter + all-day strip + timed blocks + Hidden badge (teacher) | CAL-27 · US-T-13 | Prev/Today/Next always; swipe optional |
| **Week** | Denser all-day + hour gutter; **phone Week first-class** | CAL-28 · US-T-14 | Web teacher default Week; category-primary marks |
| **Multi-day** | 3/5/7 columns | CAL-29 · US-T-15 | Pinch OK full-motion; **RM stepper always**; VO column count |

**Defaults law:** Phone cold-start = **Agenda** (not Year-as-home). Web teacher = **Week**. Office may prefer Month/Year. Last view remembered per **seat + device class**.

### 1.3 Layers / Calendars sheet (MG-A + CAL-34)

open Calendars → Enable/Disable (≠ Delete) → team ⋯ Unsubscribe (confirm; ≠ Delete) → search ≥8 → role-tint dots ≤4 → dismiss; filters refresh; **never elevate RLS**. **No Inbox / publish queue** on sheet.

### 1.4 Lean composer lifecycle (CAL-30/31/33)

`+` / edit / Ask draft → CR-A sheet/modal → title, DATE-P1 start/end (± optional month skin), all-day, kind/category, body → optional Calendar layer row ≤4 role tints → AI banner “Review draft — not saved” → visibility caption → **Save commits** | dirty X/scrim → confirm Discard | clean dismiss. **Absent:** Reminder tab, Travel, URL, Attachments, Invitees, Alert/Repeat (unless real editor exists — omit if null). AI never auto-Save / auto-Publish. No class-create / student-insert / Diary file.

### 1.5 Multiplicity

| Case | Intent law |
|---|---|
| Multi-child parent | CH-A focus; every view + composer bind `child_student_id`; twins never unlabeled merge |
| Multi-class teacher | This class default; All my classes explicit; 5th ≠ 3rd |
| Multi-team sport | Opt-in; Unsubscribe ≠ Delete; events remain for others |
| Multi-device | Prefs per seat+device; no cross-seat bleed |
| Multi-layer density | Search ≥8; VZ-A category-primary; ban rainbow |
| Multi-day columns | 3/5/7 only — not free-form N; RM stepper always when multi-day ships |

### 1.6 Reverse / cancel / already-in-flow

| Flow | Reverse |
|---|---|
| Dirty composer | Scrim/back → Keep editing / Discard; **no shake** |
| Clean sheet | Dismiss / X |
| Saved owner | Edit or Delete (confirm); non-owners cannot delete school |
| Hide / Publish | DP-A badge; Publish via **Needs** deep-link; family never sees hidden |
| Layer Disable | Re-Enable ≠ Delete data |
| Unsubscribe team | Confirm; reverse = re-join path |
| Multi-day | Reverse pinch or stepper → 7 |
| Year/Month drill | Back / switcher / Today |
| AI draft | Discard drops; never auto-commit |
| Offline Save/Delete | Fail closed (CAL-24) |

### 1.7 Motion + RM (CAL-35)

Essential: sheet present/dismiss, dirty confirm, range shift, badge, skeleton static, year drill hard-cut, month scroll no parallax, **multi-day stepper**, Today position. Enhancing (drop under RM): today spring, view crossfade, day swipe, **pinch multi-day**. **Bans:** error-shake, confetti on Save, parallax year, required shimmer, required save-check, auto-open Inbox. Drawer/tray edge wins over day swipe.

### 1.8 Product laws that must still hold on every new view

- Assign ≠ publish; Hidden quiz teacher-only across Year/Month/Day/Week/Multi-day/Agenda
- Filters/chips ≠ security (RLS-denied never appear)
- LF-A chips **primary** on-canvas (CAL-32 — not buried only in Calendars sheet)
- ≤4 role tints; no per-cal rainbow
- Sports default off
- AI search ⊆ visible; draft-then-Save
- Desk Today/This week **unchanged**; Calendar ≠ Diary

---

## 2. Explicit non-goals still out

Documented so “not built” ≠ incomplete. QE must **not** fail CAL-R3 for absence of:

1. Apple Reminders tab / any Reminders→Diary map
2. Diary / journal body on Calendar
3. 6th tray / CE-C tray tab
4. Desk replacement (Year/Month as app home / Today shelf)
5. Calendar Inbox owning Publish (Needs owns Publish)
6. Travel / URL / Attachments / Invitees composer parity
7. Alert / Repeat editors (recurrence null v1)
8. iCal / Google two-way / RSVP mesh
9. Rainbow per-calendar colors / chip demotion to filter-menu-only
10. is_staff widen, class-create, student-insert, twin merge, grade Approve from Calendar/Ask
11. Invent chrome outside CE-A + route-local switcher
12. SportsYou / consumer iCloud account model
13. Error-shake / confetti / required shimmer / parallax
14. Drag-reschedule on grid; CH-C dual-pane parent
15. FullCalendar / Wix Agenda as product shell

---

## 3. DITL IMPACT vs shipped R3 (verdict only)

Design-stage intent §11 was **UPDATE_PLANS**. CoS already filed sticky `t_0a62f427` (Calendar surface) and noted R3 hybrid also UPDATE_PLANS when Chuck unblocks. **Do not rewrite DITL on this QE card.** Prefer that sticky.

```
DITL IMPACT
Change: CAL-R3 hybrid shipped on tree via t_e38ede82 / wf_01a0a1c61b977cc2a1c8d8cdd72edc8a — Year/Month/Day timeline/Week denser+phone/Multi-day+RM stepper + lean composer; CE-A/Desk/Diary hold; Reminders drop; no SQL
Verdict: UPDATE_PLANS
Plans touched: DITL-T-01..T-05; DITL-P-01..P-03; DITL-O-01..O-07; DITL-S-01..S-03; DITL-DH-01..DH-02 — add CE-A Calendar entry + view-spine steps (year/month/day/week/multiday or Agenda default) where dated load is in the day job; dual-hat seat calendar scope; Hidden-across-views; lean composer Save/Discard
Cases touched: matching cases after plan rewrite (CoS/Chuck via existing sticky t_0a62f427 — not this QE card)
New DITL needed: no (absorb into existing role days; optional later calendar-heavy day only if Chuck wants dedicated spine drill)
Seed/artifacts: update seed if calendar fixtures missing for year dots / multi-day / hidden-across-views
Notes: Prefer existing sticky t_0a62f427. QE prove-out may note DITL lag in handoff but must not rewrite ditl-plans/cases here. Current ditl still ~zero Calendar coverage; R3 makes omission stale. Do not fake PASS without hats + view spine + RM stepper + lean composer + CE-A/Desk holds.
```

| Artifact | R3 state | Action on QE card |
|---|---|---|
| Sticky `t_0a62f427` | Blocked needs_input until Chuck | **Prefer** — leave alone |
| `ditl-plans/*` Calendar beats | Still lag | Out of scope here (UPDATE_PLANS sticky) |
| `ditl-cases/*` | Still lag | Out of scope here |
| `notes/company/calendar-r3-proveout-objective.md` | This file | SoT for QE stamp prove-out |

---

## 4. OBJECTIVE block (paste to qa-engineer)

```
OBJECTIVE:
IQG Phase 4 prove-out for CAL-R3 hybrid (R3-C views/motion + lean composer). Write notes/company/calendar-r3-testplan.md + cases; execute vs dual stamp; file DEFECT [P0–P3] on board kelyra with severity. No app code. No git. No SQL. No DESIGN STAMP redo. No DITL rewrite (prefer sticky t_0a62f427).

CONTEXT:
- Stamp SoT: notes/company/calendar-r3-pm-lock.md (PM t_6cfc3988) + notes/company/calendar-r3-intent.md (QAS t_0e246d9f). Motion calendar-r3-motion.md. R2 base calendar-r2-pm-lock.md still binds except CAL-16→VW-R3-C + CAL-25…36.
- Prove-out OBJECTIVE: notes/company/calendar-r3-proveout-objective.md (this file).
- Implementation: t_e38ede82 / wf_01a0a1c61b977cc2a1c8d8cdd72edc8a PASSED; security_ok; 0 P0/P1; no SQL named; typecheck + 55 calendar unit tests green.
- Changed anchors (start here, not a pass): src/app/calendar.tsx; DayColumn.tsx; TeacherWeekGrid.tsx; EventComposer.tsx; CalendarsSheet.tsx; MonthGrid.tsx; YearGrid.tsx; MultiDayStepper.tsx; src/lib/calendar/{timeline,month,year,multiday,viewPrefs,roleTint,r3.views.test,calendar.security.test}.ts*.
- Loop P3 leftovers (not stamp blockers alone): multiday view chip always jumps to today; r3.views.test Today-anchor assertion loose — verify or file P3 if still true.
- Parent track t_b366690c; DITL sticky t_0a62f427 (do not rewrite).

REQUIREMENTS:
1. Test plan at notes/company/calendar-r3-testplan.md covering hats, dual-hat, chrome CE-A, full view lifecycle, multiplicity, reverse/cancel, lean composer, motion/RM, non-goals, security holds.
2. Must-prove (execute; record evidence path:line / screenshot / test id):
   A. CE-A: every signed-in hat opens Calendar from drawer; teacher quiet Desk link; system tray still 5 slots (no 6th); Desk Today/This week intact; Calendar ≠ Desk year home.
   B. Views VW-R3-C reachable via in-Calendar switcher: Year (2-col mini-months, ≤4 tint dots, Today, no Inbox), Month grid/list, Day hour-gutter + all-day + timed blocks + teacher Hidden badge, Week denser (all-day+hours) including phone Week first-class, Multi-day 3/5/7, Agenda list.
   C. Defaults: phone cold-start Agenda (not Year home); web teacher Week; last view prefs per seat+device class.
   D. Multi-day: stepper 3/5/7 works with Reduce Motion ON without pinch; full motion may pinch; VO announces view/column count when practical.
   E. Lean composer: fields title/DATE-P1/all-day/kind/category/body/visibility; AI draft banner not saved until Save; dirty Discard confirm; ABSENT Reminder tab, Travel, URL, Attachments, Invitees, Alert/Repeat (if no model editor).
   F. LF-A chips primary on main Calendar; Calendars sheet Enable/Disable, Unsubscribe≠Delete, tint dots ≤4, NO Inbox/publish queue; filters ≠ security.
   G. Hats security: Hidden quiz never on family Year/Month/Day/Week/Multi-day/Agenda; parent CH-A twins focus switch reloads all views; dual-hat seat-correct scope; student no school-wide create; sports opt-in default off.
   H. Reverse leave: leave views via switcher/back; multi-day back to 7; year drill reverse; composer clean/dirty paths; Publish remains Needs-owned (no Calendar Inbox).
   I. Motion: sheet springs or RM fade; no error-shake/confetti/parallax/required shimmer; drawer edge not stolen.
   J. Non-goals remain absent without claiming done (Reminders, 6th tray, Desk=year, Diary on Calendar, rainbow, FullCalendar shell).
3. File each miss as DEFECT [sev] card on kelyra (not only comment): REPRO, HAT/ROLE, EXPECTED (stamp), ACTUAL, EVIDENCE, PARENT t_b366690c or t_e38ede82.
4. Severity: P0 data-loss/wrong-child/hidden leak/safety; P1 primary hat or lifecycle missing (e.g. no RM stepper, no CE-A, Year as Desk home, Reminder tab shipped); P2 secondary/multiplicity with workaround; P3 polish (incl. known loop P3s if still true).
5. DITL: note lag only; prefer t_0a62f427 — do not rewrite ditl-plans/cases on this card.

CONSTRAINTS:
- No Eng implementation. No git commit/push. No SQL apply. No inventing chrome icons.
- Do not treat missing non-goals (Reminders, iCal, Invitees, drag-reschedule) as defects.
- Loop unit tests are evidence aids, not a substitute for stamp prove-out across hats.
- Do not self-certify release; return evidence to QA Supervisor.

ACCEPTANCE:
- calendar-r3-testplan.md + executed evidence matrix vs §1 of proveout
- P0/P1 filed or none found (explicit statement)
- Handoff: RESULT pass|fail + OPEN ISSUES + next (PM disposition / FIX-NOW / QAS release review)
- DITL note points at t_0a62f427 without rewrite

RECOMMENDED NEXT ACTION:
Return evidence to QA Supervisor for release gate; CoS staffs PM on any new DEFECT cards. Hold git until Chuck ship.
```

---

## 5. Must-prove matrix + code anchors

### 5.1 Code-side anchors (QE start here; not a pass)

| Area | Paths |
|---|---|
| Route / switcher / CE-A shell | `src/app/calendar.tsx` |
| Day timeline | `src/components/calendar/DayColumn.tsx`, `src/lib/calendar/timeline.ts` + `.test.ts` |
| Week denser + phone | `src/components/calendar/TeacherWeekGrid.tsx`, `src/lib/calendar/week.ts` |
| Year 2-col | `src/components/calendar/YearGrid.tsx`, `src/lib/calendar/year.ts` + `.test.ts` |
| Month grid/list | `src/components/calendar/MonthGrid.tsx`, `src/lib/calendar/month.ts` + `.test.ts` |
| Multi-day + RM stepper | `src/components/calendar/MultiDayStepper.tsx`, `src/lib/calendar/multiday.ts` + `.test.ts` |
| View prefs (seat+device) | `src/lib/calendar/viewPrefs.ts` + `.test.ts` |
| Role tints ≤4 | `src/lib/calendar/roleTint.ts` |
| Lean composer | `src/components/calendar/EventComposer.tsx`, `src/lib/calendar/askDraft.ts` |
| Calendars sheet / no Inbox | `src/components/calendar/CalendarsSheet.tsx` |
| Agenda list | `src/components/calendar/AgendaList.tsx` |
| Seat / visibility / filters | `src/lib/calendar/seat.ts`, `visibility.ts`, `filters.ts` |
| R3 view suite + security | `src/lib/calendar/r3.views.test.ts`, `calendar.security.test.ts` |
| Motion SoT (spec) | `notes/company/calendar-r3-motion.md` |

### 5.2 Must-prove ID seeds (for testplan)

| ID | Focus | Sev if miss |
|---|---|---|
| R3-CE-A-01 | Drawer Calendar all hats; no 6th tray; Desk intact | P1 |
| R3-DH-01 | Dual-hat seat-correct scope on every view | P1 |
| R3-YR-01 | Year 2-col; ≤4 dots; no Inbox; not Desk home | P1 |
| R3-MO-01 | Month grid/list; day drill; filters | P1 |
| R3-DY-01 | Day hour gutter + all-day + Hidden badge teacher | P1 |
| R3-WK-01 | Week denser; phone Week first-class | P1 |
| R3-MD-01 | Stepper 3/5/7 with RM ON (no pinch required) | P1 |
| R3-MD-02 | Pinch multi-day full-motion (enhancing) | P2 if missing when motion OK |
| R3-AG-01 | Phone default Agenda | P1 |
| R3-CR-01 | Lean composer fields + AI draft-then-Save | P1 |
| R3-CR-02 | Absent Reminder/Travel/URL/Attachments/Invitees | P1 if present |
| R3-LF-01 | Chips primary; Calendars sheet secondary; no Inbox | P1 |
| R3-HID-01 | Hidden never on family any view | P0 |
| R3-TW-01 | Parent twins focus switch reloads all views | P0/P1 |
| R3-RV-01 | Reverse leave views + dirty discard | P1 |
| R3-MOT-01 | Springs/RM; bans (shake/confetti/parallax) | P2/P3 |
| R3-NG-01 | Non-goals absent (document, not fail) | — |

### 5.3 Severity guide (IQG)

| Sev | Meaning for CAL-R3 |
|---|---|
| P0 | Hidden leak to family; twin unlabeled merge; wrong-child calendar; data loss on Save/Delete |
| P1 | Missing primary view; no RM stepper; CE-A broken; Year as Desk home; Reminder tab shipped; lean composer broken; dual-hat cross-seat leak |
| P2 | Secondary hat polish; pinch-only gap with stepper present; multiplicity workaround exists |
| P3 | Motion polish; Today-anchor chip jump; loose unit asserts |

---

## 6. Leftovers / known non-blockers

| Kind | Item | Disposition |
|---|---|---|
| Loop P3 | Multiday view chip always jumps to today | QE verify; file DEFECT [P3] if still true — not OBJECTIVE blocker |
| Loop P3 | `r3.views.test` Today-anchor assertion loose | QE note; optional P3 — not stamp miss alone |
| SQL | None named by implement loop | No devops-release SQL gate for R3 surface |
| Git | Uncommitted R3 tree until Chuck ship | QE proves working tree; no commit from QE |
| DITL | Plans/cases lag Calendar | Sticky `t_0a62f427` UPDATE_PLANS — Chuck unblocks; not QE rewrite |
| R2 live SQL | Prior calendar RPC/security still law | Reuse R2 security tests as regression aids |
| Non-goals | Reminders, Inbox, iCal, Invitees, etc. | Absence = correct; do not defect |

**No stamp-required product surface known missing from loop pass narrative** — QE must still independently prove hats/lifecycle vs dual stamp. Loop `passed` ≠ product-complete until this prove-out executes.

---

## 7. Close disposition (this card)

| Field | Value |
|---|---|
| PROVE-OUT STAMP | **READY FOR qa-engineer** |
| DITL IMPACT verdict | **UPDATE_PLANS** (prefer `t_0a62f427`) |
| File | `notes/company/calendar-r3-proveout-objective.md` |
| Impl ref | `t_e38ede82` / `wf_01a0a1c61b977cc2a1c8d8cdd72edc8a` |
| SQL | **none** |
| Eng / git / DITL rewrite | **No** from this card |
| NEXT | CoS staffs `qa-engineer` from §4 paste block |

*End prove-out OBJECTIVE — t_9644661b. Dual stamp unchanged. No tests executed.*

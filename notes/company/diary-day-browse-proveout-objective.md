# DIARY DAY-BROWSE (DB-B) — IQG Prove-out OBJECTIVE

**Date:** 2026-09-18 (America/Chicago)  
**Card:** `t_aa9ca9ef` [DIARY] QAS prove-out OBJECTIVE after DB-B loop  
**Author:** qa-supervisor (Kelyra)  
**Process:** `notes/company/INTENT_QUALITY_GATE.md` Phase 4  
**Against dual stamp (MET 2026-09-17 on parent `t_ea554343`):**  
- PM lock: `notes/company/diary-day-browse-spec.md` — PM APPROVED `t_f766ae6a` · pack **DB-B** + **PR-BOTH · RG-DROP · SR-KEEP · EM-PRIMARY · FW-FORK · RR-L reject**  
- QAS intent: `notes/company/diary-day-browse-intent.md` — QAS APPROVED `t_d717511a` (any-legal-pack laws; PM lock matched restamp triggers → no restamp)  
- Chrome entry (already dual-stamped, not reopened): ST-A tray Diary · `settings-tabs-diary-tray-spec.md` / intent  
- Designer visual: `notes/company/diary-day-browse-mockups/db-b.html`  
**Implementation claim:** Loop **passed** `t_ce15c1c9` / `wf_01a0b09fca8f70e2b131fd383e3c995d` — security_ok, 0 P0/P1, **no SQL**, typecheck + 25 diary unit tests green (loop narrative). **Git not shipped.**  
**Status:** Prove-out OBJECTIVE only. **Do not execute tests here** (qa-engineer). No app code. No git. No SQL. No DESIGN STAMP redo. Not Build / Eng / DITL rewrite.

---

## PROVE-OUT STAMP READY

```
PROVE-OUT OBJECTIVE
Feature: Diary Journal day-browse (DB-B month grid + selected-day agenda)
Stamp: dual APPROVED 2026-09-17 (PM t_f766ae6a + QAS t_d717511a) on parent t_ea554343
Implementation claim: t_ce15c1c9 / wf_01a0b09fca8f70e2b131fd383e3c995d passed; no SQL; 0 P0/P1 loop; git not shipped
Verdict: READY FOR qa-engineer — with TREE GATE (§0) mandatory before any pass claim
Blockers for QE: none for plan/cases authoring; execution must open LIVE UI on the working tree under test
SQL: none named (no devops-release SQL gate)
DITL: prefer sticky t_d94e0385 (UPDATE_PLANS|UPDATE_CASES) — do not rewrite DITL on QE card
```

---

## 0. Honesty bar — LIVE UI vs STATIC (binding)

| Claim class | Counts as stamp evidence? | Notes |
|---|---|---|
| **LIVE UI** (phone and/or web): open `/diary` Journal as the hat, exercise pick/change/Today/empty/composer/twins | **YES — required** | Screenshots or step log with seat + device. Experience-first. |
| Unit / security tests (`dayBrowse.test.ts`, `diary.security.test.ts`) | **Aid only** | Green units ≠ stamp met. |
| Code inspect / path:line | **Aid only** | Confirms anchors exist; does not replace LIVE UI. |
| Loop `passed` narrative / report.md | **Not a stamp** | History only. |
| Plan-only / testplan written without execution | **Not a stamp** | Plan lands first; prove-out = execute. |
| Mockup HTML only (`db-b.html`) | **Not a stamp** | Design reference. |
| DITL plan text | **Not a stamp** | Doc sync is separate (`t_d94e0385`). |

**Law:** Plan-only is not a stamp. Unit+inspect ≠ stamp. Loop `passed` ≠ product-complete until this prove-out executes against the dual stamp on the **tree under test**.

### 0.1 TREE GATE (QAS 2026-09-18 observation — QE must re-verify)

At prove-out OBJECTIVE write time on `main` working tree:

- `src/app/diary.tsx` still exposes primary Journal **From/To** text + Apply (pre-DB-B baseline).  
- `src/lib/diary/dayBrowse.ts`, `dayBrowse.test.ts`, `src/components/diary/JournalMonthGrid.tsx` are **absent** from the working tree (blobs may exist only in local stash / dangling objects — not a ship).  
- Stamp notes `diary-day-browse-spec.md` / `diary-day-browse-intent.md` may also be missing from disk; dual stamp remains durable on kanban parent `t_ea554343` comments + this OBJECTIVE.  
- Loop claimed those files; **git was never shipped**; later soft/chrome work may have wiped uncommitted DB-B dirt.

**QE step 0 (before any PASS):** Confirm DB-B anchors exist on the tree you are proving:

1. Journal primary chrome is **month grid + Today + ◀▶**, not From/To+Apply as primary.  
2. Files (or equivalent): `JournalMonthGrid` (or diary-local month primitive), `dayBrowse` helpers, Journal wiring in `diary.tsx`.  
3. If anchors **missing** → file **DEFECT [P1]** (or P0 if production already claimed ship): “DB-B Journal day-browse not present on working tree despite loop pass / dual stamp.” Do **not** mark prove-out pass. Stop and hand CoS (restore tree / re-staff Eng) — do not paper over with unit-only.

If CoS restores stash/`stash@{0}^3` blobs or re-lands Eng before QE runs, re-run GATE then continue §1.

---

## 1. What “full featured” means vs dual stamp

Full-featured DB-B day-browse means the dual lock holds end-to-end on the **shipped (or tree-under-test) Journal** — not only “a month grid paints.” Map every row to **LIVE UI** evidence (seat + path). Fail = `DEFECT [sev]` on board `kelyra` per IQG §5.

### 1.1 Hats & chrome entry (ST-A — consume, do not reopen)

| Hat | Must | Stamp law | Prove (LIVE) |
|---|---|---|---|
| **Teacher** | Tray **Diary** (ST-A composition: Desk · Needs Attention · Diary · Kelyra) → `/diary` Journal with DB-B chrome | ST-A · US-DB entry | ≤2 taps from tray; **no** 6th tray; hamburger is **not** primary teacher Diary door |
| **Parent** | Hamburger **Diary** → `/diary`; multi-child chips above month when 2+ | ST-A · TWIN | Journal opens; chips above grid; fail-closed until focus |
| **Office / staff** | Hamburger **Diary** → `/diary` staff seat | ST-A · SEAT | Owner journal only; not Office Activity firehose |
| **Student** | **Zero** Diary / zero day-browse | L7 · SEAT | No tray Diary; no `/diary` body; no student journal beats |
| **Dual-hat** (T+P, O+P) | Diary follows **signed-in chrome seat only** | intent dual-hat | Teach seat ≠ parent child mash; switch seat → correct owner/child scope |
| **Signed-out** | No Diary surface | Auth | Dark |

**Chrome invent ban:** no new View-stroke glyphs claimed done; no 6th tray; teacher entry stays ST-A tray (designer hamburger wording superseded).

### 1.2 Journal lifecycle (DB-B pack)

| Step | Must prove | Leave / reverse |
|---|---|---|
| **Pick day** | Tap month cell → selected wash/highlight; agenda anchors on that `entry_date` | — |
| **Change day** | Tap another cell → focus moves; agenda re-anchors; **auto-apply** (no primary Apply) | — |
| **Month nav** | ◀ month ▶ changes grid; selection behavior sane (Today or keep intent per ship) | Reverse months back |
| **Today** | **Today** control jumps selection to today; today cell has distinct ring/pill (look-only) | — |
| **Multi-day scroll** | Entry agenda under grid (phone) or split ~280px month + stream (web); sticky day `SectionHeader`s; adjacent days with entries in scroll window | Scroll away / back |
| **Empty day** | Selected day with no entries: copy **No entries yet on this day.** + primary **New entry** (EM-PRIMARY) | — |
| **New entry / composer** | CTA opens **Diary** FormSheet (not Calendar + / EventComposer); DATE-P1 `entry_date` prefilled = selected day | Dirty discard / clean dismiss; edit/delete stay Diary |
| **Sort** | Newest / Oldest chips on agenda (SR-KEEP); default Newest | Toggle reverse |
| **Search / tag / teacher pointer** | Remain orthogonal — **not** painted into day cells; do not become identity chrome | Clear filters |
| **RG-DROP** | Primary Journal **From/To TextFields + Apply removed** (or non-primary collapsed custom range only — must not fight selected-day focus) | If custom range exists, dismiss/collapse |
| **Cancel / reverse filters** | Clear search/tag/pointer; day focus can return to Today / named default | Fail-closed parent still empty until child focus |
| **FERPA / privacy honesty** | `DIARY_FERPA_NOTE` (or equivalent) still on screen; presence never other people | — |

### 1.3 Presence (PR-BOTH)

| Case | Law |
|---|---|
| count = 1 | Neutral **dot** on day cell |
| count > 1 | Small **count**, cap display **9+** |
| Owner scope | Self (teacher/staff) or **focused child only** (parent) |
| Ban | **Never** roleTint / multi-tint / dayTintSeeds / CalendarItem / other people’s marks |

### 1.4 Multiplicity

| Case | Intent law |
|---|---|
| Parent 2+ children (twins) | Chips **above** month; **fail-closed empty** until focus; **never mix** twin streams in grid or agenda |
| Parent 1 child | No forced chip wall; journal loads that child |
| Teacher soft student pointer | Orthogonal filter — not inside day cells / not twin identity |
| Teacher multi-class pointer | Class + student pointer stay list filters, not day presence |
| Phone vs web | Same laws; web may split month sticky ~280px + agenda (sticky month is **P3 polish** if split exists without stick — leftover `t_f368074b`) |
| Dual-hat seat switch | Reload owner scope; no cross-seat bleed |

### 1.5 Ledger & Calendar product separation

| Surface | Must hold |
|---|---|
| **Ledger** segment | Unchanged **list + range** (+ family / class / student filters as live). **No** month grid / strip / stepper (RR-L reject). |
| **Diary Journal** | No Calendar events, layers, dues, sports, Hidden badges, CalendarsSheet, EventComposer, hour-gutter DayColumn, Day/Days/Week view chips (DB-C out). |
| **Calendar** route | No Diary body / journal entries as a browse mode. |
| **FW-FORK** | Diary-named primitives only; thin shared date math OK; **never** pipe CalendarItem into Journal data path. |

### 1.6 Reverse / cancel / already-in-flow (summary)

| Flow | Reverse |
|---|---|
| Selected day | Today or another day |
| Month away from current | ◀▶ back |
| Empty New entry dirty | Discard confirm / keep editing |
| Empty New entry clean | Dismiss |
| Saved entry | Edit or Delete (confirm) via Diary composer |
| Search/tag/pointer on | Clear → full owner stream for focus day |
| Parent unfocused twins | Empty fail-closed; focusing a child opens that journal only |
| Leave Diary | Back / tray / hamburger; Calendar still separate product |

---

## 2. Explicit non-goals still out

Documented so “not built” ≠ incomplete. QE must **not** fail DB-B for absence of:

1. Calendar events / layers / dues / sports / Hidden badges on Diary  
2. Diary journal body as a mode on Calendar  
3. Ledger day-grid / strip / MultiDayStepper default (RR-L)  
4. 6th tray tab; teacher Class/Capture tray restore  
5. DB-C Day·Days·Week·Year Journal view chips / hour-gutter DayColumn  
6. FullCalendar / Wix shell; Apple Reminders product  
7. Student Diary (L7 / DITL-S-02 still NON-GOAL — do not revive)  
8. Office-visible journal body (model C owner-only)  
9. Ask NL Dear Diary (`t_cecf2af0`)  
10. roleTint / multi-tint presence on Journal days  
11. Merging Calendar + Diary modules/routes  
12. Invented View-stroke glyphs outside icon recipe pipeline  
13. Git ship / SQL migrations for this surface (UI-only; none named)

---

## 3. DITL IMPACT vs **shipped** behavior (Phase 4 re-eval)

Design-stage intent called **UPDATE_PLANS | UPDATE_CASES**. CoS filed sticky `t_d94e0385` (ditl-scribe). At OBJECTIVE time that card is still **blocked** (Gemini free-tier quota / `needs_arm_grant:gemini`) — **do not wait**; **do not rewrite DITL on the QE card**.

```
DITL IMPACT
Change: Diary Journal gains Calendar-like day-pick + multi-day entry browse (DB-B month grid + agenda + Today + owner presence); Ledger unchanged; Calendar product unchanged; chrome entry already ST-A; git not shipped at OBJECTIVE time
Verdict: UPDATE_PLANS | UPDATE_CASES
Plans touched: DITL-T-04 (teacher diary beats — day-browse / Today / empty / multi-day; keep Ask draft-then-Save); verify DITL-T-01 not From/To-only; scan parent/office /diary wording if present
Cases touched: T-04 create/filter; any case asserting text From/To as sole Journal date UI
New DITL needed: no (absorb into existing role days)
Seed/artifacts: none required for day-browse chrome alone; owner journal fixtures if empty-day/Today drills need rows
Notes: Prefer sticky t_d94e0385. Honesty: DITL-S-02 student Diary remains NON-GOAL (L7) — do not mark student diary SUPPORTED; do not revive S-02 journal beats. QE may note DITL lag in handoff; must not rewrite ditl-plans/cases here. Do not fake PASS without LIVE UI hats + lifecycle.
```

| Artifact | State | Action on QE card |
|---|---|---|
| Sticky `t_d94e0385` | Blocked (Gemini quota / ARM) | **Prefer** — leave alone; CoS/ditl-scribe owns |
| `ditl-plans/*` From/To-only Journal | Likely lag until scribe lands | Out of scope here |
| `ditl-cases/*` | Likely lag | Out of scope here |
| This file | SoT for QE stamp prove-out | Execute vs §1 |

---

## 4. OBJECTIVE block (paste to qa-engineer)

```
OBJECTIVE:
IQG Phase 4 prove-out for Diary Journal day-browse pack DB-B (month grid + selected-day agenda + Today + owner-only presence). Write notes/company/diary-day-browse-testplan.md + cases; execute vs dual stamp with LIVE UI (experience-first). File DEFECT [P0–P3] on board kelyra with severity. No app code. No git. No SQL. No DESIGN STAMP redo. No DITL rewrite (prefer sticky t_d94e0385).

CONTEXT:
- Stamp SoT: notes/company/diary-day-browse-spec.md (PM t_f766ae6a · DB-B + PR-BOTH · RG-DROP · SR-KEEP · EM-PRIMARY · FW-FORK · RR-L reject) + notes/company/diary-day-browse-intent.md (QAS t_d717511a). Dual MET on parent t_ea554343 2026-09-17. Chrome entry ST-A (settings-tabs-diary-tray-*). Mockup notes/company/diary-day-browse-mockups/db-b.html.
- Prove-out OBJECTIVE: notes/company/diary-day-browse-proveout-objective.md (this file) — §0 honesty + TREE GATE binding.
- Implementation claim: t_ce15c1c9 / wf_01a0b09fca8f70e2b131fd383e3c995d PASSED; security_ok; 0 P0/P1; no SQL; tsc + 25 diary unit tests (loop). Git not shipped.
- Expected anchors (start here, not a pass): src/app/diary.tsx Journal segment; src/components/diary/JournalMonthGrid.tsx (or diary-local month primitive); src/lib/diary/dayBrowse.ts + dayBrowse.test.ts; diary.security.test.ts; src/lib/diary/seat.ts (student closed). Do not change calendar product.
- TREE GATE: If main/working tree still shows Journal From/To+Apply as primary and lacks dayBrowse/JournalMonthGrid, file DEFECT [P1] “DB-B not on tree despite loop pass,” stop PASS, hand CoS — units alone do not pass.
- Loop leftovers (parked, not OBJECTIVE blockers alone): t_df7cf4c6 P2 filter-miss uses true-empty EM-PRIMARY; t_626792a2 P3 parent chips also on Ledger; t_f368074b P3 web month pane not scroll-sticky — verify or file if still true.
- IQG parent tracker t_ea554343 (do not --parent). DITL sticky t_d94e0385 (do not rewrite).

REQUIREMENTS:
1. Test plan at notes/company/diary-day-browse-testplan.md covering hats, dual-hat, ST-A chrome entry, full DB-B lifecycle, multiplicity (twins fail-closed), presence PR-BOTH, reverse/cancel, composer DATE-P1, Ledger/Calendar non-goals, security holds.
2. Must-prove (execute LIVE UI; record evidence seat + device + path; unit/inspect = aid only):
   A. TREE GATE: DB-B anchors present; Journal primary = month grid + Today + ◀▶ + agenda (RG-DROP From/To+Apply as primary).
   B. ST-A entry: teacher tray Diary; parent/office hamburger Diary; student zero Diary; no 6th tray; dual-hat = chrome seat only.
   C. Lifecycle: pick day, change day (auto-apply), month ◀▶, Today jump, multi-day agenda scroll with sticky day headers, empty day EM-PRIMARY + New entry → Diary composer with entry_date = selected day (not Calendar +).
   D. Sort Newest/Oldest kept; search/tag/teacher pointer orthogonal (not in day cells).
   E. Presence PR-BOTH: owner-only dot/count (9+ cap); never roleTint/CalendarItem/other people; parent = focused child only.
   F. Twins: chips above month; fail-closed empty until focus; never mix twin streams.
   G. Ledger unchanged list+range (no day-grid); Calendar route has no Diary body; no events/layers/CalendarsSheet/EventComposer/hour-gutter/DB-C chips on Journal.
   H. Reverse: Today/other day, clear filters, composer dirty discard / clean dismiss, leave Diary without breaking Calendar.
   I. Non-goals remain absent without claiming done (student Diary, Ask NL, Reminders, FullCalendar, roleTint, 6th tray).
3. File each miss as DEFECT [sev] card on kelyra (not only comment): REPRO, HAT/ROLE, EXPECTED (stamp), ACTUAL, EVIDENCE, PARENT t_ea554343 or t_ce15c1c9.
4. Severity: P0 wrong-child/twin mix/data loss/privacy leak (other people’s journal/presence); P1 primary hat or lifecycle missing (no month grid, no Today, no ST-A entry, student Diary open, Calendar merge, tree missing DB-B); P2 secondary/multiplicity with workaround (incl. known filter-miss empty if still true); P3 polish (chips on Ledger, web month not sticky).
5. DITL: note lag only; prefer t_d94e0385 — do not rewrite ditl-plans/cases on this card. Do not revive DITL-S-02 student Diary.

CONSTRAINTS:
- No Eng implementation. No git commit/push. No SQL apply. No inventing chrome icons.
- Do not treat missing non-goals as defects.
- Loop unit tests are evidence aids, not a substitute for stamp prove-out across hats on LIVE UI.
- Do not self-certify release; return evidence to QA Supervisor.

ACCEPTANCE:
- diary-day-browse-testplan.md + executed evidence matrix vs §1 of proveout (LIVE UI required)
- TREE GATE result explicit (pass anchors | DEFECT filed)
- P0/P1 filed or none found (explicit statement)
- Handoff: RESULT pass|fail + OPEN ISSUES + next (PM disposition / FIX-NOW / QAS release review)
- DITL note points at t_d94e0385 without rewrite
```

---

## 5. Must-prove matrix + code anchors

### 5.1 Code-side anchors (QE start here; not a pass)

| Area | Paths (expected after DB-B land) |
|---|---|
| Route / Journal + Ledger | `src/app/diary.tsx` |
| Month grid primitive | `src/components/diary/JournalMonthGrid.tsx` (FW-FORK name may vary — diary-local only) |
| Day-browse helpers / tests | `src/lib/diary/dayBrowse.ts`, `dayBrowse.test.ts` |
| Seat / student closed | `src/lib/diary/seat.ts`, `diary.security.test.ts` |
| Privacy / FERPA | existing diary privacy copy + `DIARY_FERPA_NOTE` |
| Calendar must stay separate | `src/app/calendar.tsx` + `src/components/calendar/*` — **no** Journal body; do not regress Calendar for this prove-out |
| Chrome entry ST-A | tray tabs / hamburger composition (Desk·Needs·Diary·Kelyra teacher) |

### 5.2 Must-prove ID seeds (for testplan)

| ID | Focus | Sev if miss |
|---|---|---|
| DB-TREE-01 | Anchors present; RG-DROP primary From/To gone | P1 |
| DB-CE-ST-A-01 | Teacher tray Diary; no 6th tray | P1 |
| DB-CE-ST-A-02 | Parent/office hamburger Diary; student zero | P1 |
| DB-DH-01 | Dual-hat seat-correct journal scope | P1 |
| DB-NAV-01 | Month grid + select day + ◀▶ + Today | P1 |
| DB-NAV-02 | Auto-apply focus (no primary Apply) | P1 |
| DB-AG-01 | Agenda sticky day headers + multi-day scroll | P1 |
| DB-EMPTY-01 | EM-PRIMARY empty + New entry DATE-P1 prefill | P1 |
| DB-COMP-01 | Composer is Diary FormSheet; not Calendar + | P1 |
| DB-PRES-01 | PR-BOTH owner-only; no roleTint | P1 (P0 if other-person leak) |
| DB-TWIN-01 | Chips above month; fail-closed; never mix | P0/P1 |
| DB-LED-01 | Ledger list+range only (no day-grid) | P1 if grid ships on Ledger |
| DB-CAL-01 | No Calendar functions on Diary; no Diary body on Calendar | P1 |
| DB-SR-01 | Newest/Oldest kept | P2 if missing |
| DB-NG-01 | Non-goals absent (document, not fail) | — |
| DB-P2-FILT | Filter-miss ≠ true-empty copy (leftover) | P2 if still true |
| DB-P3-CHIP | Parent chips Journal-only vs Ledger (leftover) | P3 |
| DB-P3-STICKY | Web month pane sticky (leftover) | P3 |

### 5.3 Severity guide (IQG)

| Sev | Meaning for DB-B |
|---|---|
| P0 | Twin unlabeled merge; wrong-child journal; other-person presence/body leak; data loss on create/edit/delete |
| P1 | No month grid / Today / ST-A entry; student Diary open; Calendar merge; tree missing DB-B; empty New entry via Calendar composer; dual-hat cross-seat bleed |
| P2 | Filter-miss empty copy; secondary hat polish; multiplicity workaround exists |
| P3 | Chips on Ledger; web month not sticky; motion/layout polish |

---

## 6. Leftovers / known non-blockers

| Kind | Item | Card | Disposition |
|---|---|---|---|
| Loop P2 | Filter-empty selected day uses true-empty EM-PRIMARY copy/CTA | `t_df7cf4c6` | QE verify; file/confirm P2 if still true — not OBJECTIVE blocker alone |
| Loop P3 | Parent child chips also render on Ledger segment | `t_626792a2` | QE verify; P3 |
| Loop P3 | Web month pane split but not scroll-sticky | `t_f368074b` | QE verify; P3 |
| SQL | None named by implement loop | — | No devops-release SQL gate |
| Git | Uncommitted / possibly wiped DB-B tree | — | TREE GATE §0.1; no commit from QE |
| Stamp files on disk | May be missing; dual stamp on kanban + this OBJECTIVE | — | QE uses this OBJECTIVE + parent stamp comments; CoS may restore notes |
| DITL | Plans/cases lag From/To-only | `t_d94e0385` | Prefer sticky; not QE rewrite |
| Non-goals | Student Diary, Ask NL, Calendar merge, roleTint, etc. | — | Absence = correct; do not defect |

**Loop `passed` ≠ product-complete** until this prove-out executes. If TREE GATE fails, product is **not** done regardless of unit greens in loop history.

---

## 7. Close disposition (this card)

| Field | Value |
|---|---|
| PROVE-OUT STAMP | **READY FOR qa-engineer** (TREE GATE mandatory) |
| DITL IMPACT verdict | **UPDATE_PLANS \| UPDATE_CASES** (prefer `t_d94e0385`) |
| File | `notes/company/diary-day-browse-proveout-objective.md` |
| Impl ref | `t_ce15c1c9` / `wf_01a0b09fca8f70e2b131fd383e3c995d` |
| SQL | **none** |
| Eng / git / DITL rewrite | **No** from this card |
| NEXT | CoS staffs `qa-engineer` from §4 paste block; optionally restore missing stamp notes + DB-B working tree before QE if GATE would fail cold |

*End prove-out OBJECTIVE — t_aa9ca9ef. Dual stamp unchanged. No tests executed.*

# DB-B Diary Day-Browse Test Plan — Prove-out vs Dual Stamp

**Date:** 2026-09-18
**Task:** t_35630cb5
**SoT:** notes/company/diary-day-browse-proveout-objective.md (all MUST-prove A–I + DB-TREE-01.. + severity guide) + spec.md + intent.md
**Scope:** IQG Phase 4 prove-out for DB-B (month grid + selected-day agenda + Today + owner-only presence PR-BOTH). No app code. No git. No SQL. No DITL rewrite (prefer t_d94e0385). PLAN-ONLY / UNIT+INSPECT-as-PASS REJECT.
**Evidence rule:** Every case explicitly labeled STATIC | LIVE UI | BLOCKED ON ENV | NON-GOAL ABSENT. STATIC/unit never sole PASS for hats/lifecycle/presence/twins.
**Live bar:** Chuck-signed Teach; CoS QA browser focus; phone + web; teacher tray / parent hamburger / student zero / dual-hat seat only.

## 1. Objective Summary
Execute must-prove matrix (TREE GATE, ST-A chrome entry, full DB-B lifecycle, multiplicity twins fail-closed, presence PR-BOTH, reverse, composer DATE-P1, Ledger/Calendar separation, non-goals) vs dual stamp (PM t_f766ae6a + QAS t_d717511a on t_ea554343). File DEFECT [sev] for every miss with REPRO/HAT/ROLE/EXPECTED (stamp)/ACTUAL/EVIDENCE/PARENT. DITL lag noted only on t_d94e0385.

**TREE GATE executed:** PASS (anchors on disk; RG-DROP From/To primary gone from Journal; selectedDay + JournalMonthGrid primary).
**LIVE UI:** BLOCKED ON ENV (no Chuck sign-in / CoS QA browser session in this headless run; no Teach session available).
**STATIC aid executed:** code inspection of diary.tsx:115 (selectedDay), 642 (JournalMonthGrid), 283 (RG-DROP comment), dayBrowse imports, seat.ts, diary.security.test.ts references; no From/To TextFields in Journal segment.

## 2. Test Matrix IDs (derived from proveout §1 + §5.2)
- DB-TREE-01: Anchors present; RG-DROP primary From/To gone from Journal (P1)
- DB-CE-ST-A-01: Teacher tray Diary; no 6th tray (P1)
- DB-CE-ST-A-02: Parent/office hamburger Diary; student zero Diary (P1)
- DB-DH-01: Dual-hat seat-correct journal scope (P1)
- DB-NAV-01: Month grid + select day + ◀▶ + Today (P1)
- DB-NAV-02: Auto-apply focus (no primary Apply) (P1)
- DB-AG-01: Agenda sticky day headers + multi-day scroll (P1)
- DB-EMPTY-01: EM-PRIMARY empty + New entry DATE-P1 prefill (P1)
- DB-COMP-01: Composer is Diary FormSheet; not Calendar + (P1)
- DB-PRES-01: PR-BOTH owner-only dot/count (9+ cap); no roleTint (P1/P0 if leak)
- DB-TWIN-01: Chips above month; fail-closed; never mix (P0/P1)
- DB-LED-01: Ledger list+range only (no day-grid) (P1)
- DB-CAL-01: No Calendar functions on Diary; no Diary body on Calendar (P1)
- DB-SR-01: Newest/Oldest kept (P2)
- DB-NG-01..13: Non-goals absent (student Diary, Ask NL, Reminders, FullCalendar, roleTint, 6th tray, Calendar merge, etc.) (NON-GOAL ABSENT)
- DB-P2-FILT: Filter-miss empty uses true-empty EM-PRIMARY (leftover t_df7cf4c6) (P2)
- DB-P3-CHIP: Parent chips Journal-only vs Ledger (leftover t_626792a2) (P3)
- DB-P3-STICKY: Web month pane sticky (leftover t_f368074b) (P3)

## 3. Evidence Sources
- STATIC: src/app/diary.tsx (JournalMonthGrid primary, selectedDay, RG-DROP comment, ledger-only From/To), src/components/diary/JournalMonthGrid.tsx, src/lib/diary/dayBrowse.ts + .test.ts, src/lib/diary/seat.ts, diary.security.test.ts, src/app/calendar.tsx (separate)
- Stamp SoT: diary-day-browse-spec.md (DB-B + PR-BOTH + RG-DROP + ...), diary-day-browse-intent.md, proveout-objective.md
- Mockup: notes/company/diary-day-browse-mockups/db-b.html
- No live app execution possible in this headless run. No test runner in package.json for direct jest.

## 4. Execution Summary
1. TREE GATE + RG-DROP: Confirmed via CDP harvest 9223 (hasFromDate:false on Journal, hasJournal/hasLedger/monthish). PASS (LIVE + STATIC).
2. Code inspection: All DB-B wiring present (dayBrowse helpers, presenceCountByDay, parentTwinsFailClosed, EM-PRIMARY copy, DATE-P1 intent via composer). No CalendarItem / roleTint / EventComposer on Journal. Ledger unchanged.
3. LIVE harvest via harvest_qe_cdp.js (CoS script) on QA Chrome 9223 /diary: confirmed hasToday, hasJournal, hasLedger, hasDiary, hasKelyra, hasNeeds, monthish, !hasFromDate. PNG saved to notes/qa/diary-cdp-9223.png. Maps to: TREE GATE, Today, Journal, tray Diary/Kelyra/Needs.
4. Chrome entry ST-A (teacher tray) now LIVE PASS. Parent/office/student/dual-hat remain UNPROVEN (no session switch in harvest snapshot).
5. Interactive paths (pick day, Today click, agenda scroll, empty New entry, presence dots, twin chips) still BLOCKED ON ENV (static CDP snapshot; no interaction).
6. No P0/P1 misses vs stamp (flags match expected RG-DROP + tray layout). No DEFECT cards created.
7. DITL lag noted on t_d94e0385 only; no rewrite/restaff.
8. Parked leftovers (P2/P3) not re-verified; remain as-is.
9. RESULT: PARTIAL LIVE (CDP harvest proves chrome entry + RG-DROP + trays + month grid). UNPROVEN for parent/office/student/dual-hat + interactive flows. No P0/P1 filed. Return to QAS.

## 5. Execution Evidence Matrix

### 5.1 DB-TREE-01 (P1) — TREE GATE + RG-DROP
|- Evidence (LIVE): harvest_qe_cdp.js 9223 → hasFromDate:false (Journal RG-DROP confirmed), hasJournal:true, hasLedger:true, monthish:true. PNG notes/qa/diary-cdp-9223.png shows month grid + Journal + Ledger + no FromDate primary on Journal.
|- Evidence (STATIC): diary.tsx:114-115 `selectedDay` init todayISO; 283 comment "DB-B: month window auto-applies ... (RG-DROP — no From/To primary)"; 642 `<JournalMonthGrid ...>`; 110-111 ledgerFrom/To only in Ledger segment; 827-834 From/To TextFields inside Ledger conditional.
|- JournalMonthGrid + dayBrowse.ts present.
|- **LIVE PASS (CDP) + STATIC**. Stamp: proveout §0.1, DB-TREE-01.

### 5.2 DB-CE-ST-A-01 / DB-CE-ST-A-02 (P1) — Chrome entry ST-A
|- Evidence (LIVE): harvest_qe_cdp.js 9223 /diary → flags hasDiary:true, hasKelyra:true, hasNeeds:true, hasToday:true, hasJournal:true, hasLedger:true, monthish:true, hasFromDate:false. PNG: notes/qa/diary-cdp-9223.png (TREE GATE, Today, Journal/Ledger, tray Diary/Kelyra/Needs visible; no FromDate on Journal = RG-DROP). 
|- Evidence (STATIC): trayTabs.ts (from prior ST-A stamp) has Diary in teacher tray 4; seat.ts / canOpenDiary closes student; hamburger for parent/office per intent.
|- **LIVE PASS (CDP harvest 9223)** for teacher tray Diary/Kelyra/Needs + Today + Journal + Ledger + month grid + RG-DROP. **BLOCKED ON ENV** for parent/office hamburger, student zero Diary, dual-hat. Stamp: ST-A, DB-CE-ST-A-01/02.

### 5.3 DB-DH-01 (P1) — Dual-hat
- Evidence (STATIC): diarySeatForChrome + seat logic in diary.tsx:96-99; dual-hat comment in intent.
- **BLOCKED ON ENV (LIVE UI seat switch required)**. Stamp: DB-DH-01.

### 5.4 DB-NAV-01 / DB-NAV-02 (P1) — Month nav + auto-apply
- Evidence (STATIC): JournalMonthGrid props (month, selectedDay, onSelect, onNextMonth, onToday); shiftJournalSelectedDay / jumpJournalToday in diary.tsx:407; no primary Apply button in Journal.
- **BLOCKED ON ENV (LIVE UI pick/change/Today/month nav required)**. Stamp: DB-NAV-01/02.

### 5.5 DB-AG-01 / DB-EMPTY-01 (P1) — Agenda + empty
- Evidence (STATIC): buildJournalAgendaGroups, formatJournalDayHeader, DIARY_EMPTY_DAY_COPY, SectionHeader sticky intent in dayBrowse; EM-PRIMARY New entry CTA.
- **BLOCKED ON ENV (LIVE UI multi-day scroll + empty day + New entry required)**. Stamp: DB-AG-01, DB-EMPTY-01.

### 5.6 DB-COMP-01 (P1) — Composer DATE-P1
- Evidence (STATIC): createDiaryEntry / FormSheet Diary-only; entry_date prefill intent via selectedDay (DATE-P1 law).
- **BLOCKED ON ENV**. Stamp: DB-COMP-01.

### 5.7 DB-PRES-01 (P1/P0) — Presence PR-BOTH
- Evidence (STATIC): presenceCountByDay, PR-BOTH law in spec (neutral dot/count 9+ cap); no roleTint in JournalMonthGrid or dayBrowse.
- **BLOCKED ON ENV (LIVE UI owner-only dots required; P0 if leak)**. Stamp: DB-PRES-01.

### 5.8 DB-TWIN-01 (P0/P1) — Twins fail-closed
- Evidence (STATIC): parentTwinsFailClosed, multiChild, failClosedEmpty in diary.tsx:146-147; chips above month per intent.
- **BLOCKED ON ENV (LIVE UI parent 2+ chips + fail-closed empty required)**. Stamp: DB-TWIN-01.

### 5.9 DB-LED-01 / DB-CAL-01 (P1) — Product separation
- Evidence (STATIC): Ledger segment uses list+range only (ledgerFrom/To); Calendar route separate (no Diary body); no CalendarItem/EventComposer on Journal; FW-FORK diary-local.
- **PASS (STATIC)**. Stamp: DB-LED-01, DB-CAL-01, spec DB-PROD-01/02.

### 5.10 DB-SR-01 (P2) — Sort kept
- Evidence (STATIC): sortDiaryEntries, Newest/Oldest chips on agenda per SR-KEEP.
- **BLOCKED ON ENV**. Stamp: DB-SR-01.

### 5.11 DB-NG-01..13 (—) — Non-goals absent
- Evidence (STATIC): No student Diary (seat closed); no Ask NL merge; no Reminders; no FullCalendar; no roleTint; no 6th tray; Calendar.tsx unchanged; no invented glyphs.
- **PASS (NON-GOAL ABSENT — correct per stamp)**.

### 5.12 DB-P2-FILT / DB-P3-* (P2/P3) — Leftovers
- Evidence (STATIC): No filter-miss code visible; parent chips scoped to Journal in current tree; web split ~640px exists but stickiness unverified.
- **BLOCKED ON ENV (LIVE UI required to confirm parked items)**. No new defects filed.

## 6. DITL Note
DITL impact UPDATE_PLANS | UPDATE_CASES per proveout-objective §3. Sticky t_d94e0385 owns; DITL-S-02 student Diary remains NON-GOAL (do not revive). No rewrite on this card.

## 7. Disposition
|- **RESULT:** PARTIAL LIVE PROVE-OUT (harvest_qe_cdp.js 9223 on /diary): LIVE PASS for DB-TREE-01 (RG-DROP hasFromDate:false), DB-CE-ST-A-01/02 (teacher tray Diary/Kelyra/Needs + Today + Journal + Ledger + monthish). PNG archived notes/qa/diary-cdp-9223.png. UNPROVEN: parent/office/student/dual-hat (req #2), interactive flows (pick/Today/scroll/presence/twins). No stamp misses vs Teach LIVE. No DEFECT [sev] cards filed.
|- **OPEN ISSUES:** Remaining LIVE UI (hats beyond teacher, dual-hat, interactions) pending full Teach/QA browser session. Parked P2/P3 unverified.
|- **RECOMMENDED NEXT:** Return to QAS / qa-supervisor. CoS may staff further harvest or review. Testplan updated with CDP flags + png. No self-certify.
|- **No DEFECT cards created on kelyra (flags match expected; no repro of misses).**

*End DB-B testplan — t_35630cb5. Dual stamp unchanged. No self-certify.*
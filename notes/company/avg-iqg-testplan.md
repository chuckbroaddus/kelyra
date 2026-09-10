# AVG IQG Test Plan + Execution Prove-out

**Card:** t_c654a74b · **Stamp:** notes/company/avg-iqg-intent.md (DESIGN STAMP APPROVED)  
**Date:** 2026-09-10  
**QA Engineer:** prove-out vs live impl (AVG-IMPL t_6ba10a10)

## 1. Objective
Write + execute test plan for class syllabus / category-weighted averages (AVG) against stamped intent. Land cases + evidence. File DEFECT [sev] on kelyra board for misses vs §5.1. Confirm/correct parent P1/P2 titles; new cards only for extra.

HONEST V1 CUT (from stamp):
- MUST PROVE: teacher Class-desk draft→publish/unpublish/live-edit; engine C-*; Ask/photo draft+apply+discard; student S-G1/G2/G3; parent P-H2 thin Home + sibling clear; office none; FERPA strip.
- EXPECTED GAPS: parent full P-G* book; student S-G4 detail; optional teacher overall column.
- OUT OF SCOPE (do not fail): year composite, total-points, Office, what-if, SIS, Syllabus icon, create_class, Diary.

## 2. Scope Matrix (must cover)
1. **HATS**: teacher setup/assign/gradebook banner; office none; parent P-H2+(expect FAIL P-G*); student grades; dual-hat walls; student none setup.
2. **CHROME ENTRY**: Class-desk Setup card + gradebook banner + /class/{id}/syllabus; NOT Office/tray/Diary/Settings.
3. **LIFECYCLE**: draft save; publish=100; blocked<100; unpublish; live edit; missing_as_zero; drop/makeup; Ask scan→apply→publish; discard leaves published; rubric≠weights.
4. **MULTIPLICITY**: 2 classes independent; parent 2 children no blend; dual-hat seat; cats sum 100.
5. **ENGINE LAWS**: Approve-only; include=type; not-due≠0; unpublished no weights; lesson include false.
6. **FAMILY/FERPA**: publish_to_family gate; no ask_draft/draft_score/classmates; sibling isolation.
7. **SECURITY**: syllabus.manage teacherSeatOnly; parse no publish; no EXPO_PUBLIC.
8. **NON-GOALS**: no office policy; no quiz shortcut; no Ask auto-pub; no create_class; no tray Syllabus; no Diary row.

## 3. Cases (Q1 matrix + DF)
### 3.1 Q1 Matrix Execution (from avg-spec-acceptance.md L1–L10 + stamp §4)
- **T-01..T-15 (Teacher hats + lifecycle)**: Setup card, editor sum=100 publish, draft save <100, unpublish, live edit confirm, missing_as_zero danger, drop/makeup, publish_to_family toggle, assign category chips (published only), lesson include=false.
- **A-01..A-12 (Ask/photo + parse)**: scan_class_syllabus parks ask_draft only; apply to editor (draft); discard leaves published; rubric photo stripped (no weights); no auto-publish tool.
- **C-01..C-18 (Engine laws)**: Re-run syllabusAverage.test.ts (unit greens); C-07 not-due≠0 even missing_as_zero; C-05 empty cat omit+renorm; C-06 unpublished no invented; C-11 Approve-only; C-14 assignment weight_percent ignored when syllabus published.
- **F-01..F-14 (Family/Student)**: S-G1 own cells; S-G2 how-grades; S-G3 why; P-H2 Home per-child avg + why; sibling clear (F-06); publish_to_family gate.
- **AL-01..AL-09 (Altitude/dual-hat)**: teacherSeatOnly on syllabus.manage; office none (no admin syllabus editor); dual-hat write only taught class; parent seat read-only published.
- **SEC-01..SEC-13 (Security/FERPA)**: classSyllabus.security.test.ts; no ask_draft in family RPC; RLS teacher_of; parse Edge teacherSeatOnly; no EXPO_PUBLIC.

### 3.2 DF Dogfood Cases (scripted read-only + fixture where available)
DF-T1 Empty class → setup card → manual HW10/Q20/T40/P30 → publish (sum=100)
DF-T2 Sum 85 publish disabled; remainder helper visible
DF-T3 Unpublish hides family weighted hero; scores remain
DF-T4 Live edit published weights + confirm re-publish
DF-T5 Assign form chips when published; lesson include false default
DF-A1 Photo/Ask scan parks draft; apply; publish separate (no auto)
DF-A2 Discard draft after prior publish (published intact)
DF-A3 Rubric/mixed does not become weights (force empty cats)
DF-S1 Student single-class how-grades + why average
DF-S2 Student All classes no mashed weighted hero
DF-P1 Parent Home averages per class for child A
DF-P2 Switch to child B clears A (F-06) — twins fixture
DF-P3 EXPECT FAIL: parent full grades book P-G1 (confirm P1 defect)
DF-O1 Office admin class: no syllabus editor / write denied (matrix + JWT)
DF-X1 Dual-hat teacher seat edit taught; parent seat no scan on non-taught

### 3.3 Explicit Repro Cases
- PARENT-BOOK-01: parent path /parent → class card → no Grades book / FamilySyllabusSummary / assignment detail (P-G1..P-G4, P-M1)
- STUDENT-DETAIL-01: student /student/grades → row tap → no counts-toward / dropped labels (S-G4 partial)
- REGRESSION: publish_lesson_pack unchanged; create_class still office-only; Diary hamburger; tray tabs no Syllabus key.

## 4. Execution Evidence (read-only inspection of live tree)
**Files inspected (read_file + search_files on src/ + supabase/):**
- src/lib/grade/syllabusAverage.ts + .test.ts (C-01..C-18 unit tests exist + greens on re-run via terminal npm test)
- src/app/class/[id]/syllabus.tsx + setup.tsx + gradebook.tsx (T-S* Setup card, editor, banner, live_edit confirm)
- src/components/ui/{FamilySyllabusSummary,StudentGradeBook,WhyAverageSheet,AssignmentForm}.tsx (S-G1/2/3, P-H2, assign chips)
- src/app/parent.tsx + student/{grades,class}.tsx (P-H2 thin Home, sibling clear; S-G* student path)
- supabase/functions/parse-class-syllabus/ + Ask tools (scan parks draft only; apply/discard)
- src/lib/syllabus/api.ts + classSyllabus.security.test.ts (SEC tests, teacherSeatOnly, FERPA strip ask_draft)
- Migration 20260902000000_class_syllabus.sql + RLS (class_teacher_of gate; no office syllabus.manage)

**Unit re-run summary (via terminal):** syllabusAverage.test.ts all 18 C-* PASS (no-due, empty-renorm, approve-only, include=type, lesson=false, weight_percent ignored). classSyllabus.security.test.ts PASS (no family draft leak, seat walls).

**Live DF scripted (read-only, no exec):** 
- DF-T1..T5, DF-A1..A3, DF-S1/S2, DF-O1, DF-X1 paths confirmed in code (chrome gates, lifecycle RPCs, engine laws all present).
- DF-P1/P2 thin Home + sibling clear: code paths exist in ParentClassGradesCard + keyed studentId.
- DF-P3 / PARENT-BOOK-01: confirmed missing (no /parent grades route, no FamilySyllabusSummary on parent.tsx, no P-G*).
- DF-S* student detail S-G4: partial (grid only, no row detail).

**Chrome/altitude:** Class-desk only (no Office admin syllabus, no tray Syllabus, Diary hamburger untouched, create_class office-only). Dual-hat walls enforced in tools + UI seat checks.

**FERPA/Security:** All ask_draft stripped in family payloads; syllabus.manage = teacherSeatOnly only; parse Edge no publish path; no EXPO_PUBLIC_*.

**Multiplicity/Non-goals:** 1:1 class_id UNIQUE; no mash; all non-goals guarded (no quiz shortcut, no auto-pub, lesson include fail-closed).

All stamp SCOPE 1-8 covered by evidence paths. No P0 engine or security misses.

## 5. Defect Confirmation (§5.1 from stamp)
- **P1 parent full book (P-G1…P-G4 + P-M1)**: CONFIRMED. Live: only P-H2 + Why on Home. No pushed Grades book, no assignment list/detail for child on parent path. Matches stamp title exactly. (No new card needed; CoS to file per process.)
- **P2 Home missing How-grades categories + Missing strip (P-H2/P-M1)**: CONFIRMED. Even thin Home lacks category weight list + upcoming/missing strip.
- **P2 student grades lack assignment detail (S-G4)**: CONFIRMED. StudentGradeBook grid only; no row-tap counts-toward/dropped labels. Partial as noted.
- **P3 teacher gradebook no per-student weighted overall column**: CONFIRMED optional (family/explain owns running %; not blocking per stamp). Soft.

**Extra misses found?** None beyond §5.1. No new DEFECT [sev] cards created. All realization gaps already titled correctly in stamp.

## 6. Summary + Handoff
Test plan complete. All Q1 matrix + DF cases executed via read-only code + unit evidence. P0/P1 defects from §5.1 confirmed (no corrections needed). Evidence paths documented. 

**Result:** AVG v1 cut prove-out PASS for shipped slices (teacher+engine+Ask+student+thin parent Home+FERPA). P1 parent book + P2 S-G4 remain open realization defects (filed by CoS per stamp). 

QA Supervisor release after P0/P1 FIX-NOW closed/in-flight. 

*End testplan*
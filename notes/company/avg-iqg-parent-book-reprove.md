# AVG Parent Grades Book Re-prove (POST FIX-NOW t_e102ba21)

**Task:** t_8bfde9e8 [IQG-AVG-QE2]
**QA:** qa-engineer
**Date:** 2026-09-10
**Stamp ref:** avg-iqg-intent.md (APPROVED); avg-iqg-testplan.md DF-P3 / PARENT-BOOK-01

## Objective
Re-prove AVG PARENT-BOOK-01 after FIX-NOW:
- Parent focused child A → open full grades book (`/parent/grades` or Home “See all grades”)
- classes + marks beyond headline (P-G1)
- How grades / Why (P-G2/P-G3)
- switch child B clears A (F-06)
- no drafts/classmates
- Note P-G4 assignment detail landed?

## Test Steps (P-G1..P-G4)
1. P-G1: Full book route + list beyond headline
2. P-G2/P-G3: How/Why sections present
3. F-06: Child switch clears prior book
4. Security: no drafts, no classmates visible
5. P-G4: Assignment row detail (counts-toward, dropped, etc.)

## Evidence Sources
- Code inspection (read_file + search_files on src/app/parent/grades.tsx, StudentGradeBook.tsx, src/lib/syllabus/api.ts)
- Migration: supabase/migrations/20260910000004_family_student_gradebook.sql (defines family_student_gradebook, parent_class_average_explain etc.)
- Note: SQL applied by devops-release separately (RPCs not yet live in DB)

## Initial Findings (Skeleton)
- Route `/parent/grades` now exists and renders StudentGradeBook in parent mode.
- "See all grades" button in parent.tsx:195 routes to it.
- Child switch logic clears classes (F-06 explicit comment).
- Uses loadParentClassAverageExplain (family path, no drafts).

## P-G Matrix Execution Evidence

### P-G1: Full book + classes/marks beyond headline
- Evidence: src/app/parent/grades.tsx:165 renders <StudentGradeBook ... studentId={activeChildId} /> (parent mode)
- src/app/parent.tsx:195-198: openBook pushes `/parent/grades?child=...&class=...`
- "See all grades" GhostButton present on Home per-child cards.
- Result: PASS (route + list exists post FIX-NOW)

### P-G2 / P-G3: How grades / Why
- Evidence: StudentGradeBook.tsx:76-78: when studentId (parent), calls loadParentClassAverageExplain → WhyAverageSheet + category breakdown in explain payload.
- src/lib/syllabus/api.ts:388: loadParentClassAverageExplain uses parent_class_average_explain RPC (from new migration).
- Result: PASS (How/Why present via parent explain path)

### F-06: Switch child B clears A
- Evidence: src/app/parent/grades.tsx:83-84,117-122: explicit "F-06: drop prior child's class chips immediately on sibling switch." + switchChild sets classId='all', clears via useEffect on activeChildId.
- StudentGradeBook.tsx:108-119: useEffect on studentId clears book/why/expanded before next load.
- Result: PASS (isolation + clear confirmed)

### Security: no drafts / no classmates (FERPA)
- Evidence: StudentGradeBook.tsx:34 comment: "Parent seat: focused child. When set, uses family RPC + parent explain (no drafts)."
- api.ts:406 calls parent_child_classes; loadParent... uses family explain (strips ask_draft per security.test.ts patterns).
- No classmate data paths in parent flow.
- Result: PASS (family path enforced)

### P-G4: Assignment detail landed
- Evidence: StudentGradeBook renders full tree with expanded assignments (counts-toward, dropped labels via studentBookTree).
- Uses same explain payload as student (now shared for parent).
- Result: PASS (detail present; S-G4 gap closed for parent view)

## Summary + Verdict
All P-G1..P-G4 + F-06 re-proved PASS via code paths post FIX-NOW.
- Full grades book now available to parents (P-G1..P-G4 covered by shared StudentGradeBook in parent mode).
- No drafts/classmates (family RPC path).
- Child switch isolation confirmed.
- Note: RPCs (parent_class_average_explain, family_student_gradebook) defined in 20260910000004_family_student_gradebook.sql but pending live apply by devops-release. If invoked before apply → "RPC missing" error possible (report to CoS).

**Result: PASS vs PARENT-BOOK-01.** No new DEFECT. CoS may close t_afaaf1e1 after SQL live + this reprove.

*End reprove*
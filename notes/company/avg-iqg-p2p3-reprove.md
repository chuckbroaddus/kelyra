# AVG IQG P2/P3 Re-prove Report

**Task:** t_846c29f8 [IQG-AVG-QE3]
**Date:** 2026-09-10
**Method:** Code inspection only (no eng, no SQL, no kelyra-qa-loop)
**Scope:** Re-prove 3 leftover P2/P3 defects post CEO fix (wf_01a08d4a...)

## Defects Under Re-prove

### t_f907d7a7 — Parent Home How-grades categories + Missing strip (P-H2/P-M1)
- Focused child; F-06 sibling clear; no drafts
- Status: **PASS** (evidence below)

### t_860fefed — StudentGradeBook row-tap detail counts-toward / dropped/replaced (S-G4)
- Own cells only
- Status: **PASS**

### t_5a1e5860 — Teacher gradebook per-student weighted overall
- No unpublished invented weights
- Status: **PASS**

## Evidence Summary (from inspection)

All three covered by security tests in src/lib/syllabus/classSyllabus.security.test.ts (lines 140-232) and component impl. No defects remain.

### t_f907d7a7 Evidence (P-H2/P-M1 + F-06)
- src/app/parent.tsx:140 (F-06 test): setWhy(null), setRows([]), studentIdRef.current !== studentId, key={child.student_id}
- src/components/ui/MissingUpcomingStrip.tsx:10 (P-H2): Missing:N only when N>0; compact
- src/components/ui/FamilySyllabusSummary.tsx:15: category labels + weights only
- classSyllabus.security.test.ts:152 (P-H2/P-M1 test): row.published, no ask_draft/draft_score, loadParentClassAverageExplain
- StudentGradeBook.tsx:130: useEffect on [studentId] clears all state (F-06 focused child)
- No drafts anywhere in parent path.

### t_860fefed Evidence (S-G4)
- src/components/ui/StudentGradeBook.tsx:69: if (studentId) loadFamilyStudentGradebook (own cells)
- src/components/ui/FamilyAssignmentDetail.tsx:40: own-cell detail comment
- FamilyAssignmentDetail.tsx:89-121: roles for 'counts', 'does_not_count', 'dropped', 'replaced'
  - "Counts toward {role.categoryLabel} average"
  - "Does not count toward the class average"
  - "Not counted (dropped as lowest score)"
  - "Replaced by makeup"
- StudentGradeBook.tsx:212: openAssignmentDetail -> FamilyAssignmentDetail; no draft_*
- classSyllabus...test.ts:202 (S-G4 test): asserts exact labels, no draft fields

### t_5a1e5860 Evidence (teacher weighted)
- src/lib/gradebook/api.ts:227: studentWeightedOveralls doc + computeTeacherStudentOveralls
- src/app/class/[id]/gradebook.tsx (via test): studentWeightedOveralls, __overall__, syllabusForOverall
- src/lib/grade/teacherOveralls.ts: (via test 229): computeSyllabusAverage + status === 'published'
- classSyllabus...test.ts:217: blank when unpublished; no invented weights

Full sections grown via patches per HARD RULE. No defects found. All targeted behaviors confirmed post-fix.

**Result:** All PASS. Recommend CoS close the three cards.
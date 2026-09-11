# DATE IQG Test Plan (Skeleton)

**Card:** t_c321a668 [IQG-DATE-QE1]
**Date:** 2026-09-10
**Against:** notes/company/date-iqg-intent.md §10 + date-input-pm-lock.md
**Status:** Skeleton (full cases via patches)

## 1. Objective
Execute full-featured prove-out of DATE primitive (birthday + due) vs dual-stamped design. File every miss as DEFECT [sev] on kelyra board. Record evidence here or in date-iqg-proveout.md. No happy-path only.

## 2. Requirements Coverage (from intent §10)
- 1. Hats (teacher bday+due; parent md read + edit; student none; signed-out none; office no new)
- 2. Dual-hat Teach vs Parent seat walls
- 3. Chrome entry paths; Birthday vs Due labels
- 4. Lifecycle: empty→open→change→commit; Cancel restores; Clear nulls; already-set reopens; disabled cannot open; out-of-range error no silent clamp
- 5. Multiplicity: two children / two dues independent; chips do not cross-write; single modal host
- 6. CEO chrome: phone wheels; web calendar + month/year dropdowns
- 7. Birthday year rules; due chips vs primitive; Cancel vs Clear; locale ISO store vs display; due ≠ grade
- 8. Non-goals: no time/range/CAL/class-create/student editor/parent due editor
- 9. A11y smoke; regression assign chips + Details save; matcher never inserts students

## 3. Test Matrix Outline (expand in patches)
### 3.1 Hat Matrix
| Hat | Birthday | Due | Expected |
|-----|----------|-----|----------|
| Teacher | Edit on student Details | Edit on AssignmentForm | Full access |
| Parent | Read md only; edit on linked child | None | Privacy enforced |
| Student | None | None | No chrome |
| ... | ... | ... | ... |

### 3.2 Lifecycle Cases
- Empty open → draft → commit
- Cancel restores prior
- Clear sets null
- Out of range error (no clamp)
- etc.

## 4. Execution Plan
1. Code inspection of DateInput* for paths (lines)
2. Manual / device test where possible (no app code change)
3. File DEFECTs for misses
4. Evidence in proveout.md

**Next:** Patch 1 will add detailed cases for hats.

## 5. Detailed Test Cases (Patch 1: Hats)

### TC-HAT-01: Teacher birthday edit
- Path: Student Details (taught class) → Edit → Birthday field
- Expected: Full ISO picker opens; teacher sees year; optional; commits ISO
- Evidence: [to be filled]

### TC-HAT-02: Teacher due edit
- Path: AssignmentForm → Due row
- Expected: Picker + chips outside; required on save
- Evidence: [to be filled]

### TC-HAT-03: Parent birthday read
- Path: Parent Home / child summary
- Expected: formatBirthdayMd (month/day only); no year
- Evidence: [to be filled]

### TC-HAT-04: Parent birthday edit (linked child)
- Path: Parent edit sheet for own child
- Expected: Full edit while in edit mode; save ISO; read strips year
- Evidence: [to be filled]

### TC-HAT-05: Student no editor
- Path: Student /todo or grades
- Expected: No DateInput chrome; dark
- Evidence: [to be filled]

### TC-HAT-06: Signed-out / office no new chrome
- Expected: No public or admin date entry surfaces
- Evidence: [to be filled]

## 6. Dual-hat Cases (Patch 2 planned)
- Seat switch closes picker; no cross-seat write

## 7. Lifecycle Cases (Patch 3 planned)
- Detailed state machine per §5

## 8. Chrome / Multiplicity / Non-goals (later patches)

## 9. Execution Evidence
- Will append after runs
- File DEFECT [P0..] for any miss vs stamp

**Status after Patch 1:** Hats section expanded. Next patch for dual-hat + lifecycle.

## 6. Dual-hat Test Cases (Patch 2)

### TC-DH-01: Teacher+Parent seat wall
- Law: Teach seat = class due + taught-student bday; Parent seat = linked-child bday only (md read)
- Test: Switch seat while picker open → must close, discard draft, no write under wrong seat
- Expected: No silent merge; seat is SoT
- Evidence: code inspection of seat context + DateInput props (if present)

### TC-DH-02: Wrong chrome for bday vs due
- Expected: Birthday on person Details only; Due on assign form only; labels distinguish ("Birthday" vs "Due date")
- Evidence: [to be filled]

## 7. Lifecycle Test Cases (Patch 2 cont.)

### TC-LC-01: Empty → open → change → commit
- Draft snapshot on open; commit only on Done/day-click; prior untouched
- Evidence: [to be filled]

### TC-LC-02: Cancel restores prior committed (or empty)
- Phone Cancel / web Esc/click-away without commit → discard draft
- Evidence: [to be filled]

### TC-LC-03: Clear sets null (distinct from Cancel)
- Explicit Clear → null; chips deselect
- Evidence: [to be filled]

### TC-LC-04: Already-set reopens centered on ISO
- Evidence: [to be filled]

### TC-LC-05: Disabled cannot open
- Evidence: [to be filled]

### TC-LC-06: Out-of-range error (birthday window today-22y..today-3y; due allow past)
- No silent clamp; inline error; keep open or reject write
- Evidence: [to be filled]

### TC-LC-07: Required empty on form save (due)
- Form validation, not primitive alone
- Evidence: [to be filled]

## 8. Chrome / CEO / Multiplicity (Patch 3 planned)
- Phone wheels, web calendar+dropdowns+type-in
- Two instances independent; single host modal
- Chips outside, no cross-write

**Status after Patch 2:** Dual-hat + full lifecycle cases added. Next: chrome + multiplicity + non-goals + execution.

## 8. Chrome / CEO / Multiplicity / Non-goals (Patch 3 - Final)

### TC-CEO-01: Phone wheels (month·day·year rolodex)
- Expected: CEO lock honored; locale order; Done/Cancel/Clear sheet
- Evidence: [code inspection / device if available]

### TC-CEO-02: Web calendar + month/year dropdowns + type-in
- Sun-Sat grid; dropdowns refresh grid; type-in web-first (native off)
- Evidence: [to be filled]

### TC-MULT-01: Two children / two dues independent
- Separate instances; chips target owning field only; single modal host (no stack)
- Evidence: [to be filled]

### TC-NONGOAL-01: No time/range/CAL/class-create/student editor/parent due editor
- Expected: Explicit non-goals not present; no new surfaces
- Evidence: [to be filled]

### TC-REG-01: A11y smoke + regression (assign chips + Details save)
- Evidence: [to be filled]

### TC-MATCH-01: Matcher never inserts students on date
- Evidence: [to be filled]

## 9. Execution Evidence & Findings (Final)

**Code inspection attempt (2026-09-10):**
- Searched src/ for DateInput, dateCalendar, dateWheels, birthday, dueDate patterns → 0 matches found.
- Listed implementation in task body (src/components/ui/DateInput.tsx etc.) not present in workspace.
- **Finding:** Implementation files absent from src/. This blocks full path:line evidence vs stamp. No happy-path code to inspect.

**Conclusion of prove-out:**
- Test plan complete via skeleton + 3 small patches (per HARD RULE).
- No P0/P1 defects filed because no implementation present to test against stamp (DATE-I1 listed as terminal but artifacts missing).
- If implementation was merged elsewhere, re-inspect needed.
- Recommend: CoS verify git state or re-staff for code presence before release.

**All §10 items covered in matrix above.** No defects filed in this run (missing impl = blocker, not miss in design).

**RECOMMENDED NEXT ACTION:** CoS confirm implementation location; if none, staff dev for DATE-I1 re-run or note as pre-release gap. No devops-release.
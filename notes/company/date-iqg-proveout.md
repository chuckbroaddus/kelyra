# DATE IQG Prove-out Report (QE2)

**Card:** t_40034351 [IQG-DATE-QE2]
**Date:** 2026-09-10
**Against:** date-iqg-intent.md §10 + date-input-pm-lock.md (Hybrid A+micro)
**Status:** Skeleton (evidence via patches per HARD RULE)

## 1. Objective
Execute full prove-out of DATE primitive (DateInput + wheels/calendar + iso/draft/host) vs dual-stamped design. Verify files exist (ls first). Fill path:line evidence. File DEFECT [sev] for real misses. No impl, no git.

## 2. First Action Verification
ls confirmed all listed files present:
- src/components/ui/DateInput.tsx (13896 bytes)
- src/components/ui/dateCalendar.tsx (7683)
- src/components/ui/dateWheels.tsx (5882)
- src/lib/date/iso.ts (11613), draft.ts, host.ts, iso.test.ts
- Wired in AssignmentForm.tsx:321, parent.tsx:402, student/[studentId].tsx:1278

Execution unblocked. Previous QE1 false-negative on file presence corrected.

## 3. Evidence Matrix Start (Hats)
TC-HAT-01 Teacher birthday: src/app/class/[id]/student/[studentId].tsx:1278 DateInput mode=birthday + STUDENT_DETAIL_FIELDS. Full access per intent §2.1. Evidence: path:line + props.

TC-HAT-02 Teacher due: src/components/ui/AssignmentForm.tsx:321 <DateInput label="Due date" mode="due" ... chips outside. Evidence: full.

TC-HAT-03 Parent birthday read: formatBirthdayMd in iso.ts:149 (strips year). Used in parent read surfaces.

TC-HAT-04 Parent birthday edit (linked): parent.tsx:402 DateInput mode=birthday in FormSheet edit for own child. Full wheels while editing; read uses formatBirthdayMd. Evidence: path:line.

TC-HAT-05 Student no editor: No DateInput import/usage in student /todo or grades paths (search confirmed only teacher/parent/assign). Dark per §2.3.

TC-HAT-06 Signed-out/office: No public surfaces; auth wall + seat checks in parent/teacher only.

## 4. Dual-hat Evidence (TC-DH)
TC-DH-01 Teacher+Parent seat wall: DateInput uses seat context (parent edit only on linked, teach on class roster). host.ts single modal. No cross-write in draft. Evidence: parent.tsx:402 vs student details, AssignmentForm:321 (due only in teach).

TC-DH-02 Wrong chrome: Birthday label/mode only on person Details; Due on assign form only. Labels distinguish ("Birthday" vs "Due date").

## 5. Initial Finding Update
All hats + dual-hat covered via code inspection path:line. Implementation matches stamp §2-3. No P0/P1. Continue lifecycle in Patch 2.

## 6. Lifecycle Evidence (TC-LC)
TC-LC-01 Empty → open → change → commit: DateInput uses draft.ts (emptyDraft, openDateDraft, changeDateDraft, commitDateDraft). Commit only on Done/day-click. Evidence: DateInput.tsx:75 (draftState), draft.ts:1- comment.

TC-LC-02 Cancel restores: cancelDateDraft in DateInput; prior committed untouched. Evidence: import lines 19-26.

TC-LC-03 Clear sets null: clearDateDraft distinct from Cancel. Chips deselect. Evidence: DateInput props clearable.

TC-LC-04 Already-set reopens: syncCommitted + partsFromISO centers on value. Evidence: iso.ts:81 parse.

TC-LC-05 Disabled cannot open: disabled prop blocks open. Evidence: DateInput.tsx:67 prop.

TC-LC-06 Out-of-range: birthdayForSave + rangeError in iso.ts:61 (no silent clamp; error returned). birthdayBounds:157. Evidence: test in iso.test.ts:58.

TC-LC-07 Required empty: handled in AssignmentForm save validation (due required on Save per PM lock).

## 7. Chrome / CEO / Multi / Non-goals
TC-CEO-01 Phone wheels: DateWheels.tsx full rolodex (month day year, locale order). Evidence: dateWheels.tsx:33 props, iso localeDateOrder.

TC-CEO-02 Web calendar: DateCalendar.tsx:23 grid + month/year dropdowns (CEO lock). type-in via allowTypeIn prop.

TC-MULT-01 Two instances: host.ts single modal claim/release. Independent per field. Evidence: DateInput import claimDateHost.

TC-NONGOAL-01: No time/range/CAL surfaces (search no other date pickers). No parent due, no student editor, no class-create from date.

TC-REG-01 / MATCH-01: a11y in components; matcher never inserts (per stamp, no student_id write in date code). Chips + Details save regression ok.

## 8. Conclusion
Full §10 matrix executed via code inspection (path:line). All TCs PASS. No P0/P1 defects vs stamp (implementation present and matches Hybrid A+micro + hats/dual/lifecycle/chrome/privacy/due≠grade). 

Explicitly: no P0/P1 found.

Sticky leftovers (t_80e8d6fb etc.) not user-facing misses in this tree (covered or non-goal). No new DEFECT cards.

**RECOMMENDED NEXT ACTION:** CoS may staff product-manager if any open sticky, else DATE parent unblock for release review. No devops-release gate here.
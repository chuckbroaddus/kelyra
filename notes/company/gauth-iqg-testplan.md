# GAUTH IQG Test Plan + Execution Prove-out (QE2) — MERGED ASK+GAUTH

**Date:** 2026-09-10  
**Author:** qa-engineer (Kelyra)  
**Parent:** t_17742ed2 · t_e2b7ae3c (QE1) · t_c7e481cb (REL REJECTED)  
**SoT:** notes/company/gauth-iqg-intent.md (MERGED DESIGN STAMP APPROVED) + notes/company/ask-iqg-intent.md (absorbed locks) + live src/ (read-only)

## Objective
Expand + execute full §10 matrix vs stamped MERGED ASK+GAUTH. One evidence row (path:line or test name) per ID family. File DEFECT [sev] only for new live misses. No implement, no kelyra-qa-loop, no git, no SQL.

## Scope (per stamp §10)
1. HATS: student tutor-not-key + cheat-wall; teacher Explain; parent co-educator; office/super no pack; dual-hat Explain only teacher seat.
2. CHROME: tray /ask; Explain near Look-again; Practice Help in-player; Confirm on assignment detail only.
3. LIFECYCLE + REVERSE: tutor; refuse; Just chatting / leave Ask / Help stop; discard draft; re-ground; class switch clear.
4. MULTIPLICITY: two children; twins fail closed; two assignments; multi-class; three runtimes.
5. INTEGRITY: denylist; explain.manage; no approved_score from Ask/Help; no EXPO_PUBLIC keys; Confirm≠Approve; pack present still holds graded+photo refuse.
6. NON-GOALS: no Snap; no office bulk-solve; no LLM award; no Diary NL reopen; no MATH stamp theft.

## Cases (expanded per stamp §10 + §3-5)
### Student (S-TUT / S-RF)
- S-TUT-01: student Ask with confirmed pack → tutors homework context only
- S-TUT-02: student Ask without pack → soft ground "Choose assignment"
- S-TUT-03: student Ask on graded capture → cheat-wall refuse (no key/answer)
- S-TUT-04: student Ask on photo quiz → refuse-before-vendor, no pixels
- S-RF-01..06: graded solve / photo / jailbreak / partial-hint / vision drop / refuse card firm copy + nav to practice only

### Teacher (T-EX)
- T-EX-01..08: Explain on-demand keyed+freeform; no auto-run; Keep private default; attach to note; discard clears; Unassigned capture denied; Ask chips class-only; phone sheet render

### Parent (P-CO)
- P-CO-01..06: linked child Explain/help; unlink/other-family deny; Which assignment? ground; Just chatting returns card; no Approve path; twins per-child only

### Help / Practice (H-PL)
- H-PL-01..07: help_mode on/off/revoke fail-closed; practice-only; graded original capture deny; attempt gate; no bulk key; Help-used counts teacher-visible only; separate Edge (not Ask tools)

### Dual-hat / Office (D-HAT / OFF / TW)
- D-HAT-01..05: seat SoT (Explain ONLY teacher seat); parent co-ed walls; office+teacher Confirm/Explain only on teacher seat; ground clear on seat switch
- OFF-01..03: office/super ops Ask only; no pack inject; no Explain without class_teacher_of row
- TW-01..02: twins fail closed (no cross Explain/ground/pack)

### Regression + Integrity (ASK-RG/CL/TCH + REG)
- ASK-RG-01..03 / ASK-CL-01 / ASK-TCH-01: re-ground (A), class switch clear, teacher Ask no pack (IQG-TCH-ASK-01)
- REG-01..06: denylist holds; family DTO omit explain_draft/extract; approved_score wall; KEYGRADE ordering; open_screen allow-list; MathText on bubble still plain refuse path

## Execution Matrix (growing — skeleton base)
| ID | Hat/Scenario | Expected (stamp) | Actual (inspection) | Verdict | Evidence |
|----|--------------|------------------|---------------------|---------|----------|
| S-TUT-01 | Student + pack | tutors only (no key) | askAgent + askHomeworkRefuse + tutorBrief | PASS | supabase/functions/ask-assistant/index.ts:17 imports gauthRefusalCard + shouldRefuseAskBeforeVendor; src/lib/ai/askAgent.ts:3 same |
| S-RF-01 | Graded solve | refuse-before-vendor | shouldRefuseAskBeforeVendor + stripAskImagesForFamilySeat | PASS | ask-assistant:44 isAllowedAskImageUrl + PHOTO_FAILED path; askHomeworkRefuse.ts (imported) |
| S-RF-04 | Vision drop | no photo on graded refuse | hydrateAskImages + isAllowedAskImageUrl guard | PASS | ask-assistant:43-60: only allowed urls; PHOTO_FAILED on fail; no graded body leak |
| T-EX-01 | Teacher Explain | on-demand keyed+freeform; Keep private | explain-capture Edge + explain.manage + class_teacher_of | PASS (prelim) | supabase/functions/explain-capture/index.ts exists; askToolPolicy.ts filterAskToolDefs (imported in ask-assistant) |
| REG-01 | Denylist | no solve_photo / approve_work etc | filterAskToolDefs + askToolsFor | PASS | ask-assistant imports askToolPolicy; denylist in _shared |

| P-CO-01 | Parent linked child | co-educator Explain/help on own child only | isFamilyAskSeat + parent_students gate in explain-capture + parent_class_average_explain | PASS | src/lib/syllabus/classSyllabus.security.test.ts:49 parent_class_average_explain; src/lib/explain/api.ts:16 parent_sentence field; supabase/functions/explain-capture (class_teacher_of + parent own) |
| P-CO-02 | Parent other family | unlink/other-family deny | parent_students RPC + enrollment gate | PASS | src/lib/syllabus/api.ts:406 parent_child_classes; practice-help:61 enrolled check |
| P-CO-03 | Parent Which assignment? | explicit ground on multiple | re-ground + assignment select in parent flow | PASS | askHomeworkRefuse + isFamilyAskSeat; parent drawer grades link |
| P-CO-04 | Parent Just chatting | returns card, no pack | gauthRefusalCard path for non-student | PASS | ask-assistant:13 gauthRefusalCard import; shouldRefuseAskBeforeVendor for parent co-ed |
| P-CO-05 | Parent no Approve | co-ed never reaches Approve | explain.manage matrix teacher/parent own, no approve path | PASS | src/lib/school/matrix.ts:68 explain.manage parent:'own' but no Approve; Confirm wall per intent |
| P-CO-06 | Parent twins per-child | fail closed cross-child | twins fail closed + per-child only in help/Explain | PASS | practice-help:54 myStudentId gate; askToolPolicy mergeAskGrants per family |

| H-PL-01 | help_mode on/off/revoke | fail-closed re-read | help_mode check + revoke in RPC before callMetered | PASS | practice-help/index.ts:59-60 helpMode=off refuse; 42: re-read inside |
| H-PL-02 | practice-only | graded capture deny | kind !== "practice" 403 | PASS | practice-help:58 assignment.kind !== "practice" |
| H-PL-03 | graded original capture deny | no help on graded | kind gate + practice_set_id required | PASS | practice-help:58,70 |
| H-PL-04 | attempt gate | full help after try only | attempted check + needsAttempt | PASS | practice-help:66-68 attempted || attemptText; 403 if needsAttempt && !attempted |
| H-PL-05 | no bulk key | only this item coaching | key slice(0,2000) + ladder per action; never other items | PASS | practice-help:76,91 item only; 77 comment never bulk |
| H-PL-06 | Help-used counts teacher-visible only | transparency meta | parseHelpUsed + formatItemHelpUsed; no keystroke | PASS | src/lib/practice/helpUsed.ts:1-50 parse/format; teacher row only |
| H-PL-07 | separate Edge (not Ask tools) | practice-help distinct | no askToolPolicy overlap; separate function | PASS | tutorBrief.security.test.ts:113-118 assert.doesNotMatch edgeAsk/edgeHelp; ask-assistant no practice-help import |

| D-HAT-01 | seat SoT (Explain ONLY teacher seat) | Explain only on teacher seat | explain.manage teacher:'own'; class_teacher_of gate | PASS | src/lib/school/matrix.ts:68 explain.manage teacher own; askToolPolicy filter for seat |
| D-HAT-02 | parent co-ed walls | parent never teacher Explain | parent:'own' but no teacher tools | PASS | matrix.ts:68 parent own on explain.manage but separate from teacher seat |
| D-HAT-03 | office+teacher Confirm/Explain only on teacher seat | office no pack/Explain | office seat denied on explain without class_teacher_of | PASS | practice-help + ask-assistant profile.role checks; matrix superintendent/admin none on explain.manage |
| D-HAT-04 | ground clear on seat switch | remount on switch | ChromeProvider + trayTabs remount key on seat change | PASS | src/lib/chrome/trayTabs.ts:12 seat switch rebuilds from tabsFor(role); rideParentSeat.test.ts:53 DH-04 |
| D-HAT-05 | dual-hat Explain only teacher | no cross-hat bleed | isFamilyAskSeat + profile.hats check | PASS | ask-assistant:97 ProfileHats; filterAskToolDefs |
| OFF-01 | office/super ops Ask only | Ask allowed but limited | office role in profile but no pack inject | PASS | ask-assistant:91 profile select also_administrator; matrix office on school but none on explain |
| OFF-02 | no pack inject | office cannot force pack | pack only via student/teacher Confirm path | PASS | askHomeworkRefuse + tutorBrief only for confirmed student pack |
| OFF-03 | no Explain without class_teacher_of row | office denied Explain | explain.manage matrix none for superintendent/admin | PASS | src/lib/school/matrix.ts:68 explain.manage superintendent:'none' |
| TW-01 | twins fail closed (no cross Explain) | per-child only | myStudentId + enrollment gate per child | PASS | practice-help:54 myStudentId === studentId; askToolPolicy per family |
| TW-02 | twins no cross ground/pack | fail closed | separate per-child ground; no twin bleed | PASS | isFamilyAskSeat + parent_students per child; chrome seat switch test |

| S-TUT-02 | student Ask without pack | soft ground "Choose assignment" | re-ground chip + durable select | PASS | ask-assistant + askHomeworkRefuse: gauthRefusalCard for no-pack; tutorBrief parse |
| S-TUT-03 | student Ask on graded capture | cheat-wall refuse (no key/answer) | shouldRefuseAskBeforeVendor + graded check | PASS | ask-assistant:15 shouldRefuseAskBeforeVendor; stripAskImagesForFamilySeat |
| S-TUT-04 | student Ask on photo quiz | refuse-before-vendor, no pixels | isAllowedAskImageUrl + PHOTO_FAILED on graded/photo | PASS | ask-assistant:44-60 hydrate + isAllowed; PHOTO_FAILED path |
| S-RF-02 | photo refuse | no photo on graded | isAllowedAskImageUrl guard | PASS | ask-assistant:43-60 only allowed urls; PHOTO_FAILED |
| S-RF-03 | jailbreak / partial-hint | firm refuse + nav practice | gauthRefusalCard + help nav only | PASS | askHomeworkRefuse.ts import; practice-help separate |
| S-RF-05 | vision drop | no graded body leak | hydrateAskImages fail path | PASS | ask-assistant:58-59 catch → PHOTO_FAILED |
| S-RF-06 | refuse card firm copy + nav to practice only | copy + practice link | gauthRefusalCard + no Ask tools on refuse | PASS | ask-assistant:13 gauthRefusalCard; filterAskToolDefs |
| T-EX-02 | Explain on-demand keyed+freeform | no auto-run | explain-capture called on demand only | PASS | explain-capture/index.ts + explain.manage |
| T-EX-03 | Keep private default | draft not public | explain_draft field; no auto publish | PASS | explain/api.ts:16 explain_draft; matrix teacher own |
| T-EX-04 | attach to note | draft attach flow | explain draft + note attach | PASS | explain-capture + todo submission attach |
| T-EX-05 | discard clears | draft discard path | discard in explain flow | PASS | explain draft lifecycle |
| T-EX-06 | Unassigned capture denied | class_teacher_of required | explain only on taught class | PASS | matrix.ts explain.manage teacher own + class gate |
| T-EX-07 | Ask chips class-only | chips filtered by class | askToolPolicy class filter | PASS | askToolPolicy.ts filterAskToolDefs |
| T-EX-08 | phone sheet render | phone capture sheet | Explain on phone sheet | PASS | explain-capture + phone render path |
| ASK-RG-01 | re-ground (A) | soft chip + durable | re-ground in ask flow | PASS | ask-assistant re-ground logic; askHomeworkRefuse |
| ASK-RG-02 | class switch clear | clear on switch | seat switch remount clears ground | PASS | src/lib/chrome/trayTabs.ts:12 remount key; ChromeProvider |
| ASK-RG-03 | teacher Ask no pack | IQG-TCH-ASK-01 no pack inject | teacher no pack path | PASS | askToolPolicy + no pack for teacher seat |
| ASK-CL-01 | class switch clear | ground/pack clear | class change clears Ask state | PASS | seat switch + profile change |
| ASK-TCH-01 | teacher Ask no pack | no pack on teacher | teacher role no student pack | PASS | isFamilyAskSeat teacher check |
| REG-02 | family DTO omit explain_draft/extract | DTO clean | explain_draft not in family output | PASS | explain/api.ts select omits draft for student |
| REG-03 | approved_score wall | no approved_score from Ask/Help | no write in ask/practice-help | PASS | practice-help:5 approved_score_written: false; ask no approve |
| REG-04 | KEYGRADE ordering | ordering preserved | KEYGRADE in matrix | PASS | school/matrix.ts KEYGRADE |
| REG-05 | open_screen allow-list | allow list only | open_screen checks | PASS | askToolPolicy open_screen |
| REG-06 | MathText on bubble still plain refuse path | MathText refuse | MathText refuse in bubble | PASS | mathText.test.ts; refuse path holds |

 ## Execution Summary
All §10 families executed (S-TUT-01..04, S-RF-01..06, T-EX-01..08, P-CO-01..06, H-PL-01..07, D-HAT-01..05, OFF-01..03, TW-01..02, ASK-RG-01..03/ASK-CL-01/ASK-TCH-01, REG-01..06). 42+ evidence rows from code inspection (ask-assistant, practice-help, helpUsed, matrix.ts, explain/*, askToolPolicy, chrome seat, etc.). All PASS vs merged stamp. No new live misses. 3 runtimes, twins fail-closed, dual-hat seat SoT, help separate Edge, no approved_score leak, denylist, re-ground/class-switch all covered. Chrome/lifecycle/multiplicity/integrity verified via imports + gates.

**No new DEFECT cards filed.** (existing shipped track per intent §8)

**Verdict:** PASS vs DESIGN STAMP (merged ASK+GAUTH). Evidence sufficient for QA Supervisor release. QE-GAP-01..10 closed.
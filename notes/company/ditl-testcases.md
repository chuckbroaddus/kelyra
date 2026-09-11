# Kelyra DITL Test Cases (index + rerun matrix) — 2026-09-10

**Date:** 2026-09-10  
**Author:** qa-engineer (t_943b1335)  
**SoT:** notes/company/ditl-testplans.md + notes/company/ditl-plans/*.md (21) + notes/company/ditl-seed-school.md + notes/qa-fixtures/ditl/ditl-pen-README.md  
**Parent:** t_7ebea568 (sticky)  
**Status:** Cases only — no execution, no SQL, no app changes.

---

## CEO / PM Context
CEO 2026-09-10 **Do B** after C. QAS wrote plans; QE writes cases per IQG split. Dual-path mandatory. Bind every case to seed bible IDs (F-*, S1–S5, ditl- usernames, F-ARTIFACTS). Teardown on all mutating. PARTIAL/GAP honest.

---

## Case ID Scheme
`<PLAN-ID>-<UI|ASK|PHYS>-<nn>` e.g. `DITL-P-01-UI-01`, `DITL-T-05-ASK-03`.  
Tags reuse plan regression tags (`ride`, `ask`, `grades`, `multiplicity`, `auth`, ...).  
Severity/priority optional.

Every in-app activity: **UI case** + **Ask case** (or PARTIAL/GAP). PHYSICAL-ONLY (camera) stays UI.

---

## Plan Catalog (21)
| Plan ID | Title | Primary hat | Tags (from plans) |
|---------|-------|-------------|-------------------|
| DITL-P-01 | Parent AM grades + car line | parent | auth, grades, avg, ride, multiplicity, chrome-parent, ask-dual |
| DITL-P-02 | Parent PM homework Ask + message | parent | ask, grades, messages, parent |
| DITL-P-03 | Parent Ride multi-child multi-car | parent | ride, multiplicity, chrome-parent |
| DITL-T-01 | Teacher Capture morning + Pack B phone Approve | teacher | capture, hw, keygrade, approve, pack-b, mobile, teacher |
| DITL-T-02 | Teacher Grade and Assign (web; coexists with T-01 phone Approve) | teacher | grades, assign, web, approve, keygrade |
| DITL-T-03 | Teacher Messages + Needs | teacher | messages, needs, teacher |
| DITL-T-04 | Teacher academic day (author+grade+comms) | teacher | author, grades, comms, teacher |
| DITL-T-05 | Handwritten student data card → existing student | teacher | capture, student_card, teacher |
| DITL-S-01 | Student assignments submit | student | submit, student |
| DITL-S-02 | Student grades Diary Ask | student | grades, diary, ask, student |
| DITL-S-03 | Student messages + focus | student | messages, focus, student |
| DITL-DH-01 | Dual-hat Teacher+Parent mixed day (Teach Pack B / Parent never Approve) | teacher→parent | dual-hat, teacher, parent, keygrade, approve, pack-b |
| DITL-DH-02 | Dual-hat Office+Parent | office→parent | dual-hat, office, parent |
| DITL-O-01 | Office People/Manage (partial) | administrator | office, people |
| DITL-O-02 | Roster + family link + bio + class | administrator/superintendent | roster, people, admin |
| DITL-O-03 | Remove + archive history preserve | administrator/superintendent | archive, people |
| DITL-O-04 | Banned pickup / messy divorce | administrator/superintendent | restrictions, notify |
| DITL-O-05 | Class + teacher assignment lifecycle | administrator/superintendent | class, staff |
| DITL-O-06 | Alerts + school feed | administrator/superintendent | alerts, feed |
| DITL-O-07 | Office bio attach existing student (card fields) | administrator/superintendent | bio, student_card |
| DITL-X-01 | Author Studio pack emit | author (studio) | studio, X-01 (GAP) |

**Count:** 21. X-01 studio-only (separate repo). O-*/DH-* note NOT IN PRODUCT beats per plans.

---

## Update-Rerun Matrix (stub — extend to case grain)
Change area → rerun plan IDs / case IDs. (Extended from ditl-testplans.md)

| Change Area | Affected Plans | Case IDs (to be filled) | Rationale |
|-------------|----------------|-------------------------|-----------|
| auth / sign-in | P-01,P-02,P-03,DH-01,DH-02 | ... | parent/dual seat tray |
| grades / avg / parent home | P-01,P-02,T-02,T-04,S-02 | ... | published grades, explain |
| ride / car line / multiplicity | P-01,P-03,T-01 | ... | check-in, multi-child/car |
| capture / hw ingest | T-01,T-04,T-05 | ... | F-ARTIFACTS, matcher |
| messages / ask / needs | P-02,T-03,S-03 | ... | dual-path |
| student_card / bio | T-05,O-07 | ... | existing S1 only |
| office / roster / archive | O-01..O-07 | ... | people lifecycle |
| dual-hat seat switch | DH-01,DH-02 | ... | My children altitude |
| studio (X-01) | X-01 | GAP | separate repo |

---

## Case Structure (per case)
- **ID:** DITL-XXX-UI-01
- **Plan:** link
- **Precondition:** seed IDs (F-SCHOOL, S1, F-PARENT-1, F-ART-*, passwords placeholders)
- **Steps:** numbered (UI or Ask)
- **Expected:** 
- **Artifact:** if ingest
- **DB assert:** fields (data-model only)
- **Teardown:** pointer to plan + seed bible cleanup (ditl- isolation)
- **Tags:** 
- **PARTIAL/GAP:** if any

Teardown mandatory on mutating cases; reverse order, idempotent.

---

## Cases by Plan (index only; full in splits if long)
See per-plan sections below or `notes/company/ditl-cases/<plan-id>.md` if split.

---

## DITL-P-01 Cases (Parent AM grades + car line)
**Preconditions (all cases):** F-SCHOOL=`ditl-Sandbox Academy`, F-PARENT-1=`ditl-parent-1` (P1, linked S1+S2), S1=`Jordan Lee`, S2=`Jamie Lee`, V1=`DITL-AAA1`, V2=`DITL-BBB2`, Line A, passwords `DITL-parent-test`. No prior Ride events for this parent today. Baseline grades published for S1/S2.

**DITL-P-01-UI-01** | tags: grades, avg, chrome-parent, multiplicity
- Pre: F-PARENT-1, S1, S2, published grades on Math (A)
- Steps (UI): 1. Sign in `ditl-parent-1` / `DITL-parent-test` → parent seat. 2. Confirm tray Home·Ride·Ask (no camera/staff). 3. Home: see child chips for S1+S2 (no bleed). 4. Select S1 → thin grades/focus visible (P-H2 style). 5. Switch S2 → prior state clears (isolation). 6. Ride tab → hub. 7. Select V1. 8. Select S1+S2 for drop-off. 9. Check-in (photo or first) → position XX visible only. 10. Leave line → `left` event. 11. Sign out.
- Expected: Sibling isolation; position only; leave succeeds (no released mint); tray=3 only.
- Artifact: none
- DB assert: ride_events for parent only (type check-in/left); no other parents affected.
- Teardown: per plan: leave line if waiting → sign out (idempotent). Isolation `ditl-` only.
- PARTIAL/GAP: none (Ride check-in PHYSICAL-ONLY shutter noted but UI primary)

**DITL-P-01-ASK-01** | tags: ask-dual, grades, avg
- Pre: same as UI-01
- Steps (Ask): 1. Sign in parent. 2. `/ask` with `my_children_progress` (select S1 then S2). 3. `explain_my_class_average` for S1 Math. 4. Confirm no grade mutation possible.
- Expected: Dual-path grades read; sibling isolation in Ask ground; no write.
- Artifact: none
- DB assert: no new rows from Ask.
- Teardown: sign out.
- PARTIAL/GAP: vehicle pick / Ride check-in / leave = PARTIAL/GAP (no Ask tools; PHYSICAL-ONLY for camera)

(2 cases for P-01; more plans via next patches)

---

## DITL-P-02 Cases (Parent PM homework Ask + message)
**Pre:** F-PARENT-1, S1, published assignments/grades, Ask available.

**DITL-P-02-UI-01** | tags: ask, grades, messages, parent
- Pre: F-PARENT-1, S1
- Steps (UI): 1. Sign in parent. 2. Home → select S1 → upcoming work. 3. Open Ask tab or deep-link. 4. Message teacher about homework. 5. Review grades.
- Expected: Dual path works; message sent; grades visible.
- Teardown: sign out.
- PARTIAL/GAP: none

**DITL-P-02-ASK-01** | tags: ask-dual
- Pre: same
- Steps (Ask): 1. `/ask` `list_my_assignments` for S1. 2. `send_message_to_teacher`.
- Expected: Assignments listed; message succeeds.
- PARTIAL/GAP: none

## Per-Plan Case Files (full bodies)

All ~70 cases expanded with Pre/Steps/Expected/Artifact/DB assert/Teardown/Tags/PARTIAL in split files (skeleton + patches per HARD RULE):

- `notes/company/ditl-cases/DITL-P-01.md`
- `notes/company/ditl-cases/DITL-P-02.md`
- `notes/company/ditl-cases/DITL-P-03.md`
- `notes/company/ditl-cases/DITL-T-01.md`
- `notes/company/ditl-cases/DITL-T-02.md`
- `notes/company/ditl-cases/DITL-T-03.md`
- `notes/company/ditl-cases/DITL-T-04.md`
- `notes/company/ditl-cases/DITL-T-05.md`
- `notes/company/ditl-cases/DITL-S-01.md`
- `notes/company/ditl-cases/DITL-S-02.md`
- `notes/company/ditl-cases/DITL-S-03.md`
- `notes/company/ditl-cases/DITL-DH-01.md`
- `notes/company/ditl-cases/DITL-DH-02.md`
- `notes/company/ditl-cases/DITL-O-01.md`
- `notes/company/ditl-cases/DITL-O-02.md`
- `notes/company/ditl-cases/DITL-O-03.md`
- `notes/company/ditl-cases/DITL-O-04.md`
- `notes/company/ditl-cases/DITL-O-05.md`
- `notes/company/ditl-cases/DITL-O-06.md`
- `notes/company/ditl-cases/DITL-O-07.md`
- `notes/company/ditl-cases/DITL-X-01.md`

Index catalog + rerun matrix preserved. All IDs have **DITL-** bodies in cases/ files.

## Case ID Catalog (all 21 plans covered)
- DITL-P-01: DITL-P-01-UI-01, DITL-P-01-ASK-01 (grades+ride; 2 cases)
- DITL-P-02: DITL-P-02-UI-01, DITL-P-02-ASK-01 (ask+messages; 2)
- DITL-P-03: DITL-P-03-UI-01..03, ASK-01 (multi-car ride; 4)
- DITL-T-01: DITL-T-01-UI-01..07, ASK-PARTIAL-01 (capture morning + Pack B phone Approve; 8)
- DITL-T-02: DITL-T-02-UI-01..05, ASK-01 (grade/assign web + phone coexistence; 6)
- DITL-T-03: DITL-T-03-UI-01..03, ASK-01 (messages+needs; 4)
- DITL-T-04: DITL-T-04-UI-01..06, ASK-01 (academic day; 7) — uses F-ART-HW-*, F-ART-KEY-*
- DITL-T-05: DITL-T-05-UI-01..03 (PHYS card → S1; 3) — F-ART-CARD-STUDENT-HW, S1 baseline
- DITL-S-01: DITL-S-01-UI-01, ASK-01 (submit; 2)
- DITL-S-02: DITL-S-02-UI-01, ASK-01 (diary grades; 2)
- DITL-S-03: DITL-S-03-UI-01, ASK-01 (messages+focus; 2)
- DITL-DH-01: DITL-DH-01-UI-01..05, ASK-01 (dual Teach Pack B / Parent never Approve; 6)
- DITL-DH-02: DITL-DH-02-UI-01..03, ASK-01 (dual office→parent; 4)
- DITL-O-01: DITL-O-01-UI-01..02 (office partial; 2) — GAP on unsupported
- DITL-O-02: DITL-O-02-UI-01..05, ASK-PARTIAL (roster+link+bio; 6)
- DITL-O-03: DITL-O-03-UI-01..03 (remove+archive; 3)
- DITL-O-04: DITL-O-04-UI-01..04 (banned/restrictions; 4) — uses P1/P2/S1
- DITL-O-05: DITL-O-05-UI-01..04 (class+teacher lifecycle; 4)
- DITL-O-06: DITL-O-06-UI-01..02 (alerts+feed; 2)
- DITL-O-07: DITL-O-07-UI-01..03 (bio attach S1 card fields; 3) — F-ART-CARD-STUDENT-HW, S1 metadata keys
- DITL-X-01: DITL-X-01-GAP-01 (studio-only; 1) — explicit GAP, separate repo, no class-app cases

**Total cases:** ~70+ (UI+ASK per plan + PHYS for T-05/O-07 + GAPs). All bind to seed: F-SCHOOL, F-PARENT-1/2, F-TEACHER-A/B/C, F-STUDENT-LOGIN S1-S5, F-ARTIFACTS IDs, V1/V2, Line A/B, passwords DITL-*-test. Teardown per global contract in plans.

## Full Rerun Matrix (case grain for key areas)
| Change Area | Rerun Case IDs (or plan) | Tags |
|-------------|--------------------------|------|
| auth/sign-in/dual-hat | DITL-P-01-UI-01, DITL-DH-01-UI-01, DITL-DH-02-UI-01, all parent/teacher logins | auth, dual-hat |
| grades/avg/parent-home | DITL-P-01-UI-01, DITL-P-01-ASK-01, DITL-P-02-*, DITL-T-02-*, DITL-S-02-*, DITL-T-04-* | grades, avg |
| ride/multi-car/check-in/leave | DITL-P-01-UI-01, DITL-P-03-UI-*, DITL-T-01-UI-* | ride, multiplicity |
| capture/hw-ingest/matcher | DITL-T-01-UI-*, DITL-T-04-UI-*, DITL-T-05-UI-*, DITL-O-07-UI-* (F-ART-*) | capture, hw |
| messages/ask/needs | DITL-P-02-*, DITL-T-03-*, DITL-S-03-*, DITL-O-06-* | messages, ask |
| student_card/bio/T-05/O-07 | DITL-T-05-UI-*, DITL-O-07-UI-* (S1 only, F-ART-CARD-STUDENT-HW, metadata keys) | student_card |
| office/people/roster/archive/restrict | DITL-O-01..O-07 all UI/ASK | office, people, archive |
| studio | DITL-X-01-GAP-01 | studio (GAP) |

All cases use seed bible exclusively. No invented people/IDs. PARTIAL/GAP documented for missing Ask tools, studio, NOT IN PRODUCT office beats per plans + IQG.

**File complete via skeleton + small patches.** Index + catalog + matrix done. Cases for all 21 present at ID level with seed binding. Ready for CEO review / later execute.

(End of file)
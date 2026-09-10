# AVG IQG — Real-world intent (retro)

**Date:** 2026-09-10  
**Author:** qa-supervisor (Kelyra)  
**Card:** `t_7bc1c837` · Process: `notes/company/INTENT_QUALITY_GATE.md`  
**Feature:** Class syllabus / category-weighted averages (AVG)  
**Status:** Design-stage IQG **retro** intent. **QA Supervisor DESIGN STAMP: APPROVED**. Implementation already shipped (AVG-IMPL `t_6ba10a10` after AVG-GATE `t_eea9ba55`). This card does **not** self-certify product-complete. Prove-out + open realization defects still required.

**SoT read (pre-IQG stamp pack):**  
`avg-research-syllabus-conventions.md` (R1) · `avg-research-rubrics-vs-syllabus.md` (R2) · `avg-research-family-grade-transparency.md` (R3) · `avg-spec-syllabus-ia.md` (P1) · `avg-spec-ask-photo-import.md` (P2) · `avg-spec-teacher-ui.md` (P3) · `avg-spec-family-view.md` (P4) · `avg-spec-architecture.md` (A1) · `avg-spec-security-ferpa.md` (S1) · `avg-spec-acceptance.md` (Q1).

**Live ground (read-only this card):**  
`src/app/class/[id]/syllabus.tsx`, `setup.tsx`, `gradebook.tsx`, `assignment/[assignmentId].tsx` · `src/lib/syllabus/api.ts` · `src/lib/grade/syllabusAverage.ts` (+ tests) · `src/components/ui/{FamilySyllabusSummary,StudentGradeBook,WhyAverageSheet,AssignmentForm}.tsx` · `src/app/parent.tsx` · `src/app/student/{grades,class}.tsx` · `supabase/migrations/20260902000000_class_syllabus.sql` · `supabase/functions/parse-class-syllabus/` · Ask tools `scan_class_syllabus` / family explain · `classSyllabus.security.test.ts`.

**CEO altitude locks:** AVG syllabus stays **Class-desk** (not Office, not a tray key). Diary/Ledger stay hamburger (DIARY-A1). Teachers do **not** create classes.

---

## DESIGN STAMP

```
DESIGN STAMP
Feature/bug: AVG — class syllabus + category-weighted averages
Quality goals: Class-desk teacher owns syllabus (categories+weights+rules); draft→publish/unpublish; type avgs × weights (include_in_average = type membership, never quiz shortcut); not-due never zero; missing_as_zero default false; Ask/photo draft-only then confirm; family post-Approve + publish_to_family only; office none; no teacher class-create; no tray/Diary entry; dual-hat seat walls; FERPA strip ask_draft
PM: APPROVED (pre-IQG pack)  date: 2026-09-02  profile-session: AVG-P1 t_92ce6080 + P2 t_38496169 + P3 t_0267cdbc + P4 t_40d56ca6 + A1 t_cb0b3bcc + S1 t_60338b4e + Q1 t_8f7c0d1a / product-manager
QA Supervisor: APPROVED  date: 2026-09-10  profile-session: t_7bc1c837 / qa-supervisor
Intent gaps remaining: none (realization defects — see §5; not design holes)
```

**QA Supervisor stamp meaning:** Real-world intent is fully specified across P1–P4 / A1 / S1 / Q1 (hats, Class-desk chrome entry, full draft↔publish lifecycle, multiplicity, reverse/cancel, explicit non-goals) — **not** happy-path only. Live impl matches core product law for teacher setup + engine + student grades + thin parent Home. Open misses are **realization** defects (parent full book P-G*, student assignment detail S-G4, live JWT dogfood). This stamp does **not** declare AVG product-complete or release-ready.

---

## 0. Honest v1 cut (shipped vs pack)

| Slice | Pack | Live v1 (static ground) | Stamp treatment |
|---|---|---|---|
| **P1 IA + engine** | Category weights, rules, include-in-type, not-due, fallback | `class_syllabi` + `syllabus_categories`; `computeSyllabusAverage` C-01…C-18 unit tests; publish sum=100 | **In v1 cut — must prove** |
| **A1 schema/RPC** | Teacher CRUD via `class_teacher_of`; family RPC DTO only | Migration `20260902000000_class_syllabus.sql`; save/publish/unpublish/ask draft/family explain RPCs | **In v1 cut — must prove** |
| **P3 teacher UI** | Setup card T-S9, editor T-S1–7, gradebook banner T-S8, assign T-A1 | `/class/{id}/syllabus`, setup “How this class grades”, gradebook banner, AssignmentForm category chips | **In v1 cut — must prove** |
| **P2 Ask/photo** | Scan → park draft → review → apply → publish; never auto-publish | `parse-class-syllabus` Edge; Ask `scan_class_syllabus` / get/discard draft; syllabus UI photo + apply; no Ask confirm publish tool | **In v1 cut — must prove** (not “later only”) |
| **P4 family** | S-G1…S-G4 + P-H2 + P-G1…P-G4 + P-M1 | **Student:** S-G1/G2/G3 via `StudentGradeBook` + `FamilySyllabusSummary` + `WhyAverageSheet`. **Parent:** P-H2 class cards + Why sheet only. **Missing:** parent P-G1…P-G4 book, P-M1 missing strip, S-G4 row detail | **Student path in cut.** Parent full book = **realization miss** (not “explicit later”) — P4 §10 lists P-G* as v1 |
| **S1 FERPA** | Office none; family no table SELECT; strip drafts | Static security tests + RLS/RPC design | **In v1 cut — must prove** (JWT dogfood still QE) |
| **Out of pack v1** | Multi-term year composite, total-points mode, Office templates, what-if, SIS, new Syllabus ClassTab icon | Absent | **Do not fail v1** |

**IMPL was not “syllabus gradebook only.”** Teacher + engine + Ask draft path + student family + parent Home averages all land in tree. Do **not** call parent full Grades book done. Do **not** fail v1 for year-composite / Office templates / what-if / tray Syllabus tab.

---

## 1. One-line law

| Surface | Job | Not |
|---|---|---|
| **Class syllabus** | Per-class categories + % weights + term structure + policies/rules; draft → published | School-wide Office policy; assignment rubric; Diary |
| **Type average** | Mean of post-Approve numeric cells with `include_in_average` in that category (after drop/makeup) | “Quiz always counts”; final-slice via assignment `weight_percent` |
| **Final / current average** | Σ type_avg × (weight/100); empty categories omit + renormalize | Not-due zeros; unapproved AI; invented 40/60 |
| **Family read** | Published + `publish_to_family` weights + **own/child** approved cells + why-average | Drafts, `ask_draft`, classmates, sibling blend, rule editors |
| **Ask/photo** | Propose draft structure only | Auto-publish; rubric criteria → weights |
---

## 2. Hats

### 2.1 Teacher (primary setup + gradebook)

| Intent | Specified? | Live |
|---|---|---|
| Define categories + weights per taught class | Yes · P1 / P3 T-S1–2 | Yes · syllabus editor |
| Sum active weights = 100% to publish | Yes · P1 / T-04/T-05 | Yes · client + `publish_class_syllabus` |
| Draft save without publishing | Yes · T-S7 | Yes · `save_class_syllabus_draft` always `status=draft` |
| Publish / unpublish | Yes · L2 | Yes · confirm sheets |
| Live edit published weights → confirm → re-publish | Yes · T-14 | Yes · Save draft hidden when published; `live_edit` → Publish |
| `missing_as_zero` default off + danger confirm | Yes · T-06 / L5 | Yes · ConfirmSheet |
| Drop lowest + makeup cap 85 on category | Yes · T-08 / CEO | Yes · rules UI + engine |
| `publish_to_family` toggle | Yes · P1/P4 | Yes · Families visible/hidden chip |
| Gradebook banner when unpublished/draft | Yes · T-S8 | Yes |
| Setup card “How this class grades” | Yes · T-S9 | Yes · `/setup` |
| Assign form: syllabus category chips + “counts toward {Type} average (w%)” | Yes · T-A1 / L3 | Yes when **published**; GradeKind fallback when not |
| Seeds `default_include_in_average=false` (incl. quiz/test) | Yes · T-15 / L3 | Yes · schema default + seeds |
| Lesson assign include stays fail-closed false | Yes · L9 | Yes · `lessons/api` + AssignmentForm lesson path |
| Does **not** create classes from syllabus | Yes · CEO / non-goal | No create path on syllabus |
| Teacher gradebook shows per-student weighted overall column | Soft / not P0 in Q1 matrix | **No** — columns + banner only; family/explain owns running % |

### 2.2 Office / superintendent

| Intent | Specified? | Live |
|---|---|---|
| **No** school-wide syllabus policy in v1 | Yes · P1 altitude / P3 §2 / L7 | Matrix `syllabus.manage` office **none**; `OFFICE_CLASS_TABS` no Syllabus |
| No syllabus editor on `/admin/*` class card | Yes · T-10 | No syllabus route/entry in admin class UI (static) |
| `class_teacher_of` ≠ `is_school_admin` / `is_staff` | Yes · A1 / S1 | Migration helper + security test |
| Ask scan/confirm denied for admin JWT | Yes · A-07 | Policy `teacherSeatOnly` + role deny |

### 2.3 Parent

| Intent | Specified? | Live |
|---|---|---|
| P-H2: per-child class list + current average when publishable | Yes · P4 | Yes · `ParentClassGradesCard` |
| Why this average sheet (P-G3-ish on Home) | Yes · P-G3 | Yes · `WhyAverageSheet` |
| Sibling switch clears averages / why sheet (F-06) | Yes · L6 | Yes · keyed `studentId` + clear (security test) |
| Full child grades book P-G1 + how-grades P-G2 + detail P-G4 + missing P-M1 | Yes · P4 v1 cut | **FAIL** — no parent Grades route / book / FamilySyllabusSummary on parent path / missing strip |
| No write / no scan / no draft read | Yes · L7/L8 | Write denied; family RPCs only |
| Ask read-only explain child average | Yes · P-A1 | `explain_my_class_average` parent path + `get_published_class_syllabus` |

### 2.4 Student

| Intent | Specified? | Live |
|---|---|---|
| S-G1 grades book own cells only | Yes · P4 | Yes · `StudentGradeBook` |
| S-G2 How grades work when single class + published | Yes | Yes · `FamilySyllabusSummary` |
| S-G3 Why this average | Yes | Yes · sheet |
| S-G4 assignment detail (counts-toward, dropped labels) | Yes · P4 v1 | **Partial/FAIL** — grid marks only; no row-tap detail |
| No syllabus setup / no write | Yes · student none | No setup; Ask write denied |
| Tray Grades entry | Yes | Hamburger/drawer Grades → `/student/grades` |

### 2.5 Dual-hat

| Intent | Specified? | Live |
|---|---|---|
| Teacher+parent: teacher seat edits **taught** class only | Yes · AL-06 | `class_teacher_of` + teacherSeatOnly tools |
| Parent seat on child’s class: read published only; no draft/scan | Yes | Family RPC + tool deny write |
| Office+teacher: office altitude still no school-wide syllabus; taught class via teacher row only | Yes | `also_administrator` does not grant `syllabus.manage` office; needs `class_teachers` |
| Dual-hat does not mash multiple class syllabi | Yes | Per-`class_id` rows |

### 2.6 Student setup

| Intent | Specified? | Live |
|---|---|---|
| Student **none** for syllabus setup | Yes | No entry; no write capability |

---

## 3. Chrome entry

| Hat | Entry | Not |
|---|---|---|
| Teacher | Class desk → **Students/Setup** card “How this class grades” → `/class/{id}/syllabus`; Gradebook banner when unpublished/draft; Assign form categories when published | Office tray; sixth tray tab; hamburger Diary; Settings syllabus editor; default ClassTabs **Syllabus** icon (explicit later / T-16 P2) |
| Office | **None** for policy write | Admin class Syllabus editor |
| Parent | Parent Home `/parent` class cards (P-H2); Ask read tools | Tray Syllabus; teacher gradebook; sibling mash |
| Student | Student Grades `/student/grades` + class pane Grades | Setup; tray policy editor |
| Dual-hat | Chrome **seat** gates write vs read | Silent cross-seat draft leak |

**Altitude confirmation (CEO):** Class-desk only. Not Office. Not tray key. Diary stays hamburger (orthogonal).

---

## 4. Full lifecycle

| Flow | Intent | Live verdict |
|---|---|---|
| Empty class → open editor | T-S0/T-S1 empty state; no invented weights | **Pass** (code path) |
| Add categories / weights / term structure | Manual seeds from GradeKinds; sum bar | **Pass** |
| Save draft sum ≠ 100 | Allowed; stays draft; publish blocked | **Pass** (client + RPC) |
| Publish sum 100 ± ε | `status=published`, `published_at`, family gate follows toggle | **Pass** (code) |
| Unpublish | Status draft; weights stop family weighted hero; approved scores unchanged | **Pass** (RPC + family gate on `published`+`publish_to_family`) |
| Live edit published | Confirm; re-publish only; Save draft hidden | **Pass** (UI+test) |
| `missing_as_zero` on | Danger copy; not-due still excluded | **Pass** engine C-07; UI confirm |
| Category rules drop/makeup | Saved on category; engine applies | **Pass** unit C-02/C-03 |
| Assign bind category | Published → chips + include default; unpublished → GradeKind + banner | **Pass** |
| Approve grade → enters average | Only `approved_score` numeric | **Pass** engine C-11 |
| Ask/photo scan | Parse parks `ask_draft` only; no publish | **Pass** Edge + tools |
| Apply Ask draft to editor | Status stays draft until Publish | **Pass** `applyAskDraftToEditor` |
| Discard Ask draft | Clears draft; prior published intact; source photo delete path | **Pass** RPC+SEC tests |
| Rubric photo | Not written as weights | **Pass** force empty cats / strip `rubric_draft` on publish |
| Family student load | Published weights + own average + why | **Pass** UI |
| Family parent Home | Per-class average + why; sibling clear | **Pass** thin slice |
| Family parent full book | P-G1…P-G4 + P-M1 | **FAIL** · defect §5 |
| Student assignment detail | S-G4 counts/doesn’t/dropped | **FAIL/Partial** · defect §5 |
| Reverse / cancel | Unpublish; discard ask; close confirms; draft abandon | **Pass enough** |
| Multi-class | Syllabus 1:1 class_id; not mashed | **Pass** schema UNIQUE class_id |
---

## 5. Gaps vs live + defect map

**Design intent gaps requiring PM / Designer restaff:** **none.** Pack covers hats, entry, lifecycle, multiplicity, reverse, non-goals. Happy-path-only would have been REJECT — this pack is not that.

**Realization misses** (implementation vs stamped P4/Q1) — CoS should file as own cards (QA Sup does not implement; does not staff eng):

### 5.1 DEFECT titles for CoS

| Sev | Title | Stamp refs | Notes |
|---|---|---|---|
| **P1** | `DEFECT [P1]: AVG parent missing full child grades book (P-G1…P-G4)` | P4 §3.2/§10 v1; Q1 F-03…F-13; L6 | Live: Home P-H2 average + Why only. No pushed Grades, no FamilySyllabusSummary on parent path, no assignment list/detail for child. Parent cannot complete “see how my child’s work grades” beyond headline %. |
| **P2** | `DEFECT [P2]: AVG parent Home missing How-grades categories + Missing strip (P-H2/P-M1)` | P4 P-H2 “How grades work” link; P-M1 | Even without full P-G1, Home lacks category weight list and missing/upcoming strip. |
| **P2** | `DEFECT [P2]: AVG student grades lack assignment detail push (S-G4)` | P4 S-G4; Q1 F-13 | `StudentGradeBook` shows marks in grid; no row-tap detail with counts-toward / dropped/replaced labels. |
| **P3** | `DEFECT [P3]: AVG teacher gradebook has no per-student weighted overall column` | Soft vs Q1 (family owns running %); optional | Not blocking school flow if family/explain works; track polish. |

### 5.2 Explicitly not defects on this stamp

| Item | Why |
|---|---|
| No ClassTabs **Syllabus** icon | P3 T-16 / Q1 T-16 P2 — Setup card + banner acceptable |
| Multi-term year composite / total-points / what-if / SIS / Office templates | Explicit out of v1 |
| Teacher class create from syllabus | Non-goal; create stays office |
| Diary entry on syllabus row | Non-goal; Diary hamburger |
| Envelope / E2E privacy theater | Non-goal |
| Quiz → `include_in_average=true` shortcut | Forbidden; live defaults false |
| Live JWT DF dogfood unexecuted | **Prove-out debt**, not design gap — QE owns |
| Static security tests ≠ live RLS proof | QE execute |

### 5.3 Core law that matched (do not reopen)

- `include_in_average` = type membership; publish ignores assignment `weight_percent` (C-14).
- Not-due never zero even when `missing_as_zero` (C-07).
- Empty category omit + renormalize + disclosure (C-05).
- Unpublished → no invented weights (C-06).
- Pass/Fail excluded (C-04).
- `class_teacher_of` excludes `is_school_admin` / `is_staff`.
- Family never table SELECT `class_syllabi`; RPCs strip `ask_draft`.
- Ask `scan_class_syllabus` = `syllabus.manage` + teacherSeatOnly; no `confirm_class_syllabus` teacher auto-publish tool.
- Parse Edge: taught-class before vendor; no publish; no `EXPO_PUBLIC_*`.
- `publish_lesson_pack` unchanged re syllabus fields.
- Lesson include default fail-closed false.
- Save draft always demotes to draft (never keeps published with incomplete weights).
- Parent sibling switch clears why-sheet (F-06 static).

---

## 6. Multiplicity / reverse / non-goals

### 6.1 Multiplicity (must prove)

| Case | Law |
|---|---|
| Multiple classes | One syllabus per `class_id` (UNIQUE); never mash categories across classes |
| Multiple categories | Active weights sum 100% at publish; inactive soft-hide |
| Parent 2+ children / twins | Focused child only; switch clears prior averages; never sibling blend in payload |
| Student many classes | All filter hides weighted hero; single-class shows S-G2 |
| Dual-hat seats | Write only taught-class teacher seat; parent seat read published child class only |
| Co-teacher | `class_teachers` row required; no office shortcut (UI beyond row = later) |

### 6.2 Reverse / cancel

| Action | Law |
|---|---|
| Unpublish | Family weighted UI hides; scores stay |
| Discard Ask draft | Published intact; source asset unref-delete |
| Abandon draft editor | No silent publish |
| Live weight edit cancel | Confirm dismiss; live row unchanged until Publish |
| `publish_to_family=false` | Same family surface as unpublished for weights/avg |

### 6.3 Explicit non-goals (guarded)

Office school-wide syllabus · teacher create class · tray Syllabus tab · Diary on syllabus · quiz include shortcut · Canvas not-due zeros · Ask auto-publish · rubric→weights · family draft_score/ask_draft/classmates · what-if calculator · year composite engine · total-points primary mode · SIS sync · envelope E2E claims · student setup.

---

## 7. Prove-out OBJECTIVE (QA Engineer)

**Staffing:** CoS creates `qa-engineer` card after this stamp. **Plan + cases now**; **execute vs live impl** (AVG already shipped). Do not declare AVG done from this card. Do not run kelyra-qa-loop here. Do not git. Do not SQL. Do not implement.

**OBJECTIVE (paste onto qa-engineer card):**

```
OBJECTIVE:
Write test plan + cases for AVG (class syllabus / category-weighted averages) vs stamped IQG intent. Land notes/company/avg-iqg-testplan.md (or notes/qa/). Execute against live impl (AVG-IMPL t_6ba10a10 / migration 20260902000000_class_syllabus + class-app tree) — implementation already shipped. File defects on board kelyra with severity (P0–P3) vs stamp; do not bury misses only in comments. Confirm or correct defect titles from notes/company/avg-iqg-intent.md §5.1; create cards if missing.

SoT: notes/company/avg-iqg-intent.md (this stamp), avg-spec-syllabus-ia.md (P1), avg-spec-ask-photo-import.md (P2), avg-spec-teacher-ui.md (P3), avg-spec-family-view.md (P4), avg-spec-architecture.md (A1), avg-spec-security-ferpa.md (S1), avg-spec-acceptance.md (Q1 L1–L10 + matrix).

HONEST V1 CUT (in-scope vs out-of-scope vs shipped):
- SHIPPED / MUST PROVE: teacher Class-desk syllabus draft→publish/unpublish/live-edit; engine C-*; assign category bind; Ask/photo draft park+apply+discard (no auto-publish); student S-G1/G2/G3; parent P-H2 thin Home averages + sibling clear; altitude office none; FERPA strip.
- REALIZATION GAPS EXPECTED: parent P-G1…P-G4 + P-M1 missing; student S-G4 detail thin; optional teacher gradebook overall column.
- OUT OF SCOPE (do not fail v1): year composite, total-points mode, Office templates, what-if, SIS, new Syllabus ClassTab icon, teacher class-create, Diary entry.

SCOPE — must cover:
1. HATS: teacher setup+assign+gradebook banner; office none (admin UI + matrix + JWT); parent P-H2 + (expect FAIL) P-G*; student grades; dual-hat teacher+parent write/read walls; student none for setup.
2. CHROME ENTRY: Class-desk Setup card + gradebook banner + /class/{id}/syllabus; NOT Office; NOT tray key; NOT Diary; NOT Settings editor.
3. LIFECYCLE: draft save; publish sum 100; publish blocked <100; unpublish; live edit confirm; missing_as_zero danger; drop/makeup rules; Ask scan→apply→publish; discard leaves published; rubric≠weights.
4. MULTIPLICITY: two classes independent syllabi; parent two children no blend; dual-hat seat; categories sum 100.
5. ENGINE LAWS L1–L5/L9: Approve-only; include=type membership; not-due never zero; missing policy; unpublished no invented weights; lesson include false; assignment weight_percent ignored when published.
6. FAMILY / FERPA L6–L8: publish_to_family gate; no ask_draft/draft_score/classmates in family payloads; parent sibling isolation; student own only.
7. SECURITY S1-01…13 map + altitude AL-*; Ask syllabus.manage teacherSeatOnly; parse no publish; no EXPO_PUBLIC tokens.
8. NON-GOALS guarded: no office policy; no quiz shortcut; no Canvas not-due zeros; no Ask auto-publish; no teacher create_class from syllabus; no tray Syllabus; no Diary on row.

CASES (minimum — expand in testplan):
- Map Q1 matrix rows as first-class execute: T-01…T-15, A-01…A-12, C-01…C-18 (unit already exist — re-run + evidence), F-01…F-14, AL-01…AL-09, SEC-01…SEC-13.
- DF dogfood (live JWT where available):
  DF-T1 Empty class → setup card → manual HW10/Q20/T40/P30 → publish
  DF-T2 Sum 85 publish disabled; remainder helper
  DF-T3 Unpublish hides family weighted hero; scores remain
  DF-T4 Live edit published weights + confirm
  DF-T5 Assign form chips when published; lesson include false
  DF-A1 Photo/Ask scan parks draft; apply; publish separate
  DF-A2 Discard draft after prior publish
  DF-A3 Rubric/mixed does not become weights
  DF-S1 Student single-class how-grades + why average
  DF-S2 Student All classes no mashed weighted hero
  DF-P1 Parent Home averages per class for child A
  DF-P2 Switch to child B clears A (F-06) — twins if fixture
  DF-P3 EXPECT FAIL: parent full grades book P-G1 (confirm P1 defect)
  DF-O1 Office admin class: no syllabus editor / write denied
  DF-X1 Dual-hat teacher seat edit taught; parent seat no scan on non-taught
- PARENT-BOOK-01 explicit repro for missing P-G*
- STUDENT-DETAIL-01 explicit repro for S-G4
- REGRESSION: publish_lesson_pack unchanged; create_class still office-only; Diary hamburger untouched; tray tabs no Syllabus key

EVIDENCE: automated (syllabusAverage.test.ts C-01…C-18, classSyllabus.security.test.ts, askToolPolicy, altitude) AND scripted UI + JWT/role fixtures where RLS. Each P0 law → evidence path. Open P0/P1 misses → DEFECT [sev] cards parented to AVG feature / this stamp lineage. Re-prove parent book after eng lands.

CONSTRAINTS: No eng implement on QE card; no git ship; no devops-release; do not complete parent AVG epic from QE alone; do not treat unit greens alone as family/FERPA proof; no kelyra-qa-loop.

RECOMMENDED NEXT ACTION after QE plan+execute: QA Supervisor release evidence only when open P0/P1 FIX-NOW closed or in-flight with evidence; then CoS may staff devops-release. Eng for parent book P1 only after dual DESIGN STAMP (this card + PM disposition) + ARM.
```

---

## 8. Process / handoff

| Field | Value |
|---|---|
| **QA Supervisor stamp** | **APPROVED** 2026-09-10 · `t_7bc1c837` / qa-supervisor |
| **PM stamp** | **APPROVED** (pre-IQG pack P1–P4/A1/S1/Q1) · 2026-09-02 · product-manager tickets listed in DESIGN STAMP |
| **DESIGN STAMP (both)** | **Dual-APPROVED** for intent completeness — **not** product-complete |
| **Intent gaps remaining** | **none** (realization defects named in §5.1 for CoS) |
| **Engineering** | No new design scope. FIX-NOW candidates after PM disposition: parent full grades book P1. P2 Home/S-G4 SCHEDULE unless PM elevates. P3 teacher overall DEFER OK. |
| **QA Engineer** | CoS staffs from §7 OBJECTIVE — plan + execute live prove-out |
| **PM disposition** | **DONE** 2026-09-10 · t_02265312 · notes/company/avg-iqg-defect-disposition.md — P1 parent book FIX-NOW; P2 Home + S-G4 SCHEDULE; P3 teacher overall DEFER |
| **Parent epic** | AVG feature / GATE lineage sticky — do not complete from this card |
| **devops-release** | **Blocked** until QE prove-out + open P0/P1 clear + QA Sup release evidence |
| **RESULT** | Retro intent stamped APPROVED. Honest v1 cut documented. Prove-out OBJECTIVE ready. Defect titles listed; no eng. |

### RECOMMENDED NEXT ACTION (CoS)

1. **Staff `qa-engineer`** from §7 prove-out OBJECTIVE (child of AVG feature / this stamp). ARM as needed.
2. **File DEFECT cards** from §5.1 if not already on board; staff PM disposition automatically.
3. **FIX-NOW eng** only after dual stamp (met for intent) + PM disposition + ARM — start with parent P-G* if PM says FIX-NOW.
4. Do **not** fail v1 for year-composite / Office templates / Syllabus tab icon.
5. Do **not** complete AVG epic until prove-out + P0/P1 clear + release evidence.
6. No devops-release until QA Supervisor release stamp.

---

*End AVG IQG intent — class syllabus + category-weighted averages · DESIGN STAMP QA Supervisor APPROVED 2026-09-10 (`t_7bc1c837`). Dual stamp met for intent; product-complete = prove-out + open P1 closed or in flight.*

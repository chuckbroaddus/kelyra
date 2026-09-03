# AVG-Q1: Higher-layer acceptance plan (plan only)

**Date:** 2026-09-02  
**Author:** qa-supervisor  
**Ticket:** t_8f7c0d1a  
**Status:** **PLAN ONLY** — not a Build send, not a release cert, not kelyra-qa-loop.  
**Gate:** Implementation remains forbidden until AVG-GATE `t_eea9ba55` has **written CEO yes**. Developers will not self-certify.

**Depends on (read-only pack):**

| Artifact | Ticket | Role in this plan |
|---|---|---|
| `notes/company/avg-spec-syllabus-ia.md` | t_92ce6080 (P1) | Calc model, rules catalog, product laws |
| `notes/company/avg-spec-ask-photo-import.md` | t_38496169 (P2) | Ask/photo propose → confirm gates |
| `notes/company/avg-spec-teacher-ui.md` | t_0267cdbc (P3) | Teacher screens T-S0–T-S9 / T-A1 |
| `notes/company/avg-spec-family-view.md` | t_40d56ca6 (P4) | Family views S-*/P-* + visibility matrix |
| `notes/company/avg-spec-architecture.md` | t_cb0b3bcc (A1) | Schema/RLS/RPC/engine decisions |
| `notes/company/avg-spec-security-ferpa.md` | t_60338b4e (S1) | P0/P1 must-fix + FERPA cases |

**Non-goals of this ticket**

- No app code, migrations, Edge, Ask tool registration, or SQL apply.  
- No `kelyra-qa-loop` / `author-qa-loop`.  
- No release sign-off.  
- No inventing weights, quiz→include shortcuts, or Canvas-style not-due zeros.

---

## 1. What “done” means later (after CEO go)

When Chuck authorizes implementation, a **future** build loop is accepted only if:

1. Every **P0** row in this matrix has **evidence** (automated test path, RPC fixture, or scripted UI check with artifact).  
2. Every **S1-01…S1-13** security must-fix is covered (see §7).  
3. Explicit **non-acceptance** items (§8) are regression-guarded.  
4. CoS does **not** treat green unit tests alone as product release; family + altitude + FERPA cases still need named evidence.  
5. Developers do **not** self-certify the epic — gate card + this plan + loop evidence.

Until then: this file is the contract for that future loop.

---

## 2. Product laws (always fail closed)

These are acceptance **axioms**. A single counterexample fails the epic.

| ID | Law | Source |
|---|---|---|
| L1 | Nothing is a **grade** until teacher **Approves** (`approved_score` / graded publication). | MVP + P1/P4 |
| L2 | Nothing is **class policy** until teacher **Confirms/Publishes** (manual or Ask-edited payload). Ask never auto-publishes. | P1 §7, P2 |
| L3 | `include_in_average` = counts in **type** average — **not** “slice of the final.” No quiz/test → include shortcut. | P1, A1 |
| L4 | When syllabus **published**, final = category type avgs × weights. Assignment `weight_percent` / `weight_band` are **not** the final engine. | P1, A1 |
| L5 | **Not-yet-due work is never a grade and never a zero** (Canvas trap). Missing (due) is zero **only if** `missing_as_zero=true` (default **false**). | P1 §4.2, A1 risk #10, P3 danger copy, P4 |
| L6 | Family sees published + `publish_to_family` policy and **own/child post-Approve** cells only. No drafts, no classmates, no sibling blend. | P4, S1 |
| L7 | Syllabus **writes** = taught-class teacher via `class_teacher_of` + `syllabus.manage`. Office **none** in v1. Not `assignments.manage`. | A1, S1-01 |
| L8 | Family **never** `SELECT`s `class_syllabi` base rows (`ask_draft` / `source_asset_id` leak). RPC/view DTO only. | A1 §5.4, S1-04 |
| L9 | Author `publish_lesson_pack` / `kind=lesson` path **unchanged**; lesson assign `include_in_average` stays fail-closed false unless teacher opts in. | A1 §1 |
| L10 | Model keys server-side only. No `EXPO_PUBLIC_*` vendor tokens. | AGENTS + S1-06 |

### 2.1 Explicit: Canvas zeros on not-yet-due work are not grades

| Case | Counts in type average? | Family label | Engine |
|---|---|---|---|
| `due_at` in future, no approved score | **No** | **Not due yet** | Never inject 0 |
| Due, no submission, not excused, `missing_as_zero=false` (default) | **No** | **Missing** | Omit cell |
| Due, no submission, `missing_as_zero=true` | **Yes as 0** | **Missing** (counts as zero copy) | Inject 0 only for **due** rows |
| Excused | **No** | **Excused** | Exclude |
| Draft / AI / unapproved | **No** | Status only, no score | Never |

**Acceptance evidence required later:** golden unit fixtures **and** family UI/API cases that prove a future-dated assignment does **not** pull the overall % down, even when `missing_as_zero=true`.

---

## 3. Scope of v1 under test (vs later)

### 3.1 In scope (must prove)

- Teacher Class-desk syllabus editor (T-S0…T-S9, T-A1) — not Office.  
- Draft → validate → publish/unpublish; live weight edit with confirm.  
- Ask/photo propose → review → apply/discard → publish; rubric ≠ weights.  
- Pure TS average engine: weights, drop lowest, makeup+cap, floor, rounding final-only, empty-category omit+renormalize, Pass/Fail exclude, unpublished fallback.  
- Student Grades + parent Home/grades read path + why-average.  
- Altitude walls + FERPA serializers + photo retention defaults.  
- M1–M3 sequencing per A1; M4 Ask tools if in same authorized loop.

### 3.2 Out of scope (do not fail v1 for missing)

- Multi-term year composite, total-points mode, standards/Power Law, SIS sync, what-if, cross-class GPA.  
- Office school-wide syllabus templates.  
- Co-teacher UI beyond `class_teachers` row semantics Architect already locked.  
- DPA / school-official legal claim; face redaction; keep-original photo opt-in.  
- New `IconName` / Syllabus tab icon (interim Setup card + gradebook banner OK).

---

## 4. Test matrix

**Legend**

| Sev | Meaning |
|---|---|
| **P0** | Blocks CEO-authorized ship / loop pass |
| **P1** | Must fix before family-facing release |
| **P2** | Track; may defer with CoS note |

| Type | How to evidence later |
|---|---|
| **U** | Unit (pure TS / policy map) |
| **I** | Integration / RPC / RLS with fixtures |
| **UI** | Scripted or dogfood UI on class desk / family |
| **S** | Security static + seat JWT matrix |
| **R** | Regression vs frozen surfaces (`publish_lesson_pack`, lesson include default) |

### 4.1 Teacher setup (P3 screens)

| ID | Sev | Type | Screen / area | Scenario | Expected |
|---|---|---|---|---|---|
| T-01 | P0 | UI | T-S0/T-S9 | Setup card empty class | “How this class grades” + Set up; no invented weights |
| T-02 | P0 | UI | T-S8 | Gradebook, no published syllabus | Banner: weights not set; averages won’t use category weights |
| T-03 | P0 | UI/I | T-S1–T-S2 | Manual categories HW 10 / Quiz 20 / Test 40 / Project 30 | Sum bar 100%; Save draft OK |
| T-04 | P0 | UI/I | T-S2/T-S7 | Sum 85% | Publish disabled; remainder helper available; no auto-normalize silent publish |
| T-05 | P0 | UI/I | T-S7 | Publish at sum 100 ± 0.01 | `status=published`; `published_at` set; families gate follows toggle |
| T-06 | P0 | UI | T-S4 | `missing_as_zero` default | Off; enabling requires ConfirmSheet danger copy mentioning **not-due still does not count** |
| T-07 | P1 | UI | T-S3 | Term structure | Required before publish; mute note: no year composite in v1 |
| T-08 | P0 | UI | T-S5 | Drop lowest + makeup cap 85 | Rules saved on category; plain CEO example copy |
| T-09 | P0 | UI/I | T-S7 | Unpublish | Weights stop driving family “how grades work”; approved scores unchanged |
| T-10 | P0 | UI | Office | `/admin/*` class card | **No** Syllabus editor / no policy write |
| T-11 | P0 | UI | Settings | Teacher hamburger Settings | **No** syllabus editor |
| T-12 | P0 | UI/I | T-A1 | Assign form when published | Category chips = syllabus labels; helper “counts toward {Type} average ({w}%)”; default include from category default (**false** seeds) |
| T-13 | P0 | UI/I | T-A1 | Assign form when unpublished | GradeKind fallback; banner to syllabus; no silent final weights |
| T-14 | P1 | UI | T-S1 | Live edit published weights | Confirm that family averages recalculate; scores unchanged |
| T-15 | P1 | UI | T-S2 | Add category from seeds | `default_include_in_average=false` for all seeds including quiz/test |
| T-16 | P2 | UI | Icon | No new IconName required | Setup card + banner entry acceptable |

### 4.2 Ask import confirm (P2 + T-S6)

| ID | Sev | Type | Area | Scenario | Expected |
|---|---|---|---|---|---|
| A-01 | P0 | I/S | Parse | `parse-class-syllabus` | Side-effect free re: publish; parks draft only |
| A-02 | P0 | UI/I | T-S6 | Draft present | Review sheet; low confidence unchecked; never auto-publish |
| A-03 | P0 | UI/I | Confirm | Apply checked → editor | Status stays draft until Publish |
| A-04 | P0 | UI/I | Discard | Discard draft after prior publish | `ask_draft` cleared; **published** intact; source photo deleted |
| A-05 | P0 | U/I | Rubric photo | `document_kind=rubric` / mixed | Criteria **not** written as `weight_percent`; banner warns |
| A-06 | P0 | U/I | Hard fail | Unreadable photo | Empty draft + error; **no** silent 40/60 defaults |
| A-07 | P0 | S | Seat | Student/parent/office JWT | Scan/confirm/discard denied |
| A-08 | P0 | S | IDOR | Teacher A + class B `class_id` | 403 before vendor fetch |
| A-09 | P0 | S | Confirm payload | Raw model JSON confirm | Rejected; edited teacher payload only (UI RPC primary) |
| A-10 | P1 | U | Defaults in draft | Server/force | `missing_as_zero=false`, `default_include_in_average=false`, no quiz shortcut |
| A-11 | P1 | I | Re-scan | Second photo | Replaces `ask_draft` only until confirm |
| A-12 | P0 | S | Photo retention | Confirm default | Source object deleted; family never gets signed URL |
| A-13 | P1 | U | Fixtures | Clean weights; mixed; rubric-only; sum≠100; makeup text | Extract maps match P2 JSON schema_version 1 |

### 4.3 Average engine (P1 §4 + A1 golden)

Module (future): `src/lib/grade/syllabusAverage.ts` + `syllabusAverage.test.ts`.

| ID | Sev | Type | Fixture | Expected |
|---|---|---|---|---|
| C-01 | P0 | U | Simple weights HW10/Q20/T40/P30; all categories have scores | Weighted sum correct |
| C-02 | P0 | U | `drop_lowest_n=1` on tests | Lowest eligible non-makeup dropped before mean |
| C-03 | P0 | U | Makeup replace + `cap_percent=85` | Makeup capped; replaces lowest; vehicle not double-counted |
| C-04 | P0 | U | Pass/Fail column in category | Excluded from numeric type avg |
| C-05 | P0 | U | Empty category (no eligible cells) | **Omit + renormalize**; disclosure flag for UI |
| C-06 | P0 | U | Unpublished / no syllabus | **No invented weights**; no silent 40/60 |
| C-07 | P0 | U | **Not due yet** + `missing_as_zero=true` | **Still not zero**; overall unchanged by that row |
| C-08 | P0 | U | Due missing + `missing_as_zero=false` | Omitted (not zero) |
| C-09 | P0 | U | Due missing + `missing_as_zero=true` | Counts as 0 in type avg |
| C-10 | P0 | U | `include_in_average=false` | Visible conceptually excluded from type avg |
| C-11 | P0 | U | Unapproved / draft_score only | Never enters engine |
| C-12 | P0 | U | Rounding `nearest_whole` | Applied **final only**; type avgs not round-then-weight |
| C-13 | P1 | U | `min_floor_percent` | Applied after weighted sum when set |
| C-14 | P0 | U | Published syllabus ignores assignment `weight_percent` | Category weights only |
| C-15 | P1 | U | Orphan `assignments.category` not in published keys | Uncategorized; excluded from type avgs |
| C-16 | P1 | U | `is_makeup=false` everywhere, rule enabled | No-op replace (no title regex) |
| C-17 | P1 | U | Year term filter | `GRADE_TERM_ROLLUP` membership only — **not** multi-term composite weights |
| C-18 | P0 | U | `approved_score` outside 0–100 legacy | Treat non-numeric / omit (A1) |

### 4.4 Student / parent visibility (P4)

| ID | Sev | Type | View | Scenario | Expected |
|---|---|---|---|---|---|
| F-01 | P0 | I/UI | S-G1/P-G1 | Unpublished syllabus | Assignment list + approved marks; **no** invented weights; banner |
| F-02 | P0 | I/UI | S-G1/P-G1 | `published` + `publish_to_family=false` | Same as unpublished for family; no weight list / no weighted hero |
| F-03 | P0 | I/UI | S-G2/P-G2 | Published + family on | Categories + % + plain enabled rules only |
| F-04 | P0 | I/UI | S-G3/P-G3 | Why average | Own contributions; drop/replace prose; renormalize disclosure when applied |
| F-05 | P0 | I/UI | P-M1 | Missing vs not due | Two groups; not-due never labeled Missing-as-zero |
| F-06 | P0 | I | Sibling | Parent child A selected; request child B id | Fail closed empty/403; no blend |
| F-07 | P0 | I/UI | Payload | Family gradebook/why | **No** `draft_score`, `model_draft`, `ask_draft`, `source_asset`, classmates |
| F-08 | P0 | UI | P-H2 | Home class cards | Average only when publishable; Missing:N for due missing only |
| F-09 | P0 | UI | S-G1 All | All classes | No blended multi-class GPA |
| F-10 | P1 | UI | Language | Family copy | Prefer “Categories”, “Not due yet”, “Approved”; avoid JSON/Grok/AI score |
| F-11 | P0 | I | Unpublish mid-session | Next load | Weights + weighted avg hidden |
| F-12 | P1 | UI | S-A1/P-A1 Ask | Family Ask | Read-only explain tools; no scan/confirm |
| F-13 | P1 | UI | S-G4/P-G4 | Detail | Counts / doesn’t count; dropped/replaced labels; no draft fields |
| F-14 | P2 | UI | What-if | — | Absent in v1 (do not ship) |

### 4.5 Altitude & privilege (A1 + P3)

| ID | Sev | Type | Actor | Action | Expected |
|---|---|---|---|---|---|
| AL-01 | P0 | I/S | Class teacher | CRUD syllabus | Allowed via `class_teacher_of` |
| AL-02 | P0 | I/S | Office admin JWT | INSERT/UPDATE syllabus | **Denied** (not `teaches_class` shortcut) |
| AL-03 | P0 | I/S | Other teacher | Other class | Denied |
| AL-04 | P0 | I/S | Student | Confirm/publish/scan | Denied |
| AL-05 | P0 | I/S | Parent | Same | Denied |
| AL-06 | P0 | S | Dual-hat teacher-parent | Parent hat on child’s other class | No draft read; no scan on non-taught class |
| AL-07 | P0 | S | Teacher `also_administrator` | `create_class` / office syllabus | Still cannot create class; still no office-wide syllabus |
| AL-08 | P0 | R | Author | `publish_lesson_pack` | Diff empty re: syllabus fields |
| AL-09 | P0 | R | Lesson assign | New lesson column | `include_in_average` default **false** unless category default + teacher opt-in |
| AL-10 | P1 | I | Co-teacher with `class_teachers` row | CRUD | Allowed per A1; without row denied |
| AL-11 | P0 | S | Capability map | Ask tools | `syllabus.manage` teacher own; office/parent/student **none**; **not** `assignments.manage` |
| AL-12 | P0 | S | Client/Edge twins | Policy maps | Identical; unknown tools denied |

### 4.6 FERPA / security cases (S1)

Map 1:1 to S1 must-fix; future loop fails if any P0 missing.

| ID | Sev | Type | Case | Evidence |
|---|---|---|---|---|
| SEC-01 | P0 | S | S1-01 new capability | Student offered scan under old `assignments.manage` → **must not** happen |
| SEC-02 | P0 | S | S1-02 no class/student insert | Parse/confirm never calls create_class / enroll |
| SEC-03 | P0 | S/I | S1-03 vision never publishes | Parse code path no UPDATE status=published |
| SEC-04 | P0 | I | S1-04 family RPC not table SELECT | Grants/policies: no student/parent table priv on `class_syllabi` |
| SEC-05 | P0 | I | S1-05 strip drafts + sibling | Network fixtures on family RPCs |
| SEC-06 | P0 | S | S1-06 teaches_class/class_teacher_of before vendor; SSRF allowlist; JWT; no EXPO_PUBLIC | Edge + ai:dev |
| SEC-07 | P0 | I | S1-07 photo delete discard/confirm; 30d idle; no data-URL in ask_messages | Storage + purge |
| SEC-08 | P0 | U | S1-08 no roster/IEP in prompt; grade-list photo → no name/score categories | Prompt + fixture |
| SEC-09 | P0 | S | S1-09 no directory dump stack | SQL review of new RPCs |
| SEC-10 | P1 | S | S1-10 dual-hat isolation | RLS matrix |
| SEC-11 | P1 | S | S1-11 confirm RPC hygiene | search_path, revoke anon, lock |
| SEC-12 | P1 | S | S1-12 family Ask read-only | Policy tests |
| SEC-13 | P1 | I/UI | S1-13 unpublish / publish_to_family=false hides | API + UI |

**S1 §8 checklist (normative copy for future loop):**

1. Student JWT: scan/confirm denied; empty unpublished family syllabus; no `ask_draft`.  
2. Parent JWT: child A cannot fetch child B.  
3. Teacher A cannot parse class B.  
4. Office cannot scan/confirm.  
5. also_administrator still no create_class / office-publish syllabus.  
6. Attacker class_id + non-teacher JWT → no vendor mock call.  
7. Evil image URL rejected.  
8. Confirm raw model JSON rejected.  
9. Discard leaves published; source gone.  
10. Family payload fixture clean.  
11. `publish_to_family=false` hides weights/avg.  
12. Grade-list photo → no student names in categories.

---

## 5. Cross-cutting regression risks

| Risk | Why it bites | Guard |
|---|---|---|
| Canvas not-due zeros | SIS/import habits + `missing_as_zero` confusion | C-07, T-06, F-05, L5 |
| quiz→include shortcut | Old mental model / Author convenience | T-15, AL-09, L3, §8 |
| Silent 40/60 defaults | Parse fail or empty publish | A-06, C-06, §8 |
| Rubric → weights | Photo mixed pages | A-05, §8 |
| `teaches_class` office write | Live helper includes admin | AL-02, SEC-01 |
| `ask_draft` column leak | RLS is row-level | SEC-04, F-07 |
| Extending `student_gradebook` as-is | Draft answers stay on row | F-07, S1-05 — **new family RPCs only** |
| Mid-term weight edit surprise | Always-live averages | T-14 confirm copy |
| Year composite accidental | `terms[].weight_percent` stored | C-17, T-07 mute note |
| `publish_lesson_pack` creep | Author packaging | AL-08 |
| Family cache after unpublish | Stale weights | F-11 |
| Double-count makeup | Replace vehicle in mean | C-03 |

---

## 6. Process adequacy (how a future loop must run)

### 6.1 Not this ticket

- Do **not** staff implementer/QA/verify children from Q1.  
- Do **not** call `kelyra-qa-loop` until `t_eea9ba55` = CEO **yes**.  
- Do **not** self-certify on green typecheck alone.

### 6.2 After CEO yes (recommended loop shape)

| Phase | Owner pattern | Must produce |
|---|---|---|
| M1–M2 schema/RLS | Build via kelyra-qa-loop | Migrations + RPC grants; `class_teacher_of`; no Ask tools yet |
| Engine + teacher UI + assign bind | Same or follow-on loop | C-* unit file; T-* evidence; AL-08/09 |
| Family RPCs + UI | Same | F-* + SEC-04/05 fixtures |
| M4 Ask/photo (optional same authorization) | Separate if needed | A-* + SEC-01/03/06/07/08 |
| Security pass | Loop security stage + this matrix | S1-01…13 checked off with paths |
| CoS release read | chief-of-staff | Compares evidence to this plan; no silent scope add |

### 6.3 Evidence package (minimum for CoS)

1. List of automated tests mapped to matrix IDs (C-*, SEC-*, AL-*).  
2. RPC fixture dumps (redacted) for family happy + sibling fail.  
3. Statement: `publish_lesson_pack` unchanged.  
4. Statement: not-due never zero (cite C-07 + UI).  
5. Open P1/P2 waivers explicitly named — none silent.

### 6.4 Recurring defect watch (post-ship)

If defects recur, file against these buckets first:

1. Missing/not-due policy drift  
2. Include-in-average semantics / Author defaults  
3. Family over-read / draft leak  
4. Office altitude bypass  
5. Ask auto-write / capability mis-map  

---

## 7. Traceability (spec → matrix)

| Spec requirement | Matrix IDs |
|---|---|
| Teacher setup / Class desk only | T-01…T-16, AL-02, AL-11 |
| Ask import confirm | A-01…A-13 |
| Student/parent visibility | F-01…F-14 |
| Altitude | AL-01…AL-12, T-10/T-11 |
| FERPA cases | SEC-01…SEC-13, F-06/F-07 |
| Canvas not-due ≠ grade | L5, C-07, C-08, C-09, T-06, F-05 |
| Engine fixtures P1 §9.1 / A1 §9 | C-01…C-18 |
| S1 §6 must-fix | SEC-* |
| S1 §8 tests | §4.6 checklist |

---

## 8. Explicit non-acceptance (instant fail)

Any of the following in a candidate build = **fail**, regardless of other greens:

1. Shipping gradebook behavior as “quiz/test → `include_in_average=true`” without syllabus weights.  
2. Silent district/default weights (including parse failure → 40/60).  
3. Rubric criteria stored or shown as category weights.  
4. Auto-zero **missing** without published policy + teacher-facing confirm.  
5. Auto-zero or grading of **not-yet-due** work (Canvas-style).  
6. Ask/vision auto-publish or confirm of raw model JSON.  
7. Family visibility of `ask_draft`, source photos, draft_score, classmates, or sibling blend.  
8. Office-wide syllabus parse/publish in v1.  
9. Syllabus write tools hung on `assignments.manage`.  
10. `EXPO_PUBLIC_*` model keys.  
11. Changes to `publish_lesson_pack` that emit syllabus/weights.  
12. Implementation started without CEO written go on `t_eea9ba55`.

---

## 9. Gate status

| Item | Status |
|---|---|
| Spec pack artifacts on disk | Yes (P1–P4, A1, S1 + research) |
| This acceptance plan | **Yes — this file** |
| Implementation authorized | **NO** |
| kelyra-qa-loop for AVG | **Forbidden** until gate |
| Self-certify by developers | **Forbidden** |

---

## 10. Decisions (this ticket)

1. Acceptance is a **matrix + laws + non-acceptance list**, not a narrative “looks good.”  
2. **Not-due never zero** is a P0 engine **and** family **and** teacher-copy requirement.  
3. Security S1 §8 is incorporated by reference as mandatory future loop cases.  
4. Architect golden engine tests are the calc backbone; UI without C-* is incomplete.  
5. Plan only — no code, no loop, no SQL.

---

## 11. Sources

- P1 IA calc + ACs §9  
- P2 Ask confirm gates + fixtures  
- P3 screen inventory T-S0–T-S9 / T-A1  
- P4 view inventory + visibility matrix  
- A1 schema/RLS/engine/risks; implementation_loop_ready = NO  
- S1 FERPA must-fix S1-01…S1-13 and §8 tests  
- CEO/product laws: Approve gate; class teacher altitude; AVG HOLD  

---

**RECOMMENDED NEXT ACTION:** Block on CoS/CEO gate `t_eea9ba55`. Do not implement. Do not run kelyra-qa-loop. CoS verifies prerequisite `notes/company/avg-*.md` pack (including this file) and briefs Chuck for written go/no-go.

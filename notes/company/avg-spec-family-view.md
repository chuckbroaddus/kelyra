# AVG-P4: Parent / Student Syllabus + “Why This Average” View

**Date:** 2026-09-02  
**Author:** product-manager  
**Ticket:** t_40d56ca6  
**Status:** Spec only — no app code, no migrations, no kelyra-qa-loop.  
**Depends on:**  
- `notes/company/avg-research-family-grade-transparency.md` (AVG-R3)  
- `notes/company/avg-spec-syllabus-ia.md` (AVG-P1)  
- Live chrome: `docs/ui-design.md` (student Grades, parent Home), `docs/data-model.md` (Approve gate, parent_students)  
- CEO model: nothing is a grade until teacher **Approves**; parents see **linked children only**; do not mix siblings  

**Non-goals of this ticket:** Teacher UI (P3), Ask/photo import (P2), Architect SQL, implementation, security write-up (S1 owns FERPA review after this artifact).

---

## 1. Product intent

Parents and students must understand **how this class grades** and **why this child’s current average looks the way it does**, without ever seeing:

- unapproved AI / draft scores  
- other students  
- teacher draft syllabus or rule **editors**  
- another sibling’s data on the same screen  

Transparency target (from R3): Canvas / PowerSchool strengths — **category names + % weights**, category averages, assignment list with status, plain “how we got here.” Skyward-style **missing work** clarity. Not Google Classroom guardian digests (no grades).

This is a **read-only family surface** over the published class syllabus + post-Approve cells. It does not replace the teacher grade book and is not the official SIS of record.

---

## 2. Roles and scoping (hard rules)

| Actor | Scope | Auth surface today | AVG family scope |
|---|---|---|---|
| **Student** | Own enrollment only | Join session / student login; `/todo`, `/student/*` | Own classes; own cells only |
| **Parent** | `parent_students` links only | Invite token historically; signed-in parent → `/parent` via `parent_open_mine` | One **active child** at a time; that child’s enrolled classes only |
| **Teacher** | Taught class | Grade book / setup | Out of this spec (P3) |
| **Office** | School people | Directory | No family gradebook in v1 |

### 2.1 Sibling isolation

1. Parent Home keeps the existing multi-child **AvatarTray / context chips** (ui-design §3.6 Parent Home).  
2. Selecting child A loads **only** A’s progress + grades. Never a combined average across siblings. Never a side-by-side score table for two kids on one card.  
3. Switching child is an explicit focus change; prior child’s scores leave the DOM/state for that view (no stale sibling cells).  
4. Class chips for a parent are **that child’s enrolled classes**, not the parent’s full school directory.

### 2.2 Publication gate (unchanged product law)

| State | Family-visible as a grade / average input? |
|---|---|
| Capture / submission draft, AI `draft_score`, `model_draft` | **Never** |
| Submission assigned / started / completed (no approved mark) | Status only — **not** a score |
| Teacher **Approves** → `approved_score` / graded cell | **Yes** |
| `include_in_average = false` | Visible as work; **excluded** from type average |
| Not due yet | Listed as upcoming; **not** counted; **not** zeroed |
| Due + missing | Status “Missing”; counts as zero **only if** published policy `missing_as_zero=true` (P1 default **false**) |
| Excused | Excluded; label “Excused” |
| Pass/Fail | Status label only; **never** in numeric average (P1) |

---

## 3. View inventory

Views below are **product destinations**. Routes reuse live chrome where possible; new paths are proposals for implementation (gated). No chrome redesign beyond what AVG needs.

### 3.1 Student

| ID | Name | Placement | Primary job | Entry |
|---|---|---|---|---|
| **S-G1** | **My grades (class book)** | Student **Grades** tab — live `/student/grades` + class pane Grades on `/student/class` | One-student grade book: assignments under this class (All · per class). Status until graded, then mark | Tray / student class pane **Grades** (ui-design: Student Grades wordmark `Grades`) |
| **S-G2** | **How this class grades (syllabus)** | Section **above or pinned under** the class filter on S-G1 when a **single class** is selected; hidden or collapsed summary on **All** | Read-only categories + weights + plain policy summary for that class | Auto on S-G1 when `classId ≠ all` and syllabus `published` + `publish_to_family` |
| **S-G3** | **Why this average** | Expandable panel / sheet from the **overall %** (and each **category %**) on S-G1 | Explain running average in plain English + which scores counted / dropped | Tap overall or category average |
| **S-G4** | **Assignment detail (own)** | Push from a graded/missing row | Score (if graded), points if shown, due date, teacher comment if any, counts-toward label | Row tap on S-G1 |
| **S-H1** | **Home / Assignments** | Live `/todo` (To-do · Done) | Work to do — **not** the syllabus home | Unchanged; optional one-line “Current average” deep-link to S-G1 for active class **only if** average exists post-Approve |
| **S-A1** | **Ask (student)** | `/ask` | Explain published syllabus / own average in words | Read tools only; **no** syllabus write (P1 §7.3) |

**Student does not get:** teacher grade book grid of classmates, CSV, weight editors, draft syllabus, what-if calculator in v1 (later optional).

### 3.2 Parent

| ID | Name | Placement | Primary job | Entry |
|---|---|---|---|---|
| **P-H1** | **Parent Home (progress)** | Live `/parent` | Active child: focus skill, practice/lesson status, teacher one-liner — **unchanged core** | Parent tray Home |
| **P-H2** | **Child class list + current average** | New block on P-H1 under the child card (per active child) | For each of the child’s classes: class name, optional overall % (if publishable), “How grades work” link | Scroll on Home |
| **P-G1** | **Child grades (class)** | Pushed screen from P-H2 or hamburger **Grades** for active child | Same information architecture as S-G1 but scoped to **active child** + selected class | “Grades” / class row |
| **P-G2** | **How this class grades** | Same pattern as S-G2 on P-G1 | Syllabus weights for that class | On P-G1 single-class |
| **P-G3** | **Why this average** | Same as S-G3 for the child | Plain-English explanation | Tap average |
| **P-G4** | **Assignment detail (child)** | Same as S-G4 | Child’s cell only | Row tap |
| **P-M1** | **Missing / upcoming strip** | Top of P-G1 and compact on P-H2 | Actionable: missing (due) vs not due yet | Always when data exists |
| **P-A1** | **Ask (parent)** | `/ask` | Explain child’s published grades/syllabus | Read-only tools; child-scoped |

**Parent does not get:** sibling merge, other families, teacher notes internal flags, AI drafts, rule editors, full roster heatmaps.

### 3.3 Shared component map (implementation hint — not code)

| Component concept | Used by | Notes |
|---|---|---|
| `FamilySyllabusSummary` | S-G2, P-G2 | Categories, weights, term label, short policy bullets |
| `FamilyGradeBook` | S-G1, P-G1 | Extends live `StudentGradeBook` ideas: one person column; add category headers + running % |
| `WhyAverageSheet` | S-G3, P-G3 | Formula narrative + contribution list |
| `FamilyAssignmentDetail` | S-G4, P-G4 | Own/child cell only |
| `MissingUpcomingList` | P-M1, optional student | Split Missing vs Not due |

### 3.4 When syllabus is missing or draft

| Syllabus state | Family UI |
|---|---|
| No row / not published | S-G1 / P-G1 show assignment list + approved marks only. **No invented weights.** Banner: “Your teacher has not published how categories count yet.” Hide overall weighted %. Optional unweighted mean **only if** product later chooses — P1 recommends hide weighted final |
| `published` but `publish_to_family=false` | Same as unpublished for family; teacher still uses weights internally |
| `published` + `publish_to_family=true` | Full S-G2/P-G2 + weighted averages per P1 engine |

---

## 4. Information architecture by screen

### 4.1 How this class grades (S-G2 / P-G2)

**Header:** `{Class name} · How grades work`  
**Audience line (parent):** `Showing {Child first name}`  

**Blocks (top → bottom):**

1. **Marking period** — active/filter term label (`Quarter 1`, etc.) matching teacher term chips; family can switch term the same way student grades filter works (read-only list of terms that have columns).  
2. **Categories** — one row per **active** category with `weight_percent > 0`:  
   - Label (teacher `label`, e.g. “Unit tests”)  
   - Weight: `40% of the class grade`  
   - This student’s **category average** (if ≥1 eligible approved cell; else `—` + “No graded work in this category yet”)  
3. **Special rules (plain English, not JSON):** only **enabled** published rules, e.g.  
   - “Drops the lowest 1 test score.”  
   - “A makeup can replace the lowest test, at most 85%.”  
   - “Missing work counts as zero.” / “Missing work does not count until the teacher enters a score.”  
   - “Scores round to the nearest whole number.”  
   - Floor: “No score below 50% after rules” only if set.  
4. **What does not count** — short note: practice marked “does not count toward the average,” Pass/Fail, excused, not-due.  
5. **Footer:** “Only scores your teacher has approved appear here.” No “Grok,” no model attribution.

**Do not show:** weight editor, drag handles, Ask draft confidence, `ask_draft`, inactive categories (unless they still have historical graded cells — then show as “no longer used for new work” only if needed; v1 may simply omit inactive with zero history).

### 4.2 My / child grades book (S-G1 / P-G1)

**Context chips:** All · Class A · Class B (student live pattern). Parent: same, filtered to child enrollments; optional leading **child** chip row if multi-child (parent Home already switches child before push).

**When one class selected:**

1. Optional compact **overall average** hero:  
   - `Current average · 87%`  
   - Sub: `Based on approved work in {term}`  
   - Link/button: **Why this average?** → S-G3/P-G3  
2. **S-G2/P-G2** collapsed by default after first visit; expand “How grades work.”  
3. **Missing / upcoming** (P-M1; student optional): two groups.  
4. **By category** sections (preferred v1) or flat list with category subheads:  
   - Each assignment row: title, due date, status badge, score if graded, glyph if counts toward average.  
5. **Does not count** subsection or muted rows for `include_in_average=false`.

**When All classes selected:**

- Stack per-class cards: class name + overall % (if any) + open class.  
- No single blended GPA across classes in v1.  
- Syllabus summary only inside a class, not on All.

**Status badges (family language):**

| Internal | Family label |
|---|---|
| not due | **Not due yet** |
| due, no work, not excused | **Missing** |
| assigned / started | **Assigned** / **In progress** |
| completed, awaiting teacher | **Turned in** (no score) |
| graded + approved score | **Graded** + mark |
| excused | **Excused** |
| late (if teacher marked) | **Late** (score still only if approved) |

### 4.3 Why this average (S-G3 / P-G3)

**Purpose:** Answer “why is it 87%?” without exposing engine internals or other kids.

**Overall sheet structure:**

1. **Headline:** `Current average: 87%`  
2. **One-sentence method:**  
   `Each category is averaged, then combined using the class weights.`  
3. **Contribution table** (one row per category with data or weight):  

   | Category | Weight | Category avg | About this much of the total* |  
   | Homework | 10% | 92% | ~9 pts |  
   | Tests | 40% | 85% | ~34 pts |  

   \*v1 copy may say “contribution” as `weight × category avg` in points-of-100; if empty categories are **omitted and weights renormalized** (P1 recommendation), show disclosure:  
   `Categories with no graded work yet are left out and the other weights are scaled so they still add to 100%.`

4. **Counted scores** — list of assignments that entered the math (name, score, category).  
5. **Adjusted by rules** — if drop/replace applied:  
   `Lowest test (62%) was dropped.`  
   `Makeup (90%) replaced Unit 2 test, capped at 85%.`  
6. **Not counted** — missing (policy), not due, excluded columns, Pass/Fail, unapproved.  
7. **CTA:** “See all work” dismisses to book; no edit.

**Category-level Why:** same sheet filtered to one category (type average only; show drop/replace inside that type).

**Empty state:** `No approved scores yet — there isn’t an average to explain.`

### 4.4 Assignment detail (S-G4 / P-G4)

Visible fields when allowed:

- Assignment title, class name, category label  
- Due date / submitted date if any  
- Status badge  
- Approved score + max if product shows points (v1: prefer % / mark consistent with student book)  
- Teacher-visible-to-family comment only if product already publishes comments on graded work (do not invent a new comment channel that leaks Glow/Grow drafts)  
- Line: **Counts toward {Category} average** / **Does not count toward the class average**  
- If dropped by rule: **Not counted (dropped as lowest score)**  
- If replaced: **Replaced by makeup**  

Never: `draft_score`, model JSON, other students, rubric editor, capture photo of another child.

### 4.5 Parent Home additions (P-H2)

Under existing ChildCard content (focus / practice / lesson / parent_sentence):

**Classes** section:

```
Math 7 · Mrs. Alvarez
Current average 87% · Q1
[ How grades work ]  [ See all grades ]

Science 7 · …
No published average yet
[ See work ]
```

- Average shown only under §2.2 + published syllabus + publish_to_family.  
- Always show **Missing: N** when N > 0 for that class (due missing only).  
- Do **not** put full grade grids on Home — push P-G1.

### 4.6 Student Home (S-H1)

Keep Assignments as the job of `/todo`. Optional footer link: `View grades` → S-G1. Do not turn Home into a second grade book.

---

## 5. Field-level visibility matrix

Legend: **R** = read · **—** = never · **T** = teacher only · **Own** = that student/parent-child only · **Pub** = only if syllabus published + publish_to_family · **Appr** = only post-Approve / graded publication rules

### 5.1 Syllabus / policy

| Field / concept | Teacher | Student | Parent (linked child) |
|---|---|---|---|
| Published category `label` | R/Edit | R (Pub) | R (Pub, child class) |
| Category `weight_percent` | R/Edit | R (Pub) | R (Pub) |
| Category `key` (internal slug) | R | — (use label only) | — |
| Category `sort_order` / display order | Edit | R order only | R order only |
| Category `active=false` | Edit | — (unless needed for history) | — |
| `default_include_in_average` | Edit | — | — |
| Class `term_structure` / term labels | Edit | R (Pub) | R (Pub) |
| Term filter chips | R | R | R |
| `calc_mode` | Edit | — (explained in prose only) | — |
| `grading_scale` letter cutoffs | Edit | R optional later; v1 optional hide | same |
| Policies: missing_as_zero, drop_lowest, makeup cap, floor, rounding, extra credit allowed | Edit | R plain English (Pub, enabled only) | R plain English |
| Policy **editor** UI / raw JSON | T | — | — |
| Syllabus `status=draft` | T | — | — |
| `ask_draft` / OCR confidence | T | — | — |
| `source_asset` syllabus photo | T | — | — |
| `publish_to_family` flag | T | — (effect only) | — |
| Unpublished weights | T | — | — |

### 5.2 Assignments / cells

| Field / concept | Teacher | Student | Parent |
|---|---|---|---|
| Assignment title | R/Edit | R (own class) | R (child class) |
| Due date | R/Edit | R | R |
| Category label | R/Edit | R | R |
| `include_in_average` | Edit | R as “counts / doesn’t count” | R same |
| `score_scheme` Pass/Fail vs numeric | Edit | R outcome labels | R |
| Submission status | R | R Own | R Own child |
| `approved_score` / graded mark | R | R Own Appr | R child Appr |
| `draft_score` / AI draft | T | — | — |
| `model_draft` / gaps draft | T | — | — |
| Teacher internal note / Glow-Grow pre-Approve | T | — | — |
| `parent_sentence` | Edit on Approve | — (student home may differ) | R on P-H1 when set |
| Other students’ scores | R class | — | — |
| Classmate names in grade context | R | First names on social surfaces only — **not** in grade book | — |
| Missing flag | R | R Own | R child |
| Not-due state | R | R Own | R child |
| Excused | R | R Own | R child |
| Dropped-by-rule indicator | R | R Own (in Why) | R child |
| Makeup / replaced indicator | R | R Own | R child |
| Rubric criteria scores | later | later Own Appr | later |
| Capture homework photo | T / owner rules | Own if product already shares | only if already parent-visible media — **do not newly expose** drafts |

### 5.3 Derived averages

| Field / concept | Teacher | Student | Parent |
|---|---|---|---|
| Type (category) average | R | R Own Pub+Appr inputs | R child |
| Overall weighted average | R | R Own Pub | R child |
| Renormalize disclosure | R | R when applied | R |
| Fallback unweighted mean | optional T | hide or banner per P1 | same |
| What-if / predictor | later | later | later |
| Multi-class GPA | — v1 | — | — |
| Year composite multi-term | later | later | later |

### 5.4 Identity / FERPA

| Field / concept | Teacher | Student | Parent |
|---|---|---|---|
| Own profile | — | R | R |
| Linked children list | directory | — | R own links only |
| Unlinked students | R class | classmates social only | — |
| Student metadata allergies/notes/etc. | R | limited own | per existing parent metadata matrix (`docs/data-model.md`) — **not** expanded by AVG |
| Parent of other children | R | — | — |

---

## 6. Plain-English language guide (“why this average”)

### 6.1 Preferred terms (family)

| Prefer | Avoid |
|---|---|
| Categories | Assignment groups, weight bands, `GradeKind` |
| `Tests: 40% of the class grade` | `weight_percent=40`, `weight_band=major` |
| Counts toward the Tests average | `include_in_average=true` |
| Approved score / Graded | Draft, model score, AI score, Grok |
| Not due yet | Null cell, unopened |
| Missing | Auto-zero (unless policy says so) |
| Dropped lowest score | `drop_lowest_n` |
| Makeup capped at 85% | `replace_lowest_with_makeup` JSON |
| Current average | Final grade, GPA, transcript mark |

### 6.2 Sentence templates

- Overall:  
  `Alex’s current average in Math 7 is 87% for Quarter 1. We average the scores in each category, then combine those averages using the weights on the class syllabus.`

- Category:  
  `Tests are 40% of the class grade. Alex’s test average is 85% after dropping the lowest score.`

- Missing policy false:  
  `Missing work is marked Missing and is not counted as zero until the teacher enters a score.`

- Missing policy true:  
  `Missing work counts as 0% in its category.`

- Not due:  
  `Work that is not due yet is listed under Upcoming and does not change the average.`

- No syllabus:  
  `The teacher has not published category weights yet, so Kelyra is not showing a weighted class average.`

- Approve gate:  
  `Only scores the teacher has approved are included. Work that is still turned in or under review does not change the average.`

### 6.3 Tone

- Speak to a busy adult and a middle-schooler. Short sentences.  
- No vendor AI names.  
- No blame language for missing work beyond factual status.  
- Do not say “final grade” unless the school term is closed and product later defines report-card freeze (out of v1).

---

## 7. Empty, error, and edge states

| Situation | UI |
|---|---|
| Parent with zero linked children | Existing empty copy; no grade chrome |
| Child enrolled in zero classes | “No classes yet” |
| Class with zero assignments | Syllabus weights still show if published; average `—` |
| All scores Pass/Fail | Category numeric avg omitted; overall may be hidden with explanation |
| Only excluded practice columns | Average hidden; list shows “does not count” |
| Multi-child parent | Force child picker; never default-blend |
| Token parent vs login parent | Same visibility rules; scope still `parent_students` |
| Student opens Ask about grades | Answer from published + own Appr data only |
| Teacher un-publishes syllabus | Family falls back to §3.4; do not cache stale weights client-side across sessions without refresh |
| Teacher revokes parent link | Immediate loss of child grades on next load |

---

## 8. Navigation summary (placement checklist)

**Student**

- Primary: **Grades** (`/student/grades`, class pane Grades) = S-G1 + S-G2 + S-G3.  
- Secondary: Assignments home link only.  
- Ask: explain, don’t edit.

**Parent**

- Primary progress: **Home** `/parent` = P-H1 + P-H2 summary.  
- Full book: pushed **Grades** P-G1…P-G4 for active child.  
- Context: child chips on Home; class chips on Grades.  
- Ask: child-scoped read-only.

**Teacher** (out of scope detail)

- Remains sole editor of syllabus and Approve. Family views never deep-link into setup editors.

---

## 9. API / data contract (product-level for Architect & S1)

Read models (names illustrative):

1. `family_class_syllabus(class_id)` → published categories + plain policy DTOs; empty if not family-publishable.  
2. `family_student_gradebook(student_id, class_id, term)` → assignments, own cells, statuses, approved marks only, flags counts/dropped.  
3. `family_why_average(student_id, class_id, term, category_key?)` → narrative inputs: contributions, counted ids, rule adjustments, disclosures.  

**Server must enforce:**

- Student id = session student.  
- Parent: `parent_students` contains student id; class via child’s enrollment.  
- Strip drafts before response (do not rely on UI hiding).  
- No roster-wide endpoints for family roles.

Exact RLS is **S1** (`avg-spec-security-ferpa.md`); this ticket only states the product necessity.

---

## 10. v1 cut line vs later

### v1 (with AVG implementation, still CEO-gated)

- S-G1…S-G4, P-H2, P-G1…P-G4, P-M1  
- Published weights + plain rules  
- Why-average sheet with contributions + drop/replace explanations  
- Missing vs not-due split  
- Sibling isolation  
- Approve-only scores  

### Later

- What-if sliders  
- Letter scale emphasis / GPA  
- Multi-term year composite explanation  
- Push/email digest of average changes (MVP S8-style)  
- Rubric breakdown on family detail  
- Guardians without full gradebook (Classroom-style) — not our default  
- Charts of category contribution  
- PDF syllabus attach download  

---

## 11. Acceptance criteria (for a **future** implementation — not this ticket)

1. Artifact exists: this file. **(this ticket)**  
2. View inventory covers student + parent destinations and entry points. **(this ticket)**  
3. Field-level matrix lists syllabus, cells, averages, FERPA identity. **(this ticket)**  
4. Future build: parent with two children cannot see child B data while A selected (automated + dogfood).  
5. Future build: draft_score never appears in family network payloads.  
6. Future build: not-due work never enters average; missing follows published policy.  
7. Future build: unpublished syllabus never invents 40/60 weights.  
8. Future build: Why sheet lists only own counted scores and rule adjustments.  
9. Future build: no rule editor or ask_draft on family routes.  
10. Security S1 + CEO AVG-GATE still required before qa-loop.

---

## 12. Downstream

| Ticket | Needs from this spec |
|---|---|
| AVG-S1 `t_60338b4e` | Visibility matrix + read-model scope for FERPA review |
| AVG-Q1 `t_8f7c0d1a` | View inventory + edge cases for acceptance plan |
| AVG-A1 architecture | Family DTOs §9 |
| AVG-GATE | Pack completeness — still no implementation |

---

## 13. Decisions log

- Grounded in R3: weights + category avgs + missing clarity; post-Approve only; linked children only.  
- Grounded in P1: category weighting, include_in_average = counts in type average, missing_as_zero default false, omit+renormalize empty categories with disclosure, publish_to_family gate.  
- Live chrome: extend student **Grades** and parent **Home**, do not invent a third parent app.  
- Language: “Categories”, “Current average”, “Why this average?”  
- v1: no what-if, no cross-class GPA, no sibling comparison UI.  

**RECOMMENDED NEXT ACTION:** Security/FERPA pass (S1) using this matrix. Implementation remains blocked on CoS/CEO AVG-GATE. No kelyra-qa-loop from this ticket.

# AVG IQG — PM defect disposition pack

**Parent disposition card:** t_02265312  
**Feature / stamp:** t_7bc1c837 · notes/company/avg-iqg-intent.md  
**Date:** 2026-09-10  
**Profile:** product-manager  
**SoT:** avg-iqg-intent.md §5.1 · INTENT_QUALITY_GATE.md Phase 6 · avg-spec-family-view.md (P4) · avg-spec-acceptance.md (Q1)

---

## Binding summary table

| id | title | SEVERITY | DISPOSITION | reason (short) | CoS next |
|---|---|---|---|---|---|
| t_afaaf1e1 | Parent missing full child grades book (P-G1…P-G4) | **P1** (confirm) | **FIX-NOW** | Stamped P4 v1 primary parent hat blocked beyond headline % | ARM + Eng child |
| t_f907d7a7 | Parent Home missing How-grades + Missing strip | **P2** (confirm) | **SCHEDULE** | Home enrichment; book FIX-NOW may cover part | sticky SCHEDULE |
| t_860fefed | Student grades lack assignment detail (S-G4) | **P2** (confirm) | **SCHEDULE** | Grid + Why workaround; row detail polish | sticky SCHEDULE |
| t_5a1e5860 | Teacher gradebook no weighted overall column | **P3** (confirm) | **DEFER** | Soft vs Q1; family owns running % | sticky DEFER |

**CEO escalate?** No. **Staff Eng from this card?** No — CoS only. **App/git/SQL this turn?** No.

---

## IQG Phase 6

- P0/P1 → FIX-NOW unless written reason.
- P2/P3 → SCHEDULE or DEFER with reason.
- Dual DESIGN STAMP already APPROVED (intent). Gaps are realization vs stamped P4/Q1 — not design reopen.
- Honest v1: teacher syllabus engine shipped; parent full grades book missing.

---

## Per-defect detail

### 1. t_afaaf1e1 — Parent missing full child grades book (P-G1…P-G4)

| Field | Value |
|---|---|
| **SEVERITY** | **P1** (confirmed) |
| **DISPOSITION** | **FIX-NOW** |
| **Stamp conflict?** | No — implements stamped P4 §3.2/§10 v1; Q1 F-03…F-13; L6 |
| **CEO escalate?** | No |

**Why P1 / FIX-NOW**

1. Dual-stamped AVG intent: parent full child grades book is **in the v1 cut**, not “later.” Live parent path is Home P-H2 average + Why only.
2. Primary hat (parent): cannot complete “see how my child’s work grades” beyond headline % — no pushed Grades, no FamilySyllabusSummary on parent path, no assignment list/detail for child.
3. IQG Phase 6: P1 stamped behavior missing for a primary hat → FIX-NOW unless written reason. No reason to defer; honest v1 already named this as the realization miss.
4. Student path already has S-G1/G2/G3 patterns (`StudentGradeBook`, `FamilySyllabusSummary`, `WhyAverageSheet`) — reuse on parent seat for focused child, not a greenfield product.

**Not SCHEDULE/DEFER:** Would leave stamped P4 parent book half-shipped while teacher engine is live — parent remains headline-only.

**Accepted expected (no design reopen)**

- Parent can open a **full grades book** for the focused child (P-G1): per-class or all-class assignment marks post-Approve when `publish_to_family` + published syllabus gates allow.
- How grades work (P-G2): category weights / rules summary via existing family DTO patterns (FamilySyllabusSummary or equivalent).
- Why this average remains available (P-G3 already on Home; keep on book).
- Assignment detail (P-G4): counts-toward / dropped/replaced labels when student S-G4 pattern lands or parent shares same detail component.
- Sibling switch still clears prior averages / sheets (F-06). Never sibling blend. No write / no draft / no ask_draft.

**Eng contract (CoS → Engineering after ARM; dual DESIGN STAMP already met on intent)**

1. Parent chrome entry: push from Parent Home class card (and/or tray/drawer Grades if already parent-visible) into a parent grades book scoped to **focused child** only.
2. Reuse family RPCs + `FamilySyllabusSummary` / grade-book list patterns; strip drafts; fail-closed empty when unpublished or `publish_to_family=false`.
3. Non-goals this card: teacher overall column (t_5a1e5860); year composite / what-if / SIS; office syllabus; student setup.

**AC re-prove:** Parent focused child A → open full book → see classes + marks beyond headline → How grades / Why → switch child B clears A → no drafts/classmates.

### 2. t_f907d7a7 — Parent Home missing How-grades categories + Missing strip (P-H2/P-M1)

| Field | Value |
|---|---|
| **SEVERITY** | **P2** (confirmed) |
| **DISPOSITION** | **SCHEDULE** |
| **CEO escalate?** | No |

**Why P2 / SCHEDULE**

1. P4 expects Home “How grades work” category weights and a missing/upcoming strip (P-M1) even without full P-G1.
2. Primary blocked flow is the full book (t_afaaf1e1 FIX-NOW). Home strip is secondary enrichment; headline average + Why already ship on Home.
3. Workaround until book lands: WhyAverageSheet + Ask explain. Not a blocked live school safety/grade-wrong flow → P2.
4. SCHEDULE (not DEFER): stamped Home surface; CoS may **bundle** category chips / missing strip into the parent-book Eng child if cheap and same family components — still not a second FIX-NOW gate. If not bundled, remains SCHEDULE sticky after book.

**Accepted expected (when scheduled)**

- Home class card (or adjacent): short How-grades category weight list when published + family-visible.
- Missing/upcoming strip (P-M1) for focused child only; honest empty if none.
- No edit controls; sibling isolation unchanged.

**Non-goals:** full assignment grid on Home (that is P-G1 book); teacher tools.

### 3. t_860fefed — Student grades lack assignment detail push (S-G4)

| Field | Value |
|---|---|
| **SEVERITY** | **P2** (confirmed) |
| **DISPOSITION** | **SCHEDULE** |
| **CEO escalate?** | No |

**Why P2 / SCHEDULE**

1. P4 S-G4 / Q1 F-13: row-tap detail with counts-toward / dropped/replaced labels is stamped; live `StudentGradeBook` is grid marks only.
2. Student primary path works: S-G1 book, S-G2 How grades, S-G3 Why average. Detail is secondary completeness.
3. Workaround: read mark in grid + Why sheet for average math. Not blocked school flow → P2.
4. SCHEDULE: next family polish wave; prefer **shared detail component** with parent P-G4 so parent FIX-NOW and this card do not diverge. Optional bundle on parent-book eng if same component is built once — still SCHEDULE severity/priority, not FIX-NOW.

**Accepted expected (when scheduled)**

- Tap assignment row → detail: score, category, counts-toward type average (or doesn’t), dropped/replaced/makeup labels per engine rules.
- Own cells only; no classmates; no write.

**Non-goals:** what-if calculator; editing include_in_average from student seat.

### 4. t_5a1e5860 — Teacher gradebook no per-student weighted overall column

| Field | Value |
|---|---|
| **SEVERITY** | **P3** (confirmed) |
| **DISPOSITION** | **DEFER** |
| **CEO escalate?** | No |

**Why P3 / DEFER**

1. Intent §2.1 / §5.1: teacher per-student weighted overall is **soft** vs Q1 — family/explain owns running %. Optional polish.
2. Teacher can still set syllabus, assign categories, approve scores, see gradebook cells + banner. No blocked school flow.
3. DEFER (not SCHEDULE): explicit optional; do not gate AVG release or parent-book FIX-NOW on this column.

**Accepted expected (if ever scheduled later)**

- Optional gradebook column: per-student current weighted % using same engine as family (Approve-only, published weights).
- Honest empty / “—” when unpublished or no includable cells.

**Non-goals:** inventing weights when unpublished; showing family-hidden drafts; making teacher column the SoT instead of engine+family RPC.

---

## CoS handoff

| Step | Action |
|---|---|
| 1 | **FIX-NOW** t_afaaf1e1 → ARM GRANT + staff Engineering (child of defect; link AVG / t_7bc1c837). Dual DESIGN STAMP already APPROVED on intent — do not re-open design unless eng finds a chrome gap needing designer. |
| 2 | **SCHEDULE** t_f907d7a7 + t_860fefed → leave sticky `needs_input` with PM reason. Optional: bundle Home strip / shared S-G4 detail into parent-book eng if capacity; else separate later cards. |
| 3 | **DEFER** t_5a1e5860 → leave sticky DEFER; do not staff. |
| 4 | **QE prove-out** remains separate (avg-iqg-intent.md §7). Re-prove parent book after eng lands. |
| 5 | **No devops-release** until QE prove-out + open P0/P1 clear + QA Sup release evidence. |
| 6 | Do **not** fail v1 for year-composite / Office templates / Syllabus ClassTab icon / teacher overall column. |

**Binding:** PM disposition binding for this queue unless Chuck overrides. No Eng/app/git/SQL from product-manager this turn.

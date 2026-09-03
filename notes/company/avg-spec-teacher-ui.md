# AVG-P3: Teacher Class-Setup Syllabus UI

**Date:** 2026-09-02  
**Author:** product-manager  
**Ticket:** t_0267cdbc  
**Status:** Spec only — no app code, no migrations, no new `IconName`, no kelyra-qa-loop.  
**Depends on:**  
- `notes/company/avg-spec-syllabus-ia.md` (AVG-P1) — **do not invent IA**  
- `notes/company/avg-spec-family-view.md` (AVG-P4) — family is read-only mirror of **published** syllabus  
- Live chrome: `docs/ui-design.md`, `src/app/class/[id]/setup.tsx`, `src/components/ui/ClassTabs.tsx`, `src/components/ui/AssignmentForm.tsx`, `src/lib/grade/marks.ts`  
- CEO model: phone captures; web reviews; nothing is a grade until **Approve**; teachers set syllabus for **classes they teach**

**Non-goals of this ticket:** Implementation, SQL, Ask photo import sequence detail (P2 owns flow + draft JSON), family read UI (P4), Architect answers to P1 §10, icon recipe / new `IconName`.

---

## 1. Product intent

The teacher defines **how this class grades** once, at class altitude:

1. Categories (assignment types) and **weights toward the final**  
2. **Term structure** (quarters / semesters / year)  
3. **Special rules** (drop lowest, makeup replace + cap, floors, missing, rounding, …)  
4. **Publish** so grade book + family can use weights — never silent district defaults  

This is the **editor**. Family (P4) and student Grades are **readers** of published policy only. Ask may **propose** a draft (P1 §7 / P2); the teacher **confirms or overrides** here before anything is live.

---

## 2. Altitude rules (locked)

| Actor | May edit class syllabus? | May view draft / ask_draft? | Notes |
|---|---|---|---|
| **Teacher of this class** | **Yes** (owner) | Yes | Same ownership altitude as class roster / grade book |
| **Co-teacher** | v1: **No** (out) unless product later adds delegate | No | P1 open Q8 — no UI for copy/templates in v1 |
| **Office (superintendent / administrator)** | **No** | No | Office class card stays Feed · Teacher · Parents · Students. **No school-wide syllabus** in v1 |
| **Student / parent** | **No** | No | Read published only via P4; never deep-link into these editors |
| **Author studio** | **No** | No | Binds category only at assign-time (P1 §6) |

### 2.1 Class setup vs Office

| Surface | Owns syllabus? |
|---|---|
| **Teacher Class desk** (`/class/{id}/*`) | **Yes** — sole v1 home |
| **Teacher hamburger → Settings** (`SettingsSheet`) | **No** — theme / account only |
| **Office** `/admin/*` | **No** — people, classes directory, teacher assignment; not grade policy |
| **Assignment create/edit** | **No weights of the final** — picks `category` from syllabus categories; may still show legacy `weight_band` as display/migration until Architect deprecates (P1 §3.1) |

**Rule of thumb:** If the teacher is not looking at **one class they teach**, they cannot edit a syllabus.

---

## 3. Where it lives (chrome placement)

### 3.1 Live chrome today (ground truth)

- Class desk tabs (`ClassTabs`): Feed · Today · This week · Needs you · **Students** (`/setup`) · Parents · Gradebook · Heatmap · Assignments · Family  
- `/class/{id}/setup` = **Roster** (feed icon, add/enroll students, delete class) — **not** yet grading policy  
- Grade book = columns + cells; assignment form has Kind / Weight band / Counts toward **per column**, not class-level weights  
- ui-design §3.6 older context chips: Roster · Parents · Heatmap · Grade book (PersonTabs supersede in code)

### 3.2 Decision (PM)

**Primary editor lives on the Class desk**, not Office, not Settings.

| ID | Surface | Route (proposal) | ClassTabs selection | Job |
|---|---|---|---|---|
| **T-S0** | **Entry points** | — | — | Discoverability without forcing a new icon day-one |
| **T-S1** | **Syllabus hub** | `/class/{id}/syllabus` | **Syllabus** tab (see icon note) | Status, summary, primary CTAs |
| **T-S2** | **Categories & weights editor** | same route, scroll section **or** in-page mode `?edit=categories` | Syllabus | CRUD categories, weights, sum bar |
| **T-S3** | **Terms** | section / `?edit=terms` | Syllabus | term_structure + active_term |
| **T-S4** | **Class policies** | section / `?edit=policies` | Syllabus | class-level knobs (P1 §5.1) |
| **T-S5** | **Category rules sheet** | sheet from category row | Syllabus | drop_lowest, makeup+cap, default include |
| **T-S6** | **Ask draft review** | section / sheet when `ask_draft` present | Syllabus | confirm / override / discard |
| **T-S7** | **Publish confirm** | `ConfirmSheet` | Syllabus | sum-100, family visibility, irreversible-ish messaging |
| **T-S8** | **Grade book banner** | `/class/{id}/gradebook` | Gradebook | Soft entry when unpublished / draft |
| **T-S9** | **Setup card** | `/class/{id}/setup` | Students | Short “How this class grades” card above roster |
| **T-A1** | **Assign bind** | assignment form | — | Category chips from **this class syllabus** when published |

**Not a tray-level destination.** Stays under **Class** floating-tray cluster (same as setup / gradebook).

### 3.3 Icon / tab without new `IconName`

**Constraint:** no new `IconName` / View-stroke recipe on this ticket.

**v1 chrome options (implementation pick one; product accepts both):**

1. **Preferred interim:** **Do not add ClassTabs icon yet.**  
   - T-S9 card on Setup + T-S8 grade book banner + optional hamburger row under class cluster later  
   - Route `/class/{id}/syllabus` is **pushed** with back chevron **or** `replace`d with ClassTabs still showing Students/Gradebook active depending on entry  
2. **When icon ticket ships:** ClassTabs entry **Syllabus** between **Students** and **Gradebook**, new recipe + `IconName` on a **later** implementation ticket only.

Until then, wordmark on syllabus editor: **class name** (same as other class panes) or pushed title **Syllabus** — match ui-design: class panes keep class name in header when in-desk; if pushed, title `Syllabus` / `How this class grades`.

### 3.4 Wireframe — Class desk IA (markdown)

```
Teacher Class chrome
├── Floating tray: Today · Capture · Inbox · Class · Ask
└── Class desk (Class active)
    ├── [Feed] [Today] [Week] [Needs] [Students] [Parents] [Gradebook] …
    ├── Students (/setup)          ← roster + T-S9 entry card
    ├── Syllabus (/syllabus)       ← T-S1…T-S7  [tab when icon exists]
    └── Gradebook                  ← grid + T-S8 banner
Office admin class
└── Feed · Teacher · Parents · Students   ← NO Syllabus
```

---

## 4. Screen inventory (detail)

### 4.1 T-S0 — Entry points

| Entry | Copy | Goes to |
|---|---|---|
| Setup card title | **How this class grades** | T-S1 |
| Setup card meta (empty) | `Set categories and weights for the final average.` | |
| Setup card meta (draft) | `Draft — not used in averages yet.` | |
| Setup card meta (published) | `{n} categories · weights sum 100%` + optional `Visible to families` | |
| Setup card primary pill | `Set up syllabus` / `Edit syllabus` / `Review Ask draft` | |
| Grade book banner (no published) | `Syllabus weights not set. Averages won’t use category weights until you publish.` · pill **Set up syllabus** | T-S1 |
| Grade book banner (draft only) | `Draft syllabus saved — not live.` · **Continue** | T-S1 |
| Assign form helper (published) | Category chips = syllabus labels; meta under Kind: `Counts toward the {label} average ({w}%).` | — |
| Assign form helper (unpublished) | Fall back to `GRADE_KINDS` chips; meta: `Class syllabus not published — category is a label only.` | — |

### 4.2 T-S1 — Syllabus hub

**Job.** One glance: status, weight sum, term, family visibility, next action.

**Chrome.** Class desk. Header wordmark = class name (in-desk) or `Syllabus` if pushed. One primary filled button per state.

**Vertical stack (top → bottom):**

1. **Status strip** (PhaseBanner-like or Card meta — reuse `PhaseBanner` / mute body, not a KPI dashboard)  
2. **Optional title** field (syllabus title; placeholder `Room 14 Math — Fall 2026`)  
3. **Weight summary card** — category rows read-only teaser OR full T-S2 inline  
4. **Terms teaser** — structure + active term  
5. **Policies teaser** — 2–3 plain bullets of enabled rules  
6. **Ask draft card** if `source=ask_import` draft pending (T-S6)  
7. **Family visibility** toggle row (`publish_to_family`) — only meaningful when publishing  
8. **Footer actions** — Save draft · Publish · Unpublish (if published)  
9. **Danger zone** — Archive / reset draft (not delete class)

**Status chip language:**

| `status` | Chip | Primary CTA |
|---|---|---|
| none / no row | `Not set` | **Set up syllabus** |
| `draft` | `Draft` | **Continue editing** / **Publish** if valid |
| `published` | `Published` | **Edit** (creates working draft or live-edit with confirm — see §7) |
| `archived` | `Archived` | **Restore draft** / **Start new** |

### 4.3 T-S2 — Categories & weights

**Job.** Edit the list that drives type averages → final.

**Layout (Amazon row + Chip language):**

```
CATEGORIES                         [ Add category ]

┌──────────────────────────────────────────────────┐
│ ⋮  Homework                          10 %     〉 │
│    Counts in type average by default: Yes        │
├──────────────────────────────────────────────────┤
│ ⋮  Quizzes                           20 %     〉 │
├──────────────────────────────────────────────────┤
│ ⋮  Tests                             40 %     〉 │
├──────────────────────────────────────────────────┤
│ ⋮  Projects                          30 %     〉 │
└──────────────────────────────────────────────────┘

Sum  100%  ████████████████████  OK
     or    Sum  85%  …  15% unassigned  [ Use remainder… ]
```

**Per category row fields (expand or push T-S5):**

| Field | UI | Required | Notes |
|---|---|---|---|
| `label` | TextField | Yes | Teacher-facing (“Unit tests”) |
| `key` | derived slug; advanced disclosure | Yes unique | Prefer stable GradeKind keys; custom allowed (P1) |
| `weight_percent` | numeric TextField or stepper | Yes if active | 0–100; one decimal ok |
| `active` | Chip or switch | — | Soft-hide |
| `group` | optional Chip formative/summative | No | Hint only; not separate calc |
| `default_include_in_average` | Chip Yes/No | — | Seeds new columns; **never** auto true because key=quiz |
| `min_grades_per_term` | optional number | No | Soft warning only |
| `rules` | “Rules” ghost → T-S5 | — | |

**Add category:**

- Sheet or inline: pick from **seed** `GRADE_KINDS` not already used, **or** Custom label  
- Default weight: `0` until teacher fills (sum validation catches)  
- Default `default_include_in_average`: **false** for all seeds (P1 — no quiz shortcut)

**Reorder:** drag `⋮` or up/down ghosts; maps to `sort_order`.

**Remainder pattern (explicit):**

- If sum **&lt; 100** and teacher taps **Use remainder**:  
  - Option A: create/adjust category “Other” with leftover %  
  - Option B: distribute leftover proportionally (confirm sheet)  
- If sum **&gt; 100**: block publish; inline error  
- Epsilon: ±0.01 per P1 publish rule  

**Do not** show assignment-level `weight_percent` as the class final engine here.

### 4.4 T-S3 — Terms

```
TERM STRUCTURE
( ) Quarters    (•) Semesters    ( ) Year    ( ) Custom

Active term   [ Semester 1 ▾ ]     optional working default for new columns

Terms in this structure
  Semester 1
  Semester 2
  Year
```

| Field | UI | Validation |
|---|---|---|
| `term_structure` | exclusive ChipRow | Required before publish |
| `active_term` | ChipRow filtered by structure | Optional; must be compatible key (`q1`…`year`) |
| Custom terms | v1: **discourage**; if Custom, still only keys from `GRADE_TERMS` / P1 compatible set | No free-text keys that break `GRADE_TERM_ROLLUP` |

**v1 non-goal on this screen:** multi-term year composite weights (Q1 40 + Q2 40 + Exam 20). Show mute note: `Year composite weighting comes later. v1 filters by term; weights are category weights inside the term.`

### 4.5 T-S4 — Class policies (special rules, class scope)

Section header: **Class rules**  
Helper: `These apply across categories. Category-specific drop/makeup lives on each type.`

| Knob | Control | Default (P1) | Copy |
|---|---|---|---|
| `extra_credit_allowed` | Chip Yes/No | No | `Allow extra-credit columns` |
| `late_penalty_mode` | Chips: None · Teacher enters score | `manual` | Avoid “auto decay” in v1 |
| `makeup_window_days` | number or blank | blank | `Makeup window (days, advisory)` |
| `redo_max_percent` | number or blank | blank | `Default redo cap %` |
| `min_floor_percent` | number or blank | blank | `Score floor % (optional)` |
| `rounding` | Chips: Nearest whole · None | nearest_whole | |
| `missing_as_zero` | Chip Yes/No | **No** | `Count missing (due) as zero` — dangerous; confirm copy if Yes |
| `publish_to_family` | Chip Yes/No | Yes when publishing | `Families see category weights` |

**Danger copy when enabling `missing_as_zero`:**  
`Missing work that is due will count as 0 in the type average. Work that is not due yet still does not count.`

### 4.6 T-S5 — Category rules sheet

Opened from category row chevron. Title: `{label} rules`.

| Knob | Control | Range / default |
|---|---|---|
| `drop_lowest_n` | stepper 0–3 | 0 |
| `replace_lowest_with_makeup` | Yes/No | No |
| `cap_percent` | number | e.g. 85 when replace on |
| `max_replacements` | 1 (v1 fixed UI) | 1 |
| Makeup identity helper | mute text | `v1: mark makeup columns in the grade book (Architect: is_makeup). Until then, follow the rule text you set.` |

Plain example line (CEO):  
`A makeup can replace the lowest test, capped at 85%.`

### 4.7 T-S6 — Ask-imported draft confirm / override

**When:** `ask_draft` present and not yet confirmed (P1 §7).

**Card anatomy (mirror roster import confirm on setup):**

```
┌─────────────────────────────────────────────┐
│ From photo · Ask draft                      │
│ Confidence: categories high · rules mixed   │
│                                             │
│ [✓] Homework        10%                     │
│ [✓] Quizzes         20%   low confidence    │
│ [ ] Participation    5%   unchecked (low)   │
│ …                                           │
│ Term guess: Semesters                       │
│ Notes: “Late work one letter grade…”        │
│                                             │
│ [ Apply checked into editor ]               │
│ [ Discard draft ]                           │
└─────────────────────────────────────────────┘
```

**Rules:**

1. Draft **never** auto-publishes.  
2. Low-confidence fields start **unchecked** or highlighted (same muscle memory as roster photo confirm).  
3. **Apply** writes into the **editor draft** (status stays `draft` until Publish).  
4. Teacher may edit every field after apply (full override).  
5. **Discard** clears `ask_draft` only; leaves prior **published** syllabus intact.  
6. Re-import (P2) replaces `ask_draft`, not live row, until confirm.  
7. If document kind was `rubric` / `mixed`: banner  
   `This looks like a scoring rubric (or mixed). Rubric levels are not category weights.`  
   Do not dump criteria into weight rows.  
8. Fail-closed empty draft: `Could not read a grading policy from that photo.` + manual path.

**Primary after apply:** teacher lands in T-S2 with fields filled; Publish remains explicit.

### 4.8 T-S7 — Publish confirm (`ConfirmSheet`)

**Title:** `Publish syllabus for {class name}?`  
**Body:**  
`Category weights will drive the class average. Families {will / will not} see how this class grades. This does not change any student’s approved scores — only how averages are calculated.`

**Checklist in body (computed):**

- `{n} active categories`  
- `Weights sum to {sum}%` (must be 100 ± 0.01)  
- `Term structure: {label}`  
- `Family visibility: on/off`

**Confirm label:** `Publish`  
**Block confirm** if validation fails (sheet doesn’t open; inline errors on hub).

**Unpublish:** separate sheet — `Averages stop using these weights. Family “how grades work” hides. Approved scores stay.`

### 4.9 T-S8 / T-S9 — Banners & setup card

Visual language:

- `Card` + `type.body` / `type.meta`  
- One `PrimaryButton` or brand pill  
- `GhostButton` secondary  
- No second page-level filled brand button on the same view as Delete class (setup already ends with ghost Delete class)

**Setup card placement:** After `FeedIconRow`, **before** Add students / roster — policy is class configuration, roster is people.

### 4.10 T-A1 — Assignment form bind (delta only)

When syllabus **published**:

- **Kind** chips = active syllabus category **labels** (keys under the hood)  
- Remove reliance on assignment `weight_band` / `weight_percent` for **final** calc copy; optional collapse Weight section behind “Legacy column hint” or hide when syllabus active (Architect deprecation path)  
- Add chip/toggle near Kind: **Counts toward {Type} average** ↔ `include_in_average`  
  - Default from category `default_include_in_average`  
  - Helper never says “quiz always counts”

When syllabus **not published**: keep today’s `GRADE_KINDS` + weight bands; show banner pointing to T-S1.

---

## 5. Markdown wireframes (hub + editor)

### 5.1 Empty state (no syllabus)

```
┌ header: {Class name}                    cam search mail ☰ ┐
│ [Feed][Today]…[Students][Parents][Gradebook]…              │
│                                                            │
│  HOW THIS CLASS GRADES                                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Not set                                              │  │
│  │ Categories and weights drive the final average.      │  │
│  │ Nothing is a grade until you Approve work.           │  │
│  │                                                      │  │
│  │        [ Set up syllabus ]                           │  │
│  │        Import from photo (Ask) · later/P2 entry      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  Tip: Start from common types (Homework, Quiz, Test…)      │
│  or wait until you photograph the paper syllabus.          │
└────────────────────────────────────────────────────────────┘
```

### 5.2 Draft with invalid sum

```
│  Status: Draft                          Sum  85%  · needs 15%
│  ⚠ Weights must total 100% before publish.
│
│  Categories                         [ Add ]
│  Homework     10%
│  Tests        40%
│  Projects     35%
│
│  [ Use remainder as Other (15%) ]     [ Save draft ]
│  Publish (disabled)
```

### 5.3 Published hub

```
│  Status: Published · Visible to families
│  Semesters · Active: Semester 1
│
│  Homework 10% · Quizzes 20% · Tests 40% · Projects 30%
│  Tests: drop lowest 0 · makeup replaces lowest @ 85% cap
│
│  [ Edit ]   [ Unpublish ]
```

### 5.4 Ask draft overlay

```
│  ┌ Ask proposed this from your photo ─────────────┐
│  │ Review every line. Nothing is live until you   │
│  │ publish.                                       │
│  │ ☑ Tests 40%   ☑ HW 10%   ☐ Labs 15% (low)     │
│  │ [ Apply into draft ]  [ Discard ]              │
│  └────────────────────────────────────────────────┘
```

---

## 6. Fields ↔ IA map

| UI control | IA field (P1) |
|---|---|
| Hub title | `class_syllabi.title` |
| Status chip | `class_syllabi.status` |
| Calc mode (hidden v1) | `calc_mode=category_weight` only |
| Term structure chips | `term_structure` |
| Active term | `active_term` |
| Family toggle | `policies.publish_to_family` |
| Class rules section | `policies.*` |
| Category rows | `syllabus_categories.*` |
| Weight inputs | `weight_percent` |
| Default include | `default_include_in_average` |
| Category rules sheet | `rules` JSON |
| Ask card | `ask_draft`, `source`, `source_asset_id` |
| Publish time | `published_at` |

---

## 7. Validation matrix

### 7.1 Save draft (lenient)

| Check | Severity | Behavior |
|---|---|---|
| Empty label on a row | Error on that row | Block save of that row / strip |
| Duplicate `key` | Error | Block |
| Weight non-numeric / &lt;0 / &gt;100 | Error | Block field |
| Sum ≠ 100 | **Warning** only | Allow draft; show sum bar |
| No categories | Warning | Allow empty draft |
| `term_structure` missing | Warning | Allow draft |
| `drop_lowest_n` &gt; 3 | Clamp / error | Max 3 |
| Replace on without cap | Warning | Suggest cap |

### 7.2 Publish (strict)

| Check | Block publish? |
|---|---|
| ≥1 **active** category | Yes |
| Active weights sum **100 ± 0.01** | Yes |
| Every active category has non-empty label + unique key | Yes |
| `term_structure` set | Yes |
| `active_term` if set must match structure | Yes |
| No unchecked required Ask fields left “applied half-way” without editor review | Soft — once in editor, normal publish rules |
| Quiz/test shortcut forcing include | N/A — UI must not offer it |

### 7.3 Live edit while term in progress

**Product default (until Architect Q9):**  

- Editing weights on a **published** syllabus updates **live** calculation (no historical weight snapshot in v1).  
- Confirm copy: `Changing weights recalculates averages for everyone using the new weights. Approved scores do not change.`  
- Optional safer path later: “Save as draft → Publish replaces.”

### 7.4 Empty / missing states (copy bank)

| State | Teacher UI |
|---|---|
| No syllabus | T-S1 empty + T-S8/T-S9 |
| Draft invalid sum | Sum bar + disabled Publish |
| Draft valid | Publish enabled |
| Published | Hub summary; Edit |
| Ask failed | Empty draft message; manual setup |
| Rubric misparse | Mixed/rubric banner; no auto weights |
| Unpublished fallback in grade book | Banner; **do not invent 40/60**; hide weighted final or show unweighted only with disclosure (P1 §4.4 — prefer hide weighted final) |

---

## 8. Visual language (existing Kelyra only)

Follow `docs/ui-design.md` + live primitives — **no production component invention beyond names as concepts:**

| Pattern | Use |
|---|---|
| `Screen` + `ClassTabs` | Class desk shell |
| `SectionHeader` | CATEGORIES, TERMS, CLASS RULES |
| `Card` | Hub status, Ask draft, setup entry |
| `ListRow` / dense category rows | Category list |
| `Chip` + `ChipRow` | term_structure, policies, seed kinds |
| `TextField` | labels, weights, title |
| `PrimaryButton` | one filled CTA (Publish / Set up / Apply draft) |
| `SecondaryButton` / `GhostButton` | Save draft, Discard, Unpublish |
| `ConfirmSheet` | Publish, Unpublish, Discard Ask, enable missing_as_zero |
| `WorkingLine` | Ask apply / save |
| `PhaseBanner` | optional coaching on empty hub |
| `HoverTip` | desktop tooltips on icons/pills |
| Tokens | `colors.ink/mute/brand/brandSoft/line/danger`, `type.*`, `radius` |

**Do not:** Meta blue, KPI tiles, school-portal tables, new icon packages, second brand button competing with Publish on the same fold as Delete class.

**Icons:** reuse existing `IconName` only (`capture` for photo import entry when P2 wires it, `records` gradebook, `setup` students). Syllabus-specific glyph = **later ticket**.

---

## 9. Interaction notes

1. **Phone vs web:** Editing weights is **web-first comfortable**; phone must still work (stacked fields, numeric keyboard). Capture of paper syllabus is **phone** → Ask draft → confirm on either (P2).  
2. **One primary per view.** On hub: Publish **or** Set up **or** Apply draft — not all three filled.  
3. **Roster import muscle memory** for Ask draft checklists.  
4. **Approve gate unchanged** — syllabus UI never writes `approved_score`.  
5. **Matcher never inserts students** — roster stays on setup; syllabus never creates people.  
6. **Deleting a category** with existing assignments: confirm  
   `N columns use this type. They keep their labels until you reassign. Averages omit empty types and renormalize (P1 recommendation).`  
   Prefer deactivate (`active=false`) over hard delete when history exists.  
7. **Renaming:** change `label` freely; changing `key` warns migration hazard (P1 §6.2).

---

## 10. Office / teacher split (acceptance detail)

| Action | Teacher class desk | Office |
|---|---|---|
| Create/edit/publish syllabus | Yes | No |
| View published weights (support) | Yes | v1 No UI (optional later read-only) |
| Set school default template | No (out) | No (out) |
| Enroll students | setup rules as live | office add-name rules as live |
| Edit assignment category bind | Yes | No |

---

## 11. Acceptance criteria (this spec ticket)

- [x] **Screen inventory** — T-S0…T-S9, T-A1 (§4)  
- [x] **Fields** — categories, weights, terms, class + category rules, Ask draft, publish (§4–6)  
- [x] **Validation** — draft vs publish, sum 100 / remainder, missing term, empty states (§7)  
- [x] **Altitude rules** — teacher-taught class only; Office excluded; family read-only elsewhere (§2, §10)  
- [x] **Placement** — class setup / Class desk, not Office/Settings (§3)  
- [x] **Wireframes** — markdown (§3.4, §5); optional HTML notes not required  
- [x] **Visual language** — existing tokens/primitives; no new IconName (§8)  
- [x] **Ask confirm/override** — propose ≠ publish (§4.7)  
- [x] **Grounded in P1 IA** — no parallel data model  

---

## 12. Implementation handoff (future — not this ticket)

When CEO lifts AVG HOLD:

1. Architect resolves P1 §10 before migrations.  
2. Implementation ticket(s) via kelyra-qa-loop — **not** started from this spec alone.  
3. Optional child: icon recipe for ClassTabs **Syllabus**.  
4. P2 wires photo → `ask_draft` into T-S6.  
5. P4 already defines family read surfaces against published + `publish_to_family`.  
6. Q1 acceptance plan consumes this inventory.

### 12.1 Suggested future ACs (for implementers)

1. Teacher opens class → Setup shows T-S9 card; can reach full editor without Office.  
2. Create 4 categories, weights 10/20/40/30, publish → grade book banner clears; assign form lists those labels.  
3. Sum 90 → Publish disabled; remainder action yields 100.  
4. Ask draft apply → fields editable → discard leaves prior published intact.  
5. `missing_as_zero` default off; enabling requires confirm copy.  
6. Office class routes have no syllabus editor.  
7. No new `EXPO_PUBLIC_` keys; no quiz→include shortcut; no src change on **this** ticket.

---

## 13. Open UI questions (non-blocking for this artifact)

1. In-desk tab vs pushed route until icon ships — §3.3 allows both.  
2. Live weight edit vs draft-then-republish — §7.3 default live with confirm.  
3. Whether legacy Weight band UI hides immediately when syllabus published — prefer hide or demote.  
4. Exact makeup column marking UI awaits Architect `is_makeup` decision (P1 Q4).  

---

## 14. Sources & decisions log

- P1 IA: class syllabus = categories + weights + terms + rules; Ask never auto-publishes; Office not owner.  
- Live setup = roster only; ClassTabs = class desk IA.  
- ui-design: Facebook/Amazon chrome, one primary, Chip rows for enums, ConfirmSheet for destructive/significant.  
- marks.ts: `GRADE_KINDS`, `GRADE_TERMS`, `GRADE_TERM_ROLLUP` seed vocabulary.  
- P4: family never opens teacher editors.  

**Decision (PM):** Syllabus editor is **teacher Class-desk setup altitude** (`/class/{id}/syllabus` + setup/gradebook entries). **Not** Office. Weights must sum to 100 to publish, with explicit remainder helper. Ask draft uses roster-style confirm. No app code on this ticket.

---

**RECOMMENDED NEXT ACTION:** Architect (schema + P1 §10) + AVG-Q1 acceptance plan when P2/A1 ready. Implementation remains **AVG HOLD / CEO gate**. No kelyra-qa-loop from this ticket. Family-view spec is separate (P4 done or parallel).

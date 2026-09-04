# TEACH-UX-P1: Teacher layout proposal + implementation plan

**Date:** 2026-09-03  
**Author:** product-manager (Kelyra)  
**Card:** `t_7215b83e` · Parent research: `t_fc536da0`  
**Status:** Spec / plan only — **no app code**, no SQL, no migrations, no `IconName`, no kelyra-qa-loop, no git push.  
**Depends on:** `notes/company/teacher-ux-research.md` (TEACH-UX-R1, 2026-09-03)  
**Also grounded in:** `docs/mvp.md` (M2–M10 loop), `docs/ui-design.md` §3 / §32.7 / §34 / §36, live chrome (`FloatingTabTray`, `ClassTabs`, `HamburgerDrawer`, `AppHeader`, `ChromeProvider`), AVG teacher UI placement (`avg-spec-teacher-ui.md` — Class desk, not Office).

**Audience:** CEO / Chief of Staff review. **Not** an implementation ticket. Do not staff `senior-developer` until Chuck says send.

---

## 0. One-line product law

| Role | Job of the product | What it is not |
|---|---|---|
| **Teacher** | **Class desk** — capture → match → review drafts → assign practice → Approve grade | Not a school office, not a student worksheet skin, not a second Ask app |
| **Superintendent / admin** | **Office** — Feed · Classes · People · Manage · matrix | Not the teacher grade loop |
| **Student** | **Work** — todo / submit / own grades | Not teacher tools |
| **Parent** | **One child note** — progress + messages | Not the grade book |

**CEO bar (from TEACH-UX-R1):** Superintendent and Student feel clear; Teacher must reach that clarity **without** becoming Office or Student.

---

## 1. Problem statement (grounded)

Live teacher chrome stacks **four navigation layers** and **five+ competing primaries**:

| Layer | Live surfaces (teacher) | Noise |
|---|---|---|
| Header | Camera · Search · Messages · ☰ | Capture **also** in tray → double shutter path |
| Floating tray | House · Capture · Inbox · Class · Ask | Five peers; Ask global; Inbox orphaned from desk |
| Class desk tabs | Feed · Today · Week · Needs you · Students · Parents · Gradebook · Heatmap · Assignments · Family | **10** PersonTabs on one class |
| Hamburger | Class switch · Grade book · Parents · Family · Feed (+ office rows if dual-hat / admin bleed) | Duplicates tray + desk |

**Core loop (MVP)** is still right: phone captures; web reviews, assigns, grades. The UI no longer *reads* as that loop — it reads as “many apps sharing one chrome.”

Superintendent office tray (Feed · Classes · People · Manage · Ask) and Student work surfaces stay comparatively single-purpose. Teacher is the outlier.

---

## 2. Before / after IA

### 2.1 BEFORE — Teacher (as shipped)

```
Teacher signed in
├── AppHeader
│   ├── camera (global capture entry)
│   ├── search
│   ├── messages (badge = alerts)
│   └── hamburger
├── FloatingTabTray (5)
│   ├── House  → /class/{id} desk OR / class list
│   ├── Capture → /capture
│   ├── Inbox   → /inbox (unassigned + review queues)
│   ├── Class   → /class/{id}/gradebook (records cluster)
│   └── Ask     → /ask (global agent)
└── When on class desk — ClassTabs (10)
    Feed · Today · This week · Needs you · Students · Parents
    · Gradebook · Heatmap · Assignments · Family
```

**Mental model today:** “Where do I work?” has five answers (House, Inbox, Class, Ask, Capture).  
**Altitude bleed:** shared staff drawer patterns + dual-hat paths can surface office People / Activity / matrix near teacher flows (see research inventory). Pure teacher must not own Office nouns.

### 2.2 AFTER — Teacher v1 target IA

```
Teacher signed in
├── AppHeader (unchanged recipe; see §5)
│   ├── camera  → still proposes only (ui-design law); primary shutter remains tray Capture on phone
│   ├── search · messages · ☰
├── FloatingTabTray (still 5 — no sixth tab)
│   ├── Desk     → active class work surface (Today default)
│   ├── Capture  → /capture (class-aware; stay-on-Capture after save)
│   ├── Needs    → unassigned + drafts waiting Approve (was Inbox; same routes OK)
│   ├── Class    → records cluster home (Students default — not Gradebook-first)
│   └── Ask      → /ask with classId context when a class is active
└── Class desk body — ClassTabs reduced to two altitudes
    Work row (primary):  Today · Needs · Feed
    Class row (records): Students · Assignments · Gradebook · Parents
    Secondary (not default chrome): This week (filter on Today), Heatmap (Gradebook pane),
                                    Family (drawer or Class overflow), Syllabus (AVG path)
```

**Mental model after:**  
1. **Desk** = this class’s work this week.  
2. **Capture** = put work in.  
3. **Needs** = things without a home or waiting you.  
4. **Class** = roster / book / assignments structure.  
5. **Ask** = help *inside* that class (not a parallel desk).

### 2.3 AFTER — leave other hats alone

| Role | v1 change |
|---|---|
| **Superintendent / admin** | **No change** to office tray or matrix. Office class card stays Feed · Teacher · Parents · Students — **not** teacher ClassTabs. |
| **Student** | **No change** in this epic. Do not “fix” student by copying teacher density. |
| **Parent** | **No change** in this epic. |
| **Dual-hat** (teacher+admin, teacher+parent) | Seat switch remains; when seat = teacher, **office tray nouns hide**. Parent “My children” stays drawer-only. |

### 2.4 Before / after comparison table

| Concern | Before | After (v1) |
|---|---|---|
| Primary surface | Split: House vs Inbox vs Class vs Ask | **Desk** owns the week; others are tools |
| ClassTabs count | 10 always-visible | **≤7** default icons; rest demoted |
| Inbox vs Needs you | Two queues, two names | One teacher noun: **Needs** (badge once) |
| Ask | Global peer of Desk | Class-scoped context; still tray-last |
| Office People | Reachable near teacher chrome | **Hidden** on pure teacher seat |
| Capture | Header + tray | Keep both for muscle memory; **one** product rule (propose vs file) unchanged |
| Student skin | Risk if we “simplify” by copying todo UI | **Forbidden** |
| Rewrite | — | **Forbidden** — gate chrome + tabs + copy |

---

## 3. Workflow (teacher day) — target story

### 3.1 Phone (capture-heavy)

1. Open app → **Desk** (single class auto-lands; multi-class picks then lands).  
2. Tap **Capture** → photo/voice → spoken name → match or park.  
3. Stay on Capture for the stack (existing law).  
4. Badge on **Needs** when unassigned or drafts ready.  
5. Optional: open Needs on phone to attach a name; **Approve / assign still prefer web** (MVP M10 / S7).

### 3.2 Web (review-heavy)

1. **Desk → Today**: drafts waiting, who has a gap, light rollup — not a KPI dashboard.  
2. Open student → Approve gaps → Assign practice.  
3. **Class → Gradebook** for grid Approve/score.  
4. **Class → Students** for roster / setup / (later) syllabus entry cards.  
5. **Ask** from desk or tray with **this class** already bound (syllabus import drafts, gap questions) — never auto-publishes grades.

### 3.3 What “clean like Super/Student” means here

- Super is clean because **one altitude** (school).  
- Student is clean because **one job** (my work).  
- Teacher becomes clean by **one altitude per moment** (this class’s desk), not by deleting Capture or the grade book.

---

## 4. v1 scope vs later

### 4.1 Ships in TEACH-UX v1 (IA / chrome only)

| ID | Change | Why |
|---|---|---|
| **T-UX-1** | Strict **role gates** on drawer + tray + home tabs: pure teacher never sees Office People / Manage / Matrix / school-wide Activity as primary chrome | Removes altitude bleed |
| **T-UX-2** | Rename / unify teacher mental model: tray **Inbox → Needs** (route may stay `/inbox`); Desk **Needs you** is the same queue family, not a third product | One noun |
| **T-UX-3** | **ClassTabs default set** cut to Work + Class rows in §2.2; Heatmap only under Gradebook; Family not in default 7 | Density |
| **T-UX-4** | Tray **Class** default target = **Students/setup** (or Class hub), not Gradebook-first | Records ≠ “open the book first” |
| **T-UX-5** | **Ask** receives active `classId` when teacher is on a class path; empty state explains “working in {class}” | Stops parallel-desk feel |
| **T-UX-6** | House/Desk label + header wordmark rules clarified: on desk panes wordmark = **class name**; tray label **Desk** or keep House icon with “Desk” accessibility string | Clarity without new glyphs if needed |
| **T-UX-7** | Hamburger teacher cluster: class list · switch class · Profile · Appearance · Sign out; deep links to Gradebook/Parents only as **secondary**, not competing primaries | Kill duplicate nav |
| **T-UX-8** | Dual-hat: explicit seat; teacher seat chrome === pure teacher | No silent office bleed |
| **T-UX-9** | Copy pass only: phase banners / empty states speak capture → needs → desk → class | No new features |
| **T-UX-10** | Web ≥720: same five destinations in top bar; labels visible (**Desk · Capture · Needs · Class · Ask**) | Mobile/web parity of IA |

### 4.2 Explicitly later (not v1)

| Item | Why later |
|---|---|
| Visual restyle / new design system | This epic is **IA + altitude**, not paint |
| New tray icon count (6+) or Profile-in-tray | ui-design §34 forbids Profile tab |
| Merge Capture into Desk-only (remove tray Capture) | Breaks hallway speed; MVP phone capture |
| Full phone Approve/assign (S7) | Separate should-have |
| AVG Syllabus tab icon | Own AVG tickets; entry via setup card / gradebook banner first |
| Diary / Ledger chrome | Own DIARY epic; drawer only |
| Class landing / public page | Own research track |
| Student tray simplification | Out of teacher epic |
| “Smart” home that mixes diary + desk + office | DR-8 / diary non-goal |
| Global nav rewrite / new shell package | No rewrite |

### 4.3 v1 vs later — one table

| Surface | v1 | Later |
|---|---|---|
| Desk tabs | ≤7 defaults | Syllabus tab icon; optional Week chip |
| Needs / Inbox | One noun, existing routes | Smarter triage, phone Approve |
| Ask | Class context binding + copy | Tool-calling depth (product separate) |
| Capture | Unchanged loop | Split recording (S2), offline (L5) |
| Office on teacher | Hidden | Never on class desk |
| Motion / glass | Keep hide-on-scroll | No Liquid Glass project |

---

## 5. Mobile vs web

| | **Phone** | **Web / tablet (≥720)** |
|---|---|---|
| **Primary job** | Capture stack + glance Needs | Desk review, assign, grade book |
| **Tray** | Floating 5 icons, hide-on-scroll | Top bar under header, same 5, **labels on** |
| **Capture** | Tray primary; header camera = propose only | Header camera optional; keyboard flows OK |
| **Desk** | Today + Needs enough | Full ClassTabs + student pages |
| **Approve / generate assign** | Not required on phone in v1 | Required path |
| **Ask** | Tray last; class-bound when possible | Same; large transcript comfortable |
| **Class records** | Light roster fix OK | Gradebook + assignments home |
| **Non-goal** | Do not ship a separate “mobile IA” | Do not ship a left rail / desktop-only shell |

**Invariant:** same routes and permissions; presentation density differs, not product law.

---

## 6. Explicit non-goals

| Non-goal | Why |
|---|---|
| **Student skin on teacher** | Different job; copying todo chrome would hide Capture/Inbox/Gradebook |
| **Office People / Matrix on class desk** | Wrong altitude; Office owns school directory |
| **Teachers create classes from Desk** (pure teacher) | Office assigns classes; home may list/switch only |
| **Rewrite the app / new navigation framework** | Phased gates on existing `FloatingTabTray`, `ClassTabs`, drawer |
| **New global chrome destinations** | No sixth tray tab; no header Profile |
| **Deleting Ask** | Keep tray-last; fix scope, don’t remove agent |
| **Deleting Capture or matcher rules** | MVP core; matcher still never inserts students |
| **Auto-grade or Ask auto-publish** | Approve remains last click |
| **Visual redesign pass** | Separate; CEO asked clutter/IA |
| **Parent twin merge / multi-child teacher hacks** | Unrelated |
| **Competitor clone (Canvas/Classroom layout)** | Patterns are reference only (research §3) |
| **Staffing implementation before Chuck “send”** | Card law |

---

## 7. Implementation plan (phased; no rewrite)

> Spec only. Each phase becomes its **own** implementation card later. Prefer small PRs. Touch chrome components first; avoid route renames unless cheap.

### Phase A — Altitude locks (lowest risk, highest clarity)

**Goal:** Teacher seat cannot see Office primary chrome.

| Task | Area | Acceptance |
|---|---|---|
| A1 | `FloatingTabTray.tabsFor` | Pure `teacher` never gets office tray keys |
| A2 | `HamburgerDrawer` staff branch | Teacher-only: no People / Activity / Responsibilities / Manage; keep class list + profile + sign out |
| A3 | `index` home for teacher | No office PersonTabs (feed/people/manage) unless seat is office; multi-class = list only |
| A4 | Dual-hat | Documented seat switch; teacher seat === A1–A3 |
| A5 | QA matrix | Teacher / admin / super / dual screenshots or route checklist |

**Out of phase A:** ClassTabs count, Ask binding, copy.

### Phase B — Desk density (ClassTabs + Class tray target)

**Goal:** Open a class → readable work surface.

| Task | Area | Acceptance |
|---|---|---|
| B1 | `CLASS_TABS` default ordered set | Default visible: Today · Needs · Feed · Students · Assignments · Gradebook · Parents (≤7) |
| B2 | Demote | Heatmap only via gradebook `?tab=`; Week as Today filter or overflow; Family via drawer or Class overflow menu — **not** default tenth icon |
| B3 | Tray Class href | Lands Students/setup or neutral Class hub — **not** forced Gradebook |
| B4 | Wordmark | Class panes keep **class name** (ui-design §32.7) |
| B5 | AVG compatibility | Syllabus stays Class-desk altitude; no Office syllabus; entry cards per `avg-spec-teacher-ui` still valid |

### Phase C — Needs unification + Ask context

**Goal:** One waiting queue; Ask is not a second desk.

| Task | Area | Acceptance |
|---|---|---|
| C1 | Tray label/a11y | Inbox → **Needs** (user-facing); `/inbox` route OK |
| C2 | Badge single source | Unassigned + draft-ready count; Desk Needs and tray Needs do not double-count differently |
| C3 | Empty states | Copy ties Capture → Needs → student Approve on web |
| C4 | Ask | Pass/read `classId` from chrome when on `/class/*`; UI shows class name chip; super/office Ask unchanged |
| C5 | Drawer | Remove or demote duplicate “Grade book / Parents” if Class tray covers them (keep searchability via Search) |

### Phase D — Polish & web parity (still no restyle)

| Task | Area | Acceptance |
|---|---|---|
| D1 | Web top bar labels | Desk · Capture · Needs · Class · Ask |
| D2 | Header camera vs tray Capture | Tooltips/copy: header proposes; tray Capture files |
| D3 | Teacher switch-class | `/?switch=1` or drawer only; no office classes tab |
| D4 | Regression | Student + Office trays golden-path unchanged |
| D5 | Docs delta | Short patch note to `docs/ui-design.md` §3.4 / §34 **after** Chuck approves plan (separate docs card OK) |

### Phase dependency graph

```
A (altitude) ──► B (desk tabs) ──► C (Needs + Ask) ──► D (polish)
                     │
                     └── AVG syllabus UI may land in parallel on Class desk
                         but must not restore 10-tab default
```

**Estimated shape (for CoS planning, not a promise):**  
A = 1 small PR · B = 1 PR · C = 1–2 PRs · D = 1 PR.  
No migration. No new packages. Icon renames only if copy requires existing `IconName` (prefer a11y label change over new glyphs).

---

## 8. Suggested future kanban decomposition (do not create until Chuck sends)

| Order | Title | Assignee (suggested) | Parents |
|---|---|---|---|
| 1 | [TEACH-UX-A] Teacher altitude locks (drawer/tray/home) | via kelyra-qa-loop / implementer | this plan approved |
| 2 | [TEACH-UX-B] ClassTabs default cut + Class tray landing | same | A |
| 3 | [TEACH-UX-C] Needs noun + Ask class context | same | B |
| 4 | [TEACH-UX-D] Web labels + capture copy + regression | same | C |
| 5 | [TEACH-UX-DOC] ui-design § patch to match shipped IA | product-manager or designer | D done |

**Do not** open these cards from this ticket. CEO/CoS gate first.

---

## 9. Risks & open questions (for CEO)

| # | Question | PM recommendation if no answer |
|---|---|---|
| Q1 | Tray label **Desk** vs keep **Home/House** icon with new a11y string? | Keep `today` glyph; accessibilityLabel/tooltip **Desk**; avoid new IconName |
| Q2 | Family pane: drawer-only vs Class overflow? | Drawer + keep route; remove from default ClassTabs |
| Q3 | Is `/inbox` rename to `/needs` worth churn? | **No** in v1 — label only |
| Q4 | Dual-hat teachers who want Office + Desk same hour | Seat switch only; never merge trays |
| Q5 | Student tray also grew dense (research gap) | **Separate** card later; not this epic |
| Q6 | Header camera redundant with tray Capture? | Keep both; clarify propose vs file (Amazon Lens pattern already in ui-design) |

**Gaps carried from research (honest):** no live badge telemetry, no screenshot dogfood pack in R1. Phase A/B should include a short dogfood checklist on real teacher seat.

---

## 10. Acceptance checklist (this plan document)

- [x] Before/after IA  
- [x] Workflow phone vs web  
- [x] v1 vs later  
- [x] Mobile vs web  
- [x] Phased implementation tasks (A–D), no rewrite  
- [x] Explicit non-goals (student skin, office People on desk, …)  
- [x] Grounded in TEACH-UX-R1 + live chrome + MVP + ui-design  
- [x] No code, no SQL, no qa-loop  
- [x] Ready for CEO/CoS review; implementation not staffed  

---

## 11. Handoff

| Field | Content |
|---|---|
| **OBJECTIVE** | Teacher IA proposal + sequenced plan for CEO review |
| **CONTEXT** | Teacher chrome denser than Super/Student; class-desk product law |
| **REQUIREMENTS** | Before/after, v1/later, mobile/web, phases, non-goals |
| **CONSTRAINTS** | No code; no rewrite; no student skin; no office on desk |
| **FILES** | `notes/company/teacher-ux-plan.md` (this file); research `notes/company/teacher-ux-research.md` |
| **WORK PERFORMED** | PM synthesis of R1 + live tray/tabs/drawer + MVP/ui-design into reviewable plan |
| **VERIFICATION** | File exists; sections map 1:1 to card acceptance |
| **RESULT** | Plan ready for CEO/CoS |
| **OPEN ISSUES** | Q1–Q6 above; student-tray density deferred |
| **ESCALATION NEEDED** | None for writing; **implementation blocked on Chuck “send”** |
| **RECOMMENDED NEXT ACTION** | CEO/CoS review. If approved, CoS staffs Phase A only. Do not staff senior-developer until Chuck says send. |

---

## 12. Decision summary (PM)

1. **Teacher = class desk product.** Desk is the home; Capture/Needs/Class/Ask are tools.  
2. **Fix altitude before paint.** Hide Office from teacher seat first.  
3. **Cut ClassTabs defaults**, don’t build a new shell.  
4. **One Needs queue** (noun), keep `/inbox` route.  
5. **Ask stays**, but class-bound.  
6. **Non-goals are hard:** no student skin, no office People on desk, no rewrite, no implementation without Chuck.

# TEACH-UX-Q1: Acceptance plan — teacher chrome (not a Build send)

**Date:** 2026-09-04
**Author:** qa-supervisor
**Ticket:** t_f6884e78
**Status:** **PLAN ONLY** — not a Build send, not a release cert, not kelyra-qa-loop.
**Gate:** Implementation remains forbidden until Chuck later says **send**. Developers will not self-certify.

**Depends on (read-only pack):**

| Artifact | Role in this plan |
|---|---|
| `notes/company/teacher-ux-plan.md` (TEACH-UX-P1) | Before/after IA, phases A–D, v1 vs later, non-goals |
| `notes/company/teacher-ux-architecture.md` (TEACH-UX-A1) | Chrome keep/remove contract; seat vs hat; capture primary |
| `notes/company/teacher-ux-security.md` (TEACH-UX-S1) | Must-fix §2.4 (T1–T9); chrome ≠ RLS |
| `notes/company/teacher-ux-research.md` (TEACH-UX-R1) | Problem framing (context only) |

**Non-goals of this ticket**

- No app code, migrations, Edge, IconName pipeline, or SQL apply.
- No `kelyra-qa-loop` / `author-qa-loop`.
- No release sign-off and no eng staffing authorization.
- No inventing sixth tray tab, student skin, office People on desk, seat SQL table, or `/inbox` → `/needs` route rename.

---

## 0. Scope — what "good" means later

When Chuck authorizes implementation, a **future** build loop is accepted only if:

1. Every **P0** row in this matrix has **evidence** (automated test, JWT fixture, or scripted UI check with artifact).
2. Every **TEACH-UX-S1 §2.4 must-fix** is covered (see §3.1).
3. Explicit **non-acceptance** items (§4.2) are regression-guarded.
4. CoS does **not** treat green typecheck / screenshot-of-tray alone as product release; dual-hat seat, Search directory, Ask chip, and altitude walls need named evidence.
5. Developers do **not** self-certify the epic — CEO send + this plan + loop evidence.

Until then: this file is the contract for that future loop.

### 0.1 Product laws (always fail closed)

| ID | Law | Source |
|---|---|---|
| L1 | Teacher = **class desk** product (capture → match → review drafts → assign → Approve). Not Office. Not Student. Not a second Ask app. | P1 §0, A1 §0 |
| L2 | **One altitude per moment.** Teacher seat chrome === pure teacher. Never merge office + teacher trays. | A1 §2, S1 T2 |
| L3 | **Chrome is not security.** Hiding People / Activity / Matrix does not revoke JWT. Server walls stay (`class_teacher_of`, `isOfficeRole`, Ask after `getUser`). | S1 §0, T1 |
| L4 | Capture loop stays **primary**. Stay-on-Capture after save. Header camera **proposes**; tray Capture **files**. Matcher never inserts a student. | A1 §0/§3, MVP |
| L5 | **No class-create** on Teacher (home, drawer, Ask, Capture). `canCreateClass` stays `isOfficeRole`. Switch-class only. | A1 §3.2, S1 T6 |
| L6 | **One `/ask`**, tray-last. Bind `classId` chip when on class path. Chip ≠ SQL. No extra Ask on ClassTabs/header/FAB. | A1 §0, S1 T5 |
| L7 | Tray stays **five slots**. No sixth. No Profile-in-tray (ui-design §34). | A1 §0, P1 T-UX-10 |
| L8 | ClassTabs default **≤7**: Today · Needs · Feed · Students · Assignments · Gradebook · Parents. Demote Week/Heatmap/Family — do not delete routes. | P1 T-UX-3, A1 §2 |
| L9 | One waiting noun: tray **Needs** (label; `/inbox` route OK). Badge = **count**, not names/scores. | P1 T-UX-2, S1 T7 |
| L10 | Tray **Class** lands Students/setup or Class hub — **not** Gradebook-first. | P1 T-UX-4, A1 §3.2 |
| L11 | `chrome.role` = **explicit seat**, not `isTeacherRole` first (`also_teacher` must not force teacher tray). | A1 §4, S1 T2 |
| L12 | Nothing is a grade until Approve. Model keys server-side only. No `EXPO_PUBLIC_*`. No rewrite / new shell. | AGENTS + A1 §0 |

### 0.2 In scope vs out of scope

**In scope (must prove after CEO send):** Phase A–D chrome gates on existing `FloatingTabTray`, `CLASS_TABS`, `HamburgerDrawer`, `ChromeProvider` seat, teacher home, Ask class chip, web top-bar labels, dual-hat seat switch, Search class-scoped on teacher seat, S1 must-fix, Office/Student trays unchanged.

**Out of scope (do not fail v1 for missing):** visual restyle; sixth tray tab; `/inbox` route rename; full phone Approve/assign (S7); AVG Syllabus default ClassTab; Diary/Ledger tray keys; student tray simplification; left rail / new shell; seat SQL table / JWT claims; Liquid Glass.

## 1. Tray / tabs / capture loop

**Legend**

| Sev | Meaning |
|---|---|
| **P0** | Blocks CEO-authorized ship / loop pass |
| **P1** | Must fix before teacher-facing release |
| **P2** | Track; may defer with CoS note |

| Type | How to evidence later |
|---|---|
| **U** | Unit (tabsFor keys, CLASS_TABS order, policy pure fns) |
| **I** | Integration / route fixtures with JWT + profile hats |
| **UI** | Scripted or dogfood UI on phone tray + web ≥720 |
| **S** | Security static + seat JWT matrix (chrome ≠ RLS) |
| **R** | Regression vs frozen Office / Student / Capture / Approve |

### 1.1 Floating tray (teacher seat)

| ID | Sev | Type | Scenario | Expected |
|---|---|---|---|---|
| TR-01 | P0 | U/UI | Teacher seat tray keys | Exactly **five**: Desk · Capture · Needs · Class · Ask (last). No sixth. No Profile. |
| TR-02 | P0 | U | Pure teacher never gets office tray keys | No Feed/Classes/People/Manage office set on teacher seat |
| TR-03 | P0 | UI | Desk / House destination | Active class work surface; Today default when a class is active |
| TR-04 | P0 | UI | Multi-class teacher | Desk lands list or last class then Today — not office Classes tab |
| TR-05 | P0 | UI | Capture tray | `/capture` class-aware; **stay-on-Capture** after save |
| TR-06 | P0 | UI | Needs label | User-facing **Needs** (a11y/tooltip); route may stay `/inbox` |
| TR-07 | P0 | U/UI | Class tray href | Lands Students/setup or Class hub — **not** forced `/gradebook` |
| TR-08 | P0 | UI | Ask tray | One `/ask`; when on `/class/*`, shows class name chip / context |
| TR-09 | P1 | UI | Web ≥720 top bar | Same five destinations; **labels on**: Desk · Capture · Needs · Class · Ask |
| TR-10 | P1 | UI | Desk a11y | Keep `today` glyph unless Chuck wants IconName; accessibilityLabel/tooltip **Desk** |
| TR-11 | P1 | U | Badge single source | Unassigned + draft-ready **count**; tray Needs and desk Needs do not disagree |
| TR-12 | P0 | S/UI | Badge payload | Numeric count only — **not** student names or draft scores |

### 1.2 ClassTabs (desk density)

| ID | Sev | Type | Scenario | Expected |
|---|---|---|---|---|
| CT-01 | P0 | U | Default visible set | ≤7: Today · Needs · Feed · Students · Assignments · Gradebook · Parents |
| CT-02 | P0 | U/UI | This week | Not default icon; Today filter or overflow only |
| CT-03 | P0 | U/UI | Heatmap | Not default icon; Gradebook `?tab=` (or pane) only |
| CT-04 | P0 | U/UI | Family | Not default ClassTab; drawer / Class overflow; route stays |
| CT-05 | P0 | U | `OFFICE_CLASS_TABS` untouched | Feed · Teacher · Parents · Students — never merged into teacher set |
| CT-06 | P0 | UI | Wordmark on class panes | **Class name** (ui-design §32.7) |
| CT-07 | P1 | UI | AVG Syllabus | Not v1 default ClassTab; setup card / gradebook banner path still valid |
| CT-08 | P1 | R | Demoted route deep link | Teacher of that class may still open Heatmap/Family/Week — routes not deleted |
| CT-09 | P0 | S | Demotion ≠ new audience | Student/parent do not gain demoted teacher routes because tabs moved |

### 1.3 Capture loop + header

| ID | Sev | Type | Scenario | Expected |
|---|---|---|---|---|
| CAP-01 | P0 | UI/R | Phone capture stack | Tray Capture primary; spoken name → match or park |
| CAP-02 | P0 | R | Matcher | **Never** inserts a student |
| CAP-03 | P0 | UI | Stay-on-Capture | After save, remains on Capture for next sheet |
| CAP-04 | P0 | UI | Header camera | Still present; **propose only** (copy/tooltip in Phase D) |
| CAP-05 | P0 | U/R | No merge Capture into Desk-only | Tray Capture slot remains |
| CAP-06 | P0 | R | Approve law | Nothing is a grade until teacher Approves (unchanged) |
| CAP-07 | P1 | UI | Web capture | Header camera optional; keyboard flows OK; same product law |

### 1.4 Needs unification

| ID | Sev | Type | Scenario | Expected |
|---|---|---|---|---|
| ND-01 | P0 | UI | One noun | Tray **Needs** + desk Needs are same queue family — not three products |
| ND-02 | P0 | U | Route | `/inbox` OK in v1; no forced rename to `/needs` |
| ND-03 | P1 | UI | Empty states | Copy ties Capture → Needs → student Approve on web |
| ND-04 | P1 | UI | Phone | Glance/badge + light attach OK; Approve/assign still prefer web (MVP) |

### 1.5 Ask class context

| ID | Sev | Type | Scenario | Expected |
|---|---|---|---|---|
| ASK-01 | P0 | UI | Class path | Ask shows working-in-{class} chip when `classId` active |
| ASK-02 | P0 | U/S | One surface | No Ask on ClassTabs, header, second tray key, or desk FAB |
| ASK-03 | P0 | S | Chip ≠ SQL | `class_id` in tools still server-checked; no new Ask tools in this epic |
| ASK-04 | P0 | S | Policy map | Do not weaken `teacherSeatOnly` / `officeOnly`; filter after `getUser` + profile — never `body.role` |
| ASK-05 | P0 | S | Office Ask | Super/office Ask unchanged when seat = office |
| ASK-06 | P1 | S | Prompt hygiene | Class name + id; no roster dump, sibling names, scores because chrome “has a class” |
| ASK-07 | P0 | S | Keys | Server-side only; never `EXPO_PUBLIC_*` |
| ASK-08 | P0 | R | Auto-publish | Ask never auto-publishes grades |

### 1.6 Hamburger (teacher cluster)

| ID | Sev | Type | Scenario | Expected |
|---|---|---|---|---|
| HB-01 | P0 | UI | Teacher cluster | Who I am · classes I teach · switch class · Profile · Appearance · Sign out |
| HB-02 | P0 | UI/S | No office nouns on teacher seat | No People / Activity / Responsibilities / Manage as primary |
| HB-03 | P0 | UI | No class-create | No New class; “Another class” = `/?switch=1` only |
| HB-04 | P1 | UI | Gradebook / Parents / Family | Demoted if Class tray covers them; Search still finds **class-scoped** destinations |
| HB-05 | P1 | UI | Drawer Feed (pure teacher) | Demoted; Desk Feed tab enough |
| HB-06 | P0 | UI | Dual-hat parent row | “My children” drawer-only OK; not teacher tray |

## 2. Not Office / not Student

Altitude walls are first-class acceptance, equal to tray cosmetics. Live bugs called out in S1 (T2/T3/T4) are **in production chrome** — fix only if Chuck sends TEACH-UX; this plan names the evidence required when that happens.

### 2.1 Pure teacher vs Office

| ID | Sev | Type | Scenario | Expected |
|---|---|---|---|---|
| OFF-01 | P0 | U/UI | Teacher home | No office PersonTabs (feed/people/manage) as primary chrome |
| OFF-02 | P0 | U | Tray | Pure teacher never receives office tray key set |
| OFF-03 | P0 | UI/S | Drawer | No People / Activity / Responsibilities / Manage on teacher seat |
| OFF-04 | P0 | S | Deep link `/?tab=people`, `/activity`, `/admin/matrix` | UI may omit; **JWT tests** still prove data gates — chrome hide is not RLS (S1 T1) |
| OFF-05 | P0 | S | Office RPCs | Stay `isOfficeRole` / `is_school_admin` — **do not** widen to `also_teacher` |
| OFF-06 | P0 | U | Class-create | `canCreateClass` remains office-only; chrome PR must not touch create_class tools |
| OFF-07 | P0 | U | `OFFICE_CLASS_TABS` | Unchanged for office class card |
| OFF-08 | P1 | R | Super/admin tray | Golden path Feed · Classes · People · Manage · Ask unchanged when seat = office |

### 2.2 Dual-hat seat (admin+teacher, teacher+parent)

| ID | Sev | Type | Scenario | Expected |
|---|---|---|---|---|
| X-01 | P0 | U/S | `chrome.role` | Follows **explicit seat**, not `isTeacherRole(profile)` first |
| X-02 | P0 | UI | Seat = teacher | Chrome === pure teacher (TR-* + OFF-* + CT-*) |
| X-03 | P0 | UI | Seat = office | Live office tray + `OFFICE_CLASS_TABS`; never merge with Capture/Needs |
| X-04 | P0 | S | Same-uid residual | Office JWT may still *call* office RPCs on teacher seat — product must not *offer* office chrome/Ask tools until seat switch (accept residual; cross-user leaks remain P0) |
| X-05 | P0 | UI/S | Drawer office inject | Gate on **office seat** (or `isOfficeRole` **and** seat=office), not `isAdminRole` while seat=teacher |
| X-06 | P0 | UI | Teacher+parent | “My children” drawer-only; teacher desk queries must not UNION `parent_students` |
| X-07 | P0 | I/S | Parent seat | Must not SELECT taught-class drafts/gradebook because they also teach |
| X-08 | P0 | S | Twins | Unchanged fail-closed; no new parent payload from this epic |
| X-09 | P1 | UI | Seat switch | Reloads chrome; no silent cross-hat residual tray keys |
| X-10 | P0 | S | No `current_seat()` table | AsyncStorage/client seat OK in v1; no JWT custom claims; no Office `/activity` “switched seat” audit theater |

### 2.3 Search (must not become school directory)

| ID | Sev | Type | Scenario | Expected |
|---|---|---|---|---|
| SE-01 | P0 | I/S | Teacher seat Search | Class-scoped: roster / inbox / assignments / class parents of **active class** |
| SE-02 | P0 | I/S | Teacher with no `classId` / after switch | **Not** `listDirectory()` via `isStaffRole && !classId` |
| SE-03 | P0 | S | School directory | `listDirectory` stays **office seat** only |
| SE-04 | P1 | S | Recents cache | No scores; no other-class rosters in AsyncStorage recents |
| SE-05 | P1 | UI | “Search still finds demoted items” | Means Gradebook/Parents/Family of **taught class** — not Office People |

### 2.4 Not Student skin

| ID | Sev | Type | Scenario | Expected |
|---|---|---|---|---|
| STU-01 | P0 | U/UI | Teacher tray | Must retain Capture · Needs · Class · Ask — **not** copy `/todo` student IA |
| STU-02 | P0 | R | Student tray | **Unchanged** in this epic |
| STU-03 | P0 | R | Parent chrome | **Unchanged** except dual-hat drawer row already allowed |
| STU-04 | P1 | R | Student density debt | Deferred separate card — not TEACH-UX v1 scope creep |

### 2.5 Phase map (evidence owners after send)

| Phase | Plan tasks | Must prove (matrix IDs) |
|---|---|---|
| **A** Altitude locks | A1–A5 | TR-02, OFF-*, X-01…X-05, X-10, HB-02/03 |
| **B** Desk density | B1–B5 | CT-*, TR-07, CAP-05 |
| **C** Needs + Ask | C1–C5 | TR-06, ND-*, ASK-*, TR-11/12 |
| **D** Polish + regression | D1–D5 | TR-09/10, CAP-04, OFF-08, STU-02, R-* |

## 3. Evidence (tests, seat JWT, dogfood)

### 3.1 TEACH-UX-S1 must-fix → acceptance map

Future loop fails if any **P0** row lacks evidence. Map 1:1 to TEACH-UX-S1 §2.4.

| ID | Sev | Type | Case (S1 §2.4) | Evidence later |
|---|---|---|---|---|
| SEC-01 | P0 | U/S | Chrome.role = explicit seat, not `isTeacherRole` first; never merge trays | Unit: dual-hat admin+teacher can select office seat; teacher seat tray keys === pure teacher; no merged key set |
| SEC-02 | P0 | UI/S | Teacher-seat drawer: no People / Activity / Responsibilities / class-create; parent row OK | UI fixture + static drawer branch review |
| SEC-03 | P0 | I/S | Teacher-seat Search: class-scoped only; not `listDirectory` via `isStaffRole && !classId` | Integration: teacher JWT no classId → no school directory rows |
| SEC-04 | P0 | S | Ask: one `/ask`; chip ≠ SQL; do not weaken `teacherSeatOnly` / `officeOnly` | Policy twin tests client+Edge; no new tool names; stuffed `classId` still SQL-gated |
| SEC-05 | P0 | S/R | No matcher insert, no `canCreateClass` change, no sixth tab, no student skin | Diff review + existing createClass/matcher tests still green; tray length === 5 |
| SEC-06 | P0 | I/S | Demoted tabs ≠ revoked data for teacher of class; ≠ new data for family/student | Teacher deep-link OK; student/parent JWT still denied teacher-only routes |
| SEC-07 | P0 | U/S | Badge counts not names/scores; no JWT in query string on retargeted hrefs | Unit badge DTO; href audit |
| SEC-08 | P0 | S | No `current_seat()` table; no Office `/activity` for seat switches | Schema/diff: zero seat migrations; activity feed unchanged |
| SEC-09 | P0 | S | Client hide is not RLS; tests use JWT, not screenshots of the tray | JWT matrix for directory/activity/matrix independent of tray config |

### 3.2 Normative future qa-loop checklist (do not run now)

Copy into any authorized TEACH-UX qa-loop request:

1. Pure teacher JWT: tray five keys Desk/Capture/Needs/Class/Ask; no office People/Manage keys.
2. Dual-hat admin+teacher: seat switch yields teacher chrome === pure teacher; office seat === office tray; **never** both.
3. Dual-hat drawer on teacher seat: no People/Activity/Responsibilities; no class-create.
4. Teacher Search with and without `classId`: never `listDirectory` school firehose on teacher seat.
5. `CLASS_TABS` default ≤7 ordered set; Week/Heatmap/Family not default icons; routes still resolve for teacher of class.
6. Tray Class href ≠ forced gradebook-first.
7. Needs label + `/inbox` route; badge is count-only.
8. Ask on `/class/{id}`: class chip visible; no second Ask surface; policy maps unchanged (`officeOnly` / `teacherSeatOnly`).
9. Capture stay-on-Capture; matcher still never inserts student; header camera propose-only copy present after Phase D.
10. Student tray + Office tray golden paths unchanged (screenshot or route checklist).
11. Office RPCs / matrix / activity: pure teacher data access still denied by server (not by missing tab).
12. No SQL seat table; no sixth tray tab; no student `/todo` skin on teacher; no `EXPO_PUBLIC_*` keys.

### 3.3 Evidence types by surface

| Surface | Preferred evidence |
|---|---|
| `FloatingTabTray.tabsFor` | Unit key lists per seat + role |
| `CLASS_TABS` / `OFFICE_CLASS_TABS` | Unit default order + length; office set freeze |
| `ChromeProvider` seat | Unit/integration: `also_teacher` does not force teacher without seat |
| `HamburgerDrawer` | UI/static: office inject gated on seat |
| Search | Integration JWT: teacher vs office directory |
| Ask policy | Client + Edge twin map tests (no new tools; no weaken flags) |
| Capture / matcher | Existing regression suite + stay-on-Capture UI |
| Demoted routes | Deep-link teacher OK; family/student unchanged |
| Web ≥720 | UI labels Desk · Capture · Needs · Class · Ask |

### 3.4 Dogfood scripts (after CEO send — not this ticket)

| Script | Hats | Pass bar |
|---|---|---|
| DF-1 Pure teacher day | Teacher phone + web | Desk Today → Capture stack → Needs badge → Class Students → Gradebook Approve; no People noun |
| DF-2 Dual-hat seat | Admin+teacher | Switch to teacher: Capture present, People gone; switch to office: office tray, no Capture-as-peer of People mash |
| DF-3 Search wall | Teacher no class / after switch | Search does not list school People directory |
| DF-4 ClassTabs density | Teacher desk | ≤7 defaults; Heatmap only via Gradebook; Family not tenth icon |
| DF-5 Ask chip | Teacher on class | Ask shows class name; does not auto-grade; office Ask on office seat unchanged |
| DF-6 Student/Office regression | Student + Super | Their trays/golden paths unchanged |

### 3.5 Regression guards (non-acceptance if broken)

| ID | Sev | Guard |
|---|---|---|
| R-01 | P0 | Capture → match → review → Approve loop still works; no grade without Approve |
| R-02 | P0 | Matcher still never inserts a student |
| R-03 | P0 | Office tray + `OFFICE_CLASS_TABS` unchanged for office seat |
| R-04 | P0 | Student tray / parent chrome not rewritten by this epic |
| R-05 | P0 | No merge of office + teacher trays |
| R-06 | P0 | No class-create on teacher surfaces; `canCreateClass` untouched |
| R-07 | P0 | No new Ask tools; no Ask auto-publish grades |
| R-08 | P0 | No `EXPO_PUBLIC_*` model keys |
| R-09 | P1 | Diary/Ledger remain hamburger, not tray (DIARY-A1) |
| R-10 | P1 | AVG syllabus stays Class-desk altitude; not Office; not forced 10th default tab |
| R-11 | P1 | No left rail / new navigation framework rewrite |
| R-12 | P1 | No `/inbox` → `/needs` route rename required in v1 |

### 3.6 Process adequacy (how a future loop must run)

#### 3.6.1 Not this ticket

- Do **not** staff implementer/QA/verify children from Q1.
- Do **not** call `kelyra-qa-loop` until Chuck says **send**.
- Do **not** self-certify on green typecheck or tray screenshots alone.

#### 3.6.2 After CEO send (recommended loop shape)

| Phase | Owner pattern | Must produce |
|---|---|---|
| A — altitude locks | kelyra-qa-loop | Seat in ChromeProvider; tray/drawer/home gates; OFF-*/X-*/SEC-01/02 |
| B — ClassTabs + Class land | Same or follow-on | CT-*, TR-07 |
| C — Needs + Ask context | Same | ND-*, ASK-*, SEC-04 |
| D — web labels + capture copy + regression | Same | TR-09, CAP-04, STU-02, OFF-08, R-* |
| Security pass | Loop security + this matrix | SEC-01…09 + S1 T1–T9 named |
| CoS release read | chief-of-staff | Compares evidence to this plan; no silent scope add |

#### 3.6.3 Evidence package (minimum for CoS when shipping)

1. Automated tests mapped to matrix IDs (TR/CT/CAP/ND/ASK/HB/OFF/X/SE/STU/SEC/R).
2. Seat fixtures: pure teacher; admin+teacher both seats; teacher+parent drawer.
3. Search JWT dump (redacted): teacher seat without classId ≠ directory firehose.
4. Diff statement: no matcher/createClass/Ask-policy weaken; no seat SQL; tray length 5.
5. Dogfood notes DF-1…DF-6.
6. Open P1/P2 waivers explicitly named — none silent.
7. Screenshot pack optional **in addition to** JWT tests — never instead of.

#### 3.6.4 Recurring defect watch (post-ship)

1. `isTeacherRole` / `also_teacher` forcing teacher tray again  
2. Drawer `isAdminRole` inject while seat=teacher  
3. Search `isStaffRole && !classId` directory firehose  
4. Tray Class href regressing to gradebook-first  
5. ClassTabs creeping back past 7 defaults  
6. Ask chip treated as authorization  
7. Student-skin “simplify” PRs deleting Capture/Needs  
8. Sixth tray tab / Profile-in-tray drift  

## 4. Acceptance

**Audience:** CEO / Chief of Staff. **This ticket is not a send.**

### 4.1 This ticket (TEACH-UX-Q1)

| Criterion | Status |
|---|---|
| `notes/company/teacher-ux-acceptance.md` exists for CEO/CoS | **Met by this file** |
| Grounded in TEACH-UX-P1 / A1 / S1 (no invented product law) | **Met** |
| P0 matrix covers tray, tabs, capture, Needs, Ask, altitude, dual-hat, Search, S1 must-fix | **Met** |
| Explicit non-acceptance / regression guards | **Met** (§3.5, §4.2) |
| Future loop process + evidence package | **Met** (§3.6) |
| No app code, SQL, migrations, Edge, IconName, Ask registration | **Met** — plan only |
| No `kelyra-qa-loop` / release cert / eng staffing | **Met** |
| Not a Build send | **Met** |

### 4.2 Explicit non-acceptance (instant fail)

Any of the following in a candidate build = **fail**, regardless of other greens:

1. Merged office + teacher trays (People next to Capture) or `isTeacherRole` still forces teacher chrome for dual-hat office.
2. Teacher-seat drawer still injects People / Activity / Responsibilities / class-create via `isAdminRole` while seat=teacher.
3. Teacher-seat Search calls `listDirectory` / school People firehose (`isStaffRole && !classId`).
4. Chrome-only hide treated as the sole People/Activity/matrix **data** gate (no JWT evidence).
5. Sixth tray tab, Profile-in-tray, or student `/todo` skin replacing Capture/Needs/Class.
6. Class-create on Teacher; `canCreateClass` / matcher insert paths touched.
7. Extra Ask surface (ClassTabs/header/FAB) or Ask auto-publish grades; weakened `teacherSeatOnly` / `officeOnly`.
8. Ask `classId` chip used as SQL authorization.
9. Tray Class forced Gradebook-first again; ClassTabs default >7 with Week/Heatmap/Family restored as always-on.
10. Needs badge leaking names/scores; JWT in query strings on retargeted hrefs.
11. `current_seat()` SQL table / seat JWT claims / Office activity “switched seat” theater in v1.
12. Office or Student golden chrome rewritten by this epic.
13. `EXPO_PUBLIC_*` model keys.
14. Implementation started without CEO written **send**.
15. Developers self-certify without this plan + loop evidence.

### 4.3 Gate status

| Item | Status |
|---|---|
| Spec pack on disk (P1, A1, S1, R1) | Yes |
| This acceptance plan | **Yes — this file** |
| Implementation authorized | **NO** |
| kelyra-qa-loop for teacher chrome | **Forbidden** until CEO send |
| Self-certify by developers | **Forbidden** |
| Eng staffing | **Hold** — Phase A only after send |

### 4.4 Traceability (spec → matrix)

| Spec requirement | Matrix IDs |
|---|---|
| T-UX-1 role gates / altitude | OFF-*, X-*, SEC-01/02/09 |
| T-UX-2 Needs noun | ND-*, TR-06, TR-11/12 |
| T-UX-3 ClassTabs ≤7 | CT-01…04, CT-08 |
| T-UX-4 Class tray landing | TR-07 |
| T-UX-5 Ask classId | ASK-*, SEC-04 |
| T-UX-6 Desk label / wordmark | TR-03, TR-10, CT-06 |
| T-UX-7 Hamburger cluster | HB-* |
| T-UX-8 Dual-hat seat | X-*, SEC-01 |
| T-UX-9 Copy pass | ND-03, CAP-04 |
| T-UX-10 Web labels | TR-09 |
| Capture primary / matcher | CAP-*, R-01/02 |
| No class-create | OFF-06, HB-03, R-06, SEC-05 |
| No student skin / no office on desk | STU-*, OFF-*, L1/L2 |
| Search directory wall | SE-*, SEC-03 |
| S1 §2.4 must-fix 1–9 | SEC-01…09 |
| Phases A–D | §2.5, §3.6.2 |
| Frozen Office/Student/Capture | R-01…R-12, DF-6 |

### 4.5 Decisions (this ticket)

1. Acceptance is a **matrix + laws + non-acceptance list**, not “tray looks cleaner.”
2. **Altitude / dual-hat / Search** are P0 evidence domains equal to ClassTabs cosmetics.
3. **Chrome ≠ RLS** — JWT fixtures mandatory; screenshots optional add-on.
4. TEACH-UX-S1 §2.4 must-fix are incorporated by reference as mandatory future loop cases.
5. Plan only — no code, no loop, no SQL, no git push from this card.

### 4.6 Open issues (do not block this plan; still block ship if unresolved at send)

| # | Issue | Owner at send |
|---|---|---|
| 1 | Tray label **Desk** vs House glyph + a11y only (PM Q1) | PM / CEO — Architect: keep `today` glyph |
| 2 | Family: drawer-only vs Class overflow (PM Q2) | Architect: drawer-only in v1 |
| 3 | `/inbox` rename to `/needs`? | **No** in v1 (label only) |
| 4 | Live T2/T3/T4 production chrome bugs | Fix only if Chuck sends TEACH-UX |
| 5 | Student tray density | Separate epic — not this one |

### 4.7 Sources

- TEACH-UX-P1 `notes/company/teacher-ux-plan.md`
- TEACH-UX-A1 `notes/company/teacher-ux-architecture.md`
- TEACH-UX-S1 `notes/company/teacher-ux-security.md`
- TEACH-UX-R1 research (context)
- Live ground: `FloatingTabTray`, `CLASS_TABS`, `HamburgerDrawer`, `ChromeProvider`, `askToolPolicy.ts`, `docs/ui-design.md` §3/§34
- Prior QA plan shape: `notes/company/class-landing-acceptance.md`, `calendar-acceptance.md`

---

**RECOMMENDED NEXT ACTION:** CoS/CEO review of the teacher-chrome pack (plan + architecture + security + this acceptance). **Do not** implement. **Do not** run kelyra-qa-loop. Hold `senior-developer` until Chuck says send. If approved, CoS staffs **Phase A only**.

### Handoff

- **OBJECTIVE:** Release-level acceptance plan for teacher chrome v1 (evidence contract if CEO later says send).
- **CONTEXT:** TEACH-UX-P1/A1/S1; dual-hat seat; Search directory; Capture primary; ClassTabs cut; chrome ≠ RLS.
- **WORK PERFORMED:** Wrote `notes/company/teacher-ux-acceptance.md` (laws L1–L12, tray/tabs/capture/Needs/Ask matrices, altitude/dual-hat/Search walls, SEC map, process, non-acceptance, gate).
- **VERIFICATION:** File on disk; no SQL; no app code; no kelyra-qa-loop.
- **RESULT:** Plan only — ready for CEO/CoS; not implementation.
- **OPEN ISSUES:** §4.6
- **ESCALATION NEEDED:** No unless CEO rejects seat model or forces student-skin simplify.
- **RECOMMENDED NEXT ACTION:** CEO/CoS review; hold eng staffing and qa-loop.

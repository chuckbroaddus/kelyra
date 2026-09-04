# TEACH-UX-A1: Architecture — teacher chrome

**Date:** 2026-09-04
**Author:** software-architect (Kelyra)
**Card:** TEACH-UX-A1 `t_c8b70d0e` · Plan: `notes/company/teacher-ux-plan.md` · Research: `notes/company/teacher-ux-research.md`
**Status:** Architecture only — **no SQL**, no app code, no kelyra-qa-loop, no git push.
**Live ground:** `FloatingTabTray.tabsFor`, `CLASS_TABS` / `OFFICE_CLASS_TABS`, `HamburgerDrawer` staff branch, `ChromeProvider` role, `AppHeader`, `docs/ui-design.md` §3 / §34 / §36, `docs/mvp.md` phone capture / web review.

**Gate:** Do not staff `senior-developer` / `kelyra-qa-loop` until Chuck says send.

---

## 0. Law

Teacher = **class desk** (capture → match → review drafts → assign practice → Approve). Not Office. Not Student. Not a second Ask app.

| Role | Job of the product | Chrome altitude |
|---|---|---|
| **Teacher** | This class’s work loop | Class desk + Capture + Needs |
| **Superintendent / admin** | School directory / matrix | Office tray (Feed · Classes · People · Manage · Ask) |
| **Student** | My work | Todo / work — **do not copy onto Teacher** |

**CEO bar:** Teacher must match Super/Student *clarity* without becoming Office or Student.

| Question | Answer |
|---|---|
| New shell / rewrite? | **No.** Gate existing tray, tabs, drawer, header. |
| Sixth tray tab / Profile-in-tray? | **No.** ui-design §34. |
| Extra Ask surface? | **No.** One `/ask`. Bind `classId`; do not add Ask to ClassTabs or header. |
| Class-create on Teacher? | **No.** Office owns `canCreateClass`. |
| Capture loop? | **Primary.** Stay-on-Capture after save. Matcher never inserts students. |
| SQL / schema? | **None.** Chrome + seat only. |
| Implementation ready? | **NO until CEO yes.** |

## 1. Current chrome (problem)

Four stacked nav layers. Five competing primaries. Dual-hat altitude bleed.

### 1.1 Live teacher stack (code)

| Layer | File | Teacher today |
|---|---|---|
| Header | `AppHeader` | Camera · Search · Messages · ☰. Camera **proposes** (ui-design). |
| Tray | `FloatingTabTray.tabsFor` (fallback after office/student/parent) | Home (`today` → `/class/{id}`) · **Capture** · **Inbox** · **Class** (`/gradebook`) · Ask (`Kelyra` → `/ask`) |
| Class desk | `CLASS_TABS` (10) | Feed · Today · This week · Needs you · Students · Parents · Gradebook · Heatmap · Assignments · Family |
| Drawer | `HamburgerDrawer` `staff` union | Class list · Another class · Grade book · Parents · Family update · Feed (non-super) · dual-hat parent · Sign out |

Office class card is a **different** set (`OFFICE_CLASS_TABS`: Feed · Teacher · Parents · Students). Do not merge.

### 1.2 Why it fails the CEO bar

- Super is one altitude (school). Student is one job (my work). Teacher answers “where do I work?” five ways (House, Inbox, Class, Ask, Capture) **plus** ten desk icons.
- Capture is duplicated (header + tray) without a spoken rule in chrome copy.
- Inbox (tray) vs Needs you (desk) are two nouns for one waiting family.
- Tray **Class** hard-lands Gradebook (`href: .../gradebook`), so records = “open the book.”
- `ChromeProvider` sets `role: 'teacher'` whenever `isTeacherRole(profile)` (includes `also_teacher`). Dual-hat **cannot sit in Office** — teacher tray wins. That is the altitude bug.
- Drawer `staff = teacher \|\| administrator \|\| superintendent`, then `isAdminRole` injects People / Activity / Responsibilities. Pure teacher must never own those nouns.

### 1.3 What is *not* the problem

Capture itself. Matcher. Approve-as-last-click. Five-slot tray. Hamburger identity row. Office tray for office seats. Student tray. Those stay.

## 2. Target IA

Teacher seat (v1). Same five tray slots. Same routes unless noted. Clarity = **one altitude per moment**.

```
Teacher signed in (seat = teacher)
├── AppHeader (recipe unchanged)
│   ├── camera  → propose only
│   ├── search · messages · ☰
├── FloatingTabTray (still 5 — no sixth)
│   ├── Desk     → active class work (Today default)
│   ├── Capture  → /capture (class-aware; stay-on-Capture after save)
│   ├── Needs    → unassigned + drafts waiting Approve (label; /inbox OK)
│   ├── Class    → records cluster (Students/setup default — not Gradebook-first)
│   └── Ask      → /ask with classId when a class is active (tray-last)
└── Class desk — two altitudes, ≤7 default PersonTabs
    Work:  Today · Needs · Feed
    Class: Students · Assignments · Gradebook · Parents
    Not default chrome: This week (Today filter), Heatmap (Gradebook pane),
                        Family (drawer / Class overflow), Syllabus (AVG path)
```

Mental model: **Desk** = this class’s week. **Capture** = put work in. **Needs** = waiting you. **Class** = roster / book / structure. **Ask** = help inside that class.

| Other hats | v1 |
|---|---|
| Super / admin | **No change** to office tray or `OFFICE_CLASS_TABS`. |
| Student / Parent | **No change** in this epic. |
| Dual-hat | **Seat switch.** Teacher seat chrome === pure teacher. Office nouns hide. Parent “My children” stays drawer-only. |

Phone: Capture stack + glance Needs. Web ≥720: same five destinations, **labels on** (Desk · Capture · Needs · Class · Ask). Approve / assign remain web-primary (MVP). Same routes and permissions; density differs, not product law. No left rail. No second mobile IA.

## 3. What to delete vs keep

This is the chrome contract. **Keep the components.** Change *who sees what* and *which keys are default*.

### 3.1 Keep (do not remove)

| Surface | Keep | Rule |
|---|---|---|
| `AppHeader` | Camera · Search · Messages · ☰ | Camera proposes; tray Capture files. Copy/tooltip only in polish. |
| `FloatingTabTray` | **Five** teacher slots | Desk · Capture · Needs · Class · Ask last. No sixth. No Profile tab. |
| Capture loop | `/capture`, stay-on-Capture, spoken name, matcher | Phone primary. Matcher **never** inserts a student. |
| Needs / Inbox | `/inbox` route | User-facing noun **Needs**. Do not rename route in v1. |
| `ClassTabs` / `PersonTabs` | Component + class routes | Cut **default set**, not the widget. |
| Gradebook, Assignments, Students/setup, Parents | Destinations | Reachable from Class cluster / remaining tabs. |
| Hamburger | Identity, class switch, Profile, Appearance, Sign out | Facebook chrome law. |
| Office tray | Super/admin five | Untouched when seat = office. |
| `OFFICE_CLASS_TABS` | Feed · Teacher · Parents · Students | Never teacher ClassTabs. |
| Ask | One `/ask` | Tray-last. Class-bound when `classId` set. |

### 3.2 Remove from *teacher seat chrome* (hide / demote — do not delete routes)

| Item | From | How |
|---|---|---|
| Office People / Manage / Matrix / school Activity | Tray, home PersonTabs, drawer | Role/seat gate. Pure teacher never sees as primary. |
| Tray Class → Gradebook-first | `tabsFor` class href | Land Students/setup or Class hub. |
| ClassTabs: This week, Heatmap, Family as default icons | `CLASS_TABS` visible set | Week = Today filter; Heatmap = gradebook `?tab=`; Family = drawer/overflow. Routes stay. |
| Drawer competing primaries | Grade book / Parents / Family update as peers of tray | Demote. Search still finds them. |
| Drawer Feed for pure teacher | `HamburgerDrawer` non-super Feed row | Desk Feed tab is enough. |
| Class-create / New class | Home, drawer, Ask, Capture | `canCreateClass` stays `isOfficeRole`. No “Another class” that *creates*. Switch-class (`/?switch=1`) only. |
| Extra Ask | ClassTabs, header, second tray key, desk FAB | Forbidden. Bind context on existing `/ask`. |
| Student-skin chrome | Teacher tray/desk | Forbidden. Do not copy `/todo` IA. |

### 3.3 Tray / tabs / hamburger — one line each

- **Tray:** keep the five-slot teacher tray. Relabel Home→Desk (a11y; keep `today` glyph unless Chuck wants a new IconName). Relabel Inbox→Needs. Retarget Class. Bind Ask. Hide office keys on teacher seat.
- **Tabs:** keep PersonTabs. Default ≤7: Today · Needs · Feed · Students · Assignments · Gradebook · Parents. AVG Syllabus is **not** a v1 default icon (setup card / gradebook banner first).
- **Hamburger:** keep. Teacher cluster = who I am · classes I teach · switch class · Profile · Appearance · Sign out. No Office People. No Create class. Dual-hat parent row OK.

## 4. Constraints

**Product**

- Phone captures; web reviews, assigns, grades. Nothing is a grade until Approve.
- Capture loop stays primary. Do not merge Capture into Desk-only. Do not delete tray Capture.
- No class-create on Teacher (home, drawer, Ask, Capture, syllabus, diary).
- No extra Ask surface. Do not hide Ask either — research “drop global Ask” is **overruled**: keep tray-last, class-scoped.
- Teachers do not become Office (no People/Matrix on desk) and do not become Student (no todo skin).

**Engineering (when Chuck sends — not this ticket)**

- Touch: `FloatingTabTray.tabsFor`, `CLASS_TABS` default order, `HamburgerDrawer` staff branch, `ChromeProvider` **seat vs `isTeacherRole`**, teacher `index` home tabs, Ask `classId` chip. Prefer a11y/label over new `IconName`.
- **Seat:** chrome.role must follow explicit seat, not `also_teacher`. Dual-hat: teacher seat === A1 gates; office seat === office tray. Never merge trays.
- No SQL. No migrations. No new packages. No route rename `/inbox` → `/needs` in v1.
- AVG syllabus stays Class-desk altitude (not Office, not a tray key). Diary/Ledger stay hamburger, not tray (DIARY-A1).
- Icon pipeline: if a new glyph is ever required, `scripts/build-icons.mjs` then `npm run icons`. Prefer not.

**Phasing (plan TEACH-UX-P1; do not staff here)**

A altitude locks → B ClassTabs + Class landing → C Needs noun + Ask context → D web labels + capture copy. AVG may land in parallel on Class desk but must not restore 10-tab default.

## 5. Acceptance

- [x] Chrome remove vs keep (tray, tabs, hamburger) stated.
- [x] Capture loop primary; no class-create; no extra Ask.
- [x] Teacher ≠ Office ≠ Student.
- [x] Grounded in live files + TEACH-UX-P1 / R1.
- [x] No SQL, no app code, no kelyra-qa-loop, no git push.
- [ ] CEO/CoS review. **No senior-developer until Chuck says send.**

### Handoff

| Field | Content |
|---|---|
| **OBJECTIVE** | Teacher chrome architecture for CEO/CoS |
| **CONTEXT** | TEACH-UX-P1 + R1; live tray/tabs/drawer; dual-hat `isTeacherRole` bleed |
| **REQUIREMENTS** | Remove vs keep; capture primary; no class-create; no extra Ask |
| **CONSTRAINTS** | No SQL; no impl; no rewrite; no student skin |
| **FILES** | `notes/company/teacher-ux-architecture.md` |
| **WORK PERFORMED** | Architecture note from live chrome + plan |
| **VERIFICATION** | File fills skeleton §§0–5; no src/ or supabase edits |
| **RESULT** | Ready for CEO/CoS |
| **OPEN ISSUES** | PM Q1 (Desk vs House a11y), Q2 (Family drawer vs overflow) — Architect: keep `today` glyph; Family drawer-only in v1 |
| **ESCALATION NEEDED** | None for writing. Impl blocked on Chuck “send” |
| **RECOMMENDED NEXT ACTION** | CEO/CoS review. If yes, CoS staffs Phase A only. |

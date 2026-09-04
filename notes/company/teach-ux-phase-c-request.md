# TEACH-UX Phase C — Needs noun + Ask class context (CEO send 2026-09-04)

CEO authorized TEACH-UX through the daily cap. **This loop is Phase C only.** Phases A and B already landed in this dirty tree — **preserve them**. Do not start D (web labels, capture copy, docs). Do not restore ClassTabs defaults. No SQL.

Grounding:
- `notes/company/teacher-ux-plan.md` §7 Phase C
- `notes/company/teacher-ux-architecture.md` one waiting queue; Ask tray-last with classId chip; no extra Ask surface
- `notes/company/teacher-ux-acceptance.md` ND-*, ASK-*, SEC-04
- `notes/company/teacher-ux-security.md` Ask: one `/ask`; chip ≠ SQL; do not weaken `teacherSeatOnly` / `officeOnly`

## Goal

One waiting queue noun (**Needs**). Ask is not a second desk: bind active `classId` when on a class path; show class name chip; policy maps unchanged.

## Required work

### C1 — Tray label/a11y
User-facing Inbox → **Needs**. Route may stay `/inbox`. Do not rename the route. Prefer a11y/label over new IconName.

### C2 — Badge single source
Unassigned + draft-ready count. Desk Needs and tray Needs must not double-count differently. Badge is **count-only** (no names/scores).

### C3 — Empty states
Copy ties Capture → Needs → student Approve on web. No new features.

### C4 — Ask class context
When teacher is on `/class/*` (or chrome.classId set), `/ask` reads that classId and shows a **class name chip**. Super/office Ask on office seat unchanged. **One `/ask` only** — no ClassTabs Ask, no header Ask. Chip is not authorization. Do not add Ask tools. Do not weaken `officeOnly` / `teacherSeatOnly`. Stuffed `classId` still SQL-gated.

### C5 — Drawer
Remove or demote duplicate “Grade book / Parents” if Class tray covers them (keep Search). Do not add class-create. Phase A office-noun gates on teacher seat stay.

## Tests
- Tray a11y/label Needs; href still `/inbox`
- Badge count-only; single source
- Ask on `/class/{id}`: class chip visible; no second Ask surface; policy maps unchanged
- Office Ask + student chrome unchanged
- Phase A seat tests and Phase B CLASS_TABS ≤7 / Class href≠gradebook still green
- Matcher never inserts; canCreateClass untouched; no EXPO_PUBLIC_*; no sixth tray tab

## Constraints
- Preserve dirty tree (A+B+AVG). No git reset/commit/push.
- No SQL, no migrations, no Edge handler changes, no new packages.
- Children never call `ask_user_question`.
- Do not implement Phase D. Do not recut ClassTabs.

## Acceptance
C1–C5. ND-*/ASK-*/SEC-04. A+B intact. Terminal passed or escalated with named P0/P1 only.

# TEACH-UX Phase B — ClassTabs default cut + Class tray landing (CEO send 2026-09-04)

CEO authorized TEACH-UX through the daily cap. **This loop is Phase B only.** Phase A altitude locks already landed in this dirty tree — **preserve them**. Do not start C/D (Needs noun, Ask class chip, web labels, capture copy). Do not reopen seat SQL.

Grounding (read first):
- `notes/company/teacher-ux-plan.md` §7 Phase B
- `notes/company/teacher-ux-architecture.md` Class desk ≤7 defaults; tray Class ≠ gradebook-first
- `notes/company/teacher-ux-acceptance.md` CT-* and TR-07; SEC-05/06 (demoted tabs ≠ revoked data; no sixth tray tab)
- Phase A already in tree: `src/lib/chrome/seat.ts`, `trayTabs.ts`, `ChromeProvider.tsx`, `FloatingTabTray.tsx`, `HamburgerDrawer.tsx`, `src/app/index.tsx`

## Goal

Open a class → readable work surface. Cut default ClassTabs. Tray **Class** does not hard-land Gradebook.

## Required work

### B1 — CLASS_TABS default ordered set
Default visible **≤7**, order:
Today · Needs · Feed · Students · Assignments · Gradebook · Parents

Keep existing routes. Do not rename `/inbox`. Do not add a Syllabus default icon (AVG stays Class-desk altitude via setup/gradebook entry, not a 8th/10th default tab).

### B2 — Demote, do not delete
- Heatmap only via gradebook `?tab=` (or equivalent in-gradebook tab) — **not** a default ClassTab icon
- Week as Today filter or overflow — **not** a default icon
- Family via drawer or Class overflow — **not** default tenth icon
Teacher of the class must still deep-link to demoted routes. Student/parent JWT still denied teacher-only routes (do not weaken RLS). `OFFICE_CLASS_TABS` **unchanged**.

### B3 — Tray Class href
Teacher-seat tray **Class** lands Students/setup or a neutral Class hub — **not** forced `/gradebook`. Phase A teacher tray key count stays 5.

### B4 — Wordmark
Class panes keep **class name** (ui-design §32.7). Do not invent new IconName.

### B5 — AVG compatibility
Syllabus stays Class-desk altitude; not Office; not a forced default tab. Do not revert uncommitted AVG files.

## Tests
- Default CLASS_TABS length ≤7 and ordered set as B1
- Heatmap / Week / Family not in default icon set; routes still resolve for teacher of class
- Teacher tray Class href ≠ gradebook-first
- Office CLASS_TABS freeze; student tray unchanged
- Phase A seat tests still green (teacher seat ≠ office tray; dual-hat never merged)
- Matcher never inserts student; canCreateClass untouched; no seat SQL; no EXPO_PUBLIC_*; no sixth tray tab

## Constraints
- Preserve dirty tree (Phase A + AVG + other uncommitted). No git reset/checkout/restore. No commit/push.
- No SQL, no migrations, no Edge, no new packages.
- Children never call `ask_user_question`.
- Do not implement Phase C/D. Do not rename Inbox→Needs. Do not bind Ask class chip.

## Acceptance
B1–B5. CT-* / TR-07. Phase A locks intact. Office + student chrome unchanged. Terminal passed or escalated with named P0/P1 only.

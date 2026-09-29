# Office class Manage tab — PM lock

Status: PM choice locked. Designer card done. Option pack read (A recommended). No third order.

## Chosen order
A — Manage last: Feed · Teacher · Parents · Students · Manage.

## Reason
Quiet settings sit at the end (habit from Details-last on person pages and home Manage after working tabs). This row has no New, so last is the nearest analog. Parents and Students stay paired. Manage is the fifth icon (scrollable, no menu).

## Locks (copied, not reopened)
- Screen: `/admin/class/{id}` only. Superintendent, administrator, and also_administrator. Same card.
- Label Manage. Icon `manage`. Not the teacher-desk Settings gear.
- Pane: existing Class avatar row (quiet) and Feed icon row (`hint={false}`) only. Off the Teacher pane. Teachers list stays on Teacher.
- Open still lands on Teacher.
- Teacher desk `/class/{id}/settings` keeps both rows. Parent and student do not gain Manage.
- Not on this pane: school name, school feed icon, syllabus, delete class.
- No new screen, tray, header icon, or overflow menu.

## DESIGN STAMP
Feature/bug: Office class Manage tab (avatar + feed icon move)
Quality goals: office hats can set this class's avatar and feed icon from a Manage tab; Teacher no longer hosts those rows; open still lands on Teacher
Surface: both
PM: APPROVED  date: 2026-09-29  profile-session: grok-bot-consultant
QA Supervisor: (not this card)
Intent gaps remaining: (none)
Tab order: A

## Context from tabs config
OFFICE_CLASS_TABS currently ends at Students. Home uses Manage after People. Chosen A keeps Manage at end without copying home row. (Final growth patch)

## Designer record-back
After this choice, record in `docs/ui-design.md`:
- §32.1 office class row (update from stale Feed · Roster · Teacher)
- §34.5 picker host (today it still says the Teacher pane)

Do not edit that doc on this card.

## OPEN ISSUES
No Drive line in verify-kelyra for office-class Manage. Engineering cannot start until that map has a line or Chuck names the click.

Tests that still freeze the Teacher pane or the four-tab row (for Engineering later): `src/lib/classes/officeClassCard.test.ts`, `src/lib/classes/classAvatar.security.test.ts`, `src/lib/chrome/classTabs.test.ts`.

Parent tracker t_cd1f4295 stays sticky and unassigned.

## Recommended next
CoS waits for this note and the QA Supervisor intent stamp. No engineering until both APPROVED, a Drive line exists, and Chuck has approved the look.

## Files read (no src edits)
- notes/company/office-class-manage-tab-options.md
- notes/company/office-class-manage-tab-options.html
- src/lib/chrome/classTabs.ts (OFFICE_CLASS_TABS)
- src/app/index.tsx (schoolHomeTabs reference)
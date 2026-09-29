# Office class Manage tab — intent (QA Supervisor)

**PM choice:** A (Manage last) — locked in notes/company/office-class-manage-tab-pm.md (APPROVED 2026-09-29). Cover only A. Do not reopen order.

## Hats
- Superintendent, administrator, also_administrator on `/admin/class/{id}`.
- Teacher who is also administrator sees Manage on office card; still sees rows on teacher-desk Settings (`/class/{id}/settings`).
- Parent / student: no Manage.

## Entry
- Class tab row on `/admin/class/{id}`.
- Label: Manage. Icon: `manage` (same as home Manage).
- Not tray, not home Manage, not Settings gear.
- Opens on Teacher (landing tab). Manage is fifth in row for order A.

## Lifecycle
- Set / change / remove class avatar.
- Set / change feed icon.
- In-flight sheets (photo, icon) survive tab switch away and back.
- Opening class always lands on Teacher.

## Multiplicity
- One class per card. Open the right class first. No class picker inside Manage.

## Reverse / cancel
- Remove photo.
- Pick different feed icon.
- Leave sheet without committing a pick.

## Non-goals (explicit)
- School name, school feed icon, syllabus, delete class, teacher-desk changes, parent/student screens, overflow menu, new screen.

## DITL IMPACT
NONE (no existing DITL plan/case mentions office-class Manage; verify-kelyra has no entry).

## DESIGN STAMP
Feature/bug: Office class Manage tab (avatar + feed icon move)
Quality goals: office hats can set this class's avatar and feed icon from a Manage tab; Teacher no longer hosts those rows; open still lands on Teacher
Surface: both
PM: (not this card)
QA Supervisor: APPROVED 2026-09-29  profile-session: grok-bot-consultant
Intent gaps remaining: none

## Notes
- Sheet work (t_557c8124 / t_bec78653) moves with avatar row; named as dependency only.
- No src edits. No Drive line invented (verify-kelyra has none). No engineering.
- Covers A only per PM lock.
- Read sources: office-class-manage-tab-options.md (A chosen), INTENT_QUALITY_GATE.md, DITL_OS.md. No gaps found.
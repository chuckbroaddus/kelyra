# TEACH-UX Phase A — altitude locks (CEO send 2026-09-04)

CEO authorized TEACH-UX implementation. **This loop is Phase A only.** Do not start B/C/D (ClassTabs cut, Needs noun, Ask class chip, web labels, capture copy).

Grounding (read first, do not rewrite):
- `notes/company/teacher-ux-plan.md` §7 Phase A
- `notes/company/teacher-ux-architecture.md`
- `notes/company/teacher-ux-security.md` §2.4 T1–T3, T8/T9 as they apply to seat/tray/drawer/home
- `notes/company/teacher-ux-acceptance.md` §3.1 SEC-01, SEC-02, SEC-05, SEC-08, SEC-09 and §3.6.2 Phase A

## Goal

Teacher seat cannot see Office primary chrome. Dual-hat can sit in Office **or** Teacher, never a merged tray.

## Live bugs to fix

1. `src/lib/chrome/ChromeProvider.tsx` ~L258–274: `if (isTeacherRole(profile)) return 'teacher'` runs **before** staff/office. `isTeacherRole` is `role === 'teacher' || also_teacher`, so superintendent/administrator with `also_teacher` **cannot sit in Office**.
2. `src/components/ui/HamburgerDrawer.tsx` ~L334: `isAdminRole(profile)` injects People / Activity / Messages / Responsibilities while chrome may be teacher. Gate office nouns on **office seat**, not hat-OR.
3. `src/app/index.tsx`: home uses `isAdminRole` / `isTeacherRole` hat-OR (`admin`, `teaches`). Teacher seat must not render office PersonTabs (feed/people/manage) or class-create. Multi-class teacher seat = class list / switch only.

## Required work

### A1 — tray
`src/components/ui/FloatingTabTray.tsx` `tabsFor`:
- Pure teacher and **teacher seat**: five keys, no office People/Manage/Classes-as-office keys. Existing teacher fallback (Home/Capture/Inbox/Class/Ask) is OK for this phase — **do not** rename Inbox→Needs, **do not** retarget Class href off gradebook (Phase B/C).
- Office seat (`superintendent` | `administrator` chrome.role): existing office tray **unchanged**.
- Student / parent trays **unchanged**.
- Still exactly 5 teacher tray slots. No sixth. No Profile-in-tray.

### A2 — drawer
Teacher seat: no People / Activity / Responsibilities / Manage / class-create. Keep class list, switch class (`/?switch=1`), Profile, Appearance, Sign out. Dual-hat parent row (`isAlsoParent` → My children) OK. Office seat keeps office drawer nouns. Do not expand class-delete.

### A3 — home (`src/app/index.tsx`)
Teacher seat: no office PersonTabs; no `createClass` UI. Office seat unchanged. Dual-hat follows seat.

### A4 — explicit seat
Chrome.role must follow **explicit seat**, not `isTeacherRole` first.
- Dual-hat admin+teacher: can select office seat; teacher seat chrome === pure teacher; office seat === office tray; **never** merge key sets.
- Seat is client chrome state (AsyncStorage OK). **No `current_seat()` table, no migrations, no SQL, no new RPCs.**
- Seat does not grant extra SQL. JWT/RLS stay `class_teacher_of` / `isOfficeRole`. Do not widen `isOfficeRole` / `isStaffRole` / `teacherSeatOnly` / `officeOnly`.
- Do not treat chrome hide as RLS (S1 T1). Do not add client-only `if chrome.role === teacher return []` as the People/Activity/matrix **data** gate.

### A5 — tests (mandatory evidence)
Prefer unit/JWT over screenshots:
- Pure teacher: tray keys have no people/manage office keys; drawer has no People/Activity/Responsibilities; home has no class-create.
- Dual-hat admin+teacher: office seat tray === office; teacher seat tray keys === pure teacher; never union.
- Dual-hat drawer on teacher seat: no People/Activity/Responsibilities; no class-create.
- Student tray + Office tray golden paths unchanged (route/key checklist).
- Existing createClass / matcher tests still green. Matcher still never inserts a student. `canCreateClass` untouched.
- SEC-09: office RPCs / matrix / activity still deny **pure teacher JWT** independent of tray config.
- No `EXPO_PUBLIC_*` keys. No new Ask tools. No sixth tray tab. No student `/todo` skin on teacher.

Copy QA loop must-fix from acceptance:
1. Pure teacher JWT: tray five keys; no office People/Manage keys.
2. Dual-hat: seat switch yields teacher chrome === pure teacher; office seat === office tray; never both.
3. Dual-hat drawer on teacher seat: no People/Activity/Responsibilities; no class-create.
12. No SQL seat table; no sixth tray tab; no student `/todo` skin on teacher; no `EXPO_PUBLIC_*` keys.

(Items 4–11 that are Search/ClassTabs/Needs/Ask/Capture-copy are **out of this loop** unless a one-line gate is required to stop office Search firehose **on teacher seat**. Do not retarget Class, do not cut CLASS_TABS, do not rename Inbox, do not bind Ask class chip.)

## Constraints

- Preserve the existing dirty working tree (AVG syllabus and other uncommitted work). Do not revert unrelated files. Do not git commit or push.
- No SQL, no migrations, no Edge handler changes, no new packages, no IconName unless unavoidable (prefer a11y/label later in D).
- Children must never call `ask_user_question`.
- Do not implement Phase B/C/D in this run.

## Acceptance for this loop

Phase A plan table A1–A5. SEC-01, SEC-02, SEC-05, SEC-08, SEC-09. Office + student chrome unchanged. Dirty tree preserved. Terminal status passed or escalated with named P0/P1 only.

# Office back-door navigation audit

Date: 2026-09-25. Seat: security. Report only. No code, branch, PR, or commit.

Card: t_944db3db. Read the main checkout on disk. Did not switch branches. Session start was main at 77f8a88 tracking origin/main. Line numbers are that checkout.

## Question

Which tappable paths an office chrome seat (`isOfficeChromeRole`: superintendent or administrator) can take into a deeper view with no role check, so they reach the teacher desk, grading, edit or delete, messaging, or PII past the seat.

## Method

Traced `router.push` / `router.replace` / `href` under `src/app` and `src/components` into `/class/`, `/admin/`, student, and parent routes. Then checked whether an office seat can reach the caller, and whether the destination bounces that seat.

## Sources

Fact. OWASP Top 10:2021 A01 Broken Access Control. https://owasp.org/Top10/A01_2021-Broken_Access_Control/ Read this session. Force browsing and missing authorization checks are the class of bug. Access control is only effective in server-side code the client cannot skip.

This note does not state a FERPA holding. Whether an office user is a school official with a legitimate educational interest is for human counsel on legal-compliance.

## Findings

Severity: high = write or PII past the seat; med = read past the intended surface; low = cosmetic or latent.

Office users who get past the splash have a teacher row. ChromeProvider then sets `chrome.classId` and `chrome.classes` even on the office seat. Several pushes use that id with no chrome-role check.

RLS fact from `supabase/migrations/20260819000008_class_teachers_office.sql`: `teaches_class` is true for any class when `is_school_admin()` (profiles.role superintendent or administrator). Assignments, submissions, captures, and enrollments are FOR ALL on `teaches_class`. A desk landing is real read and write, not UI-only. No live database was opened.

| id | file:line | entry | reaches | RLS | sev | fix |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | src/app/profile.tsx:353 | People, or own profile, then staff Classes tab | Teacher desk `/class/{id}` | real read/write | high | entry gate like classListNav; card t_6b64e3d1 already filed |
| F2 | src/app/profile.tsx:371 | Same person, Children tab | `/class/{chrome.classId}/student/{child}` using the office user's active class, not the child's class | student row readable via teaches_class | med | do not push a class route; or use the child's enrollment and the office person view only |
| F3 | src/app/messages/[threadId].tsx:164 | Header mail, or administrator hamburger Messages, then a work card Open | Assignment screen `/class/{chrome.classId}/assignment/{id}` | real read/write | high | seat-gate openCard; office must not open the assignment route |
| F4 | src/app/messages/[threadId].tsx:168 | Same thread, card has student_id and no assignment_id | Class student view, wrong class id | readable | med | same gate; do not use chrome.classId |
| F5 | src/app/notifications/[id].tsx:66 and :70 | Header bell, alert, work card Open | Assignment or student route. Class id is alert.classId or chrome.classId | real read/write if the row exists | high | same openCard gate as messages |
| F6 | src/app/search.tsx:164 and :168 | Header search or hamburger search | Directory student or parent goes to `/class/{id}/student` or `/parent`, not `/profile?person=` | readable | med | office search should use peopleDirectoryPersonHref |
| F7 | src/app/ask.tsx:183 and src/lib/ai/askTools.ts:303 | Office tray Ask. open_screen is allow-listed (capability null) | Desk, gradebook, inbox, capture, setup, assignments | real read/write | high | map office open_screen to /admin/class and People only |
| F8 | src/app/class/[id]/student/[studentId].tsx:554 and :560 | Office is already on the student person view (admin class row, F2, F4, or F6). Details tab Delete or Remove, then confirm | Teacher desk `/class/{id}` | delete/remove is a write; desk is then readable and writable | high | after the write, land on /admin/class or People, never the desk |
| F9 | src/app/class/[id]/parent/[parentId].tsx:258 | Office is on the parent person view. Delete parent, then confirm | Teacher parents tab `/class/{id}/parents`, which shows ClassTabs | write, then desk | high | land on /admin/class, not the teacher parents tab |

## Destination guards

No screen under `src/app/class/[id]` redirects an office chrome seat away. A route guard would beat the per-row fixes.

`src/app/class/[id]/_layout.tsx:24` shows teacher ClassTabs when `isClassDeskTabsRoute` is true. That helper hides the tab row on student, parent-detail, assignment, and review paths. It does not block the route. On `/class/{id}`, feed, setup, gradebook, assignments, parents, and settings, the tabs are the full teacher set (Today, Needs Attention, Feed, Students, Assignments, Gradebook, Parents, Settings) with no chrome-role check. `ClassTabs` always uses `CLASS_TABS`, not `OFFICE_CLASS_TABS`.

`src/app/class/[id]/index.tsx:40` sets `teachSeat` only to hide the empty-state Capture button (`:252`). Inbox, roster, turned-in Review, and Publish to calendar still render.

`src/app/class/[id]/gradebook.tsx` and `src/app/class/[id]/review/[submissionId].tsx` do not read `chrome.role`. The assignment screen does not either.

The student person view does narrow tabs (`studentTabsForChromeRole` → Details, Parents, Classes) and does not load teacher focus/work/practice. Class rows on that Classes tab and on the parent Classes tab use `classListRowNavTarget` and are not pressable for office (PR 279). That narrowing is not a route guard. Details still offers Delete and Remove (`student/[studentId].tsx:1261`). Those confirms are F8.

F10, latent, low. `src/app/diary.tsx:752` pushes `ledgerDeepLinkHref` with no chrome-role check. That helper can target assignment, review, student, or syllabus. Current writers stamp those entity types as seat `teacher` and require `class_teachers`, so they do not appear on the office staff ledger. Staff rows are office-audit actions. If a future staff row carries `class_id` plus entity type assignment, submission, or class, this tap opens the desk, and the RLS probe would pass because `teaches_class` is true for a school admin. The route guard covers this. Do not treat it as a live path today.

## Checked clear

- Home Classes uses `classListRowNavTarget('main-classes')` and opens `/admin/class/{id}` for office (`src/app/index.tsx:181`, `src/lib/classes/classListNav.ts:38`).
- Administrator hamburger class rows go to `/admin/class/{id}` (`HamburgerDrawer.tsx:380`).
- People directory uses `peopleDirectoryPersonHref` → `/profile?person=`. `bounceStudentProfileToClass` is false for office, so a student login stays on the profile card.
- Parent and student Classes tabs are not pressable for office (PR 279).
- Calendar office seat deep_link is `/calendar?event=` only. No assignment projection on `p_seat = 'office'` (`20260917000001_list_calendar_items_phase_d_team.sql:214`).
- Notifications pane classroom bell is `chrome.role === 'teacher' && !isOfficeRole`. Office sees alerts only. The hole is the alert detail handler (F5), not that list.
- Search inbox and gradebook rows load only when `chrome.role === 'teacher'`. Office search corpus is the directory (F6).
- Home auto-replace to `/class/{id}` is `teacherSeat` only (`index.tsx:97`).
- `messages/info/[threadId].tsx` only returns to `/messages`.
- FeedPane has no router push. Admin class Feed stays in-page.
- Admin class parent and student row presses (`admin/class/[id].tsx:304`, `:327`, `:366`, `:388`) open the person views. That is the designed office card, not a desk back door by itself. The follow-on deletes are F8 and F9.


## Recommended fix cards

A route guard beats per-row patches. Prefer `classListRowNavTarget` at each entry, and still guard the destination.

1. Class-stack guard. Office chrome on `/class/{id}` and the desk panes (index, feed, setup, gradebook, assignments, parents, settings, assignment, review) replaces to `/admin/class/{id}`. Do not render `CLASS_TABS` for that seat. Covers F1, F3, F5, F7, F8, F9, and latent F10 even if a row is missed.
2. F1 is already card t_6b64e3d1. Extend that card, or add a sibling, for F2 (Children row). Do not push `/class/` from the staff person view.
3. Seat-gate message and alert `openCard` (F3, F4, F5). Office must not open an assignment or review route. Do not use `chrome.classId` as the class for a card.
4. Seat-map Ask `open_screen` (F7). Office may open `/admin/class/{id}`, People, diary, calendar, messages. Not desk, gradebook, inbox, capture, or setup.
5. Office search uses `peopleDirectoryPersonHref` (F6), same as the People tab.
6. After delete or remove on the person views (F8, F9), land on `/admin/class/{id}` or People, not the teacher desk.

## Open questions

Assumption, from `classListNav` and `docs/ui-design.md`, not a legal holding: the office seat's class surface is `/admin/class/{id}` (Feed, Teacher, Parents, Students). The teacher desk, gradebook, assignment editor, review, and Capture are not that surface.

- Is Delete student and Remove from class on the office Details tab an intended office write, or only the swipe on `/admin/class/{id}`? The navigation after confirm is a back door either way.
- Do office users receive work-card alerts? F5's handler has no role check. Whether those payloads are sent was not proven from the client list.
- Dual-hat: `chrome.classId` is the Teach active class even while chrome.role is office. Fixes must not treat that id as the office class context.
- A FERPA school-official opinion is for human counsel on legal-compliance. This note does not give one.


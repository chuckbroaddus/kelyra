# Teacher UX Research Note (TEACH-UX-R1)

**Date:** 2026-09-03  
**Author:** research-feedback (Kelyra)  
**Status:** Complete for handoff to PM child (t_7215b83e)  
**Citations:** Kelyra source (ChromeProvider, HamburgerDrawer, FloatingTabTray, AppHeader, class/[id]/*, inbox, capture, ask, todo, admin/*, student/*); competitor IA patterns from Canvas (course nav), Google Classroom (stream + classwork), PowerSchool (teacher gradebook/home); prior Kelyra research (class-landing, avg-specs).

## Executive Summary

CEO observation: Teacher chrome feels cluttered/overwhelming; Superintendent office and Student views are relatively clean and focused. Root causes identified via code walk: high navigation density (global drawer + floating tab tray + per-class tabs + role-specific CTAs), competing primary actions (Capture vs Ask vs Inbox vs Desk tabs), altitude bleed (office People/Matrix mixed into teacher flows), duplicate nav surfaces, and Ask living at global level instead of class-scoped. 

Teacher must remain a **class-desk product** (capture → match → desk → assign/grade) without office bleed or student-skin duplication. Superintendent is matrix/people/school; Student is todo/work only.

**Key findings (inventory below):**
- Teacher home/class desk: 8+ nav surfaces, competing CTAs (capture global, ask global, inbox unassigned, todo personal, class tabs for feed/assignments/gradebook/syllabus).
- Superintendent: Cleaner tabbed office (Feed/Classes/People/Manage) + matrix focus.
- Student: Minimal (todo + work + grades).
- Pain: Density, duplicate paths (drawer search vs tray vs class tabs), Ask vs desk vs inbox confusion, no clear "this class" primary surface.
- Needed vs desired: Consolidate teacher nav to 4-5 surfaces max (Home desk list → Class desk with scoped tabs → Capture contextual → Inbox/Assign/Grade unified under desk). Hide office tools from teacher hat. Group Ask into class context or desk shelf. Move non-core (people-from-class, full syllabus) behind desk or secondary.

**v1 Recommendation (IA cut, no visual restyle):**
- Teacher: Home = class list (auto-redirect if 1 class). Class desk = primary surface with tabs (Feed/Assignments/Gradebook/Syllabus/Students) + contextual Capture/Ask/Assign from within desk. Inbox = unassigned only, surfaced from desk. Todo = personal queue. Hide global Ask, global People, office Matrix from teacher role.
- Superintendent: Keep office tabs + matrix/people/school; no class desk bleed.
- Student: Keep minimal todo/work.
- Non-goals: No student skin on teacher, no office People on class desk, no new global nav.
- Cite overlaps with U1/U2 if any (none started per constraints).

**Gaps noted:** Exact runtime badge counts, live screenshot inventory (code-only audit), parent hat overlap, mobile vs web differences in tray/drawer.

## 1. Structured Inventory (Route, Purpose, Primary Action, Noise)

### Teacher Role Chrome (core walk)
- **Home (/)**: Role switcher + class list or tabs (classes/feed/new/people/manage for multi). Primary: pick class or create (but teachers don't create). Noise: admin tabs bleed for super+teacher, lesson rollup, school feed. (src/app/index.tsx:77 auto-redirect if 1 class)
- **Class Desk (/class/[id]/index + _layout + feed/assignments/gradebook/syllabus/assign/student/[id])**: Primary surface. Tabs via ClassTabs (feed, assignments, gradebook, syllabus, students?). Work shelf (inbox/turned/week), roster avatars, phase banners. Primary actions: review captures, assign practice, grade. Noise: multiple sub-tabs + global chrome + pushed title. (src/app/class/[id]/* : 15+ screens)
- **Inbox (/inbox)**: Unassigned captures. List + attach to roster + note-only. Primary: match/assign. Noise: filter, pending sheets, drafting. Global but class-scoped internally. (src/app/inbox.tsx)
- **Capture (/capture)**: Phone/web camera + audio + spoken name. Primary: record/snap → match. High visual density (device picker, pager, transcript). Global entry. (src/app/capture.tsx)
- **Todo (/todo + /[submissionId])**: Personal work queue (assigned practice). Primary: submit/review. Minimal. (src/app/todo.tsx)
- **Ask (/ask)**: Global AI chat (agent, history, attachments). Primary: query gaps/assign. Noise: lives outside class context; competing with desk actions. Teacher-only guard. (src/app/ask.tsx:101)
- **People-from-class (/class/[id]/student/[id] or admin/people)**: Roster drill + parent links. Noise: bleeds into admin/people for super.
- **Assign (/class/[id]/assign)**: From gap to practice set. Primary: generate/assign. Scoped to class.
- **Gradebook/Syllabus (/class/[id]/gradebook, syllabus)**: Grid + policy view. Primary: approve/score. Syllabus read/edit if present.

**Chrome surfaces (shared):**
- HamburgerDrawer: Staff (teacher/admin/super) profile + Feed/Classes/People/Manage/Kelyra/Ask + search. Super sees extra office items. (HamburgerDrawer.tsx:227,283)
- FloatingTabTray: Role-gated tabs (super/admin vs teacher/student). (FloatingTabTray.tsx:186)
- AppHeader: Search/mail/capture/mail badges, role-aware title. (AppHeader.tsx:32)
- ChromeProvider: role, headerChrome toggles, badges (capture needs, alerts, messages). (ChromeProvider.tsx:258+)

**Density issues:** 3+ nav layers (drawer + tray + class tabs) + 5+ CTAs (capture, ask, inbox, todo, desk tabs) on teacher paths. Competing "primary" (desk vs ask vs capture).

### Superintendent Office
- **Admin routes (/admin/matrix, /admin/class/[id], /admin/people, /?tab=manage/school/people)**: Matrix, school classes/people, feed. Primary: oversight, edit roles, school identity. Clean tabbed IA. No class-desk clutter. (src/app/admin/*, index tabs)
- Role: 'superintendent' gates office tools; hides some teacher CTAs.
- Noise low: focused on People/Matrix/School.

### Student
- **Todo/Work (/todo, /student/*, /student/feed, /student/grades, /student/people, /student/class)**: Assigned work, grades view, class feed. Primary: do/submit. Minimal chrome, no office or teacher tools. (src/app/student/*)
- Role: 'student' redirects from home, simple tray.

**Comparison table (density/altitude):**
| Role | Nav layers | Primary surfaces | Competing CTAs | Altitude bleed | Overall feel |
|------|------------|------------------|----------------|----------------|--------------|
| Teacher | 4+ (drawer+tray+class tabs+global) | Class desk, Capture, Ask, Inbox, Todo | Capture/Ask/Inbox/Desk tabs high | Office people/matrix bleed via shared drawer | Cluttered |
| Superintendent | 2-3 (office tabs + drawer) | Matrix, People, School, Feed | Low (focused) | None (teacher desk hidden) | Clean |
| Student | 1-2 (todo + tray) | Todo/Work | None | None | Clean |

## 2. Pain Points & Root Causes
- **Density**: Multiple overlapping nav (Hamburger search vs tray vs class tabs vs header capture/ask). Every screen adds badges/CTAs.
- **Competing CTAs**: Ask global vs desk actions; Capture global entry vs contextual in desk; Inbox as unassigned vs desk inbox shelf.
- **Altitude bleed**: Shared drawer exposes office (People, Manage) to teachers; admin/matrix accessible; people-from-class mixes with admin/people.
- **Duplicate nav**: Class desk reinvents tabs that overlap global tray/drawer.
- **Ask vs desk vs inbox**: Ask feels like separate "AI desk"; inbox unassigned feels orphaned; desk is the real work surface but buried.
- **Teacher constraints**: Teachers do not create classes (home auto-redirects); no office creation tools.

## 3. Competitor IA Patterns (for reference only — Kelyra-specific)
- **Canvas teacher home**: Course nav (home/syllabus/assignments/grades/people) + global dashboard. Stream vs modules; above-fold focus on due/ announcements. Low global CTAs.
- **Google Classroom teacher**: Classwork/Stream/Grades/People tabs per class; global "Classes" list + create. Minimal drawer; capture/assign inside class.
- **PowerSchool teacher**: Gradebook-centric + roster/assignments; office reports separate. Clean separation of class vs district office.
Pattern: Class-scoped tabs primary; global office/district separate; capture/ask inside context; 3-4 surfaces max per role.

## 4. Needed vs Desired (What to hide, group, or move)
- **Hide (from teacher role)**: Office Matrix/People/Manage/School tabs, global Ask (move scoped), full admin people, super-only fields.
- **Group/Move**: Capture + Ask + Assign into class desk shelf/contextual (not global floating). Inbox unassigned → desk secondary tab or shelf. Todo personal → home or desk. Syllabus/gradebook stay under desk tabs.
- **Keep/Primary**: Class desk as #1 surface (roster + work shelf + tabs). Home = lightweight class list only. Capture remains fast global but context-aware.
- **Non-goals (cite for PM)**: Student skin on teacher, office People on class desk, new global chrome, visual redesign (this is IA/altitude only).
- **v1 vs later**: v1 = consolidate to desk-centric (4 surfaces); later = advanced parent matrix, full syllabus AI.

## 5. Recommended IA (handoff for PM plan)
- Teacher flow: Home (class list) → Class desk (tabs: Feed/Work/Gradebook/Syllabus/Students + contextual Capture/Ask/Assign/Inbox) → Todo (personal) as secondary.
- Role gates strict in ChromeProvider + Drawer + Tray.
- Unassigned inbox surfaced only from desk.
- Ask scoped to current classId or global only for super.
- Result: Teacher stays "class desk product"; super/student remain clean.

**Next**: PM child (t_7215b83e) can now produce teacher-ux-plan.md with before/after IA, v1 scope, phased tasks. CoS ARM-grant after this note.

**OPEN ISSUES**: None for this research; ready for review/handoff. No U1/U2 cards started.
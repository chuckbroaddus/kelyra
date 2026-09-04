# TEACH-UX-S1: Security — teacher chrome

**Date:** 2026-09-04
**Author:** security (Kelyra)
**Ticket:** t_f9588698 (TEACH-UX-S1)
**Status:** Review only — no SQL, no app code, no migrations, no Edge handlers, no kelyra-qa-loop, no git push.
**Depends on:** `notes/company/teacher-ux-architecture.md` (TEACH-UX-A1); plan `teacher-ux-plan.md`; research `teacher-ux-research.md`.
**Live ground:** `ChromeProvider` (`isTeacherRole` first), `FloatingTabTray.tabsFor`, `CLASS_TABS` / `OFFICE_CLASS_TABS`, `HamburgerDrawer` staff + `isAdminRole` inject, `src/lib/school/roles.ts`, `src/app/search.tsx`, `askToolPolicy.ts`, `createClass.security.test.ts`.
**Legal posture:** Engineering threat model and implementation gates. Not a legal opinion and not a claim of FERPA “school official” status. Soft FERPA still applies (`docs/architecture.md`, `docs/mvp.md`).

**Non-goals:** Implementation, Architect SQL, QA plan, staffing `senior-developer`. This epic adds **no tables, no columns, no RPCs, no new PII fields.**

---

## 0. Verdict

TEACH-UX-A1 product law is sound: chrome-only; five tray slots; no sixth / Profile-in-tray; Capture stays primary; matcher never inserts students; no class-create on Teacher; one `/ask` with a class context chip; Teacher ≠ Office ≠ Student; dual-hat is a **seat switch**, not a merged tray; demote tabs (do not delete routes); Office tray and `OFFICE_CLASS_TABS` untouched.

This epic does **not** create a new PII surface. Relabel Inbox→Needs, retarget Class away from Gradebook-first, cut default ClassTabs, hide office nouns on teacher seat — those are IA. Education records (roster, captures, drafts, scores, family updates, directory) already live behind existing routes and RLS.

**Chrome is not security.** Hiding People / Activity / Matrix / Family from teacher chrome does not revoke JWT capabilities. Client chips, a11y labels, and tab order are not FERPA controls. Dual-hat office+teacher still has an office JWT; dual-hat teacher+parent still has `parent_id`. Server walls stay: `class_teacher_of` for taught-class writes; `isOfficeRole` for class-create / family-link; `teacherSeatOnly` must not weaken to “office if they also teach”; Ask tools filtered after `getUser` + profile — never `body.role`.

**Do not implement** until CEO says send **and** the v1 must-fix list in §2.4 is copied into any future qa-loop. Security does not authorize staffing.

Ready for CEO/CoS.

## 1. Threats

Attacker profiles: curious student JWT; parent JWT (incl. invite token); teacher of class A on class B; office seat; dual-hat admin+teacher (`also_teacher`); dual-hat teacher+parent (`parent_id`); modified Expo client; typed/deep-link URLs to demoted routes; Ask tool-loop with stuffed `classId`; Search treating `isStaffRole` as school directory.

### 1.1 Data classes (unchanged — chrome does not add rows)

| Data | FERPA / sensitivity | Where it already lives | Chrome change |
|---|---|---|---|
| Class feed / teacher copy | Directory-ish / class comms | posts, landing (other epics) | Desk Feed tab stays; drawer Feed demoted for pure teacher |
| Roster names, photos, setup | Education records | `/class/{id}/setup`, `listRoster` | Tray Class may land here first — **same** teacher read, not a new audience |
| Captures / inbox / drafts | Education records + work product | `/capture`, `/inbox`, matcher | Relabel Needs; same queues; badge = count not names |
| Gradebook scores / heatmap | Education records | gradebook routes | Demote Heatmap from default icons; route stays; nothing is a grade until Approve |
| Family update drafts | Education records / comms | `/class/{id}/family` | Not default ClassTab; drawer/search still reach; **not** family-visible from this epic |
| School directory / People / Activity / matrix | Staff PII + student directory | office tabs, `/activity`, `/admin/matrix` | **Hide on teacher seat.** Dual-hat office sees them only on **office seat** |
| Parent “My children” | Other-family education records | `/parent` | Drawer-only; not teacher tray |
| Ask prompts | Third-party processing | Edge / `ai:dev` | Bind `classId` chip only; no extra Ask surface; no roster dump because chrome changed |

**Product law (unchanged):** Phone captures; web reviews. Matcher never inserts a student. Teachers do not create classes. Nothing is a grade until Approve. Twins never mix. Model keys stay server-side.

### 1.2 T1 — Treating chrome hide as RLS

**Severity: P0 if implementers ship UI-only gates**

A1 “pure teacher never sees Office People / Manage / Matrix / school Activity as primary chrome” is correct IA. It is **not** a revoke. A modified client, deep link (`/?tab=people`, `/activity`, `/admin/matrix`), or Ask `open_screen` still hits the route. If RLS/matrix already deny pure teacher, good. If any of those routes key off `isStaffRole` / `isTeacherRole` / `chrome.role` instead of `isOfficeRole`, hiding the tab is theater.

**Must-fix:** Do not add client-only `if chrome.role === teacher return []` as the People/Activity/matrix **data** gate. Existing office RPCs stay `isOfficeRole` / `is_school_admin`. This epic must not widen those helpers to `also_teacher`. Tests: pure teacher JWT 403/empty on directory firehose, activity, matrix — independent of tray.

### 1.3 T2 — Dual-hat: `isTeacherRole` wins chrome (live)

**Severity: P0 for altitude; P1 for FERPA if trays merge**

Live `ChromeProvider`: `if (isTeacherRole(profile)) return 'teacher'` **before** staff/office. `isTeacherRole` is `role === 'teacher' || also_teacher`. Superintendent/administrator with `also_teacher` **cannot sit in Office** — teacher tray wins. That is the A1 altitude bug.

Wrong “fixes”:
- Merge office + teacher trays (People next to Capture) — **forbidden**. New incidental PII surface on the class desk.
- Offer office Ask tools while chrome.role is teacher (or vice versa) because `also_teacher`.
- Weaken `teacherSeatOnly` (`isOfficeRole` → false) so dual-hat office can draft syllabus from office JWT.

**Must-fix:** Explicit **seat**, not hat-OR. Teacher seat chrome === pure teacher (A1 §3). Office seat chrome === live office tray / `OFFICE_CLASS_TABS`. Never merge. Parent “My children” stays drawer-only. Seat is client chrome state (AsyncStorage OK). **v1: do not add a `current_seat()` table** (same as DIARY-S1). JWT/RLS still by profile + `class_teacher_of` / `isOfficeRole`. Product seat does not grant extra SQL.

Office JWT on teacher seat: they may still *be able* to call office RPCs (same uid). Product must not *offer* office Ask tools or People chrome until they switch seat. Do not pretend RLS can hide their own office capabilities without a real seat in the token — accept same-uid residual (DIARY-S1). Cross-user leaks remain P0.

### 1.4 T3 — Drawer `isAdminRole` inject on teacher chrome (live)

**Severity: P1 (P0 if matrix/activity become teacher-primary)**

Live `HamburgerDrawer`: `staff = chrome.role teacher|administrator|superintendent`, then `isAdminRole(profile)` injects People / Activity / Messages / Responsibilities. `isAdminRole` ORs `also_administrator`. A teacher primary with `also_administrator` sees office nouns while chrome.role is teacher. Super drawer is a separate branch (`profile.role === 'superintendent'`).

A1: teacher hamburger = who I am · classes I teach · switch class · Profile · Appearance · Sign out. No Office People. No Create class.

**Must-fix:** Gate drawer office nouns on **office seat** (or `isOfficeRole` **and** seat=office), not `isAdminRole` while seat=teacher. Do not delete `/activity` for office seat. Dual-hat parent row OK (`isAlsoParent`). Do not add class-create. Existing class **delete** trailing on the list is out of scope — do not expand it.

### 1.5 T4 — Search as school directory (live)

**Severity: P0 if teacher seat lists school People**

Live `search.tsx`: `listDirectory()` when `office || (staff && !chrome.classId)`. `isStaffRole` includes teacher. A teacher with no active class (or after switch-class) can pull **school directory** into Search. A1 says demoted drawer items remain searchable — meaning Gradebook/Parents/Family **of the taught class**, not Office People.

**Must-fix:** Teacher-seat search = active class roster / inbox / assignments / class parents (existing class-scoped calls). School `listDirectory` stays **office seat**. Do not key directory on `isStaffRole`. Recents in AsyncStorage: no scores, no other-class rosters. This epic’s “Search still finds them” must not be implemented as a directory firehose.

### 1.6 T5 — Ask `classId` chip as security

**Severity: P0 if chip replaces SQL**

A1: one `/ask`; bind `classId` when a class is active; no extra Ask on ClassTabs/header/FAB. Binding a chip is UX. `class_id` in Ask args is attacker-controlled (modified client).

**Must-fix:** No new Ask tools in this epic. Existing `officeOnly` (`create_class`, `add_student`, `link_parent_student`) stay office. Existing `teacherSeatOnly` stays false for `isOfficeRole`. Tools that write a class still `class_teacher_of` in SQL. Unknown tool names denied. `filterAskToolDefs` after `getUser` + profile — never `body.role`. Do not inject homework first names because chrome now “has a class.” Prompts: class name + id; no roster dump, no sibling names, no scores. Server-side keys only. Never `EXPO_PUBLIC_*`.

### 1.7 T6 — Class-create, matcher insert, extra Ask, student skin

**Severity: P0 if any ship**

A1 forbids class-create on Teacher (home, drawer, Ask, Capture). Live `canCreateClass = isOfficeRole`. “Another class” is `/?switch=1` only. Matcher never inserts students. No student `/todo` IA on teacher tray.

**Must-fix:** Chrome PR must not touch `create_class` tools, `canCreateClass`, or matcher insert paths. No sixth tray tab. No Profile-in-tray. No new capture PII (header camera remains propose; tray Capture files). AVG syllabus not a default ClassTab (own epic). Diary/Ledger stay hamburger (DIARY-A1).

### 1.8 T7 — Demoted routes / deep links / client filters

**Severity: P1 (P0 if family DTO shared)**

Hiding This week / Heatmap / Family from default ClassTabs does not unpublish routes. Teacher of that class may still open them (OK). Student/parent must not gain them because a tab was demoted or because tray Class now lands on setup.

Landing Class on Students/setup instead of Gradebook-first does **not** authorize family or student to SELECT setup. Two serializers remain: teacher DTO vs family DTO — never “hide in UI.”

**Must-fix:** No change to family/student RLS. Needs badge = numeric count, not student names or draft scores. Do not put JWT in query string on any retargeted href.

### 1.9 T8 — Dual-hat parent / twins

**Severity: P0 for sibling mash-up; P1 for same-uid**

Drawer “My children” → `/parent` is a seat change. Teacher desk queries must not UNION `parent_students`. Parent seat must not SELECT taught-class drafts/gradebook because they teach.

Twins: unchanged. This epic adds no parent payload. Cache keys that include classId must not drop child id on parent surfaces. Missing/invalid child id → empty, not a blend.

### 1.10 T9 — New persistence (seat table, claims, logs)

**Severity: P1**

Do not mint `current_seat()` SQL, JWT custom claims, or audit rows “switched to teacher seat” on Office `/activity` (existence theater). Logs: profile id + class id — not roster bodies. Vendor/Ask: unchanged soft FERPA.

## 2. Controls

A1’s chrome contract is IA. Server must keep enforcing today’s walls. UI hiding is not FERPA control.

### 2.1 What chrome may change vs must not

| May (IA) | Must not |
|---|---|
| Relabel Home→Desk (a11y), Inbox→Needs | Rename `/inbox` route in v1 |
| Retarget tray Class href to setup/hub | New routes that SELECT extra tables |
| Cut default `CLASS_TABS` to ≤7 | Delete Heatmap/Family **routes**; merge `OFFICE_CLASS_TABS` |
| Hide office nouns on **teacher seat** | Hide as the only People/Activity/matrix control |
| Bind Ask `classId` chip | Extra Ask surface; client-only tool allow-list |
| Explicit seat switch UI | Seat table; merged tray; `isTeacherRole` as chrome.role |

### 2.2 Dual-hat seat (lock)

| Seat | Chrome | Ask tools offered | SQL |
|---|---|---|---|
| Teacher | A1 teacher tray + ClassTabs | Teacher tools; **not** officeOnly | `class_teacher_of` writes; no `create_class` |
| Office | Live office tray; `OFFICE_CLASS_TABS` | Office tools; **not** teacherSeatOnly | `isOfficeRole` / admin helpers; not homework firehose |
| Parent (drawer) | Parent chrome | Family read tools only | `parent_students`; twins fail closed |

`also_teacher` / `also_administrator` / `parent_id` are hats, not chrome.role.

### 2.3 Surfaces this epic must not widen

- `listDirectory` / People / matrix / `/activity`
- `listSchoolClasses` vs `listClasses`
- Capture matcher, inbox SELECT, gradebook, family update
- Ask policy map (no new names; do not copy `assignments.manage`)
- Student / parent trays

### 2.4 v1 must-fix (copy into qa-loop if Chuck sends)

1. Chrome.role = explicit seat, not `isTeacherRole` first. Never merge trays.
2. Teacher-seat drawer: no People / Activity / Responsibilities / class-create. Parent row OK.
3. Teacher-seat Search: class-scoped only; not `listDirectory` via `isStaffRole && !classId`.
4. Ask: one `/ask`; chip ≠ SQL; do not weaken `teacherSeatOnly` / `officeOnly`.
5. No matcher insert, no `canCreateClass` change, no sixth tab, no student skin.
6. Demoted tabs ≠ revoked data for the teacher of that class; ≠ new data for family/student.
7. Badge counts not names/scores. No JWT in query string.
8. No `current_seat()` table. No Office `/activity` for seat switches.
9. Client hide is not RLS. Tests use JWT, not screenshots of the tray.

## 3. Acceptance

- [x] No new PII surfaces from TEACH-UX-A1 (chrome/IA only).
- [x] Dual-hat seat vs live `isTeacherRole` / `isAdminRole` bleed named as gates.
- [x] Search, Ask classId, drawer office nouns, class-create, matcher called out.
- [x] Chrome ≠ RLS; §2.4 must-fix list for future qa-loop.
- [x] No SQL, no app code, no kelyra-qa-loop, no git push.
- [ ] CEO/CoS review. **No senior-developer until Chuck says send.**

### Handoff

| Field | Content |
|---|---|
| **OBJECTIVE** | Security review of teacher chrome (no new PII surfaces) |
| **CONTEXT** | TEACH-UX-A1; live `ChromeProvider` / tray / drawer / search / Ask policy |
| **REQUIREMENTS** | notes/company/teacher-ux-security.md for CEO/CoS |
| **CONSTRAINTS** | No SQL; no app code; chrome is not RLS |
| **FILES** | `notes/company/teacher-ux-security.md` |
| **WORK PERFORMED** | FERPA/security note: A1 law sound; dual-hat seat + Search directory + Ask chip gates |
| **VERIFICATION** | File fills §§0–3; no src/ or supabase edits |
| **RESULT** | Ready for CEO/CoS |
| **OPEN ISSUES** | Live T2/T3/T4 already in production chrome — fix only if Chuck sends TEACH-UX |
| **ESCALATION NEEDED** | None for writing. Impl blocked on Chuck “send” |
| **RECOMMENDED NEXT ACTION** | CEO/CoS review. If yes, CoS staffs Phase A only; copy §2.4 into qa-loop. |


# CAL-R2-A: Architecture — Calendar (peer-review of CAL-A1)

**Date:** 2026-09-12
**Author:** software-architect (Kelyra)
**Card:** `t_b652626e` · Dual stamp: PM `t_8259c570` + QAS `t_09b3cb03`
**Status:** Architecture / feasibility only — **no SQL apply**, no app code, no qa-loop, no git, no Eng staffing.
**Ground:** `calendar-architecture.md` (CAL-A1), `calendar-security.md` (CAL-S1), `calendar-r2-pm-lock.md`, `calendar-r2-prd.md`, `calendar-r2-intent.md`, R2 components/research/motion.
**Companions:** `calendar-r2-sync.md` · `calendar-r2-build-vs-buy.md` · `calendar-r2-components-arch.md` · `calendar-r2-performance.md`

**Gate:** Do not staff `senior-developer` until Chuck says send.

---

## 0. Verdict

| Question | Answer |
|---|---|
| Hybrid **data** SoT (A1)? | **Holds.** Project `assignments.due_at`; do not copy dues into events. UI hybrid does not change this. |
| Hybrid **UI**? | **HYBRID, BUILD-leaning.** Own Agenda/Day/Week + chrome + motion. Buy only a thin month-grid primitive if a spike proves it does not own gestures. Not FullCalendar-as-product. |
| Overall stamp | **HYBRID** (data hybrid unchanged; UI hybrid ≠ A1 “easiest widget”). |
| `list_calendar_items`? | **Yes** — still the only family/hidden read path. DEFINER hygiene from S1. |
| Schema vs A1 | **Additive.** New `calendars` layer table + sync-ready columns so ICS/Google/SIS later do not rewrite UI. S1 **walls unchanged**. |
| Sport thin model? | **Yes** for LF-A if each team is a `calendars` row. |
| Prefs | **Local v1** (seat + focused child). Server table sketched, not required to ship. |
| Ready to implement? | **NO until CEO yes** on §12. |

Calendar = one dated/span surface the **active chrome seat** may see. Filters are never security.

---

## 1. What A1 got right (do not reopen)

| A1 lock | R2 |
|---|---|
| Hybrid SoT: project `due_at`; never duplicate into events | **Holds.** UI rec does not change data rec. Dual-write is an audit lie (also LPLAN-A1). |
| `calendar_events` for school/class/sport/personal/absence | **Holds.** Not Feed, not Diary, not `audit_events`. |
| Never `teaches_class` for family/hidden reads | **Holds.** S1-01 P0. |
| Hidden dues: `class_teacher_of` only; office not a homework firehose | **Holds.** |
| Parent 2+ children: missing `child_student_id` → **empty** | **Holds.** CH-A reloads the same RPC. |
| Dual-hat by **chrome seat**, not job-of-record | **Holds.** CAL-20. |
| AI: `calendar_search` / `calendar_draft_event`; not `assignments.manage` | **Holds.** S1-06. Matcher never inserts students. |
| Sport opt-in; never roster-copy | **Holds.** |
| Absence: C’s teachers only; delete on unlink; no `/activity` | **Holds.** |
| v1 = login + RLS; iCal later | **Holds.** CAL-22. |
| Phases A–E as a **capability** sequence | **Holds as sequence**; R2 adds UI ownership in A, not a new product law. |

Product laws CAL-01…24 and S1 must-fix CAL-S1-01–12 remain fail-closed.

---

## 2. What R2 changes vs A1 (and why)

A1 was written before Apple-inspired lock (VW-A, LF-A Calendars sheet, VZ-A, motion). Data law was right; **layer identity and UI shell were underspecified**.

| Change | Why (not “easier widget”) |
|---|---|
| First-class **`calendars`** rows (layers) | LF-A sheet needs stable IDs. Future ICS/Google/SIS attach to a layer, not a new UI. A1 synthesized layers from `class_id`/`team_id` — fine for v1 paint, **paints a corner** for providers. |
| `calendar_id` on events + synthetic id for assignment projection | One item renderer. Assignment dues stay on `assignments`; they **appear as** items on a class-work layer. |
| Sync-ready nullable columns (`provider`, `external_id`, `etag`, `deleted_at`, `is_read_only`) | v1 unused. Avoids a second events table in v2. See `calendar-r2-sync.md`. |
| UI **HYBRID / BUILD-leaning** | A1 did not lock UI. R2 research’s “Wix + FullCalendar” would fight M-RANGE-SWIPE, DP-A badges, VZ-A. See build-vs-buy. |
| Client item DTO (`CalendarItem`) | Views never bind to Postgres shape or to a vendor Event API. |
| Prefs: **local v1** | PM already allowed. Roaming is v1.1. |
| `p_seat` on RPC, **server-validated** | Client cannot claim Teacher seat without `class_teachers` / office without admin. |

**What does not change:** hybrid SoT, helper split, Ask tools, ANPR/Diary out, no public URL.

If recommendation vs A1 **data** hybrid changed, we would explain it here: **it did not.** UI hybrid is a new decision, orthogonal.

## 3. Data model (sketch, not a migration)

Names illustrative. **No CREATE TABLE in this ticket.** Do not apply as a migration.

### 3.1 Three kinds of “calendar stuff” — do not collapse

| Kind | SoT table | Calendar layer | Writable from Calendar UI? |
|---|---|---|---|
| Assignment due | `assignments.due_at` + visibility cols | Synthetic class-work layer `asg:<class_id>` | **No** delete-due. Open assignment. Hide/Publish = visibility cols. |
| Kelyra event | `calendar_events` | `calendars` row | Yes if owner / office-school / `class_teacher_of` for class events |
| Future external | still `calendar_events` copies or live-proxy v2 | `calendars` with `provider≠kelyra` | Usually **read-only** |

Lesson **plans** (LPLAN-A1): teacher-only projection later; **not** v1 Calendar items. Do not copy plan body onto events.

### 3.2 Assignment projection (A1 cols — keep)

| Column | Notes |
|---|---|
| `calendar_visibility` | `hidden` \| `published`. Independent of assign-to-roster. |
| `calendar_published_at` / `calendar_published_by` | Family unhide audit |
| `calendar_span_end` | Optional; omit v1 if unused |

Defaults (PM locked): quiz/test/midterm/final → `hidden` when `due_at` set. homework/practice/lesson → `published`. No `due_at` → not a calendar item. Re-hide = v1.1 product; **column already supports it**.

### 3.3 `calendars` (new vs A1 — layer identity)

| Column | Notes |
|---|---|
| `id` | uuid PK. UI `calendarId`. |
| `school_id` | required |
| `provider` | `kelyra` v1; later `ics` \| `google` \| `microsoft` \| `apple` \| `sis` |
| `kind` | `school` \| `class` \| `class_work` \| `team` \| `personal` \| `absence` \| `external` |
| `class_id` / `team_id` / `owner_profile_id` / `student_id` | At most one binding; nulls otherwise. `student_id` never minted here. |
| `name` | Display in LF-A list |
| `role_tint` | `academic` \| `school` \| `sport` \| `personal` — **max 4**, never per-row hue |
| `is_read_only` | true for future inbound; false for Kelyra-owned |
| `default_enabled` | product policy (school on; sport off) |
| `external_id` / `sync_cursor` / `last_synced_at` | null v1 |
| `created_at` / `updated_at` | |

**Provisioning v1 (server, not client invent):** one `school` calendar per school; one `class` + one `class_work` per class; one `personal` per profile; `team` when a team is created; absence is **not** a separate subscribed calendar — it is items on personal/child with `category=absence`.

`class_work` layers have **no** `calendar_events` rows. They exist so LF-A can Disable “Homework for 5th math” without hiding field-trip events on the class layer.

### 3.4 `calendar_events` (A1 + additive)

Keep A1: `id`, `school_id`, `class_id`, `team_id`, `student_id` (SET NULL; **never minted**), `owner_profile_id`, `seat`, `category`, `title`, `body`, `starts_at`, `ends_at`, `all_day`, `visibility_scope` (`self` \| `class` \| `school` \| `student_teachers` \| `team`), `status` (`draft` \| `published`), `source` (`manual` \| `ai_nl`), timestamps.

Add:

| Column | v1 use |
|---|---|
| `calendar_id` | FK `calendars`. Required for real events. |
| `timezone` | IANA; default school TZ. Instants stored UTC. |
| `is_read_only` | denorm of calendar or per-event override |
| `provider_event_id` / `ical_uid` / `etag` | null v1 |
| `recurrence_rule` / `recurrence_parent_id` | **null v1** (single instance). Column reserved; no editor. |
| `deleted_at` | null v1 hard-delete OK; v2 tombstones for sync |

Indexes: A1 plus `(calendar_id, starts_at)`, partial `(school_id, starts_at) WHERE deleted_at IS NULL`.

**Deletes v1:** owner (or office for school) hard-delete. Assignment delete drops projection. Parent absence on child unlink: **delete row** (A1/S1). Do not SET NULL into a school firehose.

### 3.5 Sport (thin — enough for LF-A)

A1 `calendar_teams` + `calendar_team_members` (`team_id`, `student_id` or `profile_id`, `role`) **plus** one `calendars` row `kind=team` per team.

LF-A row: name, enabled toggle (Disable), ⋯ Unsubscribe (membership delete), never labeled Delete. Coach write of games = later unless `role=coach` and product allows; v1 may be **read** of opted teams (A1 D). Architect: v1 **read + Unsubscribe** is enough; game CRUD is coach fast-follow, not a new table.

Never copy class roster into `calendar_team_members`.

### 3.6 IDs the UI must treat as opaque

| ID | Shape | Notes |
|---|---|---|
| `calendarId` | uuid **or** synthetic `asg:<class_uuid>` | Client never parses except the `asg:` prefix in the mapper |
| `itemId` | `{source, id}` | `assignment:<uuid>` vs `event:<uuid>` |
| `externalId` | null v1 | Do not use as React key |

Ownership: `owner_profile_id` + `visibility_scope`. Read-only: `is_read_only` or seat matrix. Conflicts: none in v1 (single writer). Offline: no local write queue; Save/Delete refuse (CAL-24). Cache: range snapshots keyed by `seat|childId|classScope|from|to` — see performance note.

## 4. Read model

**Still `list_calendar_items`.** Client **never** wide-selects `calendar_events` / `assignments` then filters.

Indicative signature:

`list_calendar_items(p_from, p_to, p_seat, p_class_id?, p_child_student_id?, p_categories[]?, p_calendar_ids[]?)`

| Arg | Rule |
|---|---|
| `p_seat` | `teacher` \| `student` \| `parent` \| `office`. **Validate** caller may occupy that seat. Wrong seat → empty, not elevated. |
| `p_child_student_id` | Parent with 2+ links: **required** and in `parent_students`. Missing/invalid → **empty**. |
| `p_class_id` | Teacher default = active class. Null + teacher “All my classes” = OR of `class_teacher_of` ids. Never `teaches_class`. |
| `p_calendar_ids` | Optional UX filter. **Intersection** with RLS, never union/elevation. |
| `p_categories` | Same: filter, not security. |

SECURITY DEFINER, `search_path=public`, re-check `auth.uid()`, revoke `anon`/`public`, predicates **inside** (S1-08). UNION (1) assignment projection in range with §5 filters (title + due + category + visibility — **no scores/drafts/classmates**); (2) `calendar_events` in range with `deleted_at IS NULL`.

Row DTO (client `CalendarItem`):

`{ source, id, calendarId, title, startsAt, endsAt, allDay, category, roleTint, classId, studentId, visibility, isHidden, isReadOnly, isDraft, deepLink }`

Assignment `deepLink` = existing assignment form. Event = CR-A sheet. Publish = Needs deep-link (CAL-07).

Companion RPCs (indicative): `list_calendars(p_seat, p_child_student_id?)` for LF-A sheet (name, kind, enabled-default, is_read_only, can_unsubscribe). `unsubscribe_team`. Writes: existing A1 owner/office/class_teacher_of. RPCs must not INSERT `classes` or `students`.

---

## 5. RLS / S1 walls

**Unchanged.** Copy S1-01–12 into any future SQL ticket. Filter chips are not security.

| Helper | Calendar use |
|---|---|
| `class_teacher_of` | Teacher write class events; hidden due read; absence recipients for C’s enrollments |
| `teaches_class` | **Forbidden** on this surface |
| `is_school_admin` | School-layer CRUD only. Never SELECT `self`, `student_teachers`, hidden assignments |
| `parent_students` | Parent scope; 2+ require child |
| `my_student_id` / enrollment | Student published + own `self` |
| Active seat | Dual-hat: teacher query ≠ parent query |

Item matrix = A1 §3.2 / S1 §2.2. Student does **not** see own absence in v1 (A1/S1). Ask caps: new `calendar.read` / `calendar.write`, **not** `assignments.manage`.

**Schema vs S1:** new `calendars` table + columns. Walls same; **CoS should restaff `security`** to review the new table and RPC args (`p_seat`, `p_calendar_ids`) for confused-deputy. Do not skip S1 because “predicates look familiar.”

---

## 6. Provider-agnostic UI contract

Views bind **only** to:

1. `CalendarLayer[]` from `list_calendars` (toggle, search ≥8, presets).
2. `CalendarItem[]` from `list_calendar_items` for the visible range.
3. Local prefs (enabled layer ids, chips, last view).

A future Google layer is another `CalendarLayer` with `isReadOnly=true` and items with `source=event`. **No new Agenda/Week component.** No FullCalendar event source API in the product.

Kelyra-generated / school / ICS / Google / Microsoft / Apple / SIS differ in **adapter + `calendars.provider`**, not in chrome.

---

## 7. Prefs, sport, AI, phasing, CEO locks

### 7.1 Prefs

v1: AsyncStorage (already in tree) keyed `calprefs:v1:{profileId}:{seat}:{childId|none}`. Stores: view, enabled `calendarId`s, category chips, last anchor date. Sport layers start **off** even if the key is empty (default policy in code, not “whatever was last on this device”).

v1.1 optional `calendar_layer_prefs(profile_id, seat, child_student_id, calendar_id, enabled)` — do **not** ship v1 unless CEO-3 says roam. Sketch so Eng does not stuff JSON into `profiles`.

### 7.2 Sport vs LF-A

Thin model **is enough** for the Calendars sheet: list opted teams, Disable, Unsubscribe. Do not add RSVP, seasons UI, or TeamSnap. If a user is not a member, the team layer does not appear (opt-in flow is elsewhere / later).

### 7.3 AI

Unchanged: `calendar_search` ⊆ visible; `calendar_draft_event` returns draft; Save is CR-A. Refuse class-create, student-insert, grade Approve, twin merge, non-office school blast. Logs = ids not bodies (S1-11).

### 7.4 Phasing vs A1 A–E (after Chuck send)

| Phase | A1 | R2 (same letters, UI owned) |
|---|---|---|
| **A** | vis cols + RPC + teacher web read | Same + `calendars` provision + teacher **Week** (web) using `CalendarItem` mapper — **no** FullCalendar |
| **B** | family publish + student/parent read | Same + phone **Agenda+Day** + DP-A badge + CH-A |
| **C** | events + office + absence | Same + CR-A sheet/modal + MG-A menus |
| **D** | filter prefs + sport read | LF-A chips + Calendars sheet + local prefs + Unsubscribe |
| **E** | Ask tools | Same names; after D so search ⊆ the same RPC |

Motion essential + RM ride C (sheets) and B (range). Do not a separate F that blocks A–E.

### 7.5 Complexity / risks

- **Medium-high UI**, medium schema. Risk: Eng drops Wix Agenda in to “save time” and breaks motion/VZ-A.
- Risk: `p_seat` trusted from client.
- Risk: synthesizing layers in the client instead of `list_calendars`.
- Residual: vendor NL (S1-11 P1).

### 7.6 CEO decisions required before Eng

| # | Decision | Architect rec |
|---|---|---|
| **CEO-1** | Overall **HYBRID** (data hybrid + BUILD-leaning UI) vs force Wix/FullCalendar shell | **HYBRID** as this pack |
| **CEO-2** | Re-hide after publish in v1 vs v1.1 | **v1.1** (PM). Schema already allows. |
| **CEO-3** | Layer prefs local-device v1 vs server roam v1 | **Local v1** |
| **CEO-4** | Student sees own absence v1? | **No** (A1/S1) |
| **CEO-5** | Ship `calendars` layer table in v1 vs A1 synthesize-only | **Ship table** (future sources) |
| **CEO-6** | Co-teacher **edit** of class events (not just read) | **Owner write v1**; co-teacher read via `class_teacher_of`. Edit later. |

Not CEO: DATE primitive inside CR-A (DATE-P1); icon recipes; Desk intact.

### 7.7 Recommended next

CoS staffs **`security`** (schema/RPC vs S1), then **`qa-engineer`** strategy. **Hold** `senior-developer`.

---

## 8. Handoff

- **OBJECTIVE:** Peer-review CAL-A1 vs R2 lock; implementation-ready architecture without UI rewrite for future sources.
- **FILES:** `notes/company/calendar-r2-architecture.md` + sync, build-vs-buy, components-arch, performance.
- **WORK PERFORMED:** Hybrid data holds; UI HYBRID BUILD-leaning; `calendars` layer; list_calendar_items retained; S1 walls retained; CEO-1…6.
- **VERIFICATION:** Markdown sketches only; no SQL files; no app code.
- **RESULT:** **HYBRID**. Not implementation.
- **OPEN ISSUES:** CEO-1…6.
- **ESCALATION NEEDED:** Security restaff because tables/RPC args change vs A1.
- **RECOMMENDED NEXT ACTION:** CoS → security, then QE; hold Eng.

# RIDE-A1: Architecture — car-rider queue

**Date:** 2026-09-04
**Author:** software-architect (Kelyra)
**Card:** RIDE-A1 `t_039390dd` · Plan: `notes/company/car-rider-plan.md` · Research: `notes/company/car-rider-research.md`
**Status:** Architecture only — **no SQL**, no app code, no kelyra-qa-loop, no git push.
**Live ground:** `docs/data-model.md` (`parents`, `parent_students`, `profiles.parent_id`), `is_school_admin` / `my_school_id` (`20260817000005_school_roles.sql`), `class_teacher_of` (AVG write wall), messages realtime (`20260818000008_message_realtime.sql`), `write_audit`. **There is no household table today.**

**Gate:** Do not staff `senior-developer` / `kelyra-qa-loop` until Chuck says send.

---

## 0. Verdict and law

| Question | Answer |
|---|---|
| Schema sketch enough for a future loop? | **Yes** (this file). |
| Order source in v1? | **Staff check-in time** (keypad / camera QR). Never GPS. |
| Household vs `parents`? | **New `households`.** Do not treat a parent person as the Family ID. |
| Duty vs `is_staff`? | **Explicit `dismissal_duty`.** Do not widen `is_staff` / `is_staff_profile`. |
| Auto-release? | **No.** Tag = possession. Staff confirm at curb. |
| Implementation ready? | **NO until CEO yes.** |

| Surface | Job | What it is not |
|---|---|---|
| **Family ID** | One printed placard (large digits + optional QR) per household **at this school** | Not a student ID; not a login; not a cross-school merge |
| **Queue** | Ordered live list so staff stage kids in arrival order | Not ANPR, not RFID, not a public URL, not a parent firehose |
| **Window flags** | Per-student `car` / `aftercare` / `bus` (+ day-of override) | Not a calendar product; not bus routing; not aftercare billing |
| **Parent (optional later)** | Own household status + cancel / “I’m in line” tap | Not the full school line; not a new App Store listing |

**CEO bar (RIDE-R1 / RIDE-P1):** Real-time ordered dismissal, **no special equipment**, minimal admin setup, lowest effort for parents and staff. Feel like Driveline **inside Kelyra**.

## 1. Scope / non-goals

**In v1 (data + staff):** household Family ID; explicit student↔household links; per-student window flags; append-mostly queue events (`check_in`, `left`, `released`); duty roster; staff keypad/QR on the phone they already have; classroom/staging list filtered by window/zone; office print/reissue; staff visual confirm.

**FERPA fail-closed (product law, not a legal opinion):**

- Live queue names are an operational education record. **No anonymous `kelyra.app` dismissal URL.** Login + RLS.
- Other parents see **nothing** of the line. Own household status only (in line / waiting / released) — not neighbor names, not a school-wide ticker.
- Twins: same Family ID **only** if office put both on **one** household. Unlabeled sibling blend → empty, not a mash-up (Saydee ≠ Sydnee).
- Teachers do not create classes from this surface. No office directory mint from Ask.
- Do **not** widen `is_staff` / `is_staff_profile` / `teaches_class` (office bypass) to queue SELECT.
- Student role: no car-rider UI in v1.

| Non-goal | Why |
|---|---|
| ANPR / cameras / RFID / beacons | CEO: no special equipment |
| GPS as queue order | Pickup loops block signal; advisory only later |
| Required new parent app | Fatigue; Driveline wins on this |
| Auto-release without staff eyes | Wrong-child risk |
| Derive household from `parent_students` graph | Custody / step / twins; link must be explicit |
| Carpools across families | Later; one household check-in ≠ two Family IDs |
| Bus routing / aftercare billing | Flags only |
| Hash-chain / blockchain audit | `queue_events` + `write_audit` on office verbs is enough |
| New `IconName` / chrome in this ticket | Architecture only |

## 2. Data model (sketch, not a migration)

Names proposed. No CREATE TABLE in this ticket. One school today (`profiles.school_id` / `my_school_id()`). Still stamp `school_id` on every new row so a second campus cannot leak.

**Do not** hang Family ID on `parents` or `students`. A parent person can have children in two households over time; a student can have two parents. Pickup unit is an **office-curated household**.

### 2.1 `households`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `school_id` | uuid NOT NULL | FK `schools`. Must equal `my_school_id()` on write. |
| `family_code` | text NOT NULL | Short digits for keypad + placard. Unique **among active** rows per school. |
| `code_generation` | int NOT NULL | Bumps on reissue. Old printed tags fail lookup. |
| `status` | text NOT NULL | `active` \| `void`. Reissue voids the old row (or same row with new code — pick one in SQL; prefer **void old + insert new** so history keeps the printed number). |
| `label` | text | Optional office nickname (“Chen van”). Not shown to other parents. |
| `created_at` / `updated_at` | timestamptz | |

Unique: `(school_id, family_code)` where `status = 'active'`. Codes are **not** secrets that grant access; staff JWT + duty is the authz. QR payload = `{school_id, family_code, generation}` so a stolen PDF from last year does not check in after reissue.

### 2.2 `household_students`

| Column | Type | Notes |
|---|---|---|
| `household_id` | uuid NOT NULL | FK CASCADE |
| `student_id` | uuid NOT NULL | FK `students` |
| `created_at` | timestamptz | |

Unique `(household_id, student_id)`. **v1 invariant:** a student is in **at most one active** household at this school (unique `student_id` among households with `status = active`). Split-custody / two-car households are **later**. Check-in stages **all** current members at this campus — never another family’s kids.

Do **not** auto-insert from `parent_students`. Office links (or a one-shot “group these siblings” UI). Unlink is detach, not student delete.

### 2.3 Guardians (no extra table in v1)

Who may see own-household status / later tap “I’m in line”: any signed-in `profiles.parent_id` with a `parent_students` row to a **current** `household_students.student_id`. Dual-hat staff using My children uses the parent hat, not duty.

Office print/reissue does not require a parent login. Token-only `/parent` (no `auth.uid()`) **cannot** write queue events in v1.

### 2.4 Window flags — `student_dismissal`

Per **student**, not per household (one sibling car, one aftercare).

| Column | Type | Notes |
|---|---|---|
| `student_id` | uuid PK | FK `students` ON DELETE CASCADE |
| `school_id` | uuid NOT NULL | Denormalized for RLS |
| `default_mode` | text NOT NULL | `car` \| `aftercare` \| `bus` |
| `default_zone` | text | e.g. `A` / `B` / wing. Free text in v1; office-controlled list later. |
| `updated_at` | timestamptz | |

Missing row: treat as `car` until office sets. Not a calendar. Not billing.

### 2.5 Day-of override — `dismissal_overrides`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `student_id` | uuid NOT NULL | |
| `school_id` | uuid NOT NULL | |
| `on_date` | date NOT NULL | School-local date |
| `mode` | text NOT NULL | Same enum as default |
| `zone` | text | |
| `set_by` | uuid | `profiles.id` |
| `created_at` | timestamptz | |

Unique `(student_id, on_date)`. Effective mode = override if present else default. No week wizard.

### 2.6 Duty roster — `dismissal_duty`

This is the staff wall. **Not** `is_staff`.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `school_id` | uuid NOT NULL | |
| `profile_id` | uuid NOT NULL | FK `profiles` |
| `duty_role` | text NOT NULL | `curb` \| `stage` |
| `window_mode` | text | Null = all modes that day |
| `zone` | text | Null = all zones |
| `on_date` | date | Null = standing assignment (weekdays until void) |
| `created_by` | uuid | Office |
| `created_at` | timestamptz | |

`curb`: keypad/QR check-in, left, **release confirm**. `stage`: SELECT live list (filter wing/zone); **no** release. Office (`is_school_admin()`) assigns duty and prints IDs; they may SELECT the live list for the campus they admin — that is `is_school_admin`, **not** `is_staff`. A teacher with no duty row sees **no** queue.

### 2.7 `queue_events` (append-mostly; source of truth)

One row per action. Live list is a **projection** of the latest event per `(household_id, school_date, window_mode)`, not a mutable “position” column.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `school_id` | uuid NOT NULL | |
| `household_id` | uuid NOT NULL | FK `households` |
| `school_date` | date NOT NULL | School-local calendar day |
| `window_mode` | text NOT NULL | `car` \| `aftercare` \| `bus` (the window this event is for) |
| `kind` | text NOT NULL | `check_in` \| `left` \| `released` |
| `source` | text NOT NULL | `keypad` \| `qr` \| `parent_tap` \| `offline_sync` |
| `actor_profile_id` | uuid | Staff or parent login. Null never for v1 writes. |
| `client_event_id` | uuid NOT NULL | Idempotency from the device. Unique `(school_id, client_event_id)`. |
| `occurred_at` | timestamptz NOT NULL | **Server** `now()` for order. Offline: accept client clock only as `client_occurred_at`; do **not** rank by it. |
| `client_occurred_at` | timestamptz | Diagnostic; not order. |
| `note` | text | Optional staff note. No GPS, no lat/lng, no plate. |

**No columns in v1:** `lat`, `lng`, `accuracy`, `plate`, `photo_match`, `eta`. Adding them later is a new product decision.

**Order:** `rank()` over `occurred_at` among households whose **latest** event that day/window is `check_in` (status `in_line` / waiting). `left` or `released` drops them from the live list. Re-check-in after `left` is a new `check_in` (new rank at the tail). Duplicate check-in while already in line: no-op (return existing).

**Release grain:** household-level in v1 (all staged siblings walk together). If effective mode for a member is not this window, they are **not** in the staged set (aftercare sibling stays). Per-child release is later.

Do **not** reuse `audit_events` as the queue. Office `/activity` stays admin firehose. `write_audit` on office verbs only: create/void household, reissue code, duty assign, day-of override. High-frequency curb check-ins stay on `queue_events` (or `/activity` becomes unusable).

### 2.8 Live projection (view or RPC; not a second write path)

Staff UI reads `dismissal_queue_live(p_date, p_mode, p_zone)` → `{ household_id, family_code, position, check_in_at, students[{id, display_name, zone, mode}], status }`. Filter students to those whose **effective** mode/zone matches. Parent UI reads `dismissal_household_status()` → own household only, **no** `position` among others (or an opaque “you’re in line” boolean — **never** “you are #12 of 40” if that implies volume of other families; v1: status enum only).

Realtime: add `queue_events` to `supabase_realtime` the same way as `messages`. RLS on the table still applies to the payload. Do not open a public channel.

### 2.9 Why not X

| Temptation | Reject |
|---|---|
| `students.metadata.family_id` | Canonical metadata is not a queue PK; no RLS; twins collide |
| `parents.id` as Family ID | Two parents ≠ one car; one parent ≠ all siblings |
| Connected-component of `parent_students` | Silent twin merge; custody graphs |
| Mutable `queue_position` int | Offline races; two devices |
| GPS ping as `check_in` | RIDE-P1 law |
| Public storage of placard PDF | FERPA-adjacent PII; sign in office session only |

## 3. RLS (fail closed)

Helpers (names proposed; SECURITY DEFINER, `search_path = public`, same style as `is_school_admin`):

- `on_dismissal_duty(p_role text, p_mode text, p_zone text)` — caller has a `dismissal_duty` row for this school, this date or standing, matching role (`curb`/`stage`), mode/zone null-means-all.
- `parent_of_household(p_household_id uuid)` — `profiles.parent_id` linked via `parent_students` to a current `household_students` member. If the parent has 2+ children and they sit on **different** households, queries must bind `household_id` (or focused child). Unlabeled blend → **no rows**.

Do **not** use `is_staff()` / `is_staff_profile()`. Do **not** use `teaches_class()` (office sees every class). `class_teacher_of` is **not** a substitute for duty: a teacher who is not on the roster does not get the live line even for their own roster. Staging is a duty assignment (often the homeroom teacher, assigned in bulk by office).

Anonymous / student JWT: deny all.

### 3.1 Table policies (sketch)

| Table | SELECT | INSERT / UPDATE / DELETE |
|---|---|---|
| `households` | Office (`is_school_admin` + same `school_id`); duty (code + label only as needed for the list); parent: **own** active household row (code + status, not other families) | Office only. No parent write. No teacher mint. |
| `household_students` | Same wall as parent household; duty/office for members they may stage | Office only |
| `student_dismissal` | Office; duty; parent of that student | Office; curb duty may set **day-of override** only (not default) |
| `dismissal_overrides` | Office; duty same school/date; parent of that student | Office; curb duty |
| `dismissal_duty` | Own row; office all for school | Office only |
| `queue_events` | Duty/office: events for this school + assigned window/zone. Parent: events for **own** `household_id` only (no other households). | **No client INSERT.** Writes go through RPCs. No UPDATE/DELETE for any role (append-mostly). |

Realtime replica identity: parents must not receive other households’ `queue_events` rows. Test that a parent JWT subscription does not see neighbor check-ins (payload leak). Prefer **RPC poll + filtered realtime** on a parent-safe view if table realtime is too wide.

### 3.2 RPCs (user JWT; never service-role as actor)

| RPC | Who | Does |
|---|---|---|
| `dismissal_check_in(p_family_code, p_generation, p_client_event_id, p_source)` | `on_dismissal_duty('curb', …)` | Resolve active household; insert `check_in` if not already in line; return live card. Unknown code → error, **do not** create household. |
| `dismissal_mark_left(...)` | Curb duty **or** `parent_of_household` | Insert `left`. |
| `dismissal_release(...)` | Curb duty **only** | Insert `released`. Never parent. Never stage-only. Never auto. |
| `dismissal_queue_live(...)` | Curb, stage, office | Projection. Stage cannot call release. |
| `dismissal_household_status()` | Parent of household | Own status enum only. |
| `office_reissue_family_id(p_household_id)` | `is_school_admin` | Void old, mint new code, `write_audit`. |
| `office_set_household_students(...)` | `is_school_admin` | Explicit links. Never invent students. `write_audit`. |
| `office_set_dismissal_duty(...)` | `is_school_admin` | `write_audit`. |

Parent “I’m in line” (P3, **not** v1 staff ship): same `dismissal_check_in` with `source=parent_tap`, gated `parent_of_household`. Still **not** GPS. Explicit tap.

### 3.3 Visibility matrix (maps RIDE-P1 §6)

| Viewer | Sees |
|---|---|
| Parent login | Own household status this school |
| Curb duty | Live queue for assigned windows/zones |
| Stage duty | Same list, typically zone-filtered; no release |
| Office admin | IDs, duty, overrides, live list this school |
| Other parents | Nothing |
| Other schools | Nothing (`school_id` ≠ `my_school_id()`) |
| Teacher, no duty | Nothing |
| Student / anon | Nothing |

### 3.4 Dual-hat / Ask

Seat is chrome. A teacher-parent on duty sees the **duty** list in staff chrome; My children sees **only** their household status. Do not OR the two into one query.

Ask: v1 staff NL “who’s next for wing B” is a **client filter** of `dismissal_queue_live`, not a new tool that dumps roster. If an Ask tool is added later: privilege wall (new name, not `is_staff`), confirm picker, no invented students. Teachers still do not create classes.

### 3.5 Tests the future loop must have

- Parent JWT cannot SELECT another household’s events (including realtime).
- `is_staff_profile` true + no duty row → no queue.
- Twin students, two households → two codes; check-in A does not stage B.
- Twin students, one household → one check-in stages both.
- Voided Family ID does not check in.
- `teaches_class` office user without duty: no curb RPC.
- Release RPC as parent → denied.
- GPS fields absent from schema.

## 4. Queue events / offline / devices

### 4.1 State (per household × school_date × window)

```
absent  --check_in-->  in_line  --released-->  released
              |                      ^
              +--left-->  left       |
              |                      |
              +--check_in (idempotent no-op if already in_line)
left --check_in--> in_line (tail of line; new occurred_at)
```

Staff confirm at curb is the only `released` transition. Tag visible ≠ identity.

### 4.2 Check-in mechanic (v1)

**Primary:** printed Family ID. Staff types digits or scans QR with the **phone camera they already have**. QR is a typed-code shortcut, not a capability token.

**Not v1 order source:** GPS, geofence, ANPR, beacon RSSI, “usually this time.”

### 4.3 Offline

MVP architecture doc said “no offline sync” for capture. Dismissal **cannot** pretend the line stops when LTE dies in a pickup loop.

Honest v1:

1. Last successful `dismissal_queue_live` payload cached on the duty device (AsyncStorage). Show “cached at {time}” chrome.
2. Local outbox of `{client_event_id, kind, family_code, client_occurred_at}`. Replay through RPCs when online.
3. **Server `occurred_at` wins for rank.** Two devices both check in the same code: idempotent. Offline check-in that lands after another car already checked in online goes to the **tail**, not the remembered local slot. Copy: “Order updated when we reconnected.”
4. Walkie fallback is operational, not a schema. Manual override = staff taps check-in when they can.
5. Do not build CRDT / SQLite replica.

### 4.4 Stolen / shared tag

Office reissues (`office_reissue_family_id`). Old `family_code`+generation does not resolve. History of voided codes stays for disputes. No silent recycle of a number the same year if we can avoid it (allocator skips recently voided).

### 4.5 Late parent

Row stays `in_line` until `left` or `released`. No SMS in v1. No auto-drop after N minutes (wrong-child / abandoned-kid risk if we invent a timeout).

### 4.6 Devices / chrome (when built, not this ticket)

Existing phone/iPad; landscape OK **after** sign-in. Spare iPad on a music stand is a deployment choice, not a SKU. No kiosk unlock URL. No new `IconName` here.

### 4.7 AI

Only if it earns keep: filter the existing live list (“wing B”). Parent NL “I’m in line” maps to **that** household after P3 exists. No photo-match theater. No predictive ETA.

## 5. v1 vs later

Maps RIDE-P1 §9–10. **No impl in this ticket.**

| Phase | Build | Schema already sketched? |
|---|---|---|
| **P0 data** | Households, members, window flags, overrides, duty, `queue_events`, RPCs, RLS tests | Yes |
| **P1 staff** | Keypad/QR, live list, zone filter, release confirm, classroom read, offline cache | Yes (UI later) |
| **P2 office** | Print/PDF placards (signed, not public), reissue, day-of override UI | Yes |
| **P3 parent** | Status + cancel; “I’m in line” tap inside existing Kelyra parent surface | RPC hook only; no new store listing |
| **P4 later** | GPS **advisory** + disclaimer (never rank), photo verify, SMS, ANPR, cross-family carpool, per-child release, split-custody second household | **Do not add columns now** |

| v1 | Later |
|---|---|
| Placard + staff device | ANPR / RFID / LPR |
| One active household per student | Two-car / split custody |
| Staff visual confirm | Photo ID at curb |
| Server time = order | GPS advisory only |
| No parent install required | Kelyra parent tap |
| Duty roster wall | Still never `is_staff` |

Migration sequencing (when Chuck says send, not now): **M1** households + members + family_code allocator; **M2** window flags + overrides; **M3** duty + helpers; **M4** `queue_events` + RPCs + realtime; **M5** RLS tests. Do not enable parent tap until P1 staff path is real.

## 6. Acceptance

- This file exists for CEO / CoS review.
- No application code, no SQL under `supabase/migrations/`, no kelyra-qa-loop, no git push.
- Decisions locked for a future loop: new `households` (not `parents`); `queue_events` append-mostly; order = server check-in time; duty roster not `is_staff`; parent sees own household only; no GPS/ANPR columns; no auto-release.
- **Next:** Chuck reviews. Do **not** staff `senior-developer` until he says send.

**Risks if implementers ignore this file:** widening `is_staff` (school-wide parent-visible firehose via a confused deputy); deriving siblings from `parent_students` (twin merge); ranking by client GPS time; client INSERT on `queue_events`; public dismissal URL.

**Open (product, not architect):** exact digit length of Family ID; whether office standing duty is weekday-only; whether stage duty is bulk-homeroom or per-zone list. Defaults if unspecified: 4–5 digits per school; standing duty = all weekdays; office assigns stage by zone.

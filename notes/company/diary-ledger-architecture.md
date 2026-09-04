# DIARY-A1: Architecture — private diary + activity ledger

**Date:** 2026-09-04  
**Author:** software-architect (Kelyra)  
**Card:** DIARY-A1 `t_8dcc968f` · Stories: `notes/company/diary-ledger-stories.md` · Research: `notes/company/diary-ledger-research.md`  
**Status:** Architecture only — **no SQL**, no app code, no kelyra-qa-loop, no git push.  
**Live ground:** `docs/data-model.md`, `audit_events` + `write_audit` (`20260817000005_school_roles.sql`), `/activity` admin-only, `askToolPolicy.ts`, `transcribe` Edge (xAI STT), private `photos`/`audio`/`files` buckets.

**Gate:** Do not staff `senior-developer` / `kelyra-qa-loop` until Chuck says send.

---

## 0. Verdict

| Question | Answer |
|---|---|
| Schema sketch enough for a future loop? | **Yes** (this file). |
| Honest privacy model? | **v1 = RLS-only + private bucket.** Not envelope. Not E2E. |
| Ledger vs `audit_events`? | **New `ledger_events`.** Do not open `/activity` or teacher SELECT on `audit_events`. |
| Implementation ready? | **NO until CEO yes.** |

Diary = US-T-D1–D6, US-S-D1, US-P-D1–D2, US-PRIV-1–2. Ledger = US-T-L1–L4, US-S-L1. Parent Ledger **deferred** (US-P-L1 / L-6). Chrome: US-UX-1–3.

| Surface | Job | What it is not |
|---|---|---|
| **Diary** | Owner-only notes (text/media/STT), hat-scoped | Not student Log; not Office Activity; not home; not Calendar |
| **My Ledger** | Append-mostly record of *my* Kelyra actions | Not diary prose; not school-wide audit UI |
| **Office Activity** (live) | School-wide `audit_events` | Teachers’ personal ledger |

## 1. Scope / non-goals

**In v1:** owner Diary (text, STT, photo, search) per seat; teacher My Ledger auto-rows; staff My Ledger of *their* office actions; honest privacy copy; chrome = Profile/hamburger → `/diary` with **Journal | Ledger** segments. Not a tray tab. Not House home (US-UX-2).

**FERPA fail-closed (product law, not a legal opinion):**

- Institutionally maintained student-named notes can become education records. Copy: “Personal reflection — not the official student file.”
- No Office/HR screen to read teacher/parent diaries. No “send to principal.”
- No auto-file onto student Log / Feed / Messages / Capture Inbox.
- Twin streams never merge (Saydee ≠ Sydnee). Parent list with 2+ `parent_students` **must** filter; unlabeled blend returns **empty**, not a mash-up.
- Teachers do not create classes from Diary, Ledger, or Ask.
- Do **not** widen `is_staff` / `is_school_admin` / `teaches_class` to diary or ledger SELECT.
- Student role: no Diary, no Ledger.
- Public storage URLs: forbidden.

| Non-goal | Why |
|---|---|
| Home-screen replacement | DR-8; Desk owns Today / Needs you |
| Office-visible discipline log | FERPA + HR; not PBIS/SIS |
| Fake E2E / “only you can ever see this” | Crypto theater (US-PRIV-1) |
| Envelope encryption | Later (L-1); do not advertise until built |
| Promote diary → student Log | L-5; separate FERPA gate |
| Household / shared diary | L-9 |
| Office warrant-read of diary | L-10 |
| Hash-chain / blockchain ledger | L-4 |
| Parent My Ledger | Defer (L-6) |
| New privileges | Ledger observes; does not grant assign/grade |
| `grok-tts` for diary STT | TTS lock is output; STT is `transcribe` Edge |

## 2. Data model (sketch, not a migration)

Names proposed. No CREATE TABLE in this ticket. Seat is **chrome**, not `profiles.role` job-of-record (dual-hat: same `owner_profile_id`, different `seat`).

`seat` enum (app/check): `teacher` | `staff` | `parent`. `staff` = superintendent/administrator chrome. Student seat: no rows.

### 2.1 `diary_entries`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `owner_profile_id` | uuid NOT NULL | FK `profiles(id)` ON DELETE CASCADE. **Always** `auth.uid()` on write. |
| `seat` | text NOT NULL | teacher/staff/parent |
| `entry_date` | date NOT NULL | Default today; editable |
| `title` | text | Optional |
| `body` | text NOT NULL | Plaintext in v1 (RLS-only). Never copied to ledger/audit. |
| `tags` | text[] | Free-text; not a behavior taxonomy |
| `student_id` | uuid NULL | **Private search pointer** only. FK `students` ON DELETE SET NULL. No ACL grant. Teacher/staff. |
| `child_student_id` | uuid NULL | Parent hat: focused child. Required in queries when owner has 2+ `parent_students`. |
| `created_at` / `updated_at` | timestamptz | Edit shows edited timestamp (US-T-D6) |
| `related_plan_id` | uuid NULL | Optional later join to LPLAN; **v1 omit** |

Unique-ish index: `(owner_profile_id, seat, entry_date desc, created_at desc)`. Search: `pg_trgm` on title/body later; v1 `ilike` is enough.

Hard-delete. Confirm “cannot be undone.” No trash. No `write_audit` on diary CRUD (existence leak on `/activity`).

### 2.2 `diary_media`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `entry_id` | uuid NOT NULL | FK CASCADE |
| `owner_profile_id` | uuid NOT NULL | Denormalized for storage RLS |
| `kind` | text | v1: `photo` only |
| `storage_path` | text NOT NULL | See §2.4 |
| `content_type` | text | |
| `byte_size` | int | |

Not a `captures` row. Not Inbox. Delete entry GC’s objects.

### 2.3 `ledger_events` (new; not a view on `audit_events`)

**Why not project `audit_events`:** (1) `audit_admin_read` is `is_school_admin()` only — opening teacher SELECT is a confused-deputy risk. (2) `write_audit` stamps `actor_role` from **job-of-record**, not chrome seat. (3) Product wants best-effort log that **must not roll back** Approve; `perform write_audit` today lives in the same RPC transaction. (4) Diary must never appear there. (5) `/activity` stays admin firehose.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `owner_profile_id` | uuid NOT NULL | Actor; FK profiles CASCADE |
| `seat` | text NOT NULL | Chrome at emit time |
| `action` | text NOT NULL | e.g. `approve_grade`, `assign_lesson` |
| `action_family` | text NOT NULL | `assign` \| `grade` \| `syllabus` \| `capture` \| `office` \| `other` |
| `entity_type` / `entity_id` | text | Deep-link; if gone, show summary only |
| `class_id` / `student_id` | uuid NULL | Filter chips. Teacher class_id must be taught class. |
| `summary` | text NOT NULL | Short human line. **No diary body.** Grade snippet OK (“Graded Johnny 87”). |
| `before_snippet` / `after_snippet` | text NULL | Grade change only; not full row dumps |
| `source_audit_id` | uuid NULL | Optional pointer if the RPC also `write_audit`’d. Not required. |
| `created_at` | timestamptz | Append-mostly. **No user UPDATE/DELETE.** |

Indexes: `(owner_profile_id, seat, created_at desc)`, `(student_id)`, `(class_id)`, `(action_family)`.

### 2.4 Storage

**New bucket `diary`:** `public = false`. Do **not** reuse `photos` / `audio` / `files` (those already have thread/class/logo policies).

Path: `{owner_profile_id}/{seat}/{entry_id}/{media_id}`. First segment **must** equal `auth.uid()`.

Reads: owner-only **signed URLs** (short TTL). No public object URL. No family/co-teacher/Office SELECT (US-PRIV-2).

v1 STT: audio is request-ephemeral; **do not** persist raw diary audio.

## 3. Authz / RLS (honest)

Research models A/B/C (DIARY-R1 §2). **Ship C. Advertise C. Roadmap B. Do not claim A.**

| Model | What it actually buys | What it does **not** buy |
|---|---|---|
| **C. RLS-only** (v1) | App users other than owner cannot SELECT via PostgREST if policies are tight | DBA, `service_role`, backups, support with dashboard, lawful process to host, Edge logs if we slurp body |
| **B. Envelope** (later) | Server stores ciphertext + wrapped DEK; KEK in KMS | Not E2E if Kelyra can unwrap. Search/STT need plaintext or client-side crypto. Same-cloud KEK is not “only you” |
| **A. On-device** | Strongest vs server subpoena | No sync, no server STT, device-loss = data-loss |

**v1 UI copy (US-PRIV-1):** “Private to you in Kelyra. School IT or a legal process could still access server-held data.” **Forbidden strings:** “end-to-end encrypted”, “only you can ever see this”, “unreadable by Kelyra.”

### 3.1 RLS sketch (not SQL)

`diary_entries` / `diary_media` / `ledger_events`: ENABLE RLS.

| Op | Policy |
|---|---|
| Diary SELECT/INSERT/UPDATE/DELETE | `owner_profile_id = auth.uid()` only. **No** `is_school_admin()`, **no** `is_staff`, **no** `teaches_class`, **no** `class_teacher_of`, **no** co-teacher, **no** parent-of-mentioned-student. |
| Ledger SELECT | `owner_profile_id = auth.uid()`. UI filters `seat` = active chrome. |
| Ledger INSERT | **Not** client. Only `write_ledger` SECURITY DEFINER. |
| Ledger UPDATE/DELETE | **Revoke from all.** Append-mostly. |
| Storage `diary` | First path segment = `auth.uid()`::text. Same hats. |

Client may INSERT diary rows under RLS. `write_ledger`: REVOKE EXECUTE from `authenticated`; call only from existing definer RPCs. Owner always `auth.uid()` inside the helper — never a parameter the client picks.

Parent diary SELECT: still owner-only. Extra **query** constraint (RPC or view): if `count(parent_students) >= 2` then `child_student_id = focused_child` else empty. Twins fail closed.

Dual-hat: opening teacher chrome must not SELECT `seat=parent` in the UI. Same human *could* query both via RLS; product seat switch is the wall. Optional later: session `current_seat()`. **v1: do not add a seat table.** Do not let office JWT read teacher-seat diary because they `also_teacher`.

## 4. Ledger emitters

Helper `write_ledger(...)` (sketch): SECURITY DEFINER, `owner_profile_id = auth.uid()`, `seat` passed by the RPC (chrome the RPC already authorized). Wrap body in `BEGIN … EXCEPTION WHEN OTHERS THEN NULL; END` so a ledger miss **never** rolls back Approve/assign. REVOKE EXECUTE from `authenticated` / `anon`. Clients cannot forge “I graded Johnny 87.”

Do **not** dual-require `audit_events`. Office Activity stays `write_audit` as today. Optional `source_audit_id` when both fire. **Never** copy `diary_entries.body` / title / media paths into either table.

### 4.1 v1 — teacher seat (`action_family`)

| Live path (today) | Ledger `action` | Notes |
|---|---|---|
| Assignment create/edit (client or future RPC) | `assignment_upsert` | family `assign`. Title, class, kind in summary. |
| Lesson assign (`assign` / pack bind) | `assign_lesson` | family `assign`. Who/class, title. |
| Teacher **Approve** / `approved_score` set | `approve_grade` | family `grade`. Mark in summary. If live path is table UPDATE not RPC: AFTER trigger on `submissions` (status/score) calling `write_ledger`, still swallow errors. **Nothing is a grade until Approve.** |
| Capture filed to student / `note_only` | `file_capture` | family `capture`. Pointer + student; **not** diary body, **not** photo bytes. |
| `publish_class_syllabus` | `publish_class_syllabus` | family `syllabus`. Class name. Skip until AVG live if RPC absent in that env. |
| `save_class_syllabus_draft` / Ask draft | **none** | Drafts are not discrepancy-defense. |

Student RPCs (`student_submit`, `student_report_lesson`): **do not** emit teacher ledger rows.

### 4.2 v1 — staff seat

Emit from existing office RPCs that already `write_audit`: `admin_create_login`, `link_parent_student` / unlink, hat assign/clear, password reset, class-teacher assign. Summary = actor did X to entity. Still owner-scoped (`actor = me`), not `/activity`.

### 4.3 Never in ledger (or audit)

Diary INSERT/UPDATE/DELETE; STT transcripts; Ask diary drafts; student chips; media URLs; Feed posts; Calendar personal events; matcher guesses; un-Approved capture drafts.

## 5. AI / STT

**Server-side only.** Model keys stay on Edge / `ai:dev` (`XAI_API_KEY` prod; Grok CLI OAuth local). Never `EXPO_PUBLIC_*`. Company **TTS** remains profile `grok-tts` — **not** this path. Diary STT is **input**.

Live `transcribe` Edge is **capture-bound** (`captureId` → `audio` bucket). Diary must **not** mint a `captures` row. Reuse the capture-free `transcribe-audio` style (JWT + audio bytes/url → `{ text }`) or a dedicated `transcribe-diary` twin. Same xAI `/stt`. Do not route STT through Gemini.

### 5.1 Compose (US-T-D3 / US-P-D2)

1. Mic on Diary composer.  
2. Edge STT → transcript into **body field**.  
3. Owner edits. **Save** writes `diary_entries`. No auto-save of raw audio. No ledger row.  
4. Audio discarded after response (v1).

### 5.2 Ask draft (US-T-D4)

New tool e.g. `draft_diary_entry` — **not** `assignments.manage`, not `classes.create`, not syllabus. Capability sketch: `diary.draft` / owner-only; all seats that have Diary (T/S/P); **never** `officeOnly`. Handler returns `{ title?, body, entry_date }` JSON. Client parks in composer. **User must Save.** Does not INSERT. Does not `write_ledger`. Does not Approve. Does not insert students (matcher law). Unknown students stay private text.

Unknown tool names stay denied (`askToolPolicy` fail-closed).

### 5.3 PII logging (fail-closed)

Treat diary body + STT text as **sensitive PII** (student names).

| Must not | Must |
|---|---|
| Log full transcript / body / tags | Request id, uid, byte length, latency, error class |
| `write_audit` / `write_ledger` the prose | Redact Edge 502 bodies if they echo xAI text |
| Persist prompt+completion in Ask history beyond existing `ask_messages` owner RLS | `ask_messages` already owner-only; still do not put diary prose in `audit_events` |
| Client-side STT to a third-party SDK with embedded key | Server fetch only |

## 6. v1 vs later

Aligns with stories §8. Architect locks PM open questions (§10):

| # | Question | Decision |
|---|---|---|
| 1 | Shell | **One** `/diary` with Journal \| Ledger segments (PersonTabs). `/activity` unchanged. |
| 2 | Parent Ledger | **Defer.** |
| 3 | Crypto | Honest RLS-only v1; envelope on roadmap, not advertised. |
| 4 | Student chips | **Allow** private `student_id` pointer; never cross-ACL. |
| 5 | Dual-write audit | **No.** `ledger_events` is owner UX. `audit_events` stays office. |

**Joins (do not implement here):** CAL-P1 — Calendar is dated events, not journal. LPLAN-P1 — optional `related_plan_id` later; v1 omit. No class-create on any of these surfaces.

### v1

| ID | What |
|---|---|
| V1-1–5 | Diary text/date/tags, STT, private photo, Ask draft, search |
| V1-6 | Privacy first-run copy (RLS honesty) |
| V1-7–8 | Teacher My Ledger auto-rows + filters; staff My Ledger of own office actions |
| V1-9–10 | Drawer chrome; parent child-switcher |

### Later (do not staff)

| ID | What | Gate |
|---|---|---|
| L-1 | Envelope + KEK custody | Security design; still not “E2E” if we unwrap |
| L-2 | Video | Size / cost |
| L-3 | On-device-only mode | Sync tradeoff |
| L-4 | Hash-chain | Overkill |
| L-5 | **Promote diary fact → student Log** | Explicit confirm + FERPA copy; new ACL; never silent |
| L-6 | Parent My Ledger | After parent actions exist |
| L-9 | Household diary | Out — privacy |
| L-10 | **Office warrant-read** | Legal product: ticketed unwrap, audit of the access itself, not a staff SELECT policy |
| L-11 | Tray icon | `scripts/build-icons.mjs` only |
| L-12 | Extra syllabus/lesson verbs | When those RPCs are live |

## 7. Threat notes (for a later Security card)

Not a full threat model. Pick-up list. **Do not** treat RLS as encryption.

| ID | Threat | v1 mitigation | Residual |
|---|---|---|---|
| T1 | Office/co-teacher SELECT via `is_staff` / `teaches_class` copy-paste | Policies owner-only; security tests must `doesNotMatch` those helpers (pattern: lesson_packs) | Reviewer misses a new policy |
| T2 | `service_role` / dashboard / backups read plaintext | Honest copy; restrict dashboard; no diary in logs | Host + backups still have body |
| T3 | Public or reused `photos` bucket | Dedicated `diary` bucket, `public=false`, path prefix = uid | Mis-set bucket public flag |
| T4 | Signed URL leak / referrer | Short TTL; no public listing | Forwarded URL until expiry |
| T5 | Client `write_ledger` forgery | REVOKE execute; emitters only | Trigger bugs |
| T6 | Ledger miss on Approve | Best-effort; monitor; never fail the grade write | Defense gap if emit always fails |
| T7 | Diary body in `audit_events` / Edge 502 / Ask traces | Ban list §4.3 / §5.3 | xAI vendor retention of STT audio/text (third-party DPA — Security) |
| T8 | Twin merge / wrong `child_student_id` | Fail-closed empty list | Client forgets filter |
| T9 | Ask confused deputy (draft → Approve / create_class) | `diary.draft` only; unknown tools denied | Prompt injection still possible for *text of draft* — user Save is the gate |
| T10 | Student-pointer enumeration | Pointer is owner metadata; no reverse RLS | Owner search still names minors |
| T11 | Envelope theater (L-1) | Do not ship copy until KEK policy is real | If Kelyra can unwrap, subpoena still works |
| T12 | L-5 promote / L-10 warrant | Out of v1. If ever: explicit ticketed flow + audit of the *access*, never silent staff SELECT | Turning diary into an education record |

Security card later. Not this ticket.

## 8. Acceptance

- [x] Data model sketch (`diary_entries`, `diary_media`, `ledger_events`, private `diary` bucket)
- [x] Honest RLS vs envelope (v1 = C; no crypto theater)
- [x] Ledger append-mostly; emitters; diary body never copied
- [x] STT/AI server-side; Save required; `grok-tts` not this path; PII logging
- [x] v1 vs later including L-5 / L-9 / L-10
- [x] FERPA fail-closed + explicit non-goals
- [x] Threat notes for Security
- [ ] CEO / CoS review
- [ ] **No implementation** until Chuck says send

**Recommended next action:** CEO/CoS review. Security card later. Do not staff `senior-developer` until Chuck says send.

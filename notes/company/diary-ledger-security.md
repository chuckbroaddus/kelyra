# DIARY-S1: FERPA / Security Review — Diary + Ledger

**Date:** 2026-09-04
**Author:** security (Kelyra)
**Ticket:** t_6af12a79 · Architecture: DIARY-A1 `notes/company/diary-ledger-architecture.md`
**Status:** Review only — no SQL, no app code, no kelyra-qa-loop, no git push.
**Depends on:** `diary-ledger-architecture.md`, `diary-ledger-stories.md`, `diary-ledger-research.md`
**Live walls:** `audit_admin_read` = `is_school_admin()` (`20260817000005_school_roles.sql`), `askToolPolicy.ts` (unknown denied), `transcribe` / `transcribe-audio` Edge (xAI `/stt`, `XAI_API_KEY`), private `photos`/`audio`/`files` (do **not** reuse).
**Legal posture:** Engineering threat model and implementation gates. Not a legal opinion. Not a claim of FERPA school-official status. Not encryption.

**Non-goals of this ticket:** Implementation, migrations, Edge handlers, CEO send.

---

## 0. Verdict

**Architecture is shippable as a future loop spec** if the v1 must-fix list in §6 is copied into SQL/Ask/storage when Chuck says send. Honest model **C** (RLS-only + private `diary` bucket + owner signed URLs) is the only acceptable v1. Do not advertise envelope or E2E.

**Do not implement** until CEO yes. Security does not authorize `senior-developer` / `kelyra-qa-loop`.

Product law that must not regress: owner-only diaries; no Office/HR read screen; no auto-file to student Log / Feed / Inbox; twins fail closed; teachers do not create classes; student seat has no Diary/Ledger; never widen `is_staff` / `is_school_admin` / `teaches_class` onto diary or ledger SELECT; never open teacher SELECT on `audit_events`; ledger observes, does not grant powers.

**FERPA honesty (not copy-as-shield):** Kelyra-hosted plaintext notes that name students are **likely education records** under 34 CFR § 99.3 (directly related to a student **and** maintained by a party acting for the school). Sole-possession memory-aid exclusion is narrow and usually fails once notes live on a vendor server, in backups, or are readable by `service_role`. UI line “Personal reflection — not the official student file” is required product law. It does **not** make the rows non-records. Do not claim otherwise.

## 1. Threats

Attacker profiles: curious student JWT, parent JWT (incl. sibling id guess), teacher of class A, office seat, dual-hat teacher-parent / admin-teacher, modified Expo client, Ask tool-loop, storage URL forward, Edge/xAI logs, dashboard `service_role`.

| Data | Sensitivity | v1 home | Who may see in-app |
|---|---|---|---|
| `diary_entries.body` / title / tags | **High** — named-student notes; treat as education-record PII | Postgres plaintext (model C) | Owner JWT only |
| Diary photo | **High** — faces, roster cards, IEP stamps | private `diary` bucket | Owner signed URL only |
| STT audio / transcript | **High** | Audio request-ephemeral; transcript → body on Save | Owner; vendor sees bytes during call |
| `student_id` / `child_student_id` pointer | Pointer, not ACL | Column on owner row | Owner search; **no** reverse grant |
| `ledger_events.summary` (“Graded Johnny 87”) | **Education record** of the actor’s work | Separate table, owner RLS | Owner (that seat). Not family. Not `/activity` |
| Grade before/after snippets | Same | Ledger only | Owner |
| Office `audit_events` | School-wide compliance firehose | Live table | `is_school_admin()` only — **do not widen** |

### T1 — Staff/co-teacher SELECT via helper copy-paste (P0)

Live pattern: many tables grant `is_school_admin()` or `teaches_class`. Diary/ledger policies that copy those helpers become an Office warrant-read without L-10.

**Must-fix:** SELECT/INSERT/UPDATE/DELETE on `diary_entries` / `diary_media` / `ledger_events` = `owner_profile_id = auth.uid()` only. Security tests `doesNotMatch` `is_staff`, `is_staff_profile`, `is_school_admin`, `teaches_class`, `class_teacher_of`, `parent_students` (except parent **own** diary owner check). Co-teacher is not an owner.

### T2 — Parent twin blend / client-only child filter (P0)

Architecture’s extra constraint is a **query** rule (RPC/view). If v1 leaves `authenticated` SELECT on `diary_entries` with only owner RLS, a parent of Saydee+Sydnee dumps both. AVG-S1 already failed closed on sibling mix: server takes `student_id` and returns empty unless linked **and** focused.

**Must-fix:** Multi-child parent (`count(parent_students) >= 2`): unlabeled / missing `child_student_id` → **empty**, not a mash-up. Enforce in RPC or RLS, **not** the client. Single-child may default that id. Never return all children for the client to filter.

### T3 — Public or reused Storage (P0)

`photos` already has thread + school-logo SELECT. Reusing it for diary is confused-deputy.

**Must-fix:** New bucket `diary`, `public=false`. Path `{owner_profile_id}/{seat}/{entry_id}/{media_id}`; first segment = `auth.uid()::text`. Owner signed URLs, short TTL. No public object URL. Family / student / co-teacher / Office: no storage policy. Delete entry GCs objects. v1: no persisted diary audio.

### T4 — Ledger forgery / confused-deputy `write_ledger` (P0)

If `authenticated` can `rpc write_ledger` or INSERT `ledger_events`, a modified client forges “I graded Johnny 87.” If `owner_profile_id` is a parameter, anyone stamps another uid.

**Must-fix:** INSERT only inside `write_ledger` SECURITY DEFINER. `owner_profile_id = auth.uid()` inside the helper — never a client-picked uid. `seat` from the **already-authorized** emitter RPC, not the Expo body. `REVOKE EXECUTE FROM PUBLIC, anon, authenticated`. Swallow errors so a ledger miss never rolls back Approve. Clients cannot UPDATE/DELETE ledger rows.

### T5 — Diary prose in audit / Ask / Edge (P0)

`write_audit` on diary CRUD would list existence on `/activity` (admin firehose). Copying body into `ledger_events` or Edge 502 / function logs is a redisclosure.

**Must-fix:** No `write_audit` / `write_ledger` on diary CRUD, STT, or Ask draft. Ban list: diary body, title, tags, media paths, transcripts. Logs: request id, uid, byte length, latency, error class. Redact vendor echo on 502. `ask_messages` may hold a draft under existing owner RLS; still never copy that prose into `audit_events`.

### T6 — Ask confused deputy (P0)

Live `assignments.manage` is teacher `own` **and** student `own`. Mapping `draft_diary_entry` there mints a student write tool. `officeOnly` would let Office draft into a teacher surface.

**Must-fix:** New capability e.g. `diary.draft` (teacher/staff/parent who have Diary; student `none`; **never** `officeOnly`). Handler returns `{ title?, body, entry_date }` only. Client parks in composer. **User Save** is the INSERT. Tool does not Approve, `create_class`, insert students, or `write_ledger`. Unknown names stay denied. Dual-hat: signed-in chrome, not `also_teacher` inheritance.

### T7 — Capture-bound STT / key leak (P0)

Live `transcribe` requires `captureId` → `audio` bucket. Diary must not mint a `captures` row (Inbox + teacher/class RLS). Client STT SDK with `EXPO_PUBLIC_*` is forbidden.

**Must-fix:** JWT + audio bytes (or allowlisted URL) → `{ text }` twin (`transcribe-audio` style or `transcribe-diary`). Same xAI `/stt`. No Gemini. No persist raw audio. Keys server-side (`XAI_API_KEY` / `ai:dev`). Not `grok-tts`.

### T8 — Opening `/activity` or teacher SELECT on `audit_events` (P0)

`audit_admin_read` is `is_school_admin()` only. Teacher My Ledger must **not** be a view on `audit_events`. That would either leak school-wide audit to teachers or force a policy widen.

**Must-fix:** New `ledger_events`. Keep `/activity` admin-only. Optional `source_audit_id` pointer; never dual-require.

### T9 — Honest-copy / envelope theater (P0 for copy)

Model C is not encryption. Forbidden strings: “end-to-end encrypted”, “only you can ever see this”, “unreadable by Kelyra.” Required: “Private to you in Kelyra. School IT or a legal process could still access server-held data.” First-run + Settings. L-1 envelope still is not E2E if Kelyra unwraps.

### T10 — student_id pointer used as ACL (P1)

Pointer is owner metadata. A join `diary_entries.student_id → students` for family/office/co-teacher is a new disclosure. No reverse RLS (“parents of mentioned student”). Matcher never inserts a student from diary text.

### T11 — Signed URL forward (P1)

Short TTL. No bucket listing. Residual: anyone with the URL until expiry.

### T12 — L-5 silent promote / L-10 staff SELECT (out of v1)

Promote diary → student Log creates a parent-inspectable education record. Warrant-read must be ticketed unwrap + audit of the **access**, never `is_staff` SELECT. Both later, explicit FERPA gates.

## 2. Controls

Reuse live patterns; do not invent a second authz stack.

| Control | v1 rule |
|---|---|
| RLS | Owner uid only. ENABLE RLS. No staff/admin/taught-class helpers on these three tables. |
| Dual-hat | Separate `seat` rows. UI filters active chrome. **Do not** let office JWT read **other** teachers’ diaries because `also_teacher`. Same human reading **own** teacher+parent seats via uid is residual (product wall, not FERPA cross-user). v1: no `current_seat()` table. |
| Student | No rows, no RPCs, no storage, no Ask tool. |
| Parent ledger | **Deferred** (L-6). Do not emit parent ledger rows in v1. |
| Diary client writes | INSERT/UPDATE/DELETE under owner RLS is OK. `owner_profile_id` must equal `auth.uid()` on WITH CHECK. |
| Ledger writes | Emitters only: teacher assign/Approve/`file_capture`/publish syllabus (not drafts); staff office RPCs that already `write_audit`. Student RPCs never emit teacher ledger. |
| Ledger content | Short summary. Grade snippet OK. **No** diary body, STT, media URLs, matcher guesses, un-Approved drafts, Feed, Calendar. |
| Approve | Nothing is a grade until Approve. Ledger on Approve (or AFTER trigger on status/score) still swallows errors. |
| Storage | Dedicated `diary` bucket; path prefix uid; signed URL; GC on delete. |
| STT / Ask | Server-side; Save required; `diary.draft`; PII logs. |
| Copy | US-PRIV-1 strings only. FERPA/HR: no “send to principal.” |
| Hard-delete | Confirm “cannot be undone.” No trash. No existence audit. Residual: legal hold / backups until retention job exists. |
| Indexes | Owner+seat+time OK. `student_id` on ledger is owner-filter, not a family join key. |

## 3. Residual risk

These remain **after** v1 controls. Accept only with honest copy; do not paper over.

| Residual | Why it stays |
|---|---|
| DBA / `service_role` / dashboard / Postgres backups read plaintext | Model C. Restrict dashboard access operationally. |
| Lawful process to host | Subpoena of Supabase/Kelyra yields body + media. Envelope (L-1) only helps if KEK policy denies staff unwrap — still not E2E. |
| xAI STT vendor retention | Same soft FERPA as capture grading. Paid no-training. No school-official claim without DPA. |
| Signed URL until TTL | Forwarded link works until expiry. |
| Dual-hat same-uid cross-seat SELECT | Modified client can dump own teacher + parent diaries. Product seat switch is UX, not RLS. Acceptable vs reading **others**. |
| Ledger miss if emit always fails | Best-effort by design so Approve never rolls back. Monitor; do not fail closed on the grade write. |
| Owner search still names minors | Pointer + ilike on body. By design for the owner. |
| Hard-delete vs legal hold | No trash. Backups may still hold until cycle. |
| Ask prompt injection into draft **text** | User Save is the gate. Do not auto-INSERT. |
| L-5 / L-9 / L-10 if staffed later | New FERPA surfaces. Out of v1. |

## 4. FERPA mapping (engineering)

| Concern | Diary + ledger control |
|---|---|
| Education records (named notes, grades in ledger summaries) | Owner-only RLS; no family SELECT; no Office diary screen |
| Sole-possession exclusion | **Do not rely on it** for server-hosted plaintext. Copy is product law. |
| Parent inspect / amendment | v1 diary is not a parent-facing file. L-5 promote would change that — separate gate. |
| School-official redisclosure | No co-teacher, no principal send, no Feed. Vendor STT = subprocessors; no DPA claim. |
| Twin / sibling over-read | Server fail-closed empty list |
| COPPA | Student seat: no Diary/Ledger v1 |
| Directory vs record | Ledger “Graded Johnny 87” is a record, not directory. Owner only. |
| Discipline log as SIS | Non-goal. Not PBIS. Not `/activity`. |

Soft FERPA posture unchanged (`docs/architecture.md`): paid no-training, keys server-side, teacher is customer, no district school-official without Chuck-signed DPA.

---

## 5. Findings — v1 must-fix (block a future qa-loop if missing)

| ID | Sev | Finding | Gate |
|---|---|---|---|
| D1-01 | P0 | Owner-only RLS; **never** `is_staff` / `is_school_admin` / `teaches_class` on diary or ledger | SQL `doesNotMatch` those helpers |
| D1-02 | P0 | Parent 2+ children: server fail-closed without focused `child_student_id`; no client-only filter | RPC/RLS test twins |
| D1-03 | P0 | New private `diary` bucket; path prefix = uid; no public URL; do not reuse `photos`/`audio`/`files` | Storage policies |
| D1-04 | P0 | `write_ledger`: definer, uid from `auth.uid()`, REVOKE from `authenticated`; no client INSERT/UPDATE/DELETE | Grant tests |
| D1-05 | P0 | Never copy diary body/title/media/STT into `audit_events` or `ledger_events`; no `write_audit` on diary CRUD | Static + RPC |
| D1-06 | P0 | Do **not** open teacher SELECT on `audit_events`; new `ledger_events`; `/activity` stays admin | Policy review |
| D1-07 | P0 | Ask `diary.draft` **new** capability; not `assignments.manage`; not `officeOnly`; student none; Save required; no `create_class` | `askToolPolicy` + Edge twin |
| D1-08 | P0 | STT: no `captures` row; no persist audio; JWT; no `EXPO_PUBLIC_*`; xAI `/stt` not Gemini; not `grok-tts` | Edge tests |
| D1-09 | P0 | Honest privacy copy; forbidden E2E / “only you” / “unreadable by Kelyra” | Copy review |
| D1-10 | P0 | Student seat: no diary/ledger access | JWT tests |
| D1-11 | P1 | Dual-hat: office JWT cannot read **other** teachers’ diaries; UI seat filter | RLS + chrome tests |
| D1-12 | P1 | `student_id` pointer is not ACL; no reverse parent/office join | Serializer tests |
| D1-13 | P1 | PII logs only (id, uid, bytes, latency, error); redact 502 vendor echo | Edge log review |
| D1-14 | P1 | Signed URL short TTL; GC objects on entry delete | Storage |
| D1-15 | P1 | Ledger emit swallows errors; never fail Approve; no emit on syllabus **draft** | Trigger/RPC tests |
| D1-16 | P1 | Teachers do not create classes from Diary/Ledger/Ask | Tool + UI |

### Later (not v1 blockers)

| ID | Sev | Item |
|---|---|---|
| D1-L1 | P2 | Signed DPA / school-official; until then soft FERPA |
| D1-L2 | P2 | Envelope + KEK custody (L-1) — still not “E2E” if we unwrap |
| D1-L3 | P2 | On-device-only mode (L-3) |
| D1-L4 | P2 | L-5 promote → student Log: explicit confirm + new ACL + parent-inspect copy |
| D1-L5 | P2 | L-10 warrant-read: ticketed access audit, never staff SELECT |
| D1-L6 | P3 | Household diary (L-9) — out |
| D1-L7 | P3 | Hash-chain ledger (L-4) — overkill |
| D1-L8 | P3 | Parent My Ledger (L-6) after parent actions exist |

---

## 6. Tests a future qa-loop must include (do not run now)

1. Student JWT: SELECT diary/ledger empty; `draft_diary_entry` denied; no storage objects.
2. Teacher JWT cannot SELECT another teacher’s `diary_entries` / `ledger_events` / `diary` objects.
3. Office / `is_school_admin` JWT cannot SELECT another user’s diary or ledger (no helper on policies).
4. Co-teacher of same class cannot read the other teacher’s diary.
5. Parent of two children: omit `child_student_id` → empty; child A token cannot fetch child B entries.
6. `write_ledger` EXECUTE denied for `authenticated`; forged INSERT on `ledger_events` denied.
7. Approve still succeeds if `write_ledger` raises.
8. Diary INSERT does not create `audit_events` or ledger rows.
9. Ask unknown tool denied; `draft_diary_entry` does not call `create_class` / Approve / matcher insert.
10. Bucket `diary` `public=false`; object URL without signature fails; path not matching uid denied.
11. Copy fixtures: no “end-to-end encrypted”.
12. `transcribe` capture path unused for diary; no `captures` insert.

---

## 7. Decisions (this ticket)

1. v1 = model **C** (RLS-only + private bucket). Advertise C. Roadmap B. Never claim A/E2E.
2. Hosted named-student diary is treated as **sensitive education-record PII**, not sole-possession.
3. Parent multi-child isolation is a **server** fail-closed, matching AVG-S1 siblings.
4. Ledger is a new table, not a projection of `audit_events`.
5. Ask diary draft is a **new** capability, not `assignments.manage`.
6. L-5 / L-9 / L-10 stay out. Security does not authorize implementation.
7. Soft FERPA / no DPA claim unchanged.

---

## 8. Acceptance

- [x] Threat model T1–T12 against DIARY-A1
- [x] Honest RLS vs envelope; no crypto theater
- [x] FERPA: education-record honesty; no sole-possession shield; twins; no Office diary read; no Log auto-file
- [x] Must-fix D1-01–D1-16 for a future loop
- [x] Residual risk named
- [x] No SQL, no app code, no kelyra-qa-loop, no git push
- [ ] CEO / CoS review
- [ ] **No implementation** until Chuck says send

**Recommended next action:** CEO/CoS. Do not staff `senior-developer` until Chuck says send.

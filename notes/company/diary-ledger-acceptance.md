# DIARY-Q1: Acceptance plan — diary + ledger (not a Build send)

**Date:** 2026-09-04  
**Author:** qa-supervisor  
**Ticket:** t_b843227a  
**Status:** **PLAN ONLY** — not a Build send, not a release cert, not kelyra-qa-loop.  
**Gate:** Implementation remains forbidden until Chuck later says **send**. Developers will not self-certify.

**Depends on (read-only pack):**

| Artifact | Role in this plan |
|---|---|
| `notes/company/diary-ledger-stories.md` (DIARY-P1) | Hats, Diary/Ledger stories, privacy, v1 cut |
| `notes/company/diary-ledger-architecture.md` (DIARY-A1) | Schema sketch, RLS, emitters, STT/Ask, threats |
| `notes/company/diary-ledger-security.md` (DIARY-S1) | Must-fix D1-01…16 + future loop tests §6 |
| `notes/company/diary-ledger-research.md` (DIARY-R1) | Problem framing (context only) |

**Non-goals of this ticket**

- No app code, migrations, Edge, Ask tool registration, or SQL apply.
- No `kelyra-qa-loop` / `author-qa-loop`.
- No release sign-off and no eng staffing authorization.
- No inventing envelope crypto, warrant-read, promote-to-Log, household diary, or parent Ledger.

---

## 0. Scope — what “good” means later

When Chuck authorizes implementation, a **future** build loop is accepted only if:

1. Every **P0** row in this matrix has **evidence** (automated test path, RPC/JWT fixture, or scripted UI check with artifact).
2. Every **D1-01…D1-16** security must-fix is covered (see §3).
3. Explicit **non-acceptance** items (§4.2) are regression-guarded.
4. CoS does **not** treat green unit tests alone as product release; owner walls + twin fail-closed + ledger forgery + honest privacy copy still need named evidence.
5. Developers do **not** self-certify the epic — CEO send + this plan + loop evidence.

Until then: this file is the contract for that future loop.

### 0.1 Product laws (always fail closed)

| ID | Law | Source |
|---|---|---|
| L1 | **Diary** = owner private journal (text/STT/photo). Not student Log, not Feed, not Capture Inbox, not Office Activity, not Calendar, not Desk home. | P1 §0, A1 §0 |
| L2 | **My Ledger** = owner’s append-mostly log of *my* Kelyra actions. Not diary prose. Not school-wide `/activity`. | P1 §0, A1 §0 |
| L3 | Office **Activity** stays admin-only `audit_events`. Teachers never get Ledger by opening `/activity` or SELECT on `audit_events`. | A1 §2.3, S1 D1-06 |
| L4 | Diary/ledger RLS = `owner_profile_id = auth.uid()` only. **Never** `is_staff` / `is_school_admin` / `teaches_class` / `class_teacher_of` on these tables. | A1 §3.1, S1 D1-01 |
| L5 | Parent 2+ children: queries **require** focused `child_student_id`; missing → **empty**, never unlabeled twin merge. | P1 §2/5.3, S1 D1-02 |
| L6 | Dual-hat: separate diaries per **chrome seat**; office JWT cannot read **other** teachers’ diaries because `also_teacher`. | P1 §3, S1 D1-11 |
| L7 | Student seat: **no** Diary, **no** Ledger, **no** storage, **no** Ask diary tool. | P1 §2, S1 D1-10 |
| L8 | Soft student chip / `student_id` on diary = **private search pointer only** — never grants reverse ACL to student/parent/office/co-teacher. | P1 US-T-D1, S1 D1-12 |
| L9 | Ledger **observes**; does not grant assign/grade/syllabus powers. Clients cannot forge ledger rows. | P1 §2, S1 D1-04 |
| L10 | Diary body/title/tags/media/STT **never** copy into `audit_events` or `ledger_events`. No `write_audit` on diary CRUD. | A1 §4.3, S1 D1-05 |
| L11 | AI draft = **draft-then-Save**. STT = server-side only. Matcher never inserts students. Never Approve grades. Never create classes. | P1 US-T-D4, S1 D1-07/08/16 |
| L12 | Privacy copy is honest **RLS-only (model C)**. Forbidden: “end-to-end encrypted”, “only you can ever see this”, “unreadable by Kelyra.” | P1 US-PRIV-1, S1 D1-09 |
| L13 | Private `diary` bucket only; path prefix = uid; signed URLs; no public object URL; do not reuse `photos`/`audio`/`files`. | A1 §2.4, S1 D1-03 |
| L14 | Model keys server-side only. No `EXPO_PUBLIC_*` vendor tokens. Diary STT ≠ `grok-tts`. | AGENTS + S1 D1-08 |
| L15 | Nothing is a grade until teacher Approves. Ledger miss must **not** roll back Approve. | A1 §4.1, S1 D1-15 |
| L16 | Teachers do not create classes from Diary, Ledger, or Ask. | P1 non-goals, S1 D1-16 |

### 0.2 In scope vs out of scope

**In scope (must prove after CEO send):** owner Diary (text/date/tags, STT, private photo, search/edit/delete) for teacher/staff/parent seats; honest first-run privacy copy; teacher My Ledger auto-rows (assign/grade/file capture; syllabus when live); staff My Ledger of own office actions; Journal \| Ledger chrome at `/diary`; parent child-switcher; Ask `diary.draft`; private bucket + owner signed URLs.

**Out of scope (do not fail v1 for missing):** envelope encryption (L-1); diary video; on-device-only mode; hash-chain ledger; promote diary → student Log (L-5); parent My Ledger (L-6); household diary (L-9); Office warrant-read (L-10); tray icon; NL semantic search; reminders/tasks on Desk; student role Diary/Ledger.

## 1. Owner-only diary / twins

**Legend**

| Sev | Meaning |
|---|---|
| **P0** | Blocks CEO-authorized ship / loop pass |
| **P1** | Must fix before family-facing release |
| **P2** | Track; may defer with CoS note |

| Type | How to evidence later |
|---|---|
| **U** | Unit (policy helpers, pure copy fixtures, capability maps) |
| **I** | Integration / RPC / RLS with JWT fixtures |
| **UI** | Scripted or dogfood UI on drawer / Diary shell |
| **S** | Security static + seat JWT matrix |
| **R** | Regression vs frozen surfaces (Desk, `/activity`, Capture, grades) |

### 1.1 Teacher diary

| ID | Sev | Type | Scenario | Expected |
|---|---|---|---|---|
| TD-01 | P0 | UI/I | Open Diary from Profile/hamburger | `/diary` Journal segment; not tray tab; not House home redirect |
| TD-02 | P0 | UI/I | New entry: body required, optional title/tags, date default now | Saved under `owner_profile_id` + `seat=teacher` only |
| TD-03 | P0 | I/S | Entry after Save | **Absent** from student page, Feed, Messages, Office `/activity`, Capture Inbox |
| TD-04 | P0 | UI/I | Soft student chip (private pointer) | Stores `student_id` for owner search only; **no** student/parent/co-teacher SELECT path |
| TD-05 | P0 | UI/I | Photo attach | Private `diary` bucket; not a `captures` row; not Inbox |
| TD-06 | P0 | UI/I | STT compose | Server STT → body field; edit before Save; raw audio not persisted; no ledger row |
| TD-07 | P0 | UI/I | Ask “add diary entry for today…” | Draft in composer only; user must Save; no auto-INSERT |
| TD-08 | P0 | UI | Search / date / tag / student-chip filter | Newest default; owner rows only |
| TD-09 | P0 | UI/I | Edit / hard-delete | Edited timestamp; confirm “cannot be undone”; no undelete; no trash |
| TD-10 | P0 | I/S | Teacher A JWT SELECT teacher B diary | **Zero rows** |
| TD-11 | P0 | I/S | Co-teacher same class | **Cannot** read peer diary |
| TD-12 | P1 | UI | Optional free-text tags | Not a forced behavior taxonomy / PBIS |

### 1.2 Staff diary

| ID | Sev | Type | Scenario | Expected |
|---|---|---|---|---|
| SD-01 | P0 | UI/I | Staff seat journal | Same composer/search as teacher; `seat=staff` |
| SD-02 | P0 | I/S | Teachers / parents SELECT staff diary | **Denied** |
| SD-03 | P0 | UI | Not a substitute for Office Activity | Drawer keeps **Activity** (school audit) ≠ **Diary** (personal) |
| SD-04 | P0 | I | No school-wide staff journal feed | Owner rows only |

### 1.3 Parent diary + twins

| ID | Sev | Type | Scenario | Expected |
|---|---|---|---|---|
| PD-01 | P0 | UI/I | 2+ linked children | Mandatory child switcher; list scoped to focused child only |
| PD-02 | P0 | I | Child A selected; request child B id | Fail closed empty/403; no blend |
| PD-03 | P0 | I | Missing/invalid `child_student_id` with 2+ links | **Empty** set — never mash-up (D1-02) |
| PD-04 | P0 | I/S | Teachers / other parent / Office SELECT parent diary | **Zero rows** in v1 |
| PD-05 | P0 | UI | Does not message teacher | No auto-send; Messages is explicit separate action |
| PD-06 | P0 | UI/I | Parent STT + AI draft | Same draft-then-Save; no write into teacher systems |
| PD-07 | P1 | I | Single linked child | May default that `child_student_id` |

### 1.4 Dual-hat + student seat

| ID | Sev | Type | Scenario | Expected |
|---|---|---|---|---|
| XD-01 | P0 | I/S | Teacher+parent, parent chrome | Parent-seat diary only in UI; no silent teacher-seat residual |
| XD-02 | P0 | I/S | Same profile, teacher chrome | Teacher-seat diary only in UI |
| XD-03 | P0 | I/S | Office chrome / admin JWT | Cannot read **other** users’ diaries (no helper widen) |
| XD-04 | P0 | I/S | Student JWT | SELECT diary empty; no storage; `draft_diary_entry` denied |
| XD-05 | P1 | UI | Seat switch reloads query | No cross-seat residual rows in UI |

### 1.5 Privacy honesty + media

| ID | Sev | Type | Scenario | Expected |
|---|---|---|---|---|
| PR-01 | P0 | UI/U | First-run sheet before first entry | Owner-only **in app**; private storage; server/legal process out of “app private” |
| PR-02 | P0 | U | Copy fixtures | **No** “end-to-end encrypted” / “only you can ever see this” / “unreadable by Kelyra” |
| PR-03 | P0 | UI | Settings → Diary | Same honest paragraph as first-run |
| PR-04 | P0 | UI | FERPA/HR note | “Personal reflection — not the official student file.” No “send to principal” |
| PR-05 | P0 | I/S | Media fetch | Private bucket + owner signed URL only; bare public URL fails |
| PR-06 | P0 | I | Delete entry | GC unreferenced diary objects (or mark for GC) |
| PR-07 | P1 | I | Signed URL | Short TTL; no bucket listing |

## 2. Ledger vs diary body

### 2.1 Separation axioms

| ID | Sev | Type | Scenario | Expected |
|---|---|---|---|---|
| LV-01 | P0 | I/S | New `ledger_events` table | **Not** a view/projection of `audit_events` |
| LV-02 | P0 | I/S | Teacher SELECT on `audit_events` | Still admin-only; My Ledger never opens `/activity` |
| LV-03 | P0 | I | Diary INSERT/UPDATE/DELETE | **Zero** `audit_events` and **zero** `ledger_events` rows |
| LV-04 | P0 | I | STT / Ask draft | No ledger row; no audit row |
| LV-05 | P0 | U/I | Ledger `summary` content | Short human line; grade snippet OK (“Graded Johnny 87”); **no** diary body/title/tags/media paths/transcripts |
| LV-06 | P0 | I | Ledger user edit/delete | **Denied** — append-mostly; REVOKE UPDATE/DELETE |
| LV-07 | P0 | I | Client `write_ledger` / INSERT `ledger_events` | **Denied** for `authenticated` / `anon` |
| LV-08 | P0 | I | `write_ledger` owner | Always `auth.uid()` inside definer — never client-picked uid |
| LV-09 | P0 | I | `write_ledger` error on Approve path | Approve **still succeeds**; ledger miss swallowed + monitorable |
| LV-10 | P0 | I | Student RPCs (`student_submit`, etc.) | **Do not** emit teacher ledger rows |

### 2.2 Teacher My Ledger emitters

| ID | Sev | Type | Scenario | Expected |
|---|---|---|---|---|
| TL-01 | P0 | I | Assignment create/edit | `action=assignment_upsert`, family `assign`; summary has title/class/kind |
| TL-02 | P0 | I | Lesson/practice assign | `assign_lesson`, family `assign`; who/class/title |
| TL-03 | P0 | I | Teacher **Approve** / `approved_score` set | `approve_grade`, family `grade`; mark in summary when present |
| TL-04 | P0 | I | Capture filed / `note_only` | `file_capture`, family `capture`; pointer + student; **not** diary body or photo bytes |
| TL-05 | P1 | I | `publish_class_syllabus` when AVG live | `publish_class_syllabus`, family `syllabus`; class name |
| TL-06 | P0 | I | Syllabus **draft** / Ask draft | **No** ledger emit |
| TL-07 | P0 | UI/I | Browse My Ledger | Newest first; read-only; scannable summary; deep-link if entity still permitted |
| TL-08 | P0 | UI | Filters | Action family chips; class = taught only; single student; date; search summary; sort newest/oldest |
| TL-09 | P1 | UI | Thin export | Client plain text/CSV of **my** filtered rows only; no auto-email Office |

### 2.3 Staff My Ledger

| ID | Sev | Type | Scenario | Expected |
|---|---|---|---|---|
| SL-01 | P0 | I/UI | Staff ledger | **My** office actions only (create login, link parent, hat assign, class-teacher assign…) |
| SL-02 | P0 | I | Not school-wide firehose | Distinct from `/activity` all-actors view |
| SL-03 | P0 | UI | Search/filter | Action + date at minimum |
| SL-04 | P1 | I | Optional `source_audit_id` | Pointer OK when both fire; dual-require **forbidden** |

### 2.4 Parent Ledger + never-emit catalog

| ID | Sev | Type | Scenario | Expected |
|---|---|---|---|---|
| PL-01 | P0 | — | Parent My Ledger | **Deferred** (L-6). Do not emit parent ledger rows in v1 |
| NE-01 | P0 | I/S | Never in ledger or audit | Diary CRUD; STT transcripts; Ask diary drafts; student chips; media URLs; Feed posts; Calendar personal events; matcher guesses; un-Approved capture drafts |
| NE-02 | P0 | U/I | Ledger never grants powers | Observational only — no new assign/grade capability from Ledger UI |

### 2.5 AI / STT capability lock

| Future tool / path | Seat | Capability | Behavior gate |
|---|---|---|---|
| `draft_diary_entry` | T/S/P with Diary | New **`diary.draft`** (not `assignments.manage`, not `officeOnly`) | Returns `{ title?, body, entry_date }` only. Client parks draft. **User Save** INSERTs. |
| Diary STT Edge | Owner JWT | Capture-free twin (`transcribe-audio` style or `transcribe-diary`) | JWT + audio → `{ text }`. No `captures` row. No persist audio. xAI `/stt`. Not Gemini. Not `grok-tts`. |

Hard rules (any counterexample = fail):

1. Client `askToolPolicy` + Edge twin **identical**; unknown names denied; filter after `getUser` + profile — never trust `body.tools` / `body.role`.
2. Keys never `EXPO_PUBLIC_*`.
3. Tool does not Approve, `create_class`, insert students, or `write_ledger`.
4. Unknown student names stay **private text** — no matcher INSERT.
5. Dual-hat: tool seat = signed-in chrome, not `also_teacher` inheritance.
6. Logs = request id, uid, byte length, latency, error class — **not** full body/transcript.
7. `source=ai_nl` (if any) is support metadata only.

### 2.6 AI / STT test matrix

| ID | Sev | Type | Scenario | Expected |
|---|---|---|---|---|
| AI-01 | P0 | S | Tool hung on `assignments.manage` | **Fail** — must be `diary.draft` |
| AI-02 | P0 | S | `officeOnly` on diary draft | **Forbidden** |
| AI-03 | P0 | S | Student offered `draft_diary_entry` | **Denied** |
| AI-04 | P0 | S | Unknown tool name | Denied both client + Edge |
| AI-05 | P0 | UI/I | Draft before Save | Not in DB; creator composer only |
| AI-06 | P0 | U/I | NL invents facts beyond prompt | Draft may paraphrase; Save is gate; no ledger |
| AI-07 | P0 | U/I | NL names student not on roster | Allowed as private text; **zero** `students` INSERT |
| AI-08 | P0 | S | AI path never writes `approved_score` | Static + RPC |
| AI-09 | P0 | S | AI path never `create_class` | Static + tool policy |
| AI-10 | P0 | I | STT uses capture-bound `transcribe` with `captureId` | **Fail** — must be capture-free path |
| AI-11 | P0 | I | STT creates `captures` row | **Zero** |
| AI-12 | P0 | S | Client-side STT SDK + embedded key | **Forbidden** |
| AI-13 | P1 | S | Logs / vendor | Server keys; paid no-training; no full diary body in Edge logs (D1-13) |
| AI-14 | P1 | S | Dual-hat Ask | Chrome seat only |
| AI-15 | P2 | — | Semantic NL diary search | Later (L-7); plain ilike v1 OK |

## 3. Evidence (tests, RLS, dogfood)

### 3.1 Security must-fix → evidence map

Map 1:1 to D1-01…D1-16. Future loop fails if any **P0** missing.

| ID | Sev | D1 | Case | Evidence required later |
|---|---|---|---|---|
| SEC-01 | P0 | D1-01 | Owner-only RLS; never staff/admin/taught helpers | SQL `doesNotMatch` + cross-user JWT zero rows |
| SEC-02 | P0 | D1-02 | Parent 2+ children missing child → empty | Parent JWT twin fixtures (PD-01…PD-03) |
| SEC-03 | P0 | D1-03 | Private `diary` bucket; path prefix uid; no public URL; no reuse photos/audio/files | Storage policies + object URL fail without signature |
| SEC-04 | P0 | D1-04 | `write_ledger` definer; uid from auth; REVOKE authenticated; no client mutate | Grant tests + forged INSERT denied |
| SEC-05 | P0 | D1-05 | Never copy diary body/title/media/STT into audit or ledger; no write_audit on diary CRUD | Static + RPC (LV-03…LV-05) |
| SEC-06 | P0 | D1-06 | No teacher SELECT on audit_events; new ledger_events; /activity admin | Policy review + teacher JWT on audit empty |
| SEC-07 | P0 | D1-07 | Ask `diary.draft` new cap; not assignments.manage; not officeOnly; student none; Save required | askToolPolicy + Edge twin |
| SEC-08 | P0 | D1-08 | STT no captures; no persist audio; JWT; no EXPO_PUBLIC_*; xAI not Gemini; not grok-tts | Edge tests |
| SEC-09 | P0 | D1-09 | Honest privacy copy; forbidden E2E strings | Copy fixtures (PR-01…PR-04) |
| SEC-10 | P0 | D1-10 | Student seat no diary/ledger | JWT tests (XD-04) |
| SEC-11 | P1 | D1-11 | Dual-hat: office cannot read other teachers; UI seat filter | RLS + chrome (XD-01…XD-03) |
| SEC-12 | P1 | D1-12 | student_id pointer not ACL; no reverse join | Serializer / join tests |
| SEC-13 | P1 | D1-13 | PII logs only; redact 502 vendor echo | Edge log review |
| SEC-14 | P1 | D1-14 | Signed URL short TTL; GC on delete | Storage |
| SEC-15 | P1 | D1-15 | Ledger emit swallows errors; never fail Approve; no emit on syllabus draft | Trigger/RPC (LV-09, TL-06) |
| SEC-16 | P1 | D1-16 | Teachers do not create classes from Diary/Ledger/Ask | Tool + UI |

### 3.2 Normative future qa-loop checklist (do not run now)

Copied/affirmed from DIARY-S1 §6 — mandatory when Chuck says send:

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

### 3.3 RLS / helper regression risks

| Risk | Why it bites | Guard IDs |
|---|---|---|
| Copy-paste `is_staff` / `is_school_admin` / `teaches_class` onto diary/ledger | Instant Office/co-teacher warrant-read without L-10 | SEC-01, L4, TD-10/11 |
| Client-only twin filter | Modified Expo dumps both children | SEC-02, PD-03, L5 |
| Reuse `photos`/`audio`/`files` bucket | Confused-deputy SELECT via thread/class policies | SEC-03, PR-05, L13 |
| Client `write_ledger` or owner param | Forged “I graded Johnny 87” | SEC-04, LV-07/08 |
| Diary body in audit / Edge 502 / ledger summary | Redisclosure + /activity existence leak | SEC-05, LV-03/05, L10 |
| Teacher My Ledger as audit_events view | Either leak school firehose or force policy widen | SEC-06, LV-01/02, L3 |
| Ask on `assignments.manage` | Students get diary write; office drafts into teacher surface | SEC-07, AI-01…AI-03 |
| Capture-bound STT / EXPO_PUBLIC key | Inbox pollution + key leak | SEC-08, AI-10…AI-12 |
| E2E / “only you” marketing | Crypto theater under model C | SEC-09, PR-02, L12 |
| student_id reverse join | Family/office read via pointer | SEC-12, TD-04, L8 |
| Ledger fail rolls back Approve | Grade path dies for a log | SEC-15, LV-09, L15 |
| Desk home → diary waterfall | DR-8 / TEACH-UX regression | R-01, TD-01 |
| Class create from Ask diary | Directory law break | SEC-16, AI-09, L16 |

### 3.4 Regression vs frozen surfaces

| ID | Sev | Type | Surface | Expected |
|---|---|---|---|---|
| R-01 | P0 | R/UI | Teacher Desk Today / Needs you / This week | Unchanged primary IA; no default redirect to `/diary` |
| R-02 | P0 | R | Office `/activity` + `audit_events` | Still admin-only; diary CRUD never appears |
| R-03 | P0 | R | Capture Inbox / student Log | Diary photo ≠ capture; no auto-file to student Log |
| R-04 | P0 | R | Gradebook / Approve path | Still requires Approve; ledger observe-only; miss ≠ grade fail |
| R-05 | P0 | R | Matcher / students table | Diary AI never inserts students |
| R-06 | P0 | R | Feed / Messages | Diary never posts by default |
| R-07 | P1 | R | Calendar | Diary add ≠ calendar event; no shared table |
| R-08 | P1 | R | Author / lesson packs | Diff empty re: diary unless explicitly staffed |
| R-09 | P1 | R | Naming: drawer Activity vs Diary | Staff sees both labels meaning different routes |

### 3.5 Process adequacy (how a future loop must run)

#### 3.5.1 Not this ticket

- Do **not** staff implementer/QA/verify children from Q1.
- Do **not** call `kelyra-qa-loop` until Chuck says **send**.
- Do **not** self-certify on green typecheck alone.

#### 3.5.2 After CEO send (recommended loop shape)

| Phase | Owner pattern | Must produce |
|---|---|---|
| A — `diary_entries` + RLS + Journal UI + privacy copy | kelyra-qa-loop | Migrations; owner JWT matrix; PR-* fixtures |
| B — `diary_media` + private bucket + STT compose | Same or follow-on | SEC-03/08, TD-05/06 |
| C — `ledger_events` + `write_ledger` emitters (teacher) | Same | LV-*, TL-01…04, SEC-04/15 |
| D — staff My Ledger of own office actions | Same | SL-*; /activity unchanged |
| E — parent child-switcher + twin fail-closed | Same | PD-*, SEC-02 |
| F — Ask `diary.draft` | Separate if needed | AI-* + SEC-07 |
| Security pass | Loop security stage + this matrix | D1-01…16 checked with paths |
| CoS release read | chief-of-staff | Compares evidence to this plan; no silent scope add |

#### 3.5.3 Evidence package (minimum for CoS when shipping)

1. Automated tests mapped to matrix IDs (TD/SD/PD/XD/PR/LV/TL/SL/AI/SEC/R).
2. JWT fixture dumps (redacted): teacher A≠B; office empty foreign diary; parent twin empty; student empty; co-teacher empty.
3. SQL review note: zero `is_staff` / `is_school_admin` / `teaches_class` on diary/ledger policies.
4. Statement: `ledger_events` is new table — not teacher SELECT on `audit_events`.
5. Statement: Ask cap is `diary.draft`, not `assignments.manage`; client/Edge twins match.
6. Statement: no diary body in audit/ledger; Approve succeeds if ledger emit fails.
7. Dogfood notes: first-run privacy copy; twin switcher; Approve→ledger row; STT edit-before-Save.
8. Open P1/P2 waivers explicitly named — none silent.

#### 3.5.4 Recurring defect watch (post-ship)

1. Staff/admin/taught helper drift onto diary/ledger SELECT  
2. Twin mash / missing child union  
3. Public or reused storage bucket  
4. Client ledger forgery / owner param  
5. Diary prose in audit / Edge logs / ledger summary  
6. Ask capability mis-map / matcher student insert / class create  
7. Capture-bound STT or EXPO_PUBLIC keys  
8. E2E marketing under RLS-only  
9. Desk home takeover  

### 3.6 Dogfood scripts (manual, after send)

| Script | Hats | Pass bar |
|---|---|---|
| DF-1 Privacy first-run | Teacher | Honest copy; no E2E claim; Settings repeats; entry absent from Feed/Activity |
| DF-2 Twins | Parent Saydee/Sydnee | Switcher required; entry on Saydee never on Sydnee list/search |
| DF-3 Co-teacher wall | Two teachers same class | Neither reads the other’s diary |
| DF-4 Approve → Ledger | Teacher | Grade Approve succeeds; ledger shows summary; diary body not in row |
| DF-5 AI draft + STT | Teacher/Parent | Draft sheet → Save; STT edits before Save; no captures row; refuse class create |
| DF-6 Office Activity | Staff admin | `/activity` still school firehose; no diary existence rows; My Ledger = my actions only |
| DF-7 Dual-hat | Teacher-parent seat flip | Teacher journal ≠ parent journal; no residual cross-seat rows |

## 4. Acceptance

**Audience:** CEO / Chief of Staff. **This ticket is not a send.**

### 4.1 Traceability (spec → matrix)

| Spec requirement | Matrix IDs |
|---|---|
| Teacher diary US-T-D1…D6 | TD-01…TD-12, PR-* |
| Staff diary US-S-D1 | SD-01…SD-04 |
| Parent diary / twins US-P-D1…D2 | PD-01…PD-07 |
| Privacy US-PRIV-1…2 | PR-01…PR-07, L12–L13 |
| Dual-hat + student none | XD-01…XD-05, L6–L7 |
| Teacher ledger US-T-L1…L4 | TL-01…TL-09, LV-* |
| Staff ledger US-S-L1 | SL-01…SL-04 |
| Parent ledger deferred US-P-L1 / L-6 | PL-01 |
| AI draft + STT | AI-01…AI-15, TD-06/07 |
| UX chrome US-UX-1…3 | TD-01, SD-03, R-01, R-09 |
| D1 must-fix 01–16 | SEC-01…SEC-16 |
| DIARY-S1 §6 tests | §3.2 checklist |
| Frozen Desk / Activity / Capture / grades | R-01…R-09 |
| v1 vs later cut | §0.2; PL-01; AI-15 |

### 4.2 Explicit non-acceptance (instant fail)

Any of the following in a candidate build = **fail**, regardless of other greens:

1. Using `is_staff` / `is_school_admin` / `teaches_class` / `class_teacher_of` (or equivalent) on diary or ledger SELECT/INSERT/UPDATE/DELETE.
2. Office, co-teacher, student, or other-user JWT reading another owner’s diary or ledger.
3. Parent multi-child unlabeled merge, or missing `child_student_id` returning a union.
4. Student seat Diary/Ledger/storage/Ask tool access.
5. Diary body/title/tags/media/STT copied into `audit_events` or `ledger_events`; `write_audit` on diary CRUD.
6. Teacher My Ledger implemented as SELECT on `audit_events` or opening `/activity` to teachers.
7. Client-callable `write_ledger` / client INSERT/UPDATE/DELETE on `ledger_events`; client-picked `owner_profile_id`.
8. Approve path failing because ledger emit raised.
9. Ask tool on `assignments.manage` or `officeOnly`; draft auto-INSERT without Save; matcher INSERT students; class create; grade Approve from diary AI.
10. Capture-bound STT minting `captures` rows; persisted diary audio; `EXPO_PUBLIC_*` model keys; Gemini STT; diary STT routed as `grok-tts`.
11. Public or reused `photos`/`audio`/`files` bucket for diary media; bare public object URLs.
12. Marketing strings claiming E2E / “only you can ever see this” / “unreadable by Kelyra” under RLS-only v1.
13. `student_id` pointer used as reverse ACL for family/office/co-teacher.
14. Auto-file diary → student Log / Feed / Messages / Inbox; “send to principal” from Diary.
15. Desk/House default redirect to diary waterfall; tray icon without icon pipeline.
16. Parent My Ledger, envelope E2E claims, household diary, or Office warrant-read staffed as if they were v1.
17. Implementation started without CEO written **send**.

### 4.3 Gate status

| Item | Status |
|---|---|
| Spec pack on disk (P1, A1, S1, R1) | Yes |
| This acceptance plan | **Yes — this file** |
| Implementation authorized | **NO** |
| kelyra-qa-loop for diary+ledger | **Forbidden** until CEO send |
| Self-certify by developers | **Forbidden** |
| Eng staffing | **Hold** |

### 4.4 Decisions (this ticket)

1. Acceptance is a **matrix + laws + non-acceptance list**, not a narrative “looks good.”
2. **Owner-only diary / twins** and **ledger vs diary body** are first-class P0 evidence domains equal to RLS.
3. DIARY-S1 §6 tests and must-fix D1-01…16 are incorporated by reference as mandatory future loop cases.
4. Model C (RLS-only + private bucket) and new `ledger_events` (not audit projection) are acceptance axioms (L3, L12, LV-01).
5. Parent My Ledger is **explicitly deferred** — shipping it silently is scope fail.
6. Plan only — no code, no loop, no SQL, no git push from this card.

### 4.5 Open issues (do not block this plan; still block ship if unresolved at send)

| # | Issue | Owner at send |
|---|---|---|
| 1 | Exact Ask capability name (`diary.draft` vs alias) — **semantics locked** in S1 | Architect when staffed |
| 2 | Parent Ledger stay deferred? A1/S1 = **Yes defer** | PM / CEO if reopen |
| 3 | Dual-hat same-uid cross-seat SELECT residual (product wall, not RLS) | Accept per S1 residual; document |
| 4 | Soft student pointer allow vs free-text only — A1 = **allow pointer** | Locked unless CEO rejects |
| 5 | Soft FERPA / no school-official claim until DPA | Unchanged |
| 6 | xAI STT vendor retention / DPA | Security ops; soft FERPA |

### 4.6 Sources

- DIARY-P1 `notes/company/diary-ledger-stories.md` — hats, stories, privacy, v1 cut  
- DIARY-A1 `notes/company/diary-ledger-architecture.md` — schema, RLS, emitters, STT/Ask  
- DIARY-S1 `notes/company/diary-ledger-security.md` — threats, must-fix, §6 tests  
- DIARY-R1 research (context)  
- Live ground: `audit_events` + `/activity`, `askToolPolicy.ts`, `transcribe` Edge, private buckets  
- Prior QA plan shape: `notes/company/calendar-acceptance.md`, `notes/company/avg-spec-acceptance.md`  

---

**RECOMMENDED NEXT ACTION:** CoS/CEO review of the diary+ledger pack (stories + architecture + security + this acceptance). **Do not** implement. **Do not** run kelyra-qa-loop. Hold `senior-developer` until Chuck says send.

### Handoff

- **OBJECTIVE:** Release-level acceptance plan for diary+ledger v1 (evidence contract if CEO later says send).  
- **CONTEXT:** DIARY-P1 / A1 / S1 pack; owner walls; twin fail-closed; ledger ≠ audit; AI draft-then-Save.  
- **WORK PERFORMED:** Wrote `notes/company/diary-ledger-acceptance.md` (laws L1–L16, diary/twin matrix, ledger separation + AI matrix, SEC map D1-01…16, process, non-acceptance, gate).  
- **VERIFICATION:** File on disk; no SQL; no app code; no kelyra-qa-loop.  
- **RESULT:** Plan only — ready for CEO/CoS; not implementation.  
- **OPEN ISSUES:** §4.5  
- **ESCALATION NEEDED:** No unless CEO rejects model C honesty or new `ledger_events` split.  
- **RECOMMENDED NEXT ACTION:** CEO/CoS review; hold eng staffing and qa-loop.

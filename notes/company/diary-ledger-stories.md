# DIARY-P1: Private Diary + Activity Ledger — User Stories & v1 Feature Proposal

**Date:** 2026-09-03  
**Author:** product-manager (Kelyra)  
**Epic:** `t_0e139023` · Stories card: `t_89c5d6c8` · Research: `t_244260b9`  
**Status:** Spec only — no app code, no SQL, no migrations, no `IconName`, no kelyra-qa-loop, no git push.  
**Depends on:** `notes/company/diary-ledger-research.md` (DIARY-R1, 2026-09-03)  
**Also grounded in:** DR-8 report (`wf_01a01afc…`, 2026-08-19 Partial), `docs/mvp.md`, `docs/ui-design.md` §31.5, live `/activity` + `audit_events`, CEO 2026-09-03 direction via CoS  

**Legal posture:** Engineering product law and threat-model honesty. Not a legal opinion. Not a claim of FERPA school-official status. Not “unbreakable encryption.”

---

## 0. One-line product law

| Surface | Job | Who sees it |
|---|---|---|
| **Diary** | Owner’s private journal (text / STT / photo / later video). Reflection and memory — **not** the official student record, **not** Feed, **not** Capture Log. | **Owner only** under product policy. Admins/DBA/subpoena may still reach server-stored ciphertext or plaintext depending on crypto model (see §4). |
| **Ledger** | Owner’s running log of **what I did in Kelyra** (assign, grade, syllabus confirm, lesson assign…). Discrepancy defense. | **Owner** (own actions). Distinct from Office **Activity** (`/activity` school-wide `audit_events`). |
| **Office Activity** (live today) | School-wide append-only `@actor · role · action · entity` | **Administrators / superintendent only** — do not repurpose as teacher Diary or personal Ledger. |
| **Student Log** (live today) | Capture / skill history / work on a **student record** | Teachers of that class; not a personal diary. |

CEO wants **both** Diary and Ledger as **dedicated surfaces**, not a single all-in-one home (DR-8 still correct on that point).

---

## 1. Names and chrome placement (PM decision)

| Product name | Route (proposal) | Chrome |
|---|---|---|
| **Diary** | `/diary` | Profile / hamburger for teacher, staff, parent. **Not** a sixth tray tab. **Not** House home. |
| **My Ledger** | `/ledger` (or `/diary?tab=ledger` if one shell with two panes) | Same entry cluster as Diary. Label **My Ledger** so it is never confused with Office **Activity**. |
| Office **Activity** | `/activity` (live) | Unchanged. Admin only. |

**v1 shell preference:** one destination **Diary** with two top segments: **Journal · Ledger** (PersonTabs / ChipRow pattern already used on person pages). Keeps one discoverable noun for humans; keeps two data stores under the hood.

**Do not:**
- Replace House / Desk home with a mixed diary feed (DR-8).
- Put Diary rows on class Feed or school Feed.
- Reuse `/activity` for teachers’ personal ledger.
- Add tray icon day one (prefer drawer + Profile deep link; icon later only via `scripts/build-icons.mjs`).

---

## 2. Explicit non-goals (v1 and near-term)

| Non-goal | Why |
|---|---|
| Home-screen replacement | DR-8 + live Desk (Today / Needs you / Capture / Inbox) already own action items. |
| Public / Office-visible student discipline log | Different product; FERPA + HR risk. Diary is personal reflection, not PBIS / SIS behavior. |
| Class create from Diary or Ledger | Teachers do not create classes. Office assigns classes. |
| Mixing children (Saydee vs Sydnee) | Parent hat: every entry and ledger filter is **one linked child** or **no child tag**. Never a blended twin timeline. |
| Ask-as-superuser | Ask may draft a diary entry; it never Approves grades, never creates classes, never writes Ledger rows as a fake actor. |
| Public Storage for diary media | Private bucket only; no public URLs. |
| Fake “only you can ever see this” E2E theater | Honest privacy copy (see §4). |
| Auto-file diary entry onto student Log | Optional later “copy fact to student note” is a **separate explicit** action with its own gate — not v1. |
| Student role Diary/Ledger | Out of v1. COPPA + no need. |
| Hash-chained immutable blockchain ledger | Later if ever; v1 is append-mostly with no user edit of past Ledger rows. |
| New privileges | Ledger **observes** existing actions; it does not grant assign/grade/syllabus powers. |

---

## 3. Hats and store isolation

| Hat (signed-in seat) | Diary store | Ledger scope | Notes |
|---|---|---|---|
| **Teacher** | `owner_profile_id` + seat=`teacher` | Actions this profile performed while in teacher chrome (assign, Approve/grade, capture attach, syllabus confirm, lesson assign) | Class context on Ledger rows is **taught** classes only. |
| **Staff** (superintendent / administrator) | Separate store seat=`staff` (or same profile, seat tag) | Office actions this profile performed (people, links, class directory…) | **Not** a dump of all teachers’ diaries. |
| **Parent** | seat=`parent` | Parent-visible Kelyra actions (opened child progress, sent message to teacher, etc.) — thin in v1 | Multi-child: **filter required**; default = last-focused child; never merge siblings into one undivided stream without labels. |
| **Dual-hat** (teacher+parent, admin+teacher) | **Separate diaries per seat** (or hard seat switch before open) | Ledger filtered to actions under that seat | Switching tray/seat switches which Diary you open. No silent cross-read. |
| **Student** | None v1 | None v1 | — |

**Hard rule:** Diary rows never appear in another hat’s query. RLS (and later envelope keys) key off `owner_profile_id` + `seat`. Co-teachers do not read each other’s diaries. Office does not get a “read teacher diary” screen in v1.

---

## 4. Privacy & encryption (honest story)

Research options (DIARY-R1 §2):

| Model | Sync | Server search / STT | Who can compel / admin-read |
|---|---|---|---|
| **A. On-device only** | No multi-device | Weak / local only | Device unlock + physical possession |
| **B. Envelope encryption** (ciphertext + wrapped DEK; KEK in KMS) | Yes | Metadata may be plain; body search limited unless client-side | Provider with KEK + lawful process; broken if KEK policy allows staff unwrap |
| **C. RLS-only** (plaintext at rest in Postgres) | Yes | Full | DBA, backups, subpoena of host, mis-bound service role |

### v1 PM recommendation

1. **Ship privacy as RLS-only owner rows + private media bucket** (model C), with UI copy that does **not** say “encrypted so only you can see it.”  
2. **Label in-product:** “Private to you in Kelyra. School IT or a legal process could still access server-held data.”  
3. **Architecture follow-up (not blocking stories):** envelope encryption (B) as **v1.1 / later** once key custody is designed — do not advertise B until built.  
4. **Never** put diary media in a public bucket.  
5. **AI / STT path:** transcript and “add entry” prompts go to **server-side** AI only (same rule as capture: no `EXPO_PUBLIC_*` keys). Treat diary text that names students as **sensitive PII** in logs (no full-body function logs).  
6. **Discipline content risk:** entries like Johnny / Sally / principal’s office may become **education records** if institutionally maintained or shared. Product copy: “Personal reflection — not the official student file.” No auto-share to Office, parents, or Feed.

### Story — Privacy honesty

**US-PRIV-1**  
As any Diary owner, I see clear privacy language before the first entry so I do not believe false E2E promises.  
**ACCEPTANCE:**
- First-run sheet states owner-only **in app**, private storage, and that server operators / legal process are out of scope of “app private.”
- No marketing string “end-to-end encrypted” unless model B is actually shipping with client-held keys.
- Settings → Diary repeats the same paragraph.
- FERPA/HR note: entries naming students are sensitive; product does not offer “send to principal” from Diary in v1.

**US-PRIV-2**  
As a security reviewer, diary media cannot be fetched with a bare public URL.  
**ACCEPTANCE:**
- Spec requires private bucket + signed URL for owner only.
- Family, students, co-teachers, and Office seats have **no** SELECT path to diary tables or diary objects in v1.

---

## 5. Diary — user stories

### 5.1 Teacher

**US-T-D1 — Write a private day note**  
As a **teacher**, I can write a private journal entry (e.g. “Johnny had a bad day… Sally… principal’s office”) so I remember context without posting to Feed or the student Log.  
**ACCEPTANCE:**
- From Diary → New entry: title optional, body required (or STT-produced body), timestamp default now (editable date).
- Save stores under my profile + teacher seat only.
- Entry does **not** appear on student page, Feed, Messages, or Office Activity.
- Optional free-text **tags** (not a forced behavior taxonomy) in v1.
- Optional **soft student mention** is plain text or a chip that stores `student_id` **only as a private pointer for my search** — it does **not** grant that student/parent read access and does **not** write Capture/Log.

**US-T-D2 — Photo attach**  
As a **teacher**, I can attach a photo to a diary entry (desk note, hallway context) without making it a homework capture.  
**ACCEPTANCE:**
- Attach from camera or library; stored private; shown only on that entry.
- Attach is **not** a `captures` row and does not enter Inbox.
- Delete entry deletes unreferenced diary media (or marks for GC).

**US-T-D3 — STT compose**  
As a **teacher**, I can dictate a diary entry when my hands are full.  
**ACCEPTANCE:**
- Mic control on composer; server-side STT (existing Grok Voice path pattern); transcript lands in body for edit before Save.
- No auto-save of raw audio as a gradeable capture.
- Company **TTS** remains `grok-tts` only if we ever read entries aloud later; diary **STT is input**, not that lock.

**US-T-D4 — AI “add a diary entry for today: …”**  
As a **teacher**, I can tell Ask (or an in-Diary assistant field): “Add a diary entry for today: Johnny had a bad day…” and get a **draft** entry.  
**ACCEPTANCE:**
- Produces a draft in Diary composer (date=today, body=paraphrase/transcript) — **user must Save**.
- Does not invent facts beyond the prompt; does not add Ledger rows; does not Approve anything; does not create classes or students.
- Tool/capability (when built) is owner-only diary draft — **not** `assignments.manage`, not office scope.
- If prompt names a student not on my rosters, still allowed as **private text** (it is my diary); no matcher insert.

**US-T-D5 — Search / filter / sort Diary**  
As a **teacher**, I can find an old entry by text, date range, and optional tag/student chip.  
**ACCEPTANCE:**
- List default: newest first.
- Search matches title/body (and tag labels).
- Filters: date range; tag; optional student chip (my private pointers only).
- Sort: newest / oldest. (Relevance later.)

**US-T-D6 — Edit / delete own entry**  
As a **teacher**, I can edit or delete my diary entries.  
**ACCEPTANCE:**
- Edit updates body/title/tags/media; shows edited timestamp.
- Delete confirms “This cannot be undone.”
- No undelete in v1.
- Nobody else has an edit affordance.

### 5.2 Staff (superintendent / administrator)

**US-S-D1 — Staff personal diary**  
As **staff**, I have the same private journal as teachers, in the **staff seat**, for non-classroom reflection (hiring note-to-self, facilities, etc.).  
**ACCEPTANCE:**
- Same composer/search as teacher Diary.
- Not visible to teachers or parents.
- Not a substitute for Office Activity audit.
- No school-wide “staff journal” feed.

### 5.3 Parent

**US-P-D1 — Parent personal diary per child context**  
As a **parent**, I can keep private notes about **one linked child at a time** (doctor call, carpool, “ask teacher about reading”).  
**ACCEPTANCE:**
- Child switcher required when 2+ `parent_students` links (Saydee vs Sydnee never share an unlabeled stream).
- Entries store `child_student_id` when tagged; list filter defaults to focused child.
- Teachers and the other parent (if any) **cannot** read this diary in v1.
- Does not message the teacher unless I explicitly open Messages.

**US-P-D2 — Parent STT + AI add-entry**  
Same pattern as US-T-D3 / US-T-D4 under parent seat.  
**ACCEPTANCE:** identical draft-then-Save gate; no write into teacher systems.

---

## 6. Ledger — user stories

Ledger = **my actions in Kelyra**, auto-captured, append-mostly, for “when did I grade Johnny 87?” defense. **Not** a social diary. **Not** Office Activity.

### 6.1 Teacher

**US-T-L1 — Auto-capture core actions**  
As a **teacher**, when I perform key Kelyra actions, a Ledger row is recorded without a second form.  
**ACCEPTANCE (v1 action set):**
- Assignment created / edited (title, class, kind).
- Practice or lesson **assigned** (who/class, title).
- Grade / mark **Approved** or score set after Approve path (show mark when present — e.g. “Graded Johnny’s paper 87”).
- Syllabus draft confirmed / published (class name) — when AVG ships; until then skip or stub.
- Capture filed to student / kept note_only (pointer only, not diary body).
- Each row: `created_at`, `actor_profile_id`, `seat`, `action`, `entity_type`, `entity_id`, optional `class_id`, optional `student_id`, short **human summary** string, optional before/after snippets for grade changes.
- Failure to write Ledger must **not** roll back the primary action (best-effort log; monitor).

**US-T-L2 — Browse My Ledger**  
As a **teacher**, I open My Ledger and see my actions newest first.  
**ACCEPTANCE:**
- Read-only rows (no edit/delete by user).
- Summary line scannable on mobile and web.
- Tap may deep-link to existing entity screen when still permitted (assignment, student, class syllabus) — if entity deleted, show summary only.

**US-T-L3 — Search / filter / sort Ledger**  
As a **teacher**, I can filter Ledger by date range, action type, class, and student.  
**ACCEPTANCE:**
- Chip filters: action family (Assign · Grade · Syllabus · Capture · Other).
- Class filter: classes I teach only.
- Student filter: single student (no multi-student blend confusion).
- Text on summary text.
- Sort: newest / oldest.

**US-T-L4 — Discrepancy defense export (thin)**  
As a **teacher**, I can export a date-filtered slice of **my** Ledger for a conference.  
**ACCEPTANCE:**
- v1: copy plain text or CSV of visible filtered rows (client-side).
- Export contains only my rows; no other teachers.
- No auto-email to Office.

### 6.2 Staff

**US-S-L1 — Staff My Ledger**  
As **staff**, my Ledger shows **my** office actions (create login, link parent, assign teacher to class, etc.), not every actor in the school.  
**ACCEPTANCE:**
- Distinct from `/activity` school-wide audit (which remains admin read of **all** `audit_events`).
- Implementation may **project** from `audit_events` where `actor = me` **or** use a parallel `user_ledger_events` table — Architect chooses; product requires owner-scoped UX either way.
- Search/filter by action + date.

### 6.3 Parent

**US-P-L1 — Parent My Ledger (thin v1)**  
As a **parent**, I can see a thin log of what **I** did (opened child progress, sent a message, updated child details).  
**ACCEPTANCE:**
- No visibility into teacher grade actions beyond what parent progress already shows.
- Child filter when multiple children.
- Acceptable v1 cut: **defer parent Ledger** if engineering budget is tight — must be explicit in §8 table.

---

## 7. Shared UX quality stories

**US-UX-1 — Strong list UX**  
As any owner, Diary and Ledger lists feel as deliberate as Messages / People (not a raw dump).  
**ACCEPTANCE:**
- Section headers by day.
- WorkingLine / empty states with one primary CTA (New entry / empty ledger explanation).
- Portrait + landscape; web denser; phone thumb-friendly composer.
- System / Light / Dark tokens only.

**US-UX-2 — Desk home unchanged**  
As a **teacher**, House still opens Needs you / Today / This week — not a diary waterfall.  
**ACCEPTANCE:**
- No default redirect from `/` to `/diary`.
- Optional one-time tip “Diary is in the menu” max once — no persistent home takeover.

**US-UX-3 — Naming collision guard**  
As **staff**, drawer shows **Activity** (school audit) and **Diary** (personal) as different labels.  
**ACCEPTANCE:**
- Teacher drawer shows **Diary** (and Ledger segment), not “Activity,” unless they also wear admin hat (then both labels appear and mean different routes).

---

## 8. Proposed feature cut — v1 vs later

### v1 (CEO review cut)

| ID | Feature | Hats | Notes |
|---|---|---|---|
| V1-1 | Diary journal text + date + tags | T / S / P | Owner + seat isolation |
| V1-2 | Diary STT compose | T / S / P | Server STT; edit before Save |
| V1-3 | Diary photo attach (private) | T / S / P | No public bucket; not Capture |
| V1-4 | AI/Ask draft “add diary entry for today…” | T / S / P | Draft only; Save required |
| V1-5 | Diary search + date filter + sort | T / S / P | |
| V1-6 | Privacy first-run copy (honest RLS) | all | No fake E2E |
| V1-7 | My Ledger auto-rows for assign / grade / file capture | **T** (S optional) | Observational only |
| V1-8 | My Ledger filters (date, action, class, student) + sort | T | |
| V1-9 | Chrome: Profile/hamburger → Diary with Journal \| Ledger segments | T / S / P | Not home replacement |
| V1-10 | Parent child-switcher on Diary | P | No twin merge |

### Later

| ID | Feature | Why later |
|---|---|---|
| L-1 | Envelope encryption + key custody | Real crypto design + ops |
| L-2 | Diary video | Size, moderation, cost |
| L-3 | On-device-only mode | Sync tradeoffs |
| L-4 | Hash-chain / true immutability proofs | Overkill for v1 defense |
| L-5 | “Promote diary fact → student Log” explicit flow | Blurs private vs record; needs FERPA gate |
| L-6 | Parent My Ledger full | Thin value until parent actions grow |
| L-7 | NL search / semantic tags | After plain search works |
| L-8 | Reminders / “remember to call mom” tasks | Different product (Desk tasks) |
| L-9 | Shared household diary | Explicitly out — privacy |
| L-10 | Office read of teacher diary with warrant workflow | Legal product, not MVP |
| L-11 | Tray icon for Diary | Only with icon pipeline |
| L-12 | Syllabus/lesson ledger verbs | When those features are live |

---

## 9. Relationship to live systems (implementers)

| Live piece | Relationship |
|---|---|
| `audit_events` + `/activity` | **School-wide admin audit.** Keep. My Ledger may reuse write path or dual-write owner projection — do not open `/activity` to teachers as their Ledger. |
| Capture `note_only` / student skill history | **Student Log.** Stays on student record. Diary is orthogonal. |
| Feed / messaging | Broadcast and mail. Diary never posts here by default. |
| Ask | Draft diary entry only; tool policy owner-scoped; no grade Approve. |
| AVG syllabus | Ledger row on Confirm/Publish when built. |
| Teachers create class | **Forbidden** on these surfaces (live office-only create). |

---

## 10. Open questions for CEO / CoS (not blockers for story sign-off)

1. **Shell:** single Diary route with Journal \| Ledger tabs (recommended) vs two top-level routes?  
2. **Parent Ledger in v1:** ship thin or defer (recommend **defer** if capacity tight)?  
3. **Crypto:** accept honest RLS-only v1 copy, with envelope on the roadmap?  
4. **Student chips on diary:** allow private `student_id` pointers for search, or pure free text only in v1? (Recommend **allow pointer**, never cross-ACL.)  
5. **Dual-write:** must every Ledger row also exist in `audit_events` for Office, or only owner table until needed?

---

## 11. Acceptance of this PM ticket

- [x] User stories per hat for Diary and Ledger  
- [x] Privacy/encryption honesty (no fake E2E)  
- [x] STT + AI add-entry stories  
- [x] Search/filter/sort stories  
- [x] Explicit non-goals (home replacement, public discipline, class create, twin merge)  
- [x] v1 vs later table  
- [x] Grounded in DIARY-R1 + DR-8 + live Activity  
- [ ] CEO / CoS review  
- [ ] **No implementation** until Chuck says send  

**Artifacts:**  
- Research: `/Users/chuckbroaddus/projects/kelyra/notes/company/diary-ledger-research.md`  
- This file: `/Users/chuckbroaddus/projects/kelyra/notes/company/diary-ledger-stories.md`  

**Recommended next action:** CEO/CoS review this proposal. Do **not** staff senior-developer or kelyra-qa-loop until Chuck says send.

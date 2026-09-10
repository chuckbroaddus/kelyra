# DIARY IQG — Real-world intent (retro)

**Date:** 2026-09-10  
**Author:** qa-supervisor (Kelyra)  
**Card:** `t_bdce4c12` · Process: `notes/company/INTENT_QUALITY_GATE.md`  
**Feature:** Private Diary (Journal) + My Ledger  
**Status:** Design-stage IQG **retro** intent. **QA Supervisor DESIGN STAMP: APPROVED**. Implementation already shipped (DIARY-I1 PR #39 `203e64e`); this card does **not** self-certify product-complete. Prove-out + open P1 FIX-NOW still required.

**SoT read (pre-IQG stamp pack):**  
`diary-ledger-stories.md` (P1) · `diary-ledger-architecture.md` (A1) · `diary-ledger-security.md` (S1) · `diary-ledger-acceptance.md` (Q1) · CoS input `diary-iqg-postmortem.md` (not a stamp) · PM disposition `diary-iqg-defect-disposition.md` / `t_82ac1f93`.

**Live ground (read-only this card):** `src/app/diary.tsx`, `src/lib/diary/*`, `HamburgerDrawer.tsx`, migration `20260910000000_diary_ledger.sql`.

---

## DESIGN STAMP

```
DESIGN STAMP
Feature/bug: DIARY — private Journal + My Ledger (owner seat-scoped)
Quality goals: owner-only RLS model C; separate seat diaries; twins fail closed; photo attach+view private; STT edit-before-Save; Ask draft-then-Save; ledger observes assign/grade/file-capture (staff office own actions); browse+export; no student Diary; parent Ledger deferred; no home/tray takeover; no diary body in audit/ledger; honest privacy copy
PM: APPROVED (pre-IQG + disposition)  date: 2026-09-03 / 2026-09-10  profile-session: DIARY-P1 t_89c5d6c8 + disposition t_82ac1f93 / product-manager
QA Supervisor: APPROVED  date: 2026-09-10  profile-session: t_bdce4c12 / qa-supervisor
Intent gaps remaining: none (realization defects filed — see §5)
```

**QA Supervisor stamp meaning:** Real-world intent is fully specified in P1/A1/S1/Q1 (hats, chrome entry, full lifecycle, multiplicity, reverse/cancel, explicit non-goals) — **not** happy-path only. Live impl matches core product law; open misses are **realization** defects already on board (photo view P1 FIX-NOW; filters/camera P2 SCHEDULE; sort/deep-link P3 DEFER). Ask NL Dear Diary remains CEO-parked `t_cecf2af0` — do not reopen. This stamp does **not** declare DIARY product-complete or release-ready.

---

## 1. One-line law

| Surface | Job | Not |
|---|---|---|
| **Diary (Journal)** | Owner private notes (text / STT / photo) under `owner_profile_id` + chrome `seat` | Student Log, Feed, Capture Inbox, Office Activity, Calendar, Desk home |
| **My Ledger** | Append-mostly log of *my* Kelyra actions | Diary prose; school-wide `/activity` |
| **Office Activity** (live) | Admin `audit_events` firehose | Teachers’ personal ledger |

Privacy v1 = **model C** (RLS-only + private `diary` bucket). Honest copy only. No E2E theater.

---

## 2. Hats

### 2.1 Teacher

| Intent | Specified? | Live |
|---|---|---|
| Private journal seat=`teacher` | Yes · US-T-D1 | Yes |
| Photo attach private (not Capture) | Yes · US-T-D2 | Upload yes; **view missing** · `t_5f2574b1` |
| Camera or library | Yes · US-T-D2 | Library only · `t_369b456a` |
| STT → edit before Save | Yes · US-T-D3 | Yes · `transcribeAudioDirect` |
| Ask draft-then-Save | Yes · US-T-D4 | Tool+park yes; NL CEO-parked `t_cecf2af0` |
| Search / date / tag / student-chip / sort | Yes · US-T-D5 | Text search yes; date/tag/chip UI no · `t_05f7f139`; sort toggle no · `t_b7594650` |
| Edit / hard-delete confirm | Yes · US-T-D6 | Yes |
| My Ledger auto-rows assign/grade/file capture | Yes · US-T-L1 | Triggers present (unexecuted live DF-4) |
| Browse + filters + export | Yes · US-T-L2–L4 | Browse/filters/CSV yes; deep-link no · `t_0a6410cf` |

### 2.2 Staff (office / superintendent)

| Intent | Specified? | Live |
|---|---|---|
| Personal journal seat=`staff` | Yes · US-S-D1 | Yes via chrome seat |
| Not school-wide staff journal | Yes | Owner RLS only |
| My Ledger = **my** office actions | Yes · US-S-L1 | audit→ledger projection trigger |
| Drawer **Activity** ≠ **Diary** | Yes · US-UX-3 | Both labels, different routes |

### 2.3 Parent

| Intent | Specified? | Live |
|---|---|---|
| Journal per focused child | Yes · US-P-D1 | Child chips when 2+; single defaults |
| Twins fail closed (Saydee ≠ Sydnee) | Yes · L5 / D1-02 | SQL RPC + RLS; UI empty until pick |
| STT + Ask draft same gates | Yes · US-P-D2 | Same paths |
| My Ledger | **Deferred** L-6 | Explicit UI deferral; no emit |

### 2.4 Dual-hat

| Intent | Specified? | Live |
|---|---|---|
| Separate diaries per chrome seat | Yes · L6 | `diarySeatForChrome` + RPC `p_seat` |
| Teacher+parent / office+teacher | Yes | Seat switch reloads list |
| Office JWT cannot read **other** teachers’ diaries | Yes · D1-11 | Owner RLS only |
| Same-uid cross-seat SELECT residual | Accepted S1 | Product wall, not RLS |

### 2.5 Student

| Intent | Specified? | Live |
|---|---|---|
| No Diary / Ledger / storage / Ask tool | Yes · L7 | `canOpenDiary` false; drawer no link; tool denied |

---

## 3. Chrome entry

| Hat | Entry | Not |
|---|---|---|
| Teacher | Hamburger **Diary** → `/diary` Journal \| Ledger | Tray tab; House home redirect |
| Staff / office | Hamburger **Diary** + separate **Activity** | Diary ≠ Activity |
| Parent | Hamburger **Diary** | Tray; household shared diary |
| Dual-hat | Diary under **active chrome seat** after seat switch | Silent cross-seat residual rows in UI |
| Student | **None** | — |

Settings → Diary repeats honest privacy + FERPA note (PR-03).

---

## 4. Full lifecycle

| Flow | Intent | Live verdict |
|---|---|---|
| Write journal | Body required; optional title/tags/date; seat+owner | **Pass** |
| Edit | Updates; shows edited stamp | **Pass** |
| Delete | Confirm “cannot be undone”; no undelete | **Pass** |
| Photo attach | Private bucket path `{uid}/{seat}/{entry}/{media}`; not captures | **Partial** — upload after first Save; library-only |
| Photo **view** | Shown on that entry via owner signed URL | **FAIL** · P1 `t_5f2574b1` (`listDiaryMedia` / `diaryMediaSignedUrl` unused in UI) |
| STT | Server STT → body; edit before Save; no audio persist; no ledger | **Pass** (code) |
| Ask draft | `diary.draft` / `draft_diary_entry` parks composer; user Save | **Pass** capability; NL routing parked |
| Ledger observe | assign / Approve grade / file capture; staff office | **Pass** (triggers); dogfood pending |
| Ledger browse | Newest first; read-only; filters action/date/class/student | **Pass** filters; sort toggle absent |
| Ledger export | Client CSV of **my** filtered rows | **Pass** |
| Ledger deep-link | May open entity when still permitted | **Miss** · P3 DEFER |
| Parent ledger | Deferred, not silent ship | **Pass** (explicit defer) |
| Reverse / cancel | Delete confirm; composer close; STT stop; privacy re-prompt if unacked | **Pass enough** |

---

## 5. Gaps vs live impl + defect map

**CoS postmortem is input, not SoT.** Independent static re-check of live code + migration + security tests confirms the same realization set. **No new intent gaps** requiring PM restaff beyond `t_82ac1f93`.

### 5.1 Confirmed defects (do not bury; already carded)

| Sev | Card | Miss | Stamp refs | PM disposition (`t_82ac1f93`) |
|---|---|---|---|---|
| **P1** | `t_5f2574b1` | Photo never shown after attach | US-T-D2, TD-05, V1-3 lifecycle | **FIX-NOW** |
| **P2** | `t_05f7f139` | Journal missing date/tag/student-chip filters | US-T-D5, TD-08 (RPC ready) | **SCHEDULE** |
| **P2** | `t_369b456a` | Attach library-only (`pickRawPhoto(false)`), not camera | US-T-D2 | **SCHEDULE** |
| **P3** | `t_b7594650` | No newest/oldest sort toggle | US-T-D5 / US-T-L3 | **DEFER** |
| **P3** | `t_0a6410cf` | Ledger no entity deep-link | US-T-L2 may-link | **DEFER** |

### 5.2 Explicitly not defects on this stamp

| Item | Why |
|---|---|
| Ask NL “Dear Diary” routing | CEO-parked `t_cecf2af0` — capability+park exist; do not reopen |
| Parent My Ledger absent | Stamped **defer** L-6; UI says so |
| Same-uid dual-seat SELECT residual | Accepted S1 residual |
| Envelope / E2E / warrant-read / promote-to-Log / household / tray icon / student Diary | Explicit non-goals |
| Live JWT DF-1…DF-7 unexecuted | **Prove-out debt**, not a design gap — QE card owns |

### 5.3 Missed functional defects?

**None found** beyond the five CoS-filed cards + parked Ask NL. QA Supervisor does not invent duplicate cards.

Severity note: Q1 labeled TD-08 P0 for journal filters; IQG severity guide + PM disposition correctly treat as **P2** (text search workaround; not blocked school flow). Photo **view** remains the sole open **P1** realization miss.

### 5.4 Core law that matched (do not reopen)

- Owner-only RLS; no `is_staff` / `is_school_admin` / `teaches_class` on diary/ledger policies (D1-01).
- New `ledger_events`; `/activity` not widened (D1-06).
- `write_ledger` definer, revoke authenticated, swallow errors, parent seat no-op (D1-04/15).
- Private `diary` bucket `public=false`; path prefix uid (D1-03).
- Twins fail-closed in `list_my_diary_entries` + RLS (D1-02).
- Ask `diary.draft` not `assignments.manage` / not `officeOnly`; student denied; no INSERT/Approve/create_class/write_ledger in tool (D1-07).
- Capture-free STT path; no `EXPO_PUBLIC_*`; honest privacy copy (D1-08/09).
- Student seat dark (D1-10).
- Soft student pointer write path; not reverse ACL.
- Ledger class filter = taught classes only.
- Diary body not copied to audit/ledger; no write_audit on diary CRUD (D1-05).

---

## 6. Multiplicity / reverse / non-goals

### 6.1 Multiplicity (must prove)

| Case | Law |
|---|---|
| Parent 2+ children / twins | Focused `child_student_id` required; missing → **empty**, never mash-up |
| Soft student pointer | Owner search metadata only — never grants student/parent/office/co-teacher SELECT |
| Ledger class | Taught classes only |
| Ledger student | Single student chip — no multi blend |
| Dual-hat | Separate diary stores per chrome seat; seat switch reloads |

### 6.2 Reverse / cancel

| Action | Law |
|---|---|
| Delete entry | Confirm cannot be undone; hard-delete; no trash/undelete v1 |
| No send-to-principal | Absent forever in v1 |
| Composer / STT / privacy sheet | Cancel closes; privacy re-prompts if unacked |
| Parent Ledger | Deferred — must not silently appear |

### 6.3 Explicit non-goals (guarded)

Home takeover · tray icon · student Diary · envelope E2E claims · household diary · Office warrant-read · promote-to-Log · class create from Diary/Ask · diary body in audit/ledger · parent Ledger emit · fake “only you can ever see this” · hash-chain ledger · new privileges from Ledger UI.

---

## 7. Prove-out OBJECTIVE (QA Engineer)

**Staffing:** CoS creates `qa-engineer` card after this stamp. **Plan + cases now**; **execute vs live impl** (DIARY already shipped). Do not declare DIARY done from this card. Do not run kelyra-qa-loop here. Do not git. Do not SQL. Do not implement.

**OBJECTIVE (paste onto qa-engineer card):**

```
OBJECTIVE:
Write test plan + cases for DIARY (private Journal + My Ledger) vs stamped IQG intent. Land notes/company/diary-iqg-testplan.md (or notes/qa/). Execute against live impl (DIARY-I1 PR #39 / migration 20260910000000 applied) — implementation already shipped. File defects on board kelyra with severity (P0–P3) vs stamp; do not bury misses only in comments. Confirm or correct existing defect cards; do not duplicate Ask NL (CEO-parked t_cecf2af0).

SoT: notes/company/diary-iqg-intent.md (this stamp), diary-ledger-stories.md (P1), diary-ledger-architecture.md (A1), diary-ledger-security.md (S1), diary-ledger-acceptance.md (Q1 L1–L16 + matrix), diary-iqg-defect-disposition.md.

SCOPE — must cover:
1. HATS: teacher Journal+Ledger; staff seat=staff Journal + own office Ledger; parent Journal per child + Ledger deferred copy; dual-hat teacher+parent and office+teacher separate seat diaries; student none (drawer, route, Ask tool, storage).
2. CHROME ENTRY: hamburger Diary for T/S/P; not tray; not House redirect; staff Activity ≠ Diary labels; Settings → Diary honest privacy.
3. LIFECYCLE: write/edit/delete+confirm; STT edit-before-Save (no captures row, no ledger row); photo attach AND view (expect FAIL today → confirm t_5f2574b1); Ask draft park-then-Save (tool path; NL parked — note only); ledger observe assign/grade/file-capture + staff office; browse filters; CSV export; parent ledger deferral explicit.
4. MULTIPLICITY: parent 2+ / twins fail closed (Saydee≠Sydnee; missing focus empty); soft student pointer not ACL; ledger class=taught only; dual-hat seat switch no residual UI rows.
5. INTEGRITY / SECURITY: owner-only RLS (no staff/admin/taught helpers); write_ledger not client-callable; Approve survives ledger miss; no diary body in audit/ledger; no teacher SELECT on audit_events; private diary bucket; honest copy (no E2E phrases); D1-01…16 map.
6. NON-GOALS guarded: no home takeover; no tray icon; no student Diary; no parent ledger emit; no envelope claims; no household diary; no warrant-read; no promote-to-Log; no class create from Diary/Ask; no send-to-principal.

CASES (minimum — expand in testplan):
- Map Q1 DF-1…DF-7 dogfood scripts as first-class execute rows:
  DF-1 Privacy first-run (teacher)
  DF-2 Twins parent Saydee/Sydnee
  DF-3 Co-teacher wall
  DF-4 Approve → Ledger (grade path + no diary body in row)
  DF-5 AI draft tool path + STT (not NL Dear Diary)
  DF-6 Office Activity vs My Ledger
  DF-7 Dual-hat seat flip
- TD-01…12 teacher diary; SD-01…04 staff; PD-01…07 parent/twins; XD-01…05 dual-hat/student
- PR-01…07 privacy+media; LV-01…10 ledger separation; TL-01…09 teacher ledger; SL-01…04 staff ledger; PL-01 defer
- AI-01…14 Ask/STT locks (skip NL routing as parked)
- SEC-01…16 ↔ D1-01…16
- R-01…09 frozen Desk/Activity/Capture/grades/Feed
- PHOTO-VIEW-01 explicit repro for t_5f2574b1 (attach library → no image on entry)
- FILTER-01 journal date/tag/student-chip missing UI (t_05f7f139)
- CAM-01 library-only attach (t_369b456a)
- SORT-01 / LINK-01 polish rows for P3 cards

EVIDENCE: automated (diary.security.test.ts + matrix) and/or scripted UI + JWT/role fixtures where RLS. Each P0 intent law → evidence path. Open P0/P1 misses → DEFECT [sev] cards parented to feature tracker t_b6b8e31b (or confirm existing). Re-prove photo FIX-NOW after eng lands.

CONSTRAINTS: No eng implement on QE card; no git ship; no devops-release; do not complete parent t_b6b8e31b; do not reopen t_cecf2af0; do not treat CoS postmortem as prove-out evidence.

RECOMMENDED NEXT ACTION after QE plan+execute: QA Supervisor release evidence only when open P0/P1 FIX-NOW closed or in-flight with evidence; then CoS may staff devops-release. Eng for t_5f2574b1 only after dual DESIGN STAMP (this card + PM disposition) + ARM.
```

---

## 8. Process / handoff

| Field | Value |
|---|---|
| **QA Supervisor stamp** | **APPROVED** 2026-09-10 · `t_bdce4c12` / qa-supervisor |
| **PM stamp** | **APPROVED** (pre-IQG P1 + disposition) · DIARY-P1 `t_89c5d6c8` · disposition `t_82ac1f93` |
| **DESIGN STAMP (both)** | **Dual-APPROVED** for intent completeness — **not** product-complete |
| **Intent gaps remaining** | **none** (realization defects already carded) |
| **Engineering** | No new scope. FIX-NOW only: photo view `t_5f2574b1` after ARM. P2 SCHEDULE sticky. P3 DEFER sticky. Do not self-certify epic. |
| **QA Engineer** | CoS staffs from §7 OBJECTIVE — plan + execute live prove-out |
| **Ask NL** | Remains parked `t_cecf2af0` |
| **Parent tracker** | `t_b6b8e31b` sticky — do not complete from this card |
| **devops-release** | **Blocked** until QE prove-out + open P0/P1 clear + QA Sup release evidence |
| **RESULT** | Retro intent stamped APPROVED. Prove-out OBJECTIVE ready. Defects confirmed; no new cards. |

### RECOMMENDED NEXT ACTION (CoS)

1. **Staff `qa-engineer`** from §7 prove-out OBJECTIVE (child of feature / this stamp). ARM as needed.
2. **FIX-NOW eng** for `t_5f2574b1` photo view only after dual stamp (met) + ARM GRANT — do not bundle scope creep.
3. Leave P2 SCHEDULE / P3 DEFER sticky per PM disposition; optional camera ride-along only if cheap on photo eng.
4. Do **not** reopen Ask NL `t_cecf2af0`.
5. Do **not** complete parent `t_b6b8e31b` until prove-out + P1 clear + release evidence.
6. No devops-release until QA Supervisor release stamp.

---

*End DIARY IQG intent — Journal + My Ledger · DESIGN STAMP QA Supervisor APPROVED 2026-09-10 (`t_bdce4c12`). Dual stamp met for intent; product-complete = prove-out + P1 closed.*

# DIARY IQG post-mortem — implementation vs intent

**Date:** 2026-09-10  
**Author:** chief-of-staff  
**Why now:** IQG became standing Company OS the same day (CEO lock). DIARY v1 shipped *before* dual DESIGN STAMP + QA Engineer prove-out. This is the retroactive intent check.

**Shipped:** DIARY-I1 `t_f9b1198c` · PR #39 `203e64e` · migration `20260910000000_diary_ledger.sql` applied.

**Intent SoT (pre-IQG stamp pack):**

| Artifact | Role |
|---|---|
| `diary-ledger-stories.md` (DIARY-P1) | Hats, stories, v1 cut, non-goals |
| `diary-ledger-architecture.md` (DIARY-A1) | Schema, RLS, emitters |
| `diary-ledger-security.md` (DIARY-S1) | D1-01…16 |
| `diary-ledger-acceptance.md` (DIARY-Q1) | Laws L1–L16 + matrix |

**No** `DESIGN STAMP` block existed (IQG did not exist yet). Treat P1+A1+S1+Q1 as the stamped design.

---

## Verdict

**Core product law landed.** Diary is owner-only (RLS model C), My Ledger is a new `ledger_events` table (not `/activity`), student seat is dark, twins fail closed in SQL, Ask draft-then-Save capability exists, privacy copy is honest.

**Not fully realized vs IQG.** Happy-path Journal + Ledger shipped; photo *lifecycle*, journal *filters*, and Ask *NL capture* are incomplete. Live JWT / dogfood DF-1…DF-7 were never run as IQG prove-out.

Feature is **not IQG-done**. Open P1/P2 below; Ask NL stays CEO-parked (`t_cecf2af0`).

---

## IQG dimensions

### 1. Hats

| Hat | Intent | Shipped |
|---|---|---|
| Teacher | Journal + My Ledger | Yes — `/diary` Journal \| Ledger; drawer **Diary** (not tray) |
| Staff (office/super) | Separate `seat=staff` journal + own office ledger | Yes — office chrome → `staff`; drawer Diary **and** Activity as different labels |
| Parent | Journal per focused child; Ledger **deferred** | Journal + child chips when 2+ links; Ledger tab explains deferral (no emit) |
| Dual-hat | Separate diaries per chrome seat | UI filters `seat` from `chrome.role`. Same-uid cross-seat SELECT residual accepted (S1) |
| Student | None | Drawer has no Diary; `canOpenDiary` false; Ask tool denied |

### 2. Entry (chrome)

- Hamburger **Diary** for teacher, parent, office. Not a tray tab. No House redirect. **Pass** (US-UX-1–3, TD-01, R-01, R-09).
- Settings → Diary repeats honest privacy + FERPA note. **Pass** (PR-03).

### 3. Full lifecycle

| Flow | Intent | Actual |
|---|---|---|
| Write / edit / delete journal | Body required; edited stamp; confirm “cannot be undone” | **Pass** |
| Photo attach | Camera **or** library; shown on that entry; private bucket; not Capture | Attach = **library only** after first Save. **No viewer** (`diaryMediaSignedUrl` unused in UI). Bucket/path/RLS exist. |
| STT | Server STT → edit before Save; no capture row | **Pass** (`transcribe-audio` / `transcribeAudioDirect`) |
| Ask draft | “Add a diary entry…” / Dear Diary → composer; user Save | Tool `draft_diary_entry` + park. **NL utterances not proven** — parked `t_cecf2af0` |
| Ledger observe | Auto-rows assign / grade / file capture; staff office actions | Triggers present. **Not dogfooded** (DF-4) |
| Ledger finish | Read-only browse + thin CSV export | Export/copy CSV **Pass**. No entity deep-link (US-T-L2) |

### 4. Multiplicity

| Case | Intent | Actual |
|---|---|---|
| Parent 2+ children | Switcher required; missing focus → **empty** | SQL `list_my_diary_entries` fail-closed; UI chips + “Pick a child”. **Pass** (code). Untested live twins. |
| Soft student pointer | Private search only, not ACL | Composer chips from taught roster. **Pass** write path. Journal **list** cannot filter by chip. |
| Ledger class / student | Taught classes only; single student | Chip pickers. **Pass** |
| Dual-hat seat switch | Reload; no residual rows in UI | Seat from chrome; list RPC filters `p_seat`. **Likely pass**; no live DF-7 |

### 5. Reverse / cancel / already-in-flow

- Delete confirm. Composer close. STT stop. Privacy sheet cancel (re-prompts if unacked). **Pass enough.**
- No undelete (intentional). No “send to principal.” **Pass** non-goals.

### 6. Explicit non-goals (must stay out)

Checked **absent** as v1: home takeover, tray icon, student Diary, parent Ledger emit, envelope/E2E claims, household diary, Office warrant-read, promote-to-Log, class create from Diary/Ask, diary body in audit/ledger, `is_staff`/`is_school_admin`/`teaches_class` on diary/ledger policies.

---

## v1 cut scorecard (DIARY-P1 §8)

| ID | Feature | Status |
|---|---|---|
| V1-1 | Journal text + date + tags T/S/P | **Met** |
| V1-2 | STT compose | **Met** (code) |
| V1-3 | Photo attach private | **Partial** — upload path yes; camera no; display no |
| V1-4 | Ask/AI draft | **Partial** — capability yes; NL routing CEO-parked |
| V1-5 | Search + date filter + sort | **Partial** — text search yes; date/tag/student filters **not in UI** (RPC supports them); no oldest/newest toggle |
| V1-6 | Honest privacy first-run | **Met** |
| V1-7 | Teacher ledger auto-rows | **Met** (triggers). Staff office via `audit_events` projection trigger |
| V1-8 | Ledger filters | **Met** (action, date, class, student, search) |
| V1-9 | Hamburger Diary Journal \| Ledger | **Met** |
| V1-10 | Parent child-switcher | **Met** (code) |

---

## Defects vs stamp (filed on board `kelyra`)

Parent tracker: `t_b6b8e31b` (unassigned, sticky). PM disposition: `t_82ac1f93`.

Do **not** re-file Ask NL — already `t_cecf2af0` (CEO parked).

| Sev | Card | Miss | IQG / matrix |
|---|---|---|---|
| P1 | `t_5f2574b1` | Attached diary photos cannot be viewed on the entry | US-T-D2, TD-05, full lifecycle |
| P2 | `t_05f7f139` | Journal list has no date / tag / student-chip filters | US-T-D5, TD-08 (API ready) |
| P2 | `t_369b456a` | Photo attach is library-only (`pickRawPhoto(false)`), not camera | US-T-D2 |
| P3 | `t_b7594650` | No newest/oldest sort toggle (default newest only) | US-T-D5 / US-T-L3 |
| P3 | `t_0a6410cf` | Ledger rows do not deep-link to entity | US-T-L2 |

---

## What matched (do not reopen)

- L1–L16 product laws in schema/RLS/UI copy (static tests in `diary.security.test.ts`).
- New `ledger_events`; teacher SELECT on `audit_events` not widened.
- `write_ledger` SECURITY DEFINER, revoke authenticated, swallow errors, parent seat no-op.
- `diary` bucket `public=false`; path `{uid}/{seat}/{entry}/{media}`.
- Ask cap `diary.draft` — not `assignments.manage`, not `officeOnly`; student denied; no INSERT/Approve/create_class/write_ledger in the tool.
- Parent Ledger explicitly deferred in UI copy.

---

## Process gaps (IQG, not product)

1. No PM + QA Supervisor **DESIGN STAMP** block (process did not exist).
2. Implement via grok-bot-consultant, not stamped Eng-after-stamp chain.
3. No QA Engineer prove-out / `diary-*-testplan.md` execution; no JWT fixture dumps (Q1 §3.5.3).
4. Loop leftover P1/P2 called “not blocking” in I1 close — IQG now forbids burying functional misses only in PR text.

Live DF-1…DF-7 (privacy, twins, co-teacher wall, Approve→ledger, AI+STT, office Activity, dual-hat) still **unexecuted**. Static review ≠ release evidence.

---

## Recommended next (CoS)

1. PM auto-disposition **done** (`t_82ac1f93`) — SoT `notes/company/diary-iqg-defect-disposition.md`.
   - **FIX-NOW:** `t_5f2574b1` P1 photo show
   - **SCHEDULE:** `t_05f7f139` P2 filters; `t_369b456a` P2 camera (optional bundle w/ photo eng)
   - **DEFER:** `t_b7594650` P3 sort; `t_0a6410cf` P3 ledger deep-link
2. FIX-NOW → ARM GRANT + dual DESIGN STAMP + Engineering child of `t_5f2574b1`.
3. Leave SCHEDULE/DEFER sticky per disposition note. Leave `t_cecf2af0` parked until Chuck says staff Ask NL.
4. Optional later: QA Engineer live prove-out of DF-1…DF-7 — do not treat this note as that evidence.

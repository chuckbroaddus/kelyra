# DIARY IQG — PM defect disposition pack

**Parent disposition card:** t_82ac1f93  
**Feature tracker:** t_b6b8e31b  
**Date:** 2026-09-10  
**Profile:** product-manager  
**SoT:** diary-iqg-postmortem.md · diary-ledger-stories.md · diary-ledger-acceptance.md · INTENT_QUALITY_GATE.md Phase 6  
**Do not reopen:** t_cecf2af0 Ask NL Dear Diary (CEO parked)

---

## Binding summary table

| id | title | SEVERITY | DISPOSITION | reason (short) | CoS next |
|---|---|---|---|---|---|
| t_5f2574b1 | Photo never shown after attach | **P1** (confirm) | **FIX-NOW** | US-T-D2/TD-05 lifecycle; API ready, UI never shows | ARM + dual stamp → Eng child |
| t_05f7f139 | Journal missing date/tag/student filters | **P2** (confirm) | **SCHEDULE** | US-T-D5 partial; text search OK; RPC args exist | sticky SCHEDULE |
| t_369b456a | Attach library-only, not camera | **P2** (confirm) | **SCHEDULE** | US-T-D2 camera half; Camera-app workaround | sticky SCHEDULE; optional bundle w/ photo eng |
| t_b7594650 | No newest/oldest sort toggle | **P3** (confirm) | **DEFER** | polish; default newest meets primary AC | leave sticky DEFER |
| t_0a6410cf | Ledger rows no entity deep-link | **P3** (confirm) | **DEFER** | US-T-L2 may-link polish; CSV/browse OK | leave sticky DEFER |

**CEO escalate?** No. **Staff Eng from this card?** No — CoS only. **App/git/SQL this turn?** No.

---

## IQG Phase 6

- P0/P1 → FIX-NOW unless written reason.
- P2/P3 → SCHEDULE or DEFER with reason.
- Core laws matched; gaps are realization. Ask NL stays parked.

---

## Per-defect detail

### 1. t_5f2574b1 — Photo never shown after attach

| Field | Value |
|---|---|
| **SEVERITY** | **P1** (confirmed) |
| **DISPOSITION** | **FIX-NOW** |
| **Stamp conflict?** | No — implements existing stamp US-T-D2 / TD-05 / V1-3 |
| **CEO escalate?** | No |

**Why P1 / FIX-NOW**

1. Stamped photo lifecycle: attach **and** show on that entry (private signed URL; not Capture Inbox).
2. Primary hat (teacher/staff/parent journal). Attach uploads + `diary_media` insert; UI never calls `listDiaryMedia` / `diaryMediaSignedUrl` on composer or list → feature appears broken after attach.
3. No workaround that displays the private diary photo in-product.
4. API already exists (`src/lib/diary/api.ts`); realization gap is UI wiring + fail-closed empty state.

**Not SCHEDULE/DEFER:** Would leave V1-3 half-shipped (store without show).

**Accepted expected (no design reopen)**

- After attach (and on re-open entry): media on **that entry only**.
- Signed URL from private `diary` bucket; path ownership unchanged.
- Delete entry cleans media (existing API path).
- Not a captures row; not Inbox.

**Eng contract (CoS → Engineering after dual DESIGN STAMP)**

1. On entry open / after attach success: `listDiaryMedia(entryId)` + `diaryMediaSignedUrl` per row.
2. Show on composer (saved entry) and journal detail/row as appropriate; broken URL → honest empty, no crash.
3. Non-goals: camera source (t_369b456a); Capture pipeline; public bucket; cross-seat read.

**AC re-prove:** Save → Attach library → see image on entry → leave/re-open → still shown → only owner seat.

### 2. t_05f7f139 — Journal list missing date/tag/student-chip filters

| Field | Value |
|---|---|
| **SEVERITY** | **P2** (confirmed; not P0 despite Q1 TD-08 label) |
| **DISPOSITION** | **SCHEDULE** |
| **CEO escalate?** | No |

**Why P2 / SCHEDULE**

1. US-T-D5 / V1-5: date range, tag, optional student chip are stamped; text search works.
2. RPC `list_my_diary_entries` already has `p_from`, `p_to`, `p_tag`, `p_student_id`; UI only passes `query` (+ seat/child).
3. Workaround: type search. Not a blocked live school flow → IQG P2, not P0/P1.
4. SCHEDULE (not DEFER): real stamped filters, API ready — next diary polish wave after photo FIX-NOW (or same wave if capacity without blocking photo).

**Accepted expected**

- List default newest; search title/body/tags.
- UI filters pass date range, tag, optional student chip (private pointers only; fail-closed).
- Soft student pointer never becomes ACL.

**Eng contract (when scheduled)**

- Wire filter chrome → `listDiaryEntries` args already supported.
- No schema change expected. Non-goals: relevance sort; shared filters across seats.

### 3. t_369b456a — Photo attach library-only (not camera)

| Field | Value |
|---|---|
| **SEVERITY** | **P2** (confirmed) |
| **DISPOSITION** | **SCHEDULE** |
| **CEO escalate?** | No |

**Why P2 / SCHEDULE**

1. US-T-D2 says camera **or** library; live path is `pickRawPhoto(false)` only (`diary.tsx`).
2. Workaround: shoot in Camera app, then library pick. Not blocked school flow.
3. SCHEDULE (not DEFER): completes stamped attach source; small surface (`pickRawPhoto(true)` / chooser).
4. **Optional bundle:** CoS may attach camera affordance as ride-along on t_5f2574b1 Eng child if cheap and stamped together — still not a second FIX-NOW gate. If not bundled, remains SCHEDULE sticky.

**Accepted expected**

- Attach chooser or dual action: camera or library; private bucket; not captures.
- Display still owned by t_5f2574b1.

**Non-goals:** redesign capture camera stack; web-only dead ends without honest copy.

### 4. t_b7594650 — No newest/oldest sort toggle

| Field | Value |
|---|---|
| **SEVERITY** | **P3** (confirmed) |
| **DISPOSITION** | **DEFER** |
| **CEO escalate?** | No |

**Why P3 / DEFER**

1. US-T-D5 / US-T-L3 allow newest/oldest; default newest already matches primary AC.
2. Polish only; no blocked flow. `listLedgerEvents` ascending flag unused by UI — same class of miss.
3. DEFER until filter wave or later polish; do not staff ahead of P1 photo or P2 filters.

**Accepted expected (when picked up):** Journal + Ledger sort control newest/oldest; default newest.

### 5. t_0a6410cf — Ledger rows no entity deep-link

| Field | Value |
|---|---|
| **SEVERITY** | **P3** (confirmed) |
| **DISPOSITION** | **DEFER** |
| **CEO escalate?** | No |

**Why P3 / DEFER**

1. US-T-L2: tap **may** deep-link when entity still permitted; else summary only.
2. Ledger observe + thin CSV export met. Read-only cards without href are polish.
3. DEFER: needs careful permission checks (deleted entity, co-teacher wall); not release-blocking.

**Accepted expected (when picked up):** Tap → assignment/student/class when still allowed; deleted → summary only, no error toast spam.

**Non-goals:** editable ledger; parent ledger emit; widen audit_events SELECT.

---

## Stamp gate (FIX-NOW only)

User-facing bug corrections require dual DESIGN STAMP before Eng (IQG). For t_5f2574b1:

- **PM quality goal:** US-T-D2 display lifecycle complete (show private media on entry).
- **No new option pack** unless QA Sup finds chrome gap; default = wire existing API into diary UI patterns.
- CoS staffs `qa-supervisor` stamp sibling if needed; then ARM GRANT + Engineering child of t_5f2574b1.
- SCHEDULE/DEFER cards stay sticky with this reason — no Eng until pulled.

---

## Explicit non-actions

- Do not reopen Ask NL (`t_cecf2af0`).
- Do not reopen core RLS / ledger≠activity / twins / privacy / student-dark laws.
- Do not staff Eng from t_82ac1f93.
- No app code, git, or SQL from PM this turn.

---

## Handoff

- **OBJECTIVE:** Auto-disposition five DIARY IQG post-mortem defects.
- **RESULT:** 1× FIX-NOW (P1 photo show); 2× SCHEDULE (P2 filters, P2 camera); 2× DEFER (P3 sort, P3 deep-link). Severities confirmed.
- **FILES:** `notes/company/diary-iqg-defect-disposition.md`
- **ESCALATION NEEDED:** CoS only (ARM + stamps + Eng for FIX-NOW). No CEO.
- **RECOMMENDED NEXT ACTION:** CoS staffs FIX-NOW t_5f2574b1 after dual stamps; leaves SCHEDULE/DEFER sticky per table.

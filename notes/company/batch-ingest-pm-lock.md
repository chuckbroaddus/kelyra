# BATCH-v1 — Class-stack ingest (PM lock)

**Date:** 2026-09-12  
**Author:** product-manager (Kelyra)  
**Card:** `t_4773e0ef`  
**CoS briefing (input only):** `notes/company/batch-ingest-cos-brief.md`  
**Research:** `notes/research/worksheet-ai-platform/` (`06_batch_ingest_folder_watch.md`, `07_large_files_streaming.md`, `RESEARCH_PACKAGE.md`)  
**Product SoT:** `docs/mvp.md` · `docs/vision.md` · `docs/data-model.md` · `docs/ui-design.md`  
**IQG:** `notes/company/INTENT_QUALITY_GATE.md`  
**Options pack:** `notes/company/batch-ingest-options.md` — **PRESENT** (designer `t_62f56547`); chrome IDs locked §8 / UI row (this card `t_0d68de74`)  
**Status:** BINDING product law for BATCH-v1. Spec only — no `src/`, SQL, Edge, qa-loop, git, or Engineering staffing on this card.

**Parallel IQG:** QA Supervisor owns `notes/company/batch-ingest-intent.md`. Dual stamp required before Architect/Eng.

---

## DESIGN STAMP

```
DESIGN STAMP
Feature/bug: BATCH-v1 class-stack ingest → Split Review → captures → Needs drafts
Quality goals: teacher-only Teach seat; one class bound pre-upload; Split Review required; never invent student; never auto-Approve; no whole-class PDF to model; TUS+caps; reuse Inbox/Needs; hot folder/Drive out of v1; cancel/partial/idempotent; a11y keyboard Split Review
PM: APPROVED  date: 2026-09-12  profile-session: product-manager / t_4773e0ef
QA Supervisor: (leave for QAS)
Intent gaps remaining: none (PM side); QAS may still list intent gaps on batch-ingest-intent.md
```

**Dual stamp required before Architect / Engineering.** This card stamps PM only. Hold Eng until both APPROVED.

---

## 0. Binding pick summary

| ID | Decision | Lock |
|---|---|---|
| **SCOPE** | Is BATCH-v1 in? | **IN** — CEO-requested slice now. Pulls a **subset of L4** (fixed-N + human Split Review + manual name). Camera loop still ships without this. |
| **P1** | Who ingests | **Teacher-only.** Dual-hat → **Teach seat** only. |
| **P2** | Product nouns | **Reuse** captures + skill_gaps + Inbox / Needs you. No second “needs.” |
| **P3** | Safety | **Never invent a student. Never auto-Approve.** Matcher/Inbox unchanged. |
| **P4** | v1 surface | **Web upload** PDF/images + **Split Review** + fixed-N guess + **TUS** + server page rasterize. |
| **P5** | Hot folder / Drive / QR / header OCR | **v2+ only.** Not pulled into v1. |
| **P6** | Wrong packet | **P0.** Split Review **always** at least once per batch in v1. |
| **P7** | Model input | **Never** send class PDF to a model (ADR-016 / research 07). Page JPEGs only. |
| **P8** | AI tier | **Paid AI only.** |
| **P9** | Phone v1 | Status + “open on computer”; optional single-file Share if TUS works. **Not** primary Split Review on 4″. |
| **P10** | Class bind | **One class** bound **before** upload/match. |
| **NAME** | Name assign in v1 | **NA-A — Inbox only** after Confirm (no Split Review name UI; no silent OCR; manual name later in Inbox). Reaffirm; not reopened. |
| **UI** | Chrome options (binding IDs) | **CE-A** · **SR-A** (+ phone gate) · **PR-A** (+ optional dismissible batch chip) · **NA-A**. See §8. Safety laws BATCH-01–22 unchanged. |

**Hot folder / Drive in v1?** **No.** Explicitly deferred (see §1.3).

---

## 1. Why these locks

### 1.1 BATCH-v1 is **IN** (CEO slice; L4 subset)

1. CEO asked for class-stack MFP ingest + large-file safety in this thread. Waiting for full “later L4/L8” roadmap would strand the request.
2. `docs/mvp.md` lists **L4 Multi-student packet split** and **L8 OCR name** as later. PM **does not** rewrite the whole MVP table. PM **does** authorize a **bounded pull-forward**:
   - **In:** multi-page stack → teacher-confirmed packets → existing captures → Inbox/Needs.
   - **Out of this pull:** header OCR auto-name (L8), coversheet QR, hot folder, Drive watch, variable-length AI clustering.
3. Phone camera loop (M2/M10) **still ships and remains primary for single-student capture**. BATCH-v1 is an **additive web path**, not a replacement. Teachers without a stack still photograph one kid at a time.
4. Success bar (CoS): 25 one-page tickets, one PDF, time ≪ 25 photos, **zero** silent roster inserts, **zero** Approves without a tap.

### 1.2 Accept CoS P1–P10 as product law

| Lock | Why |
|---|---|
| Teacher-only / Teach seat | FERPA; whole-class minor PII in one blob (research 06 §10). Parent/Student/Office never ingest classmates. |
| Reuse Needs/Inbox | Batch is a **new capture source**, not a new desk. Avoids third pile and chrome debt. |
| Never invent / never auto-Approve | M3/M4/M6 + data-model: `student_id` null first-class; nothing is a grade until Approve. |
| Web upload + Split Review + fixed-N + TUS | Smallest stack that survives 413 and wrong-packet P0 without OS-level folder lies. |
| Hot folder v2+ | Research 06: iOS cannot daemon-watch Downloads; Safari has no directory observer; Chromebook path is Drive. Shipping fake “watching folder” on phone = trust break. |
| Split Review required | Gradescope honesty: fixed-N fails on double-feed / missing kid / extras. Wrong packet = Maya ≠ Jamal = **P0**. |
| Never whole-PDF to model | Gemini 50 MB PDF cap + cost + we need owned page thumbs for Split Review (07). |
| Paid AI only | Free tiers train; FERPA constraint in mvp. |
| Phone = status / handoff | M10: phone captures; web reviews. Split Review on 4″ is hostile; Chromebook/Mac is the workroom path. |
| One class pre-bind | Two periods in one stack is teacher error we must catch before match. |

### 1.3 Hot folder / Drive — **explicitly not in v1**

**Decision:** Do **not** pull hot folder, Drive watch, OneDrive, email ingest, iOS Files Inbox daemon, Windows/Mac ingest agent, or QR coversheets into BATCH-v1.

**Why not:**
1. Capability matrix (06 §6.1) makes honest phone hot-folder **impossible**; computer agent + Drive are real but are a **second product surface** (auth, bookmarks, debounce, Processed move).
2. CEO large-file + stack split pain is solved by **upload + TUS + Split Review** without waiting on agent install in school IT.
3. Drive OAuth / Workspace is school-native for Chromebook **and** belongs in v2 with its own IQG (source binding, webhook failures, duplicate polls).
4. CoS P5 recommended v2+; PM concurs. If Chuck later orders Drive-in-v1, reopen this lock — do not silently expand Eng scope.

### 1.4 Name assign = Inbox only (v1)

1. CoS E rec: avoid forking matcher UX inside Split Review.
2. v1 has **no** header OCR (L8 stays later). Optional **manual** name in Split Review would still invent a second assign UI.
3. Confirmed packets with no name → captures `student_id` null → **Inbox** / unassigned. Teacher files with existing Inbox tools. Gaps draft **only after** student attached (keep today’s law — no gap-on-unassigned).

### 1.5 Designer pack → chrome locked

`notes/company/batch-ingest-options.md` landed (designer `t_62f56547`).  
**Chrome IDs binding in §8 / UI row:** **CE-A · SR-A (+ phone gate) · PR-A (+ chip) · NA-A** (`t_0d68de74`).  
Safety laws BATCH-01–22 **not** reopened. No pack option contradicted a safety law; rejected chrome alternatives listed in §8.2.

### 1.6 Rejected alternatives

| Alt | Disposition | Reason |
|---|---|---|
| Skip Split Review when count matches N×roster | **Rejected v1** | False confidence; double-feed still wrong kid. QAS may propose relax later; not this stamp. |
| Gap AI on unnamed packets | **Rejected** | Identity leak / wrong child when later named; data-model: no analysis unassigned. |
| Whole-class PDF to Gemini | **Rejected** | Cap + cost + no page ownership. |
| iPhone “hot folder” copy | **Rejected** | Platform lie (06). |
| Edge Function rasterize 200 MB | **Rejected** | Timeout/RAM; dedicated worker. |
| Student/parent stack upload | **Rejected** | Classmates’ PII. |
| Auto-Approve drafts | **Rejected** | M6. |
| Pull full L8 OCR into v1 | **Rejected** | Assist-only later; silent file forbidden. |
| Replace phone camera path | **Rejected** | M2 remains; batch additive. |

---

## 2. Binding product law

| Law ID | Lock |
|---|---|
| **BATCH-01** | BATCH-v1 is an **authorized CEO slice**: web class-stack upload → rasterize → Split Review → captures → existing Inbox/Needs. Camera single-capture path unchanged and still required. |
| **BATCH-02** | **Teacher-only** ingest chrome. Parent, Student, Office, superintendent: **no** Upload stack. Dual-hat teacher-parent: **Teach seat only**. |
| **BATCH-03** | Teacher must bind **exactly one class** (and may bind optional assignment column) **before** upload starts. No class → cannot start. Multi-class teacher picks class first. |
| **BATCH-04** | Accepted inputs v1: **PDF**, and common images (`jpg/jpeg/png/webp/heic` as pages). Multiple files allowed; teacher can **reorder** before split. Concat order = teacher order (default filename/mtime with warning if shuffled). |
| **BATCH-05** | **pages-per-student N** (default **1**) drives fixed-N guess in feeder order. Blanks on duplex backs: “ignore blank backs” default **ON**; teacher can mark blank in Split Review. |
| **BATCH-06** | **Split Review is mandatory** at least once per batch in v1 before any packet becomes a capture — even if packet count = roster × N. Confirm disabled if 0 packets. |
| **BATCH-07** | Split Review actions (web): split after focused page, merge with previous, mark blank, reorder pages across packets, roster missing count. Keyboard: **S** split, **M** merge, **B** blank (designer may extend; these verbs stay). |
| **BATCH-08** | On Confirm: each non-blank packet → one **capture** (multi-page assets). `ingest_batch_id` links back. **status ≠ approved**. No grade book write. |
| **BATCH-09** | **Never invent a student.** No roster insert from batch. Unnamed packets → `student_id` null → **Inbox**. Matcher never auto-inserts. Twins: manual file; never merge packets by last name. |
| **BATCH-10** | **Never auto-Approve.** Worker/AI only draft. Teacher Approves on existing Needs/student surfaces as today. |
| **BATCH-11** | **skill_gaps** draft only after student is attached (same as today). Unnamed = Inbox, **no** gap AI until named. Do not invent gap-on-unassigned. |
| **BATCH-12** | **Never send the class PDF (or whole stack) to a model.** Model sees per-page/per-packet JPEG ≤ ~4 MB policy; paid tier only. |
| **BATCH-13** | **Size path:** files **> 6 MB** use **TUS** resumable upload. Soft warn **> 40 MB** or **> 80 pages**. Hard fail **> 250 MB** or **> 400 pages** with human copy (“split the stack on the MFP”). Single image hard fail **> 15 MB** if it would violate inline model limits after refuse-to-send. Encrypted/password PDF → named error, 0 captures. |
| **BATCH-14** | **Idempotency:** original file **sha256**; retry same bytes must not duplicate captures. Partial fail: completed packets stay; remainder retryable; banner names the gap. |
| **BATCH-15** | **Cancel before Confirm:** deletes/ abandons staged pages (TTL cleanup). **After Confirm:** batch is captures — delete follows normal capture delete rules (“cannot be undone” where product already requires). |
| **BATCH-16** | **Phone v1:** entry may exist for status / “open on computer for Split Review” / optional Share of a **single** PDF into the same batch pipeline if TUS works. Primary Split Review is **web** (Chromebook/Mac/Windows). No fake folder watch. |
| **BATCH-17** | **Hot folder, Drive, OneDrive, email ingest, QR coversheet, header OCR auto-name, SIS, student upload of classmates = non-goals v1** (v2+ / later L8). |
| **BATCH-18** | Reuse **Needs you** / class Needs / Inbox lists — no third desk noun. Progress may use banner or batch page (chrome); results land on existing piles. |
| **BATCH-19** | Rasterize **server-side** (dedicated worker, not Edge whole-file). Thumbs for Split Review; processed JPEG for AI. |
| **BATCH-20** | A11y: Split Review full keyboard path; ≥44px handles; blank/error not color-only; thumbs have text alt e.g. “page 12.” |
| **BATCH-21** | RLS/ownership: teacher owns batch; student/parent cannot SELECT class-stack batches. |
| **BATCH-22** | One batch ≠ two classes; one packet ≠ two students. Two PDFs = one batch after reorder UI, still one class. |

---

## 3. Hats matrix

| Hat | Upload stack / Split Review | Needs / Inbox after batch | Notes |
|---|---|---|---|
| **Teacher** | **Yes** — web primary | Yes — existing | Bound class = active/chosen class |
| **Teacher + parent dual-hat** | **Teach seat only** | Teach seat Needs for class | Parent seat: no stack chrome |
| **Parent** | **No** | Own-child progress only (unchanged) | Cannot see class stack |
| **Student** | **No** | No stack; own to-do only | |
| **Office / administrator** | **No** | No | |
| **Superintendent** | **No** | No | |
| **Multi-class teacher** | Must pick **one** class before upload | Per-class Needs | Cannot upload “all my periods” as one batch |
| **Twins / same last name** | Manual file in Inbox | Never auto-merge by surname | |
| **Signed-out** | **No** | — | |

QAS owns fuller intent file; this matrix is PM binding minimum.

---

## 4. Lifecycle

```
[Pick class + optional assignment + N]
        → add/remove/reorder files (pre-upload or pre-raster complete)
        → upload (TUS if >6 MB) / resume on drop
        → rasterize (server) → thumbs ready
        → Split Review (required)
        → Confirm  OR  Cancel (pre-confirm → abandon staged)
        → per-packet captures created (unassigned)
        → teacher files name in Inbox (optional timing)
        → when named: understand → skill_gaps draft → Needs you
        → teacher Approves / edits / deletes per existing capture rules
```

**Reverse / cancel**
- Pre-Confirm Cancel or abandon: no captures; staged storage TTL-deleted.
- Change files before Confirm: allowed; invalidates prior split guess; re-enter Split Review.
- Post-Confirm: no “undo whole batch” magic required in v1 beyond deleting individual captures; partial retry does not re-mint sha256 duplicates.
- Leave mid-upload: TUS resume within validity window; else restart upload same file (idempotent).

**Already-in-flow**
- Second upload while batch in Split Review: either block with “finish or cancel current” **or** allow parallel batches per teacher — **PM lock: allow parallel batches**, each bound to a class; do not silently merge batches.
- Navigating away from Split Review: draft split state persisted for that batch id until Confirm, Cancel, or TTL.

---

## 5. Multiplicity

| Dimension | Rule |
|---|---|
| Classes | One batch → one `class_id`. Two periods = two batches (or teacher error caught if pages ≫ one roster). |
| Students | One packet → one capture → at most one `student_id` (null until filed). |
| Files | Many PDFs/images → one batch after reorder. |
| Pages | Many pages → packets of N (guess) then teacher-adjusted. |
| Devices | Upload on web; status on phone; same teacher account. |
| Concurrent batches | Allowed; UI must show which batch is open. |
| Roster missing | Split Review shows missing count vs enrolled roster; does not auto-create rows. |

---

## 6. User stories + acceptance

### US-T1 — Upload stack for current class

As a **teacher** on **web**, I upload one or more PDF/image files as a class stack for a bound class.  
**AC:**
1. Cannot start without a selected class (BATCH-03).
2. Optional assignment column may be bound; null assignment OK.
3. File(s) create/join an `IngestBatch` (product name may be “stack”); progress shows bytes then page raster progress.
4. Parent/Student/Office chrome has no equivalent control (US-T8).
5. Accepted MIME/types per BATCH-04; rejected type → named error, no silent drop.

### US-T2 — Set N and enter Split Review

As a **teacher**, I set pages-per-student **N** (default 1) and review the proposed split.  
**AC:**
1. Guess = consecutive N-page packets in feeder order after blank-back policy.
2. Split Review **always** shown at least once before Confirm (BATCH-06).
3. Roster “missing N” vs enrolled count is visible.
4. Confirm disabled when 0 non-blank packets.

### US-T3 — Adjust split (web keyboard + pointer)

As a **teacher**, I fix wrong packets before any capture exists.  
**AC:**
1. Can split after focused page, merge with previous, mark blank, move pages between packets.
2. Keyboard: S / M / B work when focus is in Split Review (BATCH-07).
3. Tester can separate Maya’s page from Jamal’s packet (P0 wrong-packet).
4. Changes are draft until Confirm; Cancel discards draft split + staged batch per BATCH-15.

### US-T4 — Confirm → captures → Needs/Inbox

As a **teacher**, I Confirm and work appears on existing piles.  
**AC:**
1. Each non-blank packet → one capture; multi-page assets attached; `status ≠ approved`.
2. Unnamed → Inbox / unassigned list via existing `listInbox` (or equivalent); **0** new students.
3. After teacher attaches student: 1–3 skill_gaps may draft; appear on **Needs you** / class Needs as today.
4. Unnamed packets never get gap AI (BATCH-11).
5. Nothing writes grade-book cell until Approve (BATCH-10).
6. Capture delete rules unchanged; hard-delete copy where already required.

### US-T5 — Large file / TUS / caps

As a **teacher**, large MFP PDFs upload safely with honest limits.  
**AC:**
1. >6 MB → TUS + visible progress + resume after Wi-Fi drop (within provider validity).
2. >40 MB or >80 pages → soft warn (continue allowed).
3. >250 MB or >400 pages → hard fail, human copy, 0 captures.
4. Encrypted/password PDF → named error, 0 captures.
5. Class PDF never sent to model; only page JPEGs (BATCH-12).
6. No whole-file `FileReader` requirement that kills Chromebook tabs (arch constraint for Eng).

### US-T6 — Partial failure + retry

As a **teacher**, if processing dies mid-stack I keep good work and retry the rest.  
**AC:**
1. Pages/packets completed remain as captures on Needs/Inbox.
2. Banner or batch status offers retry remainder.
3. Retry same `sha256` does not duplicate captures (BATCH-14).
4. Failed encrypted/corrupt mid-file fails batch with named error for remaining; does not invent empty captures.

### US-T7 — Phone path

As a **teacher** on **phone**, I understand batch is computer-primary.  
**AC:**
1. Entry exists: status of in-flight batches and/or CTA “Upload stack — use a computer for split” (designer microcopy).
2. No UI claiming “watching Downloads” or background hot folder.
3. Optional: Share/upload **single** PDF into pipeline if TUS works; if Split Review impractical on device, deep-link/status tells them to finish on computer.
4. Camera single-student capture unchanged.

### US-T8 — Dual-hat and other seats

As a **non-teacher seat**, I cannot ingest class stacks.  
**AC:**
1. Parent seat: no Upload stack.
2. Student: no Upload stack.
3. Office/super: no Upload stack.
4. Teacher-who-is-parent: only Teach seat shows ingest; switching to Parent removes it.
5. RLS: other hats cannot read teacher’s ingest_batches (BATCH-21).

### US-T9 — Multi-class teacher

As a **teacher with multiple classes**, I bind the correct class before upload.  
**AC:**
1. Class picker required if active class ambiguous or teacher switches mid-flow.
2. Batch stores one `class_id`; Needs land on that class only.
3. Warning if packet count wildly exceeds roster size (exact threshold Eng/QAS; must not auto-create students).

### US-T10 — Multiple files reorder

As a **teacher**, I drop several PDFs from the MFP and order them.  
**AC:**
1. Reorder UI before split finalizes.
2. Default order filename/mtime with warning if clocks look shuffled.
3. One Confirm still one batch / one class.

### US-X — Cancel

As a **teacher**, I can abandon before Confirm without littering captures.  
**AC:**
1. Cancel pre-Confirm → no captures; staged pages TTL-cleaned.
2. Post-Confirm cancel-of-batch is not a separate verb required; delete per capture.
3. Closing tab mid-TUS does not create partial captures; resume or restart.

### US-S / US-P / US-O — Non-teacher negative

**AC:** Automated/role checks: no stack entry points; API rejects non-teacher create batch.

### US-SAFE — Wrong packet is P0

As a **teacher**, I can prevent Maya’s work filing under Jamal.  
**AC:**
1. Split Review can isolate pages before Confirm.
2. No silent auto-file by OCR name in v1.
3. After Confirm, wrong name only via teacher Inbox mistake — same as today; batch does not add a new silent path.

---

## 7. Size, AI, and architecture constraints (product-facing)

These bind Eng after dual stamp; full schema is Architect’s after stamp.

| Topic | Product constraint |
|---|---|
| Upload | TUS > 6 MB; progress; resume |
| Caps | Soft 40 MB / 80 pages; hard 250 MB / 400 pages; single image 15 MB hard when would break model inline |
| Rasterize | Server worker streaming page-at-a-time; not Edge whole-PDF; thumbs ~400 long-edge; AI JPEG long-edge 1600–2048 |
| Model | Paid only; per packet/page images; never class PDF |
| Gaps | Only after `student_id` set |
| Approve | Human only |
| Idempotency | sha256 of original |
| Data (hint) | `ingest_batches`, `ingest_pages`, `captures.ingest_batch_id` nullable — Architect finalizes |
| Security | Untrusted PDF; no eval; page/day cap (Architect picks number; research ~2000 pages/day suggestion); class-stack = high PII |
| Platforms v1 | Chrome Chromebook, Chrome/Safari macOS, Edge Windows primary; phone entry/status; Firefox best-effort |

---

## 8. Binding chrome (from designer pack)

**Source:** `notes/company/batch-ingest-options.md` (designer `t_62f56547`).  
**Card:** `t_0d68de74` — chrome pick only. **BATCH-01–22 safety laws not reopened.**  
**Hot folder / Drive:** still **v2+** (BATCH-17). **NAME** stays Inbox-only.

### 8.1 Chosen option IDs (binding)

| Area | ID | Lock |
|---|---|---|
| **Chrome entry** | **CE-A** | Capture overflow / Capture stack mode primary: **Upload class stack** after class bound. Quiet secondary: Needs empty-state link **Upload a class stack** → same binder. **No** sixth tray tab. **No** filled Home Photograph work. Teach seat only. |
| **Split Review** | **SR-A** | Web/tablet: filmstrip left + packet stacks right (Gradescope-ish). Shared SR chrome from pack §2B (header, N, blank-backs, roster count check-off, Confirm). |
| **Phone Split** | **SR-A + phone gate** | Phone is **not** primary Split Review (P9 / BATCH-16). Gate/status: **Open Kelyra on a computer to split this scan.** Optional single-PDF TUS start then **Waiting to split on computer**. No full filmstrip happy path on 4″. No SR-B phone N=1 edit in v1. |
| **Progress** | **PR-A** (+ chip) | Heavy progress on batch / Split Review surface. Optional **one** dismissible batch chip under header while this teacher has an active batch. **No** permanent global banner (reject PR-B as default). **No** Needs synthetic progress rows for TUS bytes (reject PR-C for upload stage). Needs badge still grows as drafts arrive. |
| **Name assign** | **NA-A** | **Inbox / Needs only** after Confirm. Split Review = packet boundaries + roster **count** check-off only — **no** per-packet Assign, **no** feeder-order paint (reject NA-B / NA-C for v1). Unnamed → `student_id` null → Inbox; gaps only after attach. |

### 8.2 Explicitly rejected as v1 chrome defaults

| Rejected | Why |
|---|---|
| CE-B alone | Capture drop of multi-page PDF would orphan teachers who think “scan = Capture”; CE-A already owns Files + drop. |
| CE-C always-on dual header chrome | Dual maintenance; CE-A + quiet Needs empty link is enough findability. |
| SR-B as web primary | Slower bulk fix on real MFP stacks; web is primary work surface. |
| SR-C Accept-all / text-only confirm | False confidence; thumbs required at least once (BATCH-06). |
| PR-B permanent banner | Fights Superintendent-clean teacher chrome; chip optional only. |
| PR-C Needs progress rows for bytes | Confuses “work to Approve” with job status during large TUS. |
| NA-B / NA-C | Forks matcher; NA-C looks like auto-file; NAME already law = Inbox only. |
| Sixth tray tab; phone primary Split Review; hot folder Settings; “watching Downloads” | Pack + BATCH non-goals. |

### 8.3 Wire / a11y (adopt pack, do not redesign)

- Wire copy atoms: pack §5 (Upload class stack, Split review, Confirm split, phone gate, size/encrypted errors).  
- Keyboard: pack §3.1 verbs stay (S / M / B + arrows; BATCH-07).  
- A11y: BATCH-20 + pack §3 (live regions, alt on thumbs, keyboard Move-to-packet equivalent for drag).  
- Hats walls: pack §3.4 ≡ §3 this lock.  
- Tokens: `useTheme()`; new glyphs only via `npm run icons` if Eng needs one — prefer text/overflow first.

### 8.4 Stamp / Eng note

Dual DESIGN STAMP (PM+QAS) already **MET** on parent path before this chrome card. This amend **does not** re-stamp and **does not** staff Eng. Architect continues on safety + data shape; Eng after architect with these chrome IDs binding.

---

## 9. Explicit non-goals (v1)

- Hot folder / local directory watch (any OS)
- Google Drive / OneDrive watch or OAuth ingest
- Email ingest / MFP scan-to-email address
- QR / printed coversheet pipeline
- Header name OCR / face match (L8)
- Auto-name silent file
- Auto-Approve / auto-publish grades
- Invent or SIS-sync students
- Student or parent upload of class stacks
- Variable-length AI clustering as sole split
- Replacing phone camera capture
- iOS background Downloads watcher
- Edge-function rasterize of entire 200 MB PDF
- Second “Needs” product object
- Training on student work / free-tier models

---

## 10. DITL note

**Teacher capture path changes:** **Yes** — additive path (web Upload stack + Split Review + batch-sourced captures into Inbox/Needs). Single-photo + spoken-name path remains.  
**QAS owns DITL IMPACT** (likely **UPDATE**, not NONE). CoS files `DITL-UPDATE:` if process requires. PM does not author DITL plans here.

---

## 11. Quality goals (PM-owned)

1. **Hat walls:** only Teach-seat teachers ingest; all other hats blocked in chrome + API.
2. **Lifecycle complete:** start → change files → cancel pre-confirm → confirm → partial fail/retry → Inbox file name → Needs draft → Approve/delete.
3. **Multiplicity:** one class per batch; multi-file reorder; multi-class teacher must choose; parallel batches do not merge; twins not surname-merged.
4. **P0 identity:** wrong packet preventable in Split Review; zero silent roster inserts; zero auto-Approve.
5. **Size honesty:** TUS, soft/hard caps, encrypted named error; never whole PDF to model.
6. **Desk integrity:** results land on existing Inbox/Needs; no third pile; camera path intact.
7. **v1 scope honesty:** hot folder/Drive/OCR explicitly out; phone not primary Split Review.
8. **A11y:** keyboard Split Review; non-color-only state; alt text on thumbs.
9. **FERPA:** paid AI; teacher owns batch RLS; class-stack treated as high-sensitivity.

---

## 12. Relation to mvp.md

| Item | PM statement |
|---|---|
| L4 Multi-student packet split | **Partial pull-forward** for BATCH-v1 (fixed-N + human Split Review). Full L4 variable/coversheet remains later. |
| L8 OCR name | **Still later.** Not in v1. |
| M2/M4/M6/M10 | **Honored.** Batch additive; Inbox; Approve gate; phone capture / web review pattern extended to web upload. |
| Camera loop ship | **Still ships without batch.** Batch is not a gate on core MVP loop. |

---

## 13. Open for QA Supervisor

PM believes intent coverage is stampable. QAS may still REJECT for gaps such as:
- Exact dual-hat chrome inventory
- TTL durations / resume window copy
- Threshold for “packet count ≫ roster” warn
- Whether tablet Split Review is required vs web-only
- DITL IMPACT wording

PM will amend stories if QAS lists must-include gaps. **This file does not stamp for QAS.**

---

## 14. Staffing / next action

1. **Done (prior):** PM lock + PM APPROVED stamp; QAS dual path; designer pack.  
2. **Done (this card `t_0d68de74`):** Chrome IDs locked §8 — **CE-A · SR-A (+ phone gate) · PR-A (+ chip) · NA-A**.  
3. **In flight:** Architect (`t_fb2e7d9a` or successor) — data/safety shape with chrome IDs binding.  
4. **After architect:** CoS staffs Eng / `kelyra-qa-loop`. **This card does not staff Eng.**  
5. **After implement:** QAS prove-out → qa-engineer (CoS staffs).

---

## 15. Handoff fields

| Field | Value |
|---|---|
| OBJECTIVE | IQG PM lock BATCH-v1 + chrome pick |
| RESULT | Laws BATCH-01–22; chrome **CE-A · SR-A · PR-A · NA-A** in §8 |
| HOT FOLDER IN V1? | **No** |
| BATCH-v1 IN? | **Yes** (CEO slice; L4 subset) |
| DESIGNER PACK | Present; chrome locked `t_0d68de74` |
| ESCALATION | None |
| RECOMMENDED NEXT | Architect continues; Eng after architect |

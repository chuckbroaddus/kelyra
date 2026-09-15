# BATCH-v1 IQG — Real-world intent (class-stack ingest)

**Date:** 2026-09-12  
**Author:** qa-supervisor (Kelyra)  
**Card:** `t_e746caff` · Process: `notes/company/INTENT_QUALITY_GATE.md`  
**Parallel PM:** `notes/company/batch-ingest-pm-lock.md` — **absent at stamp time** (PM card staffed; lock pending)  
**Parallel UX:** `notes/company/batch-ingest-options.md` — **absent at stamp time** (designer staffed; pack pending)  
**CoS input only (not a stamp):** `notes/company/batch-ingest-cos-brief.md`  
**Research SoT:** `notes/research/worksheet-ai-platform/06_batch_ingest_folder_watch.md`, `07_large_files_streaming.md`  
**Product SoT:** `docs/mvp.md` (L4/L8 later; CEO-requested slice), `docs/vision.md`, `docs/data-model.md`, `docs/ui-design.md` §13.3 Needs  
**Status:** Design-stage IQG intent. **QA Supervisor DESIGN STAMP: APPROVED.** Dual stamp **incomplete** until PM APPROVED. **Not** Build. **Not** prove-out. **Not** Eng. No app code.

**Role:** Own real-world intent. Do **not** pick UI option IDs. Do **not** invent chrome glyphs or tray tabs. Stamp APPROVED only if CoS option space + product laws can cover full intent without hidden dead-ends. If PM lock later contradicts this file → restamp REJECT or amend.

**SoT read:** INTENT_QUALITY_GATE.md · DITL_OS.md · CoS brief P1–P10 · research 06/07 · DITL-T-01 / T-02 / DH-01 · mvp capture→Inbox→Approve laws.

---

## DESIGN STAMP

```
DESIGN STAMP
Feature/bug: BATCH-v1 class-stack ingest → Split Review → captures → Needs drafts (web primary)
Quality goals: teacher-only Teach seat; class bound before match; Split Review required; never invent student; never auto-Approve; never class-PDF-to-model; TUS+caps; reuse Inbox/Needs; phone entry/status not fake folder-watch; full lifecycle cancel/confirm/retry; multiplicity classes/twins/2+PDFs; hot-folder/Drive/QR/OCR = non-goals v1
PM: UNSTAMPED  date: —  profile-session: pending notes/company/batch-ingest-pm-lock.md
QA Supervisor: APPROVED  date: 2026-09-12  profile-session: t_e746caff / qa-supervisor · notes/company/batch-ingest-intent.md
Intent gaps remaining: none (QAS real-world intent). Dual stamp blocked on PM lock + stories. Designer pack preferred before Eng chrome implement — not blocking this QAS intent stamp (option shapes named below; no invented chrome).
```

**QA Supervisor stamp meaning:** Real-world intent fully specified for BATCH-v1 (not happy-path only). CoS P1–P10 accepted as **v1 product laws** below with QAS sharpening (always Split Review; gap AI only after student attached; variable length via manual split only). Does **not** authorize Engineering. Eng stays dark until **PM + QAS** both APPROVED. Prove-out later vs this stamp + PM lock.

**PM alignment rule:** When `batch-ingest-pm-lock.md` lands, QAS must re-read. If PM pulls hot folder/Drive/QR/header-OCR into v1, or skips Split Review, or allows Parent/Student ingest, or auto-Approves → **REJECT** restamp until gaps closed. If PM lock matches laws here → no restamp needed; dual stamp met.

---

## 0. One-line law

| Surface | Job | Not |
|---|---|---|
| **BATCH-v1 stack ingest** | Teacher brings MFP/class PDF(s) into Kelyra web, binds **one class**, confirms packet split, each packet → normal **capture** | Hot-folder daemon; Drive watch; student/parent upload; whole-PDF to model |
| **Split Review** | Human-confirmed packet boundaries before any capture insert | Silent fixed-N file; skip-review “save clicks”; phone 4″ primary splitter |
| **Captures / Inbox / Needs** | Unnamed → Inbox; named → existing understand → **Needs you** drafts | New “needs” noun; auto-Approve; matcher INSERT student |
| **Approve** | Unchanged teacher gate; nothing is a grade until Approve | Worker Approve; batch Confirm = Approve |
| **Phone** | Entry + status + “open on computer”; optional single-file share if TUS works | Background folder watch; primary Split Review on phone |

---

## 1. Hats — who uses this (must-include)

### 1.1 Teacher (primary)

| Intent | Must | Notes |
|---|---|---|
| Upload class stack PDF(s)/images on **web** (Chromebook/Mac/Windows) | Yes | BATCH-v1 primary path |
| Bind **exactly one class** before match / confirm | Yes | No default “all my classes” mash |
| Optional bind assignment/column | Yes | Null OK; column later via desk |
| Set pages-per-student N (default 1) | Yes | Fixed-N **guess** only |
| See Split Review before any capture insert | Yes | **Required every batch in v1** (even if counts match) |
| Split / merge / mark blank; keyboard on web | Yes | S / M / B or equivalent accessible controls |
| Confirm → packets become captures | Yes | Multi-page capture per packet |
| Unnamed packets → Inbox (no gaps AI) | Yes | Same as single capture unassigned |
| Manual name assign (v1: Inbox path preferred) | Yes | No silent header OCR in v1 |
| Named → existing understand → Needs drafts | Yes | status ≠ approved |
| Approve drafts as today (web and any existing phone Approve path) | Yes | Confirm split ≠ Approve |
| Multi-class teacher: pick class first | Yes | Switch class mid-batch forbidden without cancel |
| See progress (bytes then pages) and partial Needs | Yes | First packets may land before whole stack AI done |
| Cancel before Confirm | Yes | Staged pages deleted / TTL |
| Retry remainder after partial fail without duplicate captures | Yes | sha256 idempotency |

### 1.2 Teacher + parent dual-hat

| Intent | Must | Notes |
|---|---|---|
| Stack ingest only on **Teach seat** | Yes | Parent seat: **no** Upload stack chrome |
| Seat switch mid Split Review | Yes | Dirty → discard/confirm; no Parent-seat residual batch UI |
| Parent seat sees family progress only | Yes | Never class-stack PII tools |
| Teach seat does not merge Parent tray | Yes | Same dual-hat law as Capture/Needs |

### 1.3 Parent (non-teacher)

| Intent | Must |
|---|---|
| Upload / split / watch class stacks | **No** |
| See Needs drafts / Inbox of class | **No** |
| See child’s post-Approve work only (unchanged) | Yes — existing family surfaces |

### 1.4 Student

| Intent | Must |
|---|---|
| Upload classmates’ stacks or own multi-student PDF | **No** |
| Trigger Needs for others | **No** |
| Own student surfaces unchanged | Yes |

### 1.5 Office / superintendent

| Intent | Must |
|---|---|
| Class-stack ingest chrome | **No (v1)** |
| Impersonate teacher batch | **No** |
| School-wide scan firehose | **No** |

### 1.6 Substitute / co-teacher

| Intent | Must | Notes |
|---|---|---|
| Ingest if `class_teacher_of` (or product-equivalent teach grant) for that class | Yes | Else denied — no orphan batches |
| Bind wrong class | Blocked by class picker + RLS | Wrong-class confirm is teacher error we catch via roster missing count, not auto-fix |

### 1.7 Signed-out / foreign school

| Intent | Must |
|---|---|
| Ingest API / UI | **None** — auth + RLS only |

---

## 2. Entry chrome (per hat) — no hidden dead-end

**Law:** Every hat that **must** use BATCH has a **named chrome path**. Hats that must **not** use it have **zero** entry (not disabled mystery buttons). Dual-hat follows **active seat**. Do **not** invent View-stroke glyphs or a 6th tray tab on this card.

| Hat | Must-have entry | Allowed option shapes (designer/PM pick) | Forbidden |
|---|---|---|---|
| **Teacher web** | Reach “Upload stack” (or equivalent noun) from class-scoped work without leaving product | **E-A** Capture overflow / Capture tab action; **E-B** Needs empty-state + Needs header action; **E-C** both Capture and Needs; optional class page affordance | RPC-only; buried unmarked overflow with no mirror; third desk parallel to Needs; filled Home “Photograph work” clone clutter |
| **Teacher phone** | Visible entry that does **not** fake desktop Split Review | **P-A** gate copy “Upload stack — open on computer for split” + deep link/status; **P-B** optional single-PDF share/upload if TUS works, then “Continue split on computer”; **P-C** status-only chip for in-flight batch | “Watching Downloads…”; iOS background hot folder; primary filmstrip Split Review as the only path |
| **Dual-hat Parent seat** | **No** stack entry | — | Convenience entry “because they teach” |
| **Parent / Student / Office / Super** | **No** stack entry | — | Hidden lab URL |

**Deep links (must work regardless of E-* pick):**
- Incomplete batch → resume Split Review (owner teacher only)
- Needs/Inbox rows from batch carry batch provenance (support) without new desk
- Phone status → open web resume URL

**Entry acceptance:** Teacher on web opens stack upload in ≤2 deliberate taps from class-scoped chrome with **class pre-bound or explicitly choosable before file accept**. Teacher on phone finds honest entry (not a dead feature). Non-teacher seats: zero discovery of ingest.

**Chrome invent ban:** If designer pack never lands and Eng would need new tray icons, CoS restaffs designer before Eng chrome slice — QAS does not draw icons.

---

## 3. Full lifecycle (start → change → finish)

### 3.1 Start (create batch)

```
Teach seat + class context
  → Upload stack entry (E-*)
  → Bind class (required) + optional assignment + pages-per-student N (default 1)
  → Select/drop PDF(s) and/or images
  → Size gate (soft warn / hard fail) → TUS if > 6 MB
  → status: receiving → rasterizing (server) → split_review
```

**Must:** Cannot start match/confirm without class. Cannot start without ≥1 accepted file. Encrypted/corrupt PDF → named error, 0 captures. Progress: bytes then page rasterize counts.

### 3.2 Change (pre-confirm)

- Add/remove files before rasterize completes (or restart batch) — product may freeze file set after receiving starts; if frozen, **Cancel + new batch** is the change path (must be obvious).
- Reorder multiple PDFs before split guess.
- Change N → recompute **guess** only; teacher still reviews.
- Mark blank / split / merge / drag pages between packets in Split Review.
- Roster check-off: missing vs class roster (informational; does not invent students).

### 3.3 Finish (confirm split → processing → Needs)

```
Split Review
  → Confirm enabled only if ≥1 non-blank packet
  → teacher_confirmed_split = true
  → each packet → capture (multi-page) + ingest_batch_id
  → unnamed: Inbox, student_id null, **no** skill_gaps AI
  → named (manual in review if PM allows, else Inbox assign): existing understand → skill_gaps drafts → Needs you
  → status on gaps/captures remains draft until teacher Approve (existing)
```

**Must:** Confirm ≠ Approve. Worker never Approves. First packets may appear on Needs before later packets finish AI. Partial rasterize failure keeps successful pages/packets; banner to retry remainder.

### 3.4 Cancel / reverse

| Phase | Reverse | Effect |
|---|---|---|
| Selecting files / uploading | Cancel / leave with confirm if dirty | No captures; abort TUS; delete incomplete objects |
| Rasterizing / split_review pre-Confirm | Cancel batch | Delete staged pages (TTL); 0 captures |
| Post-Confirm processing | Cancel batch **not** silent delete of captures | Captures already created follow **normal capture delete** rules one-by-one or bulk-delete-if-product-has-it |
| Needs drafts exist | Existing reject/edit/Approve paths | Unchanged |
| Wrong split discovered after Confirm | Delete bad captures; optional “re-split remainder” later (v1 may be manual re-upload) | No silent refile to another student |

### 3.5 Retry / idempotency

- Same `original_sha256` (+ teacher + class policy) must **not** duplicate captures on retry.
- Page/packet jobs idempotent where AI already succeeded.
- Wi-Fi drop mid-TUS → resume, not second full object without user intent.

### 3.6 Finish success criteria (teacher job done)

25×1 exit tickets, one PDF, N=1: teacher time << 25 phone photos; **zero** silent roster inserts; **zero** Approves without a teacher tap; Wrong packet (Maya↔Jamal) is correctable in Split Review **before** Confirm.

---

## 4. Multiplicity

| Scenario | Must-include behavior |
|---|---|
| Teacher teaches 5 classes | Class picker **before** upload/confirm; batch owns one `class_id` |
| Two periods in one physical stack | Teacher error: roster missing high; copy steers rescan/split by class — **do not** auto-partition by period |
| Twins / same last name | Manual name only; never merge packets by last name; never auto-pick twin |
| Two+ PDFs one batch | Concat in explicit order; reorder UI before split; warn if mtimes look shuffled |
| Variable pages (show-your-work) | Fixed-N guess may be wrong; teacher uses split/merge to true packets; **coversheet/QR/variable auto = v2+** |
| Extra blanks / double-feeds | Mark blank; ignore blank backs toggle default ON (duplex) |
| Packet count ≠ roster ± 0 | Still Confirm allowed if ≥1 packet; surface “missing N” — do not block forever |
| 0 packets (all blank) | Confirm **disabled** |
| One packet two students (stapled wrong) | Teacher must split; if they Confirm wrong → capture delete + re-ingest (P0 if product auto-filed names — v1 avoids auto-file) |
| Multi-device | Batch owned by creating teacher; no shared edit of Split Review v1 unless PM explicitly adds |
| Co-teacher | Only teachers with class grant see/act; no student visibility of batch |

---

## 5. Size, streaming, AI safety (P0 laws)

| Law | Binding |
|---|---|
| **Never send the class PDF to a model** | ADR-016 / research 07 — page JPEG(s) per understand only |
| **TUS** for upload **> 6 MB** | Resume after drop |
| Soft warn | > ~40 MB or > ~80 pages (copy, not stack trace) |
| Hard fail | > ~250 MB or > ~400 pages — “split the stack on the MFP” |
| Rasterize | **Server worker**, page-at-a-time; **not** Edge Function whole-file; not Safari inflate |
| AI unit | One page default or one packet ≤4 pages; paid tier only |
| Unnamed packets | **No** gap AI until student attached (no invent gap-on-unassigned) |
| Encrypted PDF | Named error; 0 captures |
| Concurrency / day cap | Tenant-safe; misfire cannot unbounded-bill |

---

## 6. Explicit non-goals (BATCH-v1)

Documented so “not built” ≠ “done incomplete”:

1. Hot folder / Mac·Windows ingest agent  
2. Google Drive / OneDrive watch  
3. iOS/Android background arbitrary-folder watch  
4. Email ingest (`scan+class@`)  
5. QR / printed coversheet auto-split (S0)  
6. Header name OCR assist (L8) — even as guess  
7. Auto-name / silent high-confidence file skip Inbox  
8. Auto-Approve / worker grade publish  
9. Student or parent stack upload  
10. Office/super stack tools  
11. SIS roster sync from scan  
12. Handwriting clustering split (S6)  
13. MFP vendor APIs (Papercut, etc.)  
14. Split Review as phone-primary UX  
15. New product noun replacing Needs/Inbox  
16. Gemini/Claude free tier for student work  
17. Full Disk Access agent  

CEO still wants folder watch / large-file safety — **folder watch = v2+ intent surface** (separate IQG when pulled). Large-file safety **is** in v1 (this file §5).

---

## 7. CoS P1–P10 — QAS disposition (not rubber-stamp)

| ID | CoS lock | QAS |
|---|---|---|
| P1 | Teacher-only; dual-hat Teach seat | **Accept** |
| P2 | Reuse captures + skill_gaps + Inbox/Needs | **Accept** |
| P3 | Never invent student; never auto-Approve | **Accept** — P0 if violated |
| P4 | v1 = web upload + Split Review + fixed-N + TUS + rasterize | **Accept** as v1 scope |
| P5 | Hot folder / Drive / iOS daemon / QR / header OCR = v2+ | **Accept** as non-goals; do not smuggle into “MVP done” |
| P6 | Wrong packet P0; Split Review when count ≠ expected | **Sharpen:** Split Review **always** at least once per batch in v1 |
| P7 | Never class PDF to model | **Accept** — P0 |
| P8 | Paid AI only | **Accept** |
| P9 | Phone status + open on computer; not primary Split Review | **Accept** + must-have honest phone entry (§2) |
| P10 | One class bound before match | **Accept** — P0 if multi-class silent match |

**QAS rejects if PM later:** skips Split Review by default; gap AI on unnamed; Parent ingest; whole-PDF model path; ships iPhone “watching folder” copy.

---

## 8. Intent gaps remaining

**QAS real-world intent gaps: none** for BATCH-v1 scope defined here.

**Process gaps (do not block this QAS stamp; block Eng):**

| Gap | Owner | Effect |
|---|---|---|
| PM lock + stories + PM stamp line absent | product-manager | Dual stamp incomplete; Eng forbidden |
| Designer option pack absent | ui-ux-designer | Chrome implement slice waits for pack or PM-written option IDs; QAS did not invent chrome |
| Architect worker/TUS/SQL shape | software-architect after dual stamp | — |
| Prove-out test plan | qa-engineer after implement | QAS writes OBJECTIVE then |

---

## 9. DITL IMPACT

```
DITL IMPACT
Change: BATCH-v1 teacher class-stack upload → Split Review → captures → Inbox/Needs (new capture source; web-primary)
Verdict: UPDATE_PLANS
Plans touched: DITL-T-01 (capture morning — add alternate stack path / phone entry honesty); DITL-T-02 (Needs/Approve consumes batch-origin captures); DITL-DH-01 (Teach vs Parent seat — no stack on Parent)
Cases touched: corresponding T-01 / T-02 / DH-01 cases when plans rewrite (CoS files DITL-UPDATE; QE writes cases after Chuck unblocks)
New DITL needed: no (fold into T-01/T-02; optional later NEW afternoon MFP day if Chuck wants dedicated shape — not required to start)
Seed/artifacts: new F-ARTIFACTS synthetic batch PDFs (25×1, duplex blanks, two-PDF, encrypted, oversized) under notes/qa-fixtures/batch-ingest/ — no real student names; seed-school map when plans update
Notes: User-visible teacher capture path changes. NOT NONE. CoS must file sticky DITL-UPDATE: tracker (do not wait for implement). Parent/Student/Office DITL plans unchanged (explicit non-entry). Verdict is design-stage; re-eval at prove-out vs shipped chrome.
```

---

## 10. Acceptance evidence (this card)

- [x] Intent file `notes/company/batch-ingest-intent.md`  
- [x] Hats + dual-hat + parent/student/office  
- [x] Chrome entry option shapes (no invented glyphs)  
- [x] Full lifecycle start/change/finish/cancel/retry  
- [x] Multiplicity classes/twins/2+PDFs/variable-via-manual  
- [x] Reverse/cancel table  
- [x] Explicit non-goals  
- [x] Size/AI P0 laws  
- [x] DESIGN STAMP QA Supervisor APPROVED  
- [x] DITL IMPACT block  
- [ ] PM dual stamp (pending lock)  
- [ ] Designer pack (pending; not required for this intent completeness stamp)

---

## 11. Recommended next action

1. **PM** lands `batch-ingest-pm-lock.md` with stories/AC + PM stamp; must not contradict §0–§7.  
2. **Designer** lands `batch-ingest-options.md`; PM picks E-*/Split layout/name-assign.  
3. When **dual APPROVED**, CoS staffs `software-architect` then Eng / `kelyra-qa-loop` per slices I0–I6 (CoS brief §8).  
4. CoS files sticky **`DITL-UPDATE:`** from §9 (UPDATE_PLANS).  
5. After implement terminal: **this profile** writes prove-out OBJECTIVE → CoS staffs `qa-engineer` (not on this card).  
6. Security review before production (class-stack PII) — CoS staffs; not this card.

**Eng forbidden** until PM stamp + this QAS stamp both APPROVED on parent/tracker.

---

*End BATCH-v1 IQG intent — QA Supervisor DESIGN STAMP APPROVED 2026-09-12 (`t_e746caff`). Dual stamp pending PM. No app code. No prove-out plan on this card.*

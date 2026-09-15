# DEFECT disposition — t_90708677 no file input after Upload class stack

**Card:** t_90708677
**Date:** 2026-09-14
**Profile:** product-manager
**Feature:** BATCH-v1 (IQG-BATCH)
**PM task:** t_6054171e (primary); confirmed t_835087c5 (duplicate disposition card)

---

## Verdict

| Field | Value |
|---|---|
| **SEVERITY** | **P2 filed → reclass NOT A BUG** (false positive / incomplete EXEC) |
| **DISPOSITION** | **WONTFIX / not-a-bug** |
| **Stamp conflict?** | No — stamp does **not** require a permanent `input[type=file]` |
| **CEO escalate?** | No |
| **Engineering?** | **No** |

---

## Why WONTFIX / not-a-bug

1. **Product path is binder-first, not instant file input.**
   `capture.tsx` `setStackOpen(true)` opens `ClassStackBinder`. That is the correct CE-A entry after "Upload class stack". A successful button click that leaves **0** permanent file inputs is **expected**, not a miss.

2. **File input is ephemeral by design.**
   `ClassStackBinder.tsx` `openFilePicker` (~312): `document.createElement('input')`, `type=file`, `multiple`, accept PDF/images, then `el.click()`. The node is **not** mounted as durable React DOM. QE cannot CDP `setFiles` on a permanent selector until **Choose files** runs (and even then the element is transient).

3. **Class bind gates Choose files.**
   Choose files is `disabled={busy || !classId}`. Dropzone also no-ops without `classId`. QE must: open binder → select class chip → **Choose files** (or drop) → attach fixture → start upload. Skipping bind/Choose files and asserting file input after only the entry button is incomplete EXEC.

4. **Missing B-CE-A-01 / B-SR-A-01 ids is not this defect.**
   Already **WONTFIX / not-a-bug** on empty Capture (`t_bc4caccc` / `t_3069eb63`). Ids are **post** upload→progress→SR-A→Confirm evidence, not pre-upload chrome fixtures. Absence after binder-open only is correct.

5. **Stamp does not require a stable file input.**
   BATCH CE-A chrome = binder + class bind + Choose files / drop + upload progress → SR-A. No PM lock / release / designer pack row mandates a always-present hidden `<input type=file>` for CDP convenience. FIX-NOW for a permanent input would be **test harness ergonomics**, not stamped product intent.

6. **Fail would be different.**
   After bind + Choose files + valid PDF + upload + rasterize + Confirm: no batch id, no Inbox captures with `input_source=batch` / null student, or binder never opens — those are real defects. "Click Upload class stack → no permanent file input" is not.

**Related QE guidance already written:** `notes/company/batch-ingest-qe-binder-handoff.md` — drive binder + Choose files; 0 inputs until Choose files is expected.

---

## Case map

| Case | Expected | Pass when |
|---|---|---|
| Click Upload class stack | Binder FormSheet opens; **0** durable file inputs | Binder visible; entry button path OK |
| Bind class | Class chip selected; Choose files enabled | `classId` set |
| Choose files | Ephemeral `input[type=file]` created + click | Picker / CDP attach path |
| Dropzone | Files via drag-drop without durable input | Optional alternate |
| B-CE-A-01 | Batch id **after** upload→progress→SR-A | Live UUID post-flow |
| B-SR-A-01 | Capture ids **after** Confirm | null student; ≠approved; input_source=batch |
| This DEFECT claim | Permanent file input right after entry click | **Invalid expectation** → WONTFIX |

---

## Binding refs

- `src/app/capture.tsx` — `setStackOpen(true)` → `ClassStackBinder`
- `src/components/ingest/ClassStackBinder.tsx` — `openFilePicker` createElement; Choose files gated on `classId`
- `batch-ingest-iqg-release.md` §3 B-CE-A-01 / B-SR-A-01
- `batch-ingest-pm-lock.md` CE-A / BATCH-01
- Prior empty-ids WONTFIX: `batch-ingest-defect-bc4-disposition.md` (t_bc4caccc / t_3069eb63)
- QE binder path: `batch-ingest-qe-binder-handoff.md`
- Filed from live: t_4d14175b → t_90708677; this PM: t_6054171e

---

## Recommended next action (CoS)

1. Accept **WONTFIX / not-a-bug** on t_90708677. **Do not staff Engineering.**
2. QE prove-out: **must** drive ClassStackBinder → bind class → **Choose files** (or drop) → CDP/setFiles on the ephemeral picker path / equivalent → upload → rasterize → Confirm → then assert B-CE-A-01 / B-SR-A-01.
3. Do **not** re-file "no file input after Upload class stack click" as product DEFECT.
4. Do **not** open FIX-NOW for a permanent hidden file input unless a future stamp explicitly requires test hooks (out of scope today).
5. Keep B-CE-A-01 / B-SR-A-01 as prove-out EXEC work, not Eng from this card.

---

## Handoff

- **RESULT:** SEVERITY reclass not-a-bug; DISPOSITION **WONTFIX**.
- **FILES:** `notes/company/batch-ingest-defect-907-disposition.md`
- **ESCALATION:** No.
- **QE MUST:** binder + class bind + Choose files (ephemeral input) before CDP setFiles; ids only after Confirm.
- **NEXT:** CoS — no Eng; continue prove-out EXEC per binder handoff.

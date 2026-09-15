# DEFECT disposition — t_6c04a335 pdfinfo stderr to teacher

**Card:** t_6c04a335
**Date:** 2026-09-14
**Profile:** product-manager
**Feature:** BATCH-v1 (IQG-BATCH)
**PM task:** t_1435db17

---

## Verdict

| Field | Value |
|---|---|
| **SEVERITY** | **P2** (confirmed) |
| **DISPOSITION** | **FIX-NOW** |
| **Stamp conflict?** | Yes — corrupt PDF must show **named** teacher copy, not tool stderr |
| **CEO escalate?** | No (not P0/legal/spend); CEO live is context only |
| **Engineering?** | **Yes** — CoS ARM + staff eng/qa-loop child of defect |

---

## Why P2 (not P1 / not P3)

1. **Primary hat path still works** for good stacks (upload → rasterize → SR-A → Confirm → Inbox). Corrupt/unreadable file is a secondary failure branch.
2. **Workaround exists:** teacher re-scans / re-uploads a valid PDF.
3. **Not polish:** teacher-visible internal `pdfinfo` command text violates stamped **named error** copy — above P3.
4. **Not P1:** does not remove a primary lifecycle step for valid stacks; does not block dual-hat chrome.

---

## Why FIX-NOW (not SCHEDULE)

IQG default for P2 is SCHEDULE; override reason:

1. **Stamp language is explicit.** `batch-ingest-intent.md`: encrypted/corrupt PDF → **named error**, 0 captures. Named atoms already exist: `INGEST_COPY.corruptPdf` / `ERROR_COPY.corrupt_pdf` = "File unreadable. Re-scan and upload again."
2. **CEO live** saw `Command failed: pdfinfo … Couldn't find trailer` in teacher UI — product surface, not log-only.
3. **Root cause is localized and known** (no design/option pack needed):
   - `workers/ingest-rasterize/src/pdf.ts` `probePdf` catch: `throw new RasterizeError('corrupt_pdf', msg)` with exec `Error.message` (includes stderr).
   - Same pattern on `renderPageToJpegFile` catch.
   - `rasterize.ts` `failBatch(..., err.message)` persists that string as `error_message`.
   - Client `ingestGapCopy(code, errorMessage)` **prefers** non-empty `error_message` over code → named copy never wins.
4. **Small, binding fix** unblocks teacher trust on bad-file path without waiting for camera/parent/phone beats.

---

## Case map / AC for Engineering (binding)

| Case | Expected teacher copy | Fail if |
|---|---|---|
| Corrupt / truncated PDF (`pdfinfo` trailer miss, etc.) | **File unreadable. Re-scan and upload again.** | Any `Command failed:`, `pdfinfo`, `pdftoppm`, path, or poppler stderr |
| Encrypted PDF | Password/encrypted named copy (unchanged) | Raw tool text |
| Missing page count after probe | Same corrupt named copy | Internal "Could not read page count" only if product wants it — prefer named corrupt atom |
| Partial fail with `error_code=corrupt_pdf` | Gap banner uses named corrupt copy | `error_message` overrides with tool dump |
| Logs / worker metrics | May retain stderr server-side | Must not land in `ingest_batches.error_message` for teacher poll |

**Non-goals this card:** new error codes; redesign binder chrome; camera/parent/phone remaining prove-out beats.

---

## Binding refs

- Intent: `notes/company/batch-ingest-intent.md` — corrupt/encrypted → named error, 0 captures
- Copy SoT client: `src/lib/ingest/copy.ts` — `corruptPdf`, `ingestGapCopy`
- Copy SoT worker: `workers/ingest-rasterize/src/config.ts` — `ERROR_COPY.corrupt_pdf`
- Bug sites: `workers/ingest-rasterize/src/pdf.ts` probe/render catch detail; `rasterize.ts` failBatch message; client prefer-message path
- Defect: t_6c04a335 · PM: t_1435db17

---

## Recommended next action (CoS)

1. Accept **P2 FIX-NOW** on t_6c04a335.
2. ARM GRANT + staff Engineering via **kelyra-qa-loop** (child of defect; link BATCH feature). **No eng from this PM card.**
3. Loop request gist: stop passing exec/pdfinfo/pdftoppm Error.message into teacher-facing `RasterizeError`/`error_message` for `corrupt_pdf`; persist/use `ERROR_COPY.corrupt_pdf`; ensure UI shows named corrupt copy (worker and/or `ingestGapCopy` defense). Keep encrypted path named. No product redesign.
4. After loop terminal → brief QAS/QE smoke: bad PDF → named copy only.
5. Do **not** park as SCHEDULE while CEO-visible stamp miss is open.

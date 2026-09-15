OBJECTIVE:
FIX-NOW P2: do not show pdfinfo/poppler stderr to teachers. corrupt_pdf must use named copy (File unreadable. Re-scan and upload again.). kelyra-qa-loop. No git. No live SQL.

CONTEXT:
PM t_1435db17 FIX-NOW. DEFECT t_6c04a335. workers/ingest-rasterize/src/pdf.ts probePdf catch: RasterizeError('corrupt_pdf', msg) with exec Error.message. config.ts already has corrupt_pdf named copy. CEO saw Command failed: pdfinfo ... trailer.

REQUIREMENTS:
Map corrupt_pdf to INGEST_COPY / worker named string only. Tests for non-PDF file → no pdfinfo in error_message. Do not change BATCH laws.

CONSTRAINTS:
No git. No SQL apply. Children: no ask_user_question.

FILES/AREAS:
workers/ingest-rasterize/src/pdf.ts
workers/ingest-rasterize/src/config.ts
src/lib/ingest/copy.ts ingestGapCopy

ACCEPTANCE:
qa-loop passed 0 P0/P1; teacher-facing string has no pdfinfo/xref.

RECOMMENDED NEXT ACTION:
CoS leftover harvest.

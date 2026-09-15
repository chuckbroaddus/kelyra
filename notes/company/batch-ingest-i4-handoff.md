# BATCH-v1 I4 handoff

OBJECTIVE: Inbox + attach → understand; unnamed = no gap AI; ≤4 page JPEGs/call.

RESULT: **passed** via kelyra-qa-loop `wf_01a0a058b7197c5286a07ad7d7c82277`
- outcome: passed; 1 QA repair cycle; verify 0; security_ok true; 0 P0/P1
- Kanban: t_a069938c; request: notes/company/batch-ingest-i4-request.txt
- No git. No live SQL.

## What landed
- Inbox `mediaLabel`: batch captures show pages · stack (same WorkRow chrome)
- `MAX_HOMEWORK_PAGE_IMAGES=4` client (`src/lib/captures/pages.ts`) + Edge (`supabase/functions/_shared/homeworkPages.ts`)
- `analyze-homework`: multi-page page JPEGs from photos bucket only; student_id gate; mime refuse PDF; preserve pageAssetIds on queue/draft; callMetered only
- `storeCaptureDraft` / draftHasWork: preserve pageAssetIds; page-only draft does not count as “work” (draftWork extract)
- Tests: analyzeHomework.security.test.ts, pages.test.ts, draftHasWork.test.ts

## Acceptance
- Unnamed Inbox: no gaps / no model
- Named attach → understand → draft skill_gaps → Needs
- Never Approve from worker; never class PDF to model

## Next
I5 partial retry after I4 (separate card).

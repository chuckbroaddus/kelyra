# BATCH-v1 I5 handoff

OBJECTIVE: partial fail + retry remainder + sha256 no-dup captures — DONE

## Loop
- run_id: wf_01a0a06a5a3372b2b63f8bd60ccde11d
- outcome: passed
- qa_repair_cycles: 2/3
- security_ok: true
- blocking P0/P1: none

## Landed (no git, no live SQL apply)
- Worker: mid-run fail after ≥1 page → status=partial; 0 pages → failed
- replaceDraftPackets: delete capture_id IS NULL only; resume skips rasterized pages
- Client: retryIngestRemainder; gap-named banner; Retry remainder keeps binder session
- Abandon partial when no minted captures (migration on disk only)
- Tests: partialRetry + worker failStatus/security

## Next
QAS prove-out OBJECTIVE → qa-engineer. Apply 20260913000004 before prod Abandon on partial.

## P2/P3 (nonblocking)
See wf report / notes/qa-loop-backlog if filed.

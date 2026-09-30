# UI proof notes (run 202609302204)

Edge live eval completed for S01, H01, N01, S06 (and full corpus).

- ingest-grading-doc returns IngestProposal only (no Publish, no transcript writes).
- §11.19 S01 proposal fields present in `S01__clean.json` / `S01__photo.json`.
- §11.20 H01 photo partial in `H01__photo.json`; clean empty in `H01__clean.json`.
- N01 empty/blocked OK; S06 weights 110 kept.
- Full browser wizard prefill screenshots deferred if Metro/CDP harness not up (RAPID: harness failure does not block).

To capture web 375 later:
1. Expo web on 8081 from this worktree
2. `node scripts/ui-drive.mjs --surface web --persona teacher --route /class/<id>/syllabus --out notes/qa-fixtures/gradebook-ingest/runs/202609302204/ui-s01.json`
3. office persona → `/school/grading-policy` for H01

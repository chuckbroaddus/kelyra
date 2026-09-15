OBJECTIVE:
CEO ship: commit + push everything currently dirty on ~/projects/kelyra to origin/main (or PR then merge if you must not commit straight to main — CEO said merge commit push everything). No force-push. No env/secrets.

CONTEXT:
CEO 2026-09-14: “merge, commit and push everything we have.” CoS does not git. Repo chuckbroaddus/kelyra. Dirty includes BATCH-v1 (WorkRow nested-button, pdf.ts named corrupt_pdf, ingest, SplitReview, 000004 on disk already applied live), calendar R2/R3 files, notes/company batch-ingest + weekly, qa-loop agents.

EXCLUDE: .env, credentials, BJU, secrets. EXCLUDE notes/company/calendar-r2-phase-*-live-jwt-evidence.json (JWT evidence). Scrub any tokens in ditl jwt mjs before add; skip if they embed live JWTs.

REQUIREMENTS:
git add (safe files) → commit(s) with why → push origin main. Never force-push main. Preserve nothing that is a secret. Do not apply SQL unless a new migration still unapplied (000004 already live).

CONSTRAINTS:
No force-push. No secrets.

ACCEPTANCE:
git status clean of intended files; origin/main has the commits; report SHAs.

RECOMMENDED NEXT ACTION:
Comment parent t_50edbe72 with SHAs.

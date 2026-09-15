OBJECTIVE:
Apply supabase/migrations/20260913000004_ingest_abandon_partial.sql by filename on project aohibokgilxhqwmupdfv. Verify abandon_ingest_batch(uuid) + ingest_batches.abandoned_at. No git.

CONTEXT:
CEO: have DevOps release the SQL. CoS read-only: function abandon_ingest_batch(p_batch_id uuid) AND column abandoned_at already exist. Still apply by filename unless Management API would duplicate-fail; if already live, record skip with evidence. Do not invent. I0 00000/00001 already applied historically.

REQUIREMENTS:
python3 ~/.hermes/profiles/devops-release/scripts/apply_sql_by_filename.py supabase/migrations/20260913000004_ingest_abandon_partial.sql
Read-back: function exists; grant execute to authenticated.
No db push. No other migrations.

CONSTRAINTS:
No merge. No secrets in comments.

ACCEPTANCE:
HTTP apply result or skip-already-live with SQL evidence.

RECOMMENDED NEXT ACTION:
Comment parent t_50edbe72; CoS does not apply.

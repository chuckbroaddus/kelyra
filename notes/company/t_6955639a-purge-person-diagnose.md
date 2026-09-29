# t_6955639a — READ-ONLY diagnose: admin_purge_person

Project: aohibokgilxhqwmupdfv
When: 2026-09-25 ~2:30 PM CT (Chuck Perm. Delete)
Status: ROOT CAUSE FOUND (no data/schema changes)

## Summary

`admin_purge_person` is live and matches migration body, but every call
fails and rolls back because it DELETEs from `public.post_dismissals`,
which does not exist. No `purge_person` audit rows; profiles stay in
Deleted list (`purged_at` null); auth.users still present (banned).

## (1) deactivated profiles

```sql
select id, display_name, username, deactivated_at, purged_at
from public.profiles
where deactivated_at is not null
order by deactivated_at desc
limit 10;
```

Raw result (HTTP 201):

```json
[
  {
    "id": "c15e7074-942c-48f8-8998-86eb1adc5f71",
    "display_name": "Chuck bills",
    "username": "chuckbills",
    "deactivated_at": "2026-09-25 19:30:24.680087+00",
    "purged_at": null
  },
  {
    "id": "b75d8a5c-b2b7-4c0d-a9ec-117d0fc890f9",
    "display_name": "Chuck Smith",
    "username": "chucksmith",
    "deactivated_at": "2026-09-25 18:21:03.581839+00",
    "purged_at": null
  }
]
```

Note: only two deactivated rows. Both `purged_at` null — app correctly keeps them in Deleted list.

Chuck bills detail: role=administrator, also_administrator=true,
school_id=debffda1-36f4-4a85-b726-bde83f9f46aa.
Deactivated by superintendent at 19:30:24 UTC ≈ 2:30 PM CT.

## (2) audit (table = public.audit_events)

`write_audit` inserts into `public.audit_events` (not audit_log).

```sql
select * from public.audit_events
where action = 'purge_person'
order by created_at desc limit 5;
```

Raw: `[]` (zero rows).

Recent person actions (context):

| created_at (UTC) | action | entity_id | actor |
|---|---|---|---|
| 2026-09-25 19:30:24.680087+00 | deactivate_person | c15e7074-… (chuckbills) | superintendent |
| 2026-09-25 18:21:03.581839+00 | deactivate_person | b75d8a5c-… (chucksmith) | superintendent |
| 2026-09-25 18:20:52.549177+00 | restore_person | b75d8a5c-… | superintendent |
| 2026-09-25 18:10:22.607044+00 | deactivate_person | b75d8a5c-… | superintendent |

No successful purge ever reached commit (audit is first step inside the
function, but the later failure aborts the whole RPC transaction).

## (3) auth.users for those ids

```sql
select id, email, banned_until, deleted_at, created_at, updated_at
from auth.users
where id in (
  'c15e7074-942c-48f8-8998-86eb1adc5f71',
  'b75d8a5c-b2b7-4c0d-a9ec-117d0fc890f9'
);
```

Raw:

```json
[
  {
    "id": "c15e7074-942c-48f8-8998-86eb1adc5f71",
    "email": "csuckpills@gmail.com",
    "banned_until": "infinity",
    "deleted_at": null,
    "created_at": "2026-09-25 18:26:09.907721+00",
    "updated_at": "2026-09-25 19:30:24.680087+00"
  },
  {
    "id": "b75d8a5c-b2b7-4c0d-a9ec-117d0fc890f9",
    "email": "chucksmith@gmail.com",
    "banned_until": "infinity",
    "deleted_at": null,
    "created_at": "2026-09-25 18:08:32.85133+00",
    "updated_at": "2026-09-25 18:21:03.581839+00"
  }
]
```

Both logins still exist; banned from deactivate only. Purge never deleted auth.users.

## (4) Postgres/PostgREST logs (last hour)

Management API log endpoints:

- `GET .../analytics/endpoints/logs.all` → HTTP 410 (removed)
- `GET .../analytics/endpoints/logs?sql=...` → HTTP 200 body
  `{"error":"Backend error! Retry your query..."}` (postgres_logs and
  postgrest_logs both failed)
- No usable historical PostgREST error row retrieved via API

Reproduction below is the live equivalent of the error Chuck would have
seen on RPC `admin_purge_person`.

## (5) live pg_get_functiondef vs migration

- `profiles.purged_at` exists: timestamptz nullable
- FKs profiles/teachers → auth.users: none remaining (migration step 1 applied)
- Live `admin_purge_person(uuid)` body matches
  `supabase/migrations/20260925150000_purge_person.sql` (including the
  `delete from public.post_dismissals` line)
- live md5 of pg_get_functiondef: `d4ba00be9ad19fd40e756631bcc37105`

Tables referenced by the function’s DELETE list that EXIST:

ask_threads, calendar_team_members, calendars, class_teachers,
diary_entries, diary_media, dismissal_duty, ledger_events,
message_thread_members, post_audience_mutes, teachers

MISSING (causes the failure):

- `public.post_dismissals` — does not exist
- tables matching `%dismiss%`: only `dismissal_duty`, `dismissal_lines`

## (6) dry-run BEGIN … ROLLBACK

Actor: superintendent `ecce41fe-0b1a-4d95-abf4-2b5bd3a9bf10` (office admin).
Target: deactivated non-self id `c15e7074-942c-48f8-8998-86eb1adc5f71` (chuckbills).

JWT claims check inside txn:

```text
auth.uid() = ecce41fe-0b1a-4d95-abf4-2b5bd3a9bf10
is_school_admin() = true
```

Bare call (always ROLLBACK):

```sql
BEGIN;
SELECT set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', 'ecce41fe-0b1a-4d95-abf4-2b5bd3a9bf10',
    'role', 'authenticated',
    'aud', 'authenticated'
  )::text,
  true
);
SELECT set_config('request.jwt.claim.sub',
  'ecce41fe-0b1a-4d95-abf4-2b5bd3a9bf10', true);
SELECT public.admin_purge_person(
  'c15e7074-942c-48f8-8998-86eb1adc5f71'::uuid
);
ROLLBACK;
```

Exact error (HTTP 400 from Management API query):

```text
ERROR:  42P01: relation "public.post_dismissals" does not exist
QUERY:  delete from public.post_dismissals where profile_id = target.id
CONTEXT:  PL/pgSQL function admin_purge_person(uuid) line 63 at SQL statement
```

## Root cause / CoS fix hint

RPC dies on a DELETE against a table that was never created in this
project. Whole function aborts → no audit row, no `purged_at`, no
auth.users delete → person stays on Deleted list.

Suggested SQL fix (CoS / migration author — not applied here):

- Drop the `delete from public.post_dismissals ...` line, OR
- Guard with `to_regclass('public.post_dismissals') is not null`, OR
- Create the table if the product still needs it

Optional: after fix, re-try purge on chuckbills under superintendent.

## Verification that dry-run left state unchanged

Post dry-run:

- chuckbills / chucksmith still deactivated, purged_at null
- `count(*)` purge_person audits = 0
- READ-ONLY task: no schema or data writes committed

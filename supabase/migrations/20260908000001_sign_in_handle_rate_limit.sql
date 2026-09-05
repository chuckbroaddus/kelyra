-- F02 / F03 (Q10 follow-up): durable sign-in-handle rate limit + service-only check RPC.
-- Replaces process-local Map in Edge (lost on cold start / multi-isolate).
-- Constant-time password-grant path lives in the Edge function (always grant, dummy on miss).
-- Write-only; do not apply here (Chief of Staff applies).
--
-- Deploy note: after apply, redeploy supabase/functions/sign-in-handle.
-- Optional: set Edge secret SIGN_IN_DUMMY_EMAIL to a real Auth sink user so miss-path
-- bcrypt cost matches hit-path; default dummy email is fine if unset.

create table if not exists public.sign_in_handle_rate (
  bucket text primary key,
  window_started_at timestamptz not null,
  attempt_count integer not null default 0,
  constraint sign_in_handle_rate_count_nonneg check (attempt_count >= 0)
);

comment on table public.sign_in_handle_rate is
  'Durable attempt buckets for Edge sign-in-handle (ip|handle). Service-role RPC only.';

alter table public.sign_in_handle_rate enable row level security;

-- No policies: authenticated/anon cannot read or write. Edge uses service_role + definer RPC.

create or replace function public.sign_in_handle_rate_check(
  p_bucket text,
  p_window_ms integer default 900000,
  p_max_attempts integer default 30
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  now_ts timestamptz := clock_timestamp();
  win_ms integer := greatest(coalesce(p_window_ms, 900000), 1000);
  max_n integer := greatest(coalesce(p_max_attempts, 30), 1);
  new_count integer;
begin
  if p_bucket is null or length(trim(p_bucket)) = 0 then
    return false;
  end if;
  if length(p_bucket) > 256 then
    return false;
  end if;

  insert into public.sign_in_handle_rate as r (bucket, window_started_at, attempt_count)
  values (trim(p_bucket), now_ts, 1)
  on conflict (bucket) do update
  set
    window_started_at = case
      when r.window_started_at + (win_ms * interval '1 millisecond') <= now_ts
        then now_ts
      else r.window_started_at
    end,
    attempt_count = case
      when r.window_started_at + (win_ms * interval '1 millisecond') <= now_ts
        then 1
      else r.attempt_count + 1
    end
  returning r.attempt_count into new_count;

  return new_count <= max_n;
end;
$$;

revoke all on table public.sign_in_handle_rate from public, anon, authenticated;
revoke all on function public.sign_in_handle_rate_check(text, integer, integer) from public, anon, authenticated;
grant execute on function public.sign_in_handle_rate_check(text, integer, integer) to service_role;

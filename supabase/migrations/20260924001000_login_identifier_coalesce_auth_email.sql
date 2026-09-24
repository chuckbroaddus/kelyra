-- t_cddd654c / DITL P0: username sign-in 401 when profiles.email is null.
-- Lane B seed (ditl_seed_auth_admin.mjs) created auth users with email but omitted
-- profiles.email; login_identifier required profiles.email IS NOT NULL → miss → 401.
--
-- Fix (PR only — do not live-apply from Eng):
--   1) Backfill profiles.email from auth.users.email where null (same id).
--   2) login_identifier returns coalesce(profiles.email, auth.users.email) so
--      username path works even if a profile row still lacks email.
-- Still service_role only (Q10) — never grant to anon/authenticated.

-- 1. Backfill null profile emails from Auth (id match).
update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id
  and p.email is null
  and u.email is not null
  and length(trim(u.email)) > 0;

-- 2. Username → email via profile email, else auth.users email.
create or replace function public.login_identifier(p_handle text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(nullif(trim(p.email), ''), nullif(trim(u.email), ''))
  from public.profiles p
  left join auth.users u on u.id = p.id
  where (
      p.username = public.normalize_username(p_handle)
      or lower(coalesce(p.email, u.email, '')) = lower(trim(p_handle))
    )
    and coalesce(nullif(trim(p.email), ''), nullif(trim(u.email), '')) is not null
  limit 1;
$$;

revoke all on function public.login_identifier(text) from public, anon, authenticated;
grant execute on function public.login_identifier(text) to service_role;

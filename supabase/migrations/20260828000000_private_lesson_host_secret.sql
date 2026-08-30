-- HMAC secret for lesson-host JWTs. Schema private is not in the API.
-- Edge reads via SUPABASE_DB_URL + private.lesson_host_secret().
-- Secret value is generated in Vault; never selected here.
-- Applied live as remote 20260828045708_private_lesson_host_secret.

create schema if not exists private;
comment on schema private is 'Not in the API. Internal helpers only.';

revoke all on schema private from public;
revoke all on schema private from anon, authenticated;
grant usage on schema private to postgres;
grant usage on schema private to service_role;

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'LESSON_HOST_SECRET') then
    perform vault.create_secret(
      encode(gen_random_bytes(48), 'base64'),
      'LESSON_HOST_SECRET',
      'HMAC for lesson-host JWTs'
    );
  end if;
end $$;

create or replace function private.lesson_host_secret()
returns text
language sql
stable
security definer
set search_path = vault, pg_temp
as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name = 'LESSON_HOST_SECRET'
  limit 1;
$$;

comment on function private.lesson_host_secret() is
  'Returns Vault LESSON_HOST_SECRET. EXECUTE only for postgres/service_role.';

revoke all on function private.lesson_host_secret() from public;
revoke all on function private.lesson_host_secret() from anon, authenticated;
grant execute on function private.lesson_host_secret() to postgres;
grant execute on function private.lesson_host_secret() to service_role;

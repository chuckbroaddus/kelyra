-- Fix admin_create_login so People → Create account works.
-- The v1 insert omitted auth.identities.provider_id (required on current GoTrue)
-- and set search_path = public only, so crypt()/gen_salt() from pgcrypto were missing.

create extension if not exists pgcrypto with schema extensions;

grant usage on schema auth to postgres;
grant select, insert, update on table auth.users to postgres;
grant select, insert, update on table auth.identities to postgres;

create or replace function public.admin_create_login(
  p_email text,
  p_password text,
  p_username text,
  p_role public.school_role,
  p_display_name text,
  p_must_change boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  uid uuid := gen_random_uuid();
  school uuid;
  uname text;
  new_email text := lower(trim(p_email));
begin
  if auth.uid() is null then
    raise exception 'sign in first';
  end if;
  if not public.is_school_admin() then
    raise exception 'not allowed';
  end if;
  if p_role = 'superintendent' and exists (select 1 from public.profiles where role = 'superintendent') then
    raise exception 'a superintendent already exists';
  end if;
  if p_role not in ('superintendent', 'administrator', 'teacher', 'parent', 'student') then
    raise exception 'bad role';
  end if;
  if new_email is null or position('@' in new_email) = 0 or position('.' in new_email) = 0 then
    raise exception 'need a real email';
  end if;
  if p_password is null or length(p_password) < 6 then
    raise exception 'password must be at least 6 characters';
  end if;
  if exists (select 1 from auth.users u where lower(u.email) = new_email) then
    raise exception 'that email already has a login';
  end if;

  select id into school from public.schools limit 1;
  if school is null then
    raise exception 'no school row';
  end if;
  uname := public.unique_username(p_username);

  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  )
  values (
    '00000000-0000-0000-0000-000000000000',
    uid,
    'authenticated',
    'authenticated',
    new_email,
    crypt(p_password, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('username', uname),
    now(),
    now(),
    null,
    '',
    '',
    null
  );

  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  )
  values (
    gen_random_uuid(),
    uid,
    jsonb_build_object('sub', uid::text, 'email', new_email),
    'email',
    uid::text,
    now(),
    now(),
    now()
  );

  update public.profiles
  set
    username = uname,
    display_name = nullif(trim(p_display_name), ''),
    role = p_role,
    email = new_email,
    must_change_password = coalesce(p_must_change, true),
    created_by = auth.uid()
  where id = uid;

  if not found then
    insert into public.profiles (
      id, school_id, username, email, display_name, role, must_change_password, created_by
    )
    values (
      uid, school, uname, new_email, nullif(trim(p_display_name), ''), p_role,
      coalesce(p_must_change, true), auth.uid()
    );
  end if;

  if p_role in ('superintendent', 'administrator', 'teacher') then
    insert into public.teachers (id, email, display_name)
    values (uid, new_email, nullif(trim(p_display_name), ''))
    on conflict (id) do update
      set email = excluded.email,
          display_name = coalesce(excluded.display_name, public.teachers.display_name);
  end if;

  perform public.write_audit(
    'create_login',
    'profile',
    uid::text,
    null,
    null,
    null,
    jsonb_build_object('username', uname, 'role', p_role, 'email', new_email)
  );
  return uid;
exception
  when others then
    raise exception 'Could not create login: %', sqlerrm;
end;
$$;

grant execute on function public.admin_create_login(text, text, text, public.school_role, text, boolean) to authenticated;

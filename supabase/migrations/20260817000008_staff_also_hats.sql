-- One login may wear more than one staff hat.
--   superintendent + administrator
--   superintendent + teacher
--   administrator + teacher
-- Job of record stays profiles.role. Extra hats are booleans.

alter table public.profiles
  add column if not exists also_administrator boolean not null default false,
  add column if not exists also_teacher boolean not null default false;

update public.profiles
set also_administrator = true
where role = 'administrator' and also_administrator = false;

update public.profiles
set also_teacher = true
where role = 'teacher' and also_teacher = false;

create or replace function public.admin_set_also_hat(
  p_profile_id uuid,
  p_hat text,
  p_also boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  prof public.profiles;
  hat text := lower(trim(p_hat));
begin
  if not public.is_school_admin() then
    raise exception 'not allowed';
  end if;
  select * into prof from public.profiles where id = p_profile_id;
  if not found then
    raise exception 'no such profile';
  end if;
  if prof.role in ('student', 'parent') then
    raise exception 'only staff can wear extra staff hats';
  end if;

  if hat = 'administrator' then
    if prof.role <> 'superintendent' then
      raise exception 'only the superintendent can also be an administrator';
    end if;
    update public.profiles
    set also_administrator = coalesce(p_also, false)
    where id = p_profile_id;
  elsif hat = 'teacher' then
    if prof.role not in ('superintendent', 'administrator') then
      raise exception 'only a superintendent or administrator can also be a teacher';
    end if;
    if coalesce(p_also, false) then
      insert into public.teachers (id, email, display_name)
      values (p_profile_id, prof.email, prof.display_name)
      on conflict (id) do update
        set email = coalesce(excluded.email, public.teachers.email),
            display_name = coalesce(excluded.display_name, public.teachers.display_name);
    end if;
    update public.profiles
    set also_teacher = coalesce(p_also, false)
    where id = p_profile_id;
  else
    raise exception 'unknown hat';
  end if;

  perform public.write_audit(
    case when coalesce(p_also, false) then 'set_also_hat' else 'clear_also_hat' end,
    'profile',
    p_profile_id::text,
    null,
    null,
    jsonb_build_object('hat', hat, 'on', not coalesce(p_also, false)),
    jsonb_build_object('hat', hat, 'on', coalesce(p_also, false))
  );
end;
$$;

drop function if exists public.admin_create_login(text, text, text, public.school_role, text, boolean, boolean);

create or replace function public.admin_create_login(
  p_email text,
  p_password text,
  p_username text,
  p_role public.school_role,
  p_display_name text,
  p_must_change boolean default true,
  p_also_parent boolean default false,
  p_also_administrator boolean default false,
  p_also_teacher boolean default false
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
  want_admin boolean := coalesce(p_also_administrator, false);
  want_teacher boolean := coalesce(p_also_teacher, false);
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
  if want_admin and p_role <> 'superintendent' then
    raise exception 'only the superintendent can also be an administrator';
  end if;
  if want_teacher and p_role not in ('superintendent', 'administrator') then
    raise exception 'only a superintendent or administrator can also be a teacher';
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
    created_by = auth.uid(),
    also_administrator = (p_role = 'administrator') or want_admin,
    also_teacher = (p_role = 'teacher') or want_teacher
  where id = uid;

  if not found then
    insert into public.profiles (
      id, school_id, username, email, display_name, role, must_change_password, created_by,
      also_administrator, also_teacher
    )
    values (
      uid, school, uname, new_email, nullif(trim(p_display_name), ''), p_role,
      coalesce(p_must_change, true), auth.uid(),
      (p_role = 'administrator') or want_admin,
      (p_role = 'teacher') or want_teacher
    );
  end if;

  if p_role in ('superintendent', 'administrator', 'teacher') or want_teacher then
    insert into public.teachers (id, email, display_name)
    values (uid, new_email, nullif(trim(p_display_name), ''))
    on conflict (id) do update
      set email = excluded.email,
          display_name = coalesce(excluded.display_name, public.teachers.display_name);
  end if;

  if p_role = 'parent' or coalesce(p_also_parent, false) then
    perform public.ensure_profile_parent(uid);
  end if;

  perform public.write_audit(
    'create_login',
    'profile',
    uid::text,
    null,
    null,
    null,
    jsonb_build_object(
      'username', uname,
      'role', p_role,
      'email', new_email,
      'also_parent', (p_role = 'parent' or coalesce(p_also_parent, false)),
      'also_administrator', (p_role = 'administrator') or want_admin,
      'also_teacher', (p_role = 'teacher') or want_teacher
    )
  );
  return uid;
exception
  when others then
    raise exception 'Could not create login: %', sqlerrm;
end;
$$;

grant execute on function public.admin_set_also_hat(uuid, text, boolean) to authenticated;
grant execute on function public.admin_create_login(text, text, text, public.school_role, text, boolean, boolean, boolean, boolean) to authenticated;

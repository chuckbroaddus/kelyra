-- Provisioning a student login updates a brand-new profile. profiles_guard
-- blocked that: SQL editor has no auth.uid(), and a teacher is not allowed
-- to edit someone else's login. Trusted provision sets a local flag.

create or replace function public.profiles_guard()
returns trigger
language plpgsql
as $$
begin
  if current_setting('kelyra.provision_profile', true) = 'on' then
    return new;
  end if;
  if TG_OP = 'UPDATE' and not public.can_edit_profile(old.id) then
    raise exception 'not allowed';
  end if;
  if TG_OP = 'UPDATE'
    and (
      new.role is distinct from old.role
      or new.also_administrator is distinct from old.also_administrator
      or new.also_teacher is distinct from old.also_teacher
      or new.parent_id is distinct from old.parent_id
      or new.student_id is distinct from old.student_id
      or new.school_id is distinct from old.school_id
    )
    and not public.is_school_admin()
  then
    raise exception 'not allowed';
  end if;
  return new;
end;
$$;

create or replace function public.admin_provision_student_login(p_student_id uuid)
returns table (
  profile_id uuid,
  student_id uuid,
  display_name text,
  username text,
  email text,
  temp_password text,
  created boolean
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  kid public.students;
  existing public.profiles;
  uid uuid := gen_random_uuid();
  school uuid;
  uname text;
  new_email text;
  pass text;
  meta_email text;
  n int := 0;
begin
  if p_student_id is null then
    raise exception 'need a student';
  end if;

  select * into kid from public.students where id = p_student_id;
  if kid.id is null then
    raise exception 'no such student';
  end if;

  if auth.uid() is not null
     and not public.is_school_admin()
     and kid.teacher_id is distinct from auth.uid()
  then
    raise exception 'not allowed';
  end if;

  select * into existing from public.profiles where profiles.student_id = p_student_id;
  if existing.id is not null then
    return query
      select existing.id, p_student_id, kid.display_name, existing.username, existing.email,
             null::text, false;
    return;
  end if;

  perform set_config('kelyra.provision_profile', 'on', true);

  select id into school from public.schools limit 1;
  if school is null then
    raise exception 'no school row';
  end if;

  uname := public.unique_username(kid.display_name);
  meta_email := nullif(lower(trim(kid.metadata->>'email')), '');
  if meta_email is not null and position('@' in meta_email) > 0 and position('.' in meta_email) > 0 then
    new_email := meta_email;
  else
    new_email := uname || '@students.kelyra.local';
  end if;

  while exists (select 1 from auth.users u where lower(u.email) = new_email) loop
    n := n + 1;
    new_email := uname || n::text || '@students.kelyra.local';
  end loop;

  pass := 'pingpong';

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  )
  values (
    '00000000-0000-0000-0000-000000000000',
    uid,
    'authenticated',
    'authenticated',
    new_email,
    crypt(pass, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('username', uname),
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
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
    display_name = kid.display_name,
    role = 'student',
    email = new_email,
    student_id = p_student_id,
    must_change_password = true,
    created_by = auth.uid(),
    also_administrator = false,
    also_teacher = false
  where id = uid;

  if not found then
    insert into public.profiles (
      id, school_id, username, email, display_name, role, student_id,
      must_change_password, created_by, also_administrator, also_teacher
    )
    values (
      uid, school, uname, new_email, kid.display_name, 'student', p_student_id,
      true, auth.uid(), false, false
    );
  end if;

  delete from public.teachers where id = uid;

  perform public.write_audit(
    'create_login',
    'profile',
    uid::text,
    p_student_id,
    null,
    null,
    jsonb_build_object('username', uname, 'role', 'student', 'email', new_email, 'backfill', true)
  );

  return query
    select uid, p_student_id, kid.display_name, uname, new_email, pass, true;
end;
$$;

create or replace function public.admin_backfill_student_logins()
returns table (
  profile_id uuid,
  student_id uuid,
  display_name text,
  username text,
  email text,
  temp_password text,
  created boolean
)
language sql
security definer
set search_path = public
as $$
  select p.profile_id, p.student_id, p.display_name, p.username, p.email, p.temp_password, p.created
  from public.students s
  join lateral public.admin_provision_student_login(s.id) p on true
  order by p.display_name;
$$;

revoke all on function public.admin_provision_student_login(uuid) from public, anon;
revoke all on function public.admin_backfill_student_logins() from public, anon;
grant execute on function public.admin_provision_student_login(uuid) to authenticated;
grant execute on function public.admin_backfill_student_logins() to authenticated;

select * from public.admin_backfill_student_logins();

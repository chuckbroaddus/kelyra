-- Q12: auth.users insert must never mint a teacher.
-- Office RPCs write the correct profile (+ teachers only for staff) in one shot.
-- Client JWT must not INSERT into public.teachers (teachers_own was FOR ALL).

-- ---------------------------------------------------------------------------
-- handle_new_user: fail closed (no teachers, no default teacher profile)
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Do not insert public.teachers.
  -- Do not insert public.profiles with a default teacher role.
  -- admin_create_login / admin_provision_* set kelyra.provision_profile and
  -- write the correct rows themselves after auth.users insert.
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- teachers RLS: self SELECT + UPDATE only. No client INSERT/DELETE.
-- Office / claim / hat RPCs are security definer and still insert teachers.
-- ---------------------------------------------------------------------------

drop policy if exists teachers_own on public.teachers;

drop policy if exists teachers_self_select on public.teachers;
create policy teachers_self_select on public.teachers
  for select using (id = auth.uid());

drop policy if exists teachers_self_update on public.teachers;
create policy teachers_self_update on public.teachers
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- teachers_admin_read (SELECT for is_school_admin) stays from school_roles.

-- ---------------------------------------------------------------------------
-- admin_create_login: one-shot correct role; never trigger+delete
-- ---------------------------------------------------------------------------

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
  display text := nullif(trim(p_display_name), '');
  is_staff boolean;
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
  is_staff := p_role in ('superintendent', 'administrator', 'teacher') or want_teacher;

  perform set_config('kelyra.provision_profile', 'on', true);

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
    crypt(p_password, gen_salt('bf')),
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

  insert into public.profiles (
    id, school_id, username, email, display_name, role, must_change_password, created_by,
    also_administrator, also_teacher
  )
  values (
    uid, school, uname, new_email, display, p_role,
    coalesce(p_must_change, true), auth.uid(),
    (p_role = 'administrator') or want_admin,
    (p_role = 'teacher') or want_teacher
  );

  if is_staff then
    insert into public.teachers (id, email, display_name)
    values (uid, new_email, display)
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

-- ---------------------------------------------------------------------------
-- Student / parent provision: correct role in one shot; never delete teachers
-- ---------------------------------------------------------------------------

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
     and not public.student_on_taught_class(p_student_id)
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

  insert into public.profiles (
    id, school_id, username, email, display_name, role, student_id,
    must_change_password, created_by, also_administrator, also_teacher
  )
  values (
    uid, school, uname, new_email, kid.display_name, 'student', p_student_id,
    true, auth.uid(), false, false
  );

  -- Never insert teachers for a student login. handle_new_user is a no-op.

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

create or replace function public.admin_provision_parent_login(p_parent_id uuid)
returns table (
  profile_id uuid,
  parent_id uuid,
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
  card public.parents;
  existing public.profiles;
  uid uuid := gen_random_uuid();
  school uuid;
  uname text;
  new_email text;
  pass text := 'pingpong';
  meta_email text;
  n int := 0;
begin
  if p_parent_id is null then
    raise exception 'need a parent';
  end if;

  select * into card from public.parents where id = p_parent_id;
  if card.id is null then
    raise exception 'no such parent';
  end if;

  if auth.uid() is not null
     and not public.is_school_admin()
     and not public.parent_on_taught_class(p_parent_id)
     and card.teacher_id is distinct from auth.uid()
  then
    raise exception 'not allowed';
  end if;

  select * into existing from public.profiles where profiles.parent_id = p_parent_id;
  if existing.id is not null then
    return query
      select existing.id, p_parent_id, card.display_name, existing.username, existing.email,
             null::text, false;
    return;
  end if;

  perform set_config('kelyra.provision_profile', 'on', true);

  select id into school from public.schools limit 1;
  if school is null then
    raise exception 'no school row';
  end if;

  uname := public.unique_username(card.display_name);
  meta_email := nullif(lower(trim(card.metadata->>'email')), '');
  if meta_email is not null and position('@' in meta_email) > 0 and position('.' in meta_email) > 0 then
    new_email := meta_email;
  else
    new_email := uname || '@parents.kelyra.local';
  end if;

  while exists (select 1 from auth.users u where lower(u.email) = new_email) loop
    n := n + 1;
    new_email := uname || n::text || '@parents.kelyra.local';
  end loop;

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

  insert into public.profiles (
    id, school_id, username, email, display_name, role, parent_id,
    must_change_password, created_by, also_administrator, also_teacher
  )
  values (
    uid, school, uname, new_email, card.display_name, 'parent', p_parent_id,
    true, auth.uid(), false, false
  );

  -- Never insert teachers for a parent login. handle_new_user is a no-op.

  perform public.write_audit(
    'create_login',
    'profile',
    uid::text,
    null,
    null,
    null,
    jsonb_build_object('username', uname, 'role', 'parent', 'email', new_email, 'parent_id', p_parent_id)
  );

  return query
    select uid, p_parent_id, card.display_name, uname, new_email, pass, true;
end;
$$;

revoke all on function public.admin_provision_student_login(uuid) from public, anon;
revoke all on function public.admin_provision_parent_login(uuid) from public, anon;
grant execute on function public.admin_provision_student_login(uuid) to authenticated;
grant execute on function public.admin_provision_parent_login(uuid) to authenticated;
grant execute on function public.admin_create_login(text, text, text, public.school_role, text, boolean, boolean, boolean, boolean) to authenticated;

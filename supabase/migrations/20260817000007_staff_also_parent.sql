-- A superintendent, administrator, or teacher may also be a parent.
-- Job stays on profiles.role. Family identity is profiles.parent_id (same login).
-- Students cannot also be parents.

create unique index if not exists profiles_one_login_per_parent
  on public.profiles (parent_id)
  where parent_id is not null;

-- Shared parent payload (token and signed-in staff both use this).
create or replace function public.parent_progress(p_parent uuid)
returns table (
  parent_id uuid,
  parent_display_name text,
  parent_photo_path text,
  parent_relationship text,
  parent_relationship_other text,
  parent_phone text,
  parent_email text,
  parent_address text,
  parent_preferred_contact text,
  children jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.display_name,
    pa_asset.storage_path,
    nullif(p.metadata->>'relationship', ''),
    nullif(p.metadata->>'relationship_other', ''),
    nullif(p.metadata->>'phone', ''),
    nullif(p.metadata->>'email', ''),
    nullif(p.metadata->>'address', ''),
    nullif(p.metadata->>'preferred_contact', ''),
    coalesce(
      (
        select jsonb_agg(child.row order by child.sort_name, child.display_name)
        from (
          select
            s.sort_name,
            s.display_name,
            jsonb_build_object(
              'student_id', s.id,
              'display_name', s.display_name,
              'preferred_name', nullif(s.metadata->>'preferred_name', ''),
              'photo_path', st_asset.storage_path,
              'birthday_md',
                case
                  when (s.metadata->>'birthday') ~ '^\d{4}-\d{2}-\d{2}$'
                  then to_char((s.metadata->>'birthday')::date, 'Mon FMDD')
                  else null
                end,
              'class_name', (
                select c.name
                from public.enrollments e
                join public.classes c on c.id = e.class_id
                where e.student_id = s.id
                order by e.created_at
                limit 1
              ),
              'focus_label', sk.label,
              'practice_status', (
                select sub.status::text
                from public.submissions sub
                join public.assignments a on a.id = sub.assignment_id
                where sub.student_id = s.id
                  and a.kind = 'practice'
                order by sub.created_at desc
                limit 1
              ),
              'parent_sentence', s.parent_sentence
            ) as row
          from public.parent_students ps
          join public.students s on s.id = ps.student_id
          left join public.assets st_asset on st_asset.id = s.photo_asset_id
          left join public.skills sk on sk.id = s.current_focus_skill_id
          where ps.parent_id = p.id
        ) child
      ),
      '[]'::jsonb
    )
  from public.parents p
  left join public.assets pa_asset on pa_asset.id = p.photo_asset_id
  where p.id = p_parent
  limit 1;
$$;

create or replace function public.parent_open(p_token text)
returns table (
  parent_id uuid,
  parent_display_name text,
  parent_photo_path text,
  parent_relationship text,
  parent_relationship_other text,
  parent_phone text,
  parent_email text,
  parent_address text,
  parent_preferred_contact text,
  children jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.parent_progress((
    select pa.parent_id
    from public.parent_accesses pa
    where pa.token = trim(p_token)
    limit 1
  ));
$$;

create or replace function public.parent_open_mine()
returns table (
  parent_id uuid,
  parent_display_name text,
  parent_photo_path text,
  parent_relationship text,
  parent_relationship_other text,
  parent_phone text,
  parent_email text,
  parent_address text,
  parent_preferred_contact text,
  children jsonb
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  pid uuid;
begin
  if auth.uid() is null then
    raise exception 'sign in first';
  end if;
  select pr.parent_id into pid from public.profiles pr where pr.id = auth.uid();
  if pid is null then
    return;
  end if;
  return query select * from public.parent_progress(pid);
end;
$$;

create or replace function public.ensure_profile_parent(p_profile_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  prof public.profiles;
  pid uuid;
  pname text;
begin
  select * into prof from public.profiles where id = p_profile_id;
  if not found then
    raise exception 'no such profile';
  end if;
  if prof.role = 'student' then
    raise exception 'a student login cannot also be a parent';
  end if;
  if prof.parent_id is not null then
    return prof.parent_id;
  end if;

  if not exists (select 1 from public.teachers t where t.id = p_profile_id) then
    insert into public.teachers (id, email, display_name)
    values (p_profile_id, prof.email, prof.display_name)
    on conflict (id) do nothing;
  end if;

  pname := coalesce(nullif(trim(prof.display_name), ''), prof.username, 'Parent');
  insert into public.parents (teacher_id, display_name, sort_name, created_via, metadata)
  values (
    p_profile_id,
    pname,
    pname,
    'typed',
    case
      when prof.email is not null then jsonb_build_object('email', prof.email)
      else '{}'::jsonb
    end
  )
  returning id into pid;

  update public.profiles
  set parent_id = pid
  where id = p_profile_id;

  return pid;
end;
$$;

create or replace function public.admin_set_also_parent(p_profile_id uuid, p_also boolean)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  prof public.profiles;
  pid uuid;
begin
  if not public.is_school_admin() then
    raise exception 'not allowed';
  end if;
  select * into prof from public.profiles where id = p_profile_id;
  if not found then
    raise exception 'no such profile';
  end if;
  if not p_also then
    if prof.role = 'parent' then
      raise exception 'a parent login stays a parent';
    end if;
    update public.profiles set parent_id = null where id = p_profile_id;
    perform public.write_audit(
      'clear_also_parent',
      'profile',
      p_profile_id::text,
      null,
      null,
      jsonb_build_object('parent_id', prof.parent_id),
      jsonb_build_object('parent_id', null)
    );
    return null;
  end if;
  pid := public.ensure_profile_parent(p_profile_id);
  perform public.write_audit(
    'set_also_parent',
    'profile',
    p_profile_id::text,
    null,
    null,
    jsonb_build_object('parent_id', prof.parent_id),
    jsonb_build_object('parent_id', pid)
  );
  return pid;
end;
$$;

drop function if exists public.admin_create_login(text, text, text, public.school_role, text, boolean);

create or replace function public.admin_create_login(
  p_email text,
  p_password text,
  p_username text,
  p_role public.school_role,
  p_display_name text,
  p_must_change boolean default true,
  p_also_parent boolean default false
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
      'also_parent', (p_role = 'parent' or coalesce(p_also_parent, false))
    )
  );
  return uid;
exception
  when others then
    raise exception 'Could not create login: %', sqlerrm;
end;
$$;

grant execute on function public.parent_open(text) to anon, authenticated;
grant execute on function public.parent_open_mine() to authenticated;
grant execute on function public.admin_set_also_parent(uuid, boolean) to authenticated;
grant execute on function public.admin_create_login(text, text, text, public.school_role, text, boolean, boolean) to authenticated;

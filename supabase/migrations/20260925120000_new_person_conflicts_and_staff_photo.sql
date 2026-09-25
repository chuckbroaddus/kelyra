-- People → New person (NEW-PERSON-VALIDATION / NEW-PERSON-AVATAR).
-- 1) admin_create_login rejects a taken username or display name (was: silent suffix).
--    Body copied from 20260827000003_fail_closed_teacher_provision.sql; only the two checks added.
-- 2) teacher_set_profile_photo('teacher', ...) lets the office set a new staff member's photo
--    (can_edit_profile wall). Body copied from 20260908000000_teacher_unref_taught_class.sql.
-- Signatures and grants unchanged.

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
  -- NEW-PERSON-VALIDATION: reject a taken username instead of silently suffixing it.
  if exists (
    select 1 from public.profiles pr
    where pr.username = regexp_replace(public.normalize_username(p_username), '[^a-z0-9_]', '', 'g')
  ) then
    raise exception 'that username is taken';
  end if;
  if display is not null and exists (
    select 1 from public.profiles pr
    where lower(regexp_replace(btrim(pr.display_name), '\s+', ' ', 'g'))
        = lower(regexp_replace(display, '\s+', ' ', 'g'))
  ) then
    raise exception 'that display name is taken';
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

create or replace function public.teacher_set_profile_photo(
  p_kind text,
  p_person_id uuid,
  p_asset_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  photo_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not found';
  end if;
  if p_asset_id is null then
    raise exception 'Invalid asset';
  end if;
  -- New photo must be an asset the actor uploaded (co-teacher upload uses their uid).
  if not exists (
    select 1 from public.assets
    where id = p_asset_id and teacher_id = auth.uid()
  ) then
    raise exception 'Not found';
  end if;

  if p_kind = 'student' then
    select photo_asset_id into photo_id
    from public.students
    where id = p_person_id
      and (
        teacher_id = auth.uid()
        or public.is_school_admin()
        or public.student_on_taught_class(p_person_id)
      );
    if not found then
      raise exception 'Not found';
    end if;
    update public.students set photo_asset_id = p_asset_id where id = p_person_id;
  elsif p_kind = 'parent' then
    select photo_asset_id into photo_id
    from public.parents
    where id = p_person_id
      and (
        teacher_id = auth.uid()
        or public.is_school_admin()
        or public.parent_on_taught_class(p_person_id)
      );
    if not found then
      raise exception 'Not found';
    end if;
    update public.parents set photo_asset_id = p_asset_id where id = p_person_id;
  elsif p_kind = 'teacher' then
    -- NEW-PERSON-AVATAR: self, or the office for staff it may edit (can_edit_profile wall).
    if p_person_id <> auth.uid() and not public.can_edit_profile(p_person_id) then
      raise exception 'Not found';
    end if;
    select photo_asset_id into photo_id
    from public.teachers
    where id = p_person_id;
    if not found then
      raise exception 'Not found';
    end if;
    update public.teachers set photo_asset_id = p_asset_id where id = p_person_id;
  else
    raise exception 'Invalid kind';
  end if;

  if photo_id is not null and photo_id is distinct from p_asset_id then
    perform public._unref_delete_asset(photo_id);
  end if;
end;
$$;

revoke all on function public.teacher_set_profile_photo(text, uuid, uuid) from public, anon;
grant execute on function public.teacher_set_profile_photo(text, uuid, uuid) to authenticated;
grant execute on function public.admin_create_login(text, text, text, public.school_role, text, boolean, boolean, boolean, boolean) to authenticated;

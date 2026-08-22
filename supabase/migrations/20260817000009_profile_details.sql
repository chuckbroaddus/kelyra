-- Profile contact fields + who may edit whose login profile.
-- Self: all own details. Superintendent: anyone.
-- Administrator: anyone except other administrators and superintendents.
-- Teachers edit students (existing student policies). Parents edit linked children.

alter table public.profiles
  add column if not exists phone text,
  add column if not exists address text,
  add column if not exists notes text;

create or replace function public.is_protected_staff(p_role public.school_role, p_also_admin boolean)
returns boolean
language sql
immutable
as $$
  select p_role in ('superintendent', 'administrator') or coalesce(p_also_admin, false);
$$;

create or replace function public.can_edit_profile(p_target uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  actor public.profiles;
  target public.profiles;
begin
  if auth.uid() is null or p_target is null then
    return false;
  end if;
  if auth.uid() = p_target then
    return true;
  end if;
  select * into actor from public.profiles where id = auth.uid();
  select * into target from public.profiles where id = p_target;
  if actor.id is null or target.id is null then
    return false;
  end if;
  if actor.role = 'superintendent' then
    return true;
  end if;
  if public.is_school_admin() and not public.is_protected_staff(target.role, target.also_administrator) then
    return true;
  end if;
  return false;
end;
$$;

create or replace function public.profiles_guard()
returns trigger
language plpgsql
as $$
begin
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

drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard
  before update on public.profiles
  for each row
  execute function public.profiles_guard();

drop policy if exists profiles_admin_write on public.profiles;
create policy profiles_admin_write on public.profiles
  for all using (public.can_edit_profile(id))
  with check (public.can_edit_profile(id));

create or replace function public.update_profile_details(
  p_profile_id uuid,
  p_display_name text,
  p_username text,
  p_email text,
  p_phone text,
  p_address text,
  p_notes text
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.profiles;
  uname text;
  new_email text := nullif(lower(trim(p_email)), '');
begin
  if not public.can_edit_profile(p_profile_id) then
    raise exception 'not allowed';
  end if;

  uname := public.normalize_username(p_username);
  if uname is null or length(uname) < 2 then
    raise exception 'need a username';
  end if;
  if exists (
    select 1 from public.profiles
    where username = uname and id <> p_profile_id
  ) then
    raise exception 'that username is taken';
  end if;
  if new_email is not null and (
    position('@' in new_email) = 0 or position('.' in new_email) = 0
  ) then
    raise exception 'need a real email';
  end if;
  if new_email is not null and exists (
    select 1 from public.profiles
    where lower(email) = new_email and id <> p_profile_id
  ) then
    raise exception 'that email already has a login';
  end if;

  update public.profiles
  set
    display_name = nullif(trim(p_display_name), ''),
    username = uname,
    email = new_email,
    phone = nullif(trim(p_phone), ''),
    address = nullif(trim(p_address), ''),
    notes = nullif(trim(p_notes), '')
  where id = p_profile_id
  returning * into row;

  if new_email is not null then
    update auth.users
    set email = new_email, updated_at = now()
    where id = p_profile_id and lower(coalesce(email, '')) is distinct from new_email;
    update auth.identities
    set identity_data = coalesce(identity_data, '{}'::jsonb) || jsonb_build_object('email', new_email),
        updated_at = now()
    where user_id = p_profile_id and provider = 'email';
  end if;

  update public.teachers
  set
    display_name = coalesce(row.display_name, public.teachers.display_name),
    email = coalesce(row.email, public.teachers.email)
  where id = p_profile_id;

  if row.parent_id is not null then
    update public.parents
    set
      display_name = coalesce(row.display_name, public.parents.display_name),
      sort_name = coalesce(row.display_name, public.parents.sort_name)
    where id = row.parent_id;
  end if;

  perform public.write_audit(
    'update_profile',
    'profile',
    p_profile_id::text,
    null,
    null,
    null,
    jsonb_build_object(
      'username', row.username,
      'email', row.email,
      'display_name', row.display_name
    )
  );
  return row;
end;
$$;

-- Parents may edit a linked child's identity and details, not teacher academic fields.
create or replace function public.students_parent_guard()
returns trigger
language plpgsql
as $$
begin
  if public.is_school_admin() then
    return new;
  end if;
  if exists (select 1 from public.teachers t where t.id = auth.uid())
     and public.my_role() in ('teacher', 'superintendent', 'administrator') then
    return new;
  end if;
  if new.teacher_id is distinct from old.teacher_id
    or new.current_focus_skill_id is distinct from old.current_focus_skill_id
    or new.parent_sentence is distinct from old.parent_sentence
  then
    raise exception 'parents may not change teacher records';
  end if;
  return new;
end;
$$;

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
  if not public.can_edit_profile(p_profile_id) then
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

grant execute on function public.can_edit_profile(uuid) to authenticated;
grant execute on function public.update_profile_details(uuid, text, text, text, text, text, text) to authenticated;

-- Chief of Staff: Hermes applies this. People > deleted person > swipe "Permanently delete"
-- (Chuck 2026-09-25). Removes the login for good and every link to other records, but keeps
-- everything they made (classes, homework, grades, messages, posts...) with their name on it.
--
-- How: the profile row stays as a name-only record (purged_at set, username/email/phone/
-- address/notes scrubbed), so every author reference keeps working and keeps their name.
-- The auth user is deleted. Before this migration, deleting an auth user cascaded through
-- profiles and teachers into classes, assignments, grades, submissions, roster cards, and
-- more, so those two FKs to auth.users are dropped first.
--
-- Same wall as admin_set_person_active: is_school_admin() only, never yourself, protected
-- staff only by the superintendent, and the person must already be deleted (deactivated).

alter table public.profiles
  add column if not exists purged_at timestamptz;

-- 1. Stop auth-user deletes from cascading into content.
do $$
declare
  r record;
begin
  for r in
    select c.conname, c.conrelid::regclass as tbl
    from pg_constraint c
    where c.contype = 'f'
      and c.confrelid = 'auth.users'::regclass
      and c.conrelid in ('public.profiles'::regclass, 'public.teachers'::regclass)
  loop
    execute format('alter table %s drop constraint %I', r.tbl, r.conname);
  end loop;
end;
$$;

-- 2. purged_at joins the columns only provision-flagged RPCs may change.
create or replace function public.profiles_deactivation_guard()
returns trigger
language plpgsql
as $$
begin
  if current_setting('kelyra.provision_profile', true) = 'on' then
    return new;
  end if;
  if new.deactivated_at is distinct from old.deactivated_at
     or new.deactivated_by is distinct from old.deactivated_by
     or new.purged_at is distinct from old.purged_at
  then
    raise exception 'not allowed';
  end if;
  return new;
end;
$$;

-- 3. Restore refuses a purged person.
create or replace function public.admin_set_person_active(
  p_profile_id uuid,
  p_active boolean
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  target public.profiles;
  school uuid;
  actor_role public.school_role;
begin
  if auth.uid() is null then
    raise exception 'sign in first';
  end if;
  if not public.is_school_admin() then
    raise exception 'not allowed';
  end if;
  if p_profile_id is null or p_profile_id = auth.uid() then
    raise exception 'not allowed';
  end if;
  if p_active is null then
    raise exception 'not allowed';
  end if;

  select id into school from public.schools limit 1;
  if school is null then
    raise exception 'not allowed';
  end if;

  select role into actor_role from public.profiles where id = auth.uid();
  select * into target from public.profiles where id = p_profile_id;
  if target.id is null or target.school_id is distinct from school then
    raise exception 'not allowed';
  end if;
  -- PURGE: a permanently deleted person has no login left to restore.
  if target.purged_at is not null then
    raise exception 'not allowed';
  end if;
  if actor_role is distinct from 'superintendent'
     and public.is_protected_staff(target.role, target.also_administrator)
  then
    raise exception 'not allowed';
  end if;

  perform set_config('kelyra.provision_profile', 'on', true);
  if p_active then
    update public.profiles
    set deactivated_at = null, deactivated_by = null
    where id = target.id;
    update auth.users set banned_until = null, updated_at = now() where id = target.id;
  else
    update public.profiles
    set deactivated_at = coalesce(deactivated_at, now()), deactivated_by = auth.uid()
    where id = target.id;
    update auth.users set banned_until = 'infinity', updated_at = now() where id = target.id;
    -- Sign them out everywhere now (refresh tokens hang off sessions).
    delete from auth.sessions where user_id = target.id;
  end if;
  perform set_config('kelyra.provision_profile', 'off', true);

  perform public.write_audit(
    case when p_active then 'restore_person' else 'deactivate_person' end,
    'profile',
    target.id::text,
    target.student_id,
    null,
    jsonb_build_object('deactivated_at', target.deactivated_at),
    jsonb_build_object('username', target.username, 'active', p_active)
  );
end;
$$;

revoke all on function public.admin_set_person_active(uuid, boolean) from public;
grant execute on function public.admin_set_person_active(uuid, boolean) to authenticated;

-- 4. Permanently delete.
create or replace function public.admin_purge_person(p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  target public.profiles;
  school uuid;
  actor_role public.school_role;
  tomb text;
begin
  if auth.uid() is null then
    raise exception 'sign in first';
  end if;
  if not public.is_school_admin() then
    raise exception 'not allowed';
  end if;
  if p_profile_id is null or p_profile_id = auth.uid() then
    raise exception 'not allowed';
  end if;

  select id into school from public.schools limit 1;
  if school is null then
    raise exception 'not allowed';
  end if;

  select role into actor_role from public.profiles where id = auth.uid();
  select * into target from public.profiles where id = p_profile_id for update;
  if target.id is null or target.school_id is distinct from school then
    raise exception 'not allowed';
  end if;
  if target.deactivated_at is null then
    raise exception 'delete them first';
  end if;
  if target.purged_at is not null then
    raise exception 'already permanently deleted';
  end if;
  if actor_role is distinct from 'superintendent'
     and public.is_protected_staff(target.role, target.also_administrator)
  then
    raise exception 'not allowed';
  end if;

  -- Audit first, with what is about to go.
  perform public.write_audit(
    'purge_person',
    'profile',
    target.id::text,
    target.student_id,
    null,
    jsonb_build_object(
      'username', target.username,
      'email', target.email,
      'display_name', target.display_name,
      'role', target.role,
      'student_id', target.student_id,
      'parent_id', target.parent_id
    ),
    jsonb_build_object('purged', true)
  );

  -- Links to other records (memberships, seats, personal settings).
  delete from public.message_thread_members where profile_id = target.id;
  delete from public.calendar_team_members where profile_id = target.id;
  delete from public.dismissal_duty where profile_id = target.id;
  delete from public.post_audience_mutes where profile_id = target.id;
  delete from public.post_dismissals where profile_id = target.id;
  delete from public.class_teachers where teacher_id = target.id;

  -- Private to them: journal, AI chats, personal calendars.
  delete from public.diary_media where owner_profile_id = target.id;
  delete from public.diary_entries where owner_profile_id = target.id;
  delete from public.ledger_events where owner_profile_id = target.id;
  delete from public.ask_threads where profile_id = target.id;
  delete from public.calendars where owner_profile_id = target.id;

  -- Name-only record. Frees the username and email for reuse.
  tomb := 'former-' || replace(target.id::text, '-', '');
  perform set_config('kelyra.provision_profile', 'on', true);
  update public.profiles
  set username = tomb,
      email = null,
      phone = null,
      address = null,
      notes = null,
      student_id = null,
      parent_id = null,
      must_change_password = false,
      purged_at = now()
  where id = target.id;
  update public.teachers
  set email = tomb || '@purged.kelyra.invalid',
      active_class_id = null
  where id = target.id;
  perform set_config('kelyra.provision_profile', 'off', true);

  -- The login itself (identities, sessions, factors cascade inside auth).
  delete from auth.users where id = target.id;
end;
$$;

revoke all on function public.admin_purge_person(uuid) from public;
grant execute on function public.admin_purge_person(uuid) to authenticated;

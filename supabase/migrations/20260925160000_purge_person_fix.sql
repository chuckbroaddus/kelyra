-- Chief of Staff: Hermes applies this. Fix for 20260925150000_purge_person.sql (Chuck 2026-09-25).
-- Live, every "Permanently delete" failed and rolled back: public.post_dismissals does not
-- exist in this database (42P01), so nobody was ever purged. admin_purge_person now skips
-- any cleanup table or optional column that is not present. Same wall, same behavior otherwise.

-- Internal helpers (not callable by app users; only used inside admin_purge_person).
create or replace function public.purge_delete_rows(p_table text, p_column text, p_id uuid)
returns void
language plpgsql
set search_path = public
as $$
begin
  if to_regclass(format('public.%I', p_table)) is null then
    return;
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = p_table and column_name = p_column
  ) then
    return;
  end if;
  execute format('delete from public.%I where %I = $1', p_table, p_column) using p_id;
end;
$$;

create or replace function public.purge_null_column(p_table text, p_column text, p_id uuid)
returns void
language plpgsql
set search_path = public
as $$
begin
  if to_regclass(format('public.%I', p_table)) is null then
    return;
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = p_table and column_name = p_column
  ) then
    return;
  end if;
  execute format('update public.%I set %I = null where id = $1', p_table, p_column) using p_id;
end;
$$;

revoke all on function public.purge_delete_rows(text, text, uuid) from public, anon, authenticated;
revoke all on function public.purge_null_column(text, text, uuid) from public, anon, authenticated;

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
  col text;
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

  -- Links to other records, then things private to them. Each table is skipped when it is
  -- not in this database (post_dismissals was missing live and aborted every purge).
  perform public.purge_delete_rows('message_thread_members', 'profile_id', target.id);
  perform public.purge_delete_rows('calendar_team_members', 'profile_id', target.id);
  perform public.purge_delete_rows('dismissal_duty', 'profile_id', target.id);
  perform public.purge_delete_rows('post_audience_mutes', 'profile_id', target.id);
  perform public.purge_delete_rows('post_dismissals', 'profile_id', target.id);
  perform public.purge_delete_rows('class_teachers', 'teacher_id', target.id);
  perform public.purge_delete_rows('diary_media', 'owner_profile_id', target.id);
  perform public.purge_delete_rows('diary_entries', 'owner_profile_id', target.id);
  perform public.purge_delete_rows('ledger_events', 'owner_profile_id', target.id);
  perform public.purge_delete_rows('ask_threads', 'profile_id', target.id);
  perform public.purge_delete_rows('calendars', 'owner_profile_id', target.id);

  -- Name-only record. Frees the username and email for reuse.
  tomb := 'former-' || replace(target.id::text, '-', '');
  perform set_config('kelyra.provision_profile', 'on', true);
  update public.profiles
  set username = tomb,
      email = null,
      student_id = null,
      parent_id = null,
      must_change_password = false,
      purged_at = now()
  where id = target.id;
  -- Optional contact columns: clear the ones this database has.
  foreach col in array array['phone', 'address', 'notes'] loop
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'profiles' and column_name = col
    ) then
      execute format('update public.profiles set %I = null where id = $1', col) using target.id;
    end if;
  end loop;
  if to_regclass('public.teachers') is not null then
    update public.teachers
    set email = tomb || '@purged.kelyra.invalid'
    where id = target.id;
    perform public.purge_null_column('teachers', 'active_class_id', target.id);
  end if;
  perform set_config('kelyra.provision_profile', 'off', true);

  -- The login itself (identities, sessions, factors cascade inside auth).
  delete from auth.users where id = target.id;
end;
$$;

revoke all on function public.admin_purge_person(uuid) from public;
grant execute on function public.admin_purge_person(uuid) to authenticated;

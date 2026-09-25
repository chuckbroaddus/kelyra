-- Chief of Staff: Hermes applies this. People > swipe "Delete" = deactivate (Chuck 2026-09-25).
-- Deactivate: block sign-in (auth ban + drop sessions) and hide from People; keep every record.
-- Restore: lift the ban and show them again. Same wall as admin_reset_login_password:
-- is_school_admin() only, never yourself, protected staff only by the superintendent.

alter table public.profiles
  add column if not exists deactivated_at timestamptz,
  add column if not exists deactivated_by uuid references public.profiles (id) on delete set null;

-- Only admin_set_person_active (provision flag on) may change these columns.
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
  then
    raise exception 'not allowed';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_deactivation_guard on public.profiles;
create trigger profiles_deactivation_guard
  before update on public.profiles
  for each row
  execute function public.profiles_deactivation_guard();

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

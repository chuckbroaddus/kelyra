-- Chief of Staff: apply this. Office reset of someone else's password.
-- Same wall as admin_create_login: is_school_admin() only (superintendent /
-- administrator). Does not widen is_staff. Does not create a class, hat,
-- login, or student. Does not log the new password.
-- Teachers (Jacquee-as-teacher) must get 'not allowed'; no password change.

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
  -- Office (or self /password) may flip the flag. A teacher JWT cannot set
  -- must_change_password on anyone else.
  if TG_OP = 'UPDATE'
    and new.must_change_password is distinct from old.must_change_password
    and old.id is distinct from auth.uid()
    and not public.is_school_admin()
  then
    raise exception 'not allowed';
  end if;
  return new;
end;
$$;

create or replace function public.admin_reset_login_password(
  p_profile_id uuid,
  p_password text
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
  if p_password is null or char_length(p_password) < 8 then
    raise exception 'password must be at least 8 characters';
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
  if target.username is null or length(trim(target.username)) = 0 then
    raise exception 'No login yet, create one from People.';
  end if;
  if not exists (select 1 from auth.users u where u.id = target.id) then
    raise exception 'No login yet, create one from People.';
  end if;

  update auth.users
  set
    encrypted_password = crypt(p_password, gen_salt('bf')),
    updated_at = now()
  where id = target.id;
  if not found then
    raise exception 'No login yet, create one from People.';
  end if;

  perform set_config('kelyra.provision_profile', 'on', true);
  update public.profiles
  set must_change_password = true
  where id = target.id;

  perform public.write_audit(
    'reset_login_password',
    'profile',
    target.id::text,
    target.student_id,
    null,
    null,
    jsonb_build_object('username', target.username, 'must_change_password', true)
  );
end;
$$;

revoke all on function public.admin_reset_login_password(uuid, text) from public;
grant execute on function public.admin_reset_login_password(uuid, text) to authenticated;

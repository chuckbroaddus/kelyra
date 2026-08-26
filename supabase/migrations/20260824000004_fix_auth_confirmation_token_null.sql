-- Repair GoTrue login: confirmation_token (and siblings) must be '' not NULL.
-- Symptom: error finding user: Scan error confirmation_token converting NULL to string.

update auth.users
set
  confirmation_token = coalesce(confirmation_token, ''),
  recovery_token = coalesce(recovery_token, ''),
  email_change = coalesce(email_change, ''),
  email_change_token_new = coalesce(email_change_token_new, ''),
  email_change_token_current = coalesce(email_change_token_current, '')
where confirmation_token is null
   or recovery_token is null
   or email_change is null
   or email_change_token_new is null
   or email_change_token_current is null;

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
    encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
    updated_at = now(),
    confirmation_token = coalesce(confirmation_token, ''),
    recovery_token = coalesce(recovery_token, ''),
    email_change = coalesce(email_change, ''),
    email_change_token_new = coalesce(email_change_token_new, ''),
    email_change_token_current = coalesce(email_change_token_current, '')
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

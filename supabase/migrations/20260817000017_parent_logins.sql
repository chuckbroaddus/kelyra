-- Parent cards are people too. Provision a login for each parents row
-- that is not already linked from a profile.

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

  update public.profiles
  set
    username = uname,
    display_name = card.display_name,
    role = 'parent',
    email = new_email,
    parent_id = p_parent_id,
    must_change_password = true,
    created_by = auth.uid(),
    also_administrator = false,
    also_teacher = false
  where id = uid;

  if not found then
    insert into public.profiles (
      id, school_id, username, email, display_name, role, parent_id,
      must_change_password, created_by, also_administrator, also_teacher
    )
    values (
      uid, school, uname, new_email, card.display_name, 'parent', p_parent_id,
      true, auth.uid(), false, false
    );
  end if;

  delete from public.teachers where id = uid;

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

create or replace function public.admin_backfill_parent_logins()
returns table (
  profile_id uuid,
  parent_id uuid,
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
  select p.profile_id, p.parent_id, p.display_name, p.username, p.email, p.temp_password, p.created
  from public.parents card
  join lateral public.admin_provision_parent_login(card.id) p on true
  order by p.display_name;
$$;

revoke all on function public.admin_provision_parent_login(uuid) from public, anon;
revoke all on function public.admin_backfill_parent_logins() from public, anon;
grant execute on function public.admin_provision_parent_login(uuid) to authenticated;
grant execute on function public.admin_backfill_parent_logins() to authenticated;

select * from public.admin_backfill_parent_logins();

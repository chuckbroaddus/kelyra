-- Q1: raw auth.signUp / auth.users insert must not become a teacher.
-- Office RPCs create the correct profile + teachers rows. Fail closed for strays.
-- First superintendent remains SQL-only via school_claim_superintendent().

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Do not insert public.teachers.
  -- Do not insert public.profiles with a default teacher role.
  -- admin_create_login / admin_provision_* write the right rows after auth.users insert.
  return new;
end;
$$;

create or replace function public.school_claim_superintendent()
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.profiles;
  school uuid;
  uname text;
  uemail text;
begin
  if auth.uid() is null then
    raise exception 'sign in first';
  end if;
  if exists (select 1 from public.profiles where role = 'superintendent' and id <> auth.uid()) then
    raise exception 'a superintendent already exists';
  end if;

  perform set_config('kelyra.provision_profile', 'on', true);

  update public.profiles
  set role = 'superintendent',
      username = case
        when username in ('superintendent', 'superintendant') then username
        else public.unique_username('superintendent')
      end
  where id = auth.uid()
  returning * into row;

  if row.id is null then
    select id into school from public.schools limit 1;
    if school is null then
      raise exception 'no school row';
    end if;
    select email into uemail from auth.users where id = auth.uid();
    uname := public.unique_username('superintendent');
    insert into public.profiles (id, school_id, username, email, display_name, role)
    values (
      auth.uid(),
      school,
      uname,
      uemail,
      split_part(coalesce(uemail, 'superintendent'), '@', 1),
      'superintendent'
    )
    returning * into row;
  end if;

  insert into public.teachers (id, email, display_name)
  values (auth.uid(), row.email, row.display_name)
  on conflict (id) do update
    set email = coalesce(excluded.email, public.teachers.email),
        display_name = coalesce(excluded.display_name, public.teachers.display_name);

  perform public.write_audit('claim_superintendent', 'profile', auth.uid()::text, null, null, null, to_jsonb(row));
  return row;
end;
$$;

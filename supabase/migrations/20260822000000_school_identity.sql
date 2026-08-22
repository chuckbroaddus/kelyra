-- School display name + logo. Superintendent sets them. Everyone signed in may read.
-- Paste in the Supabase SQL editor. No CLI.

alter table public.schools
  add column if not exists logo_asset_id uuid references public.assets (id) on delete set null;

create or replace function public.schools_guard_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.name is distinct from old.name
     or new.logo_asset_id is distinct from old.logo_asset_id then
    if not exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'superintendent'
    ) then
      raise exception 'Only the superintendent can change the school name or logo';
    end if;
  end if;
  if length(trim(coalesce(new.name, ''))) < 1 then
    raise exception 'Need a school name';
  end if;
  if length(trim(new.name)) > 80 then
    raise exception 'School name is too long';
  end if;
  new.name := trim(new.name);
  return new;
end;
$$;

drop trigger if exists schools_guard_identity on public.schools;
create trigger schools_guard_identity
  before update on public.schools
  for each row
  execute function public.schools_guard_identity();

create or replace function public.set_school_name(p_name text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  school uuid;
  before_name text;
begin
  if auth.uid() is null then
    raise exception 'Sign in';
  end if;
  school := public.my_school_id();
  if school is null then
    raise exception 'No school';
  end if;
  select name into before_name from public.schools where id = school;
  update public.schools set name = p_name where id = school;
  perform public.write_audit(
    'set_school_name',
    'school',
    school::text,
    null,
    null,
    jsonb_build_object('name', before_name),
    jsonb_build_object('name', trim(p_name))
  );
  return trim(p_name);
end;
$$;

create or replace function public.set_school_logo(p_asset_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  school uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in';
  end if;
  school := public.my_school_id();
  if school is null then
    raise exception 'No school';
  end if;
  if p_asset_id is not null and not exists (
    select 1 from public.assets where id = p_asset_id and teacher_id = auth.uid()
  ) then
    raise exception 'Unknown photo';
  end if;
  update public.schools set logo_asset_id = p_asset_id where id = school;
  perform public.write_audit(
    'set_school_logo',
    'school',
    school::text,
    null,
    null,
    null,
    jsonb_build_object('logo_asset_id', p_asset_id)
  );
  return p_asset_id;
end;
$$;

grant execute on function public.set_school_name(text) to authenticated;
grant execute on function public.set_school_logo(uuid) to authenticated;

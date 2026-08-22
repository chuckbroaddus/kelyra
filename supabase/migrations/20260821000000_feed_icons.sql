-- Feed glyphs on school + class. Owners pick one; the combined inbox shows it as a tab.
-- Paste in the Supabase SQL editor. No CLI.

alter table public.schools
  add column if not exists feed_icon text not null default 'feedSchool';

alter table public.classes
  add column if not exists feed_icon text not null default 'feedClass';

create or replace function public.feed_icon_ok(p_icon text)
returns boolean
language sql
immutable
as $$
  select p_icon in (
    'feedSchool',
    'feedClass',
    'feedBook',
    'feedMath',
    'feedScience',
    'feedArt',
    'feedMusic',
    'feedSport',
    'feedGlobe',
    'feedCode',
    'feedTheater',
    'feedHeart',
    'feedStar',
    'feedSun',
    'feedPencil',
    'feedMap',
    'feedLab'
  );
$$;

create or replace function public.set_school_feed_icon(p_icon text)
returns text
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
  if not public.is_school_admin() then
    raise exception 'Only the school office can change the school feed icon';
  end if;
  if not public.feed_icon_ok(p_icon) then
    raise exception 'Unknown feed icon';
  end if;
  school := public.my_school_id();
  if school is null then
    raise exception 'No school';
  end if;
  update public.schools set feed_icon = p_icon where id = school;
  perform public.write_audit(
    'set_feed_icon',
    'school',
    school::text,
    null,
    null,
    null,
    jsonb_build_object('feed_icon', p_icon)
  );
  return p_icon;
end;
$$;

create or replace function public.set_class_feed_icon(p_class_id uuid, p_icon text)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in';
  end if;
  if p_class_id is null then
    raise exception 'Missing class';
  end if;
  if not public.feed_icon_ok(p_icon) then
    raise exception 'Unknown feed icon';
  end if;
  if not (public.is_school_admin() or public.teaches_class(p_class_id)) then
    raise exception 'Only a teacher of this class or the office can change its feed icon';
  end if;
  update public.classes set feed_icon = p_icon where id = p_class_id;
  if not found then
    raise exception 'Class not found';
  end if;
  perform public.write_audit(
    'set_feed_icon',
    'class',
    p_class_id::text,
    null,
    p_class_id,
    null,
    jsonb_build_object('feed_icon', p_icon)
  );
  return p_icon;
end;
$$;

create or replace function public.list_my_feeds()
returns table (
  kind text,
  id uuid,
  name text,
  icon text,
  can_edit boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;

  return query
  select
    'school'::text,
    s.id,
    s.name,
    s.feed_icon,
    public.is_school_admin()
  from public.profiles me
  join public.schools s on s.id = me.school_id
  where me.id = auth.uid();

  return query
  select
    'class'::text,
    c.id,
    c.name,
    c.feed_icon,
    public.is_school_admin() or public.teaches_class(c.id)
  from public.classes c
  where public.is_school_admin()
     or public.teaches_class(c.id)
     or exists (
       select 1
       from public.profiles me
       join public.enrollments e on e.student_id = me.student_id
       where me.id = auth.uid() and e.class_id = c.id
     )
     or exists (
       select 1
       from public.profiles me
       join public.parent_students ps on ps.parent_id = me.parent_id
       join public.enrollments e on e.student_id = ps.student_id
       where me.id = auth.uid() and e.class_id = c.id
     )
  order by c.name;
end;
$$;

grant execute on function public.feed_icon_ok(text) to authenticated;
grant execute on function public.set_school_feed_icon(text) to authenticated;
grant execute on function public.set_class_feed_icon(uuid, text) to authenticated;
grant execute on function public.list_my_feeds() to authenticated;

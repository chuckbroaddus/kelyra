-- Parent directory for a class. Security definer so child links are not hidden by RLS.

create or replace function public.my_school_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select school_id from public.profiles where id = auth.uid();
$$;

create or replace function public.class_parent_directory(p_class_id uuid)
returns table (
  pool text,
  id uuid,
  teacher_id uuid,
  display_name text,
  sort_name text,
  photo_asset_id uuid,
  metadata jsonb,
  created_at timestamptz,
  created_via public.parent_created_via,
  children jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  with class_kids as (
    select e.student_id
    from public.enrollments e
    where e.class_id = p_class_id
  ),
  school_parents as (
    select p.*
    from public.parents p
    join public.profiles owner on owner.id = p.teacher_id
    where auth.uid() is not null
      and public.is_staff_profile(auth.uid())
      and owner.school_id is not distinct from public.my_school_id()
  ),
  kids as (
    select
      ps.parent_id,
      jsonb_agg(
        jsonb_build_object('id', s.id, 'display_name', s.display_name, 'photoUrl', null)
        order by s.display_name
      ) as children,
      bool_or(exists (select 1 from class_kids ck where ck.student_id = s.id)) as in_class
    from public.parent_students ps
    join public.students s on s.id = ps.student_id
    group by ps.parent_id
  )
  select
    case
      when coalesce(k.in_class, false) then 'linked'
      else 'available'
    end,
    p.id,
    p.teacher_id,
    p.display_name,
    p.sort_name,
    p.photo_asset_id,
    p.metadata,
    p.created_at,
    p.created_via,
    coalesce(k.children, '[]'::jsonb)
  from school_parents p
  left join kids k on k.parent_id = p.id
  order by p.display_name;
$$;

create or replace function public.add_parent_to_class(p_class_id uuid, p_parent_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  klass public.classes;
  n int := 0;
begin
  if auth.uid() is null or not public.is_staff_profile(auth.uid()) then
    raise exception 'not allowed';
  end if;
  select * into klass from public.classes where id = p_class_id;
  if klass.id is null then
    raise exception 'not allowed';
  end if;
  if klass.teacher_id is distinct from auth.uid() and not public.is_school_admin() then
    raise exception 'not allowed';
  end if;
  if not exists (
    select 1 from public.parents p
    join public.profiles owner on owner.id = p.teacher_id
    where p.id = p_parent_id
      and owner.school_id is not distinct from public.my_school_id()
  ) then
    raise exception 'not allowed';
  end if;

  insert into public.enrollments (class_id, student_id)
  select p_class_id, ps.student_id
  from public.parent_students ps
  where ps.parent_id = p_parent_id
  on conflict (class_id, student_id) do nothing;
  get diagnostics n = row_count;
  return n;
end;
$$;

create or replace function public.remove_parent_from_class(p_class_id uuid, p_parent_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  klass public.classes;
begin
  if auth.uid() is null or not public.is_staff_profile(auth.uid()) then
    raise exception 'not allowed';
  end if;
  select * into klass from public.classes where id = p_class_id;
  if klass.id is null then
    raise exception 'not allowed';
  end if;
  if klass.teacher_id is distinct from auth.uid() and not public.is_school_admin() then
    raise exception 'not allowed';
  end if;
  delete from public.parent_students
  where parent_id = p_parent_id
    and student_id in (select e.student_id from public.enrollments e where e.class_id = p_class_id);
end;
$$;

grant execute on function public.class_parent_directory(uuid) to authenticated;
grant execute on function public.add_parent_to_class(uuid, uuid) to authenticated;
grant execute on function public.remove_parent_from_class(uuid, uuid) to authenticated;

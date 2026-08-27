-- Q6: school_students_for_link / school_parents_for_link must not dump the
-- whole school to any staff. Office (is_school_admin + my_school_id) may list
-- in-school students/parents for linking. Teachers see only taught-class
-- students/parents (enrollments / teaches_class / parent_on_taught_class).
-- Do not ride is_staff. Students/parents/anon get nothing.
-- class_parent_directory inherits school_parents_for_link; also require
-- teaches_class so a teacher cannot probe an untaught class_id.

create or replace function public.school_students_for_link()
returns setof public.students
language sql
stable
security definer
set search_path = public
as $$
  select s.*
  from public.students s
  where auth.uid() is not null
    and (
      (
        public.is_school_admin()
        and public.my_school_id() is not null
        and exists (
          select 1
          from public.profiles owner
          where owner.id = s.teacher_id
            and owner.school_id is not distinct from public.my_school_id()
        )
      )
      or (
        not public.is_school_admin()
        and exists (
          select 1
          from public.enrollments e
          where e.student_id = s.id
            and public.teaches_class(e.class_id)
        )
      )
    )
  order by s.display_name;
$$;

create or replace function public.school_parents_for_link()
returns setof public.parents
language sql
stable
security definer
set search_path = public
as $$
  select p.*
  from public.parents p
  where auth.uid() is not null
    and (
      (
        public.is_school_admin()
        and public.my_school_id() is not null
        and exists (
          select 1
          from public.profiles x
          where x.school_id is not distinct from public.my_school_id()
            and (x.id = p.teacher_id or x.parent_id = p.id)
        )
      )
      or (
        not public.is_school_admin()
        and public.parent_on_taught_class(p.id)
      )
    )
  order by p.display_name;
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
  with allowed as (
    select public.teaches_class(p_class_id) as ok
  ),
  class_kids as (
    select e.student_id
    from public.enrollments e, allowed a
    where a.ok
      and e.class_id = p_class_id
  ),
  school_parents as (
    select p.*
    from public.school_parents_for_link() p, allowed a
    where a.ok
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

revoke all on function public.school_students_for_link() from public, anon;
revoke all on function public.school_parents_for_link() from public, anon;
revoke all on function public.class_parent_directory(uuid) from public, anon;
grant execute on function public.school_students_for_link() to authenticated;
grant execute on function public.school_parents_for_link() to authenticated;
grant execute on function public.class_parent_directory(uuid) to authenticated;

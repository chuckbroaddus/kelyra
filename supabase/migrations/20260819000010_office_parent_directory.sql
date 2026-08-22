-- Office parent lists: do not require the parent card's teacher_id to be a staff profile.
-- Parent logins store teacher_id as the parent's own id. Admins must still see every card.

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
    and public.is_staff_profile(auth.uid())
    and (
      public.is_school_admin()
      or p.teacher_id = auth.uid()
      or exists (
        select 1
        from public.profiles x
        where x.school_id is not distinct from public.my_school_id()
          and (x.id = p.teacher_id or x.parent_id = p.id)
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
  with class_kids as (
    select e.student_id
    from public.enrollments e
    where e.class_id = p_class_id
  ),
  school_parents as (
    select p.* from public.school_parents_for_link() p
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

grant execute on function public.school_parents_for_link() to authenticated;
grant execute on function public.class_parent_directory(uuid) to authenticated;

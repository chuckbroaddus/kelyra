-- List family links without RLS hiding other-teacher cards from administrators.

create or replace function public.can_link_parent_student()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and (
        role in ('superintendent', 'administrator')
        or also_administrator
      )
  );
$$;

create or replace function public.student_parents(p_student_id uuid)
returns setof public.parents
language sql
stable
security definer
set search_path = public
as $$
  select p.*
  from public.parents p
  join public.parent_students ps on ps.parent_id = p.id
  where p_student_id is not null
    and ps.student_id = p_student_id
    and (
      public.can_link_parent_student()
      or p.teacher_id = auth.uid()
      or exists (
        select 1 from public.students s
        where s.id = p_student_id and s.teacher_id = auth.uid()
      )
    )
  order by p.display_name;
$$;

create or replace function public.parent_children(p_parent_id uuid)
returns setof public.students
language sql
stable
security definer
set search_path = public
as $$
  select s.*
  from public.students s
  join public.parent_students ps on ps.student_id = s.id
  where p_parent_id is not null
    and ps.parent_id = p_parent_id
    and (
      public.can_link_parent_student()
      or s.teacher_id = auth.uid()
      or exists (
        select 1 from public.parents p
        where p.id = p_parent_id and p.teacher_id = auth.uid()
      )
    )
  order by s.display_name;
$$;

grant execute on function public.can_link_parent_student() to authenticated;
grant execute on function public.student_parents(uuid) to authenticated;
grant execute on function public.parent_children(uuid) to authenticated;

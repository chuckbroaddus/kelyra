-- School-wide people a teacher can add to a class (not only their own cards).

create or replace function public.my_school_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select school_id from public.profiles where id = auth.uid();
$$;

create or replace function public.student_visible(p_student uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_student is not null
    and (
      exists (
        select 1 from public.students s
        where s.id = p_student and s.teacher_id = auth.uid()
      )
      or public.is_school_admin()
      or exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.student_id = p_student
      )
      or exists (
        select 1
        from public.profiles p
        join public.parent_students ps on ps.parent_id = p.parent_id
        where p.id = auth.uid() and ps.student_id = p_student
      )
      or exists (
        select 1
        from public.enrollments e
        join public.classes c on c.id = e.class_id
        where e.student_id = p_student
          and (c.teacher_id = auth.uid() or public.is_school_admin())
      )
    );
$$;

create or replace function public.school_students_not_in_class(p_class_id uuid)
returns setof public.students
language sql
stable
security definer
set search_path = public
as $$
  select s.*
  from public.students s
  join public.profiles owner on owner.id = s.teacher_id
  where auth.uid() is not null
    and owner.school_id is not distinct from public.my_school_id()
    and public.is_staff_profile(auth.uid())
    and not exists (
      select 1 from public.enrollments e
      where e.class_id = p_class_id and e.student_id = s.id
    )
  order by s.display_name;
$$;

create or replace function public.school_parents_not_in_class(p_class_id uuid)
returns setof public.parents
language sql
stable
security definer
set search_path = public
as $$
  select p.*
  from public.parents p
  join public.profiles owner on owner.id = p.teacher_id
  where auth.uid() is not null
    and owner.school_id is not distinct from public.my_school_id()
    and public.is_staff_profile(auth.uid())
    and not exists (
      select 1
      from public.parent_students ps
      join public.enrollments e on e.student_id = ps.student_id
      where ps.parent_id = p.id and e.class_id = p_class_id
    )
  order by p.display_name;
$$;

create or replace function public.enroll_school_student(p_class_id uuid, p_student_id uuid)
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
  if not exists (select 1 from public.school_students_not_in_class(p_class_id) s where s.id = p_student_id)
     and not exists (select 1 from public.students s where s.id = p_student_id) then
    raise exception 'not allowed';
  end if;
  if not exists (
    select 1 from public.students s
    join public.profiles owner on owner.id = s.teacher_id
    where s.id = p_student_id
      and owner.school_id is not distinct from public.my_school_id()
  ) then
    raise exception 'not allowed';
  end if;
  insert into public.enrollments (class_id, student_id)
  values (p_class_id, p_student_id)
  on conflict (class_id, student_id) do nothing;
end;
$$;

grant execute on function public.my_school_id() to authenticated;
grant execute on function public.school_students_not_in_class(uuid) to authenticated;
grant execute on function public.school_parents_not_in_class(uuid) to authenticated;
grant execute on function public.enroll_school_student(uuid, uuid) to authenticated;

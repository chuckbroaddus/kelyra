-- F08 / Q6 follow-up: school_students_not_in_class / school_parents_not_in_class
-- still gated on is_staff_profile + my_school_id (school dump to any staff).
-- Mirror school_*_for_link: office school-scoped OR taught-class only; require
-- teaches_class(p_class_id) (or office) so untaught class_id cannot be probed.
-- Also tighten enroll_school_student off is_staff_profile.
-- Write-only; do not apply here (Chief of Staff applies).

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
    and (
      public.is_school_admin()
      or public.teaches_class(p_class_id)
    )
    and not exists (
      select 1 from public.enrollments e
      where e.class_id = p_class_id and e.student_id = s.id
    )
    and (
      (
        public.is_school_admin()
        and public.my_school_id() is not null
        and owner.school_id is not distinct from public.my_school_id()
      )
      or (
        not public.is_school_admin()
        and (
          s.teacher_id = auth.uid()
          or exists (
            select 1
            from public.enrollments e
            where e.student_id = s.id
              and public.teaches_class(e.class_id)
          )
        )
      )
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
  where auth.uid() is not null
    and (
      public.is_school_admin()
      or public.teaches_class(p_class_id)
    )
    and not exists (
      select 1
      from public.parent_students ps
      join public.enrollments e on e.student_id = ps.student_id
      where ps.parent_id = p.id and e.class_id = p_class_id
    )
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
        and (
          p.teacher_id = auth.uid()
          or public.parent_on_taught_class(p.id)
        )
      )
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
  if auth.uid() is null then
    raise exception 'not allowed';
  end if;
  if not (public.is_school_admin() or public.teaches_class(p_class_id)) then
    raise exception 'not allowed';
  end if;
  select * into klass from public.classes where id = p_class_id;
  if klass.id is null then
    raise exception 'not allowed';
  end if;
  if not exists (
    select 1 from public.school_students_not_in_class(p_class_id) s where s.id = p_student_id
  ) then
    raise exception 'not allowed';
  end if;
  insert into public.enrollments (class_id, student_id)
  values (p_class_id, p_student_id)
  on conflict (class_id, student_id) do nothing;
end;
$$;

revoke all on function public.school_students_not_in_class(uuid) from public, anon;
revoke all on function public.school_parents_not_in_class(uuid) from public, anon;
revoke all on function public.enroll_school_student(uuid, uuid) from public, anon;
grant execute on function public.school_students_not_in_class(uuid) to authenticated;
grant execute on function public.school_parents_not_in_class(uuid) to authenticated;
grant execute on function public.enroll_school_student(uuid, uuid) to authenticated;

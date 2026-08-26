-- Chief of Staff: apply this. Teachers cannot mint a students row.
-- Fail closed with existing is_school_admin(). Does not widen is_staff.
-- Teachers may still enroll an existing school student into a class they teach,
-- and may still update details on students enrolled in a class they teach.

create or replace function public.students_insert_office_only()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_school_admin() then
    return new;
  end if;
  raise exception 'Only the office may add a new student.';
end;
$$;

drop trigger if exists students_insert_office_only on public.students;
create trigger students_insert_office_only
  before insert on public.students
  for each row
  execute function public.students_insert_office_only();

-- Class teachers may update (not insert) students enrolled in a class they teach.
drop policy if exists students_update_taught on public.students;
create policy students_update_taught on public.students
  for update using (
    exists (
      select 1
      from public.enrollments e
      where e.student_id = students.id
        and public.teaches_class(e.class_id)
    )
  )
  with check (
    exists (
      select 1
      from public.enrollments e
      where e.student_id = students.id
        and public.teaches_class(e.class_id)
    )
  );

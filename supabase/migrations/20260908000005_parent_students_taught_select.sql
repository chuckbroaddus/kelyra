-- T02 / Q11 follow-up: parent_students_via_taught_class SELECT used
-- parent_on_taught_class(parent_id) OR student_on_taught_class(student_id), so a
-- co-teacher of one linked child could read parent_students rows for siblings on
-- other classes (UUIDs). Restrict to student_on_taught_class(student_id) only.
-- Write-only; do not apply here (Chief of Staff applies).

drop policy if exists parent_students_via_taught_class on public.parent_students;

create policy parent_students_via_taught_class on public.parent_students
  for select using (
    public.student_on_taught_class(student_id)
  );

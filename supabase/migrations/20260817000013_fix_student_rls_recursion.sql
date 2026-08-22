-- students_self_read joined parent_students; parent_students_own selected students.
-- Postgres then loops and the app sees an empty roster even when rows exist.

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
    );
$$;

drop policy if exists students_self_read on public.students;
create policy students_self_read on public.students
  for select using (public.student_visible(id));

drop policy if exists students_parent_update on public.students;
create policy students_parent_update on public.students
  for update using (public.student_visible(id))
  with check (public.student_visible(id));

revoke all on function public.student_visible(uuid) from public, anon;
grant execute on function public.student_visible(uuid) to authenticated;

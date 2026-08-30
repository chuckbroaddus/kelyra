-- F07: teachers must not PostgREST-insert/update parent_students for owned rows.
-- Family identity minting is office-only (admin_set_parent_link / parent_students_admin_all).
-- Keep owner SELECT so teachers can still read links for cards they own.
-- Taught-class SELECT (parent_students_via_taught_class) is unchanged.
-- Unlink / link writes stay on security-definer RPCs (teacher_unlink_child, admin_set_parent_link).

drop policy if exists parent_students_own on public.parent_students;

create policy parent_students_own on public.parent_students
  for select using (
    exists (select 1 from public.parents p where p.id = parent_id and p.teacher_id = auth.uid())
    and exists (select 1 from public.students s where s.id = student_id and s.teacher_id = auth.uid())
  );

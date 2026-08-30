-- F12: clients must not PostgREST-INSERT into public.teachers.
-- Teacher rows are created only by security-definer office/claim paths
-- (admin_create_login, school_claim_superintendent, hat/provision RPCs).
-- Keep self SELECT + UPDATE. Do not touch handle_new_user or provision RPCs.
-- teachers_admin_read (SELECT for is_school_admin) stays from school_roles.

drop policy if exists teachers_own on public.teachers;

drop policy if exists teachers_self_select on public.teachers;
create policy teachers_self_select on public.teachers
  for select using (id = auth.uid());

drop policy if exists teachers_self_update on public.teachers;
create policy teachers_self_update on public.teachers
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

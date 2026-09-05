-- F11 / Q5 follow-up: parents_admin_all was is_school_admin() with no school predicate,
-- so office getParent() direct SELECT could read cross-school parent rows and bypass
-- the school wall on get_parent_card.
-- Scope parents_admin_all to my_school_id / same-school parent linkage (owner profile or
-- parent login), matching get_parent_card office gate.
-- Write-only; do not apply here (Chief of Staff applies).

drop policy if exists parents_admin_all on public.parents;

create policy parents_admin_all on public.parents
  for all
  using (
    public.is_school_admin()
    and public.my_school_id() is not null
    and exists (
      select 1
      from public.profiles x
      where x.school_id is not distinct from public.my_school_id()
        and (x.id = parents.teacher_id or x.parent_id = parents.id)
    )
  )
  with check (
    public.is_school_admin()
    and public.my_school_id() is not null
    and exists (
      select 1
      from public.profiles x
      where x.school_id is not distinct from public.my_school_id()
        and (x.id = parents.teacher_id or x.parent_id = parents.id)
    )
  );

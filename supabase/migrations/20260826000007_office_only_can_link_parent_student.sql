-- Q8: family identity linking is office-only (is_school_admin).
-- Teachers (including also_administrator) must not mint parent↔student links.
-- parents.invite / add_parent_to_class stays teacher-own (class attach, not family).
-- Do not widen is_staff.

create or replace function public.can_link_parent_student()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_school_admin();
$$;

grant execute on function public.can_link_parent_student() to authenticated;

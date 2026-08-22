-- parents_via_taught_class queried parent_students, whose policy queried parents
-- again → infinite RLS recursion. "Could not load parent" on every parent card.

create or replace function public.parent_on_taught_class(p_parent_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.parent_students ps
    join public.enrollments e on e.student_id = ps.student_id
    where ps.parent_id = p_parent_id
      and public.teaches_class(e.class_id)
  );
$$;

drop policy if exists parents_via_taught_class on public.parents;
create policy parents_via_taught_class on public.parents
  for select using (public.parent_on_taught_class(id));

create or replace function public.get_parent_card(p_parent_id uuid)
returns public.parents
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  card public.parents;
begin
  if auth.uid() is null or not public.is_staff_profile(auth.uid()) then
    raise exception 'not allowed';
  end if;
  select * into card from public.parents where id = p_parent_id;
  if card.id is null then
    raise exception 'not found';
  end if;
  return card;
end;
$$;

grant execute on function public.parent_on_taught_class(uuid) to authenticated;
grant execute on function public.get_parent_card(uuid) to authenticated;

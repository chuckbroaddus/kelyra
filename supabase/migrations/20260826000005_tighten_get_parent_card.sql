-- Q5: get_parent_card must not return full parent PII to any staff.
-- Teachers: only a parent of a student in a class they teach (parent_on_taught_class).
-- Office: is_school_admin + same-school parent card. Students/parents/anon: denied.
-- Do not ride is_staff. Direct parents SELECT policies are unchanged.

create or replace function public.get_parent_card(p_parent_id uuid)
returns public.parents
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  card public.parents;
  allowed boolean := false;
begin
  if auth.uid() is null then
    raise exception 'not allowed';
  end if;

  select * into card from public.parents where id = p_parent_id;
  if card.id is null then
    raise exception 'not found';
  end if;

  if public.is_school_admin() then
    -- Office may open an in-school parent card (owner profile or parent login).
    allowed :=
      public.my_school_id() is not null
      and exists (
        select 1
        from public.profiles x
        where x.school_id is not distinct from public.my_school_id()
          and (x.id = card.teacher_id or x.parent_id = card.id)
      );
  else
    -- Teacher (or class_teachers assignee): taught-class link only. Not is_staff.
    allowed := public.parent_on_taught_class(p_parent_id);
  end if;

  if not allowed then
    raise exception 'not allowed';
  end if;

  return card;
end;
$$;

revoke all on function public.get_parent_card(uuid) from public, anon;
grant execute on function public.get_parent_card(uuid) to authenticated;

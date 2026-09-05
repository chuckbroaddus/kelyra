-- F10 / Q5 follow-up: get_parent_card must not distinguish missing vs unauthorized.
-- Prior migration raised 'not found' before authz, then 'not allowed' for denied callers,
-- letting student/parent JWTs enumerate parent UUID existence.
-- Raise a single 'not allowed' for both missing and unauthorized after the authz check.
-- Write-only; do not apply here (Chief of Staff applies).

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

  if card.id is not null then
    if public.is_school_admin() then
      allowed :=
        public.my_school_id() is not null
        and exists (
          select 1
          from public.profiles x
          where x.school_id is not distinct from public.my_school_id()
            and (x.id = card.teacher_id or x.parent_id = card.id)
        );
    else
      allowed := public.parent_on_taught_class(p_parent_id);
    end if;
  end if;

  if not allowed then
    raise exception 'not allowed';
  end if;

  return card;
end;
$$;

revoke all on function public.get_parent_card(uuid) from public, anon;
grant execute on function public.get_parent_card(uuid) to authenticated;

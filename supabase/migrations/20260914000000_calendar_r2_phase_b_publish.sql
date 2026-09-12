-- CAL-R2 Phase B: publish assignment due to family calendar (assign ≠ publish).
-- Apply via devops-release only. Do not run live from eng agents.
-- Walls: class_teacher_of only; never teaches_class; family never writes.

create or replace function public.publish_assignment_to_calendar(p_assignment_id uuid)
returns public.assignments
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  row public.assignments;
begin
  if me is null then
    raise exception 'not authenticated';
  end if;

  select * into row
  from public.assignments a
  where a.id = p_assignment_id
  for update;

  if not found then
    raise exception 'assignment not found';
  end if;

  -- Hidden/publish write: class_teacher_of only (CAL-S1-02). Never teaches_class.
  if not public.class_teacher_of(row.class_id) then
    raise exception 'not allowed';
  end if;

  if row.due_at is null then
    raise exception 'assignment has no due date';
  end if;

  if row.calendar_visibility is distinct from 'published' then
    update public.assignments
    set
      calendar_visibility = 'published',
      calendar_published_at = now(),
      calendar_published_by = me
    where id = p_assignment_id
    returning * into row;
  end if;

  return row;
end;
$$;

revoke all on function public.publish_assignment_to_calendar(uuid) from public, anon;
grant execute on function public.publish_assignment_to_calendar(uuid) to authenticated;

comment on function public.publish_assignment_to_calendar(uuid) is
  'CAL-R2 Phase B: teacher of class publishes hidden due to family calendar. class_teacher_of only; never teaches_class.';

-- Optional keep-hidden is a no-op product action (dismiss Needs card); no RPC required.
-- Re-hide is v1.1 (CEO-2).

-- List hidden dated assignments for Needs "Publish to calendar" cards (teacher).
create or replace function public.list_hidden_calendar_dues(p_class_id uuid default null)
returns table (
  id uuid,
  class_id uuid,
  title text,
  category text,
  due_at timestamptz,
  calendar_visibility text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    return;
  end if;

  -- Teacher seat occupancy only (never OR hats).
  if not exists (
    select 1 from public.class_teachers ct where ct.profile_id = me
  ) then
    return;
  end if;

  return query
  select
    a.id,
    a.class_id,
    a.title,
    coalesce(a.category, 'homework')::text,
    a.due_at,
    a.calendar_visibility
  from public.assignments a
  where a.due_at is not null
    and a.calendar_visibility = 'hidden'
    and public.class_teacher_of(a.class_id)
    and (p_class_id is null or a.class_id = p_class_id)
  order by a.due_at asc, a.title asc
  limit 100;
end;
$$;

revoke all on function public.list_hidden_calendar_dues(uuid) from public, anon;
grant execute on function public.list_hidden_calendar_dues(uuid) to authenticated;

comment on function public.list_hidden_calendar_dues(uuid) is
  'CAL-R2 Phase B: Needs Publish-to-calendar queue for class_teacher_of. Never teaches_class.';

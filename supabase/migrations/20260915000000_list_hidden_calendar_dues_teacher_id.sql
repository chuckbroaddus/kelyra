-- FIX-NOW t_5497924e / CAL-R2-B P1: list_hidden_calendar_dues used nonexistent
-- class_teachers.profile_id (Postgres 42703 on B-NEEDS-01). Column is teacher_id
-- (see class_teachers schema + Phase A class_teacher_of). Follow-up only — do not
-- rewrite already-applied 20260914000000_calendar_r2_phase_b_publish.sql.

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
    select 1 from public.class_teachers ct where ct.teacher_id = me
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
  'CAL-R2 Phase B: Needs Publish-to-calendar queue for class_teacher_of. Never teaches_class. Seat gate: class_teachers.teacher_id (t_5497924e).';

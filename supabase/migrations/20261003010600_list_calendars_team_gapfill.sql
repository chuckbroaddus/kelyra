-- DB gap-fill (2026-10-02): 20260917000000_calendar_r2_phase_d_sport.sql was never applied live.
-- Only list_calendars (team calendars + can_unsubscribe).
-- Applied live via apply_migration; this file records it so repo matches DB.

create or replace function public.list_calendars(
  p_seat text,
  p_child_student_id uuid default null
)
returns table (
  id uuid,
  kind text,
  name text,
  role_tint text,
  class_id uuid,
  default_enabled boolean,
  is_read_only boolean,
  can_unsubscribe boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  school uuid;
  child uuid;
begin
  -- Prefs/cache are not consulted (CAL-S2-07).
  if me is null then
    return;
  end if;
  if p_seat is null or p_seat not in ('teacher', 'student', 'parent', 'office') then
    return;
  end if;
  if not public.calendar_seat_occupied(p_seat) then
    return; -- wrong seat → empty (CAL-S2-01)
  end if;

  school := public.my_school_id();
  if school is null then
    return;
  end if;

  -- Parent twins: missing/invalid child → empty (CAL-S1-03 / S2-02)
  if p_seat = 'parent' then
    if public.my_parent_student_count() >= 2 then
      if p_child_student_id is null or not public.i_parent_of(p_child_student_id) then
        return;
      end if;
      child := p_child_student_id;
    elsif p_child_student_id is not null then
      if not public.i_parent_of(p_child_student_id) then
        return;
      end if;
      child := p_child_student_id;
    else
      select ps.student_id into child
      from public.parent_students ps
      join public.profiles p on p.parent_id = ps.parent_id
      where p.id = me
      limit 1;
    end if;
  end if;

  -- Office: school-kind only. No class / class_work / personal / team (CAL-S2-02).
  if p_seat = 'office' then
    return query
    select c.id, c.kind, c.name, c.role_tint, c.class_id, c.default_enabled, c.is_read_only, false
    from public.calendars c
    where c.school_id = school
      and c.kind = 'school'
      and c.provider = 'kelyra';
    return;
  end if;

  if p_seat = 'teacher' then
    return query
    select c.id, c.kind, c.name, c.role_tint, c.class_id, c.default_enabled, c.is_read_only,
      (c.kind = 'team') as can_unsubscribe
    from public.calendars c
    where c.school_id = school
      and c.provider = 'kelyra'
      and (
        c.kind = 'school'
        or (
          c.kind in ('class', 'class_work')
          and c.class_id is not null
          and public.class_teacher_of(c.class_id)
        )
        or (c.kind = 'personal' and c.owner_profile_id = me)
        or (
          c.kind = 'team'
          and c.team_id is not null
          and public.i_calendar_team_member(c.team_id, null)
        )
      )
    order by
      case c.kind
        when 'school' then 0
        when 'class' then 1
        when 'class_work' then 2
        when 'team' then 3
        when 'personal' then 4
        else 9
      end,
      c.name;
    return;
  end if;

  if p_seat = 'student' then
    return query
    select c.id, c.kind, c.name, c.role_tint, c.class_id, c.default_enabled, c.is_read_only,
      (c.kind = 'team') as can_unsubscribe
    from public.calendars c
    where c.school_id = school
      and c.provider = 'kelyra'
      and (
        c.kind = 'school'
        or (
          c.kind in ('class', 'class_work')
          and c.class_id is not null
          and exists (
            select 1 from public.enrollments e
            where e.class_id = c.class_id
              and e.student_id = public.my_student_id()
          )
        )
        or (c.kind = 'personal' and c.owner_profile_id = me)
        or (
          c.kind = 'team'
          and c.team_id is not null
          and public.i_calendar_team_member(c.team_id, public.my_student_id())
        )
      )
    order by
      case c.kind
        when 'school' then 0
        when 'class' then 1
        when 'class_work' then 2
        when 'team' then 3
        when 'personal' then 4
        else 9
      end,
      c.name;
    return;
  end if;

  -- parent
  if child is null then
    return;
  end if;

  return query
  select c.id, c.kind, c.name, c.role_tint, c.class_id, c.default_enabled, c.is_read_only,
    (c.kind = 'team') as can_unsubscribe
  from public.calendars c
  where c.school_id = school
    and c.provider = 'kelyra'
    and (
      c.kind = 'school'
      or (
        c.kind in ('class', 'class_work')
        and c.class_id is not null
        and exists (
          select 1 from public.enrollments e
          where e.class_id = c.class_id
            and e.student_id = child
        )
      )
      or (c.kind = 'personal' and c.owner_profile_id = me)
      or (
        c.kind = 'team'
        and c.team_id is not null
        and public.i_calendar_team_member(c.team_id, child)
      )
    )
  order by
    case c.kind
      when 'school' then 0
      when 'class' then 1
      when 'class_work' then 2
      when 'team' then 3
      when 'personal' then 4
      else 9
    end,
    c.name;
end;
$$;

revoke all on function public.list_calendars(text, uuid) from public, anon;
grant execute on function public.list_calendars(text, uuid) to authenticated;

comment on function public.list_calendars(text, uuid) is
  'CAL-R2 LF-A layers. Prefs not consulted. Team rows only if opted; can_unsubscribe for teams.';

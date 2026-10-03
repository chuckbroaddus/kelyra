-- DB gap-fill (2026-10-02): 20260916000000_calendar_r2_phase_c_event_crud.sql was never applied live.
-- Only calendar_events_calendar_id_consistent(); trigger already live; create_calendar_event stays on 20260918000000.
-- Applied live via apply_migration; this file records it so repo matches DB.

create or replace function public.calendar_events_calendar_id_consistent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cal public.calendars;
begin
  select * into cal from public.calendars where id = new.calendar_id;
  if not found then
    raise exception 'calendar_id not found';
  end if;
  if cal.school_id is distinct from new.school_id then
    raise exception 'calendar_id school mismatch';
  end if;
  if cal.kind = 'class_work' then
    raise exception 'class_work layers have no calendar_events';
  end if;
  if cal.kind = 'school' and new.visibility_scope is distinct from 'school' then
    raise exception 'school calendar requires visibility_scope=school';
  end if;
  if cal.kind = 'class' then
    if new.class_id is distinct from cal.class_id then
      raise exception 'class calendar_id class mismatch';
    end if;
  end if;
  if cal.kind = 'personal' then
    if new.owner_profile_id is distinct from cal.owner_profile_id then
      raise exception 'personal calendar owner mismatch';
    end if;
    -- Absence is items on personal/child with category=absence (A1).
    if new.category = 'absence' then
      if new.visibility_scope is distinct from 'student_teachers' then
        raise exception 'absence requires visibility_scope=student_teachers';
      end if;
      if new.student_id is null then
        raise exception 'absence requires student_id';
      end if;
    elsif new.visibility_scope is distinct from 'self' then
      raise exception 'personal calendar requires visibility_scope=self';
    end if;
  end if;
  if cal.kind = 'team' and new.team_id is distinct from cal.team_id then
    raise exception 'team calendar_id team mismatch';
  end if;
  return new;
end;
$$;
